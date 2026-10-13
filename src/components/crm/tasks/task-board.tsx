"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useOptimistic,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { moveTaskAction } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { TASK_STATUS_LABELS } from "@/lib/crm/labels";
import {
  applyOptimisticMove,
  insertIndexFromPointer,
  taskFiltersHref,
  type TaskFilters,
  type TaskMove,
} from "@/lib/crm/task-board";
import type { TaskStatus } from "@/lib/crm/task-status";
import type { TaskBoard as TaskBoardData, TaskRow } from "@/lib/repos/tasks";
import { cn } from "@/lib/utils";
import type { Option } from "../project-forms/action-form";
import { fabClassName } from "../shell/fab";
import { TaskBoardColumns, type DropTarget } from "./task-board-columns";
import { TaskDialog } from "./task-dialog";

// Quadro de Tarefas (ADR-004, 6.5 e 6.11; plano, frente B). Client mínimo: o estado do arrasto
// HTML5 nativo (sem biblioteca), o movimento otimista (useOptimistic) que volta sozinho se a
// action falhar, o diálogo Nova/Editar e a região viva que anuncia o movimento. O arrasto só
// existe no desktop (matchMedia em useEffect: `draggable` nasce falso no HTML, crítica 17); o
// menu "⋯" do cartão e o campo "Status" do diálogo são o caminho equivalente por teclado e no
// celular. Os dados chegam do Server Component e voltam pelo refresh() da action.

// "Nova tarefa" do cabeçalho e do FAB abrem o diálogo por evento, sem navegação.
const OPEN_NEW_EVENT = "prospekto:nova-tarefa";

export function openNewTaskDialog() {
  window.dispatchEvent(new Event(OPEN_NEW_EVENT));
}

export function NewTaskButton({
  variant = "default",
  className,
}: {
  variant?: "default" | "outline";
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size="touch"
      className={cn("md:h-9", className)}
      onClick={openNewTaskDialog}
    >
      <Plus aria-hidden="true" />
      Nova tarefa
    </Button>
  );
}

export function NewTaskFab() {
  return (
    <button
      type="button"
      aria-label="Nova tarefa"
      className={fabClassName}
      onClick={openNewTaskDialog}
    >
      <Plus className="size-6" aria-hidden="true" />
    </button>
  );
}

type DialogState = { kind: "new" } | { kind: "edit"; task: TaskRow } | null;

export type TaskBoardProps = {
  board: TaskBoardData;
  now: Date;
  users: Option[];
  organizations: Option[];
  projects: Option[];
  currentUserId: string;
  filters: TaskFilters;
  // Deep links: ?task=<id> (tarefa já carregada pela página) e ?novo=1.
  initialTask?: TaskRow | null;
  initialNew?: boolean;
  // Estado vazio no lugar das colunas (o diálogo continua montado para criar a primeira).
  empty?: ReactNode;
};

const DESKTOP = "(min-width: 960px)";

export function TaskBoard({
  board,
  now,
  users,
  organizations,
  projects,
  currentUserId,
  filters,
  initialTask = null,
  initialNew = false,
  empty,
}: TaskBoardProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(() =>
    initialTask ? { kind: "edit", task: initialTask } : initialNew ? { kind: "new" } : null,
  );
  // Aberto pela URL: ao fechar, tira ?task= / ?novo= do endereço (router.replace, sem recarregar).
  const [fromUrl, setFromUrl] = useState(Boolean(initialTask || initialNew));
  const [optimisticBoard, applyMove] = useOptimistic(
    board,
    (state: TaskBoardData, move: TaskMove) => applyOptimisticMove(state, move, new Date()),
  );
  const [canDrag, setCanDrag] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<DropTarget>(null);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    const media = window.matchMedia(DESKTOP);
    const update = () => setCanDrag(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const open = () => {
      setFromUrl(false);
      setDialog({ kind: "new" });
    };
    window.addEventListener(OPEN_NEW_EVENT, open);
    return () => window.removeEventListener(OPEN_NEW_EVENT, open);
  }, []);

  // Um novo ?task= ou ?novo=1 chegando por navegação (e-mail diário, Painel) abre o diálogo:
  // estado derivado das props durante a renderização (padrão "informação de renderizações
  // anteriores" do React), sem efeito.
  const urlKey = initialTask ? `task:${initialTask.id}` : initialNew ? "novo" : "";
  const [seenUrlKey, setSeenUrlKey] = useState(urlKey);
  if (urlKey !== seenUrlKey) {
    setSeenUrlKey(urlKey);
    if (initialTask) {
      setDialog({ kind: "edit", task: initialTask });
      setFromUrl(true);
    } else if (initialNew) {
      setDialog({ kind: "new" });
      setFromUrl(true);
    }
  }

  const cleanUrl = useCallback(() => {
    if (!fromUrl) return;
    setFromUrl(false);
    router.replace(taskFiltersHref(filters), { scroll: false });
  }, [fromUrl, router, filters]);

  const onDialogOpenChange = (open: boolean) => {
    if (open) return;
    setDialog(null);
    cleanUrl();
  };

  const performMove = useCallback(
    (task: TaskRow, status: TaskStatus, index: number) => {
      const move: TaskMove = { activityId: task.id, status, index };
      setAnnounce(`Movendo "${task.subject}" para ${TASK_STATUS_LABELS[status]}.`);
      startTransition(async () => {
        applyMove(move);
        const result = await moveTaskAction(move);
        if (result.status === "ok") {
          const message = result.message ?? "Tarefa movida.";
          toast.success(message);
          setAnnounce(message);
        } else {
          const message =
            result.status === "error" ? result.message : "Não foi possível mover a tarefa.";
          toast.error(message);
          setAnnounce(message);
        }
      });
    },
    [applyMove],
  );

  // Menu "⋯" do cartão: entra no fim da coluna de destino.
  const onMenuMove = useCallback(
    (task: TaskRow, status: TaskStatus) => {
      performMove(task, status, optimisticBoard[status].rows.length);
    },
    [performMove, optimisticBoard],
  );

  const onDragStart = useCallback((task: TaskRow, event: DragEvent<HTMLElement>) => {
    // Firefox exige setData para iniciar o arrasto (crítica 28); o id nunca é lido de volta.
    event.dataTransfer.setData("text/plain", task.id);
    event.dataTransfer.effectAllowed = "move";
    setDragId(task.id);
  }, []);

  const onDragEnd = useCallback(() => {
    setDragId(null);
    setOver(null);
  }, []);

  const onColumnDragOver = useCallback(
    (status: TaskStatus, event: DragEvent<HTMLElement>) => {
      if (!dragId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const list = event.currentTarget.querySelector<HTMLElement>("[data-column-list]");
      const cards = list
        ? Array.from(list.querySelectorAll<HTMLElement>("[data-task-id]")).map((el) => {
            const rect = el.getBoundingClientRect();
            return { top: rect.top, height: rect.height };
          })
        : [];
      const index = insertIndexFromPointer(cards, event.clientY);
      setOver((current) =>
        current && current.status === status && current.index === index
          ? current
          : { status, index },
      );
    },
    [dragId],
  );

  const onColumnDragLeave = useCallback((_status: TaskStatus, event: DragEvent<HTMLElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setOver(null);
  }, []);

  const onColumnDrop = useCallback(
    (status: TaskStatus, event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      const target = over && over.status === status ? over : null;
      setOver(null);
      setDragId(null);
      if (!dragId) return;
      let task: TaskRow | undefined;
      let from: TaskStatus | undefined;
      for (const s of ["a_fazer", "em_andamento", "concluida"] as const) {
        task = optimisticBoard[s].rows.find((t) => t.id === dragId);
        if (task) {
          from = s;
          break;
        }
      }
      if (!task || !from) return;
      const rows = optimisticBoard[status].rows;
      let index = target ? target.index : rows.length;
      // Na mesma coluna o índice mostrado inclui o próprio cartão; o servidor relê a coluna sem ele.
      if (from === status) {
        const dragIndex = rows.findIndex((t) => t.id === dragId);
        if (dragIndex !== -1 && dragIndex < index) index -= 1;
        if (dragIndex === index) return;
      }
      index = Math.max(0, Math.min(index, from === status ? rows.length - 1 : rows.length));
      performMove(task, status, index);
    },
    [dragId, over, optimisticBoard, performMove],
  );

  const dialogTask = dialog?.kind === "edit" ? dialog.task : null;
  const dialogKey = dialog ? (dialog.kind === "edit" ? dialog.task.id : "nova") : "fechado";

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
      {empty ?? (
        <TaskBoardColumns
          board={optimisticBoard}
          now={now}
          canDrag={canDrag}
          dragId={dragId}
          over={over}
          onEdit={(task) => {
            setFromUrl(false);
            setDialog({ kind: "edit", task });
          }}
          onMove={onMenuMove}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onColumnDragOver={onColumnDragOver}
          onColumnDragLeave={onColumnDragLeave}
          onColumnDrop={onColumnDrop}
        />
      )}
      <TaskDialog
        key={dialogKey}
        open={dialog !== null}
        onOpenChange={onDialogOpenChange}
        task={dialogTask}
        users={users}
        organizations={organizations}
        projects={projects}
        currentUserId={currentUserId}
      />
    </>
  );
}
