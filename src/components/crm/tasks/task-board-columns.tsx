import type { DragEvent } from "react";
import { TASK_STATUS_LABELS } from "@/lib/crm/labels";
import { TASK_STATUSES, type TaskStatus } from "@/lib/crm/task-status";
import type { TaskBoard, TaskRow } from "@/lib/repos/tasks";
import { cn } from "@/lib/utils";
import { TaskCard, type TaskCardProps } from "./task-card";

// As três colunas do quadro de Tarefas (ADR-004, 6.5): A fazer, Em andamento, Concluída. Puro:
// o estado do arrasto (quem está sendo arrastado, onde vai cair) e os manipuladores vêm do
// TaskBoard (Client). Sem manipuladores, renderiza só a leitura (testes com renderToString).
// `grid gap-3 md:grid-cols-3`: no celular as colunas empilham e o caminho é o menu do cartão e
// o campo "Status" do diálogo.

const COLUMN_DOT: Record<TaskStatus, string> = {
  a_fazer: "bg-muted-foreground",
  em_andamento: "bg-primary",
  concluida: "bg-success",
};

export type DropTarget = { status: TaskStatus; index: number } | null;

export type TaskBoardColumnsProps = {
  board: TaskBoard;
  now: Date;
  canDrag?: boolean;
  dragId?: string | null;
  over?: DropTarget;
  onEdit?: TaskCardProps["onEdit"];
  onMove?: TaskCardProps["onMove"];
  onDragStart?: TaskCardProps["onDragStart"];
  onDragEnd?: () => void;
  onColumnDragOver?: (status: TaskStatus, event: DragEvent<HTMLElement>) => void;
  onColumnDragLeave?: (status: TaskStatus, event: DragEvent<HTMLElement>) => void;
  onColumnDrop?: (status: TaskStatus, event: DragEvent<HTMLElement>) => void;
};

export function TaskBoardColumns({
  board,
  now,
  canDrag = false,
  dragId = null,
  over = null,
  onEdit,
  onMove,
  onDragStart,
  onDragEnd,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
}: TaskBoardColumnsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {TASK_STATUSES.map((status) => {
        const column = board[status];
        const isOver = dragId !== null && over?.status === status;
        const done = status === "concluida";
        return (
          <section
            key={status}
            data-column={status}
            aria-labelledby={`coluna-${status}`}
            onDragOver={onColumnDragOver ? (event) => onColumnDragOver(status, event) : undefined}
            onDragLeave={
              onColumnDragLeave ? (event) => onColumnDragLeave(status, event) : undefined
            }
            onDrop={onColumnDrop ? (event) => onColumnDrop(status, event) : undefined}
            className={cn(
              "flex min-w-0 flex-col rounded-xl border border-border bg-surface-2 transition-shadow duration-120",
              isOver && "ring-2 ring-primary/40",
            )}
          >
            <header className="flex min-h-11 items-center gap-2 border-b border-divider px-3">
              <span
                aria-hidden="true"
                className={cn("size-2 shrink-0 rounded-full", COLUMN_DOT[status])}
              />
              <h2 id={`coluna-${status}`} className="text-sm font-semibold">
                {TASK_STATUS_LABELS[status]}
              </h2>
              <span className="crm-meta tabular-nums">
                {column.total}
                <span className="sr-only">{column.total === 1 ? " tarefa" : " tarefas"}</span>
              </span>
              {done && column.total > column.rows.length ? (
                <span className="crm-meta ml-auto">as {column.rows.length} mais recentes</span>
              ) : null}
            </header>
            {column.rows.length === 0 ? (
              <p
                className={cn(
                  "crm-meta px-3 py-4",
                  isOver && over?.index === 0 && "border-t-2 border-t-primary",
                )}
              >
                Nenhuma tarefa em {TASK_STATUS_LABELS[status].toLowerCase()}.
              </p>
            ) : (
              <div
                data-column-list={status}
                className="flex flex-col gap-2 p-2 md:max-h-[70vh] md:overflow-y-auto"
              >
                {column.rows.map((task: TaskRow, index) => {
                  const last = index === column.rows.length - 1;
                  const indicator = !isOver
                    ? null
                    : over?.index === index
                      ? "top"
                      : last && over?.index === column.rows.length
                        ? "bottom"
                        : null;
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      status={status}
                      now={now}
                      canDrag={canDrag}
                      dragging={dragId === task.id}
                      indicator={indicator}
                      onEdit={onEdit}
                      onMove={onMove}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                    />
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
