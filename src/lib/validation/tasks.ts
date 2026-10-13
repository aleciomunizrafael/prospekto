// Tarefas do quadro (/app/tarefas): activities.type = 'tarefa' com started_at, priority e position
// (ADR-004, 6.5). `ownerUserId`: undefined = usuário da sessão; null = "Ninguém" (plano, P6).
import { z } from "zod";
import { TASK_STATUSES } from "@/lib/crm/task-status";
import { TASK_PRIORITIES } from "@/lib/domain/enums";
import { timestampSchema, uuidSchema } from "./common";

const LINK_FIELDS = ["leadId", "orgId", "projectId", "contributionId"] as const;

function atMostOneLink(value: Record<string, unknown>): boolean {
  return LINK_FIELDS.filter((f) => value[f]).length <= 1;
}

const ONE_LINK_ERROR = {
  error: "Vincule a tarefa a um lead, uma organização, um projeto ou um aporte, não a mais de um.",
  path: ["leadId"],
};

const taskStatusSchema = z.enum(TASK_STATUSES as [string, ...string[]], {
  error: "Escolha o status.",
});

export const createTaskSchema = z
  .object({
    subject: z
      .string({ error: "Informe o título da tarefa." })
      .trim()
      .min(1, { error: "Informe o título da tarefa." })
      .max(200, { error: "O título pode ter no máximo 200 caracteres." }),
    body: z
      .string()
      .trim()
      .max(8000, { error: "A descrição pode ter no máximo 8.000 caracteres." })
      .optional(),
    ownerUserId: z.string().min(1).nullable().optional(),
    priority: z.enum(TASK_PRIORITIES, { error: "Escolha a prioridade." }).default("media"),
    dueAt: timestampSchema.nullable().optional(),
    status: taskStatusSchema.default("a_fazer"),
    leadId: uuidSchema.optional(),
    orgId: uuidSchema.optional(),
    projectId: uuidSchema.optional(),
    contributionId: uuidSchema.optional(),
  })
  .refine(atMostOneLink, ONE_LINK_ERROR);
export type CreateTaskInput = z.input<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    activityId: uuidSchema,
    subject: z
      .string()
      .trim()
      .min(1, { error: "Informe o título da tarefa." })
      .max(200, { error: "O título pode ter no máximo 200 caracteres." })
      .optional(),
    body: z
      .string()
      .trim()
      .max(8000, { error: "A descrição pode ter no máximo 8.000 caracteres." })
      .nullable()
      .optional(),
    // null limpa o responsável ("Ninguém").
    ownerUserId: z.string().min(1).nullable().optional(),
    priority: z.enum(TASK_PRIORITIES, { error: "Escolha a prioridade." }).optional(),
    dueAt: timestampSchema.nullable().optional(),
    status: taskStatusSchema.optional(),
    leadId: uuidSchema.nullable().optional(),
    orgId: uuidSchema.nullable().optional(),
    projectId: uuidSchema.nullable().optional(),
    contributionId: uuidSchema.nullable().optional(),
  })
  .refine(atMostOneLink, ONE_LINK_ERROR);
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
