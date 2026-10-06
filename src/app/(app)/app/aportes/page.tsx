import { CalendarClock, ChevronRight, HandCoins, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewContributionDialog } from "@/components/crm/contribution-dialogs";
import { ContributionTable } from "@/components/crm/contribution-table";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { PageHeader } from "@/components/crm/ui/page-header";
import { StatCard } from "@/components/crm/ui/stat-card";
import { Toolbar, type ToolbarChip } from "@/components/crm/ui/toolbar";
import { Button } from "@/components/ui/button";
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
import {
  contributionTotalsByProject,
  listContributionSummaries,
  type ContributionSummary,
} from "@/lib/repos/contributions";
import { listOrganizations } from "@/lib/repos/organizations";
import { listProjects } from "@/lib/repos/projects";
import { formatKpiBRL, plural } from "@/lib/crm/text";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Aportes" };

// Janela do StatCard "Previstos" e do chip `janela=15d` (decisão D15): só proposta e termo assinado
// com previsão de fechamento entre hoje e hoje + 15 dias, filtrados em memória.
const WINDOW_DAYS = 15;
const WINDOW_PARAM = "15d";
const OPEN_STATUSES: ContributionStatus[] = ["proposta", "termo_assinado"];

type Filters = {
  status?: ContributionStatus;
  q: string;
  projeto: string;
  janela: boolean;
};

function first(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function fold(value: string | null | undefined): string {
  return (value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Monta `/app/aportes?…` a partir dos filtros, omitindo os vazios (as abas e os chips trocam um
// parâmetro e preservam os outros).
function hrefWith(filters: Filters, patch: Partial<Filters> = {}): string {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.q) params.set("q", next.q);
  if (next.projeto) params.set("projeto", next.projeto);
  if (next.janela) params.set("janela", WINDOW_PARAM);
  const query = params.toString();
  return query ? `/app/aportes?${query}` : "/app/aportes";
}

// Valores dos StatCards sem centavos ("R$ 350.000", seção 7.9): os centavos não cabem em dois
// cards por linha a 390 px. Abaixo de md o número fica em 24 px (o `.crm-kpi` de 32 px não cabe em
// "R$ 1.120.000" num card de 141 px de largura útil).
const formatWhole = formatKpiBRL;

export default async function ContributionsPage({ searchParams }: PageProps<"/app/aportes">) {
  const ctx = await requireSession();
  const sp = await searchParams;
  const statusRaw = first(sp.status);
  const filters: Filters = {
    status: (CONTRIBUTION_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as ContributionStatus)
      : undefined,
    q: first(sp.q).slice(0, 120),
    projeto: first(sp.projeto),
    janela: first(sp.janela) === WINDOW_PARAM,
  };
  const openNew = first(sp.novo) === "1";
  const now = new Date();
  const today = calendarDateInSaoPaulo(now);
  const windowEnd = addCalendarDays(today, WINDOW_DAYS);

  const [all, totals, projects, sponsorOrgs] = await Promise.all([
    listContributionSummaries(ctx, { limit: 300 }),
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

  // --- Números do topo (totais somados no banco; o resto a partir das linhas carregadas) -------
  const upcoming = (c: ContributionSummary) =>
    OPEN_STATUSES.includes(c.status) &&
    !!c.expectedCloseAt &&
    c.expectedCloseAt >= today &&
    c.expectedCloseAt <= windowEnd;
  const openRows = all.filter((c) => OPEN_STATUSES.includes(c.status));
  const upcomingRows = all.filter(upcoming);
  const depositedRows = all.filter(
    (c) => c.status === "depositado" || c.status === "recibo_emitido",
  );
  const commissionRows = all.filter(
    (c) => c.status !== "cancelado" && c.commissionDue != null && !c.commissionPaidAt,
  );
  const openTotal = totals.reduce((acc, t) => acc + t.open, 0);
  const depositedTotal = totals.reduce((acc, t) => acc + t.deposited, 0);
  const upcomingTotal = upcomingRows.reduce((acc, c) => acc + c.proposedAmount, 0);
  const commissionTotal = commissionRows.reduce((acc, c) => acc + (c.commissionDue ?? 0), 0);

  // --- Filtros em memória: busca, projeto e janela valem para as abas; o status, para a tabela ---
  const q = fold(filters.q);
  const base = all
    .filter((c) => !filters.projeto || c.projectId === filters.projeto)
    .filter(
      (c) =>
        !q ||
        fold(c.leadName).includes(q) ||
        fold(c.projectName).includes(q) ||
        fold(c.orgName).includes(q),
    )
    .filter((c) => !filters.janela || upcoming(c));
  if (filters.janela) {
    base.sort((a, b) => (a.expectedCloseAt ?? "").localeCompare(b.expectedCloseAt ?? ""));
  }
  const rows = filters.status ? base.filter((c) => c.status === filters.status) : base;
  const counts = new Map<string, number>();
  for (const c of base) counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
  const filtered = Boolean(filters.q || filters.projeto || filters.janela || filters.status);

  const chips: ToolbarChip[] = [];
  if (filters.janela) {
    chips.push({ label: "Previstos em 15 dias", removeHref: hrefWith(filters, { janela: false }) });
  }
  const hidden: Record<string, string> = {};
  if (filters.status) hidden.status = filters.status;
  if (filters.janela) hidden.janela = WINDOW_PARAM;

  const tabs: { label: string; href: string; count: number; active: boolean }[] = [
    {
      label: "Todos",
      href: hrefWith(filters, { status: undefined }),
      count: base.length,
      active: !filters.status,
    },
    ...CONTRIBUTION_STATUSES.map((s) => ({
      label: CONTRIBUTION_STATUS_LABELS[s],
      href: hrefWith(filters, { status: s }),
      count: counts.get(s) ?? 0,
      active: filters.status === s,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Aportes"
        description="Propostas e aportes de patrocinadores, do termo ao recibo."
        primary={
          <NewContributionDialog
            projects={projectOptions}
            sponsorOrgs={sponsorOrgs.map((o) => ({ value: o.id, label: o.name }))}
            defaultOpen={openNew}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Em aberto"
          value={formatWhole(openTotal)}
          hint={plural(openRows.length, "proposta ou termo", "propostas e termos")}
        />
        <StatCard
          label="Previsto em 15 dias"
          value={formatWhole(upcomingTotal)}
          hint={plural(upcomingRows.length, "previsto", "previstos")}
          tone={upcomingRows.length > 0 ? "warning" : "neutral"}
          icon={CalendarClock}
          href={hrefWith({ q: "", projeto: "", janela: true })}
          ariaLabel={`${formatBRL(upcomingTotal)} previstos nos próximos 15 dias, abrir lista`}
        />
        <StatCard
          label="Depositado"
          value={formatWhole(depositedTotal)}
          hint={plural(depositedRows.length, "aporte", "aportes")}
          tone={depositedRows.length > 0 ? "success" : "neutral"}
        />
        <StatCard
          label="Comissão a receber"
          value={formatWhole(commissionTotal)}
          hint={
            commissionRows.length > 0
              ? `de ${plural(commissionRows.length, "aporte", "aportes")}`
              : "nenhuma registrada"
          }
        />
      </div>

      <nav aria-label="Status do aporte" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex min-w-max gap-1 border-b border-border text-sm">
          {tabs.map((tab) => (
            <li key={tab.label}>
              <Link
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-11 items-center gap-1.5 border-b-2 px-3 whitespace-nowrap transition-colors duration-120 hover:text-foreground",
                  tab.active
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground",
                )}
              >
                {tab.label}
                <span className="text-muted-foreground tabular-nums">{tab.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Toolbar
        action="/app/aportes"
        search={{ name: "q", placeholder: "Patrocinador, empresa ou projeto", value: filters.q }}
        filters={[
          {
            name: "projeto",
            label: "Projeto",
            value: filters.projeto,
            options: projects.map((p) => ({ value: p.id, label: p.name })),
          },
        ]}
        hidden={hidden}
        chips={chips}
        clearHref={hrefWith({ q: "", projeto: "", janela: false, status: filters.status })}
        extra={
          filters.janela ? null : (
            <Button
              variant="outline"
              size="sm"
              className="h-9 md:h-7"
              nativeButton={false}
              render={<Link href={hrefWith(filters, { janela: true })} />}
            >
              <CalendarClock aria-hidden="true" />
              Previstos em 15 dias
            </Button>
          )
        }
        mobileTitle="Filtrar aportes"
      />

      <ContributionTable
        ctx={ctx}
        rows={rows}
        layout="table"
        now={now}
        caption="Aportes"
        empty={
          filtered ? (
            <EmptyState
              icon={SearchX}
              size="sm"
              title="Nenhum aporte com esses filtros."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/app/aportes" />}
                >
                  Limpar filtros
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={HandCoins}
              title="Nenhum aporte ainda."
              description="Quando um patrocinador aceitar a proposta, registre aqui."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/app/aportes?novo=1" />}
                >
                  Novo aporte
                </Button>
              }
            />
          )
        }
      />

      <details className="group rounded-xl border border-border bg-card">
        <summary className="crm-h2 flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3">
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-120 group-open:rotate-90"
            aria-hidden="true"
          />
          Totais por projeto
          <span className="text-sm font-normal text-muted-foreground tabular-nums">
            {totals.length}
          </span>
        </summary>
        {totals.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">Nenhum aporte ainda.</p>
        ) : (
          <>
            <div className="hidden border-t border-border md:block">
              <Table>
                <caption className="sr-only">Totais de aportes por projeto</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Projeto</TableHead>
                    <TableHead scope="col" className="text-right">
                      Aportes ativos
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Em aberto
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Depositado
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Comissão registrada
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {totals.map((t) => (
                    <TableRow key={t.projectId} className="h-11">
                      <TableCell>
                        <Link
                          href={`/app/projetos/${t.projectId}`}
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {t.projectName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{t.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBRL(t.open)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(t.deposited)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(t.commissionDue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="flex flex-col divide-y divide-divider border-t border-border md:hidden">
              {totals.map((t) => (
                <li key={t.projectId} className="flex flex-col gap-1 px-4 py-3">
                  <Link
                    href={`/app/projetos/${t.projectId}`}
                    className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {t.projectName}
                  </Link>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <dt className="crm-meta">Em aberto</dt>
                    <dd className="text-right text-sm tabular-nums">{formatBRL(t.open)}</dd>
                    <dt className="crm-meta">Depositado</dt>
                    <dd className="text-right text-sm tabular-nums">{formatBRL(t.deposited)}</dd>
                    <dt className="crm-meta">Comissão registrada</dt>
                    <dd className="text-right text-sm tabular-nums">
                      {formatBRL(t.commissionDue)}
                    </dd>
                    <dt className="crm-meta">Aportes ativos</dt>
                    <dd className="text-right text-sm tabular-nums">{t.count}</dd>
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </details>

      <NewContributionDialog
        projects={projectOptions}
        sponsorOrgs={sponsorOrgs.map((o) => ({ value: o.id, label: o.name }))}
        fab
      />
    </div>
  );
}
