import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type Ctx = { tenantId: string; userId: string; role: "owner" | "operator" };

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession(): Promise<Ctx> {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const u = session.user as typeof session.user & { tenantId: string; role?: string };
  return { tenantId: u.tenantId, userId: u.id, role: (u.role as Ctx["role"]) ?? "operator" };
}
