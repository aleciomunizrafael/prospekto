import { z } from "zod";
import { ACTIVITY_TYPES, TASK_PRIORITIES } from "@/lib/domain/enums";
import { timestampSchema, uuidSchema } from "./common";

export const createActivitySchema = z
  .object({
    type: z.enum(ACTIVITY_TYPES),
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().max(8000).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    occurredAt: timestampSchema.optional(),
    dueAt: timestampSchema.optional(),
    doneAt: timestampSchema.optional(),
    // Só `tarefa` (ADR-004, 6.4.3); o repositório grava `media` e a posição quando faltam.
    startedAt: timestampSchema.optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    position: z.number().finite().optional(),
    leadId: uuidSchema.optional(),
    orgId: uuidSchema.optional(),
    contactId: uuidSchema.optional(),
    projectId: uuidSchema.optional(),
    contributionId: uuidSchema.optional(),
    prospectingItemId: uuidSchema.optional(),
    ownerUserId: z.string().trim().min(1).optional(),
  })
  // Tarefa pode ser solta; qualquer outro tipo continua ligado a alguém.
  .refine(
    (a) =>
      a.type === "tarefa" ||
      a.leadId ||
      a.orgId ||
      a.projectId ||
      a.contributionId ||
      a.prospectingItemId,
    {
      error:
        "A atividade precisa estar ligada a um lead, organização, projeto, aporte ou empresa de prospecção.",
    },
  );
export type CreateActivityInput = z.input<typeof createActivitySchema>;
