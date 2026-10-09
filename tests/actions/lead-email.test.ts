// sendLeadReplyAction (src/actions/lead-email.ts) contra PGlite, sem RESEND_API_KEY (modo log,
// como tests/lib/email.test.ts): nada é enviado; o log leva só template e lead. requireSession é
// um contexto controlado pelo teste. sendEmail é a real, exceto quando o teste força o resultado.
import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { site } from "@/config/site";
import { EMAIL_BLOCK_MESSAGES } from "@/lib/ai/types";
import { initialCrmActionState } from "@/lib/crm/action-state";
import { db } from "@/lib/db";
import { aiRuns, leads } from "@/lib/db/schema";
import type { ConsentChannel } from "@/lib/domain/enums";
import type { EmailMessage, SendEmailResult } from "@/lib/email/send";
import { listActivities } from "@/lib/repos/activities";
import type { Ctx } from "@/lib/repos/ctx";
import { createLead, getLead } from "@/lib/repos/leads";
import { consentContato, makeTenant } from "../helpers";

const session = vi.hoisted(() => ({ ctx: null as Ctx | null }));
const email = vi.hoisted(() => ({
  override: null as SendEmailResult | null,
  last: null as EmailMessage | null,
}));

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
vi.mock("@/lib/email/send", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email/send")>();
  return {
    ...actual,
    sendEmail: async (message: EmailMessage) => {
      email.last = message;
      return email.override ?? actual.sendEmail(message);
    },
  };
});

import { sendLeadReplyAction } from "@/actions/lead-email";

const EMAIL = "rodrigo.pasqualotto@example.test";
const TEXT = `Olá, Rodrigo.\n\nVi o seu pedido pelo site. Tenho horários segunda-feira, 12 de outubro, às 10h e terça-feira, 13 de outubro, às 15h. Qual prefere?\n\nDaniela`;
const SLOT = "2026-10-12T13:00:00.000Z";

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

let ctx: Ctx;

async function makeLead(
  own: Ctx,
  input: {
    email: string;
    consent: boolean;
    channels?: ConsentChannel[];
    emailStatus?: "ok" | "bounced" | "complained";
  },
) {
  const { lead } = await createLead(own, {
    segment: "PJ",
    interest: "rouanet",
    name: "Rodrigo Pasqualotto",
    email: input.email,
    // Origem fora do site: createLead só exige consentimento para leads vindos de formulário.
    source: "linkedin",
    consents: input.consent
      ? [
          input.channels
            ? { ...consentContato, channels: input.channels, sourcePage: "crm" }
            : consentContato,
        ]
      : [],
    attributes: { empresa: "Rede Farmácias Vale" },
  });
  if (input.emailStatus && input.emailStatus !== "ok") {
    await db.update(leads).set({ emailStatus: input.emailStatus }).where(eq(leads.id, lead.id));
  }
  return lead;
}

beforeAll(async () => {
  ctx = await makeTenant();
  session.ctx = ctx;
});

afterEach(() => {
  email.override = null;
  email.last = null;
  vi.restoreAllMocks();
});

describe("guarda de sessão", () => {
  it("sem sessão falha antes de tocar no banco", async () => {
    session.ctx = null;
    try {
      await expect(
        sendLeadReplyAction(initialCrmActionState, fd({ leadId: "x", subject: "a", text: TEXT })),
      ).rejects.toThrow("REDIRECT:/entrar");
    } finally {
      session.ctx = ctx;
    }
  });
});

describe("sendLeadReplyAction", () => {
  it("sem consentimento de contato comercial: erro e nenhuma atividade", async () => {
    const lead = await makeLead(ctx, { email: "sem.consentimento@example.test", consent: false });
    const result = await sendLeadReplyAction(
      initialCrmActionState,
      fd({ leadId: lead.id, subject: "Sobre o seu contato", text: TEXT, slotIso: SLOT }),
    );
    expect(result).toEqual({ status: "error", message: EMAIL_BLOCK_MESSAGES.no_consent });
    expect(email.last).toBeNull();
    expect(await listActivities(ctx, { leadId: lead.id, type: "email" })).toHaveLength(0);
    expect((await getLead(ctx, lead.id))?.lastContactAt).toBeNull();
  });

  it("consentimento só por WhatsApp: erro no_email_channel, nenhuma atividade e nada enviado", async () => {
    const lead = await makeLead(ctx, {
      email: "so.whatsapp@example.test",
      consent: true,
      channels: ["whatsapp"],
    });
    const result = await sendLeadReplyAction(
      initialCrmActionState,
      fd({ leadId: lead.id, subject: "Sobre o seu contato", text: TEXT, slotIso: SLOT }),
    );
    expect(result).toEqual({ status: "error", message: EMAIL_BLOCK_MESSAGES.no_email_channel });
    expect(email.last).toBeNull();
    expect(await listActivities(ctx, { leadId: lead.id, type: "email" })).toHaveLength(0);
    expect((await getLead(ctx, lead.id))?.lastContactAt).toBeNull();
  });

  it("consentimento do CRM sem canal marcado (registro antigo) não bloqueia o e-mail", async () => {
    const lead = await makeLead(ctx, {
      email: "sem.canal@example.test",
      consent: true,
      channels: [],
    });
    const result = await sendLeadReplyAction(
      initialCrmActionState,
      fd({ leadId: lead.id, subject: "Assunto", text: TEXT }),
    );
    expect(result).toEqual({ status: "ok", message: "E-mail enviado e registrado." });
    expect(await listActivities(ctx, { leadId: lead.id, type: "email" })).toHaveLength(1);
  });

  it("com consentimento e e-mail ok: envia (modo log), registra a atividade e atualiza o lead", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const lead = await makeLead(ctx, { email: EMAIL, consent: true });
    const [run] = await db
      .insert(aiRuns)
      .values({
        tenantId: ctx.tenantId,
        kind: "reply",
        leadId: lead.id,
        model: "claude-opus-5-5",
        status: "ok",
        output: { assunto: "x", texto: TEXT, perguntas_incluidas: [], horarios_incluidos: [] },
      })
      .returning();
    const result = await sendLeadReplyAction(
      initialCrmActionState,
      fd({
        leadId: lead.id,
        subject: "  Sobre o seu pedido de diagnóstico ",
        text: TEXT,
        slotIso: SLOT,
        runId: run.id,
      }),
    );
    expect(result).toEqual({ status: "ok", message: "E-mail enviado e registrado." });

    // A mensagem que saiu por sendEmail: destinatário, reply-to e template; sem descadastro.
    expect(email.last).toMatchObject({
      to: EMAIL,
      subject: "Sobre o seu pedido de diagnóstico",
      replyTo: site.email,
      templateId: "lead-reply",
      leadId: lead.id,
    });
    expect(email.last?.unsubscribeUrl).toBeUndefined();
    expect(email.last?.text).toContain(TEXT);
    expect(email.last?.text).toContain("Serra Gaúcha, RS");
    // Assinatura curta no corpo, bloco completo do template uma vez só.
    expect(email.last?.text.split(site.owner)).toHaveLength(2);
    expect(email.last?.html).toContain("Sobre o seu pedido de diagnóstico");

    const [activity] = await listActivities(ctx, { leadId: lead.id, type: "email" });
    expect(activity.subject).toBe("Sobre o seu pedido de diagnóstico");
    expect(activity.body).toBe(TEXT);
    expect(activity.data).toEqual({ ai: true, runId: run.id, mode: "log" });
    expect(activity.createdByUserId).toBe(ctx.userId);
    const updated = await getLead(ctx, lead.id);
    expect(updated?.lastContactAt).not.toBeNull();
    expect(updated?.nextActionAt?.toISOString()).toBe(SLOT);

    // Log: template e lead, nunca o endereço nem o assunto (R-16).
    const lines = spy.mock.calls.map((c) => String(c[0]));
    const sent = lines.find((l) => l.includes("sem RESEND_API_KEY"));
    expect(sent).toBeDefined();
    expect(JSON.parse(sent!)).toMatchObject({ templateId: "lead-reply", leadId: lead.id });
    for (const l of lines) {
      expect(l).not.toContain("example.test");
      expect(l).not.toContain("Sobre o seu pedido");
      expect(l).not.toContain("Rodrigo");
    }
  });

  it("o mesmo rascunho com o mesmo texto não sai duas vezes; editado, sai", async () => {
    const lead = await makeLead(ctx, { email: "reenvio@example.test", consent: true });
    const [run] = await db
      .insert(aiRuns)
      .values({
        tenantId: ctx.tenantId,
        kind: "reply",
        leadId: lead.id,
        model: "claude-opus-5-5",
        status: "ok",
        output: { assunto: "x", texto: TEXT, perguntas_incluidas: [], horarios_incluidos: [] },
      })
      .returning();
    const send = (text: string) =>
      sendLeadReplyAction(
        initialCrmActionState,
        fd({ leadId: lead.id, subject: "Assunto", text, slotIso: SLOT, runId: run.id }),
      );
    expect((await send(TEXT)).status).toBe("ok");
    email.last = null;

    // Segundo clique (ou recarregamento da página) com o texto idêntico, inclusive espaços.
    expect(await send(`  ${TEXT}\n`)).toEqual({
      status: "error",
      message:
        "Este e-mail já foi enviado para o lead. Edite o texto ou gere de novo para enviar outro.",
    });
    expect(email.last).toBeNull();
    expect(await listActivities(ctx, { leadId: lead.id, type: "email" })).toHaveLength(1);

    // Texto revisado é outro e-mail.
    expect((await send(`${TEXT} Obrigada.`)).status).toBe("ok");
    expect(email.last).not.toBeNull();
    expect(await listActivities(ctx, { leadId: lead.id, type: "email" })).toHaveLength(2);
  });

  it("sem runId a atividade fica como escrita à mão (ai: false) e sem próxima ação", async () => {
    const lead = await makeLead(ctx, { email: "manual@example.test", consent: true });
    const result = await sendLeadReplyAction(
      initialCrmActionState,
      fd({ leadId: lead.id, subject: "Assunto", text: TEXT }),
    );
    expect(result.status).toBe("ok");
    const [activity] = await listActivities(ctx, { leadId: lead.id, type: "email" });
    expect(activity.data).toEqual({ ai: false, runId: null, mode: "log" });
    expect((await getLead(ctx, lead.id))?.nextActionAt).toBeNull();
  });

  it.each([
    ["bounced", EMAIL_BLOCK_MESSAGES.email_bounced],
    ["complained", EMAIL_BLOCK_MESSAGES.email_complained],
  ] as const)("e-mail %s bloqueia mesmo com consentimento", async (status, message) => {
    const lead = await makeLead(ctx, {
      email: `${status}@example.test`,
      consent: true,
      emailStatus: status,
    });
    const result = await sendLeadReplyAction(
      initialCrmActionState,
      fd({ leadId: lead.id, subject: "Assunto", text: TEXT }),
    );
    expect(result).toEqual({ status: "error", message });
    expect(email.last).toBeNull();
    expect(await listActivities(ctx, { leadId: lead.id, type: "email" })).toHaveLength(0);
  });

  it("falha do provedor: erro amigável e nenhuma atividade", async () => {
    const lead = await makeLead(ctx, { email: "provedor@example.test", consent: true });
    email.override = { delivered: false, mode: "error", error: "422 unprocessable" };
    const result = await sendLeadReplyAction(
      initialCrmActionState,
      fd({ leadId: lead.id, subject: "Assunto", text: TEXT }),
    );
    expect(result).toEqual({
      status: "error",
      message: "Não foi possível enviar o e-mail. Tente de novo em instantes.",
    });
    expect(await listActivities(ctx, { leadId: lead.id, type: "email" })).toHaveLength(0);
  });

  it("entrega pelo Resend grava data.mode = resend", async () => {
    const lead = await makeLead(ctx, { email: "resend@example.test", consent: true });
    email.override = { delivered: true, mode: "resend", id: "re_123" };
    const result = await sendLeadReplyAction(
      initialCrmActionState,
      fd({ leadId: lead.id, subject: "Assunto", text: TEXT }),
    );
    expect(result.status).toBe("ok");
    const [activity] = await listActivities(ctx, { leadId: lead.id, type: "email" });
    expect(activity.data).toMatchObject({ mode: "resend" });
  });

  it("validação: assunto vazio, mensagem curta ou horário inválido devolvem a frase do campo", async () => {
    const lead = await makeLead(ctx, { email: "validacao@example.test", consent: true });
    expect(
      await sendLeadReplyAction(
        initialCrmActionState,
        fd({ leadId: lead.id, subject: "", text: TEXT }),
      ),
    ).toEqual({ status: "error", message: "Informe o assunto do e-mail." });
    expect(
      await sendLeadReplyAction(
        initialCrmActionState,
        fd({ leadId: lead.id, subject: "Assunto", text: "Oi" }),
      ),
    ).toEqual({ status: "error", message: "A mensagem precisa ter pelo menos 20 caracteres." });
    expect(
      await sendLeadReplyAction(
        initialCrmActionState,
        fd({ leadId: lead.id, subject: "Assunto", text: TEXT, slotIso: "ontem" }),
      ),
    ).toEqual({ status: "error", message: "Horário da próxima ação inválido." });
    expect(email.last).toBeNull();
  });

  it("lead de outro tenant: 'Lead não encontrado.' sem enviar", async () => {
    const other = await makeTenant();
    const lead = await makeLead(other, { email: "alheio@example.test", consent: true });
    const result = await sendLeadReplyAction(
      initialCrmActionState,
      fd({ leadId: lead.id, subject: "Assunto", text: TEXT }),
    );
    expect(result).toEqual({ status: "error", message: "Lead não encontrado." });
    expect(email.last).toBeNull();
  });
});
