import {
  LoadingShell,
  SkeletonDetail,
  SkeletonStatCards,
} from "@/components/crm/ui/loading-skeletons";

export default function Loading() {
  return (
    <LoadingShell label="Carregando projeto…">
      <SkeletonStatCards count={5} />
      <SkeletonDetail />
    </LoadingShell>
  );
}
