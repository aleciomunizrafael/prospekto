// Listas e itens de prospecção (ADR-004, 6.4.1, 6.4.2 e 6.6). `sourceDetail` da lista é
// obrigatório (LGPD, art. 18), como em contacts. O telefone passa por phoneSchema (E.164).
import { z } from "zod";
import { DISCARD_REASONS, PROSPECTING_STATUSES } from "@/lib/domain/enums";
import { calendarDateSchema, nullableOptionals, phoneSchema, uuidSchema } from "./common";

const text = (max: number, what: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${what} pode ter no máximo ${max.toLocaleString("pt-BR")} caracteres.` });

export const createListSchema = z.object({
  name: z
    .string({ error: "Informe o nome da lista." })
    .trim()
    .min(2, { error: "Informe o nome da lista." })
    .max(120, { error: "O nome pode ter no máximo 120 caracteres." }),
  region: text(120, "A região").optional(),
  notes: text(2000, "As notas").optional(),
  sourceDetail: z
    .string({ error: "Informe de onde vieram os dados." })
    .trim()
    .min(2, { error: "Informe de onde vieram os dados." })
    .max(200, { error: "A origem dos dados pode ter no máximo 200 caracteres." }),
  assigneeUserId: z.string().trim().min(1, { error: "Escolha quem liga." }).optional(),
});
export type CreateListInput = z.input<typeof createListSchema>;

export const updateListSchema = z
  .object(nullableOptionals(createListSchema.shape))
  .partial()
  .extend({ listId: uuidSchema });
export type UpdateListInput = z.input<typeof updateListSchema>;

export const newItemSchema = z.object({
  name: z
    .string({ error: "Informe o nome da empresa." })
    .trim()
    .min(1, { error: "Informe o nome da empresa." })
    .max(160, { error: "O nome pode ter no máximo 160 caracteres." }),
  segment: text(80, "O segmento").optional(),
  phone: phoneSchema.optional(),
  hook: text(2000, "A abertura").optional(),
  address: text(2000, "A localização").optional(),
  size: text(2000, "O porte").optional(),
  info: text(2000, "As informações").optional(),
});
export type NewItemInput = z.input<typeof newItemSchema>;

export const prospectingStatusSchema = z.enum(PROSPECTING_STATUSES, {
  error: "Escolha o status.",
});
export const discardReasonSchema = z.enum(DISCARD_REASONS, { error: "Escolha o motivo." });

export const updateItemSchema = z
  .object(nullableOptionals(newItemSchema.shape))
  .partial()
  .extend({
    itemId: uuidSchema,
    status: prospectingStatusSchema.optional(),
    notes: text(2000, "A anotação").nullable().optional(),
    callbackAt: calendarDateSchema.nullable().optional(),
  });
export type UpdateItemInput = z.input<typeof updateItemSchema>;
