import { Skeleton } from "@/components/ui/skeleton";
import {
  LoadingShell,
  SkeletonPageHeader,
  SkeletonRows,
  SkeletonToolbar,
} from "@/components/crm/ui/loading-skeletons";

// Leads: abas de pipeline, toolbar e oito linhas de 44 px.
export default function Loading() {
  return (
    <LoadingShell label="Carregando leads…">
      <SkeletonPageHeader />
      <div className="flex gap-4 border-b border-border pb-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-24" />
        ))}
      </div>
      <SkeletonToolbar />
      <SkeletonRows rows={8} />
    </LoadingShell>
  );
}
