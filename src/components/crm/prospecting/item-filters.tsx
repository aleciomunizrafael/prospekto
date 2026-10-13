import { Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PROSPECTING_STATUS_LABELS } from "@/lib/crm/labels";
import { itemFiltersHref, type ItemFilters as Filters } from "@/lib/crm/prospecting-view";
import { PROSPECTING_STATUSES, type ProspectingStatus } from "@/lib/domain/enums";
import { cn } from "@/lib/utils";

// Chips de status da lista de prospecção (ADR-004, 6.6; plano, P19): links com aria-current no
// ativo dentro de um nav, mais o campo de busca por nome (formulário GET, Enter). Os filtros
// vivem na URL: `status` (um dos cinco ou ausente = todos) e `q`. Server Component.
export type ItemCounts = Record<ProspectingStatus | "todos", number>;

export function ItemFilters({
  listId,
  counts,
  filters,
  className,
}: {
  listId: string;
  counts: ItemCounts;
  filters: Filters;
  className?: string;
}) {
  const chips: { status: ProspectingStatus | undefined; label: string; count: number }[] = [
    { status: undefined, label: "Todos", count: counts.todos },
    ...PROSPECTING_STATUSES.map((status) => ({
      status,
      label: PROSPECTING_STATUS_LABELS[status],
      count: counts[status],
    })),
  ];
  return (
    <div
      className={cn(
        "flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4",
        className,
      )}
    >
      <nav aria-label="Status" className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = filters.status === chip.status;
          return (
            <Badge
              key={chip.label}
              variant={active ? "info" : "outline"}
              render={
                <Link
                  href={itemFiltersHref(listId, { status: chip.status, q: filters.q })}
                  aria-current={active ? "true" : undefined}
                />
              }
              className={cn("h-7 px-2.5", !active && "hover:bg-surface-2")}
            >
              {chip.label}
              <span className={cn("tabular-nums", !active && "text-muted-foreground")}>
                {chip.count}
              </span>
            </Badge>
          );
        })}
      </nav>
      <form
        method="get"
        action={`/app/prospeccao/${listId}`}
        role="search"
        className="relative md:w-64"
      >
        {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
        <label htmlFor="prospecting-q" className="sr-only">
          Buscar empresa pelo nome
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="prospecting-q"
          type="search"
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Buscar empresa"
          className="h-11 w-full rounded-lg border border-input bg-background pr-2 pl-8 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm"
        />
      </form>
    </div>
  );
}
