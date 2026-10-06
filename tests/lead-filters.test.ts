// Frente B (crm-redesign-plano.md): os links das abas, dos chips e da paginação de Leads
// continuam saindo de leadFiltersToQuery, com as mesmas URLs de antes do redesign. Render puro
// com renderToString, como em tests/shell-nav.test.ts (decisão D13).
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LeadToolbar, Pagination, PipelineTabs } from "@/components/crm/lead-filters";
import { leadFiltersToQuery, parseLeadFilters, type LeadFilters } from "@/lib/crm/filters";

const counts = { patrocinadores: 8, contadores: 3, municipios: 2, projetos: 1, alunos: 2 };
const users = [{ id: "u1", name: "Rafael Teste" }];

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
}

describe("links da lista de Leads", () => {
  it("abas de pipeline apontam para ?pipeline=<p> (e só isso)", () => {
    const html = renderToString(createElement(PipelineTabs, { current: "patrocinadores", counts }));
    expect(hrefs(html)).toEqual([
      "/app/leads?pipeline=patrocinadores",
      "/app/leads?pipeline=contadores",
      "/app/leads?pipeline=municipios",
      "/app/leads?pipeline=projetos",
      "/app/leads?pipeline=alunos",
    ]);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("paginação preserva os filtros e troca só a página, com rel prev/next", () => {
    const filters: LeadFilters = parseLeadFilters({
      pipeline: "contadores",
      stage: "contato",
      q: "vale",
      sort: "created",
      lost: "1",
      page: "2",
    });
    const html = renderToString(
      createElement(Pagination, { filters, total: 60, pageSize: 25 }),
    ).replace(/<!-- -->/g, "");
    expect(html).toContain("26–50 de 60");
    const prev = html.match(/<a [^>]*rel="prev"[^>]*>/)?.[0] ?? "";
    const next = html.match(/<a [^>]*rel="next"[^>]*>/)?.[0] ?? "";
    expect(hrefs(prev)).toEqual([`/app/leads${leadFiltersToQuery({ ...filters, page: 1 })}`]);
    expect(hrefs(next)).toEqual([`/app/leads${leadFiltersToQuery({ ...filters, page: 3 })}`]);
    expect(next).toContain("page=3");
    expect(next).toContain("pipeline=contadores");
    expect(next).toContain("stage=contato");
    expect(next).toContain("q=vale");
    expect(next).toContain("sort=created");
    expect(next).toContain("lost=1");
  });

  it("chips de temperatura e perdidos removem só o próprio filtro; Limpar mantém o pipeline", () => {
    const filters = parseLeadFilters({
      pipeline: "patrocinadores",
      temperature: "quente",
      lost: "1",
      owner: "u1",
    });
    const html = renderToString(createElement(LeadToolbar, { filters, users }));
    const links = hrefs(html);
    expect(links).toContain(
      `/app/leads${leadFiltersToQuery({ ...filters, temperature: undefined })}`,
    );
    expect(links).toContain(`/app/leads${leadFiltersToQuery({ ...filters, includeLost: false })}`);
    expect(links).toContain("/app/leads?pipeline=patrocinadores");
    // Contagem do botão do celular: dono + temperatura + perdidos; pipeline e sort não contam.
    expect(html).toContain("Filtrar (3)");
    // Nenhum select mostra "não informado".
    expect(html).not.toContain("não informado");
  });
});
