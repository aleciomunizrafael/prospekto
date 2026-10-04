// Sem "server-only": o CLI `auth generate` recusa configurações que o importem.
// A proteção fica em src/lib/repos/* e na regra de lint (scaffold.md, seção 6).
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
// Lê a configuração validada (e não process.env direto) para que src/env.ts valha em runtime,
// não só no build: sem DATABASE_URL num ambiente implantado o processo falha aqui.
import { env, isDeployed } from "../../env";
import * as schema from "./schema";

// Tipo comum aos dois drivers (PGlite e node-postgres): evita a união de tipos, que
// impede chamar select/insert/update (métodos genéricos) sem cast.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

async function createDb(): Promise<Db> {
  if (env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: env.DATABASE_URL, max: 5 });
    return drizzle({ client: pool, schema, casing: "snake_case" });
  }
  if (isDeployed) {
    // src/env.ts já exige DATABASE_URL quando implantado; esta é a última barreira.
    throw new Error(
      "DATABASE_URL ausente em ambiente implantado: o PGlite local não é um banco durável.",
    );
  }
  const { drizzle } = await import("drizzle-orm/pglite");
  const { PGlite } = await import("@electric-sql/pglite");
  const client = new PGlite(env.PGLITE_DIR); // "memory://" nos testes
  return drizzle({ client, schema, casing: "snake_case" });
}

const g = globalThis as unknown as { __prospektoDb?: Promise<Db> };
export const dbPromise = (g.__prospektoDb ??= createDb());
export const db = await dbPromise;
