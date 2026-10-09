// generateBriefAction (src/actions/ai-brief.ts) contra PGlite com o SDK da Anthropic substituído:
// nenhum teste chama a rede. requireSession é um contexto controlado pelo teste; a chave entra por
// vi.stubEnv e o módulo é recarregado (src/env.ts lê process.env ao importar), como em
// tests/lib/ai-client.test.ts.
import { eq } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BRIEF_SYSTEM, type Brief } from "@/lib/ai/brief";
import type { AiActionState } from "@/lib/ai/types";
import { db } from "@/lib/db";
import { aiRuns } from "@/lib/db/schema";
import { createActivity } from "@/lib/repos/activities";
import type { Ctx } from "@/lib/repos/ctx";
import { createLead } from "@/lib/repos/leads";
import { consentContato, makeTenant } from "../helpers";

const session = vi.hoisted(() => ({ ctx: null as Ctx | null }));
const sdk = vi.hoisted(() => ({ parse: vi.fn() }));

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
    beta = { messages: { parse: sdk.parse } };
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
const PHONE = "(54) 98403-2180";
const CNPJ = "55667788000186";
const CPF = "529.982.247-25";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const briefOutput: Brief = {
  resumo: "Rodrigo dirige uma rede de farmácias em Garibaldi e pediu o diagnóstico pelo site.",
  gancho_abertura: "Rodrigo, vi o seu pedido de diagnóstico pelo site. O que te chamou a atenção?",
  pontos_atencao: ["Prazo do estágio vence em 1 dia útil."],
  perguntas: ["A empresa é tributada pelo lucro real?", "Quem decide o patrocínio?"],
  objecoes_provaveis: [
    { objecao: "Vai dar problema com a Receita.", resposta: "É dedução prevista em lei." },
  ],
  proximo_passo: { acao: "Ligar hoje e confirmar o regime com o contador.", prazo: "hoje" },
  lacunas: ["Faixa de IRPJ devido."],
};

function response(over: Record<string, unknown> = {}) {
  return {
    id: "msg_teste",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    stop_details: null,
    content: [],
    parsed_output: briefOutput,
    usage: {
      input_tokens: 2500,
      output_tokens: 600,
      cache_read_input_tokens: 2000,
      cache_creation_input_tokens: 0,
      iterations: null,
    },
    ...over,
  };
}

// Recarrega src/actions/ai-brief.ts (e, com ele, src/lib/ai/client.ts e src/env.ts).
async function loadAction() {
  vi.resetModules();
  return import("@/actions/ai-brief");
}

const idle: AiActionState<Brief> = { status: "idle" };

function fd(leadId: string): FormData {
  const f = new FormData();
  f.append("leadId", leadId);
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
    message: `Pode me ligar no ${PHONE} ou escrever para ${EMAIL}. Meu CPF é ${CPF}.`,
    source: "site",
    sourceDetail: "/empresas",
    consents: [consentContato],
    attributes: { empresa: "Rede Farmácias Vale", cnpj: CNPJ, regime_tributario: "lucro_real" },
    formData: { empresa: "Rede Farmácias Vale" },
  });
  leadId = lead.id;
  await createActivity(ctx, {
    type: "ligacao",
    subject: "Sem resposta, deixar recado",
    body: `Tentei no ${PHONE}; mandar e-mail para ${EMAIL}.`,
    leadId,
    occurredAt: new Date(Date.now() - 60 * 60_000),
  });
});

beforeEach(() => {
  sdk.parse.mockReset();
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
  it("sem sessão a action falha antes de tocar no banco ou no SDK", async () => {
    session.ctx = null;
    try {
      const { generateBriefAction } = await loadAction();
      await expect(generateBriefAction(idle, fd(leadId))).rejects.toThrow("REDIRECT:/entrar");
      expect(sdk.parse).not.toHaveBeenCalled();
    } finally {
      session.ctx = ctx;
    }
  });
});

describe("generateBriefAction", () => {
  it("gera o briefing: contexto redigido na mensagem, system estável, effort medium, linha em ai_runs", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    sdk.parse.mockResolvedValue(response());
    const { generateBriefAction } = await loadAction();
    const result = await generateBriefAction(idle, fd(leadId));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toEqual(briefOutput);
    expect(result.runId).toMatch(UUID_RE);

    expect(sdk.parse).toHaveBeenCalledTimes(1);
    const params = sdk.parse.mock.calls[0][0];
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.max_tokens).toBe(4000);
    expect(params.output_config.effort).toBe("medium");
    expect(params.system).toEqual([
      { type: "text", text: BRIEF_SYSTEM, cache_control: { type: "ephemeral" } },
    ]);
    expect("thinking" in params).toBe(false);
    expect(params.messages).toHaveLength(1);
    const user: string = params.messages[0].content;
    expect(params.messages[0].role).toBe("user");
    expect(user.startsWith("Hoje é ")).toBe(true);
    expect(user).toContain("Nome: Rodrigo Pasqualotto");
    expect(user).toContain("Empresa ou organização: Rede Farmácias Vale");
    expect(user).toContain("Cidade: Garibaldi/RS");
    expect(user).toContain("Estágio: Novo");
    expect(user).toContain("Regime tributário: Lucro real");
    expect(user).toContain("Sem resposta, deixar recado");
    expect(user).toContain("[telefone]");
    expect(user).toContain("[e-mail]");
    expect(user).not.toContain("example.test");
    expect(user).not.toContain("98403");
    expect(user).not.toContain(CNPJ);
    expect(user).not.toContain("55.667.788");
    expect(user).not.toContain("529.982");
    expect(user).not.toMatch(UUID_RE);
    expect(user).not.toContain(ctx.tenantId);

    const runs = await runsOfLead();
    expect(runs).toHaveLength(1);
    expect(runs[0].kind).toBe("brief");
    expect(runs[0].tenantId).toBe(ctx.tenantId);
    expect(runs[0].status).toBe("ok");
    expect(runs[0].output).toEqual(briefOutput);
    expect(runs[0].createdBy).toBe(ctx.userId);
    expect(runs[0].id).toBe(result.runId);

    // Log só com kind, lead, modelo, status e contagens; nunca o conteúdo (R-16).
    const line = spy.mock.calls.map((c) => String(c[0])).find((l) => l.includes("ia executada"));
    expect(line).toBeDefined();
    expect(JSON.parse(line!)).toMatchObject({ kind: "brief", leadId, status: "ok" });
    for (const l of spy.mock.calls.map((c) => String(c[0]))) {
      expect(l).not.toContain("Rodrigo");
      expect(l).not.toContain("farmácias");
      expect(l).not.toContain("Receita");
    }
  });

  it("o system é byte a byte igual em duas chamadas seguidas (cache de prompt)", async () => {
    sdk.parse.mockResolvedValue(response());
    const { generateBriefAction } = await loadAction();
    await generateBriefAction(idle, fd(leadId));
    await generateBriefAction(idle, fd(leadId));
    const [a, b] = sdk.parse.mock.calls.map((c) => c[0].system[0].text as string);
    expect(a).toBe(b);
    expect(a).toBe(BRIEF_SYSTEM);
    expect(a).not.toMatch(/Hoje é/);
  });

  it("normaliza a saída antes de devolver: listas cortadas, vazios e duplicados fora", async () => {
    sdk.parse.mockResolvedValueOnce(
      response({
        parsed_output: {
          ...briefOutput,
          pontos_atencao: ["", " Risco A ", "risco a", "B", "C", "D", "E", "F", "G"],
          perguntas: Array.from({ length: 10 }, (_, i) => `Pergunta ${i}`),
        },
      }),
    );
    const { generateBriefAction } = await loadAction();
    const result = await generateBriefAction(idle, fd(leadId));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.pontos_atencao).toEqual(["Risco A", "B", "C", "D", "E", "F"]);
    expect(result.data.perguntas).toHaveLength(7);
  });

  it("recusa devolve a mensagem do ADR e grava status refusal", async () => {
    const before = (await runsOfLead()).length;
    sdk.parse.mockResolvedValueOnce(
      response({
        stop_reason: "refusal",
        stop_details: { category: "general_harms" },
        parsed_output: null,
      }),
    );
    const { generateBriefAction } = await loadAction();
    const result = await generateBriefAction(idle, fd(leadId));
    expect(result).toEqual({
      status: "error",
      reason: "refusal",
      message: "A IA não conseguiu gerar este conteúdo. Escreva manualmente.",
    });
    const runs = await runsOfLead();
    expect(runs).toHaveLength(before + 1);
    expect(runs.at(-1)?.status).toBe("refusal");
  });

  it("resposta cortada (max_tokens) vira erro amigável", async () => {
    sdk.parse.mockResolvedValueOnce(response({ stop_reason: "max_tokens", parsed_output: null }));
    const { generateBriefAction } = await loadAction();
    const result = await generateBriefAction(idle, fd(leadId));
    expect(result).toEqual({
      status: "error",
      reason: "max_tokens",
      message: "A resposta veio incompleta. Tente de novo.",
    });
  });

  it("sem chave devolve disabled sem chamar o SDK nem gravar", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const before = (await runsOfLead()).length;
    const { generateBriefAction } = await loadAction();
    const result = await generateBriefAction(idle, fd(leadId));
    expect(result).toEqual({ status: "error", reason: "disabled", message: "IA não configurada." });
    expect(sdk.parse).not.toHaveBeenCalled();
    expect(await runsOfLead()).toHaveLength(before);
  });

  it("teto diário atingido devolve quota sem chamar o SDK", async () => {
    const own = await makeTenant();
    session.ctx = own;
    try {
      const { lead } = await createLead(own, {
        segment: "PF",
        interest: "rouanet",
        name: "Pessoa Teto",
        email: "pessoa.teto@example.test",
        source: "linkedin",
        attributes: {},
      });
      await db.insert(aiRuns).values(
        Array.from({ length: 200 }, () => ({
          tenantId: own.tenantId,
          kind: "brief",
          leadId: null,
          model: "claude-opus-5-5",
          status: "ok",
        })),
      );
      const { generateBriefAction } = await loadAction();
      const result = await generateBriefAction(idle, fd(lead.id));
      expect(result.status).toBe("error");
      expect(result.status === "error" && result.reason).toBe("quota");
      expect(sdk.parse).not.toHaveBeenCalled();
    } finally {
      session.ctx = ctx;
    }
  });

  it("erro do SDK vira mensagem de indisponibilidade", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mod = (await import("@anthropic-ai/sdk")) as unknown as {
      RateLimitError: new (status?: number, message?: string) => Error;
    };
    sdk.parse.mockRejectedValueOnce(new mod.RateLimitError(429, "Rate limited"));
    const { generateBriefAction } = await loadAction();
    const result = await generateBriefAction(idle, fd(leadId));
    expect(result).toEqual({
      status: "error",
      reason: "error",
      message: "A IA está indisponível agora. Tente em instantes.",
    });
  });

  it("leadId inválido ou de outro tenant: 'Lead não encontrado.' sem chamar o SDK", async () => {
    const { generateBriefAction } = await loadAction();
    expect(await generateBriefAction(idle, fd("nao-e-uuid"))).toEqual({
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
    expect(await generateBriefAction(idle, fd(lead.id))).toEqual({
      status: "error",
      reason: "error",
      message: "Lead não encontrado.",
    });
    expect(sdk.parse).not.toHaveBeenCalled();
  });
});
