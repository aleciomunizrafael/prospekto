import { CircleAlert, HandCoins, SquareCheck, Sun, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ActionQueue,
  ContributionsPreview,
  ProjectsAlert,
  UpcomingByDay,
  type QueueItem,
} from "@/components/crm/today";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { PageHeader } from "@/components/crm/ui/page-header";
import { StatCard } from "@/components/crm/ui/stat-card";
import { Button } from "@/components/ui/button";
import { addDays } from "@/lib/crm/dates";
import {
  CRM_TIME_ZONE,
  addCalendarDays,
  calendarDateInSaoPaulo,
  dayBounds,
  formatBRL,
} from "@/lib/crm/format";
import { stageInfo } from "@/lib/crm/lead-view";
import { listOpenTasksWithLead } from "@/lib/repos/activities";
import { listContributionSummaries } from "@/lib/repos/contributions";
import {
  listLeadsWithNextActionBetween,
  listNewLeadsWithoutContact,
  listOverdueLeads,
} from "@/lib/repos/leads";
import { listProjectAlerts } from "@/lib/repos/projects";
import { getSession, requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Hoje" };

const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeZone: CRM_TIME_ZONE,
});
const HOUR_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hour12: false,
  timeZone: CRM_TIME_ZONE,
});

function greetingFor(now: Date): string {
  const hour = Number(HOUR_FORMAT.format(now)) % 24;
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

export default async function TodayPage() {
  // Autorização em cada página (e em cada Server Action), não só no layout: layouts não
  // re-renderizam em navegação cliente e não impedem o segmento de rodar (Next 16,
  // guides/authentication.md, "Layouts and auth checks"). Coberto por tests/auth-guard.test.ts.
  const ctx = await requireSession();
  const session = await getSession();
  const now = new Date();
  const { start: startOfToday, end: endOfToday } = dayBounds(now);
  const in7 = addDays(endOfToday, 7);
  const today = calendarDateInSaoPaulo(now);
  const in15 = addCalendarDays(today, 15);

  const [newLeads, overdue, dueTasks, upcomingTasks, upcomingLeads, contributions, projectsAlert] =
    await Promise.all([
      listNewLeadsWithoutContact(ctx, 20),
      listOverdueLeads(ctx, now, 20),
      listOpenTasksWithLead(ctx, { dueTo: endOfToday, limit: 20 }),
      listOpenTasksWithLead(ctx, { dueFrom: endOfToday, dueTo: in7, limit: 20 }),
      listLeadsWithNextActionBetween(ctx, now, in7, { limit: 20 }),
      listContributionSummaries(ctx, { expectedBetween: { from: today, to: in15 }, limit: 20 }),
      listProjectAlerts(ctx, now),
    ]);

  // Fila "Precisa de ação agora", ordenada aqui (decisão D2): tarefas vencidas e de hoje por
  // vencimento, depois próximas ações vencidas por data, depois leads novos sem contato pelo
  // prazo do estágio (vencidos primeiro, sem prazo por último). Um lead entra uma vez só.
  const overdueIds = new Set(overdue.map((lead) => lead.id));
  const newLeadsInfo = newLeads
    .filter((lead) => !overdueIds.has(lead.id))
    .map((lead) => ({ lead, info: stageInfo(lead, now) }))
    .sort((a, b) => {
      const deadlineA = a.info.slaDeadline?.getTime() ?? Number.POSITIVE_INFINITY;
      const deadlineB = b.info.slaDeadline?.getTime() ?? Number.POSITIVE_INFINITY;
      return deadlineA - deadlineB;
    });
  const queue: QueueItem[] = [
    ...[...dueTasks]
      .sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0))
      .map((task) => ({ kind: "task" as const, task })),
    ...[...overdue]
      .sort((a, b) => (a.nextActionAt?.getTime() ?? 0) - (b.nextActionAt?.getTime() ?? 0))
      .map((lead) => ({ kind: "lead" as const, lead, reason: "overdue" as const })),
    ...newLeadsInfo.map(({ lead }) => ({ kind: "lead" as const, lead, reason: "new" as const })),
  ];

  // Números dos StatCards (decisão D15: só filtros que já existem).
  const overdueCount = overdue.length;
  const newCount = newLeads.length;
  const newLate = newLeads.filter((lead) => stageInfo(lead, now).slaOverdue).length;
  const tasksCount = dueTasks.length;
  const tasksLate = dueTasks.filter(
    (t) => t.dueAt && t.dueAt.getTime() < startOfToday.getTime(),
  ).length;
  const contributionsTotal = contributions.reduce((sum, c) => sum + c.proposedAmount, 0);
  const contributionsLabel = formatBRL(contributionsTotal) || "R$ 0,00";

  const greeting = greetingFor(now);
  const firstName = session?.user.name?.trim().split(/\s+/)[0] ?? "";
  const title = firstName ? `${greeting}, ${firstName}.` : `${greeting}.`;
  const dateLabel = DATE_FORMAT.format(now);
  const eyebrow = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <PageHeader eyebrow={eyebrow} title={title} />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <StatCard
          label="Vencidas"
          value={String(overdueCount)}
          hint={plural(overdueCount, "próxima ação", "próximas ações")}
          tone={overdueCount > 0 ? "danger" : "neutral"}
          icon={CircleAlert}
          href="/app/leads?sort=next_action"
          ariaLabel={`${plural(overdueCount, "próxima ação vencida", "próximas ações vencidas")}, abrir lista`}
        />
        <StatCard
          label="Sem contato"
          value={String(newCount)}
          hint={newLate > 0 ? `${newLate} fora do prazo` : "todos no prazo"}
          tone={newLate > 0 ? "danger" : "neutral"}
          icon={UserPlus}
          href="/app/leads?sort=created"
          ariaLabel={`${plural(newCount, "lead novo sem contato", "leads novos sem contato")}, ${newLate} fora do prazo, abrir lista`}
        />
        <StatCard
          label="Tarefas hoje"
          value={String(tasksCount)}
          hint={tasksLate > 0 ? plural(tasksLate, "atrasada", "atrasadas") : "nenhuma atrasada"}
          tone={tasksLate > 0 ? "danger" : "neutral"}
          icon={SquareCheck}
          href="#tarefas"
          ariaLabel={`${plural(tasksCount, "tarefa para hoje", "tarefas para hoje")}, ${plural(tasksLate, "atrasada", "atrasadas")}, abrir lista`}
        />
        <StatCard
          label="Aportes 15 dias"
          value={contributionsLabel}
          hint={plural(contributions.length, "previsto", "previstos")}
          icon={HandCoins}
          href="/app/aportes?janela=15d"
          ariaLabel={`${contributionsLabel} em ${plural(contributions.length, "aporte previsto", "aportes previstos")} nos próximos 15 dias, abrir lista`}
        />
      </div>

      {queue.length > 0 ? (
        <ActionQueue items={queue} now={now} />
      ) : (
        <section
          id="tarefas"
          aria-label="Precisa de ação agora"
          className="scroll-mt-20 rounded-xl border border-border bg-card"
        >
          <EmptyState
            icon={Sun}
            title="Nada vencido. Bom dia."
            description="Nenhuma tarefa, próxima ação ou lead novo esperando por você."
            action={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="#proximos" />}
              >
                Veja os próximos 7 dias ›
              </Button>
            }
          />
        </section>
      )}

      <UpcomingByDay leads={upcomingLeads} tasks={upcomingTasks} />

      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <ContributionsPreview rows={contributions} />
        <ProjectsAlert projects={projectsAlert} />
      </div>
    </div>
  );
}
