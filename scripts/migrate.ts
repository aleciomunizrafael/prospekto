// scaffold.md, seção 5.5: aplica drizzle/ no banco de DATABASE_URL ou no PGlite local (PGLITE_DIR).
import path from "node:path";
import { db } from "../src/lib/db";

const migrationsFolder = path.join(process.cwd(), "drizzle");

if (process.env.DATABASE_URL) {
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  await migrate(db as never, { migrationsFolder });
} else {
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  await migrate(db as never, { migrationsFolder });
}
console.log("migrações aplicadas");
process.exit(0);
