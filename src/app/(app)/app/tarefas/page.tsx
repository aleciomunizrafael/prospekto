import { SearchX, SquareCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewTaskButton, NewTaskFab, TaskBoard } from "@/components/crm/tasks/task-board";
import { TaskFilters } from "@/components/crm/tasks/task-filters";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { PageHeader } from "@/components/crm/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  describeEmptyFiltered,
  describeTaskCounts,
  hasTaskFilters,
  parseTaskFilters,
  taskFiltersHref,
} from "@/lib/crm/task-board";
import { listOrganizations } from "@/lib/repos/organizations";
import { listProjects } from "@/lib/repos/projects";
import { countOverdueOpenTasks, getTask, listTasksBoard } from "@/lib/repos/tasks";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";
import { uuidSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Tarefas" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Quadro de Tarefas (ADR-004, 6.5; plano, frente B): três colunas sobre activities.type = tarefa,
// filtros na URL (?dono=eu, ?atrasadas=1, ?vencem=hoje), deep links ?task=<id> e ?novo=1. O
// Server Component carrega pelos repositórios; o TaskBoard (Client) cuida do arrasto, do
// otimista e do diálogo.
export default async function TasksPage({ searchParams }: PageProps<"/app/tarefas">) {
  const ctx = await requireSession();
  const params = await searchParams;
  const filters = parseTaskFilters(params);
  const taskParam = uuidSchema.safeParse(first(params.task));
  const openNew = first(params.novo) === "1";
  const now = new Date();
  const scope = {
    now,
    ownerUserId: filters.mine ? ctx.userId : undefined,
    dueToday: filters.dueToday,
  };
  // A contagem de atrasadas vem de um count próprio (countOverdueOpenTasks), sem carregar o
  // quadro de novo: as linhas param no teto por coluna (P13). O recorte "vencem hoje" não entra
  // porque toda atrasada (due_at < agora) já vence até o fim de hoje.
  const [board, overdue, users, organizations, projects, task] = await Promise.all([
    listTasksBoard(ctx, { ...scope, overdueOnly: filters.overdue }),
    countOverdueOpenTasks(ctx, { now, ownerUserId: scope.ownerUserId }),
    listTenantUsers(ctx),
    listOrganizations(ctx, { limit: 300 }),
    listProjects(ctx, { limit: 500 }),
    taskParam.success ? getTask(ctx, taskParam.data) : null,
  ]);
  const filtered = hasTaskFilters(filters);
  const empty =
    board.a_fazer.rows.length + board.em_andamento.rows.length + board.concluida.rows.length === 0;

  const emptyState = !empty ? undefined : filtered ? (
    <EmptyState
      icon={SearchX}
      size="sm"
      title={describeEmptyFiltered(filters)}
      action={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={taskFiltersHref({})} />}
        >
          Limpar filtros
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={SquareCheck}
      title="Nenhuma tarefa aberta."
      description="Crie a primeira ou registre uma tarefa num lead."
      action={<NewTaskButton variant="outline" />}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tarefas"
        description={describeTaskCounts(board, overdue)}
        primary={<NewTaskButton />}
      />
      <TaskFilters filters={filters} />
      <TaskBoard
        board={board}
        now={now}
        users={users.map((u) => ({ value: u.id, label: u.name }))}
        organizations={organizations.map((o) => ({ value: o.id, label: o.name }))}
        projects={projects.map((p) => ({ value: p.id, label: p.name }))}
        currentUserId={ctx.userId}
        filters={filters}
        initialTask={task}
        initialNew={openNew}
        empty={emptyState}
      />
      <NewTaskFab />
    </div>
  );
}
