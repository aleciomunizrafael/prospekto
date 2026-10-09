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

// Alvos de toque nos cartões de IA (crm-design-system.md, seção 9: ≥ 44 px no celular). Todo
// <Button> em src/components/crm/ai/ leva `size="touch"` ou `h-11` (com `md:h-*` para o tamanho
// de mesa); a altura real é medida pela sonda em 390 px, este teste só barra a regressão estática.
describe("lint: alvos de 44 px nos cartões de IA", () => {
  // Tags <Button …> de um .tsx: `>` dentro de chaves (onClick={() => …}, render={<a />}) não
  // encerra a tag.
  function buttonTags(source: string): string[] {
    const tags: string[] = [];
    const re = /<Button\b/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(source))) {
      let depth = 0;
      let i = match.index + match[0].length;
      for (; i < source.length; i += 1) {
        const ch = source[i];
        if (ch === "{") depth += 1;
        else if (ch === "}") depth -= 1;
        else if (ch === ">" && depth === 0) break;
      }
      tags.push(source.slice(match.index, i + 1));
    }
    return tags;
  }

  it("brief-card, reply-card e dictation não deixam botão de 28/32 px sem alvo de toque", () => {
    const dir = path.join(process.cwd(), "src/components/crm/ai");
    const offenders: string[] = [];
    let total = 0;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
      for (const tag of buttonTags(readFileSync(path.join(dir, file), "utf8"))) {
        total += 1;
        if (!/size="touch"|h-11/.test(tag)) offenders.push(`${file}: ${tag.replace(/\s+/g, " ")}`);
      }
    }
    expect(total).toBeGreaterThan(8);
    expect(offenders).toEqual([]);
  });
});
