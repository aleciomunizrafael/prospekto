import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContributionSteps } from "@/components/crm/contribution-steps";
import { ContributionStatusBadge } from "@/components/crm/contribution-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatCalendarDate, formatDateTime } from "@/lib/crm/format";
import {
  CONTRIBUTION_TYPE_LABELS,
  LOST_REASON_LABELS,
  mechanismLabel,
} from "@/lib/crm/enum-labels";
import { listActivities } from "@/lib/repos/activities";
import { getContributionSummary } from "@/lib/repos/contributions";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Aporte" };

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

export default async function ContributionPage({ params }: PageProps<"/app/aportes/[id]">) {
  const ctx = await requireSession();
  const { id } = await params;
  const c = await getContributionSummary(ctx, id);
  if (!c) notFound();
  const activities = await listActivities(ctx, { contributionId: c.id, limit: 50 });

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link href="/app/aportes" className="text-muted-foreground text-sm underline">
          Aportes
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">
            Aporte de {c.leadName} em {c.projectName}
          </h1>
          <ContributionStatusBadge status={c.status} />
        </div>
        <p className="text-muted-foreground">
          {CONTRIBUTION_TYPE_LABELS[c.type]} · {mechanismLabel(c.mechanism)} ·{" "}
          <Link href={`/app/leads/${c.leadId}`} className="underline">
            abrir o lead
          </Link>{" "}
          ·{" "}
          <Link href={`/app/projetos/${c.projectId}`} className="underline">
            abrir o projeto
          </Link>
        </p>
      </div>

      <ContributionSteps ctx={ctx} contribution={c} />

      <Card>
        <CardHeader>
          <CardTitle>Dados do aporte</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Item label="Valor proposto" value={formatBRL(c.proposedAmount)} />
            <Item label="Previsão de fechamento" value={formatCalendarDate(c.expectedCloseAt)} />
            <Item label="Empresa patrocinadora" value={c.orgName} />
            <Item label="Termo assinado em" value={formatCalendarDate(c.termSignedAt)} />
            <Item
              label="Dados bancários enviados em"
              value={formatCalendarDate(c.bankDetailsSentAt)}
            />
            <Item
              label="Depósito"
              value={
                c.depositedAt
                  ? `${formatBRL(c.depositedAmount)} em ${formatCalendarDate(c.depositedAt)}`
                  : null
              }
            />
            <Item
              label="Recibo"
              value={
                c.receiptNumber
                  ? `${c.receiptNumber} em ${formatCalendarDate(c.receiptIssuedAt)}`
                  : null
              }
            />
            <Item
              label="Recibo enviado ao contador em"
              value={formatCalendarDate(c.receiptSentToAccountantAt)}
            />
            <Item
              label="Comissão"
              value={
                c.commissionDue == null
                  ? null
                  : `${formatBRL(c.commissionDue)}${c.commissionPaidAt ? ` (paga em ${formatCalendarDate(c.commissionPaidAt)})` : " (a pagar)"}`
              }
            />
            <Item
              label="Contrapartidas entregues"
              value={c.counterpartsDelivered ? "Sim" : "Não"}
            />
            <Item
              label="Motivo do cancelamento"
              value={c.lostReason ? LOST_REASON_LABELS[c.lostReason] : null}
            />
            <div className="sm:col-span-3">
              <Item label="Notas" value={c.notes} />
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma atividade ainda.</p>
          ) : (
            <ul className="divide-y text-sm">
              {activities.map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    <Badge variant="outline" className="mr-2">
                      {a.type}
                    </Badge>
                    {a.subject}
                  </span>
                  <span className="text-muted-foreground">{formatDateTime(a.occurredAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
