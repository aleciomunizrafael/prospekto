import { Skeleton } from "@/components/ui/skeleton";
import {
  LoadingShell,
  SkeletonPageHeader,
  SkeletonToolbar,
} from "@/components/crm/ui/loading-skeletons";

// Pipeline: abas de pipeline, toolbar e um esqueleto neutro de quatro blocos que serve à lista e
// ao quadro (não lê o cookie da visão).
export default function Loading() {
  return (
    <LoadingShell label="Carregando pipeline…">
      <SkeletonPageHeader />
      <div className="flex gap-4 border-b border-border pb-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-24" />
        ))}
      </div>
      <SkeletonToolbar />
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-2"
          >
            <Skeleton className="h-5 w-28 bg-background" />
            <Skeleton className="h-20 w-full bg-background" />
            <Skeleton className="hidden h-20 w-full bg-background md:block" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
