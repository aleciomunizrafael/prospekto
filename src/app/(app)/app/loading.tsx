import {
  LoadingShell,
  SkeletonCard,
  SkeletonPageHeader,
  SkeletonStatCards,
} from "@/components/crm/ui/loading-skeletons";

// Hoje: quatro StatCards e dois blocos de cinco linhas (crm-design-system.md, seção 5.2).
export default function Loading() {
  return (
    <LoadingShell label="Carregando Hoje…">
      <SkeletonPageHeader withActions={false} />
      <SkeletonStatCards count={4} />
      <SkeletonCard lines={5} />
      <SkeletonCard lines={5} />
    </LoadingShell>
  );
}
