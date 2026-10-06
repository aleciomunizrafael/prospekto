import { z } from "zod";
import {
  CONSENT_CHANNELS,
  CONSENT_PURPOSES,
  LEAD_INTERESTS,
  LEAD_SEGMENTS,
  LEAD_SOURCES,
  LOST_REASONS,
  type LeadSource,
} from "@/lib/domain/enums";
import { ALL_STAGES } from "@/lib/domain/pipelines";
import {
  emailSchema,
  phoneSchema,
  tagsSchema,
  timestampSchema,
  ufSchema,
  uuidSchema,
} from "./common";

export const consentInputSchema = z.object({
  purpose: z.enum(CONSENT_PURPOSES),
  granted: z.boolean().default(true),
  policyVersion: z.string().trim().min(1).max(40),
  consentText: z.string().trim().min(1).max(4000),
  channels: z.array(z.enum(CONSENT_CHANNELS)).default([]),
  sourcePage: z.string().trim().min(1).max(200),
  ipHash: z.string().trim().max(128).optional(),
  userAgent: z.string().trim().max(512).optional(),
});
export type ConsentInput = z.infer<typeof consentInputSchema>;

// Origens que correspondem a formulário do site (modelo-de-dados.md, seção 7). Regra R-1: um lead
// criado por formulário recebe, na mesma transação, o consentimento `contato_comercial` (caixa 1,
// obrigatória). As demais origens (CRM, importação, indicação) podem registrar consentimento depois
// (`source_page` crm/importacao).
export const FORM_SOURCES = [
  "site",
  "guia",
  "simulador",
  "diagnostico",
] as const satisfies readonly LeadSource[];

export function isFormSource(source: LeadSource): boolean {
  return (FORM_SOURCES as readonly string[]).includes(source);
}

export const createLeadBaseSchema = z.object({
  segment: z.enum(LEAD_SEGMENTS, { error: "Escolha o segmento." }),
  interest: z.enum(LEAD_INTERESTS, { error: "Escolha o interesse." }),
  name: z.string().trim().min(2, { error: "Informe seu nome." }).max(120),
  email: emailSchema,
  phone: phoneSchema.optional(),
  city: z.string().trim().max(120).optional(),
  uf: ufSchema.optional(),
  message: z.string().trim().max(2000).optional(),
  source: z.enum(LEAD_SOURCES, { error: "Escolha a origem." }),
  sourceDetail: z.string().trim().max(200).optional(),
  utmSource: z.string().trim().max(200).optional(),
  utmMedium: z.string().trim().max(200).optional(),
  utmCampaign: z.string().trim().max(200).optional(),
  referrer: z.string().trim().max(2000).optional(),
  landingPath: z.string().trim().max(500).optional(),
  tags: tagsSchema,
  attributes: z.record(z.string(), z.unknown()).default({}),
  guideVersion: z.string().trim().max(40).optional(),
  orgId: uuidSchema.optional(),
  contactId: uuidSchema.optional(),
  referredByOrgId: uuidSchema.optional(),
  projectInterestId: uuidSchema.optional(),
  consents: z.array(consentInputSchema).default([]),
  // Dados enviados pelo formulário, gravados em activities.formulario (regra R-1).
  formData: z.record(z.string(), z.unknown()).optional(),
});

export const createLeadSchema = createLeadBaseSchema.superRefine((value, ctx) => {
  if (!isFormSource(value.source)) return;
  const hasContact = value.consents.some((c) => c.purpose === "contato_comercial" && c.granted);
  if (!hasContact) {
    ctx.addIssue({
      code: "custom",
      path: ["consents"],
      message:
        "Para enviar o formulário é preciso aceitar o contato comercial (consentimento contato_comercial).",
    });
  }
});
export type CreateLeadInput = z.input<typeof createLeadSchema>;

export const moveLeadStageSchema = z.object({
  leadId: uuidSchema,
  to: z.enum(ALL_STAGES as [string, ...string[]], { error: "Escolha o destino." }),
  ownerUserId: z.string().trim().min(1, { error: "Escolha o responsável." }).optional(),
  nextActionAt: timestampSchema.optional(),
  lostReason: z.enum(LOST_REASONS, { error: "Escolha o motivo." }).optional(),
  lostReasonDetail: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(500).optional(),
});
export type MoveLeadStageInput = z.input<typeof moveLeadStageSchema>;

export const listLeadsSchema = z.object({
  pipeline: z.string().optional(),
  stage: z.string().optional(),
  segment: z.enum(LEAD_SEGMENTS).optional(),
  ownerUserId: z.string().optional(),
  overdueAt: timestampSchema.optional(),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});
export type ListLeadsInput = z.input<typeof listLeadsSchema>;

export const updateLeadSchema = z.object({
  leadId: uuidSchema,
  name: z
    .string()
    .trim()
    .min(2, { error: "Informe o nome." })
    .max(120, { error: "O nome pode ter no máximo 120 caracteres." })
    .optional(),
  phone: phoneSchema.optional(),
  city: z.string().trim().max(120).optional(),
  uf: ufSchema.optional(),
  interest: z.enum(LEAD_INTERESTS, { error: "Escolha o interesse." }).optional(),
  ownerUserId: z.string().trim().min(1).nullable().optional(),
  orgId: uuidSchema.nullable().optional(),
  contactId: uuidSchema.nullable().optional(),
  nextActionAt: timestampSchema.nullable().optional(),
  lastContactAt: timestampSchema.nullable().optional(),
  tags: tagsSchema.optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateLeadInput = z.input<typeof updateLeadSchema>;
