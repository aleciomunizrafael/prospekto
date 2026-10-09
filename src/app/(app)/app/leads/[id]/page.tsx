import { Mail, Shield, ShieldCheck, ShieldX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AiPanel, type AiPanelLead } from "@/components/crm/ai/ai-panel";
import { NewContributionDialog } from "@/components/crm/contribution-dialogs";
import { ContributionTable } from "@/components/crm/contribution-table";
import { ActivityForm } from "@/components/crm/forms/activity-form";
import { LeadEditDialog, type LeadEditValues } from "@/components/crm/forms/lead-edit-dialog";
import { OwnerForm } from "@/components/crm/forms/owner-form";
import {
  LeadActionBar,
  LeadMoreMenu,
  StageMoveDialog,
  type LeadStageProps,
} from "@/components/crm/forms/stage-move-dialog";
import { TaskCompleteButton } from "@/components/crm/forms/task-complete-button";
import { Callout } from "@/components/crm/ui/callout";
import { DetailLayout } from "@/components/crm/ui/detail-layout";
import { FoldsOpenOnDesktop } from "@/components/crm/ui/folds-open-on-desktop";
import { FormSection } from "@/components/crm/ui/form-section";
import { KeyValueList, type KeyValueItem } from "@/components/crm/ui/key-value-list";
import { NextStepCard } from "@/components/crm/ui/next-step-card";
import { PageHeader } from "@/components/crm/ui/page-header";
import { SlaIndicator } from "@/components/crm/ui/sla-indicator";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { Timeline } from "@/components/crm/ui/timeline";
import { LeadWhatsappButton } from "@/components/crm/whatsapp-button";
import { SimulatorDetail } from "@/components/simulator/detail";
import type { SimulatorDetailData } from "@/components/simulator/state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isAiEnabled } from "@/lib/ai/client";
import { proposeSlots } from "@/lib/ai/qualification";
import type { AiRunSnapshot, EmailBlockReason } from "@/lib/ai/types";
import { ATTRIBUTE_FIELDS, type AttributeField } from "@/lib/crm/attributes";
import {
  formatCalendarDate,
  formatCnpj,
  formatDate,
  formatDateTime,
  formatPhoneBR,
} from "@/lib/crm/format";
import {
  CONSENT_CHANNEL_LABELS,
  CONSENT_PURPOSE_LABELS,
  INTEREST_LABELS,
  LOST_REASON_LABELS,
  SEGMENT_LABELS,
  SOURCE_LABELS,
  enumLabel,
  pipelineLabel,
  tagLabel,
} from "@/lib/crm/labels";
import { leadCompany, stageInfo } from "@/lib/crm/lead-view";
import { nextStepForLead, type NextStep } from "@/lib/crm/next-step";
import { isTerminal, stageMovePlans, terminalStageOf } from "@/lib/crm/stage-moves";
import { daysInStageText } from "@/lib/crm/text";
import { whatsappHrefFor } from "@/lib/crm/whatsapp-messages";
import { CONSENT_PURPOSES, type LeadSegment } from "@/lib/domain/enums";
import { allowedContributionMechanisms } from "@/lib/domain/mechanisms";
import { isInitialStage, stageSla, type Pipeline } from "@/lib/domain/pipelines";
import { slaBusinessDays, slaDeadline } from "@/lib/domain/sla";
import { listActivities } from "@/lib/repos/activities";
import { getLatestAiRun, type AiRun } from "@/lib/repos/ai-runs";
import { consentAllows, getCurrentConsent, listConsents } from "@/lib/repos/consents";
import { listContributionSummaries } from "@/lib/repos/contributions";
import { getLeadDetail } from "@/lib/repos/leads";
import { listOrganizations } from "@/lib/repos/organizations";
import { listProjects } from "@/lib/repos/projects";
import { listSimulations } from "@/lib/repos/simulations";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";
import { parseSimulatorInput, simulate, type SimulatorResult } from "@/lib/simulator";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Lead" };

// A geração de briefing ou rascunho pela IA pode passar de 10 s; em Next 16 o maxDuration da
// página vale para as Server Actions usadas nela (route-segment-config/maxDuration.md). 60 s cabe
// no Hobby e no Pro do Vercel com Fluid compute, e a chamada ao modelo tem prazo total de 50 s
// (AI_DEADLINE_MS, inclusive retentativas) para a falha sempre ser registrada (ADR-003, seção 7.1).
export const maxDuration = 60;

function aiSnapshot(run: AiRun | null): AiRunSnapshot | null {
  if (!run || !run.output) return null;
  return {
    runId: run.id,
    output: run.output,
    data: run.data,
    model: run.model,
    createdAt: run.createdAt.toISOString(),
  };
}

function looksLikeResult(value: unknown): value is SimulatorResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "lc224" in value &&
    "warnings" in value &&
    "texts" in value
  );
}

// Título do bloco de campos do segmento (crm-design-system.md, seção 7.5, mesmas palavras do
// "Novo lead").
const SEGMENT_BLOCK_TITLE: Record<LeadSegment, string> = {
  PJ: "Empresa",
  PF: "Pessoa",
  CONT: "Escritório",
  MUN: "Município",
  PROP: "Proponente",
  ALUNO: "Aluno",
};

function attributeValue(field: AttributeField, raw: unknown): ReactNode {
  if (raw === undefined || raw === null || raw === "") return null;
  if (field.type === "date" && typeof raw === "string") return formatCalendarDate(raw);
  if (field.type === "text" || field.type === "number") return String(raw);
  return enumLabel(raw);
}

// Blocos de leitura dobráveis da lateral (seção 7.4: fechados no celular, abertos no desktop pelo
// FoldsOpenOnDesktop): FormSection collapsible com a classe `crm-fold`.
const FOLD = { collapsible: true, className: "crm-fold" } as const;

// Só estágios com prazo em dias (úteis ou corridos) sugerem uma próxima ação. Um prazo zero
// ("automático", lista de espera) devolveria o instante atual e o lead voltaria na hora para a
// fila "Precisa de ação agora" com "Ação vence hoje".
function stageHasDeadline(pipeline: Pipeline, stage: string, now: Date): boolean {
  const sla = stageSla(pipeline, stage);
  if (!sla) return false;
  if (sla.calendarDays != null) return sla.calendarDays > 0;
  return (slaBusinessDays(pipeline, stage, now) ?? 0) > 0;
}

export default async function LeadPage({ params, searchParams }: PageProps<"/app/leads/[id]">) {
  const ctx = await requireSession();
  const { id } = await params;
  const { existente, registrar } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const lead = await getLeadDetail(ctx, id);
  if (!lead) notFound();

  const now = new Date();
  const pipeline = lead.pipeline as Pipeline;
  const sponsors = pipeline === "patrocinadores";
  const [
    consents,
    simulations,
    activities,
    users,
    contributions,
    projects,
    sponsorOrgs,
    latestBrief,
    latestReply,
    contactConsent,
  ] = await Promise.all([
    listConsents(ctx, lead.id),
    listSimulations(ctx, { leadId: lead.id, limit: 10 }),
    listActivities(ctx, { leadId: lead.id, limit: 300 }),
    listTenantUsers(ctx),
    sponsors ? listContributionSummaries(ctx, { leadId: lead.id }) : Promise.resolve([]),
    sponsors ? listProjects(ctx, { limit: 500 }) : Promise.resolve([]),
    sponsors ? listOrganizations(ctx, { type: "empresa", limit: 500 }) : Promise.resolve([]),
    getLatestAiRun(ctx, { leadId: lead.id, kind: "brief" }),
    getLatestAiRun(ctx, { leadId: lead.id, kind: "reply" }),
    getCurrentConsent(ctx, lead.id, "contato_comercial"),
  ]);
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  const userNames = new Map(users.map((u) => [u.id, u.name]));
  const info = stageInfo(lead, now);
  const company = leadCompany(lead);
  const plans = stageMovePlans(pipeline, lead.stage, now).map((plan) =>
    stageHasDeadline(pipeline, plan.target.stage, now)
      ? plan
      : { ...plan, suggestedNextActionAt: null },
  );
  const suggestedNext = stageHasDeadline(pipeline, lead.stage, now)
    ? slaDeadline(pipeline, lead.stage, now)
    : null;
  const terminal = isTerminal(pipeline, lead.stage);
  const art27Done = lead.attributes.vinculo_art27_checado === true;
  const openContribution = contributions.find((c) => c.status !== "cancelado") ?? null;
  const tasks = activities.filter((a) => a.type === "tarefa");
  const nextStep = nextStepForLead(lead, tasks, plans, now);
  const whatsappHref = whatsappHrefFor({ ...lead, company });
  const userOptions = users.map((u) => ({ id: u.id, name: u.name }));

  // Painel de IA (ADR-003): sem chave, cartões desabilitados; e-mail só com consentimento de
  // contato comercial que inclua o canal e-mail e endereço com status ok (decisão P6).
  const aiEnabled = isAiEnabled();
  const slots = proposeSlots(now);
  const emailBlockReason: EmailBlockReason = !consentAllows(contactConsent)
    ? "no_consent"
    : !consentAllows(contactConsent, "email")
      ? "no_email_channel"
      : lead.emailStatus === "bounced"
        ? "email_bounced"
        : lead.emailStatus === "complained"
          ? "email_complained"
          : null;
  const aiLead: AiPanelLead = {
    id: lead.id,
    name: lead.name,
    segment: lead.segment,
    pipeline: lead.pipeline,
    stage: lead.stage,
    emailStatus: lead.emailStatus,
    hasPhone: whatsappHref !== null,
  };

  const stageProps: LeadStageProps = {
    leadId: lead.id,
    leadName: lead.name,
    pipeline,
    currentStage: lead.stage,
    daysInStage: info.daysInStage,
    isPj: lead.segment === "PJ",
    plans,
    terminalStage: terminalStageOf(pipeline),
    ownerUserId: lead.ownerUserId,
    users: userOptions,
    currentIsInitial: isInitialStage(pipeline, lead.stage),
    art27Done,
    nextActionAt: lead.nextActionAt ? lead.nextActionAt.toISOString() : null,
    orgId: lead.orgId,
    orgCnpj: lead.orgCnpj,
    openContributionProjectId: openContribution?.projectId ?? null,
  };
  const editValues: LeadEditValues = {
    leadId: lead.id,
    segment: lead.segment,
    name: lead.name,
    phone: lead.phone ?? "",
    city: lead.city ?? "",
    uf: lead.uf ?? "",
    interest: lead.interest,
    tags: lead.tags,
    attributes: lead.attributes,
  };

  const currentConsents = CONSENT_PURPOSES.map((purpose) => ({
    purpose,
    current: consents.find((c) => c.purpose === purpose) ?? null,
  }));
  const simulationCards: SimulatorDetailData[] = [];
  for (const sim of simulations) {
    const parsed = parseSimulatorInput(sim.inputs);
    if (!parsed.ok) continue;
    simulationCards.push({
      input: parsed.input,
      result: looksLikeResult(sim.outputs) ? sim.outputs : simulate(parsed.input),
      createdAt: sim.createdAt.toISOString(),
      subject: `Simulação de ${company ?? lead.name}`,
      simulationId: sim.id,
      resultUrl: null,
      gate: null,
    });
  }

  const cityUf = [lead.city, lead.uf].filter(Boolean).join("/");
  const emailLink = (
    <a
      href={`mailto:${lead.email}`}
      className="text-primary underline-offset-2 hover:underline break-all"
    >
      {lead.email}
    </a>
  );
  const registerLink = (
    <Button variant="outline" nativeButton={false} render={<a href="#registrar" />}>
      Registrar contato
    </Button>
  );
  const whatsapp = <LeadWhatsappButton lead={{ ...lead, company }} size="default" />;

  // Botão do passo (next-step.ts, `kind`): concluir tarefa, registrar contato, mover ou reativar.
  function stepAction(step: NextStep): ReactNode {
    switch (step.kind) {
      case "complete_task":
        return step.taskId ? <TaskCompleteButton activityId={step.taskId} /> : null;
      case "register_contact":
        return (
          <>
            {registerLink}
            {whatsapp}
          </>
        );
      case "first_contact":
        return (
          <>
            {whatsapp}
            {registerLink}
          </>
        );
      case "move_stage":
        return step.targetStage ? (
          <StageMoveDialog
            {...stageProps}
            defaultTarget={step.targetStage}
            trigger={
              <Button type="button" variant="outline">
                Mover para {stageLabelOf(step.targetStage)}
              </Button>
            }
          />
        ) : null;
      case "reactivate":
        return step.targetStage ? (
          <StageMoveDialog
            {...stageProps}
            defaultTarget={step.targetStage}
            trigger={
              <Button type="button" variant="outline">
                Reativar
              </Button>
            }
          />
        ) : null;
      default:
        return null;
    }
  }

  function stageLabelOf(stage: string): string {
    return plans.find((p) => p.target.stage === stage)?.target.label ?? stage;
  }

  const summaryItems: KeyValueItem[] = [
    {
      label: "Próxima ação",
      value: (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {lead.nextActionAt ? <span>{formatDateTime(lead.nextActionAt)}</span> : null}
          <SlaIndicator
            info={info}
            nextActionAt={lead.nextActionAt}
            now={now}
            stage={lead}
            variant="block"
          />
        </span>
      ),
    },
    {
      label: "Último contato",
      value: lead.lastContactAt ? formatDateTime(lead.lastContactAt) : "nenhum ainda",
    },
    {
      label: "Neste estágio",
      value:
        info.daysInStage <= 0
          ? `desde hoje (${formatDate(lead.stageEnteredAt)})`
          : `${daysInStageText(info.daysInStage)} · desde ${formatDate(lead.stageEnteredAt)}`,
    },
    {
      label: "Responsável",
      value: <OwnerForm leadId={lead.id} ownerUserId={lead.ownerUserId} users={userOptions} />,
    },
    { label: "Interesse", value: INTEREST_LABELS[lead.interest] },
    ...(terminal && lead.lostReason
      ? [
          {
            label: "Motivo de perda",
            value: `${LOST_REASON_LABELS[lead.lostReason]}${lead.lostReasonDetail ? ` · ${lead.lostReasonDetail}` : ""}`,
          },
        ]
      : []),
    ...(lead.tags.length
      ? [{ label: "Tags", value: lead.tags.map((t) => tagLabel(t)).join(", ") }]
      : []),
  ];

  const contactItems: KeyValueItem[] = [
    {
      label: "E-mail",
      value: (
        <span className="flex flex-wrap items-center gap-2">
          {emailLink}
          {lead.emailStatus !== "ok" ? (
            <Badge variant="danger">
              {lead.emailStatus === "bounced" ? "e-mail devolvido" : "reclamou de spam"}
            </Badge>
          ) : null}
        </span>
      ),
    },
    {
      label: "Telefone",
      value: lead.phone ? (
        <a href={`tel:${lead.phone}`} className="text-primary underline-offset-2 hover:underline">
          {formatPhoneBR(lead.phone)}
        </a>
      ) : (
        <LeadEditDialog
          lead={editValues}
          trigger={
            <Button type="button" variant="outline" size="sm" className="h-11 md:h-7">
              Adicionar telefone
            </Button>
          }
        />
      ),
    },
    { label: "Cidade", value: cityUf || null },
    ...(lead.message
      ? [{ label: "Mensagem", value: <span className="whitespace-pre-line">{lead.message}</span> }]
      : []),
  ];

  const originItems: KeyValueItem[] = [
    {
      label: "Origem",
      value: `${SOURCE_LABELS[lead.source]}${lead.sourceDetail ? ` · ${lead.sourceDetail}` : ""}`,
    },
    {
      label: "UTM",
      value: [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ") || null,
    },
    { label: "Referência", value: lead.referrer },
    { label: "Página de entrada", value: lead.landingPath, code: true },
    { label: "Versão do guia", value: lead.guideVersion },
    { label: "Indicado por", value: lead.referredByOrgName },
    {
      label: "Projeto de interesse",
      value: lead.projectInterestName,
      href: lead.projectInterestId ? `/app/projetos/${lead.projectInterestId}` : undefined,
    },
    { label: "Criado em", value: formatDateTime(lead.createdAt) },
  ];

  const segmentItems: KeyValueItem[] = [
    ...(lead.orgName
      ? [
          {
            label: "Organização",
            value: lead.orgName,
            href: lead.orgId ? `/app/organizacoes/${lead.orgId}` : undefined,
          },
          { label: "CNPJ (organização)", value: formatCnpj(lead.orgCnpj) || null, code: true },
        ]
      : []),
    ...ATTRIBUTE_FIELDS[lead.segment].map((f) => ({
      label: f.label,
      value: attributeValue(f, lead.attributes[f.key]),
      code: f.key === "cnpj",
      href:
        f.key === "link_material" && typeof lead.attributes[f.key] === "string"
          ? String(lead.attributes[f.key])
          : undefined,
    })),
  ];

  const header = (
    <>
      <PageHeader
        eyebrow={`${pipelineLabel(lead.pipeline)} · ${SEGMENT_LABELS[lead.segment]}`}
        title={lead.name}
        description={
          company || cityUf ? (
            <>
              {lead.orgId && lead.orgName ? (
                <Link
                  href={`/app/organizacoes/${lead.orgId}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {lead.orgName} ›
                </Link>
              ) : (
                company
              )}
              {company && cityUf ? " · " : ""}
              {cityUf}
            </>
          ) : undefined
        }
        meta={
          <>
            <StatusBadge kind="stage" value={lead.stage} pipeline={pipeline} size="md" />
            <SlaIndicator
              info={info}
              nextActionAt={lead.nextActionAt}
              now={now}
              stage={lead}
              variant="block"
            />
            <span className="inline-flex items-center gap-1.5">
              <StatusBadge kind="temperature" value={lead.temperature} size="md" />
              <span className="crm-meta">score {lead.score}</span>
            </span>
            {lead.ownerName ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Avatar name={lead.ownerName} size="sm" />
                {lead.ownerName}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">sem responsável</span>
            )}
          </>
        }
        secondary={[
          whatsapp,
          <Tooltip key="email">
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  nativeButton={false}
                  render={<a href={`mailto:${lead.email}`} aria-label="Enviar e-mail" />}
                />
              }
            >
              <Mail aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Enviar e-mail</TooltipContent>
          </Tooltip>,
          <LeadEditDialog key="editar" lead={editValues} />,
        ]}
        more={<LeadMoreMenu {...stageProps} />}
        primary={<StageMoveDialog {...stageProps} />}
      />
      {existente === "1" ? (
        <Callout tone="info" role="status">
          Esse e-mail já existia neste segmento: os dados foram atualizados em vez de criar outro
          lead.
        </Callout>
      ) : null}
    </>
  );

  const main = (
    <>
      <NextStepCard step={nextStep} action={stepAction(nextStep)} className="max-lg:order-1" />
      <AiPanel
        enabled={aiEnabled}
        lead={aiLead}
        initialBrief={aiSnapshot(latestBrief)}
        initialReply={aiSnapshot(latestReply)}
        slots={slots}
        canEmail={emailBlockReason === null}
        emailBlockReason={emailBlockReason}
        whatsappHref={whatsappHref}
        now={now.toISOString()}
      />
      <FormSection
        id="registrar"
        title="Registrar atividade"
        collapsible
        className="crm-fold max-lg:order-4"
      >
        <ActivityForm
          leadId={lead.id}
          segment={lead.segment}
          aiEnabled={aiEnabled}
          suggestedNextActionAt={suggestedNext ? suggestedNext.toISOString() : null}
          now={now.toISOString()}
          autoFocus={registrar === "1"}
        />
      </FormSection>
      <Card className="max-lg:order-9">
        <CardHeader>
          <CardTitle>Linha do tempo ({activities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline activities={activities} users={userNames} projects={projectNames} now={now} />
        </CardContent>
      </Card>
    </>
  );

  const aside = (
    <>
      <Card className="max-lg:order-2">
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <KeyValueList items={summaryItems} columns={1} />
        </CardContent>
      </Card>
      <Card className="max-lg:order-3">
        <CardHeader>
          <CardTitle>Contato</CardTitle>
          {whatsappHref ? (
            <CardAction>
              <LeadWhatsappButton lead={{ ...lead, company }} variant="icon" />
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          <KeyValueList items={contactItems} columns={1} />
        </CardContent>
      </Card>
      {sponsors ? (
        <Card className="max-lg:order-5">
          <CardHeader>
            <CardTitle>
              Aportes ({contributions.filter((c) => c.status !== "cancelado").length})
            </CardTitle>
            <CardAction>
              <NewContributionDialog
                projects={projects
                  .filter((p) => p.stage !== "arquivado")
                  .map((p) => ({
                    id: p.id,
                    name: p.name,
                    mechanism: p.mechanism,
                    allowedMechanisms: allowedContributionMechanisms(p.mechanism),
                  }))}
                sponsorOrgs={sponsorOrgs.map((o) => ({ value: o.id, label: o.name }))}
                variant="outline"
                size="sm"
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            <ContributionTable
              ctx={ctx}
              rows={contributions}
              layout="cards"
              showLead={false}
              now={now}
            />
          </CardContent>
        </Card>
      ) : null}
      <FormSection
        title={SEGMENT_BLOCK_TITLE[lead.segment]}
        {...FOLD}
        className={cn(FOLD.className, "max-lg:order-6")}
      >
        {lead.segment === "PJ" && !lead.orgName ? (
          <Callout tone="warning">
            Para chegar a Termo, cadastre a empresa com CNPJ em{" "}
            <Link href="/app/organizacoes">Organizações ›</Link>
          </Callout>
        ) : null}
        <KeyValueList items={segmentItems} columns={1} />
      </FormSection>
      <FormSection title="Origem" {...FOLD} className={cn(FOLD.className, "max-lg:order-7")}>
        <KeyValueList items={originItems} columns={1} />
      </FormSection>
      <FormSection
        title="Consentimentos"
        {...FOLD}
        className={cn(FOLD.className, "max-lg:order-8")}
      >
        <ul className="flex flex-col gap-3 text-sm">
          {currentConsents.map(({ purpose, current }) => {
            const Icon = current ? (current.granted ? ShieldCheck : ShieldX) : Shield;
            return (
              <li key={purpose} className="flex flex-col gap-1">
                <div className="flex items-start gap-2">
                  <Icon
                    aria-hidden="true"
                    className={
                      current
                        ? current.granted
                          ? "mt-0.5 size-4 shrink-0 text-success"
                          : "mt-0.5 size-4 shrink-0 text-destructive"
                        : "mt-0.5 size-4 shrink-0 text-muted-foreground"
                    }
                  />
                  {current ? (
                    <span>
                      <span className="font-medium">{CONSENT_PURPOSE_LABELS[purpose]}</span>{" "}
                      {current.granted ? "autorizado" : "revogado"} em{" "}
                      {formatDate(current.createdAt)}
                      {current.granted && current.channels.length
                        ? ` por ${current.channels.map((c) => CONSENT_CHANNEL_LABELS[c] ?? c).join(", ")}`
                        : ""}{" "}
                      (política {current.policyVersion})
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      <span className="font-medium">{CONSENT_PURPOSE_LABELS[purpose]}:</span> nunca
                      registrado
                    </span>
                  )}
                </div>
                {current ? (
                  <details className="crm-meta pl-6">
                    <summary className="flex min-h-11 cursor-pointer items-center underline-offset-2 hover:underline md:min-h-0">
                      texto integral
                    </summary>
                    <p className="mt-1 whitespace-pre-line">{current.consentText}</p>
                    <p className="mt-1">
                      Registrado em {formatDateTime(current.createdAt)} a partir de{" "}
                      {current.sourcePage}.
                    </p>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
        {consents.length > 2 ? (
          <p className="crm-meta">{consents.length} registros no histórico (nada é apagado).</p>
        ) : null}
      </FormSection>
      {simulationCards.length > 0 ? (
        <FormSection
          title={`Simulações (${simulationCards.length})`}
          {...FOLD}
          className={cn(FOLD.className, "max-lg:order-8")}
        >
          {simulationCards.map((data) => (
            <details key={data.simulationId} className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                {data.subject} · {formatDateTime(data.createdAt)}
              </summary>
              <div className="pt-4">
                <SimulatorDetail data={data} />
              </div>
            </details>
          ))}
        </FormSection>
      ) : null}
    </>
  );

  return (
    <>
      <DetailLayout
        header={header}
        main={main}
        aside={aside}
        asideLabel="Dados do lead"
        // No celular os blocos das duas colunas se intercalam (seção 7.4): os contêineres viram
        // `display: contents` e cada bloco traz a sua ordem em `max-lg:order-*`.
        className="max-lg:[&>div.grid>*]:contents"
        actionsMobile={
          <LeadActionBar
            stage={stageProps}
            edit={editValues}
            whatsappHref={whatsappHref}
            email={lead.email}
          />
        }
      />
      <FoldsOpenOnDesktop selector="details.crm-fold" minWidth="64rem" />
    </>
  );
}
