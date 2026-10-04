import type { Metadata } from "next";
import Link from "next/link";
import { NewContributionDialog } from "@/components/crm/contribution-dialogs";
import { ContributionTable } from "@/components/crm/contribution-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { addCalendarDays, calendarDateInSaoPaulo, formatBRL } from "@/lib/crm/format";
import { CONTRIBUTION_STATUS_LABELS } from "@/lib/crm/enum-labels";
import { CONTRIBUTION_STATUSES, type ContributionStatus } from "@/lib/domain/enums";
import { allowedContributionMechanisms } from "@/lib/domain/mechanisms";
import { contributionTotalsByProject, listContributionSummaries } from "@/lib/repos/contributions";
import { listOrganizations } from "@/lib/repos/organizations";
import { listProjects } from "@/lib/repos/projects";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Aportes" };

export default async function ContributionsPage({ searchParams }: PageProps<"/app/aportes">) {
  const ctx = await requireSession();
  const sp = await searchParams;
  const statusRaw = typeof sp.status === "string" ? sp.status : "";
  const status = (CONTRIBUTION_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as ContributionStatus)
    : undefined;
  const today = calendarDateInSaoPaulo(new Date());
  const [rows, upcoming, totals, projects, sponsorOrgs] = await Promise.all([
    listContributionSummaries(ctx, { status: status ? [status] : undefined, limit: 300 }),
    listContributionSummaries(ctx, {
      expectedBetween: { from: today, to: addCalendarDays(today, 15) },
      limit: 100,
    }),
    contributionTotalsByProject(ctx),
    listProjects(ctx, { limit: 500 }),
    listOrganizations(ctx, { type: "empresa", limit: 500 }),
  ]);
  const projectOptions = projects
    .filter((p) => p.stage !== "arquivado")
    .map((p) => ({
      id: p.id,
      name: p.name,
      mechanism: p.mechanism,
      allowedMechanisms: allowedContributionMechanisms(p.mechanism),
    }));

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Aportes</h1>
          <p className="text-muted-foreground text-sm">
            Propostas e aportes de patrocinadores, por status; previsões dos próximos 15 dias e
            totais por projeto.
          </p>
        </div>
        <NewContributionDialog
          projects={projectOptions}
          sponsorOrgs={sponsorOrgs.map((o) => ({ value: o.id, label: o.name }))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Previstos nos próximos 15 dias ({upcoming.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ContributionTable ctx={ctx} rows={upcoming} showSteps={false} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totais por projeto</CardTitle>
        </CardHeader>
        <CardContent>
          {totals.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum aporte ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead className="text-right">Aportes ativos</TableHead>
                  <TableHead className="text-right">Em aberto (proposto)</TableHead>
                  <TableHead className="text-right">Depositado</TableHead>
                  <TableHead className="text-right">Comissão registrada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totals.map((t) => (
                  <TableRow key={t.projectId}>
                    <TableCell>
                      <Link href={`/app/projetos/${t.projectId}`} className="underline">
                        {t.projectName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{t.count}</TableCell>
                    <TableCell className="text-right">{formatBRL(t.open)}</TableCell>
                    <TableCell className="text-right">{formatBRL(t.deposited)}</TableCell>
                    <TableCell className="text-right">{formatBRL(t.commissionDue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filtrar por status">
          <Link
            href="/app/aportes"
            className={`rounded-lg border px-3 py-2 ${!status ? "bg-muted font-medium" : ""}`}
          >
            Todos
          </Link>
          {CONTRIBUTION_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/app/aportes?status=${s}`}
              className={`rounded-lg border px-3 py-2 ${status === s ? "bg-muted font-medium" : ""}`}
            >
              {CONTRIBUTION_STATUS_LABELS[s]}
            </Link>
          ))}
        </nav>
        <ContributionTable ctx={ctx} rows={rows} />
      </div>
    </section>
  );
}
