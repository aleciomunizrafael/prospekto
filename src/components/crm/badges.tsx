import { Badge } from "@/components/ui/badge";
import { TEMPERATURE_LABELS, stageLabel } from "@/lib/crm/labels";
import type { LeadTemperature } from "@/lib/domain/enums";

export function TemperatureBadge({ temperature }: { temperature: LeadTemperature }) {
  const variant =
    temperature === "quente" ? "destructive" : temperature === "morno" ? "default" : "secondary";
  return <Badge variant={variant}>{TEMPERATURE_LABELS[temperature]}</Badge>;
}

export function StageBadge({ stage }: { stage: string }) {
  const terminal = stage === "perdido" || stage === "arquivado";
  return <Badge variant={terminal ? "outline" : "secondary"}>{stageLabel(stage)}</Badge>;
}
