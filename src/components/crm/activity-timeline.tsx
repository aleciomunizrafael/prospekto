import { formatDateTime } from "@/lib/crm/dates";
import { ACTIVITY_TYPE_LABELS, LOST_REASON_LABELS, stageLabel } from "@/lib/crm/labels";
import type { Activity } from "@/lib/repos/activities";
import { cn } from "@/lib/utils";
import { TaskCompleteButton } from "./forms/task-complete-button";

// Linha do tempo de activities do lead, mais recentes primeiro. Linhas `sistema` mostram `data`
// em texto legível (de, para, motivo); tarefas mostram vencimento e conclusão.
function systemText(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const parts: string[] = [];
  if (data.reason === "owner") {
    parts.push(`de ${data.from ?? "ninguém"} para ${data.to ?? "ninguém"}`);
  } else if (data.reason === "score") {
    parts.push(`de ${data.from} para ${data.to}`);
  } else if ("from" in data && "to" in data) {
    parts.push(`de ${stageLabel(String(data.from))} para ${stageLabel(String(data.to))}`);
    if (typeof data.reason === "string" && data.reason) {
      const label = (LOST_REASON_LABELS as Record<string, string>)[data.reason] ?? data.reason;
      parts.push(`motivo: ${label}`);
    }
  } else {
    for (const [k, v] of Object.entries(data)) {
      if (v === null || v === undefined || typeof v === "object") continue;
      parts.push(`${k}: ${String(v)}`);
    }
  }
  return parts.length ? parts.join(" · ") : null;
}

function formText(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const skip = new Set(["form_id", "consent_lgpd", "consent_marketing"]);
  const parts = Object.entries(data)
    .filter(
      ([k, v]) =>
        !skip.has(k) && v !== null && v !== undefined && v !== "" && typeof v !== "object",
    )
    .slice(0, 12)
    .map(([k, v]) => `${k}: ${String(v)}`);
  return parts.length ? parts.join(" · ") : null;
}

export function ActivityTimeline({
  activities,
  users,
  now,
}: {
  activities: Activity[];
  users: Map<string, string>;
  now: Date;
}) {
  if (activities.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma atividade ainda.</p>;
  }
  return (
    <ol className="flex flex-col divide-y">
      {activities.map((a) => {
        const isTask = a.type === "tarefa";
        const open = isTask && !a.doneAt;
        const overdue = open && !!a.dueAt && a.dueAt.getTime() < now.getTime();
        const detail =
          a.type === "sistema"
            ? systemText(a.data)
            : a.type === "formulario"
              ? formText(a.data)
              : null;
        const who = a.createdByUserId ? users.get(a.createdByUserId) : null;
        return (
          <li key={a.id} className="flex flex-col gap-1 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-xs",
                  a.type === "sistema" ? "bg-muted text-muted-foreground" : "bg-secondary",
                )}
              >
                {ACTIVITY_TYPE_LABELS[a.type]}
              </span>
              <span className="font-medium">{a.subject}</span>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(a.occurredAt)}
                {who ? ` · ${who}` : ""}
              </span>
              {isTask ? (
                <span
                  className={cn(
                    "text-xs",
                    overdue ? "text-destructive font-medium" : "text-muted-foreground",
                  )}
                >
                  {a.doneAt
                    ? `concluída em ${formatDateTime(a.doneAt)}`
                    : `vence em ${formatDateTime(a.dueAt)}`}
                </span>
              ) : null}
              {open ? <TaskCompleteButton activityId={a.id} /> : null}
            </div>
            {a.body ? <p className="whitespace-pre-line">{a.body}</p> : null}
            {detail ? <p className="text-muted-foreground text-xs">{detail}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}
