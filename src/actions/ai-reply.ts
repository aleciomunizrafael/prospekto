"use server";

// "Resposta sugerida" (ADR-003, frente 3; ia-plano.md, Frente C). Toda função começa com
// requireSession() (AGENTS.md; tests/auth-guard.test.ts). generateReplyAction só orquestra:
// recarrega os dados pelos repositórios (R-15), monta o contexto redigido (src/lib/ai/redact.ts),
// propõe os horários no código (decisão P5), chama runStructured (única porta de saída para a
// Claude API) e devolve AiActionState<ReplyDraft> ao useActionState do cartão. Nada é enviado ao
// lead aqui: o envio por e-mail é sendLeadReplyAction (lead-email.ts) e o WhatsApp abre no
// aparelho da pessoa; recordWhatsappReplyAction só registra o que ela disse que enviou.
import { refresh } from "next/cache";
import { z } from "zod";
import { runStructured } from "@/lib/ai/client";
import { proposeSlots, qualificationQuestions } from "@/lib/ai/qualification";
import { buildLeadContext } from "@/lib/ai/redact";
import {
  REPLY_CHANNELS,
  REPLY_SYSTEM,
  normalizeReply,
  replySchema,
  replyUserMessage,
  type ReplyDraft,
} from "@/lib/ai/reply";
import { toActionState, type AiActionState } from "@/lib/ai/types";
import { formDataToStrings, type CrmActionState } from "@/lib/crm/action-state";
import { isInitialStage, type Pipeline } from "@/lib/domain/pipelines";
import { log } from "@/lib/log";
import { listActivities } from "@/lib/repos/activities";
import { listConsents } from "@/lib/repos/consents";
import { getLeadDetail, recordLeadActivity } from "@/lib/repos/leads";
import { listSimulations } from "@/lib/repos/simulations";
import { requireSession } from "@/lib/session";
import { uuidSchema } from "@/lib/validation/common";

const generateSchema = z.object({
  leadId: uuidSchema,
  channel: z.enum(REPLY_CHANNELS, { error: "Escolha e-mail ou WhatsApp." }),
});

function fail(message: string): AiActionState<ReplyDraft> {
  return { status: "error", reason: "error", message };
}

export async function generateReplyAction(
  _prev: AiActionState<ReplyDraft>,
  formData: FormData,
): Promise<AiActionState<ReplyDraft>> {
  const ctx = await requireSession();
  const parsed = generateSchema.safeParse(formDataToStrings(formData));
  if (!parsed.success) {
    return fail(
      parsed.error.issues[0]?.path[0] === "channel"
        ? "Escolha e-mail ou WhatsApp."
        : "Lead não encontrado.",
    );
  }
  const { leadId, channel } = parsed.data;
  try {
    const lead = await getLeadDetail(ctx, leadId);
    if (!lead) return fail("Lead não encontrado.");
    const now = new Date();
    // Modo "reply" do contexto (ADR-003, 5.1): sem aportes e sem responsável, 5 atividades.
    const [activities, consents, simulations] = await Promise.all([
      listActivities(ctx, { leadId, limit: 300 }),
      listConsents(ctx, leadId),
      listSimulations(ctx, { leadId, limit: 10 }),
    ]);
    const context = buildLeadContext({
      lead,
      activities,
      consents,
      simulations,
      contributions: [],
      ownerName: null,
      projectNames: new Map(),
      now,
    });
    const slots = proposeSlots(now);
    const questions = qualificationQuestions(lead.segment, lead.attributes);
    // Primeiro contato (estágio inicial e sem contato): o prompt pede apresentação e, no WhatsApp,
    // a frase de saída; fora dele, retoma a conversa. O mesmo valor vai à normalização.
    const isFirstContact =
      isInitialStage(lead.pipeline as Pipeline, lead.stage) && !lead.lastContactAt;
    // A normalização roda dentro de runStructured, antes de gravar: o rascunho reaberto da página
    // (ai_runs.output) é o mesmo texto que o cartão recebeu agora, e `channel` fica em
    // ai_runs.data (ADR-003, seção 8).
    const result = await runStructured(ctx, {
      kind: "reply",
      leadId,
      system: REPLY_SYSTEM,
      user: replyUserMessage(context, { channel, questions, slots, now, isFirstContact }),
      schema: replySchema,
      effort: "low",
      normalize: (reply) => normalizeReply(reply, { channel, slots, isFirstContact }),
      data: { channel },
    });
    if (!result.ok) return toActionState(result);
    return { status: "ok", data: { ...result.data, channel, slots }, runId: result.runId };
  } catch (error) {
    // Falha ao carregar os dados (a chamada ao modelo já trata as suas por dentro). Sem conteúdo
    // no log (R-16).
    log("error", "falha ao preparar a resposta sugerida", {
      tenantId: ctx.tenantId,
      leadId,
      error,
    });
    return fail("Não foi possível preparar o rascunho. Tente de novo em instantes.");
  }
}

// ------------------------------------------------------------------------------------------
// "Enviou? Registrar no histórico" depois de abrir o WhatsApp
// ------------------------------------------------------------------------------------------

const optionalInstant = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Horário inválido." });
      return z.NEVER;
    }
    return d;
  });

const recordWhatsappSchema = z.object({
  leadId: uuidSchema,
  text: z
    .string()
    .trim()
    .min(1, { error: "A mensagem está vazia." })
    .max(8000, { error: "A mensagem passa de 8.000 caracteres." }),
  slotIso: optionalInstant,
  runId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(uuidSchema.optional()),
});

export async function recordWhatsappReplyAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const ctx = await requireSession();
  const parsed = recordWhatsappSchema.safeParse(formDataToStrings(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Confira os campos." };
  }
  const d = parsed.data;
  try {
    await recordLeadActivity(ctx, {
      leadId: d.leadId,
      activity: {
        type: "whatsapp",
        subject: "Primeira resposta pelo WhatsApp",
        body: d.text,
        data: { ai: true, runId: d.runId ?? null },
      },
      touchLastContact: true,
      nextActionAt: d.slotIso,
    });
  } catch (error) {
    log("error", "falha ao registrar a resposta pelo WhatsApp", {
      tenantId: ctx.tenantId,
      leadId: d.leadId,
      error,
    });
    return { status: "error", message: "Não foi possível registrar. Tente de novo em instantes." };
  }
  log("info", "resposta pelo WhatsApp registrada", {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    leadId: d.leadId,
    ai: true,
  });
  refresh();
  return { status: "ok", message: "Registrado no histórico." };
}
