// Token do link de resultado do simulador e cookie do gate (simulador-spec.md, seções 5.3 e 6).
// Ambos assinados com HMAC e FORM_SECRET (src/lib/signing.ts), validade de 30 dias.
//
// Token do resultado: `<payload base64url>.<assinatura>` com { kind: "simulation", n: nonce, exp }.
// Não carrega dados sensíveis nem o id da simulação: a simulação é localizada pelo SHA-256 (hex)
// do token inteiro, gravado em simulations.result_token_hash. Sem o segredo não dá para forjar
// um token válido e, sem o token, o hash não identifica nada.
//
// Cookie do gate: { kind: "sim_gate", leadId, segment, tenantId, exp }; httpOnly. Quem já passou
// pelo gate vê o resultado detalhado direto nas simulações seguintes.
import { createHash, randomBytes } from "node:crypto";
import { signPayload, verifyPayload } from "@/lib/signing";

export const SIMULATION_TOKEN_DAYS = 30;
export const SIMULATION_TOKEN_MAX_AGE_SECONDS = SIMULATION_TOKEN_DAYS * 24 * 60 * 60;
export const SIMULATOR_GATE_COOKIE = "prospekto_simulador_gate";

export function hashSimulationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function issueSimulationToken(
  now: Date = new Date(),
  secret?: string,
): { token: string; hash: string; expiresAt: Date } {
  const expiresAt = new Date(now.getTime() + SIMULATION_TOKEN_MAX_AGE_SECONDS * 1000);
  const token = signPayload(
    { kind: "simulation", n: randomBytes(16).toString("base64url"), exp: expiresAt.getTime() },
    secret,
  );
  return { token, hash: hashSimulationToken(token), expiresAt };
}

export type SimulationTokenCheck =
  { status: "ok"; hash: string; expiresAt: Date } | { status: "expired" } | { status: "invalid" };

export function verifySimulationToken(
  token: string | null | undefined,
  now: Date = new Date(),
  secret?: string,
): SimulationTokenCheck {
  if (!token || token.length > 400) return { status: "invalid" };
  const payload = verifyPayload(token, secret);
  if (
    !payload ||
    payload.kind !== "simulation" ||
    typeof payload.n !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return { status: "invalid" };
  }
  if (now.getTime() > payload.exp) return { status: "expired" };
  return { status: "ok", hash: hashSimulationToken(token), expiresAt: new Date(payload.exp) };
}

export type GatePayload = { leadId: string; segment: "PJ" | "PF"; tenantId: string };

export function issueGateCookie(input: GatePayload, now: Date = new Date(), secret?: string) {
  return signPayload(
    {
      kind: "sim_gate",
      leadId: input.leadId,
      segment: input.segment,
      tenantId: input.tenantId,
      exp: now.getTime() + SIMULATION_TOKEN_MAX_AGE_SECONDS * 1000,
    },
    secret,
  );
}

export function verifyGateCookie(
  value: string | null | undefined,
  now: Date = new Date(),
  secret?: string,
): GatePayload | null {
  const payload = verifyPayload(value, secret);
  if (
    !payload ||
    payload.kind !== "sim_gate" ||
    typeof payload.leadId !== "string" ||
    (payload.segment !== "PJ" && payload.segment !== "PF") ||
    typeof payload.tenantId !== "string" ||
    typeof payload.exp !== "number" ||
    now.getTime() > payload.exp
  ) {
    return null;
  }
  return { leadId: payload.leadId, segment: payload.segment, tenantId: payload.tenantId };
}
