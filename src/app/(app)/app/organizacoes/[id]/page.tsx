import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EditContactDialog,
  EditOrganizationForm,
  LinkLeadDialog,
  NewContactDialog,
  UnlinkLeadForm,
} from "@/components/crm/organization-dialogs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, formatCnpj, formatDateTime } from "@/lib/crm/format";
import {
  ORGANIZATION_TYPE_LABELS,
  PIPELINE_LABELS,
  REGIME_CONFIRMATION_LABELS,
  SEGMENT_LABELS,
  TAX_REGIME_LABELS,
  stageLabel,
} from "@/lib/crm/enum-labels";
import type { LeadSegment } from "@/lib/domain/enums";
import type { Pipeline } from "@/lib/domain/pipelines";
import { listContacts } from "@/lib/repos/contacts";
import {
  getOrganizationSummary,
  listLeadsForOrganization,
  listOrganizations,
} from "@/lib/repos/organizations";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Organização" };

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

export default async function OrganizationPage({ params }: PageProps<"/app/organizacoes/[id]">) {
  const ctx = await requireSession();
  const { id } = await params;
  const org = await getOrganizationSummary(ctx, id);
  if (!org) notFound();
  const [contacts, leads, accountants, users] = await Promise.all([
    listContacts(ctx, { orgId: org.id }),
    listLeadsForOrganization(ctx, org.id),
    listOrganizations(ctx, { type: "contabilidade", limit: 300 }),
    listTenantUsers(ctx),
  ]);
  const accountantOptions = accountants
    .filter((a) => a.id !== org.id)
    .map((a) => ({ value: a.id, label: a.name }));
  const userOptions = users.map((u) => ({ value: u.id, label: u.name }));
  const contactOptions = contacts.map((c) => ({ value: c.id, label: c.name }));
  const ownerName = users.find((u) => u.id === org.ownerUserId)?.name ?? null;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link href="/app/organizacoes" className="text-muted-foreground text-sm underline">
          Organizações
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{org.name}</h1>
          <Badge variant="secondary">{ORGANIZATION_TYPE_LABELS[org.type]}</Badge>
        </div>
        {org.tradeName ? <p className="text-muted-foreground">{org.tradeName}</p> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Item label="CNPJ" value={formatCnpj(org.cnpj)} />
            <Item label="Cidade/UF" value={[org.city, org.uf].filter(Boolean).join("/")} />
            <Item label="Setor" value={org.sector} />
            <Item
              label="Regime tributário"
              value={org.taxRegime ? TAX_REGIME_LABELS[org.taxRegime] : null}
            />
            <Item
              label="Regime confirmado por"
              value={
                org.taxRegimeConfirmedBy
                  ? REGIME_CONFIRMATION_LABELS[org.taxRegimeConfirmedBy]
                  : null
              }
            />
            <Item label="IRPJ devido estimado" value={formatBRL(org.estimatedIrpj)} />
            <Item
              label="Contribuinte de ICMS no RS"
              value={org.icmsContributorRs == null ? null : org.icmsContributorRs ? "Sim" : "Não"}
            />
            <Item label="Escritório contábil" value={org.accountantName} />
            <Item label="Quem cuida" value={ownerName} />
            <div className="sm:col-span-3">
              <Item label="Notas" value={org.notes} />
            </div>
          </dl>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium underline">Editar dados</summary>
            <div className="mt-4">
              <EditOrganizationForm org={org} accountants={accountantOptions} users={userOptions} />
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contatos ({contacts.length})</CardTitle>
          <NewContactDialog orgId={org.id} />
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum contato ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Origem do dado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.name} {c.isDecisionMaker ? <Badge variant="outline">decisor</Badge> : null}
                    </TableCell>
                    <TableCell>{c.title ?? ""}</TableCell>
                    <TableCell>{c.email ?? ""}</TableCell>
                    <TableCell>{c.phone ?? ""}</TableCell>
                    <TableCell>{c.sourceDetail}</TableCell>
                    <TableCell className="text-right">
                      <EditContactDialog orgId={org.id} contact={c} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Leads vinculados ({leads.length})</CardTitle>
          <LinkLeadDialog orgId={org.id} contacts={contactOptions} />
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum lead vinculado. Use &quot;Vincular lead&quot; para ligar um lead do CRM a esta
              organização.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Pipeline / estágio</TableHead>
                  <TableHead>Próxima ação</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Link href={`/app/leads/${l.id}`} className="font-medium underline">
                        {l.name}
                      </Link>
                      <span className="text-muted-foreground block text-xs">{l.email}</span>
                    </TableCell>
                    <TableCell>{SEGMENT_LABELS[l.segment as LeadSegment] ?? l.segment}</TableCell>
                    <TableCell>
                      {PIPELINE_LABELS[l.pipeline as Pipeline] ?? l.pipeline} /{" "}
                      {stageLabel(l.stage)}
                    </TableCell>
                    <TableCell>{formatDateTime(l.nextActionAt)}</TableCell>
                    <TableCell className="text-right">
                      <UnlinkLeadForm orgId={org.id} leadId={l.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
