import { Badge } from "@/components/ui/badge";
import { CONTRIBUTION_STATUS_LABELS, ORGANIZATION_TYPE_LABELS } from "@/lib/crm/enum-labels";
import { TEMPERATURE_LABELS, stageLabel } from "@/lib/crm/labels";
import {
  contributionTone,
  orgTypeTone,
  stageTone,
  temperatureTone,
  type ToneAndIcon,
} from "@/lib/crm/status-tones";
import { PIPELINES, isStageOf } from "@/lib/domain/pipelines";
import { cn } from "@/lib/utils";

// Badge semântico (crm-design-system.md, seções 5.2 e 6): família e ícone vêm de status-tones.ts,
// o rótulo de labels.ts/enum-labels.ts; texto sempre visível, ícone decorativo. Temperatura "frio"
// some nas tabelas (`size="sm"`) e aparece como "Frio" no detalhe. É o único badge de status do
// CRM (ContributionStatusBadge, em contribution-table.tsx, é um reexport).
export type StatusBadgeKind = "stage" | "contribution" | "temperature" | "orgType";

function resolve(
  kind: StatusBadgeKind,
  value: string,
  pipeline?: string,
): ToneAndIcon & { label: string } {
  switch (kind) {
    case "stage": {
      const p = pipeline ?? PIPELINES.find((candidate) => isStageOf(candidate, value)) ?? "";
      return { ...stageTone(p, value), label: stageLabel(value) };
    }
    case "contribution":
      return {
        ...contributionTone(value),
        label: (CONTRIBUTION_STATUS_LABELS as Record<string, string>)[value] ?? value,
      };
    case "temperature":
      return {
        ...temperatureTone(value),
        label: (TEMPERATURE_LABELS as Record<string, string>)[value] ?? value,
      };
    case "orgType":
      return {
        ...orgTypeTone(value),
        label: (ORGANIZATION_TYPE_LABELS as Record<string, string>)[value] ?? value,
      };
  }
}

export function StatusBadge({
  kind,
  value,
  pipeline,
  size = "sm",
  className,
}: {
  kind: StatusBadgeKind;
  value: string;
  pipeline?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  if (kind === "temperature" && value === "frio" && size === "sm") return null;
  const { tone, icon: Icon, label } = resolve(kind, value, pipeline);
  return (
    <Badge variant={tone} className={cn(size === "md" && "h-7 px-2.5 text-sm", className)}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
