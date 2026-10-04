import path from "node:path";
import { beforeAll } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "@/lib/db";

// Cada arquivo de teste recebe um PGlite em memória novo (PGLITE_DIR=memory://, vitest.config.ts)
// com as migrações de drizzle/ aplicadas. Sem mocks de banco.
beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.join(process.cwd(), "drizzle") });
});
