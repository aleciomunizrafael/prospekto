import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Única função sem `ctx`: não lê dado de tenant, só confirma que o banco responde.
export async function pingDatabase(): Promise<boolean> {
  await db.execute(sql`select 1`);
  return true;
}
