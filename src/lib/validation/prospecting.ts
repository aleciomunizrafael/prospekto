// Listas e itens de prospecção (ADR-004, 6.4.1, 6.4.2 e 6.6). `sourceDetail` da lista é
// obrigatório (LGPD, art. 18), como em contacts. O telefone passa por phoneSchema (E.164).
import { z } from "zod";
import {
  DISCARD_REASONS,
  LEAD_INTERESTS,
  PROSPECTING_STATUSES,
  TAX_REGIMES,
} from "@/lib/domain/enums";
import {
  calendarDateSchema,
  emailSchema,
  nullableOptionals,
  phoneSchema,
  timestampSchema,
  uuidSchema,
} from "./common";

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

// ---------------------------------------------------------------------------------------------
// Frente C: resultado da ligação, WhatsApp, autosave e conversão (ADR-004, 6.6; plano, regra 10)

// Resultados que um botão grava; "reuniao_marcada" só pela conversão (convertItemSchema).
export const CALL_RESULT_STATUSES = ["a_ligar", "sem_resposta", "retornar", "descartado"] as const;

export const recordCallResultSchema = z
  .object({
    itemId: uuidSchema,
    // Ausente = só a anotação (botão "Anotação").
    status: z.enum(CALL_RESULT_STATUSES, { error: "Escolha o resultado." }).optional(),
    callbackAt: calendarDateSchema.optional(),
    reason: discardReasonSchema.optional(),
    note: text(2000, "A anotação").optional(),
  })
  .superRefine((v, ctx) => {
    if (v.status === "descartado" && !v.reason) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Escolha o motivo." });
    }
    if (v.status === "retornar" && !v.callbackAt) {
      ctx.addIssue({ code: "custom", path: ["callbackAt"], message: "Informe a data do retorno." });
    }
    if (!v.status && !v.note) {
      ctx.addIssue({ code: "custom", path: ["note"], message: "Escreva a anotação." });
    }
  });
export type RecordCallResultInput = z.input<typeof recordCallResultSchema>;

export const recordWhatsappSentSchema = z.object({
  itemId: uuidSchema,
  text: z
    .string({ error: "Escreva a mensagem." })
    .trim()
    .min(1, { error: "Escreva a mensagem." })
    .max(2000, { error: "A mensagem pode ter no máximo 2.000 caracteres." }),
});
export type RecordWhatsappSentInput = z.input<typeof recordWhatsappSentSchema>;

export const ITEM_AUTOSAVE_FIELDS = ["hook", "address", "size", "info", "notes"] as const;
export type ItemAutosaveField = (typeof ITEM_AUTOSAVE_FIELDS)[number];

export const updateItemFieldSchema = z.object({
  itemId: uuidSchema,
  field: z.enum(ITEM_AUTOSAVE_FIELDS, { error: "Campo desconhecido." }),
  value: z.string().max(2000, { error: "O texto pode ter no máximo 2.000 caracteres." }),
});
export type UpdateItemFieldInput = z.input<typeof updateItemFieldSchema>;

export const PROSPECTING_MEETING_KINDS = ["simulacao", "diagnostico"] as const;

// "Reunião marcada": e-mail obrigatório (leads.email é NOT NULL); telefone da pessoa opcional e
// nunca o da empresa (P10, P18).
export const convertItemSchema = z.object({
  itemId: uuidSchema,
  contactName: z
    .string({ error: "Informe quem vai à reunião." })
    .trim()
    .min(2, { error: "Informe quem vai à reunião." })
    .max(120, { error: "O nome pode ter no máximo 120 caracteres." }),
  email: emailSchema,
  contactPhone: phoneSchema.optional(),
  title: text(120, "O cargo").optional(),
  meetingAt: timestampSchema,
  meetingKind: z.enum(PROSPECTING_MEETING_KINDS).default("diagnostico"),
  taxRegime: z.enum(TAX_REGIMES).optional(),
  interest: z.enum(LEAD_INTERESTS).default("nao_sei"),
  ownerUserId: z.string().trim().min(1).optional(),
});
export type ConvertItemInput = z.input<typeof convertItemSchema>;

export const pasteItemsSchema = z.object({
  listId: uuidSchema,
  text: z
    .string({ error: "Cole a lista." })
    .max(200_000, { error: "O texto colado é grande demais (máximo de 200.000 caracteres)." }),
});
export type PasteItemsInput = z.input<typeof pasteItemsSchema>;
