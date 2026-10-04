import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// A convenção do projeto é .env.local (ver .env.example); .env fica como alternativa.
// Primeiro arquivo vence (sem override), como o `--env-file-if-exists` dos scripts.
config({ path: [".env.local", ".env"], quiet: true });

const url = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  casing: "snake_case",
  ...(url
    ? { dbCredentials: { url } }
    : { driver: "pglite", dbCredentials: { url: process.env.PGLITE_DIR ?? "./.pglite" } }),
});
