import { SquareCheck } from "lucide-react";
import Link from "next/link";
import { TaskCompleteButton } from "@/components/crm/forms/task-complete-button";
import { Block, TaskDue } from "@/components/crm/today";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { Button } from "@/components/ui/button";
import type { TaskRow } from "@/lib/repos/tasks";
import { cn } from "@/lib/utils";

// "Minhas tarefas" do Painel (ADR-004, 6.8): as 8 tarefas abertas do usuário da sessão, por
// vencimento (listOpenTasksForOwner). Linha: pill de prioridade com texto, assunto (link para o
// quadro com a tarefa em foco), vínculo em `.crm-meta`, prazo humano e "Concluir". Componente
// puro; testado em tests/dashboard-blocks.test.ts.

// Com que a tarefa se liga: lead, organização, projeto ou aporte, o que existir.
export function taskLink(task: TaskRow): string | null {
  return task.leadName ?? task.orgName ?? task.projectName ?? task.contributionLabel ?? null;
}

// Desktop: pill | assunto + vínculo | prazo + Concluir. Celular: assunto + Concluir à direita no
// primeiro andar; pill e prazo no segundo (o assunto nunca fica sem espaço), como na fila do
// Painel.
function Row({ task, now }: { task: TaskRow; now: Date }) {
  const link = taskLink(task);
  const badge = <StatusBadge kind="priority" value={task.priority ?? "media"} size="sm" />;
  return (
    <li className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-1.5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:py-1">
      <span className="hidden md:inline-flex">{badge}</span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm md:truncate">
          <Link href={`/app/tarefas?task=${task.id}`} className="font-medium hover:underline">
            {task.subject}
          </Link>
        </span>
        {link ? <span className="crm-meta truncate">{link}</span> : null}
      </span>
      <span className="col-start-2 row-span-2 row-start-1 flex shrink-0 items-center justify-end gap-2 self-center md:col-start-3 md:row-span-1">
        <span className="hidden md:inline-flex">
          <TaskDue dueAt={task.dueAt} now={now} />
        </span>
        <TaskCompleteButton activityId={task.id} size="responsive" />
      </span>
      <span className="col-start-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 md:hidden">
        {badge}
        <TaskDue dueAt={task.dueAt} now={now} />
      </span>
    </li>
  );
}

export function MyTasks({
  rows,
  now,
  className,
}: {
  rows: TaskRow[];
  now: Date;
  className?: string;
}) {
  return (
    <Block
      id="minhas-tarefas"
      title="Minhas tarefas"
      count={rows.length}
      icon={SquareCheck}
      iconClassName="text-muted-foreground"
      meta={
        <Link href="/app/tarefas?dono=eu" className="text-primary hover:underline">
          ver todas ›
        </Link>
      }
      className={cn(className)}
    >
      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-2 px-4 py-3">
          <p className="text-sm text-muted-foreground">Nenhuma tarefa atribuída a você.</p>
          <Button
            variant="outline"
            size="sm"
            className="h-11 md:h-7"
            nativeButton={false}
            render={<Link href="/app/tarefas?novo=1" />}
          >
            Nova tarefa
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-divider">
          {rows.map((task) => (
            <Row key={task.id} task={task} now={now} />
          ))}
        </ul>
      )}
    </Block>
  );
}
