import { z } from "zod";
import { INCENTIVE_MECHANISMS, LOST_REASONS } from "@/lib/domain/enums";
import { STAGES } from "@/lib/domain/pipelines";
import {
  calendarDateSchema,
  moneySchema,
  nullableOptionals,
  slugSchema,
  ufSchema,
  uuidSchema,
} from "./common";

// Mensagens em português por campo: o formulário mostra cada uma sob o campo (nunca o texto
// padrão do Zod em inglês nem a lista de chaves de enum).
const urlSchema = z.url({ error: "Informe um link completo, começando com https://." }).max(500);

export const createProjectSchema = z.object({
  proponentOrgId: z.uuid({ error: "Escolha o proponente." }),
  leadId: uuidSchema.optional(),
  name: z
    .string({ error: "Informe o nome do projeto." })
    .trim()
    .min(2, { error: "Informe o nome do projeto." })
    .max(200, { error: "O nome pode ter no máximo 200 caracteres." }),
  slug: slugSchema,
  mechanism: z.enum(INCENTIVE_MECHANISMS, { error: "Escolha o mecanismo." }),
  processNumber: z
    .string()
    .trim()
    .max(60, { error: "O número do processo pode ter no máximo 60 caracteres." })
    .optional(),
  stage: z.enum(STAGES.projetos, { error: "Escolha o estágio." }).default("prospeccao"),
  approvedAmount: moneySchema.optional(),
  fundraisingDeadline: calendarDateSchema.optional(),
  fundraisingFeeAmount: moneySchema.optional(),
  commissionPct: z
    .number({ error: "Informe o percentual em números." })
    .min(0, { error: "O percentual não pode ser negativo." })
    .max(100, { error: "O percentual não pode passar de 100." })
    .optional(),
  city: z
    .string()
    .trim()
    .max(120, { error: "A cidade pode ter no máximo 120 caracteres." })
    .optional(),
  uf: ufSchema.optional(),
  culturalSegment: z
    .string()
    .trim()
    .max(120, { error: "O segmento pode ter no máximo 120 caracteres." })
    .optional(),
  summary: z
    .string()
    .trim()
    .max(8000, { error: "O resumo pode ter no máximo 8.000 caracteres." })
    .optional(),
  counterparts: z
    .string()
    .trim()
    .max(8000, { error: "As contrapartidas podem ter no máximo 8.000 caracteres." })
    .optional(),
  deckUrl: urlSchema.optional(),
  salicUrl: urlSchema.optional(),
  reportDueAt: calendarDateSchema.optional(),
  ownerUserId: z.string().trim().min(1, { error: "Escolha o responsável." }).optional(),
});
export type CreateProjectInput = z.input<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object(nullableOptionals(createProjectSchema.omit({ stage: true }).shape))
  .partial()
  .extend({ projectId: uuidSchema });
export type UpdateProjectInput = z.input<typeof updateProjectSchema>;

export const moveProjectStageSchema = z.object({
  projectId: uuidSchema,
  to: z.enum(STAGES.projetos, { error: "Escolha o destino." }),
  // Sair de `prospeccao` exige responsável (regra R-3; cultural_projects não tem next_action_at).
  ownerUserId: z.string().trim().min(1, { error: "Escolha o responsável." }).optional(),
  lostReason: z.enum(LOST_REASONS, { error: "Escolha o motivo." }).optional(),
  lostReasonDetail: z
    .string()
    .trim()
    .max(500, { error: "O detalhe pode ter no máximo 500 caracteres." })
    .optional(),
  reason: z
    .string()
    .trim()
    .max(500, { error: "O motivo pode ter no máximo 500 caracteres." })
    .optional(),
});
export type MoveProjectStageInput = z.input<typeof moveProjectStageSchema>;

export const publishProjectSchema = z.object({
  projectId: uuidSchema,
  publishAuthorizedBy: z
    .string({ error: "Informe quem autorizou." })
    .trim()
    .min(2, { error: "Informe quem autorizou." })
    .max(200, { error: "Use no máximo 200 caracteres." }),
  publishAuthorizedAt: z.coerce.date({ error: "Informe a data da autorização." }),
});
export type PublishProjectInput = z.input<typeof publishProjectSchema>;

export const listProjectsSchema = z.object({
  stage: z.enum(STAGES.projetos).optional(),
  publishedOnly: z.boolean().default(false),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});
export type ListProjectsInput = z.input<typeof listProjectsSchema>;
