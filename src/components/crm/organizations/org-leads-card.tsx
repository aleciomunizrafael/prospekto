import { Link2 } from "lucide-react";
import Link from "next/link";
import { LinkLeadDialog, UnlinkLeadMenu } from "@/components/crm/organization-dialogs";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { SlaIndicator } from "@/components/crm/ui/sla-indicator";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/crm/format";
import { stageInfo } from "@/lib/crm/lead-view";
import type { LeadSegment } from "@/lib/domain/enums";
import type { Option } from "@/components/crm/project-forms/action-form";
import type { OrganizationLead } from "@/lib/repos/organizations";

// "Leads e aportes" da ficha da organização (ADR-004, 6.9): os leads vinculados com o estágio, o
// prazo (SlaIndicator com o stageEnteredAt real), o valor do aporte aberto quando existe e o "⋯"
// de desvincular; rodapé "ver no quadro ›"; vazio com "Vincular lead". Componente puro.

export const BOARD_HREF = "/app/leads?pipeline=patrocinadores&view=quadro";

function LeadRow({ orgId, lead, now }: { orgId: string; lead: OrganizationLead; now: Date }) {
  const info = stageInfo({ ...lead, segment: lead.segment as LeadSegment, attributes: {} }, now);
  return (
    <li className="flex min-h-11 items-start justify-between gap-2 py-2 first:pt-0 last:pb-0">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm">
          <Link href={`/app/leads/${lead.id}`} className="font-medium hover:underline">
            {lead.name}
          </Link>
          {lead.openContributionAmount != null ? (
            <span className="crm-meta ml-2 tabular-nums">
              {formatBRL(lead.openContributionAmount)}
            </span>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <StatusBadge kind="stage" value={lead.stage} pipeline={lead.pipeline} />
          <SlaIndicator info={info} nextActionAt={lead.nextActionAt} now={now} stage={lead} />
        </span>
      </span>
      <UnlinkLeadMenu orgId={orgId} leadId={lead.id} leadName={lead.name} />
    </li>
  );
}

export function OrgLeadsCard({
  orgId,
  leads,
  contacts,
  now,
  className,
}: {
  orgId: string;
  leads: OrganizationLead[];
  // Contatos da organização para o "Vincular lead" (contato correspondente).
  contacts: Option[];
  now: Date;
  className?: string;
}) {
  return (
    <Card id="leads" className={className}>
      <CardHeader>
        <CardTitle id="leads-titulo">Leads e aportes ({leads.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <EmptyState
            icon={Link2}
            size="sm"
            title="Nenhum lead vinculado."
            description="Vincule um lead do CRM para ver aqui o estágio e a próxima ação."
            action={<LinkLeadDialog orgId={orgId} contacts={contacts} size="sm" />}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col divide-y divide-divider">
              {leads.map((lead) => (
                <LeadRow key={lead.id} orgId={orgId} lead={lead} now={now} />
              ))}
            </ul>
            <Link
              href={BOARD_HREF}
              className="flex min-h-11 items-center border-t border-divider text-sm font-medium text-primary hover:underline md:min-h-0 md:pt-3"
            >
              ver no quadro ›
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
