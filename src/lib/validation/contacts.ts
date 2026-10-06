import { z } from "zod";
import { emailSchema, nullableOptionals, phoneSchema, uuidSchema } from "./common";

// Mensagens em português por campo (o formulário mostra cada uma sob o campo).
export const createContactSchema = z.object({
  orgId: uuidSchema,
  name: z
    .string({ error: "Informe o nome do contato." })
    .trim()
    .min(2, { error: "Informe o nome do contato." })
    .max(120, { error: "O nome pode ter no máximo 120 caracteres." }),
  title: z
    .string()
    .trim()
    .max(120, { error: "O cargo pode ter no máximo 120 caracteres." })
    .optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  linkedinUrl: z
    .url({ error: "Informe um link completo, começando com https://." })
    .max(500)
    .optional(),
  isDecisionMaker: z.boolean().default(false),
  // Origem do dado pessoal (LGPD, art. 18): ex. linkedin:busca, formulario:diagnostico.
  sourceDetail: z
    .string({ error: "Informe de onde veio o dado." })
    .trim()
    .min(1, { error: "Informe de onde veio o dado." })
    .max(200, { error: "Use no máximo 200 caracteres." }),
});
export type CreateContactInput = z.input<typeof createContactSchema>;

export const updateContactSchema = z
  .object(nullableOptionals(createContactSchema.shape))
  .partial()
  .extend({ contactId: uuidSchema });
export type UpdateContactInput = z.input<typeof updateContactSchema>;
