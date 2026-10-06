import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Número grande com rótulo (crm-design-system.md, seção 5.2): os quatro cards de Hoje, os de
// Projetos e Aportes. Com `href`, o card inteiro é um link com `aria-label` completo
// ("3 próximas ações vencidas, abrir lista"). Grid pai: `grid grid-cols-2 gap-3 md:grid-cols-4`.
export type StatCardTone = "neutral" | "warning" | "danger" | "success";

const DOT_CLASS: Record<StatCardTone, string> = {
  neutral: "",
  warning: "bg-warning",
  danger: "bg-destructive",
  success: "bg-success",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  href,
  icon: Icon,
  ariaLabel,
  extra,
  className,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: StatCardTone;
  href?: string;
  icon?: LucideIcon;
  ariaLabel?: string;
  // Conteúdo opcional abaixo do número (ex.: um `Meter`).
  extra?: ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="crm-eyebrow flex items-center gap-1.5">
          {tone !== "neutral" ? (
            <span
              aria-hidden="true"
              className={cn("inline-block size-2 shrink-0 rounded-full", DOT_CLASS[tone])}
            />
          ) : null}
          {label}
        </span>
        {Icon ? (
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : null}
      </span>
      <span className="crm-kpi">{value}</span>
      {extra ? <span className="flex items-center">{extra}</span> : null}
      {hint ? <span className="crm-meta">{hint}</span> : null}
    </>
  );
  const classes = cn(
    "flex flex-col gap-1 rounded-xl border border-border bg-card p-4 text-left",
    href && "transition-colors duration-120 hover:bg-surface-2 focus-visible:outline",
    className,
  );
  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={classes}>
        {body}
      </Link>
    );
  }
  return (
    <div className={classes} aria-label={ariaLabel}>
      {body}
    </div>
  );
}
