// Tipos e mensagens da IA no CRM (ADR-003, seção 7.4; ia-plano.md, decisão P1). Módulo puro,
// compartilhado por servidor e cliente: nada de SDK, banco ou "server-only" aqui.
import { AI_DAILY_LIMIT } from "@/config/ai";

export const AI_KINDS = ["brief", "notes", "reply"] as const;
export type AiKind = (typeof AI_KINDS)[number];

// Estado gravado em ai_runs.status (seção 7.4). "pending" é a linha reservada dentro do teto diário
// antes da chamada ao modelo (reserveAiRun); finishAiRun a troca por um dos outros. Nunca é motivo
// de falha para a tela (AiFailureReason), e getLatestAiRun só lê "ok".
export const AI_RUN_STATUSES = [
  "pending",
  "ok",
  "refusal",
  "max_tokens",
  "invalid_output",
  "error",
] as const;
export type AiRunStatus = (typeof AI_RUN_STATUSES)[number];

export type AiEffort = "low" | "medium";

export type AiFailureReason =
  "disabled" | "quota" | "refusal" | "max_tokens" | "invalid_output" | "error";

// Mensagens prontas para a tela, em português (ADR-003, 7.4).
export const AI_FAILURE_MESSAGES: Record<AiFailureReason, string> = {
  disabled: "IA não configurada.",
  quota: `Limite diário de IA atingido (${AI_DAILY_LIMIT} execuções). Volta a funcionar amanhã.`,
  refusal: "A IA não conseguiu gerar este conteúdo. Escreva manualmente.",
  max_tokens: "A resposta veio incompleta. Tente de novo.",
  invalid_output: "A resposta veio incompleta. Tente de novo.",
  error: "A IA está indisponível agora. Tente em instantes.",
};

export type AiResult<T> =
  | { ok: true; data: T; runId: string; model: string }
  | { ok: false; reason: AiFailureReason; message: string };

// Devolvido pelas Server Actions ao useActionState dos cartões.
export type AiActionState<T> =
  | { status: "idle" }
  | { status: "ok"; data: T; runId: string }
  | { status: "error"; reason: AiFailureReason; message: string };

export const initialAiActionState: AiActionState<never> = { status: "idle" };

export function aiFailure(reason: AiFailureReason): {
  ok: false;
  reason: AiFailureReason;
  message: string;
} {
  return { ok: false, reason, message: AI_FAILURE_MESSAGES[reason] };
}

// Converte o AiResult da chamada no estado da action (os cartões mostram `message` em Callout).
export function toActionState<T>(result: AiResult<T>): AiActionState<T> {
  return result.ok
    ? { status: "ok", data: result.data, runId: result.runId }
    : { status: "error", reason: result.reason, message: result.message };
}

// Última execução bem-sucedida carregada pela página (decisão P2) e passada como `initial` aos
// cartões. `createdAt` em ISO para atravessar a fronteira servidor → cliente. `output` já vem
// normalizado (runStructured grava depois de `normalize`); `data` traz os metadados da execução
// (ex.: `channel` na resposta).
export type AiRunSnapshot<T = Record<string, unknown>> = {
  runId: string;
  output: T;
  data?: Record<string, unknown> | null;
  model: string;
  createdAt: string;
};

// Horário proposto por proposeSlots: ISO em UTC e rótulo por extenso em português.
export type AiSlot = { iso: string; label: string };

// Motivo de "Enviar por e-mail" desabilitado (decisão P6); null quando pode enviar. O consentimento
// precisa estar vigente e, quando registra canais, incluir o e-mail.
export type EmailBlockReason =
  "no_consent" | "no_email_channel" | "email_bounced" | "email_complained" | null;

export const EMAIL_BLOCK_MESSAGES: Record<Exclude<EmailBlockReason, null>, string> = {
  no_consent: "Sem consentimento de contato comercial registrado para este lead.",
  no_email_channel: "O consentimento deste lead não inclui e-mail.",
  email_bounced: "O e-mail deste lead foi devolvido.",
  email_complained: "Este lead marcou nossos e-mails como spam.",
};
