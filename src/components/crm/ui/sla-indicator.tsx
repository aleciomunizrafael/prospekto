import { Circle, CircleAlert, Clock } from "lucide-react";
import { describeSla, type SlaStage } from "@/lib/crm/describe-sla";
import type { StageInfo } from "@/lib/crm/lead-view";
import { cn } from "@/lib/utils";

// Prazo em frase humana (crm-design-system.md, seção 5.2, decisão D3): "Ação atrasada há 3 dias",
// "Sem contato há 6 dias (prazo: 1 dia útil)", "Próxima ação sex., 9 de out.". Vencido em vermelho
// com ícone; menos de 24 h em âmbar com relógio; o resto em cinza. `stage` (o lead inteiro serve)
// deixa a frase citar o prazo do estágio.
export function SlaIndicator({
  info,
  nextActionAt,
  now,
  stage,
  variant = "inline",
  className,
}: {
  info: StageInfo;
  nextActionAt: Date | null;
  now: Date;
  stage?: SlaStage;
  variant?: "inline" | "block";
  className?: string;
}) {
  const sla = describeSla(info, nextActionAt, now, stage);
  const Icon = sla.tone === "danger" ? CircleAlert : sla.tone === "warning" ? Clock : Circle;
  return (
    <span
      aria-label={sla.text}
      title={sla.text}
      className={cn(
        "inline-flex items-center gap-1",
        variant === "block" ? "text-sm" : "text-xs",
        sla.tone === "danger"
          ? "font-medium text-destructive"
          : sla.tone === "warning"
            ? "text-warning"
            : "text-muted-foreground",
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("shrink-0", sla.tone === "neutral" ? "size-2.5" : "size-3.5")}
      />
      <span className="min-w-0">{sla.text}</span>
    </span>
  );
}
