// Convenção obrigatória (AGENTS.md; scaffold.md, seção 6): toda página do CRM e toda Server Action
// chama requireSession(). A checagem no (app)/layout.tsx não basta: layouts não re-renderizam em
// navegação cliente e não impedem o segmento de rodar (Next 16, guides/authentication.md).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { glob } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const root = process.cwd();

async function listFiles(pattern: string): Promise<string[]> {
  const files: string[] = [];
  for await (const file of glob(pattern, { cwd: root })) files.push(file);
  return files.sort();
}

describe("autorização do CRM em cada página e Server Action", () => {
  it("toda src/app/(app)/**/page.tsx chama requireSession()", async () => {
    const pages = await listFiles("src/app/(app)/**/page.tsx");
    expect(pages.length).toBeGreaterThan(0);
    for (const file of pages) {
      const source = await readFile(path.join(root, file), "utf8");
      expect(source, `${file} não chama requireSession()`).toMatch(/await requireSession\(/);
    }
  });

  it("toda Server Action em src/actions/*.ts chama requireSession()", async () => {
    const actions = (await listFiles("src/actions/*.ts")).filter((f) => !f.endsWith(".test.ts"));
    for (const file of actions) {
      const source = await readFile(path.join(root, file), "utf8");
      expect(source, `${file} não chama requireSession()`).toMatch(/await requireSession\(/);
    }
  });
});
