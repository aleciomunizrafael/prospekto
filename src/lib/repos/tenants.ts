import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import type { Ctx } from "./ctx";

// Única função de escrita sem ctx: cria o próprio tenant (seed e testes). Idempotente.
export async function ensureTenant(input: { id: string; name: string }) {
  await db.insert(tenants).values({ id: input.id, name: input.name }).onConflictDoNothing();
  const [row] = await db.select().from(tenants).where(eq(tenants.id, input.id));
  return row;
}

export async function getTenant(ctx: Ctx) {
  const [row] = await db.select().from(tenants).where(eq(tenants.id, ctx.tenantId));
  return row ?? null;
}
