import Link from "next/link";
import { claimLeadAction } from "@/actions/crm-leads";
import { Button } from "@/components/ui/button";
import { describeOverdue, formatDate, formatDateTime, formatMoney } from "@/lib/crm/dates";
import { SEGMENT_LABELS, SOURCE_LABELS, pipelineLabel, stageLabel } from "@/lib/crm/labels";
import { leadCompany, stageInfo } from "@/lib/crm/lead-view";
import type { TaskRow } from "@/lib/repos/activities";
import type { Contribution } from "@/lib/repos/contributions";
import type { LeadListRow } from "@/lib/repos/leads";
import type { CulturalProjectWithBalance } from "@/lib/repos/projects";
import { cn } from "@/lib/utils";
import { TemperatureBadge } from "./badges";
import { TaskCompleteButton } from "./forms/task-complete-button";
import { WhatsappButton } from "./whatsapp-button";

// Blocos da tela "Hoje" (proposta-c, seção 9.1; regra R-13), em ordem de urgência. Cada bloco tem
// no máximo 20 linhas, link para o lead e "Abrir WhatsApp" quando há telefone.
export function TodayBlock({
  title,
  count,
  description,
  seeAllHref,
  children,
  tone = "neutral",
}: {
  title: string;
  count: number;
  description?: string;
  seeAllHref?: string;
  children: React.ReactNode;
  tone?: "neutral" | "urgent" | "warning";
}) {
  return (
    <section
      aria-labelledby={`bloco-${title}`}
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4",
        tone === "urgent" && count > 0 && "border-destructive/40",
        tone === "warning" && count > 0 && "border-amber-300",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`bloco-${title}`} className="text-lg font-semibold">
          {title} <span className="text-muted-foreground text-base font-normal">({count})</span>
        </h2>
        {seeAllHref ? (
          <Link href={seeAllHref} className="text-sm underline underline-offset-4">
            ver todos
          </Link>
        ) : null}
      </div>
      {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      {count === 0 ? <p className="text-muted-foreground text-sm">Nada aqui hoje.</p> : children}
    </section>
  );
}

function LeadLine({
  lead,
  extra,
  claim,
}: {
  lead: LeadListRow;
  extra: React.ReactNode;
  claim?: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
      <Link
        href={`/app/leads/${lead.id}`}
        className="font-medium underline-offset-4 hover:underline"
      >
        {lead.name}
      </Link>
      <span className="text-muted-foreground">
        {leadCompany(lead) ?? SEGMENT_LABELS[lead.segment]}
      </span>
      <span className="text-muted-foreground text-xs">
        {pipelineLabel(lead.pipeline)} · {stageLabel(lead.stage)}
      </span>
      {extra}
      <span className="text-muted-foreground ml-auto text-xs">{lead.ownerName ?? "sem dono"}</span>
      {claim && !lead.ownerUserId ? (
        <form action={claimLeadAction}>
          <input type="hidden" name="leadId" value={lead.id} />
          <Button type="submit" size="xs" variant="outline">
            Assumir
          </Button>
        </form>
      ) : null}
      <WhatsappButton lead={{ ...lead, company: leadCompany(lead) }} size="xs" label="WhatsApp" />
    </li>
  );
}

export function NewLeadsBlock({ leads, now }: { leads: LeadListRow[]; now: Date }) {
  return (
    <TodayBlock
      title="Leads novos sem contato"
      count={leads.length}
      tone="urgent"
      description="Primeiro contato dentro do prazo do estágio inicial (1 dia útil para patrocinadores)."
      seeAllHref="/app/leads?sort=created"
    >
      <ul className="divide-y">
        {leads.map((lead) => {
          const info = stageInfo(lead, now);
          return (
            <LeadLine
              key={lead.id}
              lead={lead}
              claim
              extra={
                <>
                  <span
                    className={cn(
                      "text-xs",
                      info.slaOverdue ? "text-destructive font-medium" : "text-muted-foreground",
                    )}
                  >
                    {info.slaText}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {SOURCE_LABELS[lead.source]} · {formatDateTime(lead.createdAt)}
                  </span>
                  <TemperatureBadge temperature={lead.temperature} />
                </>
              }
            />
          );
        })}
      </ul>
    </TodayBlock>
  );
}

export function OverdueBlock({ leads, now }: { leads: LeadListRow[]; now: Date }) {
  return (
    <TodayBlock
      title="Próximas ações vencidas"
      count={leads.length}
      tone="urgent"
      seeAllHref="/app/leads"
    >
      <ul className="divide-y">
        {leads.map((lead) => (
          <LeadLine
            key={lead.id}
            lead={lead}
            extra={
              <>
                <span className="text-destructive text-xs font-medium">
                  {describeOverdue(lead.nextActionAt, now)}
                </span>
                {lead.lastContactAt ? (
                  <span className="text-muted-foreground text-xs">
                    último contato {formatDate(lead.lastContactAt)}
                  </span>
                ) : null}
              </>
            }
          />
        ))}
      </ul>
    </TodayBlock>
  );
}

export function TasksBlock({
  title,
  tasks,
  now,
  tone,
}: {
  title: string;
  tasks: TaskRow[];
  now: Date;
  tone?: "urgent" | "neutral";
}) {
  return (
    <TodayBlock title={title} count={tasks.length} tone={tone}>
      <ul className="divide-y">
        {tasks.map((t) => {
          const overdue = !!t.dueAt && t.dueAt.getTime() < now.getTime();
          return (
            <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <span className="font-medium">{t.subject}</span>
              {t.leadId ? (
                <Link
                  href={`/app/leads/${t.leadId}`}
                  className="underline-offset-4 hover:underline"
                >
                  {t.leadName ?? "lead"}
                </Link>
              ) : null}
              <span
                className={cn(
                  "text-xs",
                  overdue ? "text-destructive font-medium" : "text-muted-foreground",
                )}
              >
                {overdue ? describeOverdue(t.dueAt, now) : formatDateTime(t.dueAt)}
              </span>
              <span className="ml-auto">
                <TaskCompleteButton activityId={t.id} />
              </span>
            </li>
          );
        })}
      </ul>
    </TodayBlock>
  );
}

export function UpcomingBlock({ leads }: { leads: LeadListRow[] }) {
  return (
    <TodayBlock title="Próximos 7 dias" count={leads.length} seeAllHref="/app/leads">
      <ul className="divide-y">
        {leads.map((lead) => (
          <LeadLine
            key={lead.id}
            lead={lead}
            extra={
              <span className="text-muted-foreground text-xs">
                {formatDateTime(lead.nextActionAt)}
              </span>
            }
          />
        ))}
      </ul>
    </TodayBlock>
  );
}

export type ContributionLine = Contribution & {
  leadName: string | null;
  projectName: string | null;
};

export function ContributionsBlock({ rows }: { rows: ContributionLine[] }) {
  return (
    <TodayBlock
      title="Aportes previstos nos próximos 15 dias"
      count={rows.length}
      tone="warning"
      seeAllHref="/app/aportes"
    >
      <ul className="divide-y">
        {rows.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
            <Link
              href={`/app/leads/${c.leadId}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {c.leadName ?? "patrocinador"}
            </Link>
            <span className="text-muted-foreground">{c.projectName ?? "projeto"}</span>
            <span>{formatMoney(c.proposedAmount)}</span>
            <span className="text-muted-foreground text-xs">
              previsto para {formatDate(c.expectedCloseAt)}
            </span>
            <span className="text-muted-foreground ml-auto text-xs">
              {c.status.replace("_", " ")}
            </span>
          </li>
        ))}
      </ul>
    </TodayBlock>
  );
}

export function ProjectsBlock({
  projects,
  now,
}: {
  projects: CulturalProjectWithBalance[];
  now: Date;
}) {
  return (
    <TodayBlock
      title="Projetos captando com alerta"
      count={projects.length}
      tone="warning"
      description="Menos de 6 meses para o fim da captação ou menos de 10% captado."
      seeAllHref="/app/projetos"
    >
      <ul className="divide-y">
        {projects.map((p) => {
          const pct = p.approvedAmount
            ? Math.round((p.raisedAmount / p.approvedAmount) * 100)
            : null;
          const deadline = p.fundraisingDeadline
            ? new Date(`${p.fundraisingDeadline}T12:00:00Z`)
            : null;
          const soon = deadline && deadline.getTime() - now.getTime() < 183 * 24 * 60 * 60_000;
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <Link
                href={`/app/projetos/${p.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {p.name}
              </Link>
              <span
                className={cn(
                  "text-xs",
                  soon ? "text-amber-700 font-medium" : "text-muted-foreground",
                )}
              >
                prazo {formatDate(p.fundraisingDeadline) || "não informado"}
              </span>
              <span className="text-muted-foreground text-xs">
                saldo {formatMoney(p.balance)} ·{" "}
                {pct === null ? "sem valor aprovado" : `${pct}% captado`}
              </span>
            </li>
          );
        })}
      </ul>
    </TodayBlock>
  );
}
