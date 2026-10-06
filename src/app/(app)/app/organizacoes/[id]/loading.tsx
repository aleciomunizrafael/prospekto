import { LoadingShell, SkeletonDetail } from "@/components/crm/ui/loading-skeletons";

export default function Loading() {
  return (
    <LoadingShell label="Carregando organização…">
      <SkeletonDetail />
    </LoadingShell>
  );
}
