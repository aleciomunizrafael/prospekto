import "server-only";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
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

export type ReserveAiRunInput = {
  kind: AiKind;
  leadId: string | null;
  model: string;
  createdBy?: string | null;
  // Teto de execuções no dia civil (AI_DAILY_LIMIT); parâmetro para o teste fixar um valor pequeno.
  limit: number;
  now?: Date;
};

// Reserva uma execução dentro do teto diário de forma atômica por tenant (ADR-003, 7.2): contagem e
// inserção acontecem numa transação sob uma trava consultiva do tenant, então N requisições em
// paralelo no limite passam uma só (contar e só gravar depois da chamada deixava a rajada inteira
// passar). A linha nasce "pending" e finishAiRun a completa depois da chamada ao modelo; a transação
// termina aqui, sem prender conexão durante a chamada. Devolve null quando o teto foi atingido. Uma
// linha "pending" órfã (processo morto no meio) continua contando no dia, o que é coerente com
// "toda execução grava uma linha".
export async function reserveAiRun(ctx: Ctx, input: ReserveAiRunInput): Promise<string | null> {
  const { start } = dayBounds(input.now ?? new Date());
  return db.transaction(async (tx) => {
    // Chave (namespace, tenant): a trava some no fim da transação e não colide com outras travas.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('ai_runs'), hashtext(${ctx.tenantId}))`,
    );
    const [row] = await tx
      .select({ total: count() })
      .from(aiRuns)
      .where(and(eq(aiRuns.tenantId, ctx.tenantId), gte(aiRuns.createdAt, start)));
    if ((row?.total ?? 0) >= input.limit) return null;
    const [inserted] = await tx
      .insert(aiRuns)
      .values({
        tenantId: ctx.tenantId,
        kind: input.kind,
        leadId: input.leadId,
        model: input.model,
        status: "pending",
        createdBy: input.createdBy ?? ctx.userId ?? null,
      })
      .returning({ id: aiRuns.id });
    return inserted.id;
  });
}

export type FinishAiRunInput = {
  model: string;
  status: Exclude<AiRunStatus, "pending">;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadInputTokens?: number;
  durationMs?: number | null;
  output?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
};

// Completa a linha reservada por reserveAiRun. Filtra por tenant além do id (R-15): devolve null
// quando a linha não é do tenant, sem alterar nada.
export async function finishAiRun(
  ctx: Ctx,
  id: string,
  input: FinishAiRunInput,
): Promise<AiRun | null> {
  const [row] = await db
    .update(aiRuns)
    .set({
      model: input.model,
      status: input.status,
      inputTokens: input.inputTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      cacheReadInputTokens: input.cacheReadInputTokens ?? 0,
      durationMs: input.durationMs ?? null,
      output: input.output ?? null,
      data: input.data ?? null,
    })
    .where(and(eq(aiRuns.id, id), eq(aiRuns.tenantId, ctx.tenantId)))
    .returning();
  return row ?? null;
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
