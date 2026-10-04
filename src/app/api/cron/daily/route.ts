import { env } from "@/env";
import { isCronAuthorized } from "@/lib/cron-auth";
import { log } from "@/lib/log";

// Cron diário (vercel.json: 10h UTC, 7h em Brasília). Por enquanto só autentica e responde;
// e-mail de pendências, SLAs vencidos e limpeza de form_attempts entram na tarefa do CRM (R-13).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request, env.CRON_SECRET)) {
    return new Response(null, { status: 401 });
  }
  log("info", "cron diário executado (ainda sem tarefas)", { tenantId: env.DEFAULT_TENANT_ID });
  return new Response(null, { status: 204 });
}
