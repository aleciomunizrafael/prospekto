import { Circle, CircleAlert, CircleCheck, Clock } from "lucide-react";
import { useId, type ReactNode } from "react";
import type { NextStep } from "@/lib/crm/next-step";
import { cn } from "@/lib/utils";

// "O que eu faço agora?" (crm-design-system.md, seção 5.2, decisão D1): primeiro bloco do detalhe
// de lead, projeto e aporte. Barra de 3 px em vinho (único uso do vinho fora de foco e badges,
// decisão D5), eyebrow, título, motivo, checklist e o botão do passo em `action`.
export function NextStepCard({
  step,
  action,
  className,
  id,
}: {
  step: NextStep;
  action?: ReactNode;
  className?: string;
  id?: string;
}) {
  const titleId = useId();
  const Icon = step.tone === "danger" ? CircleAlert : step.tone === "warning" ? Clock : null;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border border-l-[3px] border-l-brand bg-card p-4",
        className,
      )}
    >
      <p className="crm-eyebrow">Próximo passo</p>
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="flex items-start gap-2 text-base font-semibold">
          {Icon ? (
            <Icon
              aria-hidden="true"
              className={cn(
                "mt-1 size-4 shrink-0",
                step.tone === "danger" ? "text-destructive" : "text-warning",
              )}
            />
          ) : null}
          <span>{step.title}</span>
        </h2>
        {step.reason ? <p className="text-sm text-muted-foreground">{step.reason}</p> : null}
      </div>
      {step.checklist && step.checklist.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {step.checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              {item.done ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <Circle
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <span className={cn(item.done && "text-muted-foreground")}>
                <span className="sr-only">{item.done ? "feito: " : "falta: "}</span>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </section>
  );
}
