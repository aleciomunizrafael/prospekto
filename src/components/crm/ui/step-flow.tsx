import { Check, Circle, Lock, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Fluxo de passos (crm-design-system.md, seção 5.2): proposta → termo → depósito → recibo →
// contador no detalhe do aporte. Horizontal a partir de md, vertical com linha à esquerda no
// celular. `aria-current="step"` no passo atual; `action` e `blockers` ficam sob ele.
export type StepState = "done" | "current" | "todo" | "blocked" | "cancelled";

export type Step = {
  key: string;
  label: string;
  state: StepState;
  date?: string;
  detail?: string;
};

function Marker({ state, index }: { state: StepState; index: number }) {
  const base =
    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold";
  switch (state) {
    case "done":
      return (
        <span className={cn(base, "bg-success text-white")}>
          <Check className="size-4" aria-hidden="true" />
          <span className="sr-only">concluído</span>
        </span>
      );
    case "current":
      return (
        <span className={cn(base, "bg-primary text-primary-foreground")} aria-hidden="true">
          {index + 1}
        </span>
      );
    case "blocked":
      return (
        <span className={cn(base, "bg-warning-soft text-warning")}>
          <Lock className="size-3.5" aria-hidden="true" />
          <span className="sr-only">bloqueado</span>
        </span>
      );
    case "cancelled":
      return (
        <span className={cn(base, "bg-muted text-muted-foreground")}>
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">cancelado</span>
        </span>
      );
    default:
      return (
        <span className={cn(base, "border border-input text-muted-foreground")} aria-hidden="true">
          {index + 1}
        </span>
      );
  }
}

export function StepFlow({
  steps,
  action,
  blockers,
  className,
}: {
  steps: Step[];
  action?: ReactNode;
  blockers?: string[];
  className?: string;
}) {
  return (
    <ol
      className={cn(
        "flex flex-col gap-4 border-l border-divider pl-6 md:grid md:auto-cols-fr md:grid-flow-col md:gap-2 md:border-l-0 md:pl-0",
        className,
      )}
    >
      {steps.map((step, i) => {
        const current = step.state === "current" || step.state === "blocked";
        return (
          <li
            key={step.key}
            aria-current={current ? "step" : undefined}
            className="relative flex flex-col gap-2 md:pr-2"
          >
            <div className="flex items-start gap-2">
              <span className="absolute -left-[2.2rem] md:static">
                <Marker state={step.state} index={i} />
              </span>
              <div className="flex min-w-0 flex-col md:pt-1">
                <span
                  className={cn(
                    "text-sm",
                    current && "font-medium",
                    (step.state === "todo" || step.state === "cancelled") &&
                      "text-muted-foreground",
                    step.state === "cancelled" && "line-through",
                  )}
                >
                  {step.label}
                </span>
                {step.date ? <span className="crm-meta">{step.date}</span> : null}
                {step.detail ? <span className="crm-meta">{step.detail}</span> : null}
              </div>
            </div>
            {current && blockers && blockers.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm text-warning">
                {blockers.map((b) => (
                  <li key={b} className="flex items-start gap-1.5">
                    <Circle className="mt-1 size-3 shrink-0" aria-hidden="true" />
                    <span>falta: {b}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {current && action ? (
              <div className="flex flex-wrap items-center gap-2">{action}</div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
