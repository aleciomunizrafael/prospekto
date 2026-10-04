import { env } from "@/env";

// URL base pública do app, validada por src/env.ts (sem fallback silencioso para localhost): links
// absolutos de e-mails, token do guia e link do resultado do simulador. Só no servidor.
export function appUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}
