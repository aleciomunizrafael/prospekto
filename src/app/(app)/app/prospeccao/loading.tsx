import {
  LoadingShell,
  SkeletonPageHeader,
  SkeletonRows,
} from "@/components/crm/ui/loading-skeletons";

export default function Loading() {
  return (
    <LoadingShell label="Carregando prospecção…">
      <SkeletonPageHeader />
      <SkeletonRows rows={6} />
    </LoadingShell>
  );
}
