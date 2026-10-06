import { Skeleton } from "@/components/ui/skeleton";
import {
  LoadingShell,
  SkeletonPageHeader,
  SkeletonRows,
} from "@/components/crm/ui/loading-skeletons";

export default function Loading() {
  return (
    <LoadingShell label="Buscando…">
      <SkeletonPageHeader withActions={false} />
      <Skeleton className="h-11 w-full max-w-xl bg-background md:h-9" />
      <SkeletonRows rows={3} />
      <SkeletonRows rows={2} />
      <SkeletonRows rows={2} />
    </LoadingShell>
  );
}
