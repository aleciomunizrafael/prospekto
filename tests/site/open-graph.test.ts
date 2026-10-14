// Imagem Open Graph do site (src/app/opengraph-image.png, 1200 × 630, convenção de arquivo do Next;
// docs/design/marca.md, seção 2) e o que o layout raiz (src/app/layout.tsx) declara sobre ela: o
// cartão do X precisa ser "summary_large_image", porque "summary" recorta um quadrado central e
// corta o "PR" e a marca do logo horizontal; e o Next só emite og:image:alt (e, por fallback da
// imagem, twitter:image:alt) a partir de opengraph-image.alt.txt, lido bruto, ao lado da imagem.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { metadata } from "@/app/layout";
import { site } from "@/config/site";

// next/font/google só existe no build do Next (o módulo publicado é vazio); o layout usa só o nome
// das variáveis CSS.
vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-inter" }),
  Source_Serif_4: () => ({ variable: "--font-source-serif" }),
}));

const appDir = path.resolve(import.meta.dirname, "../../src/app");
const files = readdirSync(appDir);

describe("imagem Open Graph", () => {
  it("é 1200 × 630 (IHDR) e o cartão do X é summary_large_image, o tipo para essa proporção", () => {
    const png = readFileSync(path.join(appDir, "opengraph-image.png"));
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    expect(metadata.twitter).toEqual({ card: "summary_large_image" });
  });

  it("tem texto alternativo ao lado, com o nome da empresa, numa linha e sem quebra final", () => {
    expect(files).toContain("opengraph-image.alt.txt");
    // O loader do Next lê o arquivo bruto: uma quebra final viraria parte do alt.
    expect(readFileSync(path.join(appDir, "opengraph-image.alt.txt"), "utf8")).toBe(site.name);
  });

  it("vale também para o X por fallback: sem twitter-image.* nem images declaradas no layout", () => {
    // Uma twitter-image.png sem twitter-image.alt.txt deixaria o cartão do X sem alt de novo.
    expect(files.filter((f) => f.startsWith("twitter-image."))).toEqual([]);
    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(metadata.twitter).not.toHaveProperty("images");
  });
});
