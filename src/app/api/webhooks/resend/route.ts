import { env } from "@/env";
import { site } from "@/config/site";
import { eventEmails, eventToKind, type ResendEvent } from "@/lib/crm/resend-events";
import { readSvixHeaders, verifySvixSignature } from "@/lib/crm/resend-signature";
import { log } from "@/lib/log";
import { applyEmailEvent } from "@/lib/repos/consents";
import type { Ctx } from "@/lib/repos/ctx";

// Webhook do Resend (proposta-c, 4.6; regra R-14). Assinatura no padrão Svix verificada em
// src/lib/crm/resend-signature.ts com RESEND_WEBHOOK_SECRET; sem segredo configurado responde 503
// (o endpoint nunca fica aberto). Eventos (https://resend.com/docs/dashboard/webhooks/event-types,
// lida em 04/10/2026): `email.bounced` -> leads.email_status = bounced; `email.complained` ->
// complained e revogação de marketing; descadastro -> revogação de marketing. O Resend não tem um
// evento `email.unsubscribed`: o descadastro chega como `contact.updated` com `unsubscribed: true`
// (contatos/broadcasts) [verificar na conta]; `email.unsubscribed` é aceito como equivalente.
// Responde JSON só com contagens; nunca registra o e-mail em log (R-16).
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!env.RESEND_WEBHOOK_SECRET) {
    return Response.json({ error: "webhook_not_configured" }, { status: 503 });
  }
  const body = await request.text();
  const verification = verifySvixSignature(
    env.RESEND_WEBHOOK_SECRET,
    readSvixHeaders(request.headers),
    body,
  );
  if (!verification.ok) {
    log("warn", "webhook do Resend recusado", { reason: verification.reason });
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }
  let event: ResendEvent;
  try {
    event = JSON.parse(body) as ResendEvent;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const kind = eventToKind(event);
  if (!kind) return Response.json({ ignored: true, type: event.type ?? null });

  const ctx: Ctx = { tenantId: env.DEFAULT_TENANT_ID, userId: null };
  const totals = { leadsMatched: 0, emailStatusUpdated: 0, consentsRevoked: 0 };
  for (const email of eventEmails(event)) {
    const r = await applyEmailEvent(ctx, { email, kind, policyVersion: site.policyVersion });
    totals.leadsMatched += r.leadsMatched;
    totals.emailStatusUpdated += r.emailStatusUpdated;
    totals.consentsRevoked += r.consentsRevoked;
  }
  log("info", "webhook do Resend processado", {
    tenantId: ctx.tenantId,
    type: event.type,
    kind,
    ...totals,
  });
  return Response.json({ type: event.type, kind, ...totals });
}
