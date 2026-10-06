// Schemas Zod reutilizados pelos formulários e repositórios. Mensagens em português.
import { z } from "zod";
import { UFS } from "@/lib/domain/enums";

export const emailSchema = z
  .email({ error: "Informe um e-mail válido." })
  .trim()
  .toLowerCase()
  .max(254);

// E.164: +55DDDNNNNNNNNN. Aceita entrada com máscara e normaliza.
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => {
    const digits = v.replace(/\D/g, "");
    if (!digits) return "";
    const withCountry = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
    return `+${withCountry}`;
  })
  .refine((v) => v === "" || /^\+55\d{10,11}$/.test(v), {
    error: "Informe um telefone com DDD, por exemplo (54) 98403-2180.",
  });

export const ufSchema = z.enum(UFS, { error: "Informe uma UF válida." });

export function isValidCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const calc = (len: number) => {
    const weights =
      len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(digits[i]) * w, 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13]);
}

export const cnpjSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine(isValidCnpj, { error: "Informe um CNPJ válido (14 dígitos)." });

export const moneySchema = z
  .number({ error: "Informe um valor em reais." })
  .finite()
  .nonnegative({ error: "O valor não pode ser negativo." })
  .transform((v) => Math.round(v * 100) / 100);

export const positiveMoneySchema = moneySchema.refine((v) => v > 0, {
  error: "O valor deve ser maior que zero.",
});

// Data de calendário (YYYY-MM-DD), como o Postgres `date`.
// O campo é um calendário (input type="date"): a mensagem não fala de formato.
export const calendarDateSchema = z.iso.date({ error: "Informe a data." });

export const timestampSchema = z.coerce.date({ error: "Informe uma data e hora válidas." });

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "Use só letras minúsculas, números e hífens." })
  .max(80);

export const uuidSchema = z.uuid({ error: "Identificador inválido." });

export const tagsSchema = z.array(z.string().trim().min(1).max(60)).default([]);

// Para schemas de atualização: todo campo opcional passa a aceitar `null` (limpar o campo no
// formulário do CRM), mantendo os obrigatórios como estão. Usado por updateProjectSchema,
// updateOrganizationSchema e updateContactSchema.
export type NullableOptionals<T extends z.ZodRawShape> = {
  [K in keyof T]: T[K] extends z.ZodOptional<infer Inner extends z.ZodTypeAny>
    ? z.ZodOptional<z.ZodNullable<Inner>>
    : T[K];
};

export function nullableOptionals<T extends z.ZodRawShape>(shape: T): NullableOptionals<T> {
  const out: Record<string, z.ZodTypeAny> = {};
  for (const [key, value] of Object.entries(shape)) {
    out[key] =
      value instanceof z.ZodOptional
        ? (value.unwrap() as z.ZodTypeAny).nullable().optional()
        : (value as z.ZodTypeAny);
  }
  return out as unknown as NullableOptionals<T>;
}
