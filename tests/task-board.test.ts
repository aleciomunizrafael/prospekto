// Quadro de Tarefas renderizado com renderToString (decisão D13; padrão de tests/shell-nav.test.ts):
// TaskBoardColumns (três colunas, cartão, pill de prioridade, vínculo) e TaskFilters (chips-link
// com aria-current só no ativo, P19). As actions e o sonner são substituídos; sem banco.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TaskBoardColumns } from "@/components/crm/tasks/task-board-columns";
import { TaskFilters } from "@/components/crm/tasks/task-filters";
import type { TaskBoard, TaskRow } from "@/lib/repos/tasks";

vi.mock("@/actions/crm-leads", () => ({
  completeTaskAction: async () => ({ status: "idle" }),
}));
vi.mock("@/actions/tasks", () => ({
  moveTaskAction: async () => ({ status: "idle" }),
  searchTaskLeadsAction: async () => [],
}));
vi.mock("sonner", () => ({ toast: { success: () => undefined, error: () => undefined } }));

const NOW = new Date("2026-10-13T15:00:00Z");
const LEAD_ID = "00000000-0000-4000-8000-000000000001";

function row(id: string, extra: Partial<TaskRow> = {}): TaskRow {
  return {
    id,
    tenantId: "t1",
    type: "tarefa",
    subject: `Tarefa ${id}`,
    body: null,
    occurredAt: NOW,
    dueAt: null,
    doneAt: null,
    startedAt: null,
    priority: "media",
    position: 1,
    leadId: null,
    orgId: null,
    projectId: null,
    contributionId: null,
    prospectingItemId: null,
    ownerUserId: null,
    createdByUserId: null,
    data: null,
    createdAt: NOW,
    leadName: null,
    orgName: null,
    projectName: null,
    contributionLabel: null,
    ownerName: null,
    ...extra,
  } as TaskRow;
}

const board: TaskBoard = {
  a_fazer: {
    rows: [
      row("solta", { priority: "alta", dueAt: new Date("2026-10-12T15:00:00Z") }),
      row("vinculada", {
        priority: null,
        leadId: LEAD_ID,
        leadName: "Rodrigo Exemplo",
        ownerName: "Daniela Demonstração",
        body: "Montar a simulação antes.",
      }),
    ],
    total: 2,
  },
  em_andamento: { rows: [], total: 0 },
  concluida: {
    rows: [
      row("feita", { priority: "baixa", doneAt: NOW, dueAt: new Date("2026-10-10T15:00:00Z") }),
    ],
    total: 25,
  },
};

// Texto da página (P20): sem tags e sem os <!-- --> que o SSR põe entre nós de texto adjacentes.
const text = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

function render(props: Partial<Parameters<typeof TaskBoardColumns>[0]> = {}) {
  return renderToString(createElement(TaskBoardColumns, { board, now: NOW, ...props }));
}

describe("TaskBoardColumns", () => {
  it("três colunas com rótulo, contagem e o aviso das 20 mais recentes na concluída", () => {
    const html = render();
    expect(html).toContain('id="coluna-a_fazer"');
    expect(html).toContain('id="coluna-em_andamento"');
    expect(html).toContain('id="coluna-concluida"');
    const t = text(html);
    expect(t).toMatch(/A fazer\s+2/);
    expect(t).toMatch(/Em andamento\s+0/);
    expect(t).toMatch(/Concluída\s+25/);
    expect(t).toContain("as 1 mais recentes");
    expect(t).toContain("Nenhuma tarefa em em andamento.");
  });

  it("cartão concluído riscado; pill com texto ('Alta', e 'Média' quando priority é nulo)", () => {
    const html = render();
    const done = html.slice(html.indexOf('data-task-id="feita"'));
    expect(done).toMatch(/<button[^>]*class="[^"]*line-through[^"]*"[^>]*>Tarefa feita</);
    const t = text(html);
    expect(t).toContain("Alta");
    expect(t).toContain("Média");
    expect(t).toContain("Baixa");
    // Concluída não tem "Concluir"; as abertas têm.
    expect(html.match(/Concluir</g)).toHaveLength(2);
  });

  it("vínculo com link real e 'sem vínculo' na solta; prazo vencido só nas abertas", () => {
    const html = render();
    expect(html).toContain(`href="/app/leads/${LEAD_ID}"`);
    const t = text(html);
    expect(t).toContain("Rodrigo Exemplo");
    expect(t).toContain("sem vínculo");
    expect(t).toContain("Atrasada há 1 dia");
    expect(t).toContain("Sem data");
    expect(t).toContain("sem dono");
    expect(html).toContain('aria-label="Daniela Demonstração"');
    // Linha vencida em vermelho só na aberta.
    expect(html).toMatch(/text-destructive">Atrasada há 1 dia</);
    expect(html).toMatch(/text-muted-foreground">Atrasada há 3 dias</);
  });

  it("nenhuma chave de enum no texto (P20); botões do cartão são focáveis e nomeados", () => {
    const t = text(render());
    expect(t).not.toMatch(/\ba_fazer\b|\bem_andamento\b|\bconcluida\b|\bmedia\b|\balta\b/);
    const html = render();
    expect(html).toContain('aria-label="Editar tarefa: Tarefa solta"');
    // O menu "⋯" reúne Editar e Mover para …, por isso o nome é "Mais ações…" (convenção do CRM).
    expect(html).toContain('aria-label="Mais ações da tarefa: Tarefa solta"');
    expect(html).not.toContain('aria-label="Mover tarefa:');
    // Gancho do TaskBoard para devolver o foco ao "⋯" depois que o cartão remonta noutra coluna.
    expect(html).toMatch(
      /data-task-move="solta"[^>]*aria-label="Mais ações da tarefa: Tarefa solta"/,
    );
    expect(html).not.toMatch(/tabindex="-1"[^>]*aria-label="Editar/);
  });

  it("draggable nasce ausente no HTML e só aparece com canDrag; indicador de 2 px no alvo", () => {
    expect(render()).not.toContain('draggable="true"');
    const dragging = render({
      canDrag: true,
      dragId: "solta",
      over: { status: "a_fazer", index: 1 },
    });
    expect(dragging.match(/draggable="true"/g)).toHaveLength(3);
    expect(dragging).toMatch(
      /data-task-id="vinculada"[^>]*class="[^"]*border-t-2 border-t-primary/,
    );
    expect(dragging).toMatch(/data-column="a_fazer"[^>]*class="[^"]*ring-2 ring-primary\/40/);
    const atEnd = render({ canDrag: true, dragId: "solta", over: { status: "a_fazer", index: 2 } });
    expect(atEnd).toMatch(/data-task-id="vinculada"[^>]*class="[^"]*border-b-2 border-b-primary/);
  });
});

describe("TaskFilters", () => {
  it("chips-link com aria-current só no ativo; links combinam; Limpar só com filtro", () => {
    const none = renderToString(
      createElement(TaskFilters, { filters: { mine: false, overdue: false, dueToday: false } }),
    );
    expect(none).not.toContain("aria-current");
    expect(none).not.toContain("aria-pressed");
    expect(none).not.toContain(">Limpar<");
    expect(none).toContain('href="/app/tarefas?dono=eu"');
    expect(none).toContain('href="/app/tarefas?atrasadas=1"');
    expect(none).toContain('href="/app/tarefas?vencem=hoje"');

    const mine = renderToString(
      createElement(TaskFilters, { filters: { mine: true, overdue: false, dueToday: false } }),
    ).replace(/&amp;/g, "&");
    expect(mine.match(/aria-current="true"/g)).toHaveLength(1);
    expect(mine).toMatch(/<a aria-current="true"[^>]*href="\/app\/tarefas">Só as minhas</);
    expect(mine).toContain('href="/app/tarefas?dono=eu&atrasadas=1"');
    expect(mine).toContain(">Limpar<");
    expect(mine).toContain('aria-label="Filtros"');
  });
});
