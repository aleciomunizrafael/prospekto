import { SquareCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { PageHeader } from "@/components/crm/ui/page-header";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { Button } from "@/components/ui/button";
import { TASK_STATUS_LABELS } from "@/lib/crm/labels";
import { TASK_STATUSES } from "@/lib/crm/task-status";
import { describeTaskDue } from "@/lib/crm/task-due";
import { plural } from "@/lib/crm/text";
import { listTasksBoard } from "@/lib/repos/tasks";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tarefas" };

// Quadro de Tarefas (ADR-004, 6.5). Fundação: cabeçalho real e as três colunas em lista simples;
// a frente B entrega o quadro com arrasto, o diálogo Nova/Editar e os filtros.
export default async function TasksPage() {
  const ctx = await requireSession();
  const now = new Date();
  const board = await listTasksBoard(ctx, { now });
  const open = board.a_fazer.total + board.em_andamento.total;
  const overdue = [...board.a_fazer.rows, ...board.em_andamento.rows].filter(
    (t) => t.dueAt && t.dueAt.getTime() < now.getTime(),
  ).length;
  const empty = open === 0 && board.concluida.total === 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tarefas"
        description={`${plural(open, "aberta", "abertas")} · ${plural(overdue, "atrasada", "atrasadas")}`}
      />
      {empty ? (
        <EmptyState
          icon={SquareCheck}
          title="Nenhuma tarefa aberta."
          description="Crie a primeira ou registre uma tarefa num lead."
          action={
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/app/leads" />}
            >
              Ir para o Pipeline
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {TASK_STATUSES.map((status) => {
            const column = board[status];
            return (
              <section
                key={status}
                aria-labelledby={`coluna-${status}`}
                className="rounded-xl border border-border bg-surface-2"
              >
                <header className="flex min-h-11 items-center gap-2 border-b border-divider px-3">
                  <h2 id={`coluna-${status}`} className="text-sm font-semibold">
                    {TASK_STATUS_LABELS[status]}
                  </h2>
                  <span className="crm-meta tabular-nums">{column.total}</span>
                </header>
                {column.rows.length === 0 ? (
                  <p className="crm-meta px-3 py-3">
                    Nenhuma tarefa em {TASK_STATUS_LABELS[status].toLowerCase()}.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2 p-2">
                    {column.rows.map((task) => {
                      const due = describeTaskDue(task.dueAt, now);
                      const link = task.leadId
                        ? `/app/leads/${task.leadId}`
                        : task.orgId
                          ? `/app/organizacoes/${task.orgId}`
                          : task.projectId
                            ? `/app/projetos/${task.projectId}`
                            : task.contributionId
                              ? `/app/aportes/${task.contributionId}`
                              : null;
                      const linkLabel =
                        task.leadName ??
                        task.orgName ??
                        task.projectName ??
                        task.contributionLabel ??
                        null;
                      return (
                        <li
                          key={task.id}
                          className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                "text-sm font-medium",
                                status === "concluida" && "text-muted-foreground line-through",
                              )}
                            >
                              {task.subject}
                            </span>
                            <StatusBadge kind="priority" value={task.priority ?? "media"} />
                          </div>
                          <span className="crm-meta">
                            {link && linkLabel ? (
                              <Link href={link} className="hover:underline">
                                {linkLabel}
                              </Link>
                            ) : (
                              "sem vínculo"
                            )}
                          </span>
                          <span
                            className={cn(
                              "text-xs",
                              due.tone === "danger" && status !== "concluida"
                                ? "font-medium text-destructive"
                                : "text-muted-foreground",
                            )}
                          >
                            {due.text}
                            {task.ownerName ? ` · ${task.ownerName}` : ""}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
