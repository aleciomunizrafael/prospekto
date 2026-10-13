import {
  LoadingShell,
  SkeletonCard,
  SkeletonPageHeader,
} from "@/components/crm/ui/loading-skeletons";

// Tarefas: cabeçalho e três colunas (A fazer, Em andamento, Concluída).
export default function Loading() {
  return (
    <LoadingShell label="Carregando tarefas…">
      <SkeletonPageHeader />
      <div className="grid gap-3 md:grid-cols-3">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </div>
    </LoadingShell>
  );
}
