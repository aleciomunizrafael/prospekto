import { Plus, SearchX, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LeadToolbar, Pagination, PipelineTabs } from "@/components/crm/lead-filters";
import { LeadTable } from "@/components/crm/lead-table";
import { Fab } from "@/components/crm/shell/fab";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { PageHeader } from "@/components/crm/ui/page-header";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LEADS_PAGE_SIZE, leadFiltersToQuery, parseLeadFilters } from "@/lib/crm/filters";
import { PIPELINE_LABELS } from "@/lib/crm/labels";
import { countLeadsByPipeline, searchLeads } from "@/lib/repos/leads";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Leads" };

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

export default async function LeadsPage({ searchParams }: PageProps<"/app/leads">) {
  const ctx = await requireSession();
  const filters = parseLeadFilters(await searchParams);
  const [{ rows, total }, counts, users] = await Promise.all([
    searchLeads(ctx, { ...filters, pageSize: LEADS_PAGE_SIZE }),
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
  const clearHref = `/app/leads${leadFiltersToQuery({ pipeline: filters.pipeline })}`;

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

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Leads"
        primary={
          <Button nativeButton={false} render={<Link href="/app/leads/novo" />}>
            <Plus aria-hidden="true" />
            Novo lead
          </Button>
        }
        secondary={[<ImportCsvButton key="importar-csv" />]}
      />
      <PipelineTabs current={filters.pipeline} counts={counts} />
      <LeadToolbar filters={filters} users={users} />
      <LeadTable
        rows={rows}
        now={now}
        filters={filters}
        empty={empty}
        footer={<Pagination filters={filters} total={total} pageSize={LEADS_PAGE_SIZE} />}
      />
      <Fab href="/app/leads/novo" label="Novo lead" />
    </div>
  );
}
