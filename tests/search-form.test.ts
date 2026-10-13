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
import { MODULES } from "@/components/crm/shell/modules";
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

// A página /app/busca (ADR-004, 6.7) liga cada grupo à lista do módulo com o mesmo `q`. O rótulo
// "ver todos em X" nomeia o módulo de destino (Pipeline, Organizações, Projetos), não o tipo de
// registro: `/app/leads` chama-se "Pipeline" desde a seção 6.1, e "ver todos em Leads" era o
// rótulo antigo. Checado no fonte porque a página é um Server Component com sessão e banco.
describe("Página /app/busca: links 'ver todos' nomeiam o módulo de destino", () => {
  const PAGE = path.resolve(import.meta.dirname, "../src/app/(app)/app/busca/page.tsx");
  const LINK = /allHref=\{`(\/app\/[a-z-]+)\$\{query\}`\}\s*allLabel="ver tod[oa]s em ([^"]+)"/g;

  it("cada allLabel usa o rótulo do módulo cujo href é o allHref", async () => {
    const source = await readFile(PAGE, "utf8");
    const links = [...source.matchAll(LINK)].map(([, href, label]) => ({ href, label }));
    expect(links.length).toBeGreaterThanOrEqual(3);
    for (const { href, label } of links) {
      const mod = Object.values(MODULES).find((m) => m.href === href);
      expect(mod, `módulo com href ${href}`).toBeDefined();
      expect(label).toBe(mod?.label);
    }
  });

  it("não chama mais a lista de /app/leads de 'Leads'", async () => {
    const source = await readFile(PAGE, "utf8");
    expect(source).toContain('allLabel="ver todos em Pipeline"');
    expect(source).not.toContain("em Leads");
  });
});
