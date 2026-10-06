import {
  CalendarClock,
  Circle,
  CircleAlert,
  HandCoins,
  SquareCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { claimLeadAction } from "@/actions/crm-leads";
import { Button } from "@/components/ui/button";
import { daysBetween } from "@/lib/crm/dates";
import { formatShortDay } from "@/lib/crm/describe-sla";
import { CRM_TIME_ZONE, calendarDateInSaoPaulo, formatBRL, formatDate } from "@/lib/crm/format";
import { SEGMENT_LABELS } from "@/lib/crm/labels";
import { leadCompany, stageInfo } from "@/lib/crm/lead-view";
import type { TaskRow } from "@/lib/repos/activities";
import type { ContributionSummary } from "@/lib/repos/contributions";
import type { LeadListRow } from "@/lib/repos/leads";
import type { ProjectSummary } from "@/lib/repos/projects";
import { cn } from "@/lib/utils";
import { TaskCompleteButton } from "./forms/task-complete-button";
import { Meter } from "./ui/meter";
import { SlaIndicator } from "./ui/sla-indicator";
import { StatusBadge } from "./ui/status-badge";
import { LeadWhatsappButton } from "./whatsapp-button";

// Blocos da tela "Hoje" (crm-design-system.md, seção 7.2; regra R-13). A fila "Precisa de ação
// agora" chega ordenada da page.tsx; aqui só se desenha. Cada linha é uma grade de três colunas
// no desktop (quem / estado / ação) e dois andares no celular (quem + ação à direita / estado),
// com 44 px de altura mínima; nada de flex-wrap como layout.

export type QueueItem =
  { kind: "task"; task: TaskRow } | { kind: "lead"; lead: LeadListRow; reason: "overdue" | "new" };

export function queueItemKey(item: QueueItem): string {
  return item.kind === "task" ? `task-${item.task.id}` : `lead-${item.lead.id}`;
}

// Linhas visíveis antes do "ver todos": 8 no desktop; 5 no celular, onde cada linha tem dois
// andares e a página precisa caber em 1.800 px (critério da Frente A).
export const QUEUE_VISIBLE_ROWS = 8;
export const QUEUE_VISIBLE_ROWS_MOBILE = 5;

// Botões da linha: 44 px no celular (alvo de toque), compactos no desktop.
const ROW_BUTTON_CLASS = "h-11 px-4 text-sm md:h-7 md:px-2.5 md:text-[0.8rem]";

const ROW_CLASS =
  "grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-1 md:grid-cols-[minmax(0,1fr)_16rem_auto]";
// "Próximos 7 dias": uma linha só no celular (nome · empresa | badge · hora).
const UPCOMING_ROW_CLASS =
  "grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-0.5 md:grid-cols-[minmax(0,1fr)_16rem_auto]";

const TIME_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: CRM_TIME_ZONE,
});

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

// --- Casca comum dos blocos -------------------------------------------------------------------

function Block({
  id,
  title,
  count,
  icon: Icon,
  iconClassName,
  urgent = false,
  meta,
  children,
  className,
}: {
  id: string;
  title: string;
  count: number;
  icon: LucideIcon;
  iconClassName?: string;
  urgent?: boolean;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const titleId = `${id}-titulo`;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        "scroll-mt-20 rounded-xl border border-border bg-card",
        urgent && "border-l-[3px] border-l-destructive",
        className,
      )}
    >
      <header className="flex min-h-11 items-center gap-2 border-b border-divider px-4 py-1.5">
        <Icon aria-hidden="true" className={cn("size-4 shrink-0", iconClassName)} />
        <h2 id={titleId} className="crm-h2 min-w-0 flex-1 truncate">
          {title}{" "}
          <span className="font-sans text-base font-normal text-muted-foreground">({count})</span>
        </h2>
        {meta ? <span className="crm-meta shrink-0">{meta}</span> : null}
      </header>
      {children}
    </section>
  );
}

function BlockEmpty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-sm text-muted-foreground">{children}</p>;
}

// --- Peças de linha -----------------------------------------------------------------------------

// Nome (link) e empresa/segmento numa linha que trunca no fim (o nome fica inteiro; a empresa é o
// que se corta). `metaOnMobile=false` esconde a empresa no celular (ela vai para o segundo andar).
function Who({
  icon: Icon,
  href,
  title,
  meta,
  metaOnMobile = true,
}: {
  icon: LucideIcon;
  href: string | null;
  title: string;
  meta?: string | null;
  metaOnMobile?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate text-sm">
        {href ? (
          <Link href={href} className="font-medium hover:underline">
            {title}
          </Link>
        ) : (
          <span className="font-medium">{title}</span>
        )}
        {meta ? (
          <span className={cn("crm-meta", !metaOnMobile && "hidden md:inline")}> {meta}</span>
        ) : null}
      </span>
    </div>
  );
}

// Segundo andar no celular / coluna do meio no desktop.
const STATE_CLASS =
  "col-start-1 flex min-w-0 items-center gap-x-2 md:col-start-2 md:row-start-1 md:flex-wrap md:gap-y-0.5";
// Coluna da ação: à direita dos dois andares no celular, terceira coluna no desktop.
const ACTION_CLASS =
  "col-start-2 row-span-2 row-start-1 flex items-center justify-end gap-2 self-center md:col-start-3 md:row-span-1";

function describeTaskDue(
  dueAt: Date | null,
  now: Date,
): { text: string; tone: "danger" | "neutral" } {
  if (!dueAt) return { text: "Sem data", tone: "neutral" };
  const today = calendarDateInSaoPaulo(now);
  const day = calendarDateInSaoPaulo(dueAt);
  if (day === today) return { text: "Vence hoje", tone: "danger" };
  if (dueAt.getTime() < now.getTime()) {
    const days = Math.max(1, daysBetween(dueAt, now));
    return { text: `Atrasada ${days === 1 ? "há 1 dia" : `há ${days} dias`}`, tone: "danger" };
  }
  return { text: `Vence ${formatShortDay(dueAt)}`, tone: "neutral" };
}

function TaskDue({ dueAt, now }: { dueAt: Date | null; now: Date }) {
  const due = describeTaskDue(dueAt, now);
  const Icon = due.tone === "danger" ? CircleAlert : Circle;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-xs",
        due.tone === "danger" ? "font-medium text-destructive" : "text-muted-foreground",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("shrink-0", due.tone === "danger" ? "size-3.5" : "size-2.5")}
      />
      {due.text}
    </span>
  );
}

function ClaimButton({ leadId }: { leadId: string }) {
  return (
    <form action={claimLeadAction} className="inline-flex">
      <input type="hidden" name="leadId" value={leadId} />
      <Button type="submit" variant="outline" size="sm" className={ROW_BUTTON_CLASS}>
        Assumir
      </Button>
    </form>
  );
}

function RegisterContactLink({ leadId, name }: { leadId: string; name: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={ROW_BUTTON_CLASS}
      nativeButton={false}
      render={
        <Link
          href={`/app/leads/${leadId}?registrar=1`}
          aria-label={`Registrar contato com ${name}`}
        />
      }
    >
      <span className="md:hidden">Registrar</span>
      <span className="hidden md:inline">Registrar contato</span>
    </Button>
  );
}

// --- Fila "Precisa de ação agora" ----------------------------------------------------------------

function QueueRow({ item, now, className }: { item: QueueItem; now: Date; className?: string }) {
  if (item.kind === "task") {
    const { task } = item;
    return (
      <li className={cn(ROW_CLASS, className)}>
        <Who
          icon={SquareCheck}
          href={task.leadId ? `/app/leads/${task.leadId}` : null}
          title={task.subject}
          meta={task.leadName}
          metaOnMobile={false}
        />
        <div className={STATE_CLASS}>
          {task.leadName ? (
            <span className="crm-meta min-w-0 truncate md:hidden">{task.leadName} ·</span>
          ) : null}
          <TaskDue dueAt={task.dueAt} now={now} />
        </div>
        <div className={ACTION_CLASS}>
          <TaskCompleteButton activityId={task.id} size="responsive" />
        </div>
      </li>
    );
  }
  const { lead, reason } = item;
  const info = stageInfo(lead, now);
  return (
    <li className={cn(ROW_CLASS, className)}>
      <Who
        icon={Circle}
        href={`/app/leads/${lead.id}`}
        title={lead.name}
        meta={leadCompany(lead) ?? SEGMENT_LABELS[lead.segment]}
      />
      <div className={STATE_CLASS}>
        <StatusBadge
          kind="stage"
          value={lead.stage}
          pipeline={lead.pipeline}
          className="shrink-0"
        />
        <SlaIndicator
          info={info}
          nextActionAt={reason === "new" ? null : lead.nextActionAt}
          now={now}
          stage={lead}
          truncate
        />
      </div>
      <div className={ACTION_CLASS}>
        <LeadWhatsappButton
          lead={{ ...lead, company: leadCompany(lead) }}
          variant="icon"
          size="responsive"
        />
        {lead.ownerUserId ? (
          <RegisterContactLink leadId={lead.id} name={lead.name} />
        ) : (
          <ClaimButton leadId={lead.id} />
        )}
      </div>
    </li>
  );
}

export function ActionQueue({
  items,
  now,
  visible = QUEUE_VISIBLE_ROWS,
  className,
}: {
  items: QueueItem[];
  now: Date;
  visible?: number;
  className?: string;
}) {
  const shown = items.slice(0, visible);
  const rest = items.slice(visible);
  // No celular só as primeiras QUEUE_VISIBLE_ROWS_MOBILE ficam fora do <details>; as linhas entre
  // esse limite e `visible` aparecem duas vezes no DOM (fora com `hidden md:grid`, dentro com
  // `md:hidden`), o que evita JavaScript para um limite responsivo. Um <details> fechado não
  // renderiza o conteúdo, então nada fica duplicado para leitor de tela.
  const mobileOverflow = shown.slice(QUEUE_VISIBLE_ROWS_MOBILE);
  const hasDetails = rest.length > 0 || mobileOverflow.length > 0;
  return (
    <Block
      id="tarefas"
      title="Precisa de ação agora"
      count={items.length}
      icon={TriangleAlert}
      iconClassName="text-destructive"
      urgent
      className={className}
    >
      <ul className="divide-y divide-divider">
        {shown.map((item, index) => (
          <QueueRow
            key={queueItemKey(item)}
            item={item}
            now={now}
            className={index >= QUEUE_VISIBLE_ROWS_MOBILE ? "hidden md:grid" : undefined}
          />
        ))}
      </ul>
      {hasDetails ? (
        <details className={cn("group border-t border-divider", rest.length === 0 && "md:hidden")}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm font-medium text-primary hover:underline [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">ver todos os {items.length} ›</span>
            <span className="hidden group-open:inline">mostrar menos</span>
          </summary>
          <ul className="divide-y divide-divider border-t border-divider">
            {mobileOverflow.map((item) => (
              <QueueRow key={queueItemKey(item)} item={item} now={now} className="md:hidden" />
            ))}
            {rest.map((item) => (
              <QueueRow key={queueItemKey(item)} item={item} now={now} />
            ))}
          </ul>
        </details>
      ) : null}
    </Block>
  );
}

// --- Próximos 7 dias ----------------------------------------------------------------------------

type UpcomingItem =
  { kind: "lead"; at: Date; lead: LeadListRow } | { kind: "task"; at: Date; task: TaskRow };

function UpcomingRow({ item }: { item: UpcomingItem }) {
  const time = TIME_FORMAT.format(item.at);
  if (item.kind === "task") {
    const { task } = item;
    return (
      <li className={UPCOMING_ROW_CLASS}>
        <Who
          icon={SquareCheck}
          href={task.leadId ? `/app/leads/${task.leadId}` : null}
          title={task.subject}
          meta={task.leadName ?? "Tarefa"}
        />
        <span className="crm-meta hidden tabular-nums md:inline">{time}</span>
        <div className="flex items-center justify-end gap-2">
          <span className="crm-meta tabular-nums md:hidden">{time}</span>
          <TaskCompleteButton activityId={task.id} size="responsive" />
        </div>
      </li>
    );
  }
  const { lead } = item;
  return (
    <li className={UPCOMING_ROW_CLASS}>
      <Who
        icon={Circle}
        href={`/app/leads/${lead.id}`}
        title={lead.name}
        meta={leadCompany(lead) ?? SEGMENT_LABELS[lead.segment]}
      />
      <div className="hidden md:block">
        <StatusBadge kind="stage" value={lead.stage} pipeline={lead.pipeline} />
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className="md:hidden">
          <StatusBadge kind="stage" value={lead.stage} pipeline={lead.pipeline} />
        </span>
        <span className="crm-meta tabular-nums">{time}</span>
      </div>
    </li>
  );
}

export function UpcomingByDay({
  leads,
  tasks,
  className,
}: {
  leads: LeadListRow[];
  tasks: TaskRow[];
  className?: string;
}) {
  const items: UpcomingItem[] = [
    ...leads
      .filter((lead) => lead.nextActionAt)
      .map((lead) => ({ kind: "lead" as const, at: lead.nextActionAt as Date, lead })),
    ...tasks
      .filter((task) => task.dueAt)
      .map((task) => ({ kind: "task" as const, at: task.dueAt as Date, task })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  const days = new Map<string, UpcomingItem[]>();
  for (const item of items) {
    const day = calendarDateInSaoPaulo(item.at);
    const group = days.get(day);
    if (group) group.push(item);
    else days.set(day, [item]);
  }
  return (
    <Block
      id="proximos"
      title="Próximos 7 dias"
      count={items.length}
      icon={CalendarClock}
      iconClassName="text-muted-foreground"
      className={className}
    >
      {items.length === 0 ? (
        <BlockEmpty>Nada agendado para os próximos 7 dias.</BlockEmpty>
      ) : (
        <ol className="flex flex-col">
          {[...days.entries()].map(([day, group]) => (
            <li key={day} className="border-b border-divider last:border-b-0">
              <h3 className="crm-eyebrow bg-surface-2 px-4">{formatShortDay(group[0].at)}</h3>
              <ul className="divide-y divide-divider">
                {group.map((item) => (
                  <UpcomingRow
                    key={item.kind === "task" ? `task-${item.task.id}` : `lead-${item.lead.id}`}
                    item={item}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </Block>
  );
}

// --- Aportes previstos --------------------------------------------------------------------------

export function ContributionsPreview({
  rows,
  className,
}: {
  rows: ContributionSummary[];
  className?: string;
}) {
  return (
    <Block
      id="aportes-previstos"
      title="Aportes previstos"
      count={rows.length}
      icon={HandCoins}
      iconClassName="text-muted-foreground"
      meta="próximos 15 dias"
      className={className}
    >
      {rows.length === 0 ? (
        <BlockEmpty>Nenhum aporte previsto nos próximos 15 dias.</BlockEmpty>
      ) : (
        <ul className="divide-y divide-divider">
          {rows.map((c) => (
            <li
              key={c.id}
              className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-1 md:grid-cols-[minmax(0,1fr)_auto_auto]"
            >
              <span className="min-w-0 truncate text-sm">
                <Link href={`/app/aportes/${c.id}`} className="font-medium hover:underline">
                  {c.leadName}
                </Link>
                <span className="crm-meta tabular-nums md:hidden">
                  {" "}
                  · {formatDate(c.expectedCloseAt)}
                </span>
                <span className="crm-meta"> → {c.projectName}</span>
              </span>
              <span className="hidden items-center gap-2 md:flex">
                <span className="crm-meta tabular-nums">{formatDate(c.expectedCloseAt)}</span>
                <StatusBadge kind="contribution" value={c.status} />
              </span>
              <span className="text-right text-sm font-medium tabular-nums">
                {formatBRL(c.proposedAmount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

// --- Projetos com alerta ------------------------------------------------------------------------

export function ProjectsAlert({
  projects,
  className,
}: {
  projects: ProjectSummary[];
  className?: string;
}) {
  return (
    <Block
      id="projetos-alerta"
      title="Projetos com alerta"
      count={projects.length}
      icon={TriangleAlert}
      iconClassName="text-warning"
      meta="captando"
      className={className}
    >
      {projects.length === 0 ? (
        <BlockEmpty>Nenhum projeto captando com alerta.</BlockEmpty>
      ) : (
        <ul className="divide-y divide-divider">
          {projects.map((p) => {
            const soon = p.daysRemaining != null && p.daysRemaining < 183;
            const low = p.alerts.includes("captacao");
            return (
              <li
                key={p.id}
                className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-1.5"
              >
                <Link
                  href={`/app/projetos/${p.id}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {p.name}
                </Link>
                <span
                  className={cn(
                    "row-span-2 self-center text-right text-sm tabular-nums",
                    soon ? "font-medium text-warning" : "text-muted-foreground",
                  )}
                >
                  {p.daysRemaining == null
                    ? "sem prazo"
                    : p.daysRemaining < 0
                      ? "prazo encerrado"
                      : plural(p.daysRemaining, "dia", "dias")}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <Meter
                    value={p.raisedAmount}
                    max={p.approvedAmount ?? 0}
                    label={`Captado de ${p.name}`}
                    text={
                      p.raisedPercent == null
                        ? "sem valor aprovado"
                        : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(p.raisedPercent)} %`
                    }
                    tone={low ? "warning" : "neutral"}
                    size="sm"
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Block>
  );
}
