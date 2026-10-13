"use server";

// Server Actions do quadro de Tarefas (ADR-004, 6.5; plano, frente B). Toda função começa com
// requireSession() (AGENTS.md; tests/auth-guard.test.ts). Validação com Zod; escrita só pelos
// repositórios (R-15); refresh() ao fim para a tela refletir. Logs com ids e status, nunca o
// assunto, o texto ou nomes (R-16). As actions chamadas com argumento direto (moveTaskAction,
// searchTaskLeadsAction) validam o argumento com safeParse antes de ler qualquer campo (regra 10:
// Server Actions aceitam POST direto).
import { refresh } from "next/cache";
import { z } from "zod";
import type { LeadPick } from "@/components/crm/project-forms/lead-picker";
import { firstIssueByField, formDataToStrings } from "@/lib/crm/action-state";
import { formatShortDay } from "@/lib/crm/describe-sla";
import { fromDateTimeLocal } from "@/lib/crm/format";
import type { ActionState } from "@/lib/crm/form-state";
import { describeTaskMove } from "@/lib/crm/task-board";
import { TASK_STATUSES, taskStatusOf, type TaskStatus } from "@/lib/crm/task-status";
import { TASK_PRIORITIES } from "@/lib/domain/enums";
import { DomainError, MissingFieldsError } from "@/lib/errors";
import { log } from "@/lib/log";
import { searchLeads } from "@/lib/repos/organizations";
import { createTask, deleteTask, getTask, moveTask, updateTask } from "@/lib/repos/tasks";
import { requireSession } from "@/lib/session";
import { uuidSchema } from "@/lib/validation/common";

// O diálogo usa ActionForm (useActionState sobre ActionState); os campos têm `defaultValue`, por
// isso o estado não devolve `values`.
function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { status: "error", message, fieldErrors };
}

function fromError(error: unknown, context: string): ActionState {
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

// Campos de texto opcionais: "" vira undefined.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

// "" vira undefined (uuid opcional vindo de select ou campo oculto vazio).
const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(uuidSchema.optional());

// Prazo do diálogo: "" = sem prazo (null); texto inválido é erro.
const dueAtField = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = fromDateTimeLocal(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Informe uma data e hora válidas." });
      return z.NEVER;
    }
    return d;
  });

const taskStatusField = z.enum(TASK_STATUSES as [TaskStatus, ...TaskStatus[]], {
  error: "Escolha o status.",
});

// Vínculo (opcional): o TaskRecordPicker manda `linkKind` e só o id da opção escolhida.
const LINK_KINDS = ["nenhum", "lead", "organizacao", "projeto"] as const;

const baseTaskFields = {
  subject: z
    .string({ error: "Informe o título da tarefa." })
    .trim()
    .min(1, { error: "Informe o título da tarefa." })
    .max(200, { error: "O título pode ter no máximo 200 caracteres." }),
  body: optionalText(8000),
  // "" = "Ninguém" (null); ausente = padrão da sessão (plano, P6 e crítica 25).
  ownerUserId: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null)),
  priority: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : "media"))
    .pipe(z.enum(TASK_PRIORITIES, { error: "Escolha a prioridade." })),
  status: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : "a_fazer"))
    .pipe(taskStatusField),
  dueAt: dueAtField,
  linkKind: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : "nenhum"))
    .pipe(z.enum(LINK_KINDS, { error: "Escolha o tipo de vínculo." })),
  leadId: optionalUuid,
  // Lead atual ao editar (o LeadPicker só manda o id quando a pessoa escolhe outro).
  leadIdCurrent: optionalUuid,
  orgId: optionalUuid,
  projectId: optionalUuid,
};

type LinkFields = {
  leadId?: string;
  orgId?: string;
  projectId?: string;
};

// Resolve o vínculo escolhido no diálogo; erro de campo quando o tipo foi escolhido sem o registro.
function resolveLink(d: {
  linkKind: (typeof LINK_KINDS)[number];
  leadId?: string;
  leadIdCurrent?: string;
  orgId?: string;
  projectId?: string;
}): { ok: true; link: LinkFields } | { ok: false; state: ActionState } {
  switch (d.linkKind) {
    case "nenhum":
      return { ok: true, link: {} };
    case "lead": {
      const leadId = d.leadId ?? d.leadIdCurrent;
      if (!leadId) {
        return {
          ok: false,
          state: fail("Confira os campos destacados.", {
            leadId: "Busque e escolha o lead na lista.",
          }),
        };
      }
      return { ok: true, link: { leadId } };
    }
    case "organizacao":
      if (!d.orgId) {
        return {
          ok: false,
          state: fail("Confira os campos destacados.", { orgId: "Escolha a organização." }),
        };
      }
      return { ok: true, link: { orgId: d.orgId } };
    case "projeto":
      if (!d.projectId) {
        return {
          ok: false,
          state: fail("Confira os campos destacados.", { projectId: "Escolha o projeto." }),
        };
      }
      return { ok: true, link: { projectId: d.projectId } };
  }
}

// ------------------------------------------------------------------------------------------
// Nova tarefa
// ------------------------------------------------------------------------------------------

const createTaskFormSchema = z.object(baseTaskFields);

export async function createTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  const parsed = createTaskFormSchema.safeParse(formDataToStrings(formData));
  if (!parsed.success) {
    return fail("Confira os campos destacados.", firstIssueByField(parsed.error.issues));
  }
  const d = parsed.data;
  const link = resolveLink(d);
  if (!link.ok) return link.state;
  try {
    const task = await createTask(ctx, {
      subject: d.subject,
      body: d.body,
      ownerUserId: d.ownerUserId,
      priority: d.priority,
      status: d.status,
      dueAt: d.dueAt,
      ...link.link,
    });
    log("info", "tarefa criada", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      activityId: task.id,
      status: d.status,
      linked: Boolean(task.leadId || task.orgId || task.projectId),
    });
  } catch (error) {
    return fromError(error, "createTaskAction");
  }
  refresh();
  return {
    status: "ok",
    message: d.dueAt ? `Tarefa criada. Vence ${formatShortDay(d.dueAt)}` : "Tarefa criada.",
  };
}

// ------------------------------------------------------------------------------------------
// Editar tarefa
// ------------------------------------------------------------------------------------------

const updateTaskFormSchema = z.object({ activityId: uuidSchema, ...baseTaskFields });

export async function updateTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  const parsed = updateTaskFormSchema.safeParse(formDataToStrings(formData));
  if (!parsed.success) {
    return fail("Confira os campos destacados.", firstIssueByField(parsed.error.issues));
  }
  const d = parsed.data;
  const link = resolveLink(d);
  if (!link.ok) return link.state;
  try {
    const current = await getTask(ctx, d.activityId);
    if (!current) return fail("Tarefa não encontrada.");
    // "Nenhum" limpa os quatro vínculos; um vínculo novo substitui os demais (updateTask).
    const clearLinks =
      d.linkKind === "nenhum"
        ? { leadId: null, orgId: null, projectId: null, contributionId: null }
        : {};
    await updateTask(ctx, {
      activityId: d.activityId,
      subject: d.subject,
      body: d.body ?? null,
      // "" (Ninguém) chega como null e limpa o responsável; ausente mantém.
      ownerUserId: d.ownerUserId,
      priority: d.priority,
      dueAt: d.dueAt,
      ...clearLinks,
      ...link.link,
    });
    // Status trocado pelo campo do diálogo (caminho sem arrasto, celular): entra no fim da coluna
    // nova, como no Trilis; o repositório grava started_at/done_at e a posição.
    const from = taskStatusOf(current);
    if (d.status !== from) {
      await moveTask(ctx, { activityId: d.activityId, status: d.status, index: 1000 });
    }
    log("info", "tarefa editada", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      activityId: d.activityId,
      status: d.status,
    });
  } catch (error) {
    return fromError(error, "updateTaskAction");
  }
  refresh();
  return { status: "ok", message: "Tarefa salva." };
}

// ------------------------------------------------------------------------------------------
// Mover (arrasto ou menu do cartão): argumento direto, validado antes de qualquer acesso (regra 10)
// ------------------------------------------------------------------------------------------

const moveTaskInputSchema = z.object({
  activityId: uuidSchema,
  status: z.enum(TASK_STATUSES as [TaskStatus, ...TaskStatus[]]),
  index: z.number().int().min(0).max(1000),
  // Vizinhos visíveis na tela (plano, P3): com filtro ativo, são eles que fixam a posição na
  // coluna inteira; o diálogo não os manda (entra no fim).
  beforeId: uuidSchema.optional(),
  afterId: uuidSchema.optional(),
});

export async function moveTaskAction(input: unknown): Promise<ActionState> {
  const ctx = await requireSession();
  const parsed = moveTaskInputSchema.safeParse(input);
  if (!parsed.success) return fail("Movimento inválido.");
  const d = parsed.data;
  let message: string;
  try {
    const current = await getTask(ctx, d.activityId);
    if (!current) return fail("Tarefa não encontrada.");
    const from = taskStatusOf(current);
    await moveTask(ctx, {
      activityId: d.activityId,
      status: d.status,
      index: d.index,
      beforeId: d.beforeId,
      afterId: d.afterId,
    });
    message = describeTaskMove(from, d.status);
    log("info", "tarefa movida", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      activityId: d.activityId,
      from,
      status: d.status,
      index: d.index,
    });
  } catch (error) {
    return fromError(error, "moveTaskAction");
  }
  refresh();
  return { status: "ok", message };
}

// ------------------------------------------------------------------------------------------
// Excluir (só type = tarefa; o repositório grava "Tarefa excluída" quando há vínculo)
// ------------------------------------------------------------------------------------------

const deleteTaskFormSchema = z.object({ activityId: uuidSchema });

export async function deleteTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  const parsed = deleteTaskFormSchema.safeParse(formDataToStrings(formData));
  if (!parsed.success) return fail("Tarefa inválida.");
  try {
    await deleteTask(ctx, parsed.data.activityId);
    log("info", "tarefa excluída", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      activityId: parsed.data.activityId,
    });
  } catch (error) {
    return fromError(error, "deleteTaskAction");
  }
  refresh();
  return { status: "ok", message: "Tarefa excluída." };
}

// ------------------------------------------------------------------------------------------
// Busca de leads para o vínculo (LeadPicker do diálogo)
// ------------------------------------------------------------------------------------------

const searchQuerySchema = z.string().max(1000);

export async function searchTaskLeadsAction(query: unknown): Promise<LeadPick[]> {
  const ctx = await requireSession();
  const parsed = searchQuerySchema.safeParse(query);
  if (!parsed.success) return [];
  const q = parsed.data.trim();
  if (q.length < 2) return [];
  const rows = await searchLeads(ctx, q.slice(0, 80));
  return rows.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    segment: l.segment,
    stage: l.stage,
    orgId: l.orgId,
  }));
}
