// Regra R-15: a regra de lint que restringe o acesso ao banco cobre o alias e as importações
// relativas (o que o auto-import de editor gera). Roda o ESLint do projeto sobre trechos fictícios.
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: process.cwd() });

async function dbImportErrors(importPath: string, filePath: string): Promise<string[]> {
  const code = `import { db } from "${importPath}";\nexport const x = db;\n`;
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === "no-restricted-imports").map((m) => m.message);
}

describe("lint: db só por src/lib/repos/ (R-15)", () => {
  it.each([
    ["@/lib/db", "src/app/x.ts"],
    ["@/lib/db/schema", "src/app/x.ts"],
    ["@/lib/db/schema/leads", "src/actions/x.ts"],
    ["../lib/db", "src/app/x.ts"],
    ["../../lib/db/schema", "src/app/(app)/x.ts"],
    ["./db", "src/lib/x.ts"],
    ["./db/schema", "src/lib/x.ts"],
  ])("bloqueia %s em %s", async (importPath, filePath) => {
    const errors = await dbImportErrors(importPath, filePath);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/R-15/);
  });

  it.each([
    ["@/lib/db", "src/lib/repos/x.ts"],
    ["@/lib/db", "src/lib/auth.ts"],
    ["./schema", "src/lib/db/index.ts"],
  ])("permite %s em %s", async (importPath, filePath) => {
    expect(await dbImportErrors(importPath, filePath)).toEqual([]);
  });

  it("não bloqueia outras importações", async () => {
    expect(await dbImportErrors("@/lib/repos/leads", "src/app/x.ts")).toEqual([]);
    expect(await dbImportErrors("zod", "src/app/x.ts")).toEqual([]);
  });
});
