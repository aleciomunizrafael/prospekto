// Tokens assinados com HMAC-SHA256 e FORM_SECRET (ADR-001: carimbo de tempo dos formulários e
// link do guia sem tabela de downloads). Puro: só node:crypto; o segredo vem por parâmetro, com
// padrão em env.FORM_SECRET, para os testes assinarem com segredos diferentes.
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/env";

export const FORM_MIN_FILL_MS = 3_000; // regra R-18: envio em menos de 3 s não grava
export const FORM_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const GUIDE_TOKEN_HOURS = 72;

type Payload = Record<string, string | number | boolean | null>;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function hmac(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function signPayload(payload: Payload, secret: string = env.FORM_SECRET): string {
  const body = base64url(JSON.stringify(payload));
  return `${body}.${hmac(body, secret)}`;
}

// Devolve o payload quando a assinatura confere; null em token ausente, malformado ou adulterado.
export function verifyPayload(
  token: string | null | undefined,
  secret: string = env.FORM_SECRET,
): Payload | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const received = Buffer.from(token.slice(dot + 1), "utf8");
  const expected = Buffer.from(hmac(body, secret), "utf8");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Payload;
  } catch {
    return null;
  }
}

// Carimbo de tempo do formulário: emitido quando o formulário é montado no cliente.
export function issueFormTimestamp(now: Date = new Date(), secret?: string): string {
  return signPayload({ kind: "form", iat: now.getTime() }, secret);
}

export type FormTimestampCheck =
  | { status: "ok"; issuedAt: Date }
  | { status: "too_fast"; issuedAt: Date }
  | { status: "expired"; issuedAt: Date }
  | { status: "invalid" };

export function verifyFormTimestamp(
  token: string | null | undefined,
  now: Date = new Date(),
  secret?: string,
): FormTimestampCheck {
  const payload = verifyPayload(token, secret);
  if (!payload || payload.kind !== "form" || typeof payload.iat !== "number") {
    return { status: "invalid" };
  }
  const issuedAt = new Date(payload.iat);
  const age = now.getTime() - payload.iat;
  if (age < 0 || age > FORM_TOKEN_MAX_AGE_MS) return { status: "expired", issuedAt };
  if (age < FORM_MIN_FILL_MS) return { status: "too_fast", issuedAt };
  return { status: "ok", issuedAt };
}

// Link do guia: lead e validade de 72 horas (estrutura-e-copy.md, seção 10.3).
export type GuideTokenPayload = { leadId: string; guideVersion: string; tenantId: string };

export function issueGuideToken(
  input: GuideTokenPayload,
  now: Date = new Date(),
  secret?: string,
): string {
  return signPayload(
    {
      kind: "guide",
      leadId: input.leadId,
      guideVersion: input.guideVersion,
      tenantId: input.tenantId,
      exp: now.getTime() + GUIDE_TOKEN_HOURS * 60 * 60 * 1000,
    },
    secret,
  );
}

export type GuideTokenCheck =
  | { status: "ok"; payload: GuideTokenPayload; expiresAt: Date }
  | { status: "expired" }
  | { status: "invalid" };

export function verifyGuideToken(
  token: string | null | undefined,
  now: Date = new Date(),
  secret?: string,
): GuideTokenCheck {
  const payload = verifyPayload(token, secret);
  if (
    !payload ||
    payload.kind !== "guide" ||
    typeof payload.leadId !== "string" ||
    typeof payload.guideVersion !== "string" ||
    typeof payload.tenantId !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return { status: "invalid" };
  }
  if (now.getTime() > payload.exp) return { status: "expired" };
  return {
    status: "ok",
    payload: {
      leadId: payload.leadId,
      guideVersion: payload.guideVersion,
      tenantId: payload.tenantId,
    },
    expiresAt: new Date(payload.exp),
  };
}

// Hash do IP com sal (form_attempts.ip_hash; modelo-de-dados.md, 3.11). Nunca o IP em claro.
export function hashIp(ip: string | null | undefined, secret: string = env.FORM_SECRET): string {
  return hmac(`ip:${ip?.trim() || "desconhecido"}`, secret);
}
