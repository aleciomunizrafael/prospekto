import { LoadingShell, SkeletonDetail } from "@/components/crm/ui/loading-skeletons";

// Silhueta da ficha da empresa: cabeçalho e duas colunas (principal e lateral).
export default function Loading() {
  return (
    <LoadingShell label="Carregando empresa…">
      <SkeletonDetail />
    </LoadingShell>
  );
}
