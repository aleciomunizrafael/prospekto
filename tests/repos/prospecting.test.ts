// Listas e itens de prospecção (ADR-004, 6.4 e 6.6; plano, P15 e P10) contra PGlite. A conversão
// é testada com moveLeadStage substituído por um espião que pode falhar: a transação da conversão
// tem de permanecer confirmada e o estágio real devolvido (prova da separação pedida na P10).
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Ctx } from "@/lib/repos/ctx";
import { createActivity, getActivity, listActivities } from "@/lib/repos/activities";
import { createLead, getLead, moveLeadStage } from "@/lib/repos/leads";
import {
  addItems,
  convertProspectingItem,
  countItemsByStatus,
  createList,
  deleteItem,
  deleteList,
  getItem,
  getList,
  listDiscardReasons,
  listItems,
  listLists,
  recordCallResult,
  recordWhatsappSent,
  searchProspectingItems,
  updateItem,
  updateItemField,
  updateList,
} from "@/lib/repos/prospecting";
import { makeTenant, makeUser, uniqueEmail } from "../helpers";

// Espião sobre a função real: por padrão chama a original; cada teste decide quando ela falha.
vi.mock("@/lib/repos/leads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/repos/leads")>();
  return { ...actual, moveLeadStage: vi.fn(actual.moveLeadStage) };
});

let ctx: Ctx;

beforeAll(async () => {
  ctx = await makeTenant();
});

describe("listas", () => {
  it("criar lista exige sourceDetail (LGPD, art. 18)", async () => {
    await expect(
      createList(ctx, { name: "Sem origem", sourceDetail: "" } as never),
    ).rejects.toThrow(/de onde vieram/);
    const assignee = await makeUser(ctx);
    const list = await createList(ctx, {
      name: "Vinícolas do Vale",
      region: "Bento Gonçalves/RS",
      sourceDetail: "busca pública",
      assigneeUserId: assignee,
      notes: "Ligar de manhã.",
    });
    expect(list.sourceDetail).toBe("busca pública");
    expect(list.createdByUserId).toBe(ctx.userId);
    const summary = await getList(ctx, list.id);
    expect(summary?.total).toBe(0);
    expect(summary?.assigneeName).toMatch(/Usuário/);
    const updated = await updateList(ctx, { listId: list.id, region: null, name: "Vinícolas" });
    expect(updated.region).toBeNull();
    expect(updated.name).toBe("Vinícolas");
    expect((await listLists(ctx)).map((l) => l.id)).toContain(list.id);
  });

  it("quem liga tem de ser usuário deste tenant (criar e editar)", async () => {
    const other = await makeTenant();
    const stranger = await makeUser(other);
    const base = { name: "Lista com responsável", sourceDetail: "indicação" };
    await expect(createList(ctx, { ...base, assigneeUserId: stranger })).rejects.toThrow(
      /não é usuário deste tenant/,
    );
    await expect(
      createList(ctx, { ...base, assigneeUserId: "usuario-inexistente" }),
    ).rejects.toThrow(/não é usuário deste tenant/);
    const list = await createList(ctx, base);
    expect(list.assigneeUserId).toBeNull();
    await expect(updateList(ctx, { listId: list.id, assigneeUserId: stranger })).rejects.toThrow(
      /não é usuário deste tenant/,
    );
    const mine = await makeUser(ctx);
    expect((await updateList(ctx, { listId: list.id, assigneeUserId: mine })).assigneeUserId).toBe(
      mine,
    );
    expect(
      (await updateList(ctx, { listId: list.id, assigneeUserId: null })).assigneeUserId,
    ).toBeNull();
  });
});

describe("itens", () => {
  it("addItems numera position, normaliza o telefone e marca o descartado em outra lista", async () => {
    const old = await createList(ctx, { name: "Lista antiga", sourceDetail: "associação" });
    const {
      items: [discarded],
    } = await addItems(ctx, {
      listId: old.id,
      items: [{ name: "Vinícola Exemplo", phone: "(54) 90000-0002" }],
    });
    await updateItem(ctx, { itemId: discarded.id, status: "descartado" });
    await createActivity(ctx, {
      type: "ligacao",
      subject: "Ligação: descartada (não contatar)",
      data: { result: "descartado", reason: "nao_contatar" },
      prospectingItemId: discarded.id,
    });

    const list = await createList(ctx, { name: "Lista nova", sourceDetail: "busca pública" });
    const { items, alreadyDiscarded } = await addItems(ctx, {
      listId: list.id,
      items: [
        { name: "Metalúrgica Modelo", phone: "54 90000-0003", segment: "Metalúrgicas" },
        { name: "Vinícola Exemplo", phone: "+5554900000002" },
        { name: "Sem telefone" },
      ],
    });
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(items[0].phone).toBe("+5554900000003");
    expect(items[0].segment).toBe("Metalúrgicas");
    expect(items[2].phone).toBeNull();
    expect(alreadyDiscarded).toBe(1);
    expect(items[1].notes).toBe("Descartada em Lista antiga (pediu para não contatar)");
    expect(items[0].notes).toBeNull();

    const more = await addItems(ctx, { listId: list.id, items: [{ name: "Quarta" }] });
    expect(more.items[0].position).toBe(4);
    expect(more.alreadyDiscarded).toBe(0);
  });

  it("listItems por status e por busca; countItemsByStatus", async () => {
    const list = await createList(ctx, { name: "Filtro", sourceDetail: "busca pública" });
    const { items } = await addItems(ctx, {
      listId: list.id,
      items: [{ name: "Alfa Vinhos" }, { name: "Beta Metais" }, { name: "Gama Vinhos" }],
    });
    await updateItem(ctx, { itemId: items[1].id, status: "retornar", callbackAt: "2026-10-17" });
    await updateItem(ctx, { itemId: items[2].id, status: "descartado" });
    expect((await listItems(ctx, { listId: list.id })).map((i) => i.name)).toEqual([
      "Alfa Vinhos",
      "Beta Metais",
      "Gama Vinhos",
    ]);
    expect(
      (await listItems(ctx, { listId: list.id, status: "retornar" })).map((i) => i.name),
    ).toEqual(["Beta Metais"]);
    expect(
      (await listItems(ctx, { listId: list.id, search: "vinhos" })).map((i) => i.name),
    ).toEqual(["Alfa Vinhos", "Gama Vinhos"]);
    expect(await countItemsByStatus(ctx, list.id)).toEqual({
      todos: 3,
      a_ligar: 1,
      sem_resposta: 0,
      retornar: 1,
      reuniao_marcada: 0,
      descartado: 1,
    });
    const summary = await getList(ctx, list.id);
    expect(summary).toMatchObject({ total: 3, contacted: 2, meetings: 0 });
    expect((await getItem(ctx, items[1].id))?.callbackAt).toBe("2026-10-17");
  });

  it("updateItem normaliza o telefone por phoneSchema e recusa inválido", async () => {
    const list = await createList(ctx, { name: "Telefone", sourceDetail: "busca pública" });
    const {
      items: [item],
    } = await addItems(ctx, { listId: list.id, items: [{ name: "Empresa" }] });
    const updated = await updateItem(ctx, { itemId: item.id, phone: "(54) 3000-0000" });
    expect(updated.phone).toBe("+555430000000");
    await expect(updateItem(ctx, { itemId: item.id, phone: "123" })).rejects.toThrow(/telefone/);
    const cleared = await updateItem(ctx, { itemId: item.id, phone: null });
    expect(cleared.phone).toBeNull();
  });

  it("searchProspectingItems busca por nome com o nome da lista, nunca por telefone", async () => {
    const list = await createList(ctx, { name: "Busca", sourceDetail: "busca pública" });
    await addItems(ctx, {
      listId: list.id,
      items: [{ name: "Cervejaria Exemplo", phone: "(54) 90000-0009" }],
    });
    const byName = await searchProspectingItems(ctx, { search: "cervejaria" });
    expect(byName.map((i) => [i.name, i.listName])).toEqual([["Cervejaria Exemplo", "Busca"]]);
    expect(await searchProspectingItems(ctx, { search: "900000009" })).toHaveLength(0);
  });
});

describe("exclusão (P15)", () => {
  async function seedConverted() {
    const list = await createList(ctx, { name: "Excluir", sourceDetail: "busca pública" });
    const {
      items: [plain, converted],
    } = await addItems(ctx, {
      listId: list.id,
      items: [{ name: "Não convertida" }, { name: "Convertida" }],
    });
    const orphan = await createActivity(ctx, {
      type: "ligacao",
      subject: "Ligação: sem resposta",
      prospectingItemId: plain.id,
    });
    const { lead } = await createLead(ctx, {
      segment: "PJ",
      interest: "rouanet",
      name: "Pessoa da Reunião",
      email: uniqueEmail("prospeccao"),
      source: "prospeccao",
      attributes: { empresa: "Convertida" },
    });
    await updateItem(ctx, { itemId: converted.id, status: "reuniao_marcada" });
    const travelled = await createActivity(ctx, {
      type: "reuniao",
      subject: "Reunião de diagnóstico marcada",
      prospectingItemId: converted.id,
      leadId: lead.id,
    });
    return { list, plain, converted, orphan, travelled, lead };
  }

  it("deleteList apaga lista, itens e atividade órfã; preserva a do lead sem prospecting_item_id", async () => {
    const s = await seedConverted();
    await deleteList(ctx, s.list.id);
    expect(await getList(ctx, s.list.id)).toBeNull();
    expect(await getItem(ctx, s.plain.id)).toBeNull();
    expect(await getItem(ctx, s.converted.id)).toBeNull();
    expect(await getActivity(ctx, s.orphan.id)).toBeNull();
    const kept = await getActivity(ctx, s.travelled.id);
    expect(kept?.leadId).toBe(s.lead.id);
    expect(kept?.prospectingItemId).toBeNull();
    expect(await listActivities(ctx, { leadId: s.lead.id, type: "reuniao" })).toHaveLength(1);
  });

  it("deleteItem faz o mesmo para um item", async () => {
    const s = await seedConverted();
    await deleteItem(ctx, s.plain.id);
    expect(await getItem(ctx, s.plain.id)).toBeNull();
    expect(await getActivity(ctx, s.orphan.id)).toBeNull();
    await deleteItem(ctx, s.converted.id);
    expect(await getItem(ctx, s.converted.id)).toBeNull();
    expect((await getActivity(ctx, s.travelled.id))?.prospectingItemId).toBeNull();
    expect((await getList(ctx, s.list.id))?.total).toBe(0);
  });

  it("lista de outro tenant não é apagada", async () => {
    const other = await makeTenant();
    const list = await createList(ctx, { name: "Alheia", sourceDetail: "busca pública" });
    await expect(deleteList(other, list.id)).rejects.toThrow(/não encontrad/);
    expect(await getList(ctx, list.id)).not.toBeNull();
  });
});

describe("resultado, WhatsApp, autosave e motivo do descarte", () => {
  it("recordCallResult grava o resultado e listDiscardReasons devolve o motivo do descarte", async () => {
    const list = await createList(ctx, { name: "Resultados", sourceDetail: "busca pública" });
    const {
      items: [item],
    } = await addItems(ctx, { listId: list.id, items: [{ name: "Empresa Resultado" }] });
    const discarded = await recordCallResult(ctx, {
      itemId: item.id,
      status: "descartado",
      reason: "nao_contatar",
    });
    expect(discarded.status).toBe("descartado");
    expect(discarded.calledAt).toBeInstanceOf(Date);
    expect(await listDiscardReasons(ctx, { listId: list.id })).toEqual({
      [item.id]: "nao_contatar",
    });
    expect(await listDiscardReasons(ctx, { itemId: item.id })).toEqual({
      [item.id]: "nao_contatar",
    });
    await expect(recordCallResult(ctx, { itemId: item.id, status: "descartado" })).rejects.toThrow(
      /motivo/,
    );
    const back = await recordCallResult(ctx, { itemId: item.id, status: "a_ligar" });
    expect(back.calledAt).toBeNull();
    expect(await listDiscardReasons(ctx, { listId: list.id })).toEqual({});
    const noted = await updateItemField(ctx, { itemId: item.id, field: "notes", value: " ok " });
    expect(noted.notes).toBe("ok");
    const wa = await recordWhatsappSent(ctx, { itemId: item.id, text: "Olá" });
    expect(wa.whatsappSentAt).toBeInstanceOf(Date);
    expect(
      await listActivities(ctx, { prospectingItemId: item.id, type: "whatsapp" }),
    ).toHaveLength(1);
  });
});

describe("convertProspectingItem com moveLeadStage falhando (P10)", () => {
  async function seedItem(name: string) {
    const list = await createList(ctx, { name: "Conversão", sourceDetail: "busca pública" });
    const {
      items: [item],
    } = await addItems(ctx, { listId: list.id, items: [{ name, phone: "(54) 90000-0021" }] });
    return item;
  }

  it("a transação permanece confirmada e o lead fica em novo com next_action_at", async () => {
    const item = await seedItem("Empresa Sem Avanço");
    vi.mocked(moveLeadStage).mockImplementationOnce(async () => {
      throw new Error("falha simulada no movimento");
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const meetingAt = new Date("2026-10-20T13:00:00Z");
    const result = await convertProspectingItem(ctx, {
      itemId: item.id,
      contactName: "Pessoa Sem Avanço",
      email: uniqueEmail("semavanco"),
      meetingAt,
    });
    expect(result.stage).toBe("novo");
    expect(result.created).toBe(true);
    expect(result.reactivated).toBe(false);
    const lead = (await getLead(ctx, result.leadId))!;
    expect(lead.stage).toBe("novo");
    expect(lead.nextActionAt?.toISOString()).toBe(meetingAt.toISOString());
    const after = (await getItem(ctx, item.id))!;
    expect(after.status).toBe("reuniao_marcada");
    expect(after.leadId).toBe(lead.id);
    expect(await listActivities(ctx, { leadId: lead.id, type: "reuniao" })).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const line = warnSpy.mock.calls[0].map(String).join(" ");
    expect(line).toContain("estágio não avançado");
    expect(line).not.toContain("+55");
    expect(line).not.toContain("@example.test");
    expect(line).not.toContain("Pessoa Sem Avanço");
  });

  it("lead perdido reaproveitado: a reativação vale e o segundo movimento falha", async () => {
    const real = await vi.importActual<typeof import("@/lib/repos/leads")>("@/lib/repos/leads");
    const email = uniqueEmail("perdido-repo");
    const { lead } = await real.createLead(ctx, {
      segment: "PJ",
      interest: "rouanet",
      name: "Lead Perdido Repo",
      email,
      source: "linkedin",
      attributes: { empresa: "Empresa Perdida Repo" },
    });
    await real.moveLeadStage(ctx, {
      leadId: lead.id,
      to: "perdido",
      lostReason: "sem_interesse",
      ownerUserId: ctx.userId!,
      nextActionAt: new Date("2026-10-15T12:00:00Z"),
    });
    const item = await seedItem("Empresa Perdida Repo");
    vi.mocked(moveLeadStage)
      .mockImplementationOnce(real.moveLeadStage)
      .mockImplementationOnce(async () => {
        throw new Error("falha simulada no segundo movimento");
      });
    const result = await convertProspectingItem(ctx, {
      itemId: item.id,
      contactName: "Pessoa Perdida",
      email,
      meetingAt: new Date("2026-10-21T13:00:00Z"),
    });
    expect(result.leadId).toBe(lead.id);
    expect(result.created).toBe(false);
    expect(result.reactivated).toBe(true);
    expect(result.stage).toBe("novo");
    const after = (await getLead(ctx, lead.id))!;
    expect(after.stage).toBe("novo");
    expect(after.lostReason).toBeNull();
    expect(after.lostReasonDetail).toBeNull();
  });
});
