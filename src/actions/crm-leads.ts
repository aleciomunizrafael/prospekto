"use server";

// Server Actions do CRM sobre leads e atividades. Toda função começa com requireSession()
// (AGENTS.md; tests/auth-guard.test.ts): Server Actions são alcançáveis por POST direto.
// Validação com Zod; escrita só pelos repositórios (regra R-15); depois de gravar, refresh() para
// a tela refletir (Next 16, functions/refresh.md) ou redirect para o detalhe.
import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { site } from "@/config/site";
import { firstIssueByField, formDataToStrings, type CrmActionState } from "@/lib/crm/action-state";
import { attributesFromForm } from "@/lib/crm/attributes";
import { fromDateTimeLocal } from "@/lib/crm/format";
import { ACTIVITY_TYPE_LABELS, MEETING_KINDS } from "@/lib/crm/labels";
import {
  CONSENT_CHANNELS,
  LEAD_INTERESTS,
  LEAD_SEGMENTS,
  LEAD_SOURCES,
  LOST_REASONS,
} from "@/lib/domain/enums";
import { ALL_STAGES } from "@/lib/domain/pipelines";
import { DomainError, MissingFieldsError } from "@/lib/errors";
import { log } from "@/lib/log";
import { completeTask, getActivity } from "@/lib/repos/activities";
import {
  createLead,
  getLead,
  moveLeadStage,
  recordLeadActivity,
  updateLead,
} from "@/lib/repos/leads";
import { requireSession } from "@/lib/session";
import { emailSchema, phoneSchema, ufSchema, uuidSchema } from "@/lib/validation/common";

const CONSENT_POLICY_VERSION = site.policyVersion;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const dateTimeLocal = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const d = fromDateTimeLocal(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Informe uma data e hora válidas." });
      return z.NEVER;
    }
    return d;
  });

function fail(message: string, fieldErrors?: Record<string, string>): CrmActionState {
  return { status: "error", message, fieldErrors };
}

function fromError(error: unknown, context: string): CrmActionState {
  if (error instanceof MissingFieldsError) {
    return { status: "error", message: error.message, missing: [...error.missing] };
  }
  if (error instanceof z.ZodError) {
    return fail("Confira os campos destacados.", firstIssueByField(error.issues));
  }
  if (error instanceof DomainError) return fail(error.message);
  log("error", `falha em ${context}`, { error });
  return fail("Não foi possível salvar. Tente de novo em instantes.");
}

// ------------------------------------------------------------------------------------------
// Novo lead (manual, pelo CRM)
// ------------------------------------------------------------------------------------------

const createLeadFormSchema = z.object({
  segment: z.enum(LEAD_SEGMENTS, { error: "Escolha o segmento." }),
  interest: z.enum(LEAD_INTERESTS, { error: "Escolha o interesse." }),
  name: z.string().trim().min(2, { error: "Informe o nome." }).max(120),
  email: emailSchema,
  phone: phoneSchema.optional(),
  city: optionalText(120),
  uf: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(ufSchema.optional()),
  source: z.enum(LEAD_SOURCES, { error: "Informe a origem do lead." }),
  sourceDetail: optionalText(200),
  message: optionalText(2000),
  consentGiven: z.string().optional(),
  consentText: optionalText(4000),
  consentChannels: z.array(z.enum(CONSENT_CHANNELS)).default([]),
});

export async function createLeadAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const ctx = await requireSession();
  const values = formDataToStrings(formData);
  const parsed = createLeadFormSchema.safeParse({
    ...values,
    phone: values.phone || undefined,
    consentChannels: formData.getAll("consentChannels").filter((v) => typeof v === "string"),
  });
  if (!parsed.success) {
    return {
      ...fail("Confira os campos destacados.", firstIssueByField(parsed.error.issues)),
      values,
    };
  }
  const d = parsed.data;
  const consentGiven = d.consentGiven === "on";
  if (consentGiven && !d.consentText) {
    return {
      ...fail("Confira os campos destacados.", {
        consentText:
          "Descreva como o consentimento foi dado (verbal ou por escrito, quando e por qual canal).",
      }),
      values,
    };
  }
  let leadId: string;
  let created: boolean;
  try {
    const attributes = attributesFromForm(d.segment, values);
    const result = await createLead(ctx, {
      segment: d.segment,
      interest: d.interest,
      name: d.name,
      email: d.email,
      phone: d.phone,
      city: d.city,
      uf: d.uf,
      message: d.message,
      source: d.source,
      sourceDetail: d.sourceDetail,
      attributes,
      consents: consentGiven
        ? [
            {
              purpose: "contato_comercial",
              granted: true,
              policyVersion: CONSENT_POLICY_VERSION,
              consentText: d.consentText!,
              channels: d.consentChannels,
              sourcePage: "crm",
            },
          ]
        : [],
      formData: { form_id: "crm", source: d.source, sourceDetail: d.sourceDetail ?? null },
    });
    leadId = result.lead.id;
    created = result.created;
  } catch (error) {
    return { ...fromError(error, "createLeadAction"), values };
  }
  log("info", created ? "lead criado no CRM" : "lead existente atualizado pelo CRM", {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    leadId,
  });
  revalidatePath("/app/leads");
  redirect(`/app/leads/${leadId}${created ? "" : "?existente=1"}`);
}

// ------------------------------------------------------------------------------------------
// Editar (campos básicos e attributes do segmento)
// ------------------------------------------------------------------------------------------

const updateLeadFormSchema = z.object({
  leadId: uuidSchema,
  name: z.string().trim().min(2, { error: "Informe o nome." }).max(120),
  phone: phoneSchema.optional(),
  city: optionalText(120),
  uf: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(ufSchema.optional()),
  interest: z.enum(LEAD_INTERESTS, { error: "Escolha o interesse." }),
  tags: optionalText(600),
});

export async function updateLeadAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const ctx = await requireSession();
  const values = formDataToStrings(formData);
  const parsed = updateLeadFormSchema.safeParse({ ...values, phone: values.phone ?? "" });
  if (!parsed.success) {
    return {
      ...fail("Confira os campos destacados.", firstIssueByField(parsed.error.issues)),
      values,
    };
  }
  const d = parsed.data;
  try {
    const current = await getLead(ctx, d.leadId);
    if (!current) return fail("Lead não encontrado.");
    const attributes = attributesFromForm(current.segment, values);
    await updateLead(ctx, {
      leadId: d.leadId,
      name: d.name,
      phone: d.phone ?? "",
      city: d.city,
      uf: d.uf,
      interest: d.interest,
      tags: d.tags
        ? [
            ...new Set(
              d.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            ),
          ]
        : [],
      attributes,
    });
  } catch (error) {
    return { ...fromError(error, "updateLeadAction"), values };
  }
  refresh();
  return { status: "ok", message: "Lead atualizado." };
}

// ------------------------------------------------------------------------------------------
// Mover para (estágio) e Marcar perdido
// ------------------------------------------------------------------------------------------

const moveStageFormSchema = z.object({
  leadId: uuidSchema,
  to: z.enum(ALL_STAGES as [string, ...string[]], { error: "Escolha o estágio de destino." }),
  ownerUserId: optionalText(200),
  nextActionAt: dateTimeLocal,
  lostReason: z.enum(LOST_REASONS).optional(),
  lostReasonDetail: optionalText(500),
  reason: optionalText(500),
  art27Checked: z.string().optional(),
  art27At: optionalText(40),
  art27By: optionalText(120),
});

export async function moveLeadStageAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const ctx = await requireSession();
  const values = formDataToStrings(formData);
  const parsed = moveStageFormSchema.safeParse({
    ...values,
    lostReason: values.lostReason || undefined,
  });
  if (!parsed.success) {
    return {
      ...fail("Confira os campos destacados.", firstIssueByField(parsed.error.issues)),
      values,
    };
  }
  const d = parsed.data;
  try {
    // Checagem do art. 27 feita no próprio diálogo (regra R-10): grava em attributes antes de mover.
    if (d.art27Checked === "on") {
      await updateLead(ctx, {
        leadId: d.leadId,
        attributes: {
          vinculo_art27_checado: true,
          vinculo_art27_checado_em: d.art27At ?? new Date().toISOString().slice(0, 10),
          vinculo_art27_checado_por: d.art27By ?? ctx.userId,
        },
      });
    }
    const lead = await moveLeadStage(ctx, {
      leadId: d.leadId,
      to: d.to,
      ownerUserId: d.ownerUserId,
      nextActionAt: d.nextActionAt,
      lostReason: d.lostReason,
      lostReasonDetail: d.lostReasonDetail,
      reason: d.reason,
    });
    log("info", "estágio do lead alterado", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      leadId: lead.id,
      stage: lead.stage,
    });
  } catch (error) {
    return { ...fromError(error, "moveLeadStageAction"), values };
  }
  refresh();
  return { status: "ok", message: "Estágio atualizado." };
}

// ------------------------------------------------------------------------------------------
// Atribuir dono / Assumir
// ------------------------------------------------------------------------------------------

const assignOwnerSchema = z.object({
  leadId: uuidSchema,
  ownerUserId: optionalText(200),
});

export async function assignLeadOwnerAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const ctx = await requireSession();
  const parsed = assignOwnerSchema.safeParse(formDataToStrings(formData));
  if (!parsed.success) return fail("Confira os campos.", firstIssueByField(parsed.error.issues));
  try {
    await updateLead(ctx, {
      leadId: parsed.data.leadId,
      ownerUserId: parsed.data.ownerUserId ?? null,
    });
  } catch (error) {
    return fromError(error, "assignLeadOwnerAction");
  }
  refresh();
  return { status: "ok", message: "Responsável atualizado." };
}

// "Assumir" na tela "Hoje": o usuário da sessão vira dono e abre o detalhe.
export async function claimLeadAction(formData: FormData): Promise<void> {
  const ctx = await requireSession();
  const leadId = uuidSchema.parse(formData.get("leadId"));
  await updateLead(ctx, { leadId, ownerUserId: ctx.userId });
  revalidatePath("/app");
  redirect(`/app/leads/${leadId}`);
}

// ------------------------------------------------------------------------------------------
// Registrar atividade e concluir tarefa
// ------------------------------------------------------------------------------------------

const CONTACT_TYPES = ["ligacao", "reuniao", "email", "whatsapp", "visita"] as const;
const ACTIVITY_FORM_TYPES = [...CONTACT_TYPES, "nota", "tarefa"] as const;

const activityFormSchema = z
  .object({
    leadId: uuidSchema,
    type: z.enum(ACTIVITY_FORM_TYPES, { error: "Escolha o tipo da atividade." }),
    subject: optionalText(200),
    body: optionalText(8000),
    occurredAt: dateTimeLocal,
    meetingKind: z.enum(MEETING_KINDS.map((m) => m.value) as [string, ...string[]]).optional(),
    dueAt: dateTimeLocal,
    nextActionAt: dateTimeLocal,
  })
  .superRefine((v, ctx) => {
    if (v.type === "tarefa" && !v.dueAt) {
      ctx.addIssue({ code: "custom", path: ["dueAt"], message: "Informe o vencimento da tarefa." });
    }
    if (v.type === "tarefa" && !v.subject) {
      ctx.addIssue({ code: "custom", path: ["subject"], message: "Informe o assunto da tarefa." });
    }
  });

export async function registerActivityAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const ctx = await requireSession();
  const values = formDataToStrings(formData);
  const parsed = activityFormSchema.safeParse({
    ...values,
    meetingKind: values.meetingKind || undefined,
  });
  if (!parsed.success) {
    return {
      ...fail("Confira os campos destacados.", firstIssueByField(parsed.error.issues)),
      values,
    };
  }
  const d = parsed.data;
  const isContact = (CONTACT_TYPES as readonly string[]).includes(d.type);
  const meeting =
    d.type === "reuniao" ? MEETING_KINDS.find((m) => m.value === d.meetingKind) : null;
  const subject =
    d.subject ?? (meeting ? `Reunião: ${meeting.label}` : ACTIVITY_TYPE_LABELS[d.type]);
  try {
    await recordLeadActivity(ctx, {
      leadId: d.leadId,
      activity: {
        type: d.type,
        subject,
        body: d.body,
        occurredAt: d.occurredAt,
        dueAt: d.type === "tarefa" ? d.dueAt : undefined,
        data: meeting ? { meetingKind: meeting.value } : undefined,
      },
      touchLastContact: isContact,
      nextActionAt: d.nextActionAt,
    });
  } catch (error) {
    return { ...fromError(error, "registerActivityAction"), values };
  }
  refresh();
  return { status: "ok", message: "Atividade registrada." };
}

const completeTaskSchema = z.object({ activityId: uuidSchema, redirectTo: optionalText(200) });

export async function completeTaskAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const ctx = await requireSession();
  const parsed = completeTaskSchema.safeParse(formDataToStrings(formData));
  if (!parsed.success) return fail("Tarefa inválida.");
  try {
    const task = await getActivity(ctx, parsed.data.activityId);
    if (!task || task.type !== "tarefa") return fail("Tarefa não encontrada.");
    if (!task.doneAt) await completeTask(ctx, task.id);
  } catch (error) {
    return fromError(error, "completeTaskAction");
  }
  refresh();
  return { status: "ok", message: "Tarefa concluída." };
}
