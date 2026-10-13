// PaletteResults (src/components/crm/shell/palette-results.tsx) renderizado com renderToString,
// como o servidor faz (decisão D13; ADR-004, 6.7): a lista é um `role="listbox"` em que cada item
// é um `<a role="option" href>` real com o chip do tipo; a consulta vazia lista "Ir para" (os
// módulos) e "Novo…"; `aria-selected` só no item ativo; o rodapé leva a /app/busca?q=.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SearchGroups } from "@/actions/search";
import {
  PALETTE_ERROR,
  PALETTE_HINT,
  PALETTE_NAVIGATION,
  PaletteResults,
  paletteOptionId,
  paletteOptions,
} from "@/components/crm/shell/palette-results";

const MODULE_LABELS = [
  "Painel",
  "Pipeline",
  "Prospecção",
  "Organizações",
  "Projetos",
  "Aportes",
  "Tarefas",
  "Exportar",
];
const NEW_LABELS = [
  "Novo lead",
  "Nova organização",
  "Novo projeto",
  "Novo aporte",
  "Nova tarefa",
  "Nova lista de prospecção",
];

const LEAD_ID = "00000000-0000-4000-8000-000000000001";
const ORG_ID = "00000000-0000-4000-8000-000000000002";
const ITEM_ID = "00000000-0000-4000-8000-000000000003";
const LIST_ID = "00000000-0000-4000-8000-000000000004";

const groups: SearchGroups = [
  {
    kind: "lead",
    label: "Leads",
    items: [
      {
        id: LEAD_ID,
        kind: "lead",
        title: "Rodrigo Fictício",
        meta: "Vinícola Exemplo · Diagnóstico",
        href: `/app/leads/${LEAD_ID}`,
      },
    ],
  },
  {
    kind: "organizacao",
    label: "Organizações",
    items: [
      {
        id: ORG_ID,
        kind: "organizacao",
        title: "Vinícola Exemplo",
        meta: "Empresa · Bento Gonçalves/RS",
        href: `/app/organizacoes/${ORG_ID}`,
      },
    ],
  },
  {
    kind: "prospeccao",
    label: "Prospecção",
    items: [
      {
        id: ITEM_ID,
        kind: "prospeccao",
        title: "Vinícola Prospectada",
        meta: "Vinícolas do Vale · A ligar",
        href: `/app/prospeccao/${LIST_ID}/${ITEM_ID}`,
      },
    ],
  },
];

type Props = Parameters<typeof PaletteResults>[0];

function render(props: Partial<Props> = {}) {
  return renderToString(
    createElement(PaletteResults, {
      query: "",
      groups: [],
      activeId: null,
      status: "idle",
      ...props,
    }),
  );
}

const options = (html: string) => html.match(/<a [^>]*role="option"[^>]*>/g) ?? [];
const text = (html: string) => html.replace(/<[^>]+>/g, " ");

describe("PaletteResults: consulta vazia", () => {
  it('lista "Ir para" com os oito módulos (e Minha conta) e "Novo…" com os seis itens, na ordem', () => {
    const html = render();
    expect(html).toContain('role="listbox"');
    let last = html.indexOf(">Ir para<");
    expect(last).toBeGreaterThan(-1);
    for (const label of [...MODULE_LABELS, "Minha conta"]) {
      const at = html.indexOf(`>${label}<`);
      expect(at, label).toBeGreaterThan(last);
      last = at;
    }
    const novo = html.indexOf(">Novo…<");
    expect(novo).toBeGreaterThan(last);
    last = novo;
    for (const label of NEW_LABELS) {
      const at = html.indexOf(`>${label}<`);
      expect(at, label).toBeGreaterThan(last);
      last = at;
    }
    expect(options(html)).toHaveLength(9 + 6);
    expect(html).toContain(PALETTE_HINT);
    expect(html).not.toContain("ver todos os resultados");
  });

  it("os links são reais e o id de cada opção é o de paletteOptions", () => {
    const html = render();
    const ids = paletteOptions("", []).map((o) => o.id);
    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(15);
    for (const option of options(html)) {
      const id = option.match(/ id="([^"]+)"/)?.[1];
      expect(ids).toContain(id);
      expect(option).toMatch(/href="\/app/);
    }
    expect(paletteOptions("", []).map((o) => o.href)).toEqual([
      "/app",
      "/app/leads",
      "/app/prospeccao",
      "/app/organizacoes",
      "/app/projetos",
      "/app/aportes",
      "/app/tarefas",
      "/app/exportar",
      "/app/conta",
      "/app/leads/novo",
      "/app/organizacoes?novo=1",
      "/app/projetos/novo",
      "/app/aportes?novo=1",
      "/app/tarefas?novo=1",
      "/app/prospeccao?nova=1",
    ]);
  });

  it("aria-selected só no item ativo", () => {
    const active = PALETTE_NAVIGATION.goTo[2].id;
    const html = render({ activeId: active });
    const selected = options(html).filter((o) => o.includes('aria-selected="true"'));
    expect(selected).toHaveLength(1);
    expect(selected[0]).toContain(`id="${active}"`);
    expect(selected[0]).toContain('href="/app/prospeccao"');
    expect(html).not.toContain('aria-selected="false"');
  });

  it("um caractere ainda é consulta vazia", () => {
    expect(paletteOptions("r", groups)).toHaveLength(15);
    expect(render({ query: "r", groups, status: "ready" })).toContain(PALETTE_HINT);
  });
});

describe("PaletteResults: com resultados", () => {
  it("cada item é um <a role=option href> com o chip do tipo e a meta", () => {
    const html = render({ query: "vi", groups, status: "ready" });
    const opts = options(html);
    expect(opts).toHaveLength(3);
    expect(opts[0]).toContain(`href="/app/leads/${LEAD_ID}"`);
    expect(opts[1]).toContain(`href="/app/organizacoes/${ORG_ID}"`);
    expect(opts[2]).toContain(`href="/app/prospeccao/${LIST_ID}/${ITEM_ID}"`);
    for (const label of ["Lead", "Organização", "Prospecção"]) {
      expect(html).toMatch(new RegExp(`data-slot="badge"[^>]*>${label}<`));
    }
    expect(html).toContain("Vinícola Exemplo · Diagnóstico");
    expect(html).toContain(">Leads<");
    expect(html).toContain(">Organizações<");
    // Nenhuma chave de enum no texto (P20): o chip usa o rótulo.
    const body = text(html);
    expect(body).not.toMatch(/\borganizacao\b|\bprospeccao\b/);
    expect(html).not.toContain(">Ir para<");
  });

  it("aria-selected só no ativo e os ids batem com paletteOptions", () => {
    const flat = paletteOptions("vi", groups);
    expect(flat.map((o) => o.href)).toEqual([
      `/app/leads/${LEAD_ID}`,
      `/app/organizacoes/${ORG_ID}`,
      `/app/prospeccao/${LIST_ID}/${ITEM_ID}`,
    ]);
    expect(flat[1].id).toBe(paletteOptionId(`organizacao-${ORG_ID}`));
    const html = render({ query: "vi", groups, status: "ready", activeId: flat[1].id });
    const selected = options(html).filter((o) => o.includes('aria-selected="true"'));
    expect(selected).toHaveLength(1);
    expect(selected[0]).toContain(`id="${flat[1].id}"`);
    expect(selected[0]).toContain('data-active="true"');
  });

  it('o rodapé "ver todos os resultados" aponta para /app/busca?q=', () => {
    const html = render({ query: "ro", groups, status: "ready" });
    expect(html).toMatch(
      /<a [^>]*href="\/app\/busca\?q=ro"[^>]*>ver todos os resultados em Busca ›<\/a>/,
    );
    expect(render({ query: "vinícola exemplo", groups, status: "ready" })).toContain(
      'href="/app/busca?q=vin%C3%ADcola%20exemplo"',
    );
  });
});

describe("PaletteResults: vazio, carregando e erro", () => {
  it("sem resultados mostra a frase do ADR com o termo", () => {
    const html = render({ query: "vinícola", groups: [], status: "ready" });
    expect(text(html)).toContain(
      "Nada encontrado para &quot;vinícola&quot;. Tente parte do nome ou o CNPJ.",
    );
    expect(options(html)).toHaveLength(0);
    expect(html).toContain('role="listbox"');
    expect(html).not.toContain("ver todos os resultados");
  });

  it("carregando sem resultado anterior diz Buscando…", () => {
    const html = render({ query: "vi", groups: [], status: "loading" });
    expect(html).toContain("Buscando…");
    expect(html).not.toContain("Nada encontrado");
  });

  it("erro mostra a mensagem sem resultados", () => {
    const html = render({ query: "vi", groups, status: "error" });
    expect(html).toContain(PALETTE_ERROR);
    expect(options(html)).toHaveLength(0);
  });
});
