import { cn } from "@/lib/utils";

// Barra de progresso com percentual sempre em texto (crm-design-system.md, seção 5.2): captado
// de um projeto, comissão registrada. `role="progressbar"` com os valores ARIA e o rótulo.
export function Meter({
  value,
  max,
  label,
  text,
  tone = "neutral",
  size = "md",
  className,
}: {
  value: number;
  max: number;
  label: string;
  text?: string;
  tone?: "neutral" | "warning" | "danger";
  size?: "sm" | "md";
  className?: string;
}) {
  const safeMax = max > 0 ? max : 0;
  const ratio = safeMax > 0 ? Math.min(1, Math.max(0, value / safeMax)) : 0;
  const percent = Math.round(ratio * 100);
  const shown = text ?? `${new Intl.NumberFormat("pt-BR").format(percent)} %`;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        role="progressbar"
        aria-valuenow={Math.max(0, Math.min(value, safeMax || value))}
        aria-valuemin={0}
        aria-valuemax={safeMax || undefined}
        aria-valuetext={shown}
        aria-label={label}
        className={cn(
          "block w-24 shrink-0 overflow-hidden rounded-full bg-muted",
          size === "sm" ? "h-1.5" : "h-1.5 md:h-2",
        )}
      >
        <span
          className={cn(
            "block h-full rounded-full",
            tone === "danger" ? "bg-destructive" : tone === "warning" ? "bg-warning" : "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span
        className={cn(
          "text-sm tabular-nums",
          tone === "danger"
            ? "text-destructive"
            : tone === "warning"
              ? "text-warning"
              : "text-foreground",
        )}
      >
        {shown}
      </span>
    </span>
  );
}
