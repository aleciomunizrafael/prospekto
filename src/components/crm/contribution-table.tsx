// Tabela de aportes (lista /app/aportes) e lista de cards (bloco do projeto e do lead), com as
// mesmas colunas e o botão do passo atual (crm-design-system.md, seção 5.2). A primeira coluna
// tem duas linhas (patrocinador · empresa / → projeto); tipo e mecanismo ficam no `title` da
// célula (e no detalhe). Os cards são uma linha de 44 px (nome · empresa | badge | valor | passo).
import { CalendarClock, HandCoins } from "lucide-react";
import Link from "next/link";
import {
  formatBRL,
  formatCalendarDate,
  calendarDateInSaoPaulo,
  diffCalendarDays,
} from "@/lib/crm/format";
import { CONTRIBUTION_TYPE_LABELS, mechanismLabel } from "@/lib/crm/enum-labels";
import type { Ctx } from "@/lib/repos/ctx";
import type { ContributionSummary } from "@/lib/repos/contributions";
import { cn } from "@/lib/utils";
import { ContributionSteps, loadContributionStepDataForRows } from "./contribution-steps";
import { DataTable, RowLink, type Column } from "./ui/data-table";
import { EmptyState } from "./ui/empty-state";
import { StatusBadge } from "./ui/status-badge";

const SOON_DAYS = 15;

function expectedSoon(c: ContributionSummary, now: Date): boolean {
  if (!c.expectedCloseAt) return false;
  if (c.status !== "proposta" && c.status !== "termo_assinado") return false;
  const days = diffCalendarDays(calendarDateInSaoPaulo(now), c.expectedCloseAt);
  return days >= 0 && days <= SOON_DAYS;
}

function Expected({ c, now }: { c: ContributionSummary; now: Date }) {
  if (!c.expectedCloseAt) return <span className="text-muted-foreground">—</span>;
  const soon = expectedSoon(c, now);
  return (
    <span className={cn("inline-flex items-center gap-1", soon && "font-medium text-warning")}>
      {soon ? <CalendarClock className="size-3.5" aria-hidden="true" /> : null}
      {formatCalendarDate(c.expectedCloseAt)}
      {soon ? <span className="sr-only">, nos próximos 15 dias</span> : null}
    </span>
  );
}

// Linha de apoio do card: quem patrocina (e a empresa) quando o título é o projeto; a empresa ou
// o tipo quando o título é o patrocinador.
function cardMeta(c: ContributionSummary, showProject: boolean, showLead: boolean): string {
  if (showProject) {
    return [showLead ? c.leadName : null, c.orgName].filter(Boolean).join(" · ");
  }
  return c.orgName ?? CONTRIBUTION_TYPE_LABELS[c.type];
}

// Server Component assíncrono: os dados do passo de cada linha são carregados uma vez aqui e
// servem à célula do desktop e ao card do celular (a DataTable renderiza os dois no HTML).
export async function ContributionTable({
  ctx,
  rows,
  showProject = true,
  showLead = true,
  showSteps = true,
  layout = "table",
  now = new Date(),
  caption = "Aportes",
  empty,
  className,
}: {
  ctx: Ctx;
  rows: ContributionSummary[];
  showProject?: boolean;
  // `false` na página do lead: o nome do patrocinador já é o título da tela.
  showLead?: boolean;
  showSteps?: boolean;
  layout?: "table" | "cards";
  now?: Date;
  caption?: string;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && layout === "cards") {
    return <p className={cn("text-sm text-muted-foreground", className)}>Nenhum aporte ainda.</p>;
  }
  const stepData = showSteps ? await loadContributionStepDataForRows(ctx, rows) : null;

  if (layout === "cards") {
    return (
      <ul className={cn("flex flex-col gap-2", className)} aria-label={caption}>
        {rows.map((c) => (
          <li
            key={c.id}
            className="relative flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors duration-120 hover:bg-surface-2 focus-within:bg-primary-soft"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
              <RowLink href={`/app/aportes/${c.id}`} className="text-sm">
                {showProject ? c.projectName : c.leadName}
              </RowLink>
              {cardMeta(c, showProject, showLead) ? (
                <span className="crm-meta min-w-0 truncate">
                  {cardMeta(c, showProject, showLead)}
                </span>
              ) : null}
            </div>
            <StatusBadge kind="contribution" value={c.status} />
            <span className="tabular-nums">
              {c.depositedAmount != null
                ? formatBRL(c.depositedAmount)
                : formatBRL(c.proposedAmount)}
              <span className="crm-meta">
                {c.depositedAt
                  ? ` em ${formatCalendarDate(c.depositedAt)}`
                  : c.expectedCloseAt
                    ? ` · prev. ${formatCalendarDate(c.expectedCloseAt)}`
                    : ""}
              </span>
            </span>
            {showSteps ? (
              <ContributionSteps
                ctx={ctx}
                contribution={c}
                data={stepData?.get(c.id)}
                variant="row"
                compact
              />
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  const columns: Column<ContributionSummary>[] = [
    {
      key: "sponsor",
      header: showProject ? "Patrocinador / projeto" : "Patrocinador",
      priority: 1,
      width: "min-w-56",
      cell: (c) => (
        <div
          className="flex min-w-0 flex-col"
          title={`${CONTRIBUTION_TYPE_LABELS[c.type]} · ${mechanismLabel(c.mechanism)}`}
        >
          <span className="flex flex-wrap items-baseline gap-x-1.5">
            <RowLink href={`/app/aportes/${c.id}`}>{c.leadName}</RowLink>
            {c.orgName ? <span className="crm-meta">{c.orgName}</span> : null}
          </span>
          {showProject ? (
            <Link
              href={`/app/projetos/${c.projectId}`}
              className="relative z-10 w-fit text-sm text-primary underline-offset-2 hover:underline"
            >
              → {c.projectName}
            </Link>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      priority: 1,
      cell: (c) => <StatusBadge kind="contribution" value={c.status} />,
    },
    {
      key: "proposed",
      header: "Proposto",
      align: "right",
      priority: 1,
      cell: (c) => formatBRL(c.proposedAmount),
    },
    {
      key: "deposited",
      header: "Depositado",
      align: "right",
      priority: 2,
      cell: (c) =>
        c.depositedAmount == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="flex flex-col items-end">
            {formatBRL(c.depositedAmount)}
            {c.depositedAt ? (
              <span className="crm-meta">{formatCalendarDate(c.depositedAt)}</span>
            ) : null}
          </span>
        ),
    },
    {
      key: "expected",
      header: "Previsão",
      priority: 2,
      cell: (c) => <Expected c={c} now={now} />,
    },
    {
      key: "receipt",
      header: "Recibo",
      priority: 3,
      cell: (c) =>
        c.receiptNumber ? (
          <span className="flex flex-col">
            <span className="crm-code">{c.receiptNumber}</span>
            {c.receiptIssuedAt ? (
              <span className="crm-meta">
                {formatCalendarDate(c.receiptIssuedAt)}
                {c.receiptSentToAccountantAt
                  ? ` · contador ${formatCalendarDate(c.receiptSentToAccountantAt)}`
                  : ""}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "commission",
      header: "Comissão",
      align: "right",
      priority: 3,
      cell: (c) =>
        c.commissionDue == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="flex flex-col items-end">
            {formatBRL(c.commissionDue)}
            {c.commissionPaidAt ? (
              <span className="crm-meta">paga {formatCalendarDate(c.commissionPaidAt)}</span>
            ) : null}
          </span>
        ),
    },
  ];
  if (showSteps) {
    columns.push({
      key: "step",
      header: "Próximo passo",
      priority: 1,
      cell: (c) => (
        <ContributionSteps
          ctx={ctx}
          contribution={c}
          data={stepData?.get(c.id)}
          variant="row"
          compact
        />
      ),
    });
  }

  return (
    <DataTable
      className={className}
      caption={caption}
      columns={columns}
      rows={rows}
      rowKey={(c) => c.id}
      rowHref={(c) => `/app/aportes/${c.id}`}
      // Cancelados em cinza (texto muted), sem opacidade na linha: o badge e a meta manteriam
      // contraste abaixo do mínimo (WCAG 1.4.3).
      rowClassName={(c) => (c.status === "cancelado" ? "text-muted-foreground" : undefined)}
      mobile={{
        primary: (c) => c.leadName,
        secondary: (c) => (
          <>
            <StatusBadge kind="contribution" value={c.status} />
            <span className="tabular-nums text-foreground">{formatBRL(c.proposedAmount)}</span>
            {c.expectedCloseAt ? <Expected c={c} now={now} /> : null}
            {showProject ? <span className="basis-full">{c.projectName}</span> : null}
          </>
        ),
        action: showSteps
          ? (c) => (
              // Só o botão do passo no card: "⋯" (comissão, cancelar) fica no detalhe do aporte.
              <ContributionSteps
                ctx={ctx}
                contribution={c}
                data={stepData?.get(c.id)}
                variant="row"
                size="touch"
                compact
                menu={false}
              />
            )
          : undefined,
      }}
      empty={
        empty ?? (
          <EmptyState
            icon={HandCoins}
            title="Nenhum aporte ainda."
            description="Quando um patrocinador aceitar a proposta, registre aqui."
          />
        )
      }
    />
  );
}
