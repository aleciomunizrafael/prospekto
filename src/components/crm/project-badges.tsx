import { Badge } from "@/components/ui/badge";

// Alertas da regra R-13 em um projeto (menos de 6 meses de prazo; menos de 10% captado).
export function ProjectAlertBadges({ alerts }: { alerts: ("prazo" | "captacao")[] }) {
  if (!alerts.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {alerts.includes("prazo") ? <Badge variant="destructive">menos de 6 meses</Badge> : null}
      {alerts.includes("captacao") ? <Badge variant="destructive">abaixo de 10%</Badge> : null}
    </span>
  );
}
