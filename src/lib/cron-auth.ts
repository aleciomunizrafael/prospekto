import { timingSafeEqual } from "node:crypto";

// O cron do Vercel envia `Authorization: Bearer ${CRON_SECRET}`. Comparação em tempo constante;
// sem segredo configurado nada é autorizado (401), para o cron nunca rodar "aberto".
export function isCronAuthorized(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const received = Buffer.from(request.headers.get("authorization") ?? "", "utf8");
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}
