// Decisão D13 (crm-design-system.md): a lista de itens da sidebar é um componente puro, renderizado
// com renderToString, sem biblioteca de teste de interface. Checa aria-current só no item ativo,
// os seis rótulos e o contador de "Hoje" com texto para leitores de tela.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { describePath, isActivePath } from "@/components/crm/shell/modules";
import { NAV_ITEMS, NavItems } from "@/components/crm/shell/nav-items";

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

const LABELS = ["Hoje", "Leads", "Organizações", "Projetos", "Aportes", "Exportar"];

describe("NavItems (sidebar do CRM)", () => {
  it('marca aria-current="page" só no item ativo', () => {
    const html = render();
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(activeTag(html)).toContain('href="/app/leads"');
  });

  it("mostra os seis rótulos na ordem", () => {
    const html = render();
    let last = -1;
    for (const label of LABELS) {
      const at = html.indexOf(`>${label}<`);
      expect(at, label).toBeGreaterThan(last);
      last = at;
    }
  });

  it('anuncia o contador de Hoje como "3 itens vencidos" e some quando é zero', () => {
    expect(render()).toContain("3 itens vencidos");
    expect(render({ overdueCount: 1 })).toContain("1 item vencido");
    expect(render({ overdueCount: 0 })).not.toMatch(/vencid/);
  });

  it("Hoje só acende em /app exato; um detalhe acende o módulo pai", () => {
    expect(activeTag(render({ activeHref: "/app" }))).toContain('href="/app"');
    const detail = render({ activeHref: "/app/leads/abc" });
    expect(detail.match(/aria-current="page"/g)).toHaveLength(1);
    expect(activeTag(detail)).toContain('href="/app/leads"');
  });

  it("recolhida: rótulos ficam sr-only e o contador continua anunciado", () => {
    const html = render({ collapsed: true });
    expect(html).toContain('class="truncate sr-only"');
    expect(html).toContain("3 itens vencidos");
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });
});

describe("mapa de módulos do shell", () => {
  it("isActivePath não acende prefixos soltos", () => {
    expect(isActivePath("/app/leads", "/app/leadsx")).toBe(false);
    expect(isActivePath("/app/leads", "/app/leads/novo")).toBe(true);
    expect(isActivePath("/app", "/app/leads", true)).toBe(false);
  });

  it("describePath devolve módulo e subpágina genérica", () => {
    expect(describePath("/app")).toMatchObject({ module: { label: "Hoje" }, sub: null });
    expect(describePath("/app/leads")).toMatchObject({ module: { label: "Leads" }, sub: null });
    expect(describePath("/app/leads/novo")).toMatchObject({
      module: { href: "/app/leads" },
      sub: "Novo lead",
    });
    expect(describePath("/app/projetos/123")).toMatchObject({
      module: { href: "/app/projetos" },
      sub: "Projeto",
    });
    expect(describePath("/app/conta")).toMatchObject({ module: { label: "Minha conta" } });
    expect(describePath("/app/busca")).toMatchObject({ module: { label: "Busca" } });
  });
});
