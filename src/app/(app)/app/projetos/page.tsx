import {
  Check,
  CircleAlert,
  Clapperboard,
  Globe,
  Plus,
  SearchX,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Fab } from "@/components/crm/shell/fab";
import { DataTable, RowLink, type Column } from "@/components/crm/ui/data-table";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { Meter } from "@/components/crm/ui/meter";
import { PageHeader } from "@/components/crm/ui/page-header";
import { StatCard } from "@/components/crm/ui/stat-card";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { Toolbar, type ToolbarChip } from "@/components/crm/ui/toolbar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatBRL, formatCalendarDate } from "@/lib/crm/format";
import { MECHANISM_LABELS, mechanismLabel, optionsFrom, stageLabel } from "@/lib/crm/enum-labels";
import { PROJECT_ALERT_TONES } from "@/lib/crm/status-tones";
import { INCENTIVE_MECHANISMS } from "@/lib/domain/enums";
import { STAGES } from "@/lib/domain/pipelines";
import { listProjectSummaries, type ProjectSummary } from "@/lib/repos/projects";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Projetos" };

// Lista de projetos (crm-design-system.md, seção 7.7): quatro números da carteira, filtros que
// aplicam no change e uma tabela com barra de captado e alertas como ícone com texto para
// leitores de tela. Os parâmetros q, estagio, mecanismo, arquivados e alertas não mudaram.
type Filters = {
  q: string;
  estagio: string;
  mecanismo: string;
  arquivados: boolean;
  alertas: boolean;
};

function hrefFor(f: Filters): string {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.estagio) params.set("estagio", f.estagio);
  if (f.mecanismo) params.set("mecanismo", f.mecanismo);
  if (f.arquivados) params.set("arquivados", "1");
  if (f.alertas) params.set("alertas", "1");
  const query = params.toString();
  return query ? `/app/projetos?${query}` : "/app/projetos";
}

// Valores em reais sem centavos nos números grandes ("R$ 1.170.000").
const KPI_BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
// Nas colunas de valor o "R$" fica só no cabeçalho.
const AMOUNT = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// KPI com 20 px no celular (2 × 2) e 32 px a partir de md.
const KPI_RESPONSIVE =
  "[&_.crm-kpi]:text-xl [&_.crm-kpi]:leading-7 md:[&_.crm-kpi]:text-[2rem] md:[&_.crm-kpi]:leading-9";

function Dash({ label }: { label?: string }) {
  return (
    <span className="text-muted-foreground" aria-label={label}>
      —
    </span>
  );
}

function daysText(days: number | null): string {
  if (days == null) return "";
  if (days < 0) return days === -1 ? "vencido há 1 dia" : `vencido há ${-days} dias`;
  if (days === 0) return "vence hoje";
  return days === 1 ? "1 dia restante" : `${days} dias restantes`;
}

// Alerta da regra R-13 como ícone: texto sempre presente para leitores de tela e Tooltip ao
// passar o mouse (nunca a badge cortada da tabela antiga).
function AlertMark({ kind }: { kind: "prazo" | "captacao" }) {
  const { icon: Icon, label } = PROJECT_ALERT_TONES[kind];
  const text = kind === "prazo" ? "menos de 6 meses de prazo" : `${label} captado`;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex items-center text-warning" />}>
        <Icon className="size-4" aria-hidden="true" />
        <span className="sr-only">Alerta: {text}</span>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

function Raised({ p, size }: { p: ProjectSummary; size: "sm" | "md" }) {
  const alert = p.alerts.includes("captacao");
  const title = `${formatBRL(p.raisedAmount)} captado${
    p.approvedAmount != null ? ` de ${formatBRL(p.approvedAmount)}` : ""
  }`;
  if (!p.approvedAmount) {
    return (
      <span className="tabular-nums" title={title}>
        {formatBRL(p.raisedAmount)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap" title={title}>
      <Meter
        value={p.raisedAmount}
        max={p.approvedAmount}
        label={`Captado de ${p.name}`}
        tone={alert ? "warning" : "neutral"}
        size={size}
        className="whitespace-nowrap"
      />
      {alert ? <AlertMark kind="captacao" /> : null}
    </span>
  );
}

function Deadline({ p, compact }: { p: ProjectSummary; compact?: boolean }) {
  if (!p.fundraisingDeadline) return <Dash label="sem prazo" />;
  const overdue = p.daysRemaining != null && p.daysRemaining < 0;
  const alert = p.alerts.includes("prazo");
  return (
    <span className={cn("flex", compact ? "flex-row items-center gap-1" : "flex-col")}>
      <span
        className={cn(
          "inline-flex items-center gap-1 tabular-nums",
          overdue && "font-medium text-destructive",
        )}
      >
        {overdue ? <CircleAlert className="size-3.5" aria-hidden="true" /> : null}
        {formatCalendarDate(p.fundraisingDeadline)}
        {alert ? <AlertMark kind="prazo" /> : null}
      </span>
      {p.daysRemaining != null ? (
        <span className={cn("crm-meta whitespace-nowrap", overdue && "text-destructive")}>
          {compact ? "· " : ""}
          {daysText(p.daysRemaining)}
        </span>
      ) : null}
    </span>
  );
}

// Interruptores "Só com alerta" e "Mostrar arquivados" (seção 7.7): no desktop são links que
// alternam o parâmetro; na folha do celular, caixas de seleção enviadas pelo "Aplicar".
function ToggleFilter({
  name,
  label,
  active,
  href,
}: {
  name: "alertas" | "arquivados";
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <>
      <Link
        href={href}
        className={cn(
          "hidden h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors duration-120 md:inline-flex",
          active
            ? "border-primary/40 bg-primary-soft text-primary"
            : "border-input bg-background text-foreground hover:bg-muted",
        )}
      >
        {active ? <Check className="size-3.5" aria-hidden="true" /> : null}
        {label}
        {active ? <span className="sr-only"> (ativo; remover)</span> : null}
      </Link>
      <label className="flex min-h-11 items-center gap-3 text-base md:hidden">
        <input
          type="checkbox"
          name={name}
          value="1"
          defaultChecked={active}
          className="size-5 accent-primary"
        />
        {label}
      </label>
    </>
  );
}

export default async function ProjectsPage({ searchParams }: PageProps<"/app/projetos">) {
  const ctx = await requireSession();
  const sp = await searchParams;
  const filters: Filters = {
    q: typeof sp.q === "string" ? sp.q.trim() : "",
    estagio: typeof sp.estagio === "string" ? sp.estagio : "",
    mecanismo: typeof sp.mecanismo === "string" ? sp.mecanismo : "",
    arquivados: sp.arquivados === "1",
    alertas: sp.alertas === "1",
  };
  const { q, estagio, mecanismo, arquivados, alertas } = filters;
  const rows = await listProjectSummaries(ctx, {
    search: q || undefined,
    stage: (STAGES.projetos as readonly string[]).includes(estagio) ? estagio : undefined,
    mechanism: (INCENTIVE_MECHANISMS as readonly string[]).includes(mecanismo)
      ? mecanismo
      : undefined,
    includeArchived: arquivados,
    alertsOnly: alertas,
  });

  const totals = rows.reduce(
    (acc, p) => ({
      approved: acc.approved + (p.approvedAmount ?? 0),
      raised: acc.raised + p.raisedAmount,
      balance: acc.balance + (p.balance ?? 0),
      alerts: acc.alerts + (p.alerts.length > 0 ? 1 : 0),
    }),
    { approved: 0, raised: 0, balance: 0, alerts: 0 },
  );
  const raisedPct =
    totals.approved > 0 ? Math.round((totals.raised / totals.approved) * 100) : null;
  const filtered = Boolean(q || estagio || mecanismo || arquivados || alertas);

  const chips: ToolbarChip[] = [];
  if (alertas)
    chips.push({ label: "Só com alerta", removeHref: hrefFor({ ...filters, alertas: false }) });
  if (arquivados) {
    chips.push({
      label: "Mostrar arquivados",
      removeHref: hrefFor({ ...filters, arquivados: false }),
    });
  }

  const columns: Column<ProjectSummary>[] = [
    {
      key: "name",
      header: "Projeto",
      priority: 1,
      cell: (p) => (
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1.5">
            <RowLink href={`/app/projetos/${p.id}`}>{p.name}</RowLink>
            {p.publishedOnSite ? (
              <Globe
                className="size-3.5 shrink-0 text-success"
                role="img"
                aria-label="Publicado no site"
              />
            ) : null}
          </span>
          <span className="crm-meta">{p.proponentName}</span>
        </div>
      ),
    },
    {
      key: "stage",
      header: "Estágio",
      priority: 1,
      cell: (p) => <StatusBadge kind="stage" pipeline="projetos" value={p.stage} />,
    },
    {
      key: "mechanism",
      header: "Mecanismo",
      priority: 3,
      cell: (p) => <span className="text-muted-foreground">{mechanismLabel(p.mechanism)}</span>,
    },
    {
      key: "approved",
      header: "Aprovado (R$)",
      align: "right",
      priority: 2,
      cell: (p) =>
        p.approvedAmount == null ? (
          <Dash label="sem valor aprovado" />
        ) : (
          AMOUNT.format(p.approvedAmount)
        ),
    },
    {
      key: "raised",
      header: "Captado",
      priority: 1,
      width: "w-44",
      cell: (p) => <Raised p={p} size="md" />,
    },
    {
      key: "balance",
      header: "Saldo (R$)",
      align: "right",
      priority: 2,
      cell: (p) =>
        p.balance == null ? <Dash label="sem saldo calculado" /> : AMOUNT.format(p.balance),
    },
    {
      key: "deadline",
      header: "Prazo",
      priority: 1,
      cell: (p) => <Deadline p={p} />,
    },
  ];

  const empty: ReactNode = filtered ? (
    <EmptyState
      icon={SearchX}
      size="sm"
      title="Nenhum projeto com esses filtros."
      action={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/app/projetos" />}
        >
          Limpar filtros
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Clapperboard}
      title="Nenhum projeto na carteira."
      description="Cadastre o projeto aprovado ou em elaboração para acompanhar prazo, captação e comissão."
      action={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/app/projetos/novo" />}
        >
          Novo projeto
        </Button>
      }
    />
  );

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Projetos"
        primary={
          <Button nativeButton={false} render={<Link href="/app/projetos/novo" />}>
            <Plus aria-hidden="true" />
            Novo projeto
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Aprovado"
          value={KPI_BRL.format(totals.approved)}
          hint={rows.length === 1 ? "1 projeto" : `${rows.length} projetos`}
          className={KPI_RESPONSIVE}
        />
        <StatCard
          label="Captado"
          value={KPI_BRL.format(totals.raised)}
          hint={raisedPct == null ? "sem valor aprovado" : `${raisedPct} % do aprovado`}
          className={KPI_RESPONSIVE}
        />
        <StatCard
          label="Saldo a captar"
          value={KPI_BRL.format(totals.balance)}
          className={KPI_RESPONSIVE}
        />
        <StatCard
          label="Com alerta"
          value={String(totals.alerts)}
          hint="prazo curto ou captação baixa"
          tone={totals.alerts > 0 ? "warning" : "neutral"}
          href="/app/projetos?alertas=1"
          icon={TriangleAlert}
          ariaLabel={`${totals.alerts} ${totals.alerts === 1 ? "projeto" : "projetos"} com alerta, abrir lista`}
          className={KPI_RESPONSIVE}
        />
      </div>

      <Toolbar
        action="/app/projetos"
        search={{ name: "q", placeholder: "Projeto ou proponente", value: q }}
        filters={[
          {
            name: "estagio",
            label: "Estágio",
            value: estagio,
            options: STAGES.projetos.map((s) => ({ value: s, label: stageLabel(s) })),
          },
          {
            name: "mecanismo",
            label: "Mecanismo",
            value: mecanismo,
            options: optionsFrom(MECHANISM_LABELS),
          },
        ]}
        extra={
          <>
            <ToggleFilter
              name="alertas"
              label="Só com alerta"
              active={alertas}
              href={hrefFor({ ...filters, alertas: !alertas })}
            />
            <ToggleFilter
              name="arquivados"
              label="Mostrar arquivados"
              active={arquivados}
              href={hrefFor({ ...filters, arquivados: !arquivados })}
            />
          </>
        }
        chips={chips}
        clearHref="/app/projetos"
        mobileTitle="Filtrar projetos"
      />

      <DataTable
        caption="Projetos da carteira"
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        rowHref={(p) => `/app/projetos/${p.id}`}
        rowClassName={(p) => (p.stage === "arquivado" ? "opacity-70" : undefined)}
        mobile={{
          primary: (p) => (
            <span className="inline-flex items-center gap-1.5">
              {p.name}
              {p.publishedOnSite ? (
                <Globe
                  className="size-3.5 shrink-0 text-success"
                  role="img"
                  aria-label="Publicado no site"
                />
              ) : null}
            </span>
          ),
          secondary: (p) => (
            <>
              <StatusBadge kind="stage" pipeline="projetos" value={p.stage} />
              <span className="basis-full">{p.proponentName}</span>
              <span className="basis-full">
                <Deadline p={p} compact />
              </span>
            </>
          ),
          trailing: (p) => <Raised p={p} size="sm" />,
        }}
        empty={empty}
      />

      <Fab href="/app/projetos/novo" label="Novo projeto" />
    </section>
  );
}
