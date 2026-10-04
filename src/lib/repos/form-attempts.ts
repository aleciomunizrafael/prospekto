import "server-only";
import { lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { formAttempts } from "@/lib/db/schema";
import type { Ctx } from "./ctx";

// Limite de 5 envios por IP por hora (estrutura-e-copy.md, seção 5.1; regra R-18).
export const FORM_ATTEMPT_LIMIT_PER_HOUR = 5;

function windowStartFor(now: Date): Date {
  const d = new Date(now.getTime());
  d.setUTCMinutes(0, 0, 0);
  return d;
}

// `form_attempts` é a única tabela sem tenant_id (modelo-de-dados.md, 3.11): o ctx é recebido
// por uniformidade e não filtra. Upsert por (ip_hash, janela) e decisão no mesmo comando.
export async function hitFormAttempt(
  _ctx: Ctx,
  ipHash: string,
  now: Date = new Date(),
): Promise<{ allowed: boolean; count: number; windowStart: Date }> {
  const windowStart = windowStartFor(now);
  const [row] = await db
    .insert(formAttempts)
    .values({ ipHash, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [formAttempts.ipHash, formAttempts.windowStart],
      set: { count: sql`${formAttempts.count} + 1` },
    })
    .returning({ count: formAttempts.count });
  return { allowed: row.count <= FORM_ATTEMPT_LIMIT_PER_HOUR, count: row.count, windowStart };
}

// Limpeza pelo cron diário: janelas com mais de um dia.
export async function cleanupFormAttempts(_ctx: Ctx, now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  await db.delete(formAttempts).where(lt(formAttempts.windowStart, cutoff));
}
