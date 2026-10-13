// Blocos novos do Painel (ADR-004, 6.8) renderizados com renderToString, como o servidor faz:
// "Últimas atividades" (links reais por tipo de vínculo e hora relativa), "Minhas tarefas"
// (link para o quadro, prioridade com texto, vazio com "Nova tarefa") e a StatRuler (grupo com
// nome, células sem borda própria e anel de foco interno). As actions e o sonner são substituídos.
import { Fragment, createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MyTasks, taskLink } from "@/components/crm/dashboard/my-tasks";
import {
  RecentActivities,
  activityContext,
  activityHref,
  relativeDayTime,
} from "@/components/crm/dashboard/recent-activities";
import { StatCard } from "@/components/crm/ui/stat-card";
import { StatRuler } from "@/components/crm/ui/stat-ruler";
import type { RecentActivity } from "@/lib/repos/activities";
import type { TaskRow } from "@/lib/repos/tasks";

vi.mock("@/actions/crm-leads", () => ({
  completeTaskAction: async () => ({ status: "idle" }),
  claimLeadAction: async () => undefined,
}));
vi.mock("sonner", () => ({ toast: { success: () => undefined, error: () => undefined } }));

// 13/10/2026, 12:00 em São Paulo.
const NOW = new Date("2026-10-13T15:00:00.000Z");
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function activity(overrides: Partial<RecentActivity> = {}): RecentActivity {
  return {
    id: ID(1),
    tenantId: "t1",
    type: "ligacao",
    subject: "Ligação de qualificação",
    body: null,
    data: null,
    occurredAt: new Date("2026-10-13T17:10:00.000Z"),
    dueAt: null,
    doneAt: null,
    startedAt: null,
    priority: null,
    position: 0,
    leadId: null,
    orgId: null,
    contactId: null,
    projectId: null,
    contributionId: null,
    prospectingItemId: null,
    ownerUserId: null,
    createdByUserId: "u1",
    createdAt: new Date("2026-10-13T17:10:00.000Z"),
    authorName: "Daniela",
    leadName: null,
    orgName: null,
    projectName: null,
    prospectingItemName: null,
    prospectingListId: null,
    ...overrides,
  };
}

function task(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    ...activity({ type: "tarefa", subject: "Enviar proposta", priority: "alta", position: 1 }),
    contributionLabel: null,
    ownerName: "Daniela",
    ...overrides,
  };
}

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("RecentActivities", () => {
  it("liga cada linha ao registro certo: lead, organização, prospecção, aporte, projeto, tarefa", () => {
    expect(activityHref(activity({ leadId: ID(10), orgId: ID(20) }))).toBe(`/app/leads/${ID(10)}`);
    expect(activityHref(activity({ orgId: ID(20) }))).toBe(`/app/organizacoes/${ID(20)}`);
    expect(activityHref(activity({ prospectingItemId: ID(30), prospectingListId: ID(31) }))).toBe(
      `/app/prospeccao/${ID(31)}/${ID(30)}`,
    );
    expect(activityHref(activity({ contributionId: ID(40) }))).toBe(`/app/aportes/${ID(40)}`);
    expect(activityHref(activity({ projectId: ID(50) }))).toBe(`/app/projetos/${ID(50)}`);
    expect(activityHref(activity({ type: "tarefa", id: ID(60) }))).toBe(
      `/app/tarefas?task=${ID(60)}`,
    );
    expect(activityHref(activity({ type: "nota" }))).toBeNull();
  });

  it("hora relativa: hoje, ontem e dia curto", () => {
    expect(relativeDayTime(new Date("2026-10-13T17:10:00.000Z"), NOW)).toBe("hoje, 14:10");
    expect(relativeDayTime(new Date("2026-10-12T12:30:00.000Z"), NOW)).toBe("ontem, 09:30");
    expect(relativeDayTime(new Date("2026-10-09T12:00:00.000Z"), NOW)).toBe("sex., 9 de out.");
  });

  it("contexto 'Autor · Empresa ou lead'", () => {
    expect(activityContext(activity({ leadName: "Rodrigo" }))).toBe("Daniela · Rodrigo");
    expect(activityContext(activity({ orgName: "Vinícola" }))).toBe("Daniela · Vinícola");
    expect(activityContext(activity({ authorName: null }))).toBe("");
  });

  it("renderiza as linhas com o link, o contexto e a hora", () => {
    const html = renderToString(
      createElement(RecentActivities, {
        rows: [
          activity({ leadId: ID(10), leadName: "Rodrigo" }),
          activity({
            id: ID(2),
            type: "whatsapp",
            subject: "WhatsApp aberto",
            prospectingItemId: ID(30),
            prospectingListId: ID(31),
            prospectingItemName: "Vinícola Exemplo",
            occurredAt: new Date("2026-10-12T12:30:00.000Z"),
          }),
        ],
        now: NOW,
      }),
    );
    expect(html).toContain('id="ultimas-atividades"');
    expect(html).toContain(`href="/app/leads/${ID(10)}"`);
    expect(html).toContain(`href="/app/prospeccao/${ID(31)}/${ID(30)}"`);
    const plain = text(html);
    expect(plain).toContain("Últimas atividades");
    expect(plain).toContain("Daniela · Rodrigo");
    expect(plain).toContain("Daniela · Vinícola Exemplo");
    expect(plain).toContain("hoje, 14:10");
    expect(plain).toContain("ontem, 09:30");
    // Nenhuma chave de enum na tela (P20).
    expect(plain).not.toMatch(/\bligacao\b|\bwhatsapp\b/);
  });

  it("vazio diz a frase do ADR", () => {
    const html = renderToString(createElement(RecentActivities, { rows: [], now: NOW }));
    expect(text(html)).toContain(
      "Nenhuma atividade registrada ainda. Ligações, reuniões e notas aparecem aqui.",
    );
  });
});

describe("MyTasks", () => {
  it("linha com prioridade em texto, link para o quadro, vínculo, prazo e Concluir", () => {
    const html = renderToString(
      createElement(MyTasks, {
        rows: [
          task({ id: ID(7), leadName: "Rodrigo", dueAt: new Date("2026-10-13T20:00:00.000Z") }),
          task({ id: ID(8), priority: null, orgName: "Vinícola", subject: "Ligar para a central" }),
        ],
        now: NOW,
      }),
    );
    expect(html).toContain(`href="/app/tarefas?task=${ID(7)}"`);
    expect(html).toContain(`href="/app/tarefas?task=${ID(8)}"`);
    expect(html).toContain('href="/app/tarefas?dono=eu"');
    const plain = text(html);
    expect(plain).toContain("Minhas tarefas");
    expect(plain).toContain("Alta");
    // Prioridade nula vale média (ADR-004, 6.4.3).
    expect(plain).toContain("Média");
    expect(plain).toContain("Rodrigo");
    expect(plain).toContain("Vinícola");
    expect(plain).toContain("ver todas ›");
    expect(html.match(/>Concluir</g)).toHaveLength(2);
    expect(plain).not.toMatch(/\balta\b|\bmedia\b/);
    expect(taskLink(task({ contributionLabel: "Aporte X" }))).toBe("Aporte X");
  });

  it("vazio diz a frase do ADR e oferece 'Nova tarefa'", () => {
    const html = renderToString(createElement(MyTasks, { rows: [], now: NOW }));
    expect(text(html)).toContain("Nenhuma tarefa atribuída a você.");
    expect(html).toMatch(/<a[^>]*href="\/app\/tarefas\?novo=1"[^>]*>[\s\S]*?Nova tarefa/);
  });
});

describe("StatRuler e StatCard variant=ruler", () => {
  function ruler() {
    const cells = [
      createElement(StatCard, {
        variant: "ruler",
        label: "Vencidas",
        value: "3",
        hint: "3 próximas ações",
        href: "/app/leads?sort=next_action",
        ariaLabel: "3 próximas ações vencidas, abrir lista",
      }),
      createElement(StatCard, {
        variant: "ruler",
        label: "Sem contato",
        value: "2",
        hint: "todos no prazo",
        href: "/app/leads?sort=created",
        ariaLabel: "2 leads novos sem contato, 0 fora do prazo, abrir lista",
      }),
      createElement(StatCard, {
        variant: "ruler",
        label: "Tarefas hoje",
        value: "4",
        hint: "2 atrasadas",
        hintHref: "/app/tarefas?atrasadas=1",
        hintTone: "danger",
        tone: "danger",
        href: "/app/tarefas?vencem=hoje",
        ariaLabel: "4 tarefas para hoje, 2 atrasadas, abrir tarefas",
        title: "4 tarefas vencidas ou para hoje, 2 atrasadas",
      }),
      createElement(StatCard, {
        variant: "ruler",
        label: "Aportes 15 dias",
        value: "R$ 150.000,00",
        hint: "2 previstos",
        href: "/app/aportes?janela=15d",
        ariaLabel: "R$ 150.000,00 em 2 aportes previstos nos próximos 15 dias, abrir lista",
      }),
    ];
    return renderToString(
      createElement(StatRuler, {
        label: "Hoje",
        children: createElement(Fragment, null, ...cells),
      }),
    );
  }

  // As células são os filhos diretos do grupo: cada uma abre com `<div class="@container …"`.
  function cellClasses(html: string): string[] {
    return [...html.matchAll(/<div class="(@container[^"]*)"/g)].map((m) => m[1]);
  }

  it("é um grupo com nome e quatro células sem borda própria", () => {
    const html = ruler();
    expect(html).toMatch(/<div role="group" aria-label="Hoje"/);
    const cells = cellClasses(html);
    expect(cells).toHaveLength(4);
    for (const cell of cells) expect(cell).not.toMatch(/border|rounded|shadow/);
    // As hairlines ficam no grupo.
    expect(html).toMatch(/role="group"[^>]*class="[^"]*border-divider/);
  });

  it("o anel de foco de cada célula é interno (ring-inset) e o link cobre a célula", () => {
    const html = ruler();
    const links = html.match(/<a [^>]*aria-label="[^"]*"[^>]*>/g) ?? [];
    expect(links).toHaveLength(4);
    for (const link of links) {
      expect(link).toContain("ring-inset");
      expect(link).toMatch(/focus-visible:after:ring-2/);
      expect(link).toContain("after:inset-0");
    }
  });

  it("'Tarefas hoje' aponta para ?vencem=hoje e o hint das atrasadas para ?atrasadas=1, sem <a> aninhado", () => {
    const html = ruler();
    expect(html).toContain('href="/app/tarefas?vencem=hoje"');
    expect(html).toMatch(/<a[^>]*href="\/app\/tarefas\?atrasadas=1"[^>]*>2 atrasadas<\/a>/);
    expect(html).not.toMatch(/<a [^>]*>(?:(?!<\/a>)[\s\S])*<a /);
    expect(html).toContain('title="4 tarefas vencidas ou para hoje, 2 atrasadas"');
    expect(html).toContain('aria-label="4 tarefas para hoje, 2 atrasadas, abrir tarefas"');
  });

  it("a seta ↗ aparece só no hover ou foco", () => {
    const html = ruler();
    const arrows = html.match(/lucide-arrow-up-right[^"]*"/g) ?? [];
    expect(arrows).toHaveLength(4);
    expect(html).toMatch(/opacity-0[^"]*group-hover:opacity-100/);
  });
});
