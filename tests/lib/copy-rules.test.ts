// Regras de copy (docs/site/estrutura-e-copy.md): onde aparece "até 4%" (limite de cultura PJ)
// precisa aparecer a ressalva da LC 224/2025 (3,6%), nas páginas do site, nos e-mails e nas mensagens
// de WhatsApp do CRM.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function pages(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) pages(full, out);
    else if (entry === "page.tsx") out.push(full);
  }
  return out;
}

const FILES = [
  ...pages(path.join(process.cwd(), "src/app/(site)")),
  path.join(process.cwd(), "src/lib/crm/whatsapp-messages.ts"),
  path.join(process.cwd(), "src/lib/email/templates/index.ts"),
];

describe("copy: 4% sempre com a LC 224/2025", () => {
  it.each(FILES.map((f) => [path.relative(process.cwd(), f), f]))("%s", (_name, file) => {
    const text = readFileSync(file, "utf8");
    if (!/at[ée] 4%/i.test(text)) return;
    expect(text).toMatch(/3,6%/);
    expect(text).toMatch(/(LC|Lei Complementar) 224\/2025/);
  });

  it("nenhum texto proibido pela regra de copy", () => {
    for (const file of FILES) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/545 mil|5% usam|8% para PF/);
    }
  });
});
