import type { Metadata } from "next";
import Link from "next/link";
import { LeadFilterForm, Pagination, PipelineTabs } from "@/components/crm/lead-filters";
import { LeadTable } from "@/components/crm/lead-table";
import { Button } from "@/components/ui/button";
import { LEADS_PAGE_SIZE, parseLeadFilters } from "@/lib/crm/filters";
import { countLeadsByPipeline, searchLeads } from "@/lib/repos/leads";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: PageProps<"/app/leads">) {
  const ctx = await requireSession();
  const filters = parseLeadFilters(await searchParams);
  const [{ rows, total }, counts, users] = await Promise.all([
    searchLeads(ctx, { ...filters, pageSize: LEADS_PAGE_SIZE }),
    countLeadsByPipeline(ctx),
    listTenantUsers(ctx),
  ]);
  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <Button nativeButton={false} render={<Link href="/app/leads/novo" />}>
          Novo lead
        </Button>
      </div>
      <PipelineTabs current={filters.pipeline} counts={counts} />
      <LeadFilterForm filters={filters} users={users} />
      <LeadTable rows={rows} now={now} />
      <Pagination filters={filters} total={total} pageSize={LEADS_PAGE_SIZE} />
      <p className="text-muted-foreground text-xs">
        Importação de CSV fica para a próxima etapa. Enquanto isso, cadastre pelo botão &quot;Novo
        lead&quot;.
      </p>
    </div>
  );
}
