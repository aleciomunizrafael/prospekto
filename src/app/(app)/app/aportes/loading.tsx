import {
  LoadingShell,
  SkeletonPageHeader,
  SkeletonRows,
  SkeletonStatCards,
  SkeletonToolbar,
} from "@/components/crm/ui/loading-skeletons";

export default function Loading() {
  return (
    <LoadingShell label="Carregando aportes…">
      <SkeletonPageHeader />
      <SkeletonStatCards count={4} />
      <SkeletonToolbar />
      <SkeletonRows rows={6} />
    </LoadingShell>
  );
}
