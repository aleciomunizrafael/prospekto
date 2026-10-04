import type { Metadata } from "next";
import Link from "next/link";
import { NewOrganizationDialog } from "@/components/crm/organization-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCnpj } from "@/lib/crm/format";
import { ORGANIZATION_TYPE_LABELS, optionsFrom } from "@/lib/crm/enum-labels";
import { ORGANIZATION_TYPES, type OrganizationType } from "@/lib/domain/enums";
import { listOrganizationSummaries, listOrganizations } from "@/lib/repos/organizations";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Organizações" };

export default async function OrganizationsPage({ searchParams }: PageProps<"/app/organizacoes">) {
  const ctx = await requireSession();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const tipoRaw = typeof sp.tipo === "string" ? sp.tipo : "";
  const tipo = (ORGANIZATION_TYPES as readonly string[]).includes(tipoRaw)
    ? (tipoRaw as OrganizationType)
    : undefined;

  const [rows, accountants, users] = await Promise.all([
    listOrganizationSummaries(ctx, { search: q || undefined, type: tipo, limit: 300 }),
    listOrganizations(ctx, { type: "contabilidade", limit: 300 }),
    listTenantUsers(ctx),
  ]);
  const accountantOptions = accountants.map((a) => ({ value: a.id, label: a.name }));
  const userOptions = users.map((u) => ({ value: u.id, label: u.name }));

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Organizações</h1>
          <p className="text-muted-foreground text-sm">
            Empresas, escritórios contábeis, municípios e proponentes.
          </p>
        </div>
        <NewOrganizationDialog accountants={accountantOptions} users={userOptions} />
      </div>

      <form className="flex flex-wrap items-end gap-3" action="/app/organizacoes" method="get">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Buscar</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Nome, nome fantasia ou CNPJ"
            className="border-input bg-background min-h-10 w-64 rounded-lg border px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Tipo</span>
          <select
            name="tipo"
            defaultValue={tipo ?? ""}
            className="border-input bg-background min-h-10 rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {optionsFrom(ORGANIZATION_TYPE_LABELS).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline" className="min-h-10">
          Filtrar
        </Button>
        {q || tipo ? (
          <Link href="/app/organizacoes" className="text-sm underline">
            Limpar
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma organização encontrada.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead className="text-right">Contatos</TableHead>
              <TableHead className="text-right">Leads</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Link href={`/app/organizacoes/${o.id}`} className="font-medium underline">
                    {o.name}
                  </Link>
                  {o.tradeName ? (
                    <span className="text-muted-foreground block text-xs">{o.tradeName}</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{ORGANIZATION_TYPE_LABELS[o.type]}</Badge>
                </TableCell>
                <TableCell>{formatCnpj(o.cnpj)}</TableCell>
                <TableCell>{[o.city, o.uf].filter(Boolean).join("/")}</TableCell>
                <TableCell className="text-right">{o.contactsCount}</TableCell>
                <TableCell className="text-right">{o.leadsCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
