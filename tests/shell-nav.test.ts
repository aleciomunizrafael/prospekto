// Decisão D13 (crm-design-system.md): a lista de itens da sidebar é um componente puro, renderizado
// com renderToString, sem biblioteca de teste de interface. Checa aria-current só no item ativo,
// os oito rótulos na ordem do ADR-004 (6.1), a moldura do item ativo e o contador do "Painel" com
// texto para leitores de tela.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MODULES, describePath, isActivePath } from "@/components/crm/shell/modules";
import { NAV_ITEMS, NavItems } from "@/components/crm/shell/nav-items";
import { NEW_ITEMS } from "@/components/crm/shell/new-menu";

// Só a tag <a> que carrega aria-current (a ordem dos atributos é a do React).
function activeTag(html: string): string {
  return html.match(/<a [^>]*aria-current="page"[^>]*>/)?.[0] ?? "";
}

function render(props: Partial<Parameters<typeof NavItems>[0]> = {}) {
  return renderToString(
    createElement(NavItems, {
      items: NAV_ITEMS,
      activeHref: "/app/leads",
      collapsed: false,
      overdueCount: 3,
      ...props,
    }),
  );
}

const LABELS = [
  "Painel",
  "Pipeline",
  "Prospecção",
  "Organizações",
  "Projetos",
  "Aportes",
  "Tarefas",
  "Exportar",
];

describe("NavItems (sidebar do CRM)", () => {
  it('marca aria-current="page" só no item ativo, com a moldura', () => {
    const html = render();
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(activeTag(html)).toContain('href="/app/leads"');
    expect(activeTag(html)).toContain("ring-1");
    expect(html.match(/ring-1 ring-border/g)).toHaveLength(1);
  });

  it("mostra os oito rótulos na ordem do ADR-004, com separador antes de Exportar", () => {
    const html = render();
    let last = -1;
    for (const label of LABELS) {
      const at = html.indexOf(`>${label}<`);
      expect(at, label).toBeGreaterThan(last);
      last = at;
    }
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(LABELS);
    expect(NAV_ITEMS.filter((i) => i.separatorBefore).map((i) => i.label)).toEqual(["Exportar"]);
    expect(html).not.toContain("Hoje");
    expect(html).not.toContain(">Leads<");
  });

  it('anuncia o contador do Painel como "3 itens vencidos" e some quando é zero', () => {
    const html = render();
    expect(html).toContain("3 itens vencidos");
    // O contador fica no Painel (href="/app"), não em outro item.
    const painel = html.match(/<a [^>]*href="\/app"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? "";
    expect(painel).toContain("3 itens vencidos");
    expect(render({ overdueCount: 1 })).toContain("1 item vencido");
    expect(render({ overdueCount: 0 })).not.toMatch(/vencid/);
  });

  it("Painel só acende em /app exato; um detalhe acende o módulo pai", () => {
    expect(activeTag(render({ activeHref: "/app" }))).toContain('href="/app"');
    const detail = render({ activeHref: "/app/leads/abc" });
    expect(detail.match(/aria-current="page"/g)).toHaveLength(1);
    expect(activeTag(detail)).toContain('href="/app/leads"');
    const item = render({ activeHref: "/app/prospeccao/lista/item" });
    expect(activeTag(item)).toContain('href="/app/prospeccao"');
    expect(activeTag(render({ activeHref: "/app/tarefas" }))).toContain('href="/app/tarefas"');
  });

  it("recolhida: rótulos ficam sr-only e o contador continua anunciado", () => {
    const html = render({ collapsed: true });
    expect(html).toContain('class="truncate sr-only"');
    expect(html).toContain("3 itens vencidos");
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it('a sidebar não diz mais "Hoje" nem "Leads" como rótulo', async () => {
    const source = await readFile(
      path.join(process.cwd(), "src/components/crm/shell/sidebar.tsx"),
      "utf8",
    );
    expect(source).not.toContain("Hoje");
    expect(source).toContain("ir para o Painel");
    expect(Object.values(MODULES).map((m) => m.label)).not.toContain("Hoje");
    expect(Object.values(MODULES).map((m) => m.label)).not.toContain("Leads");
  });
});

describe('"Novo ▾" do header', () => {
  it("ganha Nova tarefa e Nova lista de prospecção depois de Novo aporte", () => {
    expect(NEW_ITEMS.map((i) => i.label)).toEqual([
      "Novo lead",
      "Nova organização",
      "Novo projeto",
      "Novo aporte",
      "Nova tarefa",
      "Nova lista de prospecção",
    ]);
    expect(NEW_ITEMS.map((i) => i.href)).toContain("/app/tarefas?novo=1");
    expect(NEW_ITEMS.map((i) => i.href)).toContain("/app/prospeccao?nova=1");
  });
});

describe("mapa de módulos do shell", () => {
  it("isActivePath não acende prefixos soltos", () => {
    expect(isActivePath("/app/leads", "/app/leadsx")).toBe(false);
    expect(isActivePath("/app/leads", "/app/leads/novo")).toBe(true);
    expect(isActivePath("/app", "/app/leads", true)).toBe(false);
  });

  it("describePath devolve módulo e subpágina genérica", () => {
    expect(describePath("/app")).toMatchObject({ module: { label: "Painel" }, sub: null });
    expect(describePath("/app/leads")).toMatchObject({ module: { label: "Pipeline" }, sub: null });
    expect(describePath("/app/leads/novo")).toMatchObject({
      module: { href: "/app/leads" },
      sub: "Novo lead",
    });
    expect(describePath("/app/leads/abc")).toMatchObject({
      module: { label: "Pipeline" },
      sub: "Lead",
    });
    expect(describePath("/app/projetos/123")).toMatchObject({
      module: { href: "/app/projetos" },
      sub: "Projeto",
    });
    expect(describePath("/app/prospeccao")).toMatchObject({
      module: { label: "Prospecção" },
      sub: null,
    });
    expect(describePath("/app/prospeccao/abc")).toMatchObject({
      module: { label: "Prospecção" },
      sub: "Lista",
    });
    expect(describePath("/app/prospeccao/abc/def")).toMatchObject({
      module: { label: "Prospecção" },
      sub: "Empresa",
      // A empresa volta para a lista, não para o módulo (nota da frente E).
      parent: { href: "/app/prospeccao/abc", label: "Lista" },
    });
    expect(describePath("/app/prospeccao/abc").parent).toMatchObject({ href: "/app/prospeccao" });
    expect(describePath("/app/leads/abc").parent).toMatchObject({ href: "/app/leads" });
    expect(describePath("/app/tarefas")).toMatchObject({ module: { label: "Tarefas" }, sub: null });
    expect(describePath("/app/conta")).toMatchObject({ module: { label: "Minha conta" } });
    expect(describePath("/app/busca")).toMatchObject({ module: { label: "Busca" } });
  });
});
