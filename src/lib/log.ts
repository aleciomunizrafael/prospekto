// Logs em JSON (uma linha por evento) para os logs do Vercel. Regra R-16 (LGPD, art. 6º, VII):
// nunca e-mail, telefone, CPF ou CNPJ; só ids. Chaves sensíveis são redigidas em qualquer nível.
export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = {
  tenantId?: string | null;
  requestId?: string | null;
  [key: string]: unknown;
};

const SENSITIVE_KEY =
  /(e-?mail|phone|telefone|celular|whatsapp|cpf|cnpj|password|senha|token|secret)/i;

export const REDACTED = "[redigido]";

// Devolve uma cópia com toda chave sensível substituída por "[redigido]", em qualquer profundidade.
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[profundidade]";
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function formatLog(level: LogLevel, msg: string, fields: LogFields = {}): string {
  const { tenantId = null, requestId = null, ...extras } = fields;
  return JSON.stringify({
    level,
    msg,
    time: new Date().toISOString(),
    tenantId,
    requestId,
    ...(redact(extras) as Record<string, unknown>),
  });
}

export function log(level: LogLevel, msg: string, fields: LogFields = {}): void {
  const line = formatLog(level, msg, fields);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
