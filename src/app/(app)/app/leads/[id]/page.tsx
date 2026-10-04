import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { StageBadge, TemperatureBadge } from "@/components/crm/badges";
import { ActivityForm } from "@/components/crm/forms/activity-form";
import { LeadEditDialog } from "@/components/crm/forms/lead-edit-dialog";
import { OwnerForm } from "@/components/crm/forms/owner-form";
import { StageMoveDialog } from "@/components/crm/forms/stage-move-dialog";
import { LeadWhatsappButton } from "@/components/crm/whatsapp-button";
import { SimulatorDetail } from "@/components/simulator/detail";
import type { SimulatorDetailData } from "@/components/simulator/state";
import { Button } from "@/components/ui/button";
import { ATTRIBUTE_FIELDS } from "@/lib/crm/attributes";
import { describeOverdue } from "@/lib/crm/dates";
import { formatBRL, formatDate, formatDateTime, formatPhoneBR } from "@/lib/crm/format";
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
import { isTerminal, stageMovePlans, terminalStageOf } from "@/lib/crm/stage-moves";
import { CONSENT_PURPOSES } from "@/lib/domain/enums";
import { isInitialStage, type Pipeline } from "@/lib/domain/pipelines";
import { slaDeadline } from "@/lib/domain/sla";
import { listActivities } from "@/lib/repos/activities";
import { listConsents } from "@/lib/repos/consents";
import { listContributions } from "@/lib/repos/contributions";
import { getLeadDetail } from "@/lib/repos/leads";
import { listProjects } from "@/lib/repos/projects";
import { listSimulations } from "@/lib/repos/simulations";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";
import { parseSimulatorInput, simulate, type SimulatorResult } from "@/lib/simulator";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Lead" };

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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function LeadPage({ params, searchParams }: PageProps<"/app/leads/[id]">) {
  const ctx = await requireSession();
  const { id } = await params;
  const { existente } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const lead = await getLeadDetail(ctx, id);
  if (!lead) notFound();

  const now = new Date();
  const pipeline = lead.pipeline as Pipeline;
  const [consents, simulations, activities, users, contributions, projects] = await Promise.all([
    listConsents(ctx, lead.id),
    listSimulations(ctx, { leadId: lead.id, limit: 10 }),
    listActivities(ctx, { leadId: lead.id, limit: 300 }),
    listTenantUsers(ctx),
    pipeline === "patrocinadores"
      ? listContributions(ctx, { leadId: lead.id })
      : Promise.resolve([]),
    pipeline === "patrocinadores" ? listProjects(ctx, { limit: 500 }) : Promise.resolve([]),
  ]);
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  const userNames = new Map(users.map((u) => [u.id, u.name]));
  const info = stageInfo(lead, now);
  const company = leadCompany(lead);
  const plans = stageMovePlans(pipeline, lead.stage, now);
  const suggestedNext = slaDeadline(pipeline, lead.stage, now);
  const currentConsents = CONSENT_PURPOSES.map((purpose) => ({
    purpose,
    current: consents.find((c) => c.purpose === purpose) ?? null,
  }));
  const art27Done = lead.attributes.vinculo_art27_checado === true;
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

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-muted-foreground text-sm">
        <Link href="/app/leads" className="underline-offset-4 hover:underline">
          Leads
        </Link>{" "}
        / {lead.name}
      </nav>
      {existente === "1" ? (
        <p
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          Já existia um lead com este e-mail no mesmo segmento: os dados foram atualizados em vez de
          criar outro.
        </p>
      ) : null}

      <header className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">{lead.name}</h1>
            <p className="text-muted-foreground text-sm">
              {SEGMENT_LABELS[lead.segment]}
              {company ? ` · ${company}` : ""} · {pipelineLabel(lead.pipeline)}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <StageBadge stage={lead.stage} />
              <span
                className={cn(
                  "text-xs",
                  info.slaOverdue ? "text-destructive font-medium" : "text-muted-foreground",
                )}
              >
                {info.daysInStage === 0 ? "entrou hoje" : `${info.daysInStage} dias no estágio`} ·{" "}
                {info.slaText}
              </span>
              <TemperatureBadge temperature={lead.temperature} />
              <span className="text-muted-foreground text-xs">score {lead.score}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StageMoveDialog
              leadId={lead.id}
              currentStage={lead.stage}
              isPj={lead.segment === "PJ"}
              plans={plans}
              terminalStage={terminalStageOf(pipeline)}
              ownerUserId={lead.ownerUserId}
              users={users.map((u) => ({ id: u.id, name: u.name }))}
              currentIsInitial={isInitialStage(pipeline, lead.stage)}
              art27Done={art27Done}
            />
            <LeadEditDialog
              lead={{
                leadId: lead.id,
                segment: lead.segment,
                name: lead.name,
                phone: lead.phone ?? "",
                city: lead.city ?? "",
                uf: lead.uf ?? "",
                interest: lead.interest,
                tags: lead.tags,
                attributes: lead.attributes,
              }}
            />
          </div>
        </div>
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <Row label="Próxima ação">
            <span className={cn(info.nextActionOverdue && "text-destructive font-medium")}>
              {lead.nextActionAt ? describeOverdue(lead.nextActionAt, now) : "não definida"}
              {lead.nextActionAt && info.nextActionOverdue
                ? ` (${formatDateTime(lead.nextActionAt)})`
                : ""}
            </span>
          </Row>
          <Row label="Último contato">
            {lead.lastContactAt ? formatDateTime(lead.lastContactAt) : "nenhum ainda"}
          </Row>
          <Row label="Responsável">
            {lead.ownerName ?? <span className="text-muted-foreground">sem dono</span>}
          </Row>
          <Row label="Interesse">{INTEREST_LABELS[lead.interest]}</Row>
          {isTerminal(pipeline, lead.stage) && lead.lostReason ? (
            <Row label="Motivo de perda">
              {LOST_REASON_LABELS[lead.lostReason]}
              {lead.lostReasonDetail ? ` · ${lead.lostReasonDetail}` : ""}
            </Row>
          ) : null}
          {lead.tags.length ? (
            <Row label="Tags">{lead.tags.map((t) => tagLabel(t)).join(", ")}</Row>
          ) : null}
        </dl>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Section title="Contato">
          <dl>
            <Row label="E-mail">
              <a href={`mailto:${lead.email}`} className="underline underline-offset-4">
                {lead.email}
              </a>
              {lead.emailStatus !== "ok" ? (
                <span className="text-destructive ml-2 text-xs">
                  ({lead.emailStatus === "bounced" ? "e-mail devolvido" : "reclamou de spam"})
                </span>
              ) : null}
            </Row>
            <Row label="Telefone">
              {lead.phone ? (
                formatPhoneBR(lead.phone)
              ) : (
                <span className="text-muted-foreground">não informado</span>
              )}
            </Row>
            <Row label="Cidade">
              {[lead.city, lead.uf].filter(Boolean).join(" / ") || (
                <span className="text-muted-foreground">não informada</span>
              )}
            </Row>
            {lead.message ? <Row label="Mensagem">{lead.message}</Row> : null}
          </dl>
          <div className="flex flex-wrap gap-2">
            <LeadWhatsappButton lead={{ ...lead, company }} />
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={`mailto:${lead.email}`} />}
            >
              Enviar e-mail
            </Button>
          </div>
          <div className="border-t pt-3">
            <p className="mb-2 text-sm font-medium">Atribuir dono</p>
            <OwnerForm
              leadId={lead.id}
              ownerUserId={lead.ownerUserId}
              users={users.map((u) => ({ id: u.id, name: u.name }))}
            />
          </div>
        </Section>

        <Section title="Origem">
          <dl>
            <Row label="Origem">
              {SOURCE_LABELS[lead.source]}
              {lead.sourceDetail ? ` · ${lead.sourceDetail}` : ""}
            </Row>
            {lead.utmSource || lead.utmMedium || lead.utmCampaign ? (
              <Row label="UTM">
                {[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ")}
              </Row>
            ) : null}
            {lead.referrer ? <Row label="Referência">{lead.referrer}</Row> : null}
            {lead.landingPath ? <Row label="Página de entrada">{lead.landingPath}</Row> : null}
            {lead.guideVersion ? <Row label="Versão do guia">{lead.guideVersion}</Row> : null}
            {lead.referredByOrgName ? (
              <Row label="Indicado por">{lead.referredByOrgName}</Row>
            ) : null}
            {lead.projectInterestName ? (
              <Row label="Projeto de interesse">{lead.projectInterestName}</Row>
            ) : null}
            <Row label="Criado em">{formatDateTime(lead.createdAt)}</Row>
          </dl>
        </Section>
      </div>

      <Section title="Campos do segmento">
        <dl className="grid gap-x-8 sm:grid-cols-2">
          {ATTRIBUTE_FIELDS[lead.segment].map((f) => (
            <Row key={f.key} label={f.label}>
              <span className={cn(lead.attributes[f.key] === undefined && "text-muted-foreground")}>
                {f.key === "cnpj" ||
                f.key === "link_material" ||
                f.type === "text" ||
                f.type === "number" ||
                f.type === "date"
                  ? lead.attributes[f.key] === undefined || lead.attributes[f.key] === ""
                    ? "não informado"
                    : String(lead.attributes[f.key])
                  : enumLabel(lead.attributes[f.key])}
              </span>
            </Row>
          ))}
        </dl>
        {lead.orgName ? (
          <p className="text-muted-foreground text-sm">
            Organização vinculada: {lead.orgName}
            {lead.orgCnpj ? ` (CNPJ ${lead.orgCnpj})` : " (sem CNPJ)"}.
          </p>
        ) : lead.segment === "PJ" ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma organização vinculada. Para chegar a Termo, cadastre a empresa com CNPJ em{" "}
            <Link href="/app/organizacoes" className="underline underline-offset-4">
              Organizações
            </Link>
            .
          </p>
        ) : null}
      </Section>

      {pipeline === "patrocinadores" ? (
        <Section
          title="Aportes"
          action={
            <Link href="/app/projetos" className="text-sm underline underline-offset-4">
              registrar em Projetos
            </Link>
          }
        >
          {contributions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum aporte proposto ainda.</p>
          ) : (
            <ul className="divide-y text-sm">
              {contributions.map((c) => (
                <li key={c.id} className="flex flex-wrap gap-x-3 gap-y-1 py-2">
                  <span className="font-medium">{projectNames.get(c.projectId) ?? "projeto"}</span>
                  <span>{formatBRL(c.proposedAmount)}</span>
                  <span className="text-muted-foreground">{c.status.replace("_", " ")}</span>
                  {c.expectedCloseAt ? (
                    <span className="text-muted-foreground">
                      previsto {formatDate(c.expectedCloseAt)}
                    </span>
                  ) : null}
                  {c.depositedAt ? (
                    <span className="text-muted-foreground">
                      depositado {formatDate(c.depositedAt)} ({formatBRL(c.depositedAmount)})
                    </span>
                  ) : null}
                  {c.receiptNumber ? (
                    <span className="text-muted-foreground">recibo {c.receiptNumber}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      <Section title="Consentimentos">
        <ul className="flex flex-col gap-2 text-sm">
          {currentConsents.map(({ purpose, current }) => (
            <li key={purpose} className="flex flex-col gap-0.5">
              <span>
                <span className="font-medium">{CONSENT_PURPOSE_LABELS[purpose]}: </span>
                {current ? (
                  <span className={current.granted ? "text-emerald-700" : "text-destructive"}>
                    {current.granted ? "autorizado" : "revogado"} em{" "}
                    {formatDateTime(current.createdAt)}
                    {current.granted && current.channels.length
                      ? ` por ${current.channels.map((c) => CONSENT_CHANNEL_LABELS[c] ?? c).join(", ")}`
                      : ""}{" "}
                    (origem {current.sourcePage}, política {current.policyVersion})
                  </span>
                ) : (
                  <span className="text-muted-foreground">nunca registrado</span>
                )}
              </span>
              {current ? (
                <details className="text-muted-foreground text-xs">
                  <summary className="cursor-pointer">texto do consentimento</summary>
                  <p className="mt-1 whitespace-pre-line">{current.consentText}</p>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
        {consents.length > 2 ? (
          <p className="text-muted-foreground text-xs">
            {consents.length} registros no histórico (nada é apagado).
          </p>
        ) : null}
      </Section>

      {simulationCards.length > 0 ? (
        <Section title={`Simulações (${simulationCards.length})`}>
          <div className="flex flex-col gap-6">
            {simulationCards.map((data) => (
              <details key={data.simulationId} className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {data.subject} · {formatDateTime(data.createdAt)}
                </summary>
                <div className="pt-4">
                  <SimulatorDetail data={data} />
                </div>
              </details>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Registrar atividade">
        <ActivityForm
          leadId={lead.id}
          suggestedNextActionAt={suggestedNext ? suggestedNext.toISOString() : null}
        />
      </Section>

      <Section title={`Linha do tempo (${activities.length})`}>
        <ActivityTimeline activities={activities} users={userNames} now={now} />
      </Section>
    </div>
  );
}
