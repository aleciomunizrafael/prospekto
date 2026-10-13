// Quadro de leads (ADR-004, 6.3; plano, frente A) renderizado com renderToString, como o
// servidor faz (decisão D13): uma coluna por estágio com rótulo em português e contagem, cartão
// com link real, botão "Mover … para", valor em R$, `draggable="false"` nos links, colunas
// bloqueadas durante o arrasto, zona "Marcar perdido" só com arrasto, nenhuma chave de enum no
// texto visível (P20) e a alternância com `aria-current` só no ativo (P19).
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  LeadBoardColumns,
  type LeadBoardColumnsProps,
} from "@/components/crm/leads/lead-board-columns";
import { stagePropsFor } from "@/components/crm/leads/lead-board-dialogs";
import { ViewToggle } from "@/components/crm/leads/view-toggle";
import { parseLeadFilters } from "@/lib/crm/filters";
import { STAGES } from "@/lib/domain/pipelines";
import type { LeadBoardColumn, LeadBoardRow } from "@/lib/repos/leads";

vi.mock("@/actions/crm-leads", () => ({
  claimLeadAction: async () => undefined,
  moveLeadStageAction: async () => ({ status: "idle" }),
}));
vi.mock("sonner", () => ({ toast: { success: () => undefined, info: () => undefined } }));

const now = new Date("2026-10-13T12:00:00Z");
const noop = () => undefined;

function row(overrides: Partial<LeadBoardRow> & { id: string; name: string }): LeadBoardRow {
  return {
    tenantId: "t1",
    segment: "PJ",
    pipeline: "patrocinadores",
    stage: "novo",
    stageEnteredAt: new Date("2026-10-10T12:00:00Z"),
    interest: "rouanet",
    email: "fulano@example.test",
    phone: null,
    city: null,
    uf: null,
    message: null,
    source: "site",
    sourceDetail: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    referrer: null,
    landingPath: null,
    guideVersion: null,
    projectInterestId: null,
    projectId: null,
    orgId: null,
    contactId: null,
    referredByOrgId: null,
    ownerUserId: null,
    score: 10,
    temperature: "morno",
    tags: [],
    attributes: { empresa: "Vinícola Fictícia" },
    emailStatus: "ok",
    nextActionAt: null,
    lastContactAt: null,
    lostReason: null,
    lostReasonDetail: null,
    createdAt: new Date("2026-10-10T12:00:00Z"),
    updatedAt: new Date("2026-10-10T12:00:00Z"),
    orgName: null,
    ownerName: null,
    orgCnpj: null,
    openContributionProjectId: null,
    openContributionAmount: null,
    ...overrides,
  } as LeadBoardRow;
}

const LEAD_A = "00000000-0000-4000-8000-00000000000a";
const LEAD_B = "00000000-0000-4000-8000-00000000000b";
const PROJECT = "00000000-0000-4000-8000-0000000000cc";

function columns(): LeadBoardColumn[] {
  return STAGES.patrocinadores
    .filter((s) => s !== "perdido")
    .map((stage) => ({
      stage,
      total: stage === "novo" ? 73 : stage === "qualificado" ? 1 : 0,
      openAmount: stage === "qualificado" ? 350_000 : 0,
      rows:
        stage === "novo"
          ? [row({ id: LEAD_A, name: "Rodrigo Fictício" })]
          : stage === "qualificado"
            ? [
                row({
                  id: LEAD_B,
                  name: "Beatriz Fictícia",
                  stage: "qualificado",
                  ownerUserId: "u1",
                  ownerName: "Daniela Teste",
                  openContributionProjectId: PROJECT,
                  openContributionAmount: 100_000,
                }),
              ]
            : [],
    }));
}

function render(props: Partial<LeadBoardColumnsProps> = {}): string {
  return renderToString(
    createElement(LeadBoardColumns, {
      pipeline: "patrocinadores",
      columns: columns(),
      now,
      filters: parseLeadFilters({ pipeline: "patrocinadores" }),
      canDrag: false,
      dragging: null,
      overStage: null,
      onMove: noop,
      onDragStart: noop,
      onDragEnd: noop,
      onColumnDragOver: noop,
      onColumnDragLeave: noop,
      onColumnDrop: noop,
      ...props,
    }),
  ).replace(/<!-- -->/g, "");
}

const text = (html: string) => html.replace(/<[^>]+>/g, " ");

// Tag de abertura do elemento com o data-stage pedido.
function columnTag(html: string, stage: string): string {
  return html.match(new RegExp(`<div [^>]*data-stage="${stage}"[^>]*>`))?.[0] ?? "";
}

describe("LeadBoardColumns", () => {
  it("renderiza uma coluna por estágio, com rótulo em português e contagem total", () => {
    const html = render();
    const stages = [...html.matchAll(/data-stage="([a-z_]+)"/g)].map((m) => m[1]);
    expect(stages).toEqual(STAGES.patrocinadores.filter((s) => s !== "perdido"));
    expect(html).toContain('aria-label="Quadro de Patrocinadores"');
    for (const label of ["Novo", "Qualificado", "Diagnóstico", "Proposta", "Termo", "Aporte"]) {
      expect(html).toContain(`>${label}</h3>`);
    }
    expect(html).toContain("73 leads");
    expect(html).toContain("R$\u00a0350.000,00 em propostas");
    expect(html).toContain("ver todos os 73 em Lista ›");
    expect(html).toContain("Nenhum lead em Diagnóstico.");
    // O "ver todos" abre a lista no estágio da coluna sem passar pela alternância (não grava cookie).
    expect(html).toContain(
      'href="/app/leads?pipeline=patrocinadores&amp;stage=novo&amp;view=lista"',
    );
  });

  it("cartão: link real para o lead, botão Mover … para, valor em R$ e draggable=false nos links", () => {
    const html = render();
    expect(html).toContain(`href="/app/leads/${LEAD_A}"`);
    expect(html).toContain('aria-label="Mover Rodrigo Fictício para"');
    // Âncoras do `finalFocus` dos diálogos abertos por soltura (lead-board-dialogs.tsx): o cartão
    // leva `data-lead-id` e o botão "Mover … para" fica dentro dele.
    const card =
      html.match(
        new RegExp(`<article [^>]*data-lead-id="${LEAD_A}"[^>]*>[\\s\\S]*?</article>`),
      )?.[0] ?? "";
    expect(card).toContain('aria-label="Mover Rodrigo Fictício para"');
    expect(html).toContain("R$\u00a0100.000,00");
    expect(html).toContain("Vinícola Fictícia · Empresa");
    const links = html.match(/<a [^>]*>/g) ?? [];
    const cardLinks = links.filter((a) => a.includes("/app/leads/0000"));
    expect(cardLinks.length).toBe(2);
    for (const a of cardLinks) expect(a).toContain('draggable="false"');
    // Sem dono: "Assumir"; com dono: avatar com o nome.
    expect(html).toContain("Assumir");
    expect(html).toContain('aria-label="Daniela Teste"');
    // Alvos de 44 px no celular (design system, seção 9): "Mover … para" e "Assumir".
    const moveTag =
      html.match(/<button [^>]*aria-label="Mover Rodrigo Fictício para"[^>]*>/)?.[0] ?? "";
    expect(moveTag).toContain("size-11");
    expect(moveTag).toContain("md:size-7");
    const claimTag = html.match(/<button [^>]*>Assumir</)?.[0] ?? "";
    expect(claimTag).toContain("h-11");
    expect(claimTag).toContain("md:h-7");
    // Cartões nascem sem arrasto no HTML do servidor.
    expect(html).toContain('draggable="false"');
    expect(html).not.toContain('draggable="true"');
  });

  it("durante o arrasto só os destinos permitidos ficam liberados e a zona Marcar perdido aparece", () => {
    const html = render({
      dragging: { leadId: LEAD_A, stage: "novo", name: "Rodrigo Fictício" },
      canDrag: true,
    });
    expect(columnTag(html, "novo")).not.toContain("data-blocked");
    expect(columnTag(html, "qualificado")).not.toContain("data-blocked");
    for (const stage of ["diagnostico", "proposta", "termo", "aporte", "recibo", "renovacao"]) {
      expect(columnTag(html, stage), stage).toContain('data-blocked="true"');
    }
    expect(html).toContain("Avance um estágio por vez");
    expect(html).toContain('data-drop-zone="terminal"');
    expect(html).toContain("Marcar perdido");
    expect(render()).not.toContain('data-drop-zone="terminal"');
    expect(render()).not.toContain("Avance um estágio por vez");
  });

  it("nenhuma chave de enum no texto visível (P20)", () => {
    const visible = text(render());
    expect(visible).not.toMatch(
      /\b(novo|qualificado|diagnostico|proposta|termo|renovacao|perdido)\b/,
    );
  });
});

describe("ViewToggle", () => {
  it('é um nav "Visão" com aria-current="true" só no ativo e links que preservam os filtros', () => {
    const filters = parseLeadFilters({
      pipeline: "contadores",
      q: "vale",
      stage: "contato",
      page: "2",
    });
    const html = renderToString(createElement(ViewToggle, { filters, active: "quadro" }));
    expect(html).toContain('aria-label="Visão"');
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    const active = html.match(/<a [^>]*aria-current="true"[^>]*>/)?.[0] ?? "";
    expect(active).toContain("view=quadro");
    expect(active).not.toContain("stage=");
    expect(active).not.toContain("page=");
    const list = html.match(/<a [^>]*view=lista[^>]*>/)?.[0] ?? "";
    expect(list).toContain("pipeline=contadores");
    expect(list).toContain("q=vale");
    expect(list).toContain("stage=contato");
    expect(list).toContain("page=2");
    expect(html).not.toContain("aria-pressed");
    // 44 px no celular, 28 px no desktop.
    for (const a of html.match(/<a [^>]*>/g) ?? []) {
      expect(a).toContain("h-11");
      expect(a).toContain("md:h-7");
    }
  });
});

describe("stagePropsFor", () => {
  it("monta os dados do diálogo a partir da linha do quadro", () => {
    const lead = row({
      id: LEAD_B,
      name: "Beatriz Fictícia",
      stage: "proposta",
      nextActionAt: new Date("2026-10-15T12:00:00Z"),
      openContributionProjectId: PROJECT,
      openContributionAmount: 100_000,
      orgCnpj: "12345678000190",
    });
    const props = stagePropsFor(lead, "patrocinadores", [{ id: "u1", name: "Daniela" }], now);
    expect(props.currentStage).toBe("proposta");
    expect(props.terminalStage).toBe("perdido");
    expect(props.currentIsInitial).toBe(false);
    expect(props.isPj).toBe(true);
    expect(props.openContributionProjectId).toBe(PROJECT);
    expect(props.orgCnpj).toBe("12345678000190");
    expect(props.nextActionAt).toBe("2026-10-15T12:00:00.000Z");
    expect(props.plans.map((p) => p.target.stage)).toEqual(["termo", "diagnostico"]);
    // Proposta → Termo depende do aporte: o plano traz o bloqueio para o diálogo desabilitar o botão.
    expect(props.plans[0].blockedBy.length).toBeGreaterThan(0);
  });
});
