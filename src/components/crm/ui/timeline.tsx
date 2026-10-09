import { Settings2, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { formActivitySubject, formActivityText } from "@/lib/crm/activity-text";
import { daysBetween } from "@/lib/crm/dates";
import {
  CRM_TIME_ZONE,
  calendarDateInSaoPaulo,
  diffCalendarDays,
  formatDate,
  formatDateTime,
} from "@/lib/crm/format";
import { aiActivityText, humanizeSystemActivity } from "@/lib/crm/humanize-activity";
import { ACTIVITY_ICONS } from "@/lib/crm/status-tones";
import type { ActivityType } from "@/lib/domain/enums";
import type { Activity } from "@/lib/repos/activities";
import { cn } from "@/lib/utils";
import { TaskCompleteButton } from "../forms/task-complete-button";

// Linha do tempo (crm-design-system.md, seção 5.2): agrupada por dia ("Hoje", "Ontem",
// "30 de setembro"), ícone por tipo, tarefas abertas com "Concluir" e vencimento, eventos do
// sistema em frase humana (humanize-activity.ts) e agrupados quando consecutivos.
// Atividades mais recentes primeiro, como chegam de listActivities.
type Group = { day: string; label: string; items: Activity[] };

const DAY_LABEL = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: CRM_TIME_ZONE,
});
const DAY_LABEL_WITH_YEAR = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: CRM_TIME_ZONE,
});

function dayLabel(day: string, date: Date, today: string): string {
  const diff = diffCalendarDays(day, today);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  return (sameYear ? DAY_LABEL : DAY_LABEL_WITH_YEAR).format(date);
}

function groupByDay(activities: Activity[], now: Date): Group[] {
  const today = calendarDateInSaoPaulo(now);
  const groups: Group[] = [];
  for (const a of activities) {
    const day = calendarDateInSaoPaulo(a.occurredAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(a);
    else groups.push({ day, label: dayLabel(day, a.occurredAt, today), items: [a] });
  }
  return groups;
}

// Dentro de um dia, sequências de dois ou mais eventos `sistema` viram um bloco dobrável.
type Run = { kind: "single"; item: Activity } | { kind: "system"; items: Activity[] };

function runsOf(items: Activity[]): Run[] {
  const runs: Run[] = [];
  for (const item of items) {
    const last = runs[runs.length - 1];
    if (item.type === "sistema" && last?.kind === "system") {
      last.items.push(item);
      continue;
    }
    if (item.type === "sistema") runs.push({ kind: "system", items: [item] });
    else runs.push({ kind: "single", item });
  }
  return runs.map((run) =>
    run.kind === "system" && run.items.length === 1 ? { kind: "single", item: run.items[0] } : run,
  );
}

function TypeIcon({ type, manual }: { type: string; manual?: boolean }) {
  const Icon = manual ? UserPlus : (ACTIVITY_ICONS[type as ActivityType] ?? Settings2);
  return <Icon className="size-3.5" />;
}

// Origens que de fato chegam por formulário do site; as demais (evento, LinkedIn, indicação…) são
// leads cadastrados à mão pelo "Novo lead", e o repositório grava a mesma atividade `formulario`
// ("Formulário recebido (evento)"). Na tela a frase vira "Lead cadastrado: Evento".
const FORM_SOURCES = new Set(["site", "guia", "simulador", "diagnostico"]);

function manualFormSource(subject: string): boolean {
  const m = /^Formulário recebido \((\w+)\)$/.exec(subject);
  return !!m && !FORM_SOURCES.has(m[1]);
}

function formSubject(subject: string): string {
  const text = formActivitySubject(subject);
  return manualFormSource(subject) ? text.replace(/^Formulário recebido/, "Lead cadastrado") : text;
}

function taskStatus(a: Activity, now: Date): { text: string; overdue: boolean } | null {
  if (a.type !== "tarefa") return null;
  if (a.doneAt) return { text: `concluída em ${formatDate(a.doneAt)}`, overdue: false };
  if (!a.dueAt) return { text: "sem vencimento", overdue: false };
  const overdue = a.dueAt.getTime() < now.getTime();
  if (!overdue) return { text: `vence ${formatDate(a.dueAt)}`, overdue: false };
  const days = daysBetween(a.dueAt, now);
  const late =
    days <= 0 ? "vence hoje" : days === 1 ? "atrasada há 1 dia" : `atrasada há ${days} dias`;
  return { text: `vence ${formatDate(a.dueAt)} · ${late}`, overdue: true };
}

function Item({
  a,
  users,
  projects,
  now,
}: {
  a: Activity;
  users: Map<string, string>;
  projects?: Map<string, string>;
  now: Date;
}) {
  const system = a.type === "sistema";
  const manual = a.type === "formulario" && manualFormSource(a.subject);
  const who = a.createdByUserId ? users.get(a.createdByUserId) : null;
  const task = taskStatus(a, now);
  const open = a.type === "tarefa" && !a.doneAt;
  let detail: ReactNode = null;
  let details: { label: string; value: string }[] = [];
  if (system) {
    const h = humanizeSystemActivity(a, users, projects);
    detail = h.text;
    details = h.details;
  } else if (a.type === "formulario") {
    detail = formActivityText(a.data);
  } else if (a.type === "email" || a.type === "whatsapp") {
    detail = aiActivityText(a.data);
  }
  return (
    <li className="relative flex flex-col gap-1">
      <span
        className={cn(
          "absolute top-0 -left-9 flex size-6 items-center justify-center rounded-full border border-border bg-background",
          system ? "text-muted-foreground" : "text-foreground",
        )}
        aria-hidden="true"
      >
        <TypeIcon type={a.type} manual={manual} />
      </span>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className={cn("text-sm font-medium", system && "font-normal text-muted-foreground")}>
            {a.type === "formulario" ? formSubject(a.subject) : a.subject}
          </p>
          {detail ? (
            <p className={cn("text-sm", system ? "text-muted-foreground" : "text-foreground")}>
              {detail}
            </p>
          ) : null}
        </div>
        {open ? (
          <div className="relative z-10 shrink-0">
            <TaskCompleteButton activityId={a.id} size="sm" />
          </div>
        ) : null}
      </div>
      {a.body ? <p className="text-sm whitespace-pre-line">{a.body}</p> : null}
      <p className="crm-meta flex flex-wrap items-center gap-x-2">
        <span>
          {formatDateTime(a.occurredAt)}
          {who ? ` · ${who}` : ""}
        </span>
        {task ? (
          <span className={cn(task.overdue && "font-medium text-destructive")}>{task.text}</span>
        ) : null}
      </p>
      {details.length > 0 ? (
        <details className="crm-meta">
          <summary className="cursor-pointer list-none underline-offset-2 hover:underline">
            ver detalhes
          </summary>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2">
            {details.map((d) => (
              <div key={d.label} className="contents">
                <dt>{d.label}</dt>
                <dd>{d.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </li>
  );
}

export function Timeline({
  activities,
  users,
  projects,
  now,
  limit,
  className,
}: {
  activities: Activity[];
  users: Map<string, string>;
  projects?: Map<string, string>;
  now: Date;
  limit?: number;
  className?: string;
}) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>;
  }
  const shown = limit ? activities.slice(0, limit) : activities;
  const groups = groupByDay(shown, now);
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {groups.map((group) => (
        <section key={group.day} aria-label={group.label} className="flex flex-col gap-3">
          <h3 className="crm-eyebrow">{group.label}</h3>
          <ol className="relative ml-3 flex flex-col gap-4 border-l border-divider pl-6">
            {runsOf(group.items).map((run, i) =>
              run.kind === "single" ? (
                <Item key={run.item.id} a={run.item} users={users} projects={projects} now={now} />
              ) : (
                <li key={`sistema-${group.day}-${i}`} className="relative">
                  <span
                    className="absolute top-0 -left-9 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
                    aria-hidden="true"
                  >
                    <Settings2 className="size-3.5" />
                  </span>
                  <details className="group/run">
                    <summary className="cursor-pointer list-none text-sm text-muted-foreground">
                      {run.items.length} mudanças automáticas ·{" "}
                      <span className="underline-offset-2 group-open/run:hidden hover:underline">
                        mostrar
                      </span>
                      <span className="hidden underline-offset-2 group-open/run:inline hover:underline">
                        esconder
                      </span>
                    </summary>
                    <ol className="mt-3 flex flex-col gap-4 border-l border-divider pl-6">
                      {run.items.map((a) => (
                        <Item key={a.id} a={a} users={users} projects={projects} now={now} />
                      ))}
                    </ol>
                  </details>
                </li>
              ),
            )}
          </ol>
        </section>
      ))}
      {limit && activities.length > shown.length ? (
        <p className="crm-meta">
          Mostrando as {shown.length} atividades mais recentes de {activities.length}.
        </p>
      ) : null}
    </div>
  );
}
