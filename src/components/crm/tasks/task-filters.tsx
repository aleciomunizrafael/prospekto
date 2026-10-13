import Link from "next/link";
import { hasTaskFilters, taskFiltersHref, type TaskFilters } from "@/lib/crm/task-board";
import { cn } from "@/lib/utils";

// Filtros do quadro de Tarefas (ADR-004, 6.5 e 6.12; plano, P19): chips-link que trocam um filtro
// na URL (?dono=eu, ?atrasadas=1, ?vencem=hoje; combinam) com `aria-current="true"` no ativo,
// nunca `aria-pressed` (só vale em role="button"). "Limpar" aparece quando algum está ativo.
// Puro: Server Component.

type Chip = { key: keyof TaskFilters; label: string };

const CHIPS: Chip[] = [
  { key: "mine", label: "Só as minhas" },
  { key: "overdue", label: "Só atrasadas" },
  { key: "dueToday", label: "Vencem hoje" },
];

export function TaskFilters({ filters }: { filters: TaskFilters }) {
  return (
    <nav aria-label="Filtros" className="flex flex-wrap items-center gap-2">
      {CHIPS.map((chip) => {
        const active = filters[chip.key];
        return (
          <Link
            key={chip.key}
            href={taskFiltersHref({ ...filters, [chip.key]: !active })}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex h-11 items-center rounded-full border px-3 text-sm transition-colors duration-120 md:h-8",
              active
                ? "border-primary/40 bg-primary-soft font-medium text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {chip.label}
          </Link>
        );
      })}
      {hasTaskFilters(filters) ? (
        <Link
          href={taskFiltersHref({})}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Limpar
        </Link>
      ) : null}
    </nav>
  );
}
