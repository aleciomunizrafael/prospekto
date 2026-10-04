// Server Actions do CRM (src/actions/crm-leads.ts) contra PGlite. requireSession é substituído
// por um contexto controlado pelo teste; next/cache e next/navigation são neutralizados.
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  assignLeadOwnerAction,
  completeTaskAction,
  createLeadAction,
  moveLeadStageAction,
  registerActivityAction,
  updateLeadAction,
} from "@/actions/crm-leads";
import { initialCrmActionState } from "@/lib/crm/action-state";
import type { Ctx } from "@/lib/repos/ctx";
import { listActivities, listOpenTasks } from "@/lib/repos/activities";
import { listConsents } from "@/lib/repos/consents";
import { createLead, getLead } from "@/lib/repos/leads";
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

let ctx: Ctx;

beforeAll(async () => {
  ctx = await makeTenant();
  session.ctx = ctx;
});

function fd(fields: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) for (const item of v) f.append(k, item);
    else f.append(k, v);
  }
  return f;
}

async function redirectOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("REDIRECT:")) return message.slice("REDIRECT:".length);
    throw error;
  }
}

async function newLead(segment: "PJ" | "PF" | "CONT" = "PJ") {
  const { lead } = await createLead(ctx, {
    segment,
    interest: "rouanet",
    name: "Lead de Teste",
    email: uniqueEmail("crm"),
    phone: "(54) 98403-2180",
    source: "linkedin",
    attributes: segment === "PJ" ? { empresa: "Empresa Teste" } : {},
  });
  return lead;
}

describe("guarda de sessão", () => {
  it("sem sessão a action falha antes de tocar no banco", async () => {
    session.ctx = null;
    try {
      await expect(createLeadAction(initialCrmActionState, fd({ name: "x" }))).rejects.toThrow(
        "REDIRECT:/entrar",
      );
      await expect(
        moveLeadStageAction(initialCrmActionState, fd({ leadId: "x", to: "qualificado" })),
      ).rejects.toThrow("REDIRECT:/entrar");
    } finally {
      session.ctx = ctx;
    }
  });
});

describe("createLeadAction", () => {
  it("cria lead manual com origem obrigatória e consentimento registrado com source_page crm", async () => {
    const email = uniqueEmail("manual");
    const redirect = await redirectOf(
      createLeadAction(
        initialCrmActionState,
        fd({
          segment: "PJ",
          interest: "rouanet",
          name: "Maria Manual",
          email,
          phone: "(54) 98403-2180",
          city: "Caxias do Sul",
          uf: "RS",
          source: "evento",
          sourceDetail: "Feira da indústria 2026",
          attr_empresa: "Metalúrgica Teste",
          attr_regime_tributario: "lucro_real",
          consentGiven: "on",
          consentText: "Autorizou contato por telefone na feira, em 03/10/2026.",
          consentChannels: ["telefone", "whatsapp"],
        }),
      ),
    );
    expect(redirect).toMatch(/^\/app\/leads\/[0-9a-f-]{36}$/);
    const leadId = redirect!.split("/").pop()!;
    const lead = await getLead(ctx, leadId);
    expect(lead?.source).toBe("evento");
    expect(lead?.sourceDetail).toBe("Feira da indústria 2026");
    expect(lead?.phone).toBe("+5554984032180");
    expect(lead?.attributes.empresa).toBe("Metalúrgica Teste");
    expect(lead?.attributes.regime_tributario).toBe("lucro_real");
    const consents = await listConsents(ctx, leadId);
    expect(consents).toHaveLength(1);
    expect(consents[0]).toMatchObject({
      purpose: "contato_comercial",
      granted: true,
      sourcePage: "crm",
      channels: ["telefone", "whatsapp"],
    });
    const forms = await listActivities(ctx, { leadId, type: "formulario" });
    expect(forms).toHaveLength(1);
  });

  it("devolve erros por campo quando faltam nome, origem ou texto do consentimento", async () => {
    const state = await createLeadAction(
      initialCrmActionState,
      fd({ segment: "CONT", interest: "rouanet", name: "", email: "nao-e-email" }),
    );
    expect(state.status).toBe("error");
    expect(state.fieldErrors).toMatchObject({
      name: expect.any(String),
      email: expect.any(String),
    });
    expect(state.fieldErrors?.source).toBeDefined();

    const state2 = await createLeadAction(
      initialCrmActionState,
      fd({
        segment: "CONT",
        interest: "rouanet",
        name: "Escritório",
        email: uniqueEmail("cont"),
        source: "linkedin",
        consentGiven: "on",
      }),
    );
    expect(state2.status).toBe("error");
    expect(state2.fieldErrors?.consentText).toBeDefined();
  });
});

describe("moveLeadStageAction", () => {
  it("lista o que falta para sair de novo e grava quando dono e próxima ação são informados", async () => {
    const lead = await newLead();
    const missing = await moveLeadStageAction(
      initialCrmActionState,
      fd({ leadId: lead.id, to: "qualificado" }),
    );
    expect(missing.status).toBe("error");
    expect(missing.missing).toEqual(
      expect.arrayContaining(["responsável pelo lead", "data da próxima ação"]),
    );
    expect((await getLead(ctx, lead.id))?.stage).toBe("novo");

    const ok = await moveLeadStageAction(
      initialCrmActionState,
      fd({
        leadId: lead.id,
        to: "qualificado",
        ownerUserId: ctx.userId!,
        nextActionAt: "2026-10-10T09:00",
      }),
    );
    expect(ok).toMatchObject({ status: "ok" });
    const after = await getLead(ctx, lead.id);
    expect(after?.stage).toBe("qualificado");
    expect(after?.ownerUserId).toBe(ctx.userId);
    expect(after?.nextActionAt?.toISOString()).toBe("2026-10-10T12:00:00.000Z"); // 09:00 em SP
    const system = await listActivities(ctx, { leadId: lead.id, type: "sistema" });
    expect(system.some((a) => a.subject === "Estágio alterado de novo para qualificado")).toBe(
      true,
    );
  });

  it("marcar perdido exige motivo; com motivo grava e zera a próxima ação", async () => {
    const lead = await newLead("CONT");
    const missing = await moveLeadStageAction(
      initialCrmActionState,
      fd({ leadId: lead.id, to: "perdido" }),
    );
    // Sair de `novo` continua exigindo dono e próxima ação (regra R-3), mesmo ao perder.
    expect(missing.missing).toEqual(
      expect.arrayContaining(["motivo de perda", "responsável pelo lead", "data da próxima ação"]),
    );
    const ok = await moveLeadStageAction(
      initialCrmActionState,
      fd({
        leadId: lead.id,
        to: "perdido",
        lostReason: "sem_resposta",
        ownerUserId: ctx.userId!,
        nextActionAt: "2026-10-10T09:00",
      }),
    );
    expect(ok.status).toBe("ok");
    const after = await getLead(ctx, lead.id);
    expect(after?.stage).toBe("perdido");
    expect(after?.lostReason).toBe("sem_resposta");
    expect(after?.nextActionAt).toBeNull();
  });

  it("grava a checagem do art. 27 feita no diálogo antes de mover", async () => {
    const lead = await newLead("PF");
    const state = await moveLeadStageAction(
      initialCrmActionState,
      fd({
        leadId: lead.id,
        to: "qualificado",
        ownerUserId: ctx.userId!,
        nextActionAt: "2026-10-10T09:00",
        art27Checked: "on",
        art27At: "2026-10-03",
        art27By: "Daniela",
      }),
    );
    expect(state.status).toBe("ok");
    const after = await getLead(ctx, lead.id);
    expect(after?.attributes).toMatchObject({
      vinculo_art27_checado: true,
      vinculo_art27_checado_em: "2026-10-03",
      vinculo_art27_checado_por: "Daniela",
    });
  });
});

describe("registerActivityAction e completeTaskAction", () => {
  it("ligação atualiza último contato e próxima ação na mesma gravação", async () => {
    const lead = await newLead();
    const state = await registerActivityAction(
      initialCrmActionState,
      fd({
        leadId: lead.id,
        type: "ligacao",
        subject: "Primeira ligação",
        body: "Conversamos 5 minutos.",
        occurredAt: "2026-10-03T15:30",
        nextActionAt: "2026-10-06T10:00",
      }),
    );
    expect(state.status).toBe("ok");
    const after = await getLead(ctx, lead.id);
    expect(after?.lastContactAt?.toISOString()).toBe("2026-10-03T18:30:00.000Z");
    expect(after?.nextActionAt?.toISOString()).toBe("2026-10-06T13:00:00.000Z");
    const calls = await listActivities(ctx, { leadId: lead.id, type: "ligacao" });
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toBe("Conversamos 5 minutos.");
  });

  it("reunião guarda o tipo e tarefa exige vencimento; concluir preenche done_at", async () => {
    const lead = await newLead();
    const meeting = await registerActivityAction(
      initialCrmActionState,
      fd({ leadId: lead.id, type: "reuniao", meetingKind: "simulacao" }),
    );
    expect(meeting.status).toBe("ok");
    const meetings = await listActivities(ctx, { leadId: lead.id, type: "reuniao" });
    expect(meetings[0].subject).toBe("Reunião: Simulação (20 min)");
    expect(meetings[0].data).toEqual({ meetingKind: "simulacao" });

    const noDue = await registerActivityAction(
      initialCrmActionState,
      fd({ leadId: lead.id, type: "tarefa", subject: "Enviar proposta" }),
    );
    expect(noDue.fieldErrors?.dueAt).toBeDefined();

    const lastContactBefore = (await getLead(ctx, lead.id))?.lastContactAt;
    const task = await registerActivityAction(
      initialCrmActionState,
      fd({
        leadId: lead.id,
        type: "tarefa",
        subject: "Enviar proposta",
        dueAt: "2026-10-08T09:00",
      }),
    );
    expect(task.status).toBe("ok");
    const open = (await listOpenTasks(ctx)).filter((t) => t.leadId === lead.id);
    expect(open).toHaveLength(1);
    // Tarefa não é contato: last_contact_at fica como a reunião deixou.
    expect((await getLead(ctx, lead.id))?.lastContactAt).toEqual(lastContactBefore);

    const done = await completeTaskAction(initialCrmActionState, fd({ activityId: open[0].id }));
    expect(done.status).toBe("ok");
    expect((await listOpenTasks(ctx)).filter((t) => t.leadId === lead.id)).toHaveLength(0);
  });
});

describe("assignLeadOwnerAction e updateLeadAction", () => {
  it("atribui dono (com atividade de sistema) e edita campos e attributes do segmento", async () => {
    const lead = await newLead();
    const other = await makeUser(ctx);
    const owner = await assignLeadOwnerAction(
      initialCrmActionState,
      fd({ leadId: lead.id, ownerUserId: other }),
    );
    expect(owner.status).toBe("ok");
    expect((await getLead(ctx, lead.id))?.ownerUserId).toBe(other);
    const system = await listActivities(ctx, { leadId: lead.id, type: "sistema" });
    expect(system.some((a) => a.subject === "Responsável alterado")).toBe(true);

    const edited = await updateLeadAction(
      initialCrmActionState,
      fd({
        leadId: lead.id,
        name: "Lead Editado",
        phone: "",
        interest: "lic_rs",
        tags: "vip, feira",
        attr_empresa: "Empresa Editada",
        attr_contribuinte_icms_rs: "sim",
        attr_irpj_faixa: "100k_500k",
      }),
    );
    expect(edited.status).toBe("ok");
    const after = await getLead(ctx, lead.id);
    expect(after?.name).toBe("Lead Editado");
    expect(after?.phone).toBeNull();
    expect(after?.interest).toBe("lic_rs");
    expect(after?.tags).toEqual(["vip", "feira"]);
    expect(after?.attributes).toMatchObject({
      empresa: "Empresa Editada",
      contribuinte_icms_rs: true,
      irpj_faixa: "100k_500k",
    });
  });
});
