// Porta de lançamento: os marcadores "[verificar ...]" seguem docs/site/estrutura-e-copy.md (o que
// não foi confirmado fica marcado) e são aceitos até o lançamento. Com LAUNCH_GATE=1 o teste lista
// as ocorrências e falha, para o commit de lançamento não publicá-las. Independentemente da porta,
// campos que seriam puro placeholder (CNPJ, endereço, redes sociais) ficam null em site.ts e o
// resultado do simulador não leva o marcador colado ao valor em reais (a ressalva está na nota da
// LC 224 em src/lib/simulator/texts.ts).
import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { site } from "@/config/site";

const root = process.cwd();
const SCAN = [
  "src/app/(site)/**/*.{ts,tsx}",
  "src/components/site/**/*.{ts,tsx}",
  "src/components/simulator/**/*.{ts,tsx}",
  "src/lib/simulator/texts.ts",
  "src/config/site.ts",
];

async function findMarkers(): Promise<string[]> {
  const found: string[] = [];
  for (const pattern of SCAN) {
    for await (const file of glob(pattern, { cwd: root })) {
      if (file.endsWith(".test.ts")) continue;
      const lines = (await readFile(path.join(root, file), "utf8")).split("\n");
      lines.forEach((line, i) => {
        if (line.includes("[verificar")) found.push(`${file}:${i + 1}`);
      });
    }
  }
  return found.sort();
}

describe("porta de lançamento: marcadores [verificar]", () => {
  it("campos de placeholder ficam null até confirmação (não renderizam o marcador)", () => {
    for (const value of [
      site.legal.cnpj,
      site.legal.address,
      site.social.linkedin,
      site.social.instagram,
    ]) {
      expect(value === null || !value.includes("[verificar")).toBe(true);
    }
  });

  it("o resultado do simulador não traz [verificar] junto ao valor em reais", async () => {
    const source = await readFile(
      path.join(root, "src/components/simulator/view-model.ts"),
      "utf8",
    );
    expect(source).not.toContain("[verificar");
  });

  it("com LAUNCH_GATE=1 não sobra marcador no site nem no simulador", async () => {
    const markers = await findMarkers();
    if (process.env.LAUNCH_GATE === "1") {
      expect(markers, `pendências de confirmação:\n${markers.join("\n")}`).toEqual([]);
    } else {
      // Fora da porta só registra: a lista é a pauta de confirmação com a Daniela (seção 11).
      expect(Array.isArray(markers)).toBe(true);
    }
  });
});
