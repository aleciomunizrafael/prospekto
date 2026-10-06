import { Badge } from "@/components/ui/badge";
import { PROJECT_ALERT_TONES } from "@/lib/crm/status-tones";

// Reexport de compatibilidade (crm-redesign-plano.md, Frente E): o badge de estágio vem de
// StatusBadge; os alertas da regra R-13 usam o tom e o texto de status-tones.ts. Este arquivo é
// apagado na Fase 3; as páginas de projeto já usam StatusBadge e os ícones de alerta direto.
export { StatusBadge } from "./ui/status-badge";

export function ProjectAlertBadges({ alerts }: { alerts: ("prazo" | "captacao")[] }) {
  if (!alerts.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {alerts.map((alert) => {
        const { tone, icon: Icon, label } = PROJECT_ALERT_TONES[alert];
        return (
          <Badge key={alert} variant={tone}>
            <Icon aria-hidden="true" />
            {label}
          </Badge>
        );
      })}
    </span>
  );
}
