// Compatibilidade temporária (apagado na Fase 3 do redesign): os badges de estágio e de
// temperatura vêm de StatusBadge (crm-design-system.md, seção 6). Nenhum arquivo novo deve
// importar daqui.
import type { LeadTemperature } from "@/lib/domain/enums";
import { StatusBadge } from "./ui/status-badge";

export { StatusBadge };

export function TemperatureBadge({ temperature }: { temperature: LeadTemperature }) {
  return <StatusBadge kind="temperature" value={temperature} size="md" />;
}

export function StageBadge({ stage, pipeline }: { stage: string; pipeline?: string }) {
  return <StatusBadge kind="stage" value={stage} pipeline={pipeline} />;
}
