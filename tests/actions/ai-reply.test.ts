// generateReplyAction e recordWhatsappReplyAction (src/actions/ai-reply.ts) contra PGlite com o
// SDK da Anthropic substituído: nenhum teste chama a rede. requireSession é um contexto controlado
// pelo teste; a chave entra por vi.stubEnv e o módulo é recarregado (src/env.ts lê process.env ao
// importar), como em tests/lib/ai-client.test.ts.
import { eq } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_MAX_TOKENS } from "@/config/ai";
import { proposeSlots } from "@/lib/ai/qualification";
import {
  EMAIL_SIGNATURE,
  REPLY_SYSTEM,
  WHATSAPP_EXIT_SENTENCE,
  WHATSAPP_SIGNATURE,
  normalizeReply,
  type Reply,
  type ReplyDraft,
} from "@/lib/ai/reply";
import type { AiActionState } from "@/lib/ai/types";
import { initialCrmActionState } from "@/lib/crm/action-state";
import { db } from "@/lib/db";
import { aiRuns, leads } from "@/lib/db/schema";
import { listActivities } from "@/lib/repos/activities";
import type { Ctx } from "@/lib/repos/ctx";
import { createLead, getLead } from "@/lib/repos/leads";
import { consentContato, makeTenant } from "../helpers";

const session = vi.hoisted(() => ({ ctx: null as Ctx | null }));
const sdk = vi.hoisted(() => ({ create: vi.fn() }));

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

vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status: number | undefined;
    constructor(status?: number, message = "erro da api") {
      super(message);
      this.status = status;
    }
  }
  class AuthenticationError extends APIError {}
  class PermissionDeniedError extends APIError {}
  class RateLimitError extends APIError {}
  class Anthropic {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static PermissionDeniedError = PermissionDeniedError;
    static RateLimitError = RateLimitError;
    beta = { messages: { create: sdk.create } };
  }
  return {
    default: Anthropic,
    APIError,
    AuthenticationError,
    PermissionDeniedError,
    RateLimitError,
  };
});

vi.mock("@anthropic-ai/sdk/helpers/beta/zod", () => ({
  betaZodOutputFormat: (schema: unknown) => ({ type: "json_schema", schema }),
}));

const EMAIL = "rodrigo.pasqualotto@example.test";
const PHONE = "+5554984032180";
const PHONE_DISPLAY = "(54) 98403-2180";
const CNPJ = "55667788000186";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Os horários que a action vai propor (mesmo dia civil do teste).
const slots = proposeSlots(new Date());
const [A, B] = slots.map((s) => s.label);

const emailOutput: Reply = {
  assunto: "Sobre o seu pedido de diagnóstico",
  texto: `Olá, Rodrigo.\n\nVi o seu pedido de diagnóstico para a Rede Farmácias Vale.\n\n1. Em que faixa fica o IRPJ devido no ano?\n2. Quem decide o patrocínio na empresa?\n\nTenho horários ${A} e ${B}. Qual prefere?\n\n${EMAIL_SIGNATURE}`,
  perguntas_incluidas: ["Em que faixa fica o IRPJ devido no ano?", "Quem decide o patrocínio?"],
  horarios_incluidos: [A, B],
};

const whatsappOutput: Reply = {
  assunto: null,
  texto: `Olá, Rodrigo. Aqui é a Daniela, da Prospekto. Recebi seu pedido de diagnóstico para a Rede Farmácias Vale. Quem decide o patrocínio na empresa? Tenho horários ${A} e ${B}. Qual prefere?\n\n${WHATSAPP_SIGNATURE}`,
  perguntas_incluidas: ["Quem decide o patrocínio na empresa?"],
  horarios_incluidos: [A, B],
};

function response(parsed: unknown, over: Record<string, unknown> = {}) {
  return {
    id: "msg_teste",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    stop_details: null,
    // A saída estruturada chega como JSON num bloco de texto (client.beta.messages.create).
    content:
      parsed == null ? [] : [{ type: "text", text: JSON.stringify(parsed), citations: null }],
    usage: {
      input_tokens: 2100,
      output_tokens: 400,
      cache_read_input_tokens: 1800,
      cache_creation_input_tokens: 0,
      iterations: null,
    },
    ...over,
  };
}

// Recarrega src/actions/ai-reply.ts (e, com ele, src/lib/ai/client.ts e src/env.ts).
async function loadActions() {
  vi.resetModules();
  return import("@/actions/ai-reply");
}

const idle: AiActionState<ReplyDraft> = { status: "idle" };

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

let ctx: Ctx;
let leadId: string;

beforeAll(async () => {
  ctx = await makeTenant();
  session.ctx = ctx;
  const { lead } = await createLead(ctx, {
    segment: "PJ",
    interest: "rouanet",
    name: "Rodrigo Pasqualotto",
    email: EMAIL,
    phone: PHONE,
    city: "Garibaldi",
    uf: "RS",
    message: `Pode me ligar no ${PHONE_DISPLAY} ou escrever para ${EMAIL}.`,
    source: "diagnostico",
    sourceDetail: "/diagnostico",
    consents: [consentContato],
    attributes: { empresa: "Rede Farmácias Vale", cnpj: CNPJ, regime_tributario: "lucro_real" },
    formData: { empresa: "Rede Farmácias Vale" },
  });
  leadId = lead.id;
});

beforeEach(() => {
  sdk.create.mockReset();
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-teste");
  vi.stubEnv("AI_MODEL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function runsOfLead() {
  return db.select().from(aiRuns).where(eq(aiRuns.leadId, leadId));
}

describe("guarda de sessão", () => {
  it("sem sessão as duas actions falham antes de tocar no banco ou no SDK", async () => {
    session.ctx = null;
    try {
      const { generateReplyAction, recordWhatsappReplyAction } = await loadActions();
      await expect(generateReplyAction(idle, fd({ leadId, channel: "email" }))).rejects.toThrow(
        "REDIRECT:/entrar",
      );
      await expect(
        recordWhatsappReplyAction(initialCrmActionState, fd({ leadId, text: "Olá" })),
      ).rejects.toThrow("REDIRECT:/entrar");
      expect(sdk.create).not.toHaveBeenCalled();
    } finally {
      session.ctx = ctx;
    }
  });
});

describe("generateReplyAction", () => {
  it("e-mail: mensagem com canal, horários e perguntas do segmento, sem dado pessoal; effort low", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    sdk.create.mockResolvedValue(response(emailOutput));
    const { generateReplyAction } = await loadActions();
    const result = await generateReplyAction(idle, fd({ leadId, channel: "email" }));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.channel).toBe("email");
    expect(result.data.assunto).toBe(emailOutput.assunto);
    expect(result.data.texto).toBe(emailOutput.texto);
    expect(result.data.slots).toEqual(slots);
    expect(result.runId).toMatch(UUID_RE);

    expect(sdk.create).toHaveBeenCalledTimes(1);
    const params = sdk.create.mock.calls[0][0];
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.max_tokens).toBe(AI_MAX_TOKENS);
    expect(params.output_config.effort).toBe("low");
    expect(params.system).toEqual([
      { type: "text", text: REPLY_SYSTEM, cache_control: { type: "ephemeral" } },
    ]);
    expect("thinking" in params).toBe(false);
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0].role).toBe("user");
    const user: string = params.messages[0].content;
    expect(user.startsWith("Hoje é ")).toBe(true);
    expect(user).toContain("CANAL: e-mail");
    // Lead novo e sem contato: o prompt pede a apresentação.
    expect(user).toContain("PRIMEIRO CONTATO: sim");
    expect(user).toContain("Nome: Rodrigo Pasqualotto");
    expect(user).toContain("Empresa ou organização: Rede Farmácias Vale");
    expect(user).toContain(`1. ${A}`);
    expect(user).toContain(`2. ${B}`);
    // Perguntas do segmento PJ, pulando a já respondida (regime tributário).
    expect(user).toContain("- Em que faixa fica o IRPJ devido no ano");
    expect(user).toContain("- Quem decide o patrocínio na empresa");
    expect(user).not.toContain("tributada pelo lucro real? Quem confirma");
    expect(user).toContain("[telefone]");
    expect(user).toContain("[e-mail]");
    expect(user).not.toContain("example.test");
    expect(user).not.toContain("98403");
    expect(user).not.toContain(CNPJ);
    expect(user).not.toMatch(UUID_RE);
    expect(user).not.toContain(ctx.tenantId);

    const runs = await runsOfLead();
    expect(runs).toHaveLength(1);
    expect(runs[0].kind).toBe("reply");
    expect(runs[0].status).toBe("ok");
    // Gravado já normalizado (o rascunho reaberto da página é o mesmo texto do cartão) e com o
    // canal em data (ADR-003, seção 8).
    expect(runs[0].output).toEqual(
      normalizeReply(emailOutput, { channel: "email", slots, isFirstContact: true }),
    );
    expect(runs[0].id).toBe(result.runId);
    expect(runs[0].data).toMatchObject({ effort: "low", channel: "email" });

    const line = spy.mock.calls.map((c) => String(c[0])).find((l) => l.includes("ia executada"));
    expect(line).toBeDefined();
    expect(JSON.parse(line!)).toMatchObject({ kind: "reply", leadId, status: "ok" });
    for (const l of spy.mock.calls.map((c) => String(c[0]))) {
      expect(l).not.toContain("Rodrigo");
      expect(l).not.toContain("Farmácias");
    }
  });

  it("o system é byte a byte igual entre canais e chamadas (cache de prompt)", async () => {
    sdk.create.mockResolvedValueOnce(response(emailOutput));
    sdk.create.mockResolvedValueOnce(response(whatsappOutput));
    const { generateReplyAction } = await loadActions();
    await generateReplyAction(idle, fd({ leadId, channel: "email" }));
    await generateReplyAction(idle, fd({ leadId, channel: "whatsapp" }));
    const [a, b] = sdk.create.mock.calls.map((c) => c[0].system[0].text as string);
    expect(a).toBe(b);
    expect(a).toBe(REPLY_SYSTEM);
    expect(sdk.create.mock.calls[1][0].messages[0].content).toContain("CANAL: WhatsApp");
  });

  it("resposta sem um dos horários recebe o parágrafo acrescentado por normalizeReply", async () => {
    sdk.create.mockResolvedValueOnce(
      response({
        ...emailOutput,
        texto: `Olá, Rodrigo.\n\nPodemos conversar ${A}?\n\n${EMAIL_SIGNATURE}`,
        horarios_incluidos: [A],
      }),
    );
    const { generateReplyAction } = await loadActions();
    const result = await generateReplyAction(idle, fd({ leadId, channel: "email" }));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.texto).toContain(`Tenho horários ${A} e ${B}. Qual prefere?`);
    expect(result.data.texto.endsWith(EMAIL_SIGNATURE)).toBe(true);
  });

  it("WhatsApp para lead novo sem contato termina com a frase de saída e sem assunto, também em ai_runs", async () => {
    sdk.create.mockResolvedValueOnce(response(whatsappOutput));
    const { generateReplyAction } = await loadActions();
    const result = await generateReplyAction(idle, fd({ leadId, channel: "whatsapp" }));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.channel).toBe("whatsapp");
    expect(result.data.assunto).toBeNull();
    expect(result.data.texto.endsWith(`${WHATSAPP_SIGNATURE}\n\n${WHATSAPP_EXIT_SENTENCE}`)).toBe(
      true,
    );
    expect(result.data.texto.length).toBeLessThanOrEqual(900);
    // A linha gravada é o que a página reabre depois de um F5: mesma frase de saída, assunto
    // null (WhatsApp) e o canal em data.
    const run = (await runsOfLead()).find((r) => r.id === result.runId);
    const output = run?.output as Reply;
    expect(output.texto).toBe(result.data.texto);
    expect(output.texto.endsWith(WHATSAPP_EXIT_SENTENCE)).toBe(true);
    expect(output.assunto).toBeNull();
    expect(run?.data).toMatchObject({ channel: "whatsapp" });
  });

  it("lead já contatado: a mensagem diz PRIMEIRO CONTATO: não e a frase de saída sai do texto", async () => {
    const { lead } = await createLead(ctx, {
      segment: "PJ",
      interest: "rouanet",
      name: "Lead Contatado",
      email: "lead.contatado@example.test",
      phone: PHONE,
      source: "linkedin",
      attributes: { empresa: "Empresa Contatada" },
    });
    await db.update(leads).set({ lastContactAt: new Date() }).where(eq(leads.id, lead.id));
    sdk.create.mockResolvedValueOnce(
      response({
        ...whatsappOutput,
        texto: `Olá, Rodrigo. Retomando a nossa conversa: quem decide o patrocínio na empresa? Tenho horários ${A} e ${B}. Qual prefere?\n\n${WHATSAPP_SIGNATURE}\n\n${WHATSAPP_EXIT_SENTENCE}`,
      }),
    );
    const { generateReplyAction } = await loadActions();
    const result = await generateReplyAction(idle, fd({ leadId: lead.id, channel: "whatsapp" }));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const user: string = sdk.create.mock.calls[0][0].messages[0].content;
    expect(user).toContain("PRIMEIRO CONTATO: não");
    expect(user).not.toContain("PRIMEIRO CONTATO: sim");
    expect(result.data.texto).not.toContain(WHATSAPP_EXIT_SENTENCE);
    expect(result.data.texto.endsWith(WHATSAPP_SIGNATURE)).toBe(true);
    // O system continua o mesmo (cache de prompt): a diferença vai na mensagem de usuário.
    expect(sdk.create.mock.calls[0][0].system[0].text).toBe(REPLY_SYSTEM);
  });

  it("URL e e-mail inventados saem antes de gravar: ai_runs.output é o texto normalizado", async () => {
    sdk.create.mockResolvedValueOnce(
      response({
        ...emailOutput,
        texto: `${emailOutput.texto.replace(EMAIL_SIGNATURE, "")}Veja https://exemplo-inventado.com/x ou escreva para daniela@example.test.\n\n${EMAIL_SIGNATURE}`,
      }),
    );
    const { generateReplyAction } = await loadActions();
    const result = await generateReplyAction(idle, fd({ leadId, channel: "email" }));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const run = (await runsOfLead()).find((r) => r.id === result.runId);
    const output = run?.output as Reply;
    expect(output.texto).toBe(result.data.texto);
    expect(output.texto).not.toContain("exemplo-inventado.com");
    expect(output.texto).not.toContain("https://");
    expect(output.texto).toContain("[e-mail]");
    expect(output.texto).not.toContain("example.test");
    expect(output.texto).toContain(`Tenho horários ${A} e ${B}. Qual prefere?`);
  });

  it("e-mail ou telefone inventado pelo modelo sai mascarado", async () => {
    sdk.create.mockResolvedValueOnce(
      response({
        ...emailOutput,
        texto: `${emailOutput.texto.replace(EMAIL_SIGNATURE, "")}Escreva para daniela@example.test ou ligue (54) 98403-2180.\n\n${EMAIL_SIGNATURE}`,
      }),
    );
    const { generateReplyAction } = await loadActions();
    const result = await generateReplyAction(idle, fd({ leadId, channel: "email" }));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.texto).toContain("[e-mail]");
    expect(result.data.texto).toContain("[telefone]");
    expect(result.data.texto).not.toContain("example.test");
    expect(result.data.texto).not.toContain("98403");
  });

  it("recusa, corte e sem chave viram as mensagens do ADR sem quebrar", async () => {
    const { generateReplyAction } = await loadActions();
    sdk.create.mockResolvedValueOnce(
      response(null, { stop_reason: "refusal", stop_details: { category: "general_harms" } }),
    );
    expect(await generateReplyAction(idle, fd({ leadId, channel: "email" }))).toEqual({
      status: "error",
      reason: "refusal",
      message: "A IA não conseguiu gerar este conteúdo. Escreva manualmente.",
    });
    sdk.create.mockResolvedValueOnce(response(null, { stop_reason: "max_tokens" }));
    expect(await generateReplyAction(idle, fd({ leadId, channel: "email" }))).toEqual({
      status: "error",
      reason: "max_tokens",
      message: "A resposta veio incompleta. Tente de novo.",
    });

    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const before = (await runsOfLead()).length;
    const { generateReplyAction: disabled } = await loadActions();
    sdk.create.mockReset();
    expect(await disabled(idle, fd({ leadId, channel: "email" }))).toEqual({
      status: "error",
      reason: "disabled",
      message: "IA não configurada.",
    });
    expect(sdk.create).not.toHaveBeenCalled();
    expect(await runsOfLead()).toHaveLength(before);
  });

  it("canal inválido, leadId inválido ou lead de outro tenant: erro sem chamar o SDK", async () => {
    const { generateReplyAction } = await loadActions();
    expect(await generateReplyAction(idle, fd({ leadId, channel: "sms" }))).toEqual({
      status: "error",
      reason: "error",
      message: "Escolha e-mail ou WhatsApp.",
    });
    expect(await generateReplyAction(idle, fd({ leadId: "x", channel: "email" }))).toEqual({
      status: "error",
      reason: "error",
      message: "Lead não encontrado.",
    });
    const other = await makeTenant();
    const { lead } = await createLead(other, {
      segment: "PJ",
      interest: "rouanet",
      name: "Lead Alheio",
      email: "lead.alheio@example.test",
      source: "linkedin",
      attributes: { empresa: "Outra Empresa" },
    });
    expect(await generateReplyAction(idle, fd({ leadId: lead.id, channel: "email" }))).toEqual({
      status: "error",
      reason: "error",
      message: "Lead não encontrado.",
    });
    expect(sdk.create).not.toHaveBeenCalled();
  });
});

describe("recordWhatsappReplyAction", () => {
  it("grava activities.whatsapp com o texto, atualiza último contato e próxima ação", async () => {
    const own = await makeTenant();
    session.ctx = own;
    try {
      const { lead } = await createLead(own, {
        segment: "PF",
        interest: "rouanet",
        name: "Pessoa WhatsApp",
        email: "pessoa.whatsapp@example.test",
        phone: PHONE,
        source: "linkedin",
        attributes: {},
      });
      const [run] = await db
        .insert(aiRuns)
        .values({
          tenantId: own.tenantId,
          kind: "reply",
          leadId: lead.id,
          model: "claude-opus-5-5",
          status: "ok",
          output: whatsappOutput,
        })
        .returning();
      const { recordWhatsappReplyAction } = await loadActions();
      const text = `Olá. ${WHATSAPP_EXIT_SENTENCE}`;
      const result = await recordWhatsappReplyAction(
        initialCrmActionState,
        fd({ leadId: lead.id, text, slotIso: slots[0].iso, runId: run.id }),
      );
      expect(result).toEqual({ status: "ok", message: "Registrado no histórico." });
      const [activity] = await listActivities(own, { leadId: lead.id, type: "whatsapp" });
      expect(activity.subject).toBe("Primeira resposta pelo WhatsApp");
      expect(activity.body).toBe(text);
      expect(activity.data).toEqual({ ai: true, runId: run.id });
      const updated = await getLead(own, lead.id);
      expect(updated?.lastContactAt).not.toBeNull();
      expect(updated?.nextActionAt?.toISOString()).toBe(slots[0].iso);

      expect(
        await recordWhatsappReplyAction(initialCrmActionState, fd({ leadId: lead.id, text: " " })),
      ).toMatchObject({ status: "error", message: "A mensagem está vazia." });
      expect(await listActivities(own, { leadId: lead.id, type: "whatsapp" })).toHaveLength(1);
    } finally {
      session.ctx = ctx;
    }
  });
});
