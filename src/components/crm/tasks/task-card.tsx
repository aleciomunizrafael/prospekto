import { Ellipsis } from "lucide-react";
import Link from "next/link";
import type { DragEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TASK_STATUS_LABELS } from "@/lib/crm/labels";
import { taskLinkOf } from "@/lib/crm/task-board";
import { describeTaskDue } from "@/lib/crm/task-due";
import { TASK_STATUSES, type TaskStatus } from "@/lib/crm/task-status";
import type { TaskRow } from "@/lib/repos/tasks";
import { cn } from "@/lib/utils";
import { TaskCompleteButton } from "../forms/task-complete-button";
import { StatusBadge } from "../ui/status-badge";

// Cartão do quadro de Tarefas (ADR-004, 6.5; plano, frente B). Puro: tudo o que muda vem por
// props. Linha 1: assunto como botão "Editar" + pill de prioridade com texto; linha 2: vínculo
// como link real (ou "sem vínculo"); linha 3: descrição em duas linhas; linha 4: prazo
// (describeTaskDue) e, nas colunas abertas, "Concluir"; dono à direita. O menu "⋯" é o caminho
// sem arrasto para mover entre as três colunas (teclado e celular); `data-task-move` é o gancho
// que o TaskBoard usa para devolver o foco ao botão depois que o cartão remonta na coluna de
// destino. Links e botões não iniciam arrasto (`draggable={false}`, crítica 28) e ficam acima do
// cartão (`relative z-10`).
export type DropIndicator = "top" | "bottom" | null;

export type TaskCardProps = {
  task: TaskRow;
  status: TaskStatus;
  now: Date;
  canDrag?: boolean;
  dragging?: boolean;
  indicator?: DropIndicator;
  onEdit?: (task: TaskRow) => void;
  onMove?: (task: TaskRow, status: TaskStatus) => void;
  onDragStart?: (task: TaskRow, event: DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
};

export function TaskCard({
  task,
  status,
  now,
  canDrag = false,
  dragging = false,
  indicator = null,
  onEdit,
  onMove,
  onDragStart,
  onDragEnd,
}: TaskCardProps) {
  const done = status === "concluida";
  const due = describeTaskDue(task.dueAt, now);
  const link = taskLinkOf(task);
  const overdue = due.tone === "danger" && !done;
  return (
    <article
      data-task-id={task.id}
      aria-label={task.subject}
      draggable={canDrag || undefined}
      onDragStart={onDragStart ? (event) => onDragStart(task, event) : undefined}
      onDragEnd={onDragEnd}
      className={cn(
        "relative flex flex-col gap-1 rounded-lg border border-border bg-card p-3 transition-colors duration-120",
        canDrag && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-50",
        indicator === "top" && "border-t-2 border-t-primary",
        indicator === "bottom" && "border-b-2 border-b-primary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          draggable={false}
          aria-label={`Editar tarefa: ${task.subject}`}
          onClick={onEdit ? () => onEdit(task) : undefined}
          className={cn(
            "relative z-10 min-w-0 rounded-sm text-left text-sm font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.subject}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <StatusBadge kind="priority" value={task.priority ?? "media"} size="sm" />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  draggable={false}
                  data-task-move={task.id}
                  aria-label={`Mover tarefa: ${task.subject}`}
                  className="relative z-10 size-11 md:size-7"
                />
              }
            >
              <Ellipsis aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit ? (
                <DropdownMenuItem onClick={() => onEdit(task)}>Editar</DropdownMenuItem>
              ) : null}
              {TASK_STATUSES.filter((s) => s !== status).map((target) => (
                <DropdownMenuItem
                  key={target}
                  onClick={onMove ? () => onMove(task, target) : undefined}
                >
                  Mover para {TASK_STATUS_LABELS[target]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <span className="crm-meta truncate">
        {link ? (
          <Link
            href={link.href}
            draggable={false}
            className="relative z-10 rounded-sm hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {link.label}
          </Link>
        ) : (
          "sem vínculo"
        )}
      </span>
      {task.body ? (
        <p className="line-clamp-2 text-xs break-words text-muted-foreground">{task.body}</p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-xs",
              overdue ? "font-medium text-destructive" : "text-muted-foreground",
            )}
          >
            {due.text}
          </span>
          {done ? null : <TaskCompleteButton activityId={task.id} size="sm" className="md:h-7" />}
        </div>
        {task.ownerName ? (
          <Avatar name={task.ownerName} size="sm" />
        ) : (
          <span className="crm-meta shrink-0">sem dono</span>
        )}
      </div>
    </article>
  );
}
