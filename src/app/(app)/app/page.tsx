import type { Metadata } from "next";
import Link from "next/link";
import {
  ContributionsBlock,
  NewLeadsBlock,
  OverdueBlock,
  ProjectsBlock,
  TasksBlock,
  UpcomingBlock,
  type ContributionLine,
} from "@/components/crm/today";
import { addDays, addMonths } from "@/lib/crm/dates";
import { dayBounds } from "@/lib/crm/format";
import { listOpenTasksWithLead } from "@/lib/repos/activities";
import { listContributions } from "@/lib/repos/contributions";
import {
  getLead,
  listLeadsWithNextActionBetween,
  listNewLeadsWithoutContact,
  listOverdueLeads,
} from "@/lib/repos/leads";
import { listProjects } from "@/lib/repos/projects";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Hoje" };

export default async function TodayPage() {
  // Autorização em cada página (e em cada Server Action), não só no layout: layouts não
  // re-renderizam em navegação cliente e não impedem o segmento de rodar (Next 16,
  // guides/authentication.md, "Layouts and auth checks"). Coberto por tests/auth-guard.test.ts.
  const ctx = await requireSession();
  const now = new Date();
  const { end: endOfToday } = dayBounds(now);
  const in7 = addDays(endOfToday, 7);
  const in15 = addDays(endOfToday, 15);

  const [newLeads, overdue, dueTasks, upcomingTasks, upcomingLeads, openContributions, captando] =
    await Promise.all([
      listNewLeadsWithoutContact(ctx, 20),
      listOverdueLeads(ctx, now, 20),
      listOpenTasksWithLead(ctx, { dueTo: endOfToday, limit: 20 }),
      listOpenTasksWithLead(ctx, { dueFrom: endOfToday, dueTo: in7, limit: 20 }),
      listLeadsWithNextActionBetween(ctx, now, in7, { limit: 20 }),
      listContributions(ctx, { status: ["proposta", "termo_assinado"], limit: 200 }),
      listProjects(ctx, { stage: "captando", limit: 200 }),
    ]);

  const todayStr = endOfToday.toISOString().slice(0, 10);
  const in15Str = in15.toISOString().slice(0, 10);
  const projectNames = new Map(captando.map((p) => [p.id, p.name]));
  const contributions: ContributionLine[] = [];
  for (const c of openContributions) {
    if (!c.expectedCloseAt || c.expectedCloseAt < todayStr || c.expectedCloseAt > in15Str) continue;
    if (contributions.length >= 20) break;
    const lead = await getLead(ctx, c.leadId);
    contributions.push({
      ...c,
      leadName: lead?.name ?? null,
      projectName: projectNames.get(c.projectId) ?? null,
    });
  }
  contributions.sort((a, b) => (a.expectedCloseAt ?? "").localeCompare(b.expectedCloseAt ?? ""));

  const sixMonths = addMonths(now, 6).toISOString().slice(0, 10);
  const projectsAlert = captando
    .filter(
      (p) =>
        (p.fundraisingDeadline && p.fundraisingDeadline < sixMonths) ||
        (p.approvedAmount && p.approvedAmount > 0 && p.raisedAmount / p.approvedAmount < 0.1),
    )
    .slice(0, 20);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Hoje</h1>
          <p className="text-muted-foreground text-sm">
            O que precisa de atenção, do mais urgente ao menos. Abra o lead para registrar o
            contato.
          </p>
        </div>
        <Link href="/app/leads/novo" className="text-sm underline underline-offset-4">
          Novo lead
        </Link>
      </div>
      <NewLeadsBlock leads={newLeads} now={now} />
      <OverdueBlock leads={overdue} now={now} />
      <TasksBlock title="Tarefas vencidas e de hoje" tasks={dueTasks} now={now} tone="urgent" />
      <UpcomingBlock leads={upcomingLeads} />
      <TasksBlock title="Tarefas dos próximos 7 dias" tasks={upcomingTasks} now={now} />
      <ContributionsBlock rows={contributions} />
      <ProjectsBlock projects={projectsAlert} now={now} />
    </div>
  );
}
