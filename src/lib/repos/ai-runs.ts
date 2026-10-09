import "server-only";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiRuns } from "@/lib/db/schema";
import type { AiKind, AiRunStatus } from "@/lib/ai/types";
import { dayBounds } from "@/lib/crm/format";
import type { Ctx } from "./ctx";

export type AiRun = typeof aiRuns.$inferSelect;

export type InsertAiRunInput = {
  kind: AiKind;
  leadId: string | null;
  model: string;
  status: AiRunStatus;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadInputTokens?: number;
  durationMs?: number | null;
  output?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
  createdBy?: string | null;
};

// Uma linha por execução, inclusive recusa e erro (ADR-003, seção 8). Nunca grava prompt.
export async function insertAiRun(ctx: Ctx, input: InsertAiRunInput): Promise<AiRun> {
  const [row] = await db
    .insert(aiRuns)
    .values({
      tenantId: ctx.tenantId,
      kind: input.kind,
      leadId: input.leadId,
      model: input.model,
      status: input.status,
      inputTokens: input.inputTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      cacheReadInputTokens: input.cacheReadInputTokens ?? 0,
      durationMs: input.durationMs ?? null,
      output: input.output ?? null,
      data: input.data ?? null,
      createdBy: input.createdBy ?? ctx.userId ?? null,
    })
    .returning();
  return row;
}

// Execuções do tenant desde o início do dia civil em America/Sao_Paulo (teto diário, ADR-003, 7.2).
export async function countAiRunsToday(ctx: Ctx, now: Date = new Date()): Promise<number> {
  const { start } = dayBounds(now);
  const [row] = await db
    .select({ total: count() })
    .from(aiRuns)
    .where(and(eq(aiRuns.tenantId, ctx.tenantId), gte(aiRuns.createdAt, start)));
  return row?.total ?? 0;
}

// Último resultado bem-sucedido de um recurso para o lead (decisão P2): só status = "ok".
export async function getLatestAiRun(
  ctx: Ctx,
  input: { leadId: string; kind: AiKind },
): Promise<AiRun | null> {
  const [row] = await db
    .select()
    .from(aiRuns)
    .where(
      and(
        eq(aiRuns.tenantId, ctx.tenantId),
        eq(aiRuns.leadId, input.leadId),
        eq(aiRuns.kind, input.kind),
        eq(aiRuns.status, "ok"),
      ),
    )
    .orderBy(desc(aiRuns.createdAt), desc(aiRuns.id))
    .limit(1);
  return row ?? null;
}

export async function listAiRuns(
  ctx: Ctx,
  input: { leadId: string; limit?: number },
): Promise<AiRun[]> {
  return db
    .select()
    .from(aiRuns)
    .where(and(eq(aiRuns.tenantId, ctx.tenantId), eq(aiRuns.leadId, input.leadId)))
    .orderBy(desc(aiRuns.createdAt), desc(aiRuns.id))
    .limit(input.limit ?? 50);
}
