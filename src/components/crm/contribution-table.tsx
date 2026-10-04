// Tabela de aportes (bloco do projeto e lista /app/aportes), com as mesmas colunas e passos.
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, formatCalendarDate } from "@/lib/crm/format";
import {
  CONTRIBUTION_STATUS_LABELS,
  CONTRIBUTION_TYPE_LABELS,
  mechanismLabel,
} from "@/lib/crm/enum-labels";
import type { Ctx } from "@/lib/repos/ctx";
import type { ContributionSummary } from "@/lib/repos/contributions";
import { ContributionSteps } from "./contribution-steps";

export function ContributionStatusBadge({ status }: { status: ContributionSummary["status"] }) {
  const variant =
    status === "cancelado"
      ? "destructive"
      : status === "recibo_emitido" || status === "depositado"
        ? "default"
        : "secondary";
  return <Badge variant={variant}>{CONTRIBUTION_STATUS_LABELS[status]}</Badge>;
}

export function ContributionTable({
  ctx,
  rows,
  showProject = true,
  showSteps = true,
}: {
  ctx: Ctx;
  rows: ContributionSummary[];
  showProject?: boolean;
  showSteps?: boolean;
}) {
  if (rows.length === 0) return <p className="text-muted-foreground text-sm">Nenhum aporte.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patrocinador</TableHead>
          {showProject ? <TableHead>Projeto</TableHead> : null}
          <TableHead>Tipo / mecanismo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Proposto</TableHead>
          <TableHead className="text-right">Depositado</TableHead>
          <TableHead>Previsão</TableHead>
          <TableHead>Recibo</TableHead>
          <TableHead className="text-right">Comissão</TableHead>
          {showSteps ? <TableHead>Passos</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id}>
            <TableCell>
              <Link href={`/app/aportes/${c.id}`} className="font-medium underline">
                {c.leadName}
              </Link>
              <span className="text-muted-foreground block text-xs">
                {c.leadSegment}
                {c.orgName ? ` · ${c.orgName}` : ""}
              </span>
            </TableCell>
            {showProject ? (
              <TableCell>
                <Link href={`/app/projetos/${c.projectId}`} className="underline">
                  {c.projectName}
                </Link>
              </TableCell>
            ) : null}
            <TableCell>
              {CONTRIBUTION_TYPE_LABELS[c.type]}
              <span className="text-muted-foreground block text-xs">
                {mechanismLabel(c.mechanism)}
              </span>
            </TableCell>
            <TableCell>
              <ContributionStatusBadge status={c.status} />
            </TableCell>
            <TableCell className="text-right">{formatBRL(c.proposedAmount)}</TableCell>
            <TableCell className="text-right">
              {formatBRL(c.depositedAmount)}
              {c.depositedAt ? (
                <span className="text-muted-foreground block text-xs">
                  {formatCalendarDate(c.depositedAt)}
                </span>
              ) : null}
            </TableCell>
            <TableCell>{formatCalendarDate(c.expectedCloseAt)}</TableCell>
            <TableCell>
              {c.receiptNumber ?? ""}
              {c.receiptIssuedAt ? (
                <span className="text-muted-foreground block text-xs">
                  {formatCalendarDate(c.receiptIssuedAt)}
                  {c.receiptSentToAccountantAt
                    ? ` · contador ${formatCalendarDate(c.receiptSentToAccountantAt)}`
                    : ""}
                </span>
              ) : null}
            </TableCell>
            <TableCell className="text-right">
              {formatBRL(c.commissionDue)}
              {c.commissionPaidAt ? (
                <span className="text-muted-foreground block text-xs">
                  paga {formatCalendarDate(c.commissionPaidAt)}
                </span>
              ) : null}
            </TableCell>
            {showSteps ? (
              <TableCell>
                <ContributionSteps ctx={ctx} contribution={c} />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
