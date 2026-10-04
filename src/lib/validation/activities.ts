import { z } from "zod";
import { ACTIVITY_TYPES } from "@/lib/domain/enums";
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
    leadId: uuidSchema.optional(),
    orgId: uuidSchema.optional(),
    contactId: uuidSchema.optional(),
    projectId: uuidSchema.optional(),
    contributionId: uuidSchema.optional(),
    ownerUserId: z.string().trim().min(1).optional(),
  })
  .refine((a) => a.leadId || a.orgId || a.projectId || a.contributionId, {
    error: "A atividade precisa estar ligada a um lead, organização, projeto ou aporte.",
  });
export type CreateActivityInput = z.input<typeof createActivitySchema>;
