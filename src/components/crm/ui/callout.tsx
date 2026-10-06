import { CircleCheck, Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Aviso em linha (crm-design-system.md, seção 5.2): texto escuro sobre fundo *-soft, ícone fixo
// por tom e papel ARIA coerente (status para info/sucesso, alert para aviso/perigo).
export type CalloutTone = "info" | "warning" | "danger" | "success";

const TONE_CLASS: Record<CalloutTone, string> = {
  info: "border-primary/30 bg-primary-soft text-foreground",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-destructive/30 bg-error-soft text-destructive",
  success: "border-success/30 bg-success-soft text-success",
};

const TONE_ICON: Record<CalloutTone, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  danger: OctagonAlert,
  success: CircleCheck,
};

export function Callout({
  tone,
  title,
  icon,
  children,
  role,
  className,
  id,
  tabIndex,
}: {
  tone: CalloutTone;
  title?: ReactNode;
  icon?: LucideIcon;
  children: ReactNode;
  role?: "status" | "alert" | "note";
  className?: string;
  id?: string;
  tabIndex?: number;
}) {
  const Icon = icon ?? TONE_ICON[tone];
  const defaultRole = tone === "info" || tone === "success" ? "status" : "alert";
  return (
    <div
      id={id}
      role={role ?? defaultRole}
      tabIndex={tabIndex}
      className={cn("flex gap-3 rounded-lg border px-3 py-2 text-sm", TONE_CLASS[tone], className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1">
        {title ? <p className="font-medium">{title}</p> : null}
        <div className="[&_a]:underline [&_a]:underline-offset-2">{children}</div>
      </div>
    </div>
  );
}
