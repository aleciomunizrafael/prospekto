import { Skeleton } from "@/components/ui/skeleton";
import { LoadingShell, SkeletonPageHeader } from "@/components/crm/ui/loading-skeletons";

// Silhueta da lista de prospecção: cabeçalho, barra de progresso, chips de status e cartões.
export default function Loading() {
  return (
    <LoadingShell label="Carregando lista de prospecção…">
      <SkeletonPageHeader />
      <Skeleton className="h-2 w-full" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-24" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3.5"
          >
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-7 w-80" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
