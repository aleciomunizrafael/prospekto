import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { formatDate } from "@/lib/crm/format";
import { shortProgressText } from "@/lib/crm/prospecting-view";
import { plural } from "@/lib/crm/text";
import type { ProspectingListSummary } from "@/lib/repos/prospecting";
import { DataTable, RowLink, type Column } from "../ui/data-table";
import { Meter } from "../ui/meter";

// Índice das listas de prospecção (ADR-004, 6.6) sobre a DataTable: nome (link real) com a
// região, responsável, progresso (Meter com texto), reuniões e data. No celular, nome + região,
// progresso e reuniões. Server Component puro: `empty` chega da página (o "Nova lista" é cliente).
export function ListTable({ lists, empty }: { lists: ProspectingListSummary[]; empty: ReactNode }) {
  const href = (l: ProspectingListSummary) => `/app/prospeccao/${l.id}`;
  const columns: Column<ProspectingListSummary>[] = [
    {
      key: "name",
      header: "Nome",
      cell: (l) => (
        <span className="flex min-w-0 flex-col">
          <RowLink href={href(l)}>{l.name}</RowLink>
          {l.region ? <span className="crm-meta">{l.region}</span> : null}
        </span>
      ),
    },
    {
      key: "assignee",
      header: "Responsável",
      priority: 2,
      cell: (l) =>
        l.assigneeName ? (
          <span className="inline-flex items-center gap-2">
            <Avatar name={l.assigneeName} size="sm" />
            <span>{l.assigneeName}</span>
          </span>
        ) : (
          <span className="crm-meta">sem responsável</span>
        ),
    },
    {
      key: "progress",
      header: "Progresso",
      cell: (l) => (
        <Meter
          size="sm"
          value={l.contacted}
          max={l.total}
          label={`Progresso de ${l.name}`}
          text={shortProgressText(l)}
        />
      ),
    },
    {
      key: "meetings",
      header: "Reuniões",
      align: "right",
      width: "w-24",
      cell: (l) => (l.meetings > 0 ? l.meetings : "—"),
    },
    {
      key: "created",
      header: "Criada em",
      priority: 3,
      width: "w-28",
      cell: (l) => formatDate(l.createdAt),
    },
  ];
  return (
    <DataTable
      caption="Listas de prospecção"
      columns={columns}
      rows={lists}
      rowHref={href}
      rowKey={(l) => l.id}
      mobile={{
        primary: (l) => l.name,
        secondary: (l) => (
          <>
            {l.region ? <span>{l.region}</span> : null}
            <span>{shortProgressText(l)}</span>
          </>
        ),
        trailing: (l) => (
          <span className="tabular-nums">{plural(l.meetings, "reunião", "reuniões")}</span>
        ),
      }}
      empty={empty}
    />
  );
}
