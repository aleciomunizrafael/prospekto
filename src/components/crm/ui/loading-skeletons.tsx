import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Silhuetas dos loading.tsx (crm-design-system.md, seção 5.2, "Loading"): cada rota monta a sua
// com estas peças. `LoadingShell` anuncia "Carregando…" uma vez num role="status" e esconde o
// resto de leitores de tela (os Skeleton já são aria-hidden).
export function LoadingShell({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col gap-6", className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonPageHeader({ withActions = true }: { withActions?: boolean }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
      </div>
      {withActions ? (
        <div className="hidden gap-2 md:flex">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      ) : null}
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3",
        count >= 5 ? "md:grid-cols-5" : count === 3 ? "md:grid-cols-3" : "md:grid-cols-4",
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="gap-2 p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-3 w-24" />
        </Card>
      ))}
    </div>
  );
}

export function SkeletonToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-2">
      <Skeleton className="h-9 w-60 bg-background" />
      <Skeleton className="hidden h-9 w-32 bg-background md:block" />
      <Skeleton className="hidden h-9 w-32 bg-background md:block" />
      <Skeleton className="h-9 w-24 bg-background md:hidden" />
    </div>
  );
}

export function SkeletonRows({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <Card className={cn("gap-0 p-0", className)}>
      <div className="h-10 border-b border-border bg-surface-2" />
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex h-11 items-center gap-4 border-b border-divider px-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
      ))}
    </Card>
  );
}

export function SkeletonCard({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <Card className={cn("gap-3 p-4", className)}>
      <Skeleton className="h-5 w-32" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i % 2 === 0 ? "w-full" : "w-3/4")} />
      ))}
    </Card>
  );
}

// Detalhe: cabeçalho, NextStepCard e duas colunas (principal e lateral).
export function SkeletonDetail() {
  return (
    <>
      <SkeletonPageHeader />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <Card className="gap-3 border-l-[3px] border-l-brand p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-9 w-36" />
          </Card>
          <SkeletonCard lines={5} />
          <SkeletonCard lines={6} />
        </div>
        <div className="flex flex-col gap-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
      </div>
    </>
  );
}
