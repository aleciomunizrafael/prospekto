import { z } from "zod";
import { emailSchema, nullableOptionals, phoneSchema, uuidSchema } from "./common";

export const createContactSchema = z.object({
  orgId: uuidSchema,
  name: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  linkedinUrl: z.url().max(500).optional(),
  isDecisionMaker: z.boolean().default(false),
  // Origem do dado pessoal (LGPD, art. 18): ex. linkedin:busca, formulario:diagnostico.
  sourceDetail: z.string().trim().min(1).max(200),
});
export type CreateContactInput = z.input<typeof createContactSchema>;

export const updateContactSchema = z
  .object(nullableOptionals(createContactSchema.shape))
  .partial()
  .extend({ contactId: uuidSchema });
export type UpdateContactInput = z.input<typeof updateContactSchema>;
