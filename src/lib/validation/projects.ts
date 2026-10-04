import { z } from "zod";
import { INCENTIVE_MECHANISMS, LOST_REASONS } from "@/lib/domain/enums";
import { STAGES } from "@/lib/domain/pipelines";
import { calendarDateSchema, moneySchema, slugSchema, ufSchema, uuidSchema } from "./common";

export const createProjectSchema = z.object({
  proponentOrgId: uuidSchema,
  leadId: uuidSchema.optional(),
  name: z.string().trim().min(2).max(200),
  slug: slugSchema,
  mechanism: z.enum(INCENTIVE_MECHANISMS),
  processNumber: z.string().trim().max(60).optional(),
  stage: z.enum(STAGES.projetos).default("prospeccao"),
  approvedAmount: moneySchema.optional(),
  fundraisingDeadline: calendarDateSchema.optional(),
  fundraisingFeeAmount: moneySchema.optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  city: z.string().trim().max(120).optional(),
  uf: ufSchema.optional(),
  culturalSegment: z.string().trim().max(120).optional(),
  summary: z.string().trim().max(8000).optional(),
  counterparts: z.string().trim().max(8000).optional(),
  deckUrl: z.url().max(500).optional(),
  salicUrl: z.url().max(500).optional(),
  reportDueAt: calendarDateSchema.optional(),
  ownerUserId: z.string().trim().min(1).optional(),
});
export type CreateProjectInput = z.input<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema
  .omit({ stage: true })
  .partial()
  .extend({ projectId: uuidSchema });
export type UpdateProjectInput = z.input<typeof updateProjectSchema>;

export const moveProjectStageSchema = z.object({
  projectId: uuidSchema,
  to: z.enum(STAGES.projetos),
  // Sair de `prospeccao` exige responsável (regra R-3; cultural_projects não tem next_action_at).
  ownerUserId: z.string().trim().min(1).optional(),
  lostReason: z.enum(LOST_REASONS).optional(),
  lostReasonDetail: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(500).optional(),
});
export type MoveProjectStageInput = z.input<typeof moveProjectStageSchema>;

export const publishProjectSchema = z.object({
  projectId: uuidSchema,
  publishAuthorizedBy: z.string().trim().min(2).max(200),
  publishAuthorizedAt: z.coerce.date(),
});
export type PublishProjectInput = z.input<typeof publishProjectSchema>;

export const listProjectsSchema = z.object({
  stage: z.enum(STAGES.projetos).optional(),
  publishedOnly: z.boolean().default(false),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});
export type ListProjectsInput = z.input<typeof listProjectsSchema>;
