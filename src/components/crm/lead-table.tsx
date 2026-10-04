import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { describeOverdue, formatDateTime } from "@/lib/crm/dates";
import { SEGMENT_LABELS, SOURCE_LABELS, stageLabel } from "@/lib/crm/labels";
import { leadCompany, stageInfo } from "@/lib/crm/lead-view";
import type { LeadListRow } from "@/lib/repos/leads";
import { cn } from "@/lib/utils";
import { TemperatureBadge } from "./badges";

export function LeadTable({ rows, now }: { rows: LeadListRow[]; now: Date }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Nenhum lead com esses filtros.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Segmento</TableHead>
            <TableHead>Estágio</TableHead>
            <TableHead>Temperatura</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Próxima ação</TableHead>
            <TableHead>Dono</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((lead) => {
            const info = stageInfo(lead, now);
            return (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/app/leads/${lead.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {lead.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {leadCompany(lead) ?? <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>{SEGMENT_LABELS[lead.segment]}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{stageLabel(lead.stage)}</span>
                    <span
                      className={cn(
                        "text-xs",
                        info.slaOverdue ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {info.daysInStage === 0 ? "hoje" : `${info.daysInStage} d`} · {info.slaText}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <TemperatureBadge temperature={lead.temperature} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{SOURCE_LABELS[lead.source]}</span>
                    {lead.sourceDetail ? (
                      <span className="text-muted-foreground max-w-40 truncate text-xs">
                        {lead.sourceDetail}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className={cn(info.nextActionOverdue && "text-destructive font-medium")}>
                  {lead.nextActionAt
                    ? info.nextActionOverdue
                      ? describeOverdue(lead.nextActionAt, now)
                      : formatDateTime(lead.nextActionAt)
                    : "-"}
                </TableCell>
                <TableCell>
                  {lead.ownerName ?? <span className="text-muted-foreground">sem dono</span>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
