import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Ctx } from "./ctx";

// Usuários do tenant (lista "Atribuir dono"). Sem senha nem dados de sessão.
export type TenantUser = { id: string; name: string; email: string; role: string };

export async function listTenantUsers(ctx: Ctx): Promise<TenantUser[]> {
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.tenantId, ctx.tenantId))
    .orderBy(users.name);
}
