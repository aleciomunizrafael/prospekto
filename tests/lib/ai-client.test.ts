// runStructured (src/lib/ai/client.ts) com o SDK substituído: nenhum teste chama a rede. A chave
// entra por vi.stubEnv e o módulo é recarregado (src/env.ts lê process.env ao importar).
import { eq } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { db } from "@/lib/db";
import { aiRuns } from "@/lib/db/schema";
import type { Ctx } from "@/lib/repos/ctx";
import { makeTenant } from "../helpers";

const sdk = vi.hoisted(() => ({ create: vi.fn(), ctorArgs: [] as unknown[] }));

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
  // Como no SDK: APIError com status undefined, lançado quando o `signal` da chamada aborta.
  class APIUserAbortError extends APIError {
    constructor() {
      super(undefined, "Request was aborted.");
    }
  }
  class Anthropic {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static PermissionDeniedError = PermissionDeniedError;
    static RateLimitError = RateLimitError;
    static APIUserAbortError = APIUserAbortError;
    beta = { messages: { create: sdk.create } };
    constructor(options: unknown) {
      sdk.ctorArgs.push(options);
    }
  }
  return {
    default: Anthropic,
    APIError,
    AuthenticationError,
    PermissionDeniedError,
    RateLimitError,
    APIUserAbortError,
  };
});

vi.mock("@anthropic-ai/sdk/helpers/beta/zod", () => ({
  betaZodOutputFormat: (schema: unknown) => ({ type: "json_schema", schema }),
}));

const schema = z.object({ resumo: z.string() });

// Bloco de texto como a API devolve: JSON da saída estruturada (ou texto truncado/vazio).
const textBlock = (text: string) => ({ type: "text", text, citations: null });

function response(over: Record<string, unknown> = {}) {
  return {
    id: "msg_teste",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    stop_details: null,
    content: [textBlock('{"resumo": "Lead quente."}')],
    usage: {
      input_tokens: 1200,
      output_tokens: 300,
      cache_read_input_tokens: 900,
      cache_creation_input_tokens: 1200,
      iterations: null,
    },
    ...over,
  };
}

// Recarrega src/lib/ai/client.ts (e src/env.ts) depois do vi.stubEnv.
async function loadClient() {
  vi.resetModules();
  return import("@/lib/ai/client");
}

async function runsOf(ctx: Ctx) {
  return db.select().from(aiRuns).where(eq(aiRuns.tenantId, ctx.tenantId));
}

async function Errors() {
  const mod = await import("@anthropic-ai/sdk");
  return mod as unknown as {
    APIError: new (status?: number, message?: string) => Error;
    AuthenticationError: new (status?: number, message?: string) => Error;
    RateLimitError: new (status?: number, message?: string) => Error;
    APIUserAbortError: new () => Error;
  };
}

let ctx: Ctx;

beforeAll(async () => {
  ctx = await makeTenant();
});

beforeEach(() => {
  sdk.create.mockReset();
  sdk.ctorArgs.length = 0;
  vi.stubEnv("ANTHROPIC_API_KEY", "chave-de-teste");
  vi.stubEnv("AI_MODEL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const baseInput = {
  kind: "brief" as const,
  system: "Você prepara a Daniela para uma ligação.",
  user: "Hoje é sexta-feira, 09/10/2026.\nDADOS DO LEAD\n…",
  schema,
  effort: "medium" as const,
};

describe("runStructured: sem chave", () => {
  it("devolve disabled, não chama o SDK e não grava em ai_runs", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const own = await makeTenant();
    const { runStructured, isAiEnabled } = await loadClient();
    expect(isAiEnabled()).toBe(false);
    const result = await runStructured(own, { ...baseInput, leadId: null });
    expect(result).toEqual({ ok: false, reason: "disabled", message: "IA não configurada." });
    expect(sdk.create).not.toHaveBeenCalled();
    expect(sdk.ctorArgs).toHaveLength(0);
    expect(await runsOf(own)).toHaveLength(0);
  });
});

describe("runStructured: forma da chamada", () => {
  it("envia modelo, max_tokens, betas, fallbacks, cache_control e effort; sem thinking nem assistant", async () => {
    sdk.create.mockResolvedValueOnce(response());
    const { runStructured, aiModel } = await loadClient();
    expect(aiModel()).toBe("claude-opus-5-5");
    const result = await runStructured(ctx, { ...baseInput, leadId: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ resumo: "Lead quente." });
    expect(result.model).toBe("claude-opus-5-5");
    expect(sdk.ctorArgs).toEqual([{ apiKey: "chave-de-teste", timeout: 50_000, maxRetries: 2 }]);
    // Prazo total da chamada (todas as tentativas), abaixo do maxDuration = 60 da página do lead.
    const opts = sdk.create.mock.calls[0][1];
    expect(opts.signal).toBeInstanceOf(AbortSignal);
    expect(opts.signal.aborted).toBe(false);
    expect(sdk.create).toHaveBeenCalledTimes(1);
    const params = sdk.create.mock.calls[0][0];
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.max_tokens).toBe(4000);
    expect(params.betas).toEqual([
      "server-side-fallback-2026-07-01",
      "structured-outputs-2025-12-15",
    ]);
    expect(params.fallbacks).toBe("default");
    expect(params.system).toEqual([
      { type: "text", text: baseInput.system, cache_control: { type: "ephemeral" } },
    ]);
    expect(params.messages).toEqual([{ role: "user", content: baseInput.user }]);
    expect(params.messages.some((m: { role: string }) => m.role === "assistant")).toBe(false);
    expect(params.output_config.effort).toBe("medium");
    expect(params.output_config.format).toEqual({ type: "json_schema", schema });
    expect("thinking" in params).toBe(false);
    expect("temperature" in params).toBe(false);
    expect("stream" in params).toBe(false);
    const [run] = (await runsOf(ctx)).filter((r) => r.id === result.runId);
    expect(run.kind).toBe("brief");
    expect(run.status).toBe("ok");
    expect(run.output).toEqual({ resumo: "Lead quente." });
    expect(run.inputTokens).toBe(1200);
    expect(run.outputTokens).toBe(300);
    expect(run.cacheReadInputTokens).toBe(900);
    expect(run.durationMs).toBeGreaterThanOrEqual(0);
    expect(run.createdBy).toBe(ctx.userId);
    expect(run.data).toEqual({
      effort: "medium",
      fallback: false,
      stopDetailsCategory: null,
      httpStatus: 200,
      cacheCreation: 1200,
    });
  });

  it("AI_MODEL troca o modelo enviado", async () => {
    vi.stubEnv("AI_MODEL", "claude-sonnet-5-5");
    sdk.create.mockResolvedValueOnce(response({ model: "claude-sonnet-5-5" }));
    const { runStructured, aiModel } = await loadClient();
    expect(aiModel()).toBe("claude-sonnet-5-5");
    await runStructured(ctx, { ...baseInput, leadId: null, effort: "low" });
    expect(sdk.create.mock.calls[0][0].model).toBe("claude-sonnet-5-5");
    expect(sdk.create.mock.calls[0][0].output_config.effort).toBe("low");
  });

  it("o cliente é criado uma vez por processo", async () => {
    sdk.create.mockResolvedValue(response());
    const { runStructured } = await loadClient();
    await runStructured(ctx, { ...baseInput, leadId: null });
    await runStructured(ctx, { ...baseInput, leadId: null });
    expect(sdk.ctorArgs).toHaveLength(1);
  });

  it("log da execução traz kind, modelo e tokens, nunca o conteúdo", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    sdk.create.mockResolvedValueOnce(response());
    const { runStructured } = await loadClient();
    await runStructured(ctx, { ...baseInput, leadId: null });
    const line = spy.mock.calls.map((c) => String(c[0])).find((l) => l.includes("ia executada"));
    expect(line).toBeDefined();
    const parsed = JSON.parse(line!);
    expect(parsed).toMatchObject({
      kind: "brief",
      model: "claude-opus-5-5",
      status: "ok",
      usageInput: 1200,
      usageOutput: 300,
      usageCacheRead: 900,
      usageCacheCreation: 1200,
      fallback: false,
    });
    expect(line).not.toContain("[redigido]");
    expect(line).not.toContain("Lead quente");
    expect(line).not.toContain("DADOS DO LEAD");
  });
});

describe("runStructured: estados de parada", () => {
  // Formas que o SDK real devolve: `client.beta.messages.parse` lançaria nos três primeiros casos
  // (JSON truncado, fora do esquema ou texto vazio); com `create` a classificação é no código e a
  // execução fica registrada com os tokens e sem log de erro.
  it.each([
    [
      "refusal",
      {
        stop_reason: "refusal",
        stop_details: { category: "general_harms" },
        content: [textBlock("")],
      },
      "general_harms",
    ],
    [
      "max_tokens",
      {
        stop_reason: "max_tokens",
        content: [
          { type: "thinking", thinking: "", signature: "" },
          textBlock('{"resumo": "Lead qu'),
        ],
      },
      null,
    ],
    ["invalid_output", { stop_reason: "end_turn", content: [textBlock('{"resumo": 42}')] }, null],
    ["invalid_output", { stop_reason: "end_turn", content: [] }, null],
    ["refusal", { stop_reason: "refusal", stop_details: null, content: [] }, null],
  ] as const)("%s", async (reason, over, category) => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    sdk.create.mockResolvedValueOnce(response(over as Record<string, unknown>));
    const { runStructured } = await loadClient();
    const own = await makeTenant();
    const result = await runStructured(own, { ...baseInput, leadId: null });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe(reason);
    expect(result.message.length).toBeGreaterThan(10);
    const [run] = await runsOf(own);
    expect(run.status).toBe(reason);
    expect(run.output).toBeNull();
    expect(run.inputTokens).toBe(1200);
    expect(run.outputTokens).toBe(300);
    expect(run.data?.stopDetailsCategory).toBe(category);
    expect(run.data?.httpStatus).toBe(200);
    expect(errors.mock.calls.some((c) => String(c[0]).includes("falha na ia"))).toBe(false);
  });

  it("nunca loga o texto bruto nem o motivo do Zod na saída fora do esquema", async () => {
    const spies = [
      vi.spyOn(console, "log").mockImplementation(() => {}),
      vi.spyOn(console, "warn").mockImplementation(() => {}),
      vi.spyOn(console, "error").mockImplementation(() => {}),
    ];
    sdk.create.mockResolvedValueOnce(
      response({ content: [textBlock('{"resumo": 42, "nome": "Fulano Sigiloso"}')] }),
    );
    const { runStructured } = await loadClient();
    await runStructured(await makeTenant(), { ...baseInput, leadId: null });
    const lines = spies.flatMap((s) => s.mock.calls.map((c) => String(c[0])));
    expect(lines.some((l) => l.includes("ia executada"))).toBe(true);
    expect(lines.join("\n")).not.toContain("Fulano");
    expect(lines.join("\n")).not.toContain("expected");
  });

  it("fallback: grava data.fallback = true e o modelo que respondeu", async () => {
    sdk.create.mockResolvedValueOnce(
      response({
        model: "claude-opus-4-8",
        usage: {
          input_tokens: 1000,
          output_tokens: 200,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
          iterations: [
            { type: "message", input_tokens: 1000, output_tokens: 10 },
            { type: "fallback_message", input_tokens: 1000, output_tokens: 190 },
          ],
        },
      }),
    );
    const { runStructured } = await loadClient();
    const own = await makeTenant();
    const result = await runStructured(own, { ...baseInput, leadId: null });
    expect(result.ok && result.model).toBe("claude-opus-4-8");
    const [run] = await runsOf(own);
    expect(run.model).toBe("claude-opus-4-8");
    expect(run.data?.fallback).toBe(true);
  });
});

describe("runStructured: normalize e data", () => {
  it("normalize roda antes de gravar: ai_runs.output e o retorno são a saída normalizada; data extra entra mesclado", async () => {
    sdk.create.mockResolvedValueOnce(
      response({ content: [textBlock('{"resumo": "  Lead quente.  "}')] }),
    );
    const { runStructured } = await loadClient();
    const own = await makeTenant();
    const normalize = vi.fn((p: { resumo: string }) => ({ resumo: p.resumo.trim().toUpperCase() }));
    const result = await runStructured(own, {
      ...baseInput,
      leadId: null,
      normalize,
      // `effort` extra não sobrescreve o campo fixo.
      data: { channel: "email", effort: "alto" },
    });
    expect(result.ok && result.data).toEqual({ resumo: "LEAD QUENTE." });
    expect(normalize).toHaveBeenCalledTimes(1);
    expect(normalize).toHaveBeenCalledWith({ resumo: "  Lead quente.  " });
    const [run] = await runsOf(own);
    expect(run.output).toEqual({ resumo: "LEAD QUENTE." });
    expect(run.data).toEqual({
      channel: "email",
      effort: "medium",
      fallback: false,
      stopDetailsCategory: null,
      httpStatus: 200,
      cacheCreation: 1200,
    });
  });

  it("fora de ok, normalize não roda e data extra ainda é gravado, inclusive no erro do SDK", async () => {
    const { RateLimitError } = await Errors();
    vi.spyOn(console, "error").mockImplementation(() => {});
    sdk.create.mockResolvedValueOnce(
      response({
        stop_reason: "refusal",
        stop_details: { category: "general_harms" },
        content: [],
      }),
    );
    sdk.create.mockRejectedValueOnce(new RateLimitError(429, "Rate limited"));
    const { runStructured } = await loadClient();
    const own = await makeTenant();
    const normalize = vi.fn((p: { resumo: string }) => p);
    const input = { ...baseInput, leadId: null, normalize, data: { channel: "whatsapp" } };
    expect((await runStructured(own, input)).ok).toBe(false);
    expect((await runStructured(own, input)).ok).toBe(false);
    expect(normalize).not.toHaveBeenCalled();
    const runs = await runsOf(own);
    expect(runs.map((r) => r.status).sort()).toEqual(["error", "refusal"]);
    for (const run of runs) {
      expect(run.output).toBeNull();
      expect(run.data).toMatchObject({ channel: "whatsapp", effort: "medium" });
    }
  });
});

describe("runStructured: teto diário", () => {
  it("200 execuções de hoje bloqueiam sem chamar; as de ontem não contam", async () => {
    const own = await makeTenant();
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60_000);
    const row = (createdAt: Date) => ({
      tenantId: own.tenantId,
      kind: "brief",
      leadId: null,
      model: "claude-opus-5-5",
      status: "ok",
      createdAt,
    });
    await db.insert(aiRuns).values(Array.from({ length: 199 }, () => row(now)));
    await db.insert(aiRuns).values(Array.from({ length: 5 }, () => row(yesterday)));
    sdk.create.mockResolvedValue(response());
    const { runStructured } = await loadClient();
    const first = await runStructured(own, { ...baseInput, leadId: null });
    expect(first.ok).toBe(true);
    expect(sdk.create).toHaveBeenCalledTimes(1);
    const second = await runStructured(own, { ...baseInput, leadId: null });
    expect(second).toEqual({
      ok: false,
      reason: "quota",
      message: "Limite diário de IA atingido (200 execuções). Volta a funcionar amanhã.",
    });
    expect(sdk.create).toHaveBeenCalledTimes(1);
    expect(await runsOf(own)).toHaveLength(205);
  });
});

describe("runStructured: erros do SDK", () => {
  it("aborto pelo prazo total vira erro registrado, sem retentativa e sem a mensagem no log", async () => {
    const { APIUserAbortError } = await Errors();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    sdk.create.mockRejectedValueOnce(new APIUserAbortError());
    const { runStructured } = await loadClient();
    const own = await makeTenant();
    const result = await runStructured(own, { ...baseInput, leadId: null });
    expect(result).toEqual({
      ok: false,
      reason: "error",
      message: "A IA está indisponível agora. Tente em instantes.",
    });
    expect(sdk.create).toHaveBeenCalledTimes(1);
    const [run] = await runsOf(own);
    expect(run.status).toBe("error");
    expect(run.data?.httpStatus).toBeNull();
    expect(run.durationMs).toBeGreaterThanOrEqual(0);
    const line = spy.mock.calls.map((c) => String(c[0])).find((l) => l.includes("falha na ia"));
    expect(line).toBeDefined();
    expect(JSON.parse(line!)).toMatchObject({ kind: "brief", httpStatus: null });
    expect(line).not.toContain("aborted");
  });

  it("APIError 429 vira reason error, grava status error e loga sem a mensagem", async () => {
    const { RateLimitError } = await Errors();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    sdk.create.mockRejectedValueOnce(new RateLimitError(429, "Rate limited: texto bruto do erro"));
    const { runStructured } = await loadClient();
    const own = await makeTenant();
    const result = await runStructured(own, { ...baseInput, leadId: null });
    expect(result).toEqual({
      ok: false,
      reason: "error",
      message: "A IA está indisponível agora. Tente em instantes.",
    });
    const [run] = await runsOf(own);
    expect(run.status).toBe("error");
    expect(run.model).toBe("claude-opus-5-5");
    expect(run.inputTokens).toBe(0);
    expect(run.data).toEqual({
      effort: "medium",
      fallback: false,
      stopDetailsCategory: null,
      httpStatus: 429,
    });
    const line = spy.mock.calls.map((c) => String(c[0])).find((l) => l.includes("falha na ia"));
    expect(line).toBeDefined();
    expect(JSON.parse(line!)).toMatchObject({ kind: "brief", httpStatus: 429 });
    expect(line).not.toContain("texto bruto");
  });

  it("401 avisa chave inválida (warn) e devolve error", async () => {
    const { AuthenticationError } = await Errors();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    sdk.create.mockRejectedValueOnce(new AuthenticationError(401, "invalid x-api-key"));
    const { runStructured } = await loadClient();
    const own = await makeTenant();
    const result = await runStructured(own, { ...baseInput, leadId: null });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toBe("error");
    const line = warn.mock.calls.map((c) => String(c[0])).find((l) => l.includes("chave da IA"));
    expect(line).toBeDefined();
    expect(line).not.toContain("x-api-key");
    expect((await runsOf(own))[0].data?.httpStatus).toBe(401);
  });

  it("erro que não é do SDK também vira error, com httpStatus nulo", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sdk.create.mockRejectedValueOnce(new Error("socket hang up"));
    const { runStructured } = await loadClient();
    const own = await makeTenant();
    const result = await runStructured(own, { ...baseInput, leadId: null });
    expect(!result.ok && result.reason).toBe("error");
    expect((await runsOf(own))[0].data?.httpStatus).toBeNull();
  });
});
