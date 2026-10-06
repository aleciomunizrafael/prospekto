// Decisão D13 (crm-design-system.md, seção 3.1): os tokens do CRM em src/app/globals.css têm o
// contraste que a tabela promete, calculado pela luminância relativa do WCAG 2.x. Texto ≥ 4,5:1;
// borda de campo (`--input` dentro de [data-crm]) ≥ 3:1 sobre branco e sobre o canvas areia.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

// Variáveis `--x: #hex` de um bloco `seletor { ... }`; o primeiro bloco com esse seletor.
function tokensOf(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blocks = css.matchAll(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, "g"));
  for (const [, body] of blocks) {
    for (const [, name, value] of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
      out[name] = value.toLowerCase();
    }
  }
  return out;
}

const light = tokensOf(":root");
const crm = tokensOf("[data-crm]");

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Pares de texto da tabela 3.1: [texto, fundo, contraste anunciado].
const TEXT_PAIRS: [string, string, number][] = [
  ["foreground", "canvas", 13.0],
  ["muted-foreground", "surface-2", 5.44],
  ["foreground", "background", 14.66],
  ["muted-foreground", "background", 5.87],
  ["muted-foreground", "canvas", 5.2],
  ["placeholder", "background", 4.64],
  ["primary", "background", 11.58],
  ["primary-foreground", "primary", 11.58],
  ["primary", "primary-soft", 9.87],
  ["brand", "background", 10.0],
  ["brand", "canvas", 8.87],
  ["brand", "brand-soft", 8.31],
  ["success", "background", 6.39],
  ["success", "canvas", 5.67],
  ["success", "success-soft", 5.49],
  ["warning", "background", 7.48],
  ["warning", "canvas", 6.64],
  ["warning", "warning-soft", 6.62],
  ["destructive", "background", 7.07],
  ["destructive", "canvas", 6.27],
  ["error", "error-soft", 5.95],
];

describe("tokens do CRM: contraste (WCAG 2.x)", () => {
  it("os tokens novos existem em :root", () => {
    for (const name of [
      "canvas",
      "surface-2",
      "divider",
      "placeholder",
      "primary-soft",
      "brand-soft",
      "success-soft",
      "warning",
      "warning-soft",
      "error-soft",
    ]) {
      expect(light[name], `--${name}`).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(light.background).toBe("#ffffff");
    expect(light.canvas).toBe("#f4f1eb");
  });

  it("valores do site não mudaram", () => {
    expect(light.foreground).toBe("#1e2a32");
    expect(light.primary).toBe("#163b5c");
    expect(light.brand).toBe("#7a2230");
    expect(light.success).toBe("#2f6b3a");
    expect(light.destructive).toBe("#a32d2d");
    expect(light["muted-foreground"]).toBe("#5b6670");
    expect(light.border).toBe("#d9d6cf");
  });

  it("cobre pelo menos 18 pares de texto", () => {
    expect(TEXT_PAIRS.length).toBeGreaterThanOrEqual(18);
  });

  it.each(TEXT_PAIRS)("%s sobre %s ≥ 4,5:1 (tabela: %s)", (fg, bg, expected) => {
    expect(light[fg], `--${fg}`).toBeDefined();
    expect(light[bg], `--${bg}`).toBeDefined();
    const ratio = contrastRatio(light[fg], light[bg]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeCloseTo(expected, 1);
  });

  it("--input do CRM tem ≥ 3:1 sobre branco e sobre o canvas (decisão D8)", () => {
    expect(crm.input).toBe("#8f8a80");
    expect(contrastRatio(crm.input, "#ffffff")).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(crm.input, "#f4f1eb")).toBeGreaterThanOrEqual(3);
    // O --input do site continua decorativo e não entra no escopo do CRM.
    expect(light.input).toBe("#d9d6cf");
  });

  it("bloco do CRM está presente (variante scripting, classes crm-*, row-link)", () => {
    expect(css).toMatch(/@custom-variant scripting \(@media \(scripting: enabled\)\);/);
    for (const cls of [
      ".crm-h1",
      ".crm-h2",
      ".crm-kpi",
      ".crm-eyebrow",
      ".crm-meta",
      ".crm-code",
    ]) {
      expect(css).toContain(cls);
    }
    expect(css).toContain("[data-crm] .row-link::after");
    expect(css).toContain("--color-surface-2: var(--surface-2);");
  });
});
