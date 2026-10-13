import { Plus, SearchX, Users } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { LeadToolbar, Pagination, PipelineTabs } from "@/components/crm/lead-filters";
import { LeadTable } from "@/components/crm/lead-table";
import { LeadBoard } from "@/components/crm/leads/lead-board";
import { Fab } from "@/components/crm/shell/fab";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { PageHeader } from "@/components/crm/ui/page-header";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LEADS_PAGE_SIZE, leadFiltersToQuery, parseLeadFilters } from "@/lib/crm/filters";
import { PIPELINE_LABELS } from "@/lib/crm/labels";
import { LEADS_VIEW_COOKIE, resolveLeadsView } from "@/lib/crm/leads-view";
import { countLeadsByPipeline, listLeadsBoard, searchLeads } from "@/lib/repos/leads";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Pipeline" };

// "Importar CSV" ainda não existe: botão desabilitado com a explicação no Tooltip e no
// `aria-describedby` (o botão tem `pointer-events-none`, por isso o gatilho é o span em volta).
function ImportCsvButton() {
  return (
    <>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button variant="outline" disabled aria-describedby="importar-csv-nota">
            Importar CSV
          </Button>
        </TooltipTrigger>
        <TooltipContent>Chega na próxima etapa</TooltipContent>
      </Tooltip>
      <span id="importar-csv-nota" className="sr-only">
        A importação de CSV chega na próxima etapa.
      </span>
    </>
  );
}

// Pipeline (ADR-004, 6.2): Lista ou Quadro. `?view=` na URL vence o cookie `crm-leads-view`, que
// vence o padrão; sem nenhum dos dois é a primeira visita ("ambas"): a página carrega as duas
// consultas e renderiza o quadro em `hidden md:block` e a lista em `md:hidden`, e a alternância
// grava o cookie em silêncio ao montar, sem troca de tela. O quadro ignora estágio, ordenação e
// página; os demais filtros valem para as duas visões.
export default async function LeadsPage({ searchParams }: PageProps<"/app/leads">) {
  const ctx = await requireSession();
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const filters = parseLeadFilters(params);
  const view = resolveLeadsView(filters.view, cookieStore.get(LEADS_VIEW_COOKIE)?.value);
  const showList = view !== "quadro";
  const showBoard = view !== "lista";
  const [list, board, counts, users] = await Promise.all([
    showList ? searchLeads(ctx, { ...filters, pageSize: LEADS_PAGE_SIZE }) : null,
    showBoard
      ? listLeadsBoard(ctx, {
          pipeline: filters.pipeline,
          segment: filters.segment,
          temperature: filters.temperature,
          source: filters.source,
          ownerUserId: filters.ownerUserId,
          search: filters.search,
          includeLost: filters.includeLost,
        })
      : null,
    countLeadsByPipeline(ctx),
    listTenantUsers(ctx),
  ]);
  const now = new Date();
  const hasFilter = Boolean(
    filters.stage ||
    filters.segment ||
    filters.temperature ||
    filters.source ||
    filters.ownerUserId ||
    filters.search ||
    filters.includeLost,
  );
  const clearHref = `/app/leads${leadFiltersToQuery({ pipeline: filters.pipeline, view: filters.view })}`;

  const empty = hasFilter ? (
    <EmptyState
      icon={SearchX}
      size="sm"
      title="Nenhum lead com esses filtros."
      action={
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={clearHref} />}>
          Limpar filtros
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Users}
      title={`Nenhum lead de ${PIPELINE_LABELS[filters.pipeline].toLowerCase()} ainda.`}
      description="Os formulários do site entram sozinhos."
      action={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/app/leads/novo" />}
        >
          Cadastrar lead
        </Button>
      }
    />
  );

  const userOptions = users.map((u) => ({ id: u.id, name: u.name }));
  const boardIsEmpty = !!board && board.columns.every((column) => column.total === 0);

  const listView = list ? (
    <LeadTable
      rows={list.rows}
      now={now}
      filters={filters}
      empty={empty}
      footer={<Pagination filters={filters} total={list.total} pageSize={LEADS_PAGE_SIZE} />}
    />
  ) : null;
  const boardView = board ? (
    boardIsEmpty ? (
      empty
    ) : (
      <LeadBoard
        pipeline={filters.pipeline}
        columns={board.columns}
        users={userOptions}
        now={now.toISOString()}
        filters={filters}
      />
    )
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pipeline"
        primary={
          <Button nativeButton={false} render={<Link href="/app/leads/novo" />}>
            <Plus aria-hidden="true" />
            Novo lead
          </Button>
        }
        secondary={[<ImportCsvButton key="importar-csv" />]}
      />
      <PipelineTabs current={filters.pipeline} counts={counts} />
      <LeadToolbar filters={filters} users={userOptions} mode={view} />
      {view === "ambas" ? (
        <>
          <div className="hidden md:block">{boardView}</div>
          <div className="md:hidden">{listView}</div>
        </>
      ) : view === "quadro" ? (
        boardView
      ) : (
        listView
      )}
      <Fab href="/app/leads/novo" label="Novo lead" />
    </div>
  );
}
