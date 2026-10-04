// Verificação da assinatura dos webhooks do Resend, que usa o padrão Svix
// (https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests;
// https://docs.svix.com/receiving/verifying-payloads/how-manual, lidas em 04/10/2026):
// signed_content = "{svix-id}.{svix-timestamp}.{corpo bruto}"; HMAC-SHA256 com a chave sendo o
// base64 decodificado do segredo após o prefixo "whsec_"; o cabeçalho svix-signature traz uma
// lista separada por espaço de "v1,<assinatura em base64>"; carimbo de tempo com tolerância de
// 5 minutos. Implementado com crypto nativo (sem dependência nova).
import { createHmac, timingSafeEqual } from "node:crypto";

export const SVIX_TOLERANCE_SECONDS = 5 * 60;

export type SvixHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

export function readSvixHeaders(headers: Headers): SvixHeaders {
  return {
    id: headers.get("svix-id"),
    timestamp: headers.get("svix-timestamp"),
    signature: headers.get("svix-signature"),
  };
}

export function signSvix(secret: string, id: string, timestamp: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
}

export type SvixVerification = { ok: true } | { ok: false; reason: string };

export function verifySvixSignature(
  secret: string,
  headers: SvixHeaders,
  body: string,
  now: Date = new Date(),
): SvixVerification {
  if (!headers.id || !headers.timestamp || !headers.signature) {
    return { ok: false, reason: "missing_headers" };
  }
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad_timestamp" };
  const skew = Math.abs(now.getTime() / 1000 - ts);
  if (skew > SVIX_TOLERANCE_SECONDS) return { ok: false, reason: "timestamp_out_of_tolerance" };

  const expected = Buffer.from(signSvix(secret, headers.id, headers.timestamp, body), "base64");
  for (const entry of headers.signature.split(/\s+/)) {
    const [version, value] = entry.split(",", 2);
    if (version !== "v1" || !value) continue;
    const received = Buffer.from(value, "base64");
    if (received.length === expected.length && timingSafeEqual(received, expected)) {
      return { ok: true };
    }
  }
  return { ok: false, reason: "signature_mismatch" };
}
