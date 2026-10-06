import { ChevronLeft, ChevronRight, Ellipsis, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DismissableDetails } from "@/components/crm/ui/dismissable-details";
import { Chips, Toolbar, type FilterDef, type ToolbarChip } from "@/components/crm/ui/toolbar";
import { leadFiltersToQuery, type LeadFilters } from "@/lib/crm/filters";
import {
  PIPELINE_LABELS,
  SEGMENT_LABELS,
  SOURCE_LABELS,
  TEMPERATURE_LABELS,
  stageLabel,
} from "@/lib/crm/labels";
import { LEAD_SOURCES, LEAD_TEMPERATURES } from "@/lib/domain/enums";
import { PIPELINES, STAGES, type Pipeline } from "@/lib/domain/pipelines";
import { cn } from "@/lib/utils";

// Abas por pipeline (links), barra de filtros (formulário GET) e paginação da lista de Leads
// (crm-design-system.md, seção 7.3). Tudo fica na URL: `parseLeadFilters` e `leadFiltersToQuery`
// não mudam, e os links gerados aqui são os mesmos de antes.

const ACTION = "/app/leads";

function leadsHref(f: Partial<LeadFilters>): string {
  return `${ACTION}${leadFiltersToQuery(f)}`;
}

// Abas de pipeline: no celular rolam dentro do próprio elemento (a única rolagem horizontal
// permitida); no desktop ficam em linha.
export function PipelineTabs({
  current,
  counts,
}: {
  current: Pipeline;
  counts: Record<Pipeline, number>;
}) {
  return (
    <nav
      aria-label="Pipelines"
      className="-mx-4 flex snap-x overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0"
    >
      {PIPELINES.map((p) => (
        <Link
          key={p}
          href={leadsHref({ pipeline: p })}
          aria-current={p === current ? "page" : undefined}
          className={cn(
            "-mb-px flex h-11 shrink-0 snap-start items-center gap-1.5 border-b-2 px-3 text-sm whitespace-nowrap transition-colors duration-120 md:h-10",
            p === current
              ? "border-primary font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          {PIPELINE_LABELS[p]}
          <span className="tabular-nums text-muted-foreground">{counts[p]}</span>
        </Link>
      ))}
    </nav>
  );
}

type User = { id: string; name: string };

const SORT_OPTIONS = [
  { value: "next_action", label: "próxima ação" },
  { value: "created", label: "mais recentes" },
];

function filterDefs(f: LeadFilters, users: User[]) {
  const stage: FilterDef = {
    name: "stage",
    label: "Estágio",
    value: f.stage ?? "",
    options: STAGES[f.pipeline].map((s) => ({ value: s, label: stageLabel(s) })),
  };
  const segment: FilterDef | null =
    f.pipeline === "patrocinadores"
      ? {
          name: "segment",
          label: "Segmento",
          value: f.segment ?? "",
          options: [
            { value: "PJ", label: SEGMENT_LABELS.PJ },
            { value: "PF", label: SEGMENT_LABELS.PF },
          ],
        }
      : null;
  const source: FilterDef = {
    name: "source",
    label: "Origem",
    value: f.source ?? "",
    options: LEAD_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] })),
    allLabel: "todas",
  };
  const owner: FilterDef = {
    name: "owner",
    label: "Dono",
    value: f.ownerUserId ?? "",
    options: users.map((u) => ({ value: u.id, label: u.name })),
  };
  const temperature: FilterDef = {
    name: "temperature",
    label: "Temperatura",
    value: f.temperature ?? "",
    options: LEAD_TEMPERATURES.map((t) => ({ value: t, label: TEMPERATURE_LABELS[t] })),
    allLabel: "todas",
  };
  const sort: FilterDef = { name: "sort", label: "Ordenar", value: f.sort, options: SORT_OPTIONS };
  const main = [stage, segment, source, owner].filter((d): d is FilterDef => d !== null);
  return { main, temperature, sort };
}

// Chips dos filtros ativos. No desktop os selects visíveis já mostram estágio, segmento, origem e
// dono, então só temperatura e perdidos (que ficam no menu "Mais filtros") viram chip; no celular
// os selects ficam dentro da folha e todos os filtros ativos precisam aparecer como chip.
function chipsFor(f: LeadFilters, selects: FilterDef[] = []): ToolbarChip[] {
  const chips: ToolbarChip[] = [];
  for (const d of selects) {
    if (!d.value) continue;
    const label = d.options.find((o) => o.value === d.value)?.label ?? d.value;
    const without: Partial<LeadFilters> = { ...f, page: 1 };
    delete without[(d.name === "owner" ? "ownerUserId" : d.name) as keyof LeadFilters];
    chips.push({ label: `${d.label}: ${label}`, removeHref: leadsHref(without) });
  }
  if (f.temperature) {
    chips.push({
      label: `Temperatura: ${TEMPERATURE_LABELS[f.temperature]}`,
      removeHref: leadsHref({ ...f, temperature: undefined, page: 1 }),
    });
  }
  if (f.includeLost) {
    chips.push({
      label: "Mostrar perdidos",
      removeHref: leadsHref({ ...f, includeLost: false, page: 1 }),
    });
  }
  return chips;
}

const selectBase =
  "rounded-lg border border-input bg-background px-2 text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&:has(option[value='']:checked)]:text-placeholder";

// Select de filtro com rótulo visível (menu "Mais filtros" no desktop e folha no celular).
function LabeledSelect({
  filter,
  prefix,
  size,
  isSort,
}: {
  filter: FilterDef;
  prefix: string;
  size: "sm" | "touch";
  isSort?: boolean;
}) {
  const id = `${prefix}-${filter.name}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {filter.label}
      </label>
      <select
        id={id}
        name={filter.name}
        defaultValue={filter.value}
        className={cn(selectBase, size === "sm" ? "h-9 text-sm" : "h-11 text-base")}
      >
        {isSort ? null : <option value="">{capitalize(filter.allLabel ?? "todos")}</option>}
        {filter.options.map((o) => (
          <option key={o.value} value={o.value}>
            {isSort ? capitalize(o.label) : o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Barra de filtros. Desktop: a `Toolbar` compartilhada (busca, quatro selects, ordenação) com o
// menu "⋯ Mais filtros" (temperatura e perdidos) dentro do mesmo <form>, num <details> que fecha
// com Esc e clique fora (DismissableDetails) sem sair do formulário. Celular: busca + "Filtrar (N)"
// abrindo uma folha com todos os filtros; N conta os filtros ativos, inclusive temperatura e
// perdidos, sem contar pipeline nem a ordenação padrão.
export function LeadToolbar({ filters, users }: { filters: LeadFilters; users: User[] }) {
  const f = filters;
  const { main, temperature, sort } = filterDefs(f, users);
  const lost: FilterDef = {
    name: "lost",
    label: "Perdidos",
    value: f.includeLost ? "1" : "",
    options: [{ value: "1", label: "Mostrar perdidos" }],
    allLabel: "ocultar perdidos",
  };
  const chips = chipsFor(f);
  const mobileChips = chipsFor(f, main);
  const clearHref = leadsHref({ pipeline: f.pipeline });
  const moreCount = (f.temperature ? 1 : 0) + (f.includeLost ? 1 : 0);
  const activeCount = main.filter((d) => d.value !== "").length + moreCount;
  const search = { name: "q", placeholder: "Nome, e-mail ou empresa", value: f.search ?? "" };
  const sortIsDefault = f.sort === "next_action";

  const moreFilters = (
    <DismissableDetails className="relative">
      <summary
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
      >
        <Ellipsis aria-hidden="true" />
        Mais filtros{moreCount > 0 ? ` (${moreCount})` : ""}
      </summary>
      <div className="absolute top-full right-0 z-20 mt-1 flex w-64 flex-col gap-3 rounded-lg bg-popover p-3 text-popover-foreground shadow-pop ring-1 ring-border">
        <LabeledSelect filter={temperature} prefix="mais" size="sm" />
        <LabeledSelect filter={lost} prefix="mais" size="sm" />
      </div>
    </DismissableDetails>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="hidden md:block">
        <Toolbar
          action={ACTION}
          search={search}
          filters={main}
          hidden={{ pipeline: f.pipeline }}
          sort={sort}
          extra={moreFilters}
          chips={chips}
          clearHref={clearHref}
        />
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex items-center gap-2">
          <form method="get" action={ACTION} className="relative min-w-0 flex-1">
            <input type="hidden" name="pipeline" value={f.pipeline} />
            {[...main, temperature].map((d) =>
              d.value ? <input key={d.name} type="hidden" name={d.name} value={d.value} /> : null,
            )}
            {f.includeLost ? <input type="hidden" name="lost" value="1" /> : null}
            {sortIsDefault ? null : <input type="hidden" name="sort" value={f.sort} />}
            <label htmlFor="leads-busca" className="sr-only">
              {search.placeholder}
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="leads-busca"
              type="search"
              name="q"
              defaultValue={search.value}
              placeholder={search.placeholder}
              className="h-11 w-full rounded-lg border border-input bg-background pr-2 pl-8 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </form>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="touch" className="shrink-0" />}>
              <SlidersHorizontal aria-hidden="true" />
              {activeCount > 0 ? `Filtrar (${activeCount})` : "Filtrar"}
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Filtrar leads</SheetTitle>
                <SheetDescription>Escolha os filtros e toque em Aplicar.</SheetDescription>
              </SheetHeader>
              <form method="get" action={ACTION} className="flex flex-col gap-3">
                <input type="hidden" name="pipeline" value={f.pipeline} />
                {f.search ? <input type="hidden" name="q" value={f.search} /> : null}
                {[...main, temperature].map((d) => (
                  <LabeledSelect key={d.name} filter={d} prefix="folha" size="touch" />
                ))}
                <LabeledSelect filter={sort} prefix="folha" size="touch" isSort />
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="lost"
                    value="1"
                    defaultChecked={f.includeLost}
                    className="accent-primary size-4"
                  />
                  Mostrar perdidos
                </label>
                <Button type="submit" size="touch" className="w-full">
                  Aplicar
                </Button>
                {activeCount > 0 ? (
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
              </form>
            </SheetContent>
          </Sheet>
        </div>
        <Chips chips={mobileChips} clearHref={clearHref} />
      </div>
    </div>
  );
}

// "1–25 de 83" com botões Anterior/Próxima (`rel`, `aria-label`); some sem leads.
export function Pagination({
  filters,
  total,
  pageSize,
}: {
  filters: LeadFilters;
  total: number;
  pageSize: number;
}) {
  if (total === 0) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, pages);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const link = (p: number) => leadsHref({ ...filters, page: p });
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-2 text-sm">
      <span className="tabular-nums text-muted-foreground">
        {from}–{to} de {total}
      </span>
      {pages > 1 ? (
        <div className="flex gap-2">
          <PageButton
            href={page > 1 ? link(page - 1) : null}
            rel="prev"
            label="Página anterior"
            icon={ChevronLeft}
            text="Anterior"
          />
          <PageButton
            href={page < pages ? link(page + 1) : null}
            rel="next"
            label="Próxima página"
            icon={ChevronRight}
            text="Próxima"
            iconAfter
          />
        </div>
      ) : null}
    </nav>
  );
}

function PageButton({
  href,
  rel,
  label,
  icon: Icon,
  text,
  iconAfter = false,
}: {
  href: string | null;
  rel: "prev" | "next";
  label: string;
  icon: typeof ChevronLeft;
  text: string;
  iconAfter?: boolean;
}) {
  const content = (
    <>
      {iconAfter ? null : <Icon aria-hidden="true" />}
      {text}
      {iconAfter ? <Icon aria-hidden="true" /> : null}
    </>
  );
  const className = "h-9 md:h-7";
  if (!href) {
    return (
      <Button variant="outline" size="sm" disabled aria-label={label} className={className}>
        {content}
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      nativeButton={false}
      render={<Link href={href} rel={rel} aria-label={label} />}
    >
      {content}
    </Button>
  );
}
