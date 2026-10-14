// Manifest do app instalável (src/app/manifest.ts, servido em /manifest.webmanifest): os ícones são
// os PNGs da marca de public/brand/ (docs/design/marca.md, seção 1) nas medidas declaradas, e as
// cores são os tokens do modo claro de src/app/globals.css, para doc, código e arquivos não divergirem.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { site } from "@/config/site";

const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

// Valor `#hex` de `--name` no primeiro bloco `:root { ... }`.
function rootToken(name: string): string {
  const block = css.match(/(?:^|\n):root\s*\{([^}]*)\}/)?.[1] ?? "";
  const value = block.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})\\s*;`, "i"))?.[1];
  if (!value) throw new Error(`token --${name} não encontrado em :root`);
  return value.toLowerCase();
}

describe("manifest", () => {
  const m = manifest();

  it("nomeia o app pela empresa, em português, e abre na raiz do site", () => {
    expect(m.name).toBe(site.name);
    expect(m.short_name).toBe(site.shortName);
    expect(m.lang).toBe("pt-BR");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
  });

  it("usa as cores dos tokens do modo claro: fundo --background e barra de título --brand-ink", () => {
    expect(m.background_color?.toLowerCase()).toBe(rootToken("background"));
    expect(m.theme_color?.toLowerCase()).toBe(rootToken("brand-ink"));
  });

  it("aponta para os PNGs da marca de 192 e 512 px, existentes e nas medidas declaradas", () => {
    const icons = m.icons ?? [];
    expect(icons.map((i) => i.sizes).sort()).toEqual(["192x192", "512x512"]);
    for (const icon of icons) {
      expect(icon.src).toMatch(/^\/brand\/marca-\d+\.png$/);
      expect(icon.type).toBe("image/png");
      const file = path.join(process.cwd(), "public", icon.src);
      expect(existsSync(file), `${icon.src} não existe em public/`).toBe(true);
      // Largura e altura do IHDR (bytes 16 a 23) batem com `sizes`.
      const png = readFileSync(file);
      const [width, height] = icon.sizes!.split("x").map(Number);
      expect(png.readUInt32BE(16)).toBe(width);
      expect(png.readUInt32BE(20)).toBe(height);
    }
  });
});
