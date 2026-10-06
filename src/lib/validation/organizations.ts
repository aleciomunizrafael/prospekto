import { z } from "zod";
import { ORGANIZATION_TYPES, REGIME_CONFIRMATIONS, TAX_REGIMES } from "@/lib/domain/enums";
import { cnpjSchema, moneySchema, nullableOptionals, ufSchema, uuidSchema } from "./common";

export const createOrganizationSchema = z.object({
  type: z.enum(ORGANIZATION_TYPES, { error: "Escolha o tipo." }),
  name: z
    .string({ error: "Informe o nome da organização." })
    .trim()
    .min(2, { error: "Informe o nome da organização." })
    .max(200, { error: "O nome pode ter no máximo 200 caracteres." }),
  tradeName: z
    .string()
    .trim()
    .max(200, { error: "O nome fantasia pode ter no máximo 200 caracteres." })
    .optional(),
  cnpj: cnpjSchema.optional(),
  city: z
    .string()
    .trim()
    .max(120, { error: "A cidade pode ter no máximo 120 caracteres." })
    .optional(),
  uf: ufSchema.optional(),
  sector: z
    .string()
    .trim()
    .max(120, { error: "O setor pode ter no máximo 120 caracteres." })
    .optional(),
  taxRegime: z.enum(TAX_REGIMES, { error: "Escolha o regime tributário." }).optional(),
  taxRegimeConfirmedBy: z.enum(REGIME_CONFIRMATIONS, { error: "Escolha uma opção." }).optional(),
  estimatedIrpj: moneySchema.optional(),
  icmsContributorRs: z.boolean().optional(),
  accountantOrgId: z.uuid({ error: "Escolha o escritório contábil." }).optional(),
  ownerUserId: z.string().trim().min(1, { error: "Escolha quem cuida." }).optional(),
  notes: z
    .string()
    .trim()
    .max(4000, { error: "As notas podem ter no máximo 4.000 caracteres." })
    .optional(),
});
export type CreateOrganizationInput = z.input<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z
  .object(nullableOptionals(createOrganizationSchema.shape))
  .partial()
  .extend({ orgId: uuidSchema });
export type UpdateOrganizationInput = z.input<typeof updateOrganizationSchema>;

export const listOrganizationsSchema = z.object({
  type: z.enum(ORGANIZATION_TYPES).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});
export type ListOrganizationsInput = z.input<typeof listOrganizationsSchema>;
