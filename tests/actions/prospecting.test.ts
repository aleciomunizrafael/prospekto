// Server Actions da Prospecção (src/actions/prospecting.ts) contra PGlite. requireSession é
// substituído por um contexto do teste; next/cache e next/navigation são neutralizados. O console
// é espionado do início ao fim: nenhuma linha pode conter telefone (+55) nem e-mail (@example.test).
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  convertProspectingItemAction,
  pasteItemsAction,
  recordCallResultAction,
  recordWhatsappSentAction,
  updateItemFieldAction,
} from "@/actions/prospecting";
import { db } from "@/lib/db";
import { contacts, organizations, prospectingItems } from "@/lib/db/schema";
import { initialCrmActionState } from "@/lib/crm/action-state";
import { idleState } from "@/lib/crm/form-state";
import type { Ctx } from "@/lib/repos/ctx";
import { listActivities } from "@/lib/repos/activities";
import { createContact } from "@/lib/repos/contacts";
import { createLead, getLead, moveLeadStage } from "@/lib/repos/leads";
import { createOrganization } from "@/lib/repos/organizations";
import { addItems, createList, getItem } from "@/lib/repos/prospecting";
import { makeTenant, makeUser, uniqueEmail } from "../helpers";

const session = vi.hoisted(() => ({ ctx: null as Ctx | null }));

vi.mock("@/lib/session", () => ({
  requireSession: async () => {
    if (!session.ctx) throw new Error("REDIRECT:/entrar");
    return { ...session.ctx, role: "owner" };
  },
}));
vi.mock("next/cache", () => ({
  refresh: () => undefined,
  revalidatePath: () => undefined,
  updateTag: () => undefined,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

// Toda linha que iria ao console (log.ts formata e redige, depois console.log/warn/error) é
// capturada aqui, exatamente como seria impressa, para a prova de que telefone, e-mail e nome
// nunca saem no log (R-16). O vitest troca o console por teste, por isso a captura é no módulo.
const captured = vi.hoisted(() => ({ lines: [] as string[] }));
vi.mock("@/lib/log", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/log")>();
  return {
    ...actual,
    log: (
      level: "debug" | "info" | "warn" | "error",
      msg: string,
      fields?: Record<string, unknown>,
    ) => {
      captured.lines.push(actual.formatLog(level, msg, fields));
    },
  };
});

let ctx: Ctx;
let listId: string;

beforeAll(async () => {
  ctx = await makeTenant();
  session.ctx = ctx;
  const list = await createList(ctx, {
    name: "Vinícolas do Vale",
    sourceDetail: "busca pública",
    assigneeUserId: ctx.userId!,
  });
  listId = list.id;
});

afterAll(() => {
  const lines = captured.lines;
  expect(lines.length).toBeGreaterThan(0);
  for (const line of lines) {
    expect(line).not.toContain("+55");
    expect(line).not.toContain("@example.test");
    expect(line).not.toContain("Pessoa da Reunião");
  }
});

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

async function newItem(extra: { phone?: string; name?: string } = {}) {
  const { items } = await addItems(ctx, {
    listId,
    items: [{ name: extra.name ?? "Vinícola Exemplo", phone: extra.phone ?? "(54) 99000-0001" }],
  });
  return items[0];
}

describe("colar e resultados", () => {
  it("pasteItemsAction grava os itens com posição e telefone E.164", async () => {
    const list = await createList(ctx, { name: "Colada", sourceDetail: "associação" });
    const state = await pasteItemsAction(
      idleState,
      fd({
        listId: list.id,
        text: "# Vinícolas\nAlfa | (54) 3000-0001 | gancho\nBeta; 54 99000-0002\nGama",
      }),
    );
    expect(state).toMatchObject({ status: "ok", message: "3 empresas adicionadas." });
    const rows = await db
      .select()
      .from(prospectingItems)
      .where(eq(prospectingItems.listId, list.id))
      .orderBy(prospectingItems.position);
    expect(rows.map((r) => [r.name, r.phone, r.position, r.segment])).toEqual([
      ["Alfa", "+555430000001", 1, "Vinícolas"],
      ["Beta", "+5554990000002", 2, "Vinícolas"],
      ["Gama", null, 3, "Vinícolas"],
    ]);
    expect(rows[0].hook).toBe("gancho");
    const empty = await pasteItemsAction(idleState, fd({ listId: list.id, text: "\n\n" }));
    expect(empty.status).toBe("error");
  });

  it("sem_resposta grava status, called_at e uma activities.ligacao com prospecting_item_id", async () => {
    const item = await newItem();
    const state = await recordCallResultAction(
      idleState,
      fd({ itemId: item.id, status: "sem_resposta" }),
    );
    expect(state).toMatchObject({ status: "ok", message: "Registrado: sem resposta." });
    const after = await getItem(ctx, item.id);
    expect(after?.status).toBe("sem_resposta");
    expect(after?.calledAt).toBeInstanceOf(Date);
    const [call] = await listActivities(ctx, { prospectingItemId: item.id, type: "ligacao" });
    expect(call.subject).toBe("Ligação: sem resposta");
    expect(call.data).toMatchObject({ result: "sem_resposta" });
    expect(call.leadId).toBeNull();
    expect(call.createdByUserId).toBe(ctx.userId);
  });

  it("retornar grava callback_at e, com lead, next_action_at às 9h de São Paulo", async () => {
    const item = await newItem();
    const { lead } = await createLead(ctx, {
      segment: "PJ",
      interest: "rouanet",
      name: "Lead Ligado",
      email: uniqueEmail("ret"),
      source: "linkedin",
      attributes: { empresa: "Vinícola Exemplo" },
    });
    await db
      .update(prospectingItems)
      .set({ leadId: lead.id })
      .where(eq(prospectingItems.id, item.id));
    const state = await recordCallResultAction(
      idleState,
      fd({ itemId: item.id, status: "retornar", callbackAt: "2026-10-16", note: "Falar quinta" }),
    );
    expect(state).toMatchObject({ status: "ok", message: "Retorno marcado para sex., 16 de out." });
    const after = await getItem(ctx, item.id);
    expect(after?.callbackAt).toBe("2026-10-16");
    expect(after?.notes).toBe("Falar quinta");
    expect((await getLead(ctx, lead.id))?.nextActionAt?.toISOString()).toBe(
      "2026-10-16T12:00:00.000Z",
    );
    const [call] = await listActivities(ctx, { prospectingItemId: item.id, type: "ligacao" });
    expect(call.subject).toBe("Ligação: retornar em 16/10");
    expect(call.leadId).toBe(lead.id);
    expect(call.body).toBe("Falar quinta");
    const missing = await recordCallResultAction(
      idleState,
      fd({ itemId: item.id, status: "retornar" }),
    );
    expect(missing.status).toBe("error");
  });

  it("descartado exige motivo, grava data.reason; voltar para a ligar limpa called_at", async () => {
    const item = await newItem();
    const noReason = await recordCallResultAction(
      idleState,
      fd({ itemId: item.id, status: "descartado" }),
    );
    expect(noReason.status).toBe("error");
    expect(noReason.status === "error" && noReason.fieldErrors?.reason).toBe("Escolha o motivo.");
    expect((await getItem(ctx, item.id))?.status).toBe("a_ligar");

    const ok = await recordCallResultAction(
      idleState,
      fd({ itemId: item.id, status: "descartado", reason: "nao_contatar" }),
    );
    expect(ok).toMatchObject({ status: "ok", message: "Empresa descartada." });
    const [call] = await listActivities(ctx, { prospectingItemId: item.id, type: "ligacao" });
    expect(call.subject).toBe("Ligação: descartada (pediu para não contatar)");
    expect(call.data).toMatchObject({ result: "descartado", reason: "nao_contatar" });

    const back = await recordCallResultAction(
      idleState,
      fd({ itemId: item.id, status: "a_ligar" }),
    );
    expect(back).toMatchObject({ status: "ok", message: "De volta para a ligar." });
    const after = await getItem(ctx, item.id);
    expect(after?.status).toBe("a_ligar");
    expect(after?.calledAt).toBeNull();
  });

  it("só anotação grava notes e uma activities.nota sem mudar o status", async () => {
    const item = await newItem();
    const state = await recordCallResultAction(
      idleState,
      fd({ itemId: item.id, note: "Recepção atende às 9h." }),
    );
    expect(state).toMatchObject({ status: "ok", message: "Anotação salva." });
    const after = await getItem(ctx, item.id);
    expect(after?.status).toBe("a_ligar");
    expect(after?.notes).toBe("Recepção atende às 9h.");
    const [note] = await listActivities(ctx, { prospectingItemId: item.id, type: "nota" });
    expect(note.body).toBe("Recepção atende às 9h.");
  });

  it("recordWhatsappSentAction grava whatsapp_sent_at e activities.whatsapp com o texto", async () => {
    const item = await newItem();
    const state = await recordWhatsappSentAction({ itemId: item.id, text: "Olá, tudo bem?" });
    expect(state.status).toBe("ok");
    expect((await getItem(ctx, item.id))?.whatsappSentAt).toBeInstanceOf(Date);
    const [wa] = await listActivities(ctx, { prospectingItemId: item.id, type: "whatsapp" });
    expect(wa.subject).toBe("WhatsApp aberto pela prospecção");
    expect(wa.body).toBe("Olá, tudo bem?");
  });

  it("argumento inválido devolve erro sem gravar (regra 10)", async () => {
    const item = await newItem();
    for (const bad of [null, 42, "x", {}, { itemId: item.id }, { itemId: item.id, text: "" }]) {
      const state = await recordWhatsappSentAction(bad);
      expect(state.status).toBe("error");
    }
    expect((await getItem(ctx, item.id))?.whatsappSentAt).toBeNull();
    const badField = await updateItemFieldAction(
      initialCrmActionState,
      fd({ itemId: item.id, field: "phone", value: "+5554999999999" }),
    );
    expect(badField.status).toBe("error");
    const notForm = await updateItemFieldAction(initialCrmActionState, {
      itemId: item.id,
      field: "hook",
      value: "x",
    } as unknown as FormData);
    expect(notForm.status).toBe("error");
    expect((await getItem(ctx, item.id))?.hook).toBeNull();
  });

  it("updateItemFieldAction salva a abertura e limpa com texto vazio", async () => {
    const item = await newItem();
    const saved = await updateItemFieldAction(
      initialCrmActionState,
      fd({ itemId: item.id, field: "hook", value: "  Quem é você e o convite.  " }),
    );
    expect(saved).toMatchObject({ status: "ok" });
    expect((await getItem(ctx, item.id))?.hook).toBe("Quem é você e o convite.");
    await updateItemFieldAction(
      initialCrmActionState,
      fd({ itemId: item.id, field: "hook", value: "" }),
    );
    expect((await getItem(ctx, item.id))?.hook).toBeNull();
  });

  it("item de outro tenant é invisível para as actions", async () => {
    const other = await makeTenant();
    const foreignList = await createList(other, { name: "Alheia", sourceDetail: "indicação" });
    const { items } = await addItems(other, {
      listId: foreignList.id,
      items: [{ name: "Alheia SA" }],
    });
    const state = await recordCallResultAction(
      idleState,
      fd({ itemId: items[0].id, status: "sem_resposta" }),
    );
    expect(state.status).toBe("error");
    expect((await getItem(other, items[0].id))?.status).toBe("a_ligar");
    const wa = await recordWhatsappSentAction({ itemId: items[0].id, text: "oi" });
    expect(wa.status).toBe("error");
  });
});

describe("convertProspectingItemAction", () => {
  const convertForm = (itemId: string, extra: Record<string, string> = {}) =>
    fd({
      itemId,
      contactName: "Pessoa da Reunião",
      email: uniqueEmail("reuniao"),
      meetingAt: "2026-10-20T10:00",
      meetingKind: "diagnostico",
      interest: "rouanet",
      ...extra,
    });

  it("cria organização com o telefone da empresa, contato, lead PJ em qualificado e a reunião", async () => {
    const item = await newItem({ name: "Adega Convertida", phone: "(54) 90000-0007" });
    await recordCallResultAction(idleState, fd({ itemId: item.id, status: "sem_resposta" }));
    const owner = await makeUser(ctx);
    const form = convertForm(item.id, { ownerUserId: owner, title: "Financeiro" });
    const state = await convertProspectingItemAction(idleState, form);
    expect(state).toMatchObject({
      status: "ok",
      message: "Reunião marcada. Lead criado em Qualificado.",
    });
    const conversion = (
      state as { conversion?: { leadId: string; orgId: string; contactId: string } }
    ).conversion!;
    expect(conversion.leadId).toBeTruthy();

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, conversion.orgId));
    expect(org.type).toBe("empresa");
    expect(org.name).toBe("Adega Convertida");
    expect(org.phone).toBe("+5554900000007");
    expect(org.notes).toContain("Origem: prospecção, lista Vinícolas do Vale");

    const [contact] = await db.select().from(contacts).where(eq(contacts.id, conversion.contactId));
    expect(contact.orgId).toBe(org.id);
    expect(contact.phone).toBeNull();
    expect(contact.title).toBe("Financeiro");
    expect(contact.sourceDetail).toMatch(/^Prospecção: lista Vinícolas do Vale \(ligação em /);

    const lead = (await getLead(ctx, conversion.leadId))!;
    expect(lead.segment).toBe("PJ");
    expect(lead.pipeline).toBe("patrocinadores");
    expect(lead.stage).toBe("qualificado");
    expect(lead.source).toBe("prospeccao");
    expect(lead.sourceDetail).toBe("Vinícolas do Vale");
    expect(lead.phone).toBeNull();
    expect(lead.ownerUserId).toBe(owner);
    expect(lead.orgId).toBe(org.id);
    expect(lead.contactId).toBe(contact.id);
    expect(lead.nextActionAt?.toISOString()).toBe("2026-10-20T13:00:00.000Z");
    expect(lead.attributes).toMatchObject({ empresa: "Adega Convertida" });
    expect(lead.lastContactAt).toBeInstanceOf(Date);

    const activities = await listActivities(ctx, { leadId: lead.id });
    const meeting = activities.find((a) => a.type === "reuniao")!;
    expect(meeting.prospectingItemId).toBe(item.id);
    expect(meeting.occurredAt.toISOString()).toBe("2026-10-20T13:00:00.000Z");
    expect(meeting.data).toMatchObject({
      meetingKind: "diagnostico",
      channel: "ligacao",
      meetingAt: "2026-10-20T13:00:00.000Z",
    });
    expect(meeting.subject).toMatch(
      /^Reunião de diagnóstico marcada para .* \(via prospecção, lista Vinícolas do Vale\)$/,
    );
    // A ligação "sem resposta" anterior viajou para o lead.
    const previous = activities.find((a) => a.subject === "Ligação: sem resposta");
    expect(previous?.prospectingItemId).toBe(item.id);
    expect(activities.some((a) => a.subject === "Ligação: reunião marcada")).toBe(true);
    expect(activities.some((a) => a.subject.startsWith("Lead criado pela prospecção"))).toBe(true);
    expect(activities.filter((a) => a.subject.startsWith("Estágio alterado"))).toHaveLength(1);

    const after = (await getItem(ctx, item.id))!;
    expect(after.status).toBe("reuniao_marcada");
    expect(after.leadId).toBe(lead.id);
    expect(after.orgId).toBe(org.id);
    expect(after.calledAt).toBeInstanceOf(Date);

    const again = await convertProspectingItemAction(idleState, convertForm(item.id));
    expect(again.status).toBe("error");
    expect(again.status === "error" && again.message).toMatch(/já foi convertida/);
  });

  it("telefone da pessoa vai para contato e lead; o da empresa só para a organização", async () => {
    const item = await newItem({ name: "Cantina com Pessoa", phone: "(54) 3000-0008" });
    const state = await convertProspectingItemAction(
      idleState,
      convertForm(item.id, { contactPhone: "(54) 99000-0009", taxRegime: "lucro_real" }),
    );
    const conversion = (
      state as { conversion?: { leadId: string; contactId: string; orgId: string } }
    ).conversion!;
    const lead = (await getLead(ctx, conversion.leadId))!;
    expect(lead.phone).toBe("+5554990000009");
    expect(lead.attributes).toMatchObject({ regime_tributario: "lucro_real" });
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, conversion.contactId));
    expect(contact.phone).toBe("+5554990000009");
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, conversion.orgId));
    expect(org.phone).toBe("+555430000008");
  });

  it("e-mail de lead existente em diagnóstico reaproveita o lead e não muda o estágio", async () => {
    const email = uniqueEmail("existente");
    const { lead } = await createLead(ctx, {
      segment: "PJ",
      interest: "rouanet",
      name: "Lead Existente",
      email,
      source: "linkedin",
      attributes: { empresa: "Empresa Existente" },
    });
    await moveLeadStage(ctx, {
      leadId: lead.id,
      to: "qualificado",
      ownerUserId: ctx.userId!,
      nextActionAt: new Date("2026-10-15T12:00:00Z"),
    });
    await moveLeadStage(ctx, { leadId: lead.id, to: "diagnostico" });
    const item = await newItem({ name: "Empresa Existente", phone: "(54) 3000-0010" });
    const state = await convertProspectingItemAction(idleState, convertForm(item.id, { email }));
    expect(state).toMatchObject({
      status: "ok",
      message: "Já existe um lead com este e-mail; a reunião foi registrada nele.",
    });
    const conversion = (state as { conversion?: { leadId: string; created: boolean } }).conversion!;
    expect(conversion.leadId).toBe(lead.id);
    expect(conversion.created).toBe(false);
    const after = (await getLead(ctx, lead.id))!;
    expect(after.stage).toBe("diagnostico");
    expect(after.orgId).toBeTruthy();
    const meetings = await listActivities(ctx, { leadId: lead.id, type: "reuniao" });
    expect(meetings).toHaveLength(1);
    expect(meetings[0].prospectingItemId).toBe(item.id);
  });

  it("e-mail de lead perdido reativa: novo e depois qualificado, lost_reason limpo", async () => {
    const email = uniqueEmail("perdido");
    const { lead } = await createLead(ctx, {
      segment: "PJ",
      interest: "rouanet",
      name: "Lead Perdido",
      email,
      source: "linkedin",
      attributes: { empresa: "Empresa Perdida" },
    });
    // Sair de `novo` exige dono e próxima ação, mesmo para marcar perdido (R-3).
    await moveLeadStage(ctx, {
      leadId: lead.id,
      to: "perdido",
      lostReason: "sem_interesse",
      ownerUserId: ctx.userId!,
      nextActionAt: new Date("2026-10-15T12:00:00Z"),
    });
    expect((await getLead(ctx, lead.id))?.lostReason).toBe("sem_interesse");
    const item = await newItem({ name: "Empresa Perdida", phone: "(54) 3000-0011" });
    const state = await convertProspectingItemAction(idleState, convertForm(item.id, { email }));
    expect(state).toMatchObject({ status: "ok", message: "Lead reativado em Qualificado." });
    const conversion = (state as { conversion?: { reactivated: boolean; stage: string } })
      .conversion!;
    expect(conversion.reactivated).toBe(true);
    expect(conversion.stage).toBe("qualificado");
    const after = (await getLead(ctx, lead.id))!;
    expect(after.stage).toBe("qualificado");
    expect(after.lostReason).toBeNull();
    expect(after.lostReasonDetail).toBeNull();
    const changes = (await listActivities(ctx, { leadId: lead.id, type: "sistema" })).filter((a) =>
      a.subject.startsWith("Estágio alterado"),
    );
    // perdido (1) + reativar para novo (2) + novo para qualificado (3)
    expect(changes).toHaveLength(3);
  });

  // Contatos do tenant com este e-mail: a conversão nunca pode criar um segundo para a mesma pessoa.
  const contactsByEmail = (email: string) =>
    db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, ctx.tenantId), eq(contacts.email, email)));

  it("segunda conversão com o mesmo e-mail reaproveita o contato do lead, sem duplicar", async () => {
    const email = uniqueEmail("mesma-pessoa");
    const first = await newItem({ name: "Empresa X", phone: "(54) 3000-0020" });
    const second = await newItem({ name: "Empresa X filial", phone: "(54) 3000-0021" });
    const one = await convertProspectingItemAction(idleState, convertForm(first.id, { email }));
    const two = await convertProspectingItemAction(idleState, convertForm(second.id, { email }));
    expect(one.status).toBe("ok");
    expect(two).toMatchObject({
      status: "ok",
      message: "Já existe um lead com este e-mail; a reunião foi registrada nele.",
    });
    const c1 = (one as { conversion?: { leadId: string; contactId: string } }).conversion!;
    const c2 = (two as { conversion?: { leadId: string; contactId: string } }).conversion!;
    expect(c2.leadId).toBe(c1.leadId);
    expect(c2.contactId).toBe(c1.contactId);
    const rows = await contactsByEmail(email);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(c1.contactId);
    expect((await getLead(ctx, c1.leadId))?.contactId).toBe(c1.contactId);
  });

  it("reconversão de lead perdido vindo da prospecção reaproveita o contato e completa o telefone", async () => {
    const email = uniqueEmail("reconversao");
    const first = await newItem({ name: "Empresa G", phone: "(54) 3000-0022" });
    const one = await convertProspectingItemAction(idleState, convertForm(first.id, { email }));
    const c1 = (one as { conversion?: { leadId: string; contactId: string; orgId: string } })
      .conversion!;
    await moveLeadStage(ctx, { leadId: c1.leadId, to: "perdido", lostReason: "sem_interesse" });
    // Lista do ano seguinte com a mesma empresa: item diferente, por isso a conversão é aceita.
    const next = await createList(ctx, { name: "Lista 2027", sourceDetail: "busca pública" });
    const {
      items: [again],
    } = await addItems(ctx, { listId: next.id, items: [{ name: "Empresa G" }] });
    const two = await convertProspectingItemAction(
      idleState,
      convertForm(again.id, { email, contactPhone: "(54) 99000-0030" }),
    );
    expect(two).toMatchObject({ status: "ok", message: "Lead reativado em Qualificado." });
    const c2 = (two as { conversion?: { leadId: string; contactId: string; orgId: string } })
      .conversion!;
    expect(c2.leadId).toBe(c1.leadId);
    expect(c2.orgId).toBe(c1.orgId);
    expect(c2.contactId).toBe(c1.contactId);
    const inOrg = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, ctx.tenantId), eq(contacts.orgId, c1.orgId)));
    expect(inOrg).toHaveLength(1);
    expect(inOrg[0].phone).toBe("+5554990000030");
    expect(await contactsByEmail(email)).toHaveLength(1);
    const lead = (await getLead(ctx, c1.leadId))!;
    expect(lead.contactId).toBe(c1.contactId);
    expect(lead.phone).toBe("+5554990000030");
    expect(lead.stage).toBe("qualificado");
  });

  it("organização que já tem contato com o mesmo e-mail não ganha um segundo contato", async () => {
    const email = uniqueEmail("ja-cadastrada");
    const org = await createOrganization(ctx, { type: "empresa", name: "Empresa C" });
    const known = await createContact(ctx, {
      orgId: org.id,
      name: "Pessoa C",
      email,
      sourceDetail: "linkedin:busca",
    });
    const item = await newItem({ name: "Empresa C", phone: "(54) 3000-0023" });
    const state = await convertProspectingItemAction(
      idleState,
      convertForm(item.id, { email, title: "Diretora" }),
    );
    expect(state.status).toBe("ok");
    const conversion = (
      state as { conversion?: { leadId: string; contactId: string; orgId: string } }
    ).conversion!;
    expect(conversion.orgId).toBe(org.id);
    expect(conversion.contactId).toBe(known.id);
    const rows = await contactsByEmail(email);
    expect(rows).toHaveLength(1);
    // Cargo vazio preenchido pelo diálogo; o que já existia não é sobrescrito.
    expect(rows[0].title).toBe("Diretora");
    expect(rows[0].name).toBe("Pessoa C");
    expect((await getLead(ctx, conversion.leadId))?.contactId).toBe(known.id);
  });

  it("e-mail obrigatório e campos inválidos devolvem erro de validação sem gravar", async () => {
    const item = await newItem({ name: "Sem E-mail" });
    const state = await convertProspectingItemAction(
      idleState,
      fd({ itemId: item.id, contactName: "Alguém", meetingAt: "2026-10-20T10:00" }),
    );
    expect(state.status).toBe("error");
    expect(state.status === "error" && state.fieldErrors?.email).toBeTruthy();
    expect((await getItem(ctx, item.id))?.status).toBe("a_ligar");
    const badDate = await convertProspectingItemAction(
      idleState,
      convertForm(item.id, { meetingAt: "amanhã" }),
    );
    expect(badDate.status).toBe("error");
    expect(badDate.status === "error" && badDate.fieldErrors?.meetingAt).toBeTruthy();
  });

  it("item de outro tenant não é convertido", async () => {
    const other = await makeTenant();
    const foreignList = await createList(other, { name: "Alheia", sourceDetail: "indicação" });
    const { items } = await addItems(other, {
      listId: foreignList.id,
      items: [{ name: "Alheia SA" }],
    });
    const state = await convertProspectingItemAction(idleState, convertForm(items[0].id));
    expect(state.status).toBe("error");
    expect((await getItem(other, items[0].id))?.status).toBe("a_ligar");
  });
});
