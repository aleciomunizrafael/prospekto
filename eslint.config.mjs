import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Regra R-15 (ADR-001): o banco só é acessado por src/lib/repos/ (e por src/lib/auth.ts, scripts/
// e tests/). Os padrões cobrem o alias (@/lib/db) e importações relativas (../lib/db, ./db),
// que são o que o auto-import de editor costuma gerar. Formato gitignore do no-restricted-imports.
// Coberto por tests/lint.test.ts.
export const DB_IMPORT_PATTERNS = [
  "@/lib/db",
  "@/lib/db/**",
  "**/lib/db",
  "**/lib/db/**",
  "./db",
  "./db/**",
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".claude/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "drizzle/**",
    ".pglite/**",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/repos/**", "src/lib/auth.ts", "src/lib/db/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: DB_IMPORT_PATTERNS,
              message: "Acesse o banco só por src/lib/repos/ (regra R-15).",
            },
          ],
        },
      ],
    },
  },
]);
