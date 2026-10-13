// Estado da tarefa derivado de started_at e done_at, nunca gravado (ADR-004, 6.5; plano, P2):
// concluída se done_at; senão em andamento se started_at; senão a fazer. Puro: serve ao quadro de
// Tarefas, à exportação e à paleta. Rótulos em TASK_STATUS_LABELS (labels.ts).
export type TaskStatus = "a_fazer" | "em_andamento" | "concluida";

export const TASK_STATUSES: readonly TaskStatus[] = ["a_fazer", "em_andamento", "concluida"];

export function taskStatusOf(t: { startedAt: Date | null; doneAt: Date | null }): TaskStatus {
  if (t.doneAt) return "concluida";
  if (t.startedAt) return "em_andamento";
  return "a_fazer";
}
