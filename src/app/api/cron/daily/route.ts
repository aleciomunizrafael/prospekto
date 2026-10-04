import { env } from "@/env";
import { isCronAuthorized } from "@/lib/cron-auth";
import { appUrl } from "@/lib/app-url";
import { calendarDateInSaoPaulo } from "@/lib/crm/format";
import { sendEmail } from "@/lib/email/send";
import { renderDigestEmail } from "@/lib/email/templates/digest";
import { log } from "@/lib/log";
import type { Ctx } from "@/lib/repos/ctx";
import { getDigestSentOn, loadDigestData, markDigestSent } from "@/lib/repos/digest";
import { cleanupFormAttempts } from "@/lib/repos/form-attempts";
import { cleanupOrphanSimulations } from "@/lib/repos/simulations";
import { listTenantUsers } from "@/lib/repos/users";

// Cron diário (vercel.json: 10h UTC, 7h em Brasília; proposta-c, 9.3; regra R-13).
// 1. Monta o resumo do dia (follow-ups vencidos, tarefas vencidas, leads novos sem dono, aportes
//    previstos em 15 dias, projetos em alerta, últimos 7 dias com o alerta de "zero leads") e envia
//    um e-mail por usuário do tenant. Idempotente por dia (tenants.settings.daily_email_sent_on);
//    `?force=1` reenvia (uso manual).
// 2. Limpa form_attempts com mais de um dia e simulações sem lead com mais de 30 dias.
// Responde JSON só com contagens (regra R-16: nenhum dado pessoal).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request, env.CRON_SECRET)) {
    return new Response(null, { status: 401 });
  }
  const now = new Date();
  const ctx: Ctx = { tenantId: env.DEFAULT_TENANT_ID, userId: null };
  const force = new URL(request.url).searchParams.get("force") === "1";
  const today = calendarDateInSaoPaulo(now);

  const digest = {
    sent: 0,
    failed: 0,
    skipped: false,
    recipients: 0,
    counts: {} as Record<string, number>,
    alerts: 0,
  };
  try {
    const sentOn = await getDigestSentOn(ctx);
    if (sentOn === today && !force) {
      digest.skipped = true;
    } else {
      const [data, users] = await Promise.all([loadDigestData(ctx, now), listTenantUsers(ctx)]);
      digest.recipients = users.length;
      for (const user of users) {
        const email = renderDigestEmail(data, {
          appUrl: appUrl(),
          now,
          recipientName: user.name,
        });
        digest.counts = email.counts;
        digest.alerts = email.alerts.length;
        const result = await sendEmail({
          to: user.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
          templateId: "digest",
        });
        if (result.mode === "error") digest.failed += 1;
        else digest.sent += 1;
      }
      if (users.length === 0) {
        const email = renderDigestEmail(data, {
          appUrl: appUrl(),
          now,
          recipientName: "equipe",
        });
        digest.counts = email.counts;
        digest.alerts = email.alerts.length;
      }
      if (digest.failed === 0) await markDigestSent(ctx, today);
      else log("error", "e-mail diário com falhas de envio", { tenantId: ctx.tenantId, ...digest });
    }
  } catch (error) {
    log("error", "falha ao montar ou enviar o e-mail diário", { tenantId: ctx.tenantId, error });
    digest.failed += 1;
  }

  const cleanup = { formAttempts: "ok", orphanSimulations: 0 };
  try {
    await cleanupFormAttempts(ctx, now);
    cleanup.orphanSimulations = await cleanupOrphanSimulations(ctx, now, 30);
  } catch (error) {
    log("error", "falha na limpeza do cron diário", { tenantId: ctx.tenantId, error });
    cleanup.formAttempts = "error";
  }

  log("info", "cron diário executado", { tenantId: ctx.tenantId, digest, cleanup });
  return Response.json({ tenantId: ctx.tenantId, date: today, digest, cleanup });
}
