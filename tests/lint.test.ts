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

// Zod não vai ao navegador: componentes "use client" só importam de src/lib/validation/forms/ os
// módulos sem zod (state.ts, index.ts só com `import type` e *-options.ts). Os schemas importam
// as listas desses módulos e as reexportam para o servidor.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("lint: zod fora do navegador", () => {
  it('arquivo "use client" não importa schema de src/lib/validation/forms/', () => {
    const offenders: string[] = [];
    for (const file of walk(path.join(process.cwd(), "src"))) {
      const code = readFileSync(file, "utf8");
      if (!/^\s*["']use client["'];?/m.test(code.slice(0, 200))) continue;
      const imports = code.matchAll(
        /^import\s+(type\s+)?[^;]*?from\s+["']@\/lib\/validation\/forms\/([^"']+)["']/gm,
      );
      for (const [, typeOnly, mod] of imports) {
        if (typeOnly) continue;
        if (mod === "state" || mod.endsWith("-options")) continue;
        offenders.push(`${path.relative(process.cwd(), file)} -> ${mod}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("os módulos *-options.ts não importam zod", () => {
    const dir = path.join(process.cwd(), "src/lib/validation/forms");
    const options = readdirSync(dir).filter((f) => f.endsWith("-options.ts"));
    expect(options.length).toBeGreaterThan(5);
    for (const file of options) {
      expect(readFileSync(path.join(dir, file), "utf8"), file).not.toMatch(/from ["']zod["']/);
    }
  });
});
