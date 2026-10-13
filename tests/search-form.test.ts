// SearchForm (src/components/crm/shell/search-form.tsx) renderizado com renderToString, como o
// servidor faz (decisão D13; D18): formulário GET para /app/busca com `role="search"` e campo
// `name="q"`, que o atalho "/" foca. O placeholder nomeia os grupos conforme o ADR-004 (6.1):
// "organizações", não "empresas", que hoje sugere a prospecção. A paleta Ctrl+K usa o mesmo texto;
// o header, cujo campo de 280 px cortaria o texto completo, usa a variante curta com as mesmas
// palavras.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  SEARCH_PLACEHOLDER,
  SEARCH_PLACEHOLDER_SHORT,
  SearchForm,
} from "@/components/crm/shell/search-form";

const SHELL_DIR = path.resolve(import.meta.dirname, "../src/components/crm/shell");

describe("SearchForm (busca global do header e de /app/busca)", () => {
  it("mantém o formulário GET para /app/busca com role=search e o campo q", () => {
    const html = renderToString(createElement(SearchForm));
    expect(html).toContain('role="search"');
    expect(html).toContain('method="get"');
    expect(html).toContain('action="/app/busca"');
    expect(html).toContain('name="q"');
    expect(html).toContain('type="search"');
    expect(html).toContain('id="busca-global"');
  });

  it("usa por padrão o placeholder da paleta, que fala em organizações", () => {
    const html = renderToString(createElement(SearchForm));
    expect(SEARCH_PLACEHOLDER).toBe("Buscar leads, organizações, projetos…");
    expect(html).toContain(`placeholder="${SEARCH_PLACEHOLDER}"`);
    expect(html).not.toContain("empresas");
  });

  it("aceita placeholder e valor inicial próprios", () => {
    const html = renderToString(
      createElement(SearchForm, {
        id: "busca-pagina",
        defaultValue: "acme",
        placeholder: SEARCH_PLACEHOLDER_SHORT,
      }),
    );
    expect(html).toContain('id="busca-pagina"');
    expect(html).toContain('value="acme"');
    expect(html).toContain('placeholder="Buscar leads, organizações…"');
  });

  it("a variante curta do header tem as mesmas palavras e termina em reticências", () => {
    expect(SEARCH_PLACEHOLDER_SHORT).toBe("Buscar leads, organizações…");
    expect(SEARCH_PLACEHOLDER.startsWith(SEARCH_PLACEHOLDER_SHORT.slice(0, -1))).toBe(true);
    expect(SEARCH_PLACEHOLDER_SHORT.length).toBeLessThan(SEARCH_PLACEHOLDER.length);
  });

  it("a paleta Ctrl+K e o header reutilizam as constantes, sem texto próprio", async () => {
    const palette = await readFile(path.join(SHELL_DIR, "command-palette.tsx"), "utf8");
    expect(palette).toContain("placeholder={SEARCH_PLACEHOLDER}");
    expect(palette).not.toMatch(/placeholder="Buscar/);
    const header = await readFile(path.join(SHELL_DIR, "header.tsx"), "utf8");
    expect(header).toContain("placeholder={SEARCH_PLACEHOLDER_SHORT}");
    expect(header).not.toMatch(/placeholder="Buscar/);
  });
});
