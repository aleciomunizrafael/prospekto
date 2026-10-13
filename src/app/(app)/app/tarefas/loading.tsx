import {
  LoadingShell,
  SkeletonCard,
  SkeletonPageHeader,
} from "@/components/crm/ui/loading-skeletons";

// Tarefas: cabeçalho, a linha dos chips de filtro e as três colunas (A fazer, Em andamento,
// Concluída) com cartões de alturas diferentes, como o quadro real.
export default function Loading() {
  return (
    <LoadingShell label="Carregando tarefas…">
      <SkeletonPageHeader />
      <div className="flex gap-2" aria-hidden="true">
        <span className="h-8 w-28 animate-pulse rounded-full bg-muted" />
        <span className="h-8 w-28 animate-pulse rounded-full bg-muted" />
        <span className="h-8 w-28 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-2">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-2">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-2">
          <SkeletonCard lines={2} />
        </div>
      </div>
    </LoadingShell>
  );
}
