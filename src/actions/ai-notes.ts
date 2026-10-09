"use server";

// Server Actions de "Ditar e organizar" (ADR-003, frente 2; ia-plano.md, Frente B). Toda função
// começa com requireSession() (AGENTS.md; tests/auth-guard.test.ts). A única chamada ao modelo
// passa por runStructured; a sugestão nunca é gravada sozinha: o registro da atividade continua
// pelo registerActivityAction, e os campos da empresa só vão ao lead por applyLeadAttributesAction
// (um clique separado, decisão P7).
import { refresh } from "next/cache";
import { z } from "zod";
import { runStructured } from "@/lib/ai/client";
import {
  NOTES_TEXT_MAX,
  NOTES_TEXT_MIN,
  attributeKeysFor,
  normalizeNotes,
  notesSchemaFor,
  notesSystemFor,
  notesUserMessage,
  type Notes,
} from "@/lib/ai/notes";
import { buildLeadContext } from "@/lib/ai/redact";
import type { AiActionState } from "@/lib/ai/types";
import { firstIssueByField, formDataToStrings, type CrmActionState } from "@/lib/crm/action-state";
import { DomainError } from "@/lib/errors";
import { log } from "@/lib/log";
import { listActivities } from "@/lib/repos/activities";
import { getLead, getLeadDetail, updateLead } from "@/lib/repos/leads";
import { requireSession } from "@/lib/session";
import { uuidSchema } from "@/lib/validation/common";

// Atividades carregadas para o contexto; renderLeadContext (modo "notes") mostra só as 5 últimas
// de contato, então a margem cobre eventos automáticos no meio.
const CONTEXT_ACTIVITIES = 20;

const organizeSchema = z.object({
  leadId: uuidSchema,
  text: z
    .string()
    .trim()
    .min(NOTES_TEXT_MIN, {
      error: `Dite ou escreva pelo menos ${NOTES_TEXT_MIN} caracteres antes de organizar.`,
    })
    .max(NOTES_TEXT_MAX, {
      error: `O relato pode ter no máximo ${NOTES_TEXT_MAX.toLocaleString("pt-BR")} caracteres.`,
    }),
});

function aiError(message: string): AiActionState<Notes> {
  return { status: "error", reason: "error", message };
}

export async function organizeNotesAction(
  _prev: AiActionState<Notes>,
  formData: FormData,
): Promise<AiActionState<Notes>> {
  const ctx = await requireSession();
  const parsed = organizeSchema.safeParse(formDataToStrings(formData));
  if (!parsed.success) {
    return aiError(parsed.error.issues[0]?.message ?? "Confira o relato.");
  }
  const { leadId, text } = parsed.data;
  const lead = await getLeadDetail(ctx, leadId);
  if (!lead) return aiError("Lead não encontrado.");
  const now = new Date();
  const activities = await listActivities(ctx, { leadId, limit: CONTEXT_ACTIVITIES });
  // Só o que o modo "notes" usa (ADR-003, 5.1): o resto do LeadContextInput fica vazio.
  const context = buildLeadContext({
    lead,
    activities,
    consents: [],
    simulations: [],
    contributions: [],
    ownerName: null,
    projectNames: new Map(),
    now,
  });
  const result = await runStructured(ctx, {
    kind: "notes",
    leadId,
    system: notesSystemFor(lead.segment),
    user: notesUserMessage(context, text, now),
    schema: notesSchemaFor(lead.segment),
    effort: "medium",
  });
  if (!result.ok) return { status: "error", reason: result.reason, message: result.message };
  return {
    status: "ok",
    data: normalizeNotes(result.data, lead.segment, now),
    runId: result.runId,
  };
}

const applySchema = z.object({
  leadId: uuidSchema,
  attributes: z.string().trim().min(1, { error: "Nenhum campo para salvar." }),
});

function fail(message: string, fieldErrors?: Record<string, string>): CrmActionState {
  return { status: "error", message, fieldErrors };
}

// Lê o JSON vindo da tela: só objeto plano com valores escalares.
function parseAttributesJson(raw: string): Record<string, string | number | boolean> | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") return null;
    out[key] = v;
  }
  return out;
}

// "Salvar campos da empresa": grava só chaves de ATTRIBUTE_FIELDS[segment] sem vinculo_art27_*;
// updateLead mescla com os atuais, revalida pelo schema do segmento e recalcula o score.
export async function applyLeadAttributesAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const ctx = await requireSession();
  const parsed = applySchema.safeParse(formDataToStrings(formData));
  if (!parsed.success) return fail("Confira os campos.", firstIssueByField(parsed.error.issues));
  const attributes = parseAttributesJson(parsed.data.attributes);
  if (!attributes || !Object.keys(attributes).length) return fail("Nenhum campo para salvar.");
  try {
    const lead = await getLead(ctx, parsed.data.leadId);
    if (!lead) return fail("Lead não encontrado.");
    const allowed = new Set(attributeKeysFor(lead.segment));
    const rejected = Object.keys(attributes).filter((key) => !allowed.has(key));
    if (rejected.length) {
      return fail(`Campo não permitido para este segmento: ${rejected.join(", ")}.`);
    }
    await updateLead(ctx, { leadId: lead.id, attributes });
    log("info", "campos do lead salvos pela ia", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      leadId: lead.id,
      fields: Object.keys(attributes).length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Confira os campos destacados.", firstIssueByField(error.issues));
    }
    if (error instanceof DomainError) return fail(error.message);
    log("error", "falha em applyLeadAttributesAction", { tenantId: ctx.tenantId, error });
    return fail("Não foi possível salvar. Tente de novo em instantes.");
  }
  refresh();
  return { status: "ok", message: "Campos salvos." };
}
