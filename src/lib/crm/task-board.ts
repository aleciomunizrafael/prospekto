// Helpers puros do quadro de Tarefas (ADR-004, 6.5; plano, frente B): índice de inserção pelo
// ponteiro durante o arrasto, posição fracionária espelhando a regra do repositório (para o estado
// otimista), agrupamento por coluna, contagens do cabeçalho e filtros na URL. Sem React, sem banco.
import { TASK_STATUSES, taskStatusOf, type TaskStatus } from "./task-status";
import { plural } from "./text";

// Cartão medido na tela (getBoundingClientRect) para decidir onde soltar.
export type CardBox = { top: number; height: number };

// Índice onde a tarefa arrastada entra: antes do primeiro cartão cuja metade vertical está abaixo
// do ponteiro; depois de todos quando o ponteiro passou do último (como o onDragOver do Trilis).
export function insertIndexFromPointer(cards: readonly CardBox[], clientY: number): number {
  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    if (clientY < card.top + card.height / 2) return i;
  }
  return cards.length;
}

// Posição fracionária entre vizinhos (plano, P3): média entre os dois; `after - 1` no início;
// `before + 1` no fim; 1 numa coluna vazia. É o cálculo do repositório (moveTask) sem a
// renumeração, que só o banco faz.
export function nextPosition(neighbors: { before?: number; after?: number }): number {
  const { before, after } = neighbors;
  if (before === undefined && after === undefined) return 1;
  if (before === undefined) return (after as number) - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}

// O mínimo que o quadro precisa de uma tarefa para agrupar e ordenar.
export type TaskLike = {
  id: string;
  startedAt: Date | null;
  doneAt: Date | null;
  position: number;
  createdAt: Date;
};

function byPosition<T extends TaskLike>(a: T, b: T): number {
  return a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime();
}

// Concluída mostra as mais recentes primeiro (como o repositório), as abertas por posição.
function byDoneDesc<T extends TaskLike>(a: T, b: T): number {
  return (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0) || byPosition(a, b);
}

// Agrupa por estado derivado (taskStatusOf) na ordem de leitura de cada coluna.
export function groupTasks<T extends TaskLike>(rows: readonly T[]): Record<TaskStatus, T[]> {
  const groups: Record<TaskStatus, T[]> = { a_fazer: [], em_andamento: [], concluida: [] };
  for (const row of rows) groups[taskStatusOf(row)].push(row);
  groups.a_fazer.sort(byPosition);
  groups.em_andamento.sort(byPosition);
  groups.concluida.sort(byDoneDesc);
  return groups;
}

export type TaskMove = { activityId: string; status: TaskStatus; index: number };

type BoardLike<T extends TaskLike> = Record<TaskStatus, { rows: T[]; total: number }>;

// Estado otimista do quadro depois de um movimento (useOptimistic): tira a tarefa de onde está,
// aplica started_at/done_at da regra do ADR (6.5) e insere no índice pedido da coluna de destino
// com a posição que o repositório vai calcular. Os totais acompanham a troca de coluna.
export function applyOptimisticMove<T extends TaskLike>(
  board: BoardLike<T>,
  move: TaskMove,
  now: Date = new Date(),
): BoardLike<T> {
  let moved: T | undefined;
  let from: TaskStatus | undefined;
  for (const status of TASK_STATUSES) {
    const found = board[status].rows.find((t) => t.id === move.activityId);
    if (found) {
      moved = found;
      from = status;
      break;
    }
  }
  if (!moved || !from) return board;
  const patched: T = { ...moved, ...statusPatch(move.status, moved, now) };
  const next: BoardLike<T> = {
    a_fazer: { ...board.a_fazer, rows: board.a_fazer.rows.filter((t) => t.id !== moved.id) },
    em_andamento: {
      ...board.em_andamento,
      rows: board.em_andamento.rows.filter((t) => t.id !== moved.id),
    },
    concluida: { ...board.concluida, rows: board.concluida.rows.filter((t) => t.id !== moved.id) },
  };
  const target = next[move.status].rows;
  const at = Math.max(0, Math.min(Math.floor(move.index), target.length));
  const before = at > 0 ? target[at - 1].position : undefined;
  const after = at < target.length ? target[at].position : undefined;
  patched.position = nextPosition({ before, after });
  target.splice(at, 0, patched);
  if (from !== move.status) {
    next[from].total = Math.max(0, next[from].total - 1);
    next[move.status].total += 1;
  }
  return next;
}

// Mesma regra do repositório (statusPatch de repos/tasks.ts) para o cartão mudar de coluna na hora.
function statusPatch(
  status: TaskStatus,
  current: { startedAt: Date | null },
  now: Date,
): { startedAt: Date | null; doneAt: Date | null } {
  switch (status) {
    case "a_fazer":
      return { startedAt: null, doneAt: null };
    case "em_andamento":
      return { startedAt: current.startedAt ?? now, doneAt: null };
    case "concluida":
      return { startedAt: current.startedAt, doneAt: now };
  }
}

// "12 abertas · 3 atrasadas" do cabeçalho. `overdue` vem de um count próprio (as linhas param no
// teto de 100 por coluna, P13).
export function describeTaskCounts(
  board: { a_fazer: { total: number }; em_andamento: { total: number } },
  overdue: number,
): string {
  const open = board.a_fazer.total + board.em_andamento.total;
  return `${plural(open, "aberta", "abertas")} · ${plural(overdue, "atrasada", "atrasadas")}`;
}

// Toast ao mover (ADR-004, 6.12): depende de onde a tarefa estava e para onde foi.
export function describeTaskMove(from: TaskStatus, to: TaskStatus): string {
  if (from === to) return "Ordem atualizada.";
  if (to === "concluida") return "Tarefa concluída.";
  if (to === "em_andamento") return "Tarefa em andamento.";
  return from === "concluida" ? "Tarefa reaberta." : "Tarefa de volta para A fazer.";
}

// --- Filtros na URL (?dono=eu, ?atrasadas=1, ?vencem=hoje) ---------------------------------------

export type TaskFilters = { mine: boolean; overdue: boolean; dueToday: boolean };

export const TASKS_PATH = "/app/tarefas";

type SearchParamValue = string | string[] | undefined;

function first(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseTaskFilters(params: Record<string, SearchParamValue>): TaskFilters {
  return {
    mine: first(params.dono) === "eu",
    overdue: first(params.atrasadas) === "1",
    dueToday: first(params.vencem) === "hoje",
  };
}

export function hasTaskFilters(f: TaskFilters): boolean {
  return f.mine || f.overdue || f.dueToday;
}

export function taskFiltersToQuery(f: Partial<TaskFilters>): string {
  const q = new URLSearchParams();
  if (f.mine) q.set("dono", "eu");
  if (f.overdue) q.set("atrasadas", "1");
  if (f.dueToday) q.set("vencem", "hoje");
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function taskFiltersHref(f: Partial<TaskFilters>): string {
  return `${TASKS_PATH}${taskFiltersToQuery(f)}`;
}

// Texto do vazio com filtro (ADR-004, 6.12).
export function describeEmptyFiltered(f: TaskFilters): string {
  const whose = f.mine ? " sua" : "";
  if (f.overdue) return `Nenhuma tarefa${whose} atrasada.`;
  if (f.dueToday) return `Nenhuma tarefa${whose} vence hoje.`;
  return "Nenhuma tarefa sua aberta.";
}

// --- Vínculo do cartão -----------------------------------------------------------------------------

export type TaskLink = { href: string; label: string } | null;

export function taskLinkOf(task: {
  leadId: string | null;
  orgId: string | null;
  projectId: string | null;
  contributionId: string | null;
  leadName: string | null;
  orgName: string | null;
  projectName: string | null;
  contributionLabel: string | null;
}): TaskLink {
  if (task.leadId) return { href: `/app/leads/${task.leadId}`, label: task.leadName ?? "Lead" };
  if (task.orgId) {
    return { href: `/app/organizacoes/${task.orgId}`, label: task.orgName ?? "Organização" };
  }
  if (task.projectId) {
    return { href: `/app/projetos/${task.projectId}`, label: task.projectName ?? "Projeto" };
  }
  if (task.contributionId) {
    return {
      href: `/app/aportes/${task.contributionId}`,
      label: task.contributionLabel ?? "Aporte",
    };
  }
  return null;
}
