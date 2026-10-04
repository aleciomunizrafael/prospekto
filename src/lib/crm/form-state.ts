// Estado comum das Server Actions do CRM usadas com useActionState, mais leitura de FormData e
// conversão de erros (Zod, domínio, campos faltantes) em mensagens em português.
import { z } from "zod";
import { CommissionLimitError } from "@/lib/domain/commission";
import { DomainError, MissingFieldsError } from "@/lib/errors";
import { parseDecimalBr } from "./format";

export type ActionState =
  | { status: "idle" }
  | { status: "ok"; message?: string; warnings?: string[] }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      // Campos que faltam para um movimento de estágio (MissingFieldsError), um por linha na UI.
      missing?: string[];
    };

export const idleState: ActionState = { status: "idle" };

export function ok(message?: string, warnings?: string[]): ActionState {
  return { status: "ok", message, warnings: warnings?.length ? warnings : undefined };
}

export function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

// Número em reais digitado em português; "" -> undefined; inválido -> NaN (o Zod recusa).
export function num(fd: FormData, key: string): number | undefined {
  const v = str(fd, key);
  if (v === undefined) return undefined;
  const n = parseDecimalBr(v);
  return n == null ? Number.NaN : n;
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

// Caixa de três estados (sim/não/não informado) em selects.
export function triBool(fd: FormData, key: string): boolean | undefined {
  const v = str(fd, key);
  if (v === "sim") return true;
  if (v === "nao") return false;
  return undefined;
}

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function failFrom(error: unknown): ActionState {
  if (error instanceof z.ZodError) {
    const fieldErrors = fieldErrorsFrom(error);
    return {
      status: "error",
      message: "Confira os campos destacados.",
      fieldErrors,
    };
  }
  if (error instanceof MissingFieldsError) {
    return { status: "error", message: error.message, missing: [...error.missing] };
  }
  if (error instanceof CommissionLimitError || error instanceof DomainError) {
    return { status: "error", message: error.message };
  }
  // Erro inesperado: mensagem genérica; o detalhe vai para o log de quem chamou.
  return { status: "error", message: "Não foi possível salvar. Tente de novo em instantes." };
}
