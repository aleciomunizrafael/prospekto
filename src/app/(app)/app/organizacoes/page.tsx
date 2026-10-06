import { Building2, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewOrganizationDialog } from "@/components/crm/organization-dialogs";
import { DataTable, RowLink, type Column } from "@/components/crm/ui/data-table";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { PageHeader } from "@/components/crm/ui/page-header";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { Toolbar, type ToolbarChip } from "@/components/crm/ui/toolbar";
import { Button } from "@/components/ui/button";
import { formatCnpj } from "@/lib/crm/format";
import { ORGANIZATION_TYPE_LABELS, optionsFrom } from "@/lib/crm/enum-labels";
import { ORGANIZATION_TYPES, type OrganizationType } from "@/lib/domain/enums";
import {
  listOrganizationSummaries,
  listOrganizations,
  type OrganizationSummary,
} from "@/lib/repos/organizations";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Organizações" };

// Lista de organizações (crm-design-system.md, seção 7.6): PageHeader + Toolbar (busca e tipo,
// parâmetros `q` e `tipo` inalterados) + DataTable com a linha inteira clicável; cards no celular.
// `?novo=1` abre o diálogo de nova organização ao carregar e `&tipo=proponente` pré-seleciona o
// tipo (Projetos manda para cá quando falta o proponente).

const BASE = "/app/organizacoes";

function hrefFor(params: { q?: string; tipo?: string }): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.tipo) sp.set("tipo", params.tipo);
  const qs = sp.toString();
  return qs ? `${BASE}?${qs}` : BASE;
}

// Traço com o motivo só para leitor de tela (aria-label não vale em <span> sem papel).
function Dash({ label }: { label: string }) {
  return (
    <span className="text-muted-foreground">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return value === 0 ? <Dash label={`sem ${label}`} /> : <>{value}</>;
}

function cityUf(o: OrganizationSummary): string {
  return [o.city, o.uf].filter(Boolean).join("/");
}

export default async function OrganizationsPage({ searchParams }: PageProps<"/app/organizacoes">) {
  const ctx = await requireSession();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const tipoRaw = typeof sp.tipo === "string" ? sp.tipo : "";
  const tipo = (ORGANIZATION_TYPES as readonly string[]).includes(tipoRaw)
    ? (tipoRaw as OrganizationType)
    : undefined;
  const openNew = sp.novo === "1";

  const [rows, accountants, users] = await Promise.all([
    listOrganizationSummaries(ctx, { search: q || undefined, type: tipo, limit: 300 }),
    listOrganizations(ctx, { type: "contabilidade", limit: 300 }),
    listTenantUsers(ctx),
  ]);
  const accountantOptions = accountants.map((a) => ({ value: a.id, label: a.name }));
  const userOptions = users.map((u) => ({ value: u.id, label: u.name }));

  const hasFilter = Boolean(q || tipo);
  const chips: ToolbarChip[] = [];
  if (tipo) {
    chips.push({ label: `Tipo: ${ORGANIZATION_TYPE_LABELS[tipo]}`, removeHref: hrefFor({ q }) });
  }
  if (q) chips.push({ label: `Busca: ${q}`, removeHref: hrefFor({ tipo }) });

  const href = (o: OrganizationSummary) => `${BASE}/${o.id}`;
  const columns: Column<OrganizationSummary>[] = [
    {
      key: "name",
      header: "Nome",
      cell: (o) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <RowLink href={href(o)}>{o.name}</RowLink>
          {o.tradeName ? <span className="crm-meta truncate">{o.tradeName}</span> : null}
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      width: "w-44",
      cell: (o) => <StatusBadge kind="orgType" value={o.type} />,
    },
    {
      key: "cnpj",
      header: "CNPJ",
      priority: 2,
      width: "w-48",
      cell: (o) =>
        o.cnpj ? <span className="crm-code">{formatCnpj(o.cnpj)}</span> : <Dash label="sem CNPJ" />,
    },
    {
      key: "city",
      header: "Cidade/UF",
      priority: 2,
      width: "w-48",
      cell: (o) => cityUf(o) || <Dash label="sem cidade" />,
    },
    {
      key: "contacts",
      header: "Contatos",
      align: "right",
      priority: 3,
      width: "w-24",
      cell: (o) => <Count value={o.contactsCount} label="contatos" />,
    },
    {
      key: "leads",
      header: "Leads",
      align: "right",
      priority: 3,
      width: "w-20",
      cell: (o) => <Count value={o.leadsCount} label="leads" />,
    },
  ];

  const empty = hasFilter ? (
    <EmptyState
      icon={SearchX}
      size="sm"
      title="Nenhuma organização com esses filtros."
      action={
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={BASE} />}>
          Limpar filtros
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Building2}
      title="Nenhuma organização ainda."
      description="Empresas patrocinadoras precisam de CNPJ antes do termo."
      action={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`${BASE}?novo=1`} />}
        >
          Nova organização
        </Button>
      }
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Organizações"
        description="Empresas, escritórios contábeis, municípios e proponentes."
        actionsOnMobile
        primary={
          <NewOrganizationDialog
            key={openNew ? "aberto" : "fechado"}
            accountants={accountantOptions}
            users={userOptions}
            defaultOpen={openNew}
            defaultType={tipo}
            returnHref={hrefFor({ q, tipo })}
          />
        }
      />
      <Toolbar
        action={BASE}
        search={{ name: "q", placeholder: "Nome, nome fantasia ou CNPJ", value: q }}
        filters={[
          {
            name: "tipo",
            label: "Tipo",
            value: tipo ?? "",
            options: optionsFrom(ORGANIZATION_TYPE_LABELS),
          },
        ]}
        chips={chips}
        clearHref={BASE}
        mobileTitle="Filtrar organizações"
      />
      <DataTable
        caption="Organizações"
        columns={columns}
        rows={rows}
        rowHref={href}
        rowKey={(o) => o.id}
        // A linha inteira (não só a primeira célula) é a referência do link que a cobre.
        mobile={{
          primary: (o) => o.name,
          secondary: (o) => (
            <>
              <StatusBadge kind="orgType" value={o.type} />
              {cityUf(o) ? <span>{cityUf(o)}</span> : null}
              {o.cnpj ? <span className="crm-code">{formatCnpj(o.cnpj)}</span> : null}
            </>
          ),
          trailing: (o) =>
            o.leadsCount > 0 ? (
              <span className="crm-meta">
                {o.leadsCount} {o.leadsCount === 1 ? "lead" : "leads"}
              </span>
            ) : null,
        }}
        empty={empty}
      />
    </div>
  );
}
