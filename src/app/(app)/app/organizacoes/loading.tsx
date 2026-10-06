import {
  LoadingShell,
  SkeletonPageHeader,
  SkeletonRows,
  SkeletonToolbar,
} from "@/components/crm/ui/loading-skeletons";

export default function Loading() {
  return (
    <LoadingShell label="Carregando organizações…">
      <SkeletonPageHeader />
      <SkeletonToolbar />
      <SkeletonRows rows={8} />
    </LoadingShell>
  );
}
