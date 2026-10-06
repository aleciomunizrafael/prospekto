import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ContributionHeaderMenu,
  RecordCommissionDialog,
} from "@/components/crm/contribution-dialogs";
import { ContributionSteps, contributionFlowSteps } from "@/components/crm/contribution-steps";
import { ActionBarMobile } from "@/components/crm/ui/action-bar-mobile";
import { Callout } from "@/components/crm/ui/callout";
import { DetailLayout } from "@/components/crm/ui/detail-layout";
import { KeyValueList, type KeyValueItem } from "@/components/crm/ui/key-value-list";
import { NextStepCard } from "@/components/crm/ui/next-step-card";
import { PageHeader } from "@/components/crm/ui/page-header";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { StepFlow } from "@/components/crm/ui/step-flow";
import { Timeline } from "@/components/crm/ui/timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatCalendarDate, formatDateTime } from "@/lib/crm/format";
import {
  CONTRIBUTION_TYPE_LABELS,
  LOST_REASON_LABELS,
  mechanismLabel,
} from "@/lib/crm/enum-labels";
import { nextStepFor, nextStepForContribution } from "@/lib/crm/next-step";
import { commissionLimitsFor, maxCommissionFor } from "@/lib/domain/commission";
import type { IncentiveMechanism } from "@/lib/domain/enums";
import { listActivities } from "@/lib/repos/activities";
import {
  contributionStepBlockers,
  getContributionSummary,
  listContributions,
} from "@/lib/repos/contributions";
import { getProject } from "@/lib/repos/projects";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Aporte" };

// Detalhe do aporte (crm-design-system.md, seção 7.9): valor primeiro no título, fluxo de cinco
// passos com as datas, "Próximo passo" com o diálogo do passo atual, dados sem vazios e histórico.
export default async function ContributionPage({ params }: PageProps<"/app/aportes/[id]">) {
  const ctx = await requireSession();
  const { id } = await params;
  const c = await getContributionSummary(ctx, id);
  if (!c) notFound();
  const now = new Date();
  const [activities, users, blockers, project, siblings] = await Promise.all([
    listActivities(ctx, { contributionId: c.id, limit: 100 }),
    listTenantUsers(ctx),
    contributionStepBlockers(ctx, c),
    getProject(ctx, c.projectId),
    listContributions(ctx, { projectId: c.projectId, limit: 500 }),
  ]);

  const cancelled = c.status === "cancelado";
  const wasDeposited = c.status === "depositado" || c.status === "recibo_emitido";
  const step = cancelled
    ? null
    : nextStepFor(c.status, c.receiptSentToAccountantAt, c.commissionDue);
  const stepBlockers = step ? (blockers[step] ?? []) : [];
  const nextStep = nextStepForContribution(c, blockers, now);
  const lostReasonLabel = c.lostReason ? LOST_REASON_LABELS[c.lostReason] : null;

  // Contexto da comissão (regra R-8), o mesmo que contribution-steps.tsx monta para o "⋯".
  const mechanism = (project?.mechanism ?? c.mechanism) as IncentiveMechanism;
  const projectCommissionSoFar = siblings
    .filter((s) => s.id !== c.id && s.status !== "cancelado")
    .reduce((acc, s) => acc + (s.commissionDue ?? 0), 0);
  const canRecordCommission = wasDeposited && blockers.registrar_comissao.length === 0;
  const commissionButton = canRecordCommission ? (
    <RecordCommissionDialog
      contributionId={c.id}
      blockers={blockers.registrar_comissao}
      size="sm"
      commission={{
        depositedAmount: c.depositedAmount,
        maxByPercent:
          c.depositedAmount == null ? null : maxCommissionFor(c.depositedAmount, mechanism),
        contractedPercent: project?.commissionPct ?? null,
        fundraisingFeeAmount: project?.fundraisingFeeAmount ?? null,
        projectCommissionSoFar,
        capPerProject: commissionLimitsFor(mechanism)?.capPerProject ?? null,
        currentDue: c.commissionDue,
        currentPaidAt: c.commissionPaidAt,
      }}
    />
  ) : null;
  const commissionValue =
    c.commissionDue == null && !commissionButton ? null : (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {c.commissionDue != null ? (
          <span className="tabular-nums">
            {formatBRL(c.commissionDue)}
            <span className="crm-meta">
              {c.commissionPaidAt
                ? ` · paga em ${formatCalendarDate(c.commissionPaidAt)}`
                : " · a pagar"}
            </span>
          </span>
        ) : null}
        {commissionButton}
      </span>
    );

  const items: KeyValueItem[] = [
    { label: "Patrocinador", value: c.leadName, href: `/app/leads/${c.leadId}` },
    {
      label: "Empresa patrocinadora",
      value: c.orgName,
      href: c.orgId ? `/app/organizacoes/${c.orgId}` : undefined,
    },
    { label: "Tipo", value: CONTRIBUTION_TYPE_LABELS[c.type] },
    { label: "Mecanismo do aporte", value: mechanismLabel(c.mechanism) },
    { label: "Valor proposto", value: formatBRL(c.proposedAmount) },
    { label: "Previsão de fechamento", value: formatCalendarDate(c.expectedCloseAt) },
    { label: "Termo assinado em", value: formatCalendarDate(c.termSignedAt) },
    { label: "Dados bancários enviados em", value: formatCalendarDate(c.bankDetailsSentAt) },
    {
      label: "Depósito",
      value: c.depositedAt
        ? `${formatBRL(c.depositedAmount)} em ${formatCalendarDate(c.depositedAt)}`
        : null,
    },
    {
      label: "Recibo",
      value: c.receiptNumber,
      code: true,
      hint: c.receiptIssuedAt ? `emitido em ${formatCalendarDate(c.receiptIssuedAt)}` : undefined,
    },
    {
      label: "Recibo enviado ao contador em",
      value: formatCalendarDate(c.receiptSentToAccountantAt),
    },
    { label: "Comissão", value: commissionValue },
    { label: "Contrapartidas", value: c.counterpartsDelivered ? "entregues" : "não entregues" },
    { label: "Motivo do cancelamento", value: lostReasonLabel },
    { label: "Notas", value: c.notes },
    { label: "Criado em", value: formatDateTime(c.createdAt) },
  ];

  const userNames = new Map(users.map((u) => [u.id, u.name]));
  const projectNames = new Map([[c.projectId, c.projectName]]);
  const title = `${formatBRL(c.proposedAmount)} · ${c.leadName} → ${c.projectName}`;

  const viewLead = (
    <Button
      key="lead"
      variant="outline"
      nativeButton={false}
      render={<Link href={`/app/leads/${c.leadId}`} />}
    >
      Ver lead
    </Button>
  );
  const viewProject = (
    <Button
      key="projeto"
      variant="outline"
      nativeButton={false}
      render={<Link href={`/app/projetos/${c.projectId}`} />}
    >
      Ver projeto
    </Button>
  );

  return (
    <DetailLayout
      asideLabel="Dados do aporte"
      header={
        // O último item do breadcrumb (o título inteiro) precisa poder encolher a 390 px; o
        // Breadcrumb compartilhado não dá `min-w-0` aos itens (anotado para a Fase 3).
        <div className="flex flex-col gap-4 [&_[data-slot=breadcrumb-item]]:max-w-full [&_[data-slot=breadcrumb-item]]:min-w-0 [&_[data-slot=breadcrumb-page]]:min-w-0">
          <PageHeader
            breadcrumb={[{ label: "Aportes", href: "/app/aportes" }]}
            backHref="/app/aportes"
            backLabel="Voltar para Aportes"
            eyebrow={`Aporte em ${c.projectName} · ${CONTRIBUTION_TYPE_LABELS[c.type]} · ${mechanismLabel(c.mechanism)}`}
            title={title}
            meta={
              <>
                <StatusBadge kind="contribution" value={c.status} size="md" />
                {c.orgName ? (
                  <Link
                    href={c.orgId ? `/app/organizacoes/${c.orgId}` : "/app/organizacoes"}
                    className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                  >
                    {c.orgName} ›
                  </Link>
                ) : null}
              </>
            }
            secondary={[
              viewLead,
              viewProject,
              ...(cancelled
                ? []
                : [
                    <ContributionHeaderMenu
                      key="mais"
                      contributionId={c.id}
                      blockers={blockers.cancelar}
                      wasDeposited={wasDeposited}
                    />,
                  ]),
            ]}
          />
          {cancelled ? (
            <Callout tone="danger" title="Aporte cancelado">
              {lostReasonLabel ? `Motivo: ${lostReasonLabel}.` : "Sem motivo registrado."}
              {c.notes ? ` ${c.notes}` : ""}
            </Callout>
          ) : null}
        </div>
      }
      main={
        <>
          <section
            aria-label="Etapas do aporte"
            className="rounded-xl border border-border bg-card p-4 md:p-5"
          >
            <StepFlow
              steps={contributionFlowSteps(c, step, stepBlockers.length > 0)}
              blockers={stepBlockers}
            />
          </section>
          <NextStepCard
            step={nextStep}
            action={
              cancelled ? null : <ContributionSteps ctx={ctx} contribution={c} variant="row" />
            }
          />
          <Card>
            <CardHeader>
              <CardTitle>
                Histórico{" "}
                <span className="text-sm font-normal text-muted-foreground tabular-nums">
                  {activities.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline
                activities={activities}
                users={userNames}
                projects={projectNames}
                now={now}
                limit={50}
              />
            </CardContent>
          </Card>
        </>
      }
      aside={
        <Card>
          <CardHeader>
            <CardTitle>Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyValueList items={items} columns={1} />
          </CardContent>
        </Card>
      }
      actionsMobile={
        <ActionBarMobile
          primary={
            cancelled ? (
              <Button
                variant="default"
                size="touch"
                nativeButton={false}
                render={<Link href={`/app/projetos/${c.projectId}`} />}
              >
                Ver projeto
              </Button>
            ) : (
              <ContributionSteps ctx={ctx} contribution={c} variant="row" size="touch" />
            )
          }
          secondary={
            cancelled ? undefined : (
              <Button
                variant="outline"
                size="touch"
                nativeButton={false}
                render={<Link href={`/app/projetos/${c.projectId}`} />}
              >
                Ver projeto
              </Button>
            )
          }
        />
      }
    />
  );
}
