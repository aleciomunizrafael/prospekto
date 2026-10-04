import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClass } from "@/components/crm/forms/fields";
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

// Abas por pipeline (links) e filtros em formulário GET: tudo fica na URL.
export function PipelineTabs({
  current,
  counts,
}: {
  current: Pipeline;
  counts: Record<Pipeline, number>;
}) {
  return (
    <nav aria-label="Pipelines" className="flex flex-wrap gap-1 border-b">
      {PIPELINES.map((p) => (
        <Link
          key={p}
          href={`/app/leads${leadFiltersToQuery({ pipeline: p })}`}
          aria-current={p === current ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm",
            p === current
              ? "border-primary font-medium"
              : "text-muted-foreground border-transparent hover:border-border",
          )}
        >
          {PIPELINE_LABELS[p]} <span className="text-muted-foreground">({counts[p]})</span>
        </Link>
      ))}
    </nav>
  );
}

export function LeadFilterForm({
  filters,
  users,
}: {
  filters: LeadFilters;
  users: { id: string; name: string }[];
}) {
  const f = filters;
  return (
    <form
      method="get"
      action="/app/leads"
      className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3 lg:grid-cols-6"
    >
      <input type="hidden" name="pipeline" value={f.pipeline} />
      <label className="flex flex-col gap-1 text-xs sm:col-span-2">
        Buscar
        <Input name="q" defaultValue={f.search ?? ""} placeholder="Nome, e-mail ou empresa" />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Estágio
        <select name="stage" defaultValue={f.stage ?? ""} className={selectClass}>
          <option value="">Todos (sem perdidos)</option>
          {STAGES[f.pipeline].map((s) => (
            <option key={s} value={s}>
              {stageLabel(s)}
            </option>
          ))}
        </select>
      </label>
      {f.pipeline === "patrocinadores" ? (
        <label className="flex flex-col gap-1 text-xs">
          Segmento
          <select name="segment" defaultValue={f.segment ?? ""} className={selectClass}>
            <option value="">Todos</option>
            <option value="PJ">{SEGMENT_LABELS.PJ}</option>
            <option value="PF">{SEGMENT_LABELS.PF}</option>
          </select>
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-xs">
        Temperatura
        <select name="temperature" defaultValue={f.temperature ?? ""} className={selectClass}>
          <option value="">Todas</option>
          {LEAD_TEMPERATURES.map((t) => (
            <option key={t} value={t}>
              {TEMPERATURE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Origem
        <select name="source" defaultValue={f.source ?? ""} className={selectClass}>
          <option value="">Todas</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Dono
        <select name="owner" defaultValue={f.ownerUserId ?? ""} className={selectClass}>
          <option value="">Todos</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Ordenar por
        <select name="sort" defaultValue={f.sort} className={selectClass}>
          <option value="next_action">Próxima ação</option>
          <option value="created">Mais recentes</option>
        </select>
      </label>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input
          type="checkbox"
          name="lost"
          value="1"
          defaultChecked={f.includeLost}
          className="accent-primary size-4"
        />
        Mostrar perdidos
      </label>
      <div className="flex items-end gap-2">
        <Button type="submit" size="default">
          Filtrar
        </Button>
        <Button
          variant="ghost"
          size="default"
          nativeButton={false}
          render={<Link href={`/app/leads${leadFiltersToQuery({ pipeline: f.pipeline })}`} />}
        >
          Limpar
        </Button>
      </div>
    </form>
  );
}

export function Pagination({
  filters,
  total,
  pageSize,
}: {
  filters: LeadFilters;
  total: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const link = (page: number) => `/app/leads${leadFiltersToQuery({ ...filters, page })}`;
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Página {filters.page} de {pages} · {total} leads
      </span>
      <div className="flex gap-2">
        {filters.page > 1 ? (
          <Link href={link(filters.page - 1)} className="underline underline-offset-4">
            Anterior
          </Link>
        ) : null}
        {filters.page < pages ? (
          <Link href={link(filters.page + 1)} className="underline underline-offset-4">
            Próxima
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
