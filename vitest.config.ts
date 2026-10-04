import path from "node:path";
import { defineConfig } from "vitest/config";

// "type": "module" no package.json: não existe __dirname; import.meta.dirname existe desde o Node 20.11
// (https://nodejs.org/api/esm.html#importmetadirname) e o projeto exige 22.12+.
const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      "server-only": path.resolve(root, "tests/empty.ts"),
    },
  },
  test: {
    environment: "node",
    // Migração do PGlite em memória por arquivo; sob carga (build em paralelo) passa de 10 s.
    hookTimeout: 60_000,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Valores fictícios: src/env.ts é validado em runtime (importado por src/lib/db) e os testes
    // não dependem de .env.local. Nenhum segredo real.
    env: {
      PGLITE_DIR: "memory://",
      NODE_ENV: "test",
      BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters-0000",
      BETTER_AUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      FORM_SECRET: "test-only-form-secret-with-at-least-32-chars-0000",
      CRON_SECRET: "test-only-cron-secret-0000",
    },
  },
});
