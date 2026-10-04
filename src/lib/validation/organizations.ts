import { z } from "zod";
import { ORGANIZATION_TYPES, REGIME_CONFIRMATIONS, TAX_REGIMES } from "@/lib/domain/enums";
import { cnpjSchema, moneySchema, nullableOptionals, ufSchema, uuidSchema } from "./common";

export const createOrganizationSchema = z.object({
  type: z.enum(ORGANIZATION_TYPES),
  name: z.string().trim().min(2).max(200),
  tradeName: z.string().trim().max(200).optional(),
  cnpj: cnpjSchema.optional(),
  city: z.string().trim().max(120).optional(),
  uf: ufSchema.optional(),
  sector: z.string().trim().max(120).optional(),
  taxRegime: z.enum(TAX_REGIMES).optional(),
  taxRegimeConfirmedBy: z.enum(REGIME_CONFIRMATIONS).optional(),
  estimatedIrpj: moneySchema.optional(),
  icmsContributorRs: z.boolean().optional(),
  accountantOrgId: uuidSchema.optional(),
  ownerUserId: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(4000).optional(),
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
