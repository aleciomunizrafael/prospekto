import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, simulations } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import { createSimulationSchema, type CreateSimulationInput } from "@/lib/validation/simulations";
import type { Ctx } from "./ctx";

export type Simulation = typeof simulations.$inferSelect;

export async function createSimulation(
  ctx: Ctx,
  input: CreateSimulationInput,
): Promise<Simulation> {
  const data = createSimulationSchema.parse(input);
  const [row] = await db
    .insert(simulations)
    .values({ ...data, tenantId: ctx.tenantId })
    .returning();
  return row;
}

// Liga a simulação ao lead criado no gate (simulador-spec.md, seção 6).
export async function attachSimulationToLead(
  ctx: Ctx,
  simulationId: string,
  leadId: string,
): Promise<Simulation> {
  const [lead] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.id, leadId)));
  if (!lead) throw new NotFoundError("Lead", leadId);
  const [row] = await db
    .update(simulations)
    .set({ leadId })
    .where(and(eq(simulations.tenantId, ctx.tenantId), eq(simulations.id, simulationId)))
    .returning();
  if (!row) throw new NotFoundError("Simulação", simulationId);
  return row;
}

export async function getSimulation(ctx: Ctx, simulationId: string): Promise<Simulation | null> {
  const [row] = await db
    .select()
    .from(simulations)
    .where(and(eq(simulations.tenantId, ctx.tenantId), eq(simulations.id, simulationId)));
  return row ?? null;
}

export async function getSimulationByTokenHash(
  ctx: Ctx,
  resultTokenHash: string,
): Promise<Simulation | null> {
  const [row] = await db
    .select()
    .from(simulations)
    .where(
      and(eq(simulations.tenantId, ctx.tenantId), eq(simulations.resultTokenHash, resultTokenHash)),
    );
  return row ?? null;
}

export async function listSimulations(
  ctx: Ctx,
  filter: { leadId?: string; limit?: number } = {},
): Promise<Simulation[]> {
  const where = [eq(simulations.tenantId, ctx.tenantId)];
  if (filter.leadId) where.push(eq(simulations.leadId, filter.leadId));
  return db
    .select()
    .from(simulations)
    .where(and(...where))
    .orderBy(desc(simulations.createdAt))
    .limit(filter.limit ?? 100);
}
