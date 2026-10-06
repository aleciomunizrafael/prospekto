import { ExternalLink, Globe } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { NewContributionDialog } from "@/components/crm/contribution-dialogs";
import { ContributionSteps } from "@/components/crm/contribution-steps";
import { ContributionTable } from "@/components/crm/contribution-table";
import {
  MoveProjectStageDialog,
  ProjectActionBar,
  ProjectHeaderActions,
  type MoveDestination,
  type ProjectActionsProps,
} from "@/components/crm/project-dialogs";
import type { ProjectFormValues } from "@/components/crm/project-form";
import { Callout } from "@/components/crm/ui/callout";
import { DetailLayout } from "@/components/crm/ui/detail-layout";
import { KeyValueList, type KeyValueItem } from "@/components/crm/ui/key-value-list";
import { Meter } from "@/components/crm/ui/meter";
import { NextStepCard } from "@/components/crm/ui/next-step-card";
import { PageHeader } from "@/components/crm/ui/page-header";
import { StatCard } from "@/components/crm/ui/stat-card";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { Timeline } from "@/components/crm/ui/timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatCalendarDate, formatDateTime } from "@/lib/crm/format";
import { mechanismLabel, stageLabel } from "@/lib/crm/enum-labels";
import { daysBetween } from "@/lib/crm/dates";
import { nextStepForProject, type NextStep } from "@/lib/crm/next-step";
import { PROJECT_ALERT_TONES } from "@/lib/crm/status-tones";
import { daysRemainingText, formatKpiBRL } from "@/lib/crm/text";
import { allowedContributionMechanisms } from "@/lib/domain/mechanisms";
import { STAGES, isStageOf, isTerminalStage, stageIndex } from "@/lib/domain/pipelines";
import { listActivities } from "@/lib/repos/activities";
import { listContributionSummaries } from "@/lib/repos/contributions";
import { listOrganizations } from "@/lib/repos/organizations";
import { getProjectDetail, missingForProjectMove } from "@/lib/repos/projects";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Projeto" };

// Detalhe do projeto (crm-design-system.md, seção 7.7): cabeçalho com estágio e alertas, cinco
// números, "o que eu faço agora?", aportes em uma linha cada, linha do tempo humanizada e a
// lateral com dados, comissão e publicação.
const PERCENT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

// Destinos do "Mover para": próximo estágio, retorno previsto (encerrado -> elaboração,
// arquivado -> prospecção) e voltar um estágio. Arquivar fica numa confirmação própria.
function destinationsFor(stage: string): { to: string; kind: MoveDestination["kind"] }[] {
  const order = STAGES.projetos as readonly string[];
  const i = stageIndex("projetos", stage);
  const out: { to: string; kind: MoveDestination["kind"] }[] = [];
  if (i >= 0 && i + 1 < order.length && !isTerminalStage("projetos", order[i + 1])) {
    out.push({ to: order[i + 1], kind: "next" });
  }
  if (stage === "encerrado") out.push({ to: "elaboracao", kind: "return" });
  if (stage === "arquivado") out.push({ to: "prospeccao", kind: "return" });
  if (i > 0 && stage !== "arquivado") out.push({ to: order[i - 1], kind: "back" });
  return out;
}

function externalLink(href: string | null | undefined, label: string): ReactNode {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
    >
      {label}
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  );
}

export default async function ProjectPage({ params }: PageProps<"/app/projetos/[id]">) {
  const ctx = await requireSession();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const now = new Date();
  const project = await getProjectDetail(ctx, id, now);
  if (!project) notFound();
  const [contributions, proponents, sponsorOrgs, users, activities] = await Promise.all([
    listContributionSummaries(ctx, { projectId: project.id, limit: 300 }),
    listOrganizations(ctx, { type: "proponente", limit: 500 }),
    listOrganizations(ctx, { type: "empresa", limit: 500 }),
    listTenantUsers(ctx),
    listActivities(ctx, { projectId: project.id, limit: 100 }),
  ]);
  const userOptions = users.map((u) => ({ value: u.id, label: u.name }));
  const userNames = new Map(users.map((u) => [u.id, u.name]));
  const projectNames = new Map([[project.id, project.name]]);
  // O assunto gravado pelo repositório traz as chaves dos estágios ("movido de elaboracao para
  // inscrito"); na tela o assunto vira "Projeto movido para Inscrito" e a Timeline mostra
  // "Elaboração → Inscrito" por baixo (humanize-activity.ts). Nada muda no banco.
  const timelineActivities = activities.map((a) => {
    if (a.type !== "sistema" || !a.data || typeof a.data !== "object") return a;
    const data = a.data as Record<string, unknown>;
    if (typeof data.to !== "string" || data.reason || !isStageOf("projetos", data.to)) return a;
    return { ...a, subject: `Projeto movido para ${stageLabel(data.to)}` };
  });
  const destinations: MoveDestination[] = destinationsFor(project.stage).map((d) => ({
    ...d,
    missing: missingForProjectMove(project, d.to),
  }));
  const activeContributions = contributions.filter((c) => c.status !== "cancelado");
  const nextStep = nextStepForProject(project, contributions, destinations, now);
  const stepContribution = nextStep.contributionId
    ? contributions.find((c) => c.id === nextStep.contributionId)
    : undefined;

  const fee = project.fundraisingFeeAmount;
  const commissionOverFee = fee != null && project.commissionTotal > fee;
  const commissionOverTenPct =
    project.approvedAmount != null && project.commissionTotal > project.approvedAmount * 0.1;
  const commissionOver = commissionOverFee || commissionOverTenPct;
  const deadlineOverdue = project.daysRemaining != null && project.daysRemaining < 0;
  const deadlineAlert = project.alerts.includes("prazo");
  const raisedAlert = project.alerts.includes("captacao");
  const canPublish = project.stage === "captando";

  const daysInStage = Math.max(0, daysBetween(project.stageEnteredAt, now));
  const moveProps = {
    projectId: project.id,
    projectName: project.name,
    stage: project.stage,
    daysInStage,
    destinations,
    users: userOptions,
  };
  // Só os campos do formulário vão para o cliente (nada de tenant ou ids internos a mais).
  const editValues: ProjectFormValues = {
    id: project.id,
    proponentOrgId: project.proponentOrgId,
    name: project.name,
    slug: project.slug,
    mechanism: project.mechanism,
    processNumber: project.processNumber,
    approvedAmount: project.approvedAmount,
    fundraisingDeadline: project.fundraisingDeadline,
    fundraisingFeeAmount: project.fundraisingFeeAmount,
    commissionPct: project.commissionPct,
    city: project.city,
    uf: project.uf,
    culturalSegment: project.culturalSegment,
    summary: project.summary,
    counterparts: project.counterparts,
    deckUrl: project.deckUrl,
    salicUrl: project.salicUrl,
    reportDueAt: project.reportDueAt,
    ownerUserId: project.ownerUserId,
  };
  const actionProps: ProjectActionsProps = {
    projectId: project.id,
    slug: project.slug,
    stage: project.stage,
    daysInStage,
    publishedOnSite: project.publishedOnSite,
    destinations,
    archiveMissing:
      project.stage === "arquivado" ? [] : missingForProjectMove(project, "arquivado"),
    project: editValues,
    proponents: proponents.map((p) => ({ value: p.id, label: p.name })),
    users: userOptions,
  };
  // Sólido só na barra do celular (ação primária lá); outline no card e no NextStepCard, pois
  // "Mover para" é a primária do cabeçalho (decisão D5).
  const newContributionProps = {
    projects: [
      {
        id: project.id,
        name: project.name,
        mechanism: project.mechanism,
        allowedMechanisms: allowedContributionMechanisms(project.mechanism),
      },
    ],
    sponsorOrgs: sponsorOrgs.map((o) => ({ value: o.id, label: o.name })),
    fixedProjectId: project.id,
  };
  const newContribution = (
    <NewContributionDialog {...newContributionProps} variant="outline" size="sm" />
  );
  const newContributionMobile = <NewContributionDialog {...newContributionProps} />;

  // Botão do passo (next-step.ts, `kind`): o diálogo do aporte, um novo aporte ou "Mover para".
  function stepAction(step: NextStep): ReactNode {
    switch (step.kind) {
      case "contribution_step":
        return stepContribution ? (
          <ContributionSteps ctx={ctx} contribution={stepContribution} variant="row" compact />
        ) : null;
      case "new_contribution":
        return newContribution;
      case "move_project":
        return step.targetStage && destinations.length > 0 ? (
          <MoveProjectStageDialog
            {...moveProps}
            defaultTarget={step.targetStage}
            trigger={
              <Button type="button" variant="outline">
                Mover para {stageLabel(step.targetStage)}
              </Button>
            }
          />
        ) : null;
      default:
        return null;
    }
  }

  const dataItems: KeyValueItem[] = [
    { label: "Número do processo", value: project.processNumber, code: true },
    {
      label: "Cidade e segmento",
      value: [[project.city, project.uf].filter(Boolean).join("/"), project.culturalSegment]
        .filter(Boolean)
        .join(" · "),
    },
    { label: "Responsável", value: project.ownerName },
    { label: "Data limite do relatório", value: formatCalendarDate(project.reportDueAt) },
    { label: "Deck", value: externalLink(project.deckUrl, "Abrir deck") },
    { label: "SALIC", value: externalLink(project.salicUrl, "Abrir no SALIC") },
    { label: "Endereço no site", value: `/projetos/${project.slug}`, code: true },
    { label: "No estágio desde", value: formatDateTime(project.stageEnteredAt) },
    { label: "Resumo público", value: project.summary },
    { label: "Contrapartidas", value: project.counterparts },
  ];

  const commissionItems: KeyValueItem[] = [
    {
      label: "Percentual contratado",
      value: project.commissionPct == null ? null : `${PERCENT.format(project.commissionPct)} %`,
    },
    { label: "Rubrica de captação aprovada", value: formatBRL(fee) },
    ...(fee == null || fee <= 0
      ? [{ label: "Comissões registradas", value: formatBRL(project.commissionTotal) }]
      : []),
  ];

  const publicationItems: KeyValueItem[] = [
    {
      label: "Estado",
      value: project.publishedOnSite
        ? "Publicado no site"
        : canPublish
          ? "Não publicado"
          : "Não publicado · só em Captando",
    },
    { label: "Autorizado por", value: project.publishAuthorizedBy },
    { label: "Autorizado em", value: formatDateTime(project.publishAuthorizedAt) },
  ];

  const header = (
    <>
      <PageHeader
        eyebrow={`${project.proponentName} · ${mechanismLabel(project.mechanism)}`}
        title={project.name}
        meta={
          <>
            <StatusBadge kind="stage" pipeline="projetos" value={project.stage} size="md" />
            {project.alerts.map((alert) => {
              const { tone, icon: Icon, label } = PROJECT_ALERT_TONES[alert];
              return (
                <Badge key={alert} variant={tone}>
                  <Icon aria-hidden="true" />
                  {label}
                </Badge>
              );
            })}
            {project.publishedOnSite ? (
              <Badge variant="success">
                <Globe aria-hidden="true" />
                Publicado no site
              </Badge>
            ) : null}
          </>
        }
        secondary={[<ProjectHeaderActions key="acoes" {...actionProps} />]}
        primary={destinations.length > 0 ? <MoveProjectStageDialog {...moveProps} /> : undefined}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Aprovado"
          value={project.approvedAmount == null ? "—" : formatKpiBRL(project.approvedAmount)}
          hint={project.approvedAmount == null ? "ainda sem valor aprovado" : undefined}
        />
        <StatCard
          label="Captado"
          value={formatKpiBRL(project.raisedAmount)}
          tone={raisedAlert ? "warning" : "neutral"}
          extra={
            project.approvedAmount ? (
              <Meter
                value={project.raisedAmount}
                max={project.approvedAmount}
                label="Captado sobre o valor aprovado"
                tone={raisedAlert ? "warning" : "neutral"}
                size="sm"
                className="whitespace-nowrap"
              />
            ) : undefined
          }
          hint={raisedAlert ? "abaixo de 10 % captado" : undefined}
        />
        <StatCard
          label="Saldo a captar"
          value={project.balance == null ? "—" : formatKpiBRL(project.balance)}
        />
        <StatCard
          label="Prazo de captação"
          value={formatCalendarDate(project.fundraisingDeadline) || "—"}
          hint={
            project.fundraisingDeadline
              ? `${daysRemainingText(project.daysRemaining)}${deadlineAlert ? " · menos de 6 meses" : ""}`
              : "sem prazo informado"
          }
          tone={deadlineOverdue ? "danger" : deadlineAlert ? "warning" : "neutral"}
        />
        <StatCard
          label="Comissão"
          value={formatKpiBRL(project.commissionTotal)}
          hint={fee != null ? `de ${formatKpiBRL(fee)} da rubrica` : "rubrica não informada"}
          tone={commissionOver ? "danger" : "neutral"}
          className="col-span-2 md:col-span-1"
        />
      </div>
    </>
  );

  const main = (
    <>
      <NextStepCard step={nextStep} action={stepAction(nextStep)} />

      <Card id="aportes">
        <CardHeader>
          <CardTitle>Aportes ({activeContributions.length})</CardTitle>
          <CardAction>{newContribution}</CardAction>
        </CardHeader>
        <CardContent>
          <ContributionTable
            ctx={ctx}
            rows={contributions}
            showProject={false}
            layout="cards"
            now={now}
            caption={`Aportes de ${project.name}`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linha do tempo ({activities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline
            activities={timelineActivities}
            users={userNames}
            projects={projectNames}
            now={now}
          />
        </CardContent>
      </Card>
    </>
  );

  const aside = (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Dados do projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <KeyValueList items={dataItems} columns={1} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comissão</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {fee != null && fee > 0 ? (
            <Meter
              value={project.commissionTotal}
              max={fee}
              label="Comissão registrada sobre a rubrica de captação"
              text={`${formatBRL(project.commissionTotal)} de ${formatBRL(fee)} (${PERCENT.format(
                Math.min(100, (project.commissionTotal / fee) * 100),
              )} %)`}
              tone={commissionOver ? "danger" : "neutral"}
              className="flex-wrap"
            />
          ) : null}
          <KeyValueList items={commissionItems} columns={1} />
          {commissionOver ? (
            <Callout tone="danger" role="alert">
              {commissionOverFee
                ? "A soma das comissões ultrapassa a rubrica de captação aprovada. "
                : ""}
              {commissionOverTenPct
                ? "A soma das comissões ultrapassa 10 % do valor aprovado. "
                : ""}
              Confira antes de cobrar (IN MinC 29/2026, art. 19).
            </Callout>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publicação</CardTitle>
          {project.publishedOnSite ? (
            <CardAction>
              <Link
                href={`/projetos/${project.slug}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
              >
                Ver no site
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </Link>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          <KeyValueList items={publicationItems} columns={1} />
        </CardContent>
      </Card>
    </>
  );

  return (
    <DetailLayout
      header={header}
      main={main}
      aside={aside}
      asideLabel="Dados do projeto"
      actionsMobile={<ProjectActionBar {...actionProps} newContribution={newContributionMobile} />}
    />
  );
}
