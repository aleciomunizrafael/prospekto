import { Search, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SearchForm } from "@/components/crm/shell/search-form";
import { DataTable, RowLink, type Column } from "@/components/crm/ui/data-table";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { PageHeader } from "@/components/crm/ui/page-header";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { mechanismLabel } from "@/lib/crm/enum-labels";
import { formatCnpj } from "@/lib/crm/format";
import { SEGMENT_LABELS, pipelineLabel } from "@/lib/crm/labels";
import { leadCompany } from "@/lib/crm/lead-view";
import { searchLeads, type LeadListRow } from "@/lib/repos/leads";
import { listOrganizationSummaries, type OrganizationSummary } from "@/lib/repos/organizations";
import { listProjectSummaries, type ProjectSummary } from "@/lib/repos/projects";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Busca" };

const PER_GROUP = 8;

// Busca global (crm-design-system.md, seção 4.1 e decisão D18): três consultas já existentes em
// paralelo, 8 resultados por grupo, link "ver todos" para a lista com o mesmo `q`. Sem repositório
// novo. Inclui leads perdidos: quem busca pelo nome quer achar a pessoa, em qualquer estágio.
export default async function SearchPage({ searchParams }: PageProps<"/app/busca">) {
  const ctx = await requireSession();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 120);

  const [leads, organizations, projects] = q
    ? await Promise.all([
        searchLeads(ctx, { search: q, pageSize: PER_GROUP, includeLost: true }),
        listOrganizationSummaries(ctx, { search: q, limit: PER_GROUP }),
        listProjectSummaries(ctx, { search: q, limit: PER_GROUP, includeArchived: true }),
      ])
    : [{ rows: [] as LeadListRow[], total: 0 }, [], []];
  const nothing =
    q.length > 0 && leads.rows.length === 0 && organizations.length === 0 && projects.length === 0;
  const query = `?q=${encodeURIComponent(q)}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Busca"
        description="Leads, organizações e projetos pelo nome, e-mail, empresa ou CNPJ."
      />
      <SearchForm
        id="busca-pagina"
        defaultValue={q}
        className="w-full max-w-xl"
        inputClassName="h-11 md:h-9"
      />
      {!q ? (
        <EmptyState
          icon={Search}
          title="Digite parte do nome, do e-mail, da empresa ou do CNPJ."
          description="Os resultados aparecem em três grupos: leads, organizações e projetos."
        />
      ) : nothing ? (
        <EmptyState
          icon={SearchX}
          title={`Nada encontrado para "${q}".`}
          description="Tente parte do nome ou o CNPJ."
        />
      ) : (
        <>
          <ResultGroup
            id="busca-leads"
            title="Leads"
            count={leads.total}
            shown={leads.rows.length}
            allHref={`/app/leads${query}`}
            allLabel="ver todos em Leads"
          >
            <DataTable<LeadListRow>
              caption={`Leads encontrados para "${q}"`}
              density="compact"
              columns={LEAD_COLUMNS}
              rows={leads.rows}
              rowHref={(l) => `/app/leads/${l.id}`}
              rowKey={(l) => l.id}
              mobile={{
                primary: (l) => l.name,
                secondary: (l) => (
                  <>
                    <span>{leadCompany(l) ?? l.email}</span>
                    <span>·</span>
                    <span>{pipelineLabel(l.pipeline)}</span>
                  </>
                ),
                trailing: (l) => <StatusBadge kind="stage" value={l.stage} pipeline={l.pipeline} />,
              }}
              empty={<GroupEmpty>Nenhum lead com esse termo.</GroupEmpty>}
            />
          </ResultGroup>
          <ResultGroup
            id="busca-organizacoes"
            title="Organizações"
            shown={organizations.length}
            allHref={`/app/organizacoes${query}`}
            allLabel="ver todas em Organizações"
          >
            <DataTable<OrganizationSummary>
              caption={`Organizações encontradas para "${q}"`}
              density="compact"
              columns={ORG_COLUMNS}
              rows={organizations}
              rowHref={(o) => `/app/organizacoes/${o.id}`}
              rowKey={(o) => o.id}
              mobile={{
                primary: (o) => o.name,
                secondary: (o) => (
                  <>
                    {o.cnpj ? <span className="crm-code">{formatCnpj(o.cnpj)}</span> : null}
                    {o.city ? <span>{[o.city, o.uf].filter(Boolean).join("/")}</span> : null}
                  </>
                ),
                trailing: (o) => <StatusBadge kind="orgType" value={o.type} />,
              }}
              empty={<GroupEmpty>Nenhuma organização com esse termo.</GroupEmpty>}
            />
          </ResultGroup>
          <ResultGroup
            id="busca-projetos"
            title="Projetos"
            shown={projects.length}
            allHref={`/app/projetos${query}`}
            allLabel="ver todos em Projetos"
          >
            <DataTable<ProjectSummary>
              caption={`Projetos encontrados para "${q}"`}
              density="compact"
              columns={PROJECT_COLUMNS}
              rows={projects}
              rowHref={(p) => `/app/projetos/${p.id}`}
              rowKey={(p) => p.id}
              mobile={{
                primary: (p) => p.name,
                secondary: (p) => (
                  <>
                    <span>{p.proponentName}</span>
                    <span>·</span>
                    <span>{mechanismLabel(p.mechanism)}</span>
                  </>
                ),
                trailing: (p) => <StatusBadge kind="stage" value={p.stage} pipeline="projetos" />,
              }}
              empty={<GroupEmpty>Nenhum projeto com esse termo.</GroupEmpty>}
            />
          </ResultGroup>
        </>
      )}
    </div>
  );
}

function ResultGroup({
  id,
  title,
  count,
  shown,
  allHref,
  allLabel,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  shown: number;
  allHref: string;
  allLabel: string;
  children: ReactNode;
}) {
  const total = count ?? shown;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={id} className="crm-h2 flex items-baseline gap-2">
          {title}
          <span className="text-sm font-normal text-muted-foreground tabular-nums">
            {total > shown ? `${shown} de ${total}` : total}
          </span>
        </h2>
        {shown > 0 ? (
          <Link href={allHref} className="text-sm text-primary hover:underline">
            {allLabel} ›
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function GroupEmpty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-sm text-muted-foreground">{children}</p>;
}

const LEAD_COLUMNS: Column<LeadListRow>[] = [
  {
    key: "name",
    header: "Nome",
    cell: (l) => (
      <div className="flex min-w-0 flex-col">
        <RowLink href={`/app/leads/${l.id}`}>{l.name}</RowLink>
        <span className="crm-meta truncate">{l.email}</span>
      </div>
    ),
  },
  {
    key: "stage",
    header: "Estágio",
    cell: (l) => <StatusBadge kind="stage" value={l.stage} pipeline={l.pipeline} />,
  },
  {
    key: "company",
    header: "Empresa",
    priority: 2,
    cell: (l) => leadCompany(l) ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: "pipeline",
    header: "Pipeline",
    priority: 3,
    cell: (l) => `${pipelineLabel(l.pipeline)} · ${SEGMENT_LABELS[l.segment]}`,
  },
];

const ORG_COLUMNS: Column<OrganizationSummary>[] = [
  {
    key: "name",
    header: "Nome",
    cell: (o) => (
      <div className="flex min-w-0 flex-col">
        <RowLink href={`/app/organizacoes/${o.id}`}>{o.name}</RowLink>
        {o.tradeName ? <span className="crm-meta truncate">{o.tradeName}</span> : null}
      </div>
    ),
  },
  { key: "type", header: "Tipo", cell: (o) => <StatusBadge kind="orgType" value={o.type} /> },
  {
    key: "cnpj",
    header: "CNPJ",
    priority: 2,
    cell: (o) =>
      o.cnpj ? (
        <span className="crm-code">{formatCnpj(o.cnpj)}</span>
      ) : (
        <span className="text-muted-foreground" aria-label="sem CNPJ">
          —
        </span>
      ),
  },
  {
    key: "city",
    header: "Cidade/UF",
    priority: 3,
    cell: (o) =>
      o.city ? (
        [o.city, o.uf].filter(Boolean).join("/")
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

const PROJECT_COLUMNS: Column<ProjectSummary>[] = [
  {
    key: "name",
    header: "Projeto",
    cell: (p) => (
      <div className="flex min-w-0 flex-col">
        <RowLink href={`/app/projetos/${p.id}`}>{p.name}</RowLink>
        <span className="crm-meta truncate">{p.proponentName}</span>
      </div>
    ),
  },
  {
    key: "stage",
    header: "Estágio",
    cell: (p) => <StatusBadge kind="stage" value={p.stage} pipeline="projetos" />,
  },
  { key: "mechanism", header: "Mecanismo", priority: 2, cell: (p) => mechanismLabel(p.mechanism) },
];
