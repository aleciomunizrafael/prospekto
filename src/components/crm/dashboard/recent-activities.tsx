import { History, Settings2 } from "lucide-react";
import Link from "next/link";
import { Block, BlockEmpty } from "@/components/crm/today";
import { formatShortDay } from "@/lib/crm/describe-sla";
import { CRM_TIME_ZONE, calendarDateInSaoPaulo, diffCalendarDays } from "@/lib/crm/format";
import { ACTIVITY_ICONS } from "@/lib/crm/status-tones";
import type { ActivityType } from "@/lib/domain/enums";
import type { RecentActivity } from "@/lib/repos/activities";
import { cn } from "@/lib/utils";

// "Últimas atividades" do Painel (ADR-004, 6.8): as 8 mais recentes do tenant, exceto sistema,
// download e formulário (já filtradas por listRecentActivities). Componente puro: linha de três
// colunas (ícone do tipo num quadrado de 32 px, assunto com link real para o registro e "Autor ·
// Empresa ou lead" embaixo, hora relativa à direita). Testado em tests/dashboard-blocks.test.ts.

const TIME = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: CRM_TIME_ZONE,
});

// "hoje, 14:10", "ontem, 09:30", "qui., 9 de out." (dia de calendário de São Paulo).
export function relativeDayTime(at: Date, now: Date): string {
  const diff = diffCalendarDays(calendarDateInSaoPaulo(at), calendarDateInSaoPaulo(now));
  if (diff === 0) return `hoje, ${TIME.format(at)}`;
  if (diff === 1) return `ontem, ${TIME.format(at)}`;
  return formatShortDay(at);
}

// Link real para o registro a que a atividade pertence: lead, organização, aporte, projeto ou
// item de prospecção; uma tarefa solta abre o quadro com a tarefa em foco.
export function activityHref(a: RecentActivity): string | null {
  if (a.leadId) return `/app/leads/${a.leadId}`;
  if (a.orgId) return `/app/organizacoes/${a.orgId}`;
  if (a.prospectingItemId && a.prospectingListId) {
    return `/app/prospeccao/${a.prospectingListId}/${a.prospectingItemId}`;
  }
  if (a.contributionId) return `/app/aportes/${a.contributionId}`;
  if (a.projectId) return `/app/projetos/${a.projectId}`;
  if (a.type === "tarefa") return `/app/tarefas?task=${a.id}`;
  return null;
}

// "Autor · Empresa ou lead": quem registrou e o registro (lead, organização, empresa prospectada
// ou projeto), o que existir.
export function activityContext(a: RecentActivity): string {
  const subject = a.leadName ?? a.orgName ?? a.prospectingItemName ?? a.projectName ?? null;
  return [a.authorName, subject].filter(Boolean).join(" · ");
}

function Row({ a, now }: { a: RecentActivity; now: Date }) {
  const Icon = ACTIVITY_ICONS[a.type as ActivityType] ?? Settings2;
  const href = activityHref(a);
  const context = activityContext(a);
  return (
    <li className="grid min-h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-1.5">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground"
      >
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col">
        {/* No celular o assunto quebra a linha; no desktop trunca no fim da coluna. */}
        <span className="text-sm md:truncate">
          {href ? (
            <Link href={href} className="font-medium hover:underline">
              {a.subject}
            </Link>
          ) : (
            <span className="font-medium">{a.subject}</span>
          )}
        </span>
        {context ? <span className="crm-meta truncate">{context}</span> : null}
      </span>
      <span className="crm-meta shrink-0 tabular-nums">{relativeDayTime(a.occurredAt, now)}</span>
    </li>
  );
}

export function RecentActivities({
  rows,
  now,
  className,
}: {
  rows: RecentActivity[];
  now: Date;
  className?: string;
}) {
  return (
    <Block
      id="ultimas-atividades"
      title="Últimas atividades"
      count={rows.length}
      icon={History}
      iconClassName="text-muted-foreground"
      className={cn(className)}
    >
      {rows.length === 0 ? (
        <BlockEmpty>
          Nenhuma atividade registrada ainda. Ligações, reuniões e notas aparecem aqui.
        </BlockEmpty>
      ) : (
        <ul className="divide-y divide-divider">
          {rows.map((a) => (
            <Row key={a.id} a={a} now={now} />
          ))}
        </ul>
      )}
    </Block>
  );
}
