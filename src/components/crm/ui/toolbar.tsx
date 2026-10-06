import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ToolbarForm } from "./toolbar-autosubmit";

// Barra de filtros das listas (crm-design-system.md, seção 5.2, decisões D17 e D19). Desktop: um
// formulário GET em linha, selects aplicam no `change`; o botão "Filtrar" só aparece sem
// JavaScript (`scripting:hidden`). Celular: busca + "Filtrar (N)" que abre uma folha inferior com
// os mesmos selects em coluna e um botão "Aplicar". Chips dos filtros ativos nos dois tamanhos.
export type FilterOption = { value: string; label: string };

export type FilterDef = {
  name: string;
  label: string;
  value: string;
  options: FilterOption[];
  // Texto da primeira opção (valor vazio); padrão "todos" ("Estágio: todos").
  allLabel?: string;
};

export type ToolbarChip = { label: string; removeHref: string };

type ToolbarProps = {
  action: string;
  search?: { name: string; placeholder: string; value: string };
  filters: FilterDef[];
  hidden?: Record<string, string>;
  chips: ToolbarChip[];
  clearHref?: string;
  sort?: FilterDef;
  // Controles extras (ex.: menu "⋯ Mais filtros" no desktop); no celular entram na folha.
  extra?: ReactNode;
  mobileTitle?: string;
  className?: string;
};

const selectBase =
  "rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&:has(option[value='']:checked)]:text-placeholder";

function HiddenFields({ hidden }: { hidden?: Record<string, string> }) {
  if (!hidden) return null;
  return (
    <>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}

function FilterSelect({
  filter,
  size,
  isSort,
}: {
  filter: FilterDef;
  size: "sm" | "touch";
  isSort?: boolean;
}) {
  const id = `toolbar-${size}-${filter.name}`;
  return (
    <div className={cn("flex flex-col gap-1", size === "touch" && "w-full")}>
      <label htmlFor={id} className={size === "sm" ? "sr-only" : "text-sm font-medium"}>
        {filter.label}
      </label>
      <select
        id={id}
        name={filter.name}
        defaultValue={filter.value}
        className={cn(selectBase, size === "sm" ? "h-9" : "h-11 w-full text-base")}
      >
        {isSort ? null : (
          <option value="">
            {size === "sm"
              ? `${filter.label}: ${filter.allLabel ?? "todos"}`
              : (filter.allLabel ?? "Todos")}
          </option>
        )}
        {filter.options.map((o) => (
          <option key={o.value} value={o.value}>
            {size === "sm" && isSort ? `${filter.label}: ${o.label}` : o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SearchInput({
  search,
  size,
}: {
  search: NonNullable<ToolbarProps["search"]>;
  size: "sm" | "touch";
}) {
  const id = `toolbar-${size}-${search.name}`;
  return (
    <div className={cn("relative", size === "sm" ? "w-60" : "min-w-0 flex-1")}>
      <label htmlFor={id} className="sr-only">
        {search.placeholder}
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        name={search.name}
        defaultValue={search.value}
        placeholder={search.placeholder}
        className={cn(
          "w-full rounded-lg border border-input bg-background pr-2 pl-8 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm",
          size === "sm" ? "h-9" : "h-11",
        )}
      />
    </div>
  );
}

function Chips({ chips, clearHref }: { chips: ToolbarChip[]; clearHref?: string }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge
          key={chip.label + chip.removeHref}
          variant="outline"
          render={<Link href={chip.removeHref} aria-label={`Remover filtro ${chip.label}`} />}
          className="hover:bg-surface-2"
        >
          {chip.label}
          <X aria-hidden="true" />
        </Badge>
      ))}
      {clearHref ? (
        <Link
          href={clearHref}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Limpar
        </Link>
      ) : null}
    </div>
  );
}

export function Toolbar({
  action,
  search,
  filters,
  hidden,
  chips,
  clearHref,
  sort,
  extra,
  mobileTitle = "Filtrar",
  className,
}: ToolbarProps) {
  const activeCount = filters.filter((f) => f.value !== "").length;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Desktop: tudo em linha, aplica no change. */}
      <ToolbarForm
        action={action}
        className="hidden flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-2 md:flex"
      >
        <HiddenFields hidden={hidden} />
        {search ? <SearchInput search={search} size="sm" /> : null}
        {filters.map((f) => (
          <FilterSelect key={f.name} filter={f} size="sm" />
        ))}
        {sort ? <FilterSelect filter={sort} size="sm" isSort /> : null}
        {extra}
        <Button type="submit" variant="outline" size="sm" className="scripting:hidden">
          Filtrar
        </Button>
      </ToolbarForm>

      {/* Celular: busca + folha inferior com os filtros. */}
      <div className="flex items-center gap-2 md:hidden">
        <ToolbarForm action={action} autoSubmit={false} className="min-w-0 flex-1">
          <HiddenFields hidden={hidden} />
          {filters.map((f) =>
            f.value ? <input key={f.name} type="hidden" name={f.name} value={f.value} /> : null,
          )}
          {sort?.value ? <input type="hidden" name={sort.name} value={sort.value} /> : null}
          {search ? <SearchInput search={search} size="touch" /> : null}
        </ToolbarForm>
        {filters.length > 0 || sort || extra ? (
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="touch" className="shrink-0" />}>
              <SlidersHorizontal aria-hidden="true" />
              {activeCount > 0 ? `Filtrar (${activeCount})` : "Filtrar"}
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>{mobileTitle}</SheetTitle>
                <SheetDescription>Escolha os filtros e toque em Aplicar.</SheetDescription>
              </SheetHeader>
              <ToolbarForm action={action} autoSubmit={false} className="flex flex-col gap-3">
                <HiddenFields hidden={hidden} />
                {search?.value ? (
                  <input type="hidden" name={search.name} value={search.value} />
                ) : null}
                {filters.map((f) => (
                  <FilterSelect key={f.name} filter={f} size="touch" />
                ))}
                {sort ? <FilterSelect filter={sort} size="touch" isSort /> : null}
                {extra ? <div className="flex flex-col gap-3">{extra}</div> : null}
                <Button type="submit" size="touch" className="w-full">
                  Aplicar
                </Button>
                {clearHref && (activeCount > 0 || chips.length > 0) ? (
                  <Button
                    variant="ghost"
                    size="touch"
                    className="w-full"
                    nativeButton={false}
                    render={<Link href={clearHref} />}
                  >
                    Limpar
                  </Button>
                ) : null}
              </ToolbarForm>
            </SheetContent>
          </Sheet>
        ) : null}
      </div>
      <Chips chips={chips} clearHref={chips.length > 0 ? clearHref : undefined} />
    </div>
  );
}
