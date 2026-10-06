import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { ClaimButton } from "@/components/crm/forms/claim-button";
import { DataTable, RowLink, type Column } from "@/components/crm/ui/data-table";
import { SlaIndicator } from "@/components/crm/ui/sla-indicator";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { leadFiltersToQuery, type LeadFilters } from "@/lib/crm/filters";
import { SEGMENT_LABELS, SOURCE_LABELS } from "@/lib/crm/labels";
import { leadCompany, stageInfo } from "@/lib/crm/lead-view";
import { isTerminalStage, type Pipeline } from "@/lib/domain/pipelines";
import type { LeadListRow } from "@/lib/repos/leads";
import { cn } from "@/lib/utils";

// Tabela de leads (crm-design-system.md, seção 7.3) sobre a DataTable: cinco colunas no desktop
// (Nome com empresa · segmento, Estágio, Próxima ação ordenável, Origem, Dono) e cards no celular.
// A linha inteira abre o lead pelo link do nome; "Assumir" (lead sem responsável, ClaimButton) fica
// por cima do link (`relative z-10`) e cai no detalhe com o dono atribuído.

function CompanyLine({ lead, className }: { lead: LeadListRow; className?: string }) {
  const company = leadCompany(lead);
  return (
    <span className={cn("crm-meta min-w-0 truncate", className)}>
      {company ? `${company} · ` : ""}
      {SEGMENT_LABELS[lead.segment]}
    </span>
  );
}

function NameCell({ lead }: { lead: LeadListRow }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="truncate">{lead.name}</span>
      <StatusBadge kind="temperature" value={lead.temperature} size="sm" />
    </span>
  );
}

export function LeadTable({
  rows,
  now,
  filters,
  empty,
  footer,
}: {
  rows: LeadListRow[];
  now: Date;
  filters: LeadFilters;
  empty: ReactNode;
  footer?: ReactNode;
}) {
  const href = (lead: LeadListRow) => `/app/leads/${lead.id}`;
  const sortedByNextAction = filters.sort === "next_action";
  const columns: Column<LeadListRow>[] = [
    {
      key: "name",
      header: "Nome",
      cell: (lead) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <RowLink href={href(lead)}>
            <NameCell lead={lead} />
          </RowLink>
          <CompanyLine lead={lead} />
        </div>
      ),
    },
    {
      key: "stage",
      header: "Estágio",
      width: "w-44",
      cell: (lead) => <StatusBadge kind="stage" value={lead.stage} pipeline={lead.pipeline} />,
    },
    {
      key: "next_action",
      header: "Próxima ação",
      width: "w-64",
      sort: {
        param: "sort",
        value: "next_action",
        active: sortedByNextAction ? "asc" : undefined,
        href: `/app/leads${leadFiltersToQuery({ ...filters, sort: "next_action", page: 1 })}`,
      },
      cell: (lead) => (
        <SlaIndicator
          info={stageInfo(lead, now)}
          nextActionAt={lead.nextActionAt}
          now={now}
          stage={lead}
        />
      ),
    },
    {
      key: "source",
      header: "Origem",
      priority: 3,
      width: "w-44",
      cell: (lead) => (
        <div className="flex min-w-0 flex-col">
          <span>{SOURCE_LABELS[lead.source]}</span>
          {lead.sourceDetail ? (
            <span className="crm-meta max-w-40 truncate" title={lead.sourceDetail}>
              {lead.sourceDetail}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "owner",
      header: "Dono",
      priority: 2,
      width: "w-28",
      cell: (lead) =>
        lead.ownerName ? (
          <Avatar name={lead.ownerName} size="sm" />
        ) : (
          <ClaimButton leadId={lead.id} size="sm" />
        ),
    },
  ];

  return (
    <DataTable
      caption="Leads"
      columns={columns}
      rows={rows}
      rowHref={href}
      rowKey={(lead) => lead.id}
      // Perdidos ficam em cinza (texto em muted, 5,9:1), nunca com opacidade na linha inteira: a
      // meta e o badge perderiam o contraste mínimo (WCAG 1.4.3).
      rowClassName={(lead) =>
        isTerminalStage(lead.pipeline as Pipeline, lead.stage) ? "text-muted-foreground" : undefined
      }
      mobile={{
        primary: (lead) => <NameCell lead={lead} />,
        // Dois andares de meta: estágio + prazo, depois empresa · segmento (linha inteira).
        secondary: (lead) => (
          <>
            <StatusBadge kind="stage" value={lead.stage} pipeline={lead.pipeline} />
            <SlaIndicator
              info={stageInfo(lead, now)}
              nextActionAt={lead.nextActionAt}
              now={now}
              stage={lead}
            />
            <CompanyLine lead={lead} className="basis-full" />
          </>
        ),
        action: (lead) => (lead.ownerUserId ? null : <ClaimButton leadId={lead.id} size="touch" />),
      }}
      empty={empty}
      footer={footer}
    />
  );
}
