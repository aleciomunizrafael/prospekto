// Fábricas para os testes de repositório e de isolamento. Só tests/ e scripts/ importam @/lib/db.
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Ctx } from "@/lib/repos/ctx";
import { ensureTenant } from "@/lib/repos/tenants";

let seq = 0;

export async function makeTenant(id = `t${++seq}`): Promise<Ctx> {
  await ensureTenant({ id, name: `Tenant ${id}` });
  const userId = `${id}-user-${++seq}`;
  await db.insert(users).values({
    id: userId,
    name: `Usuário ${id}`,
    email: `${userId}@example.test`,
    tenantId: id,
    role: "owner",
  });
  return { tenantId: id, userId };
}

export async function makeUser(ctx: Ctx, role: "owner" | "operator" = "operator"): Promise<string> {
  const id = `${ctx.tenantId}-user-${++seq}`;
  await db.insert(users).values({
    id,
    name: `Usuário ${id}`,
    email: `${id}@example.test`,
    tenantId: ctx.tenantId,
    role,
  });
  return id;
}

export function uniqueEmail(prefix = "lead"): string {
  return `${prefix}-${++seq}@example.test`;
}

export const consentContato = {
  purpose: "contato_comercial" as const,
  granted: true,
  policyVersion: "2026-10-03",
  consentText: "Autorizo a Prospekto a entrar em contato sobre incentivo cultural.",
  channels: ["email" as const],
  sourcePage: "/empresas",
};
