import "server-only";
// Única porta de saída para a Claude API (ADR-003, seção 7; ia-plano.md, Fundação). Nenhuma
// chamada ao modelo fora de runStructured. Referência lida: claude-api/typescript/claude-api/
// README.md, tool-use.md (Structured Outputs), shared/prompt-caching.md e shared/model-migration.md
// (Claude Opus 5.5: pensamento sempre ligado, controlado por output_config.effort; fallbacks
// "default" com o header server-side-fallback-2026-07-01; nunca prefill de assistant).
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { AI_DAILY_LIMIT, AI_DEFAULT_MODEL, AI_MAX_TOKENS } from "@/config/ai";
import { env } from "@/env";
import { log } from "@/lib/log";
import { countAiRunsToday, insertAiRun } from "@/lib/repos/ai-runs";
import type { Ctx } from "@/lib/repos/ctx";
import { aiFailure, type AiEffort, type AiKind, type AiResult, type AiRunStatus } from "./types";

const FALLBACK_BETA = "server-side-fallback-2026-07-01";

// Cliente criado uma vez por processo e só com chave explícita: nunca `new Anthropic()` sem
// argumento, para não ler credencial de perfil local por acidente (ADR-003, seção 9).
let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client ??= new Anthropic({ apiKey, timeout: 55_000, maxRetries: 2 });
  return client;
}

export function isAiEnabled(): boolean {
  return !!env.ANTHROPIC_API_KEY;
}

export function aiModel(): string {
  return env.AI_MODEL ?? AI_DEFAULT_MODEL;
}

export type RunStructuredInput<S extends z.ZodObject<z.ZodRawShape>> = {
  kind: AiKind;
  leadId: string | null;
  // Estável por recurso: sem data, nome ou id, para o cache de prompt valer (decisão P4).
  system: string;
  // Contexto do lead (src/lib/ai/redact.ts), data de hoje e a instrução do recurso.
  user: string;
  schema: S;
  effort: AiEffort;
  // Pós-processamento puro da saída validada (normalizeBrief, normalizeReply). Roda antes de
  // gravar: ai_runs.output é o que o cartão mostra, hoje e depois de recarregar a página, e as
  // defesas da normalização (mascarar, remover URL, horários, SAIR, limite) valem também para o
  // rascunho reaberto. Nunca lança.
  normalize?: (parsed: z.infer<S>) => z.infer<S>;
  // Metadados sem conteúdo que o recurso acrescenta a ai_runs.data (ex.: `channel` na resposta).
  data?: Record<string, unknown>;
};

function statusOf(response: { stop_reason: string | null; parsed_output: unknown }): AiRunStatus {
  if (response.stop_reason === "refusal") return "refusal";
  if (response.stop_reason === "max_tokens") return "max_tokens";
  if (response.parsed_output == null) return "invalid_output";
  return "ok";
}

export async function runStructured<S extends z.ZodObject<z.ZodRawShape>>(
  ctx: Ctx,
  input: RunStructuredInput<S>,
): Promise<AiResult<z.infer<S>>> {
  const api = getClient();
  if (!api) return aiFailure("disabled");
  const { kind, leadId, effort } = input;
  if ((await countAiRunsToday(ctx, new Date())) >= AI_DAILY_LIMIT) return aiFailure("quota");

  const model = aiModel();
  const started = performance.now();
  try {
    const response = await api.beta.messages.parse({
      model,
      max_tokens: AI_MAX_TOKENS,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: [{ type: "text", text: input.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: input.user }],
      output_config: { effort, format: betaZodOutputFormat(input.schema) },
    });
    const durationMs = Math.round(performance.now() - started);
    const status = statusOf(response);
    const fallback = (response.usage.iterations ?? []).some((i) => i.type === "fallback_message");
    const raw = (status === "ok" ? response.parsed_output : null) as z.infer<S> | null;
    const parsed = raw != null && input.normalize ? input.normalize(raw) : raw;
    const usage = response.usage;
    const run = await insertAiRun(ctx, {
      kind,
      leadId,
      model: response.model,
      status,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
      durationMs,
      output: parsed as Record<string, unknown> | null,
      data: {
        ...input.data,
        effort,
        fallback,
        stopDetailsCategory: response.stop_details?.category ?? null,
        httpStatus: 200,
      },
      createdBy: ctx.userId ?? null,
    });
    // Contagens de tokens com chaves sem "token": src/lib/log.ts redige toda chave que contenha
    // essa palavra (R-16), e aqui são só números de uso.
    log("info", "ia executada", {
      tenantId: ctx.tenantId,
      kind,
      leadId,
      model: response.model,
      status,
      usageInput: usage.input_tokens,
      usageOutput: usage.output_tokens,
      usageCacheRead: usage.cache_read_input_tokens ?? 0,
      durationMs,
      fallback,
    });
    if (status !== "ok" || parsed == null)
      return aiFailure(status === "ok" ? "invalid_output" : status);
    return { ok: true, data: parsed, runId: run.id, model: response.model };
  } catch (error) {
    const durationMs = Math.round(performance.now() - started);
    // Classes tipadas do SDK por instanceof, nunca por texto da mensagem; a mensagem bruta não
    // vai ao log (pode citar o conteúdo enviado).
    const httpStatus = error instanceof Anthropic.APIError ? (error.status ?? null) : null;
    if (
      error instanceof Anthropic.AuthenticationError ||
      error instanceof Anthropic.PermissionDeniedError
    ) {
      log("warn", "chave da IA inválida", { tenantId: ctx.tenantId, kind, leadId, httpStatus });
    } else {
      log("error", "falha na ia", { tenantId: ctx.tenantId, kind, leadId, httpStatus, durationMs });
    }
    try {
      await insertAiRun(ctx, {
        kind,
        leadId,
        model,
        status: "error",
        durationMs,
        data: { ...input.data, effort, fallback: false, stopDetailsCategory: null, httpStatus },
        createdBy: ctx.userId ?? null,
      });
    } catch {
      log("error", "falha ao registrar a execução da ia", { tenantId: ctx.tenantId, kind, leadId });
    }
    return aiFailure("error");
  }
}
