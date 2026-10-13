import {
  Building2,
  CircleAlert,
  Clapperboard,
  HandCoins,
  Landmark,
  SquareCheck,
  Sun,
  UserPlus,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MyTasks } from "@/components/crm/dashboard/my-tasks";
import { RecentActivities } from "@/components/crm/dashboard/recent-activities";
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
import { StatRuler } from "@/components/crm/ui/stat-ruler";
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
import { plural } from "@/lib/crm/text";
import { listOpenTasksWithLead, listRecentActivities } from "@/lib/repos/activities";
import { listContributionSummaries } from "@/lib/repos/contributions";
import { getPortfolioTotals } from "@/lib/repos/dashboard";
import {
  listLeadsWithNextActionBetween,
  listNewLeadsWithoutContact,
  listOverdueLeads,
} from "@/lib/repos/leads";
import { listProjectAlerts } from "@/lib/repos/projects";
import { listOpenTasksForOwner, type TaskRow as OwnerTaskRow } from "@/lib/repos/tasks";
import { getSession, requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Painel" };

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

// Painel (ADR-004, 6.8; regra R-13): continua a fila de trabalho e ganha, nesta ordem, a régua
// "Hoje" (os quatro medidores de sempre), a régua "Carteira" (agregados no banco), a fila
// "Precisa de ação agora", "Últimas atividades" com "Minhas tarefas", e os blocos de 7 dias,
// aportes previstos e projetos com alerta.
export default async function DashboardPage() {
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

  const [
    newLeads,
    overdue,
    dueTasks,
    upcomingTasks,
    upcomingLeads,
    contributions,
    projectsAlert,
    portfolio,
    recent,
    myTasks,
  ] = await Promise.all([
    listNewLeadsWithoutContact(ctx, 20),
    listOverdueLeads(ctx, now, 20),
    listOpenTasksWithLead(ctx, { dueTo: endOfToday, limit: 20 }),
    listOpenTasksWithLead(ctx, { dueFrom: endOfToday, dueTo: in7, limit: 20 }),
    listLeadsWithNextActionBetween(ctx, now, in7, { limit: 20 }),
    listContributionSummaries(ctx, { expectedBetween: { from: today, to: in15 }, limit: 20 }),
    listProjectAlerts(ctx, now),
    getPortfolioTotals(ctx, now),
    listRecentActivities(ctx, { limit: 8 }),
    ctx.userId
      ? listOpenTasksForOwner(ctx, { ownerUserId: ctx.userId, now, limit: 8 })
      : Promise.resolve([] as OwnerTaskRow[]),
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

  // Números da régua "Hoje" (decisão D15: só filtros que já existem).
  const overdueCount = overdue.length;
  const newCount = newLeads.length;
  const newLate = newLeads.filter((lead) => stageInfo(lead, now).slaOverdue).length;
  const tasksCount = dueTasks.length;
  const tasksLate = dueTasks.filter(
    (t) => t.dueAt && t.dueAt.getTime() < startOfToday.getTime(),
  ).length;
  const contributionsTotal = contributions.reduce((sum, c) => sum + c.proposedAmount, 0);
  const contributionsLabel = formatBRL(contributionsTotal) || "R$ 0,00";

  // Régua "Carteira": o hint "N com alerta" vem de projectsAlert, que a página já carrega para o
  // bloco "Projetos com alerta" (listProjectAlerts deriva o alerta em memória).
  const openLabel = formatBRL(portfolio.openContributionsAmount) || "R$ 0,00";
  const depositedLabel = formatBRL(portfolio.depositedYearAmount) || "R$ 0,00";
  const alerts = projectsAlert.length;

  const greeting = greetingFor(now);
  const firstName = session?.user.name?.trim().split(/\s+/)[0] ?? "";
  const title = firstName ? `${greeting}, ${firstName}.` : `${greeting}.`;
  const dateLabel = DATE_FORMAT.format(now);
  const eyebrow = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <PageHeader eyebrow={eyebrow} title={title} />

      <StatRuler label="Hoje">
        <StatCard
          variant="ruler"
          label="Vencidas"
          value={String(overdueCount)}
          hint={plural(overdueCount, "próxima ação", "próximas ações")}
          tone={overdueCount > 0 ? "danger" : "neutral"}
          icon={CircleAlert}
          href="/app/leads?sort=next_action"
          ariaLabel={`${plural(overdueCount, "próxima ação vencida", "próximas ações vencidas")}, abrir lista`}
          title={`${plural(overdueCount, "próxima ação vencida", "próximas ações vencidas")}`}
        />
        <StatCard
          variant="ruler"
          label="Sem contato"
          value={String(newCount)}
          hint={newLate > 0 ? `${newLate} fora do prazo` : "todos no prazo"}
          tone={newLate > 0 ? "danger" : "neutral"}
          icon={UserPlus}
          href="/app/leads?sort=created"
          ariaLabel={`${plural(newCount, "lead novo sem contato", "leads novos sem contato")}, ${newLate} fora do prazo, abrir lista`}
          title={`${plural(newCount, "lead novo sem contato", "leads novos sem contato")}, ${newLate} fora do prazo`}
        />
        <StatCard
          variant="ruler"
          label="Tarefas hoje"
          value={String(tasksCount)}
          hint={tasksLate > 0 ? plural(tasksLate, "atrasada", "atrasadas") : "nenhuma atrasada"}
          hintHref={tasksLate > 0 ? "/app/tarefas?atrasadas=1" : undefined}
          hintTone={tasksLate > 0 ? "danger" : "neutral"}
          tone={tasksLate > 0 ? "danger" : "neutral"}
          icon={SquareCheck}
          href="/app/tarefas?vencem=hoje"
          ariaLabel={`${plural(tasksCount, "tarefa para hoje", "tarefas para hoje")}, ${plural(tasksLate, "atrasada", "atrasadas")}, abrir tarefas`}
          title={`${plural(tasksCount, "tarefa vencida ou para hoje", "tarefas vencidas ou para hoje")}, ${plural(tasksLate, "atrasada", "atrasadas")}`}
        />
        <StatCard
          variant="ruler"
          label="Aportes 15 dias"
          value={contributionsLabel}
          hint={plural(contributions.length, "previsto", "previstos")}
          icon={HandCoins}
          href="/app/aportes?janela=15d"
          ariaLabel={`${contributionsLabel} em ${plural(contributions.length, "aporte previsto", "aportes previstos")} nos próximos 15 dias, abrir lista`}
          title={`${contributionsLabel} em ${plural(contributions.length, "aporte previsto", "aportes previstos")} nos próximos 15 dias`}
        />
      </StatRuler>

      <StatRuler label="Carteira">
        <StatCard
          variant="ruler"
          label="Organizações ativas"
          value={String(portfolio.activeOrganizations)}
          hint="com aporte nos últimos 12 meses"
          icon={Building2}
          href="/app/organizacoes"
          ariaLabel={`${plural(portfolio.activeOrganizations, "organização ativa", "organizações ativas")} com aporte nos últimos 12 meses, abrir organizações`}
          title={`${plural(portfolio.activeOrganizations, "organização", "organizações")} com aporte depositado nos últimos 12 meses`}
        />
        <StatCard
          variant="ruler"
          label="Aportes em aberto"
          value={openLabel}
          hint={`${portfolio.openContributionsCount} propostos e assinados`}
          icon={HandCoins}
          href="/app/aportes"
          ariaLabel={`${openLabel} em ${plural(portfolio.openContributionsCount, "aporte em aberto", "aportes em aberto")}, abrir aportes`}
          title={`${openLabel} em ${plural(portfolio.openContributionsCount, "aporte proposto ou com termo assinado", "aportes propostos ou com termo assinado")}`}
        />
        <StatCard
          variant="ruler"
          label="Depositado no ano"
          value={depositedLabel}
          hint={`em ${plural(portfolio.depositedYearCount, "aporte", "aportes")}`}
          icon={Landmark}
          href="/app/aportes?status=depositado"
          ariaLabel={`${depositedLabel} depositados no ano em ${plural(portfolio.depositedYearCount, "aporte", "aportes")}, abrir aportes depositados`}
          title={`${depositedLabel} depositados em ${today.slice(0, 4)} em ${plural(portfolio.depositedYearCount, "aporte", "aportes")}`}
        />
        <StatCard
          variant="ruler"
          label="Projetos captando"
          value={String(portfolio.projectsFundraising)}
          hint={alerts > 0 ? `${alerts} com alerta` : "nenhum com alerta"}
          hintTone={alerts > 0 ? "warning" : "neutral"}
          tone={alerts > 0 ? "warning" : "neutral"}
          icon={Clapperboard}
          href="/app/projetos?estagio=captando"
          ariaLabel={`${plural(portfolio.projectsFundraising, "projeto captando", "projetos captando")}, ${alerts} com alerta, abrir projetos`}
          title={`${plural(portfolio.projectsFundraising, "projeto em captação", "projetos em captação")}, ${alerts} com alerta`}
        />
      </StatRuler>

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

      {/* No celular "Minhas tarefas" vem antes de "Últimas atividades" (ADR-004, 6.8). */}
      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <RecentActivities rows={recent} now={now} className="order-2 md:order-1" />
        <MyTasks rows={myTasks} now={now} className="order-1 md:order-2" />
      </div>

      <UpcomingByDay leads={upcomingLeads} tasks={upcomingTasks} />

      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <ContributionsPreview rows={contributions} />
        <ProjectsAlert projects={projectsAlert} />
      </div>
    </div>
  );
}
