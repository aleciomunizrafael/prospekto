import { Link2, Theater, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EditContactDialog,
  EditOrganizationSheet,
  LinkLeadDialog,
  NewContactDialog,
  UnlinkLeadMenu,
} from "@/components/crm/organization-dialogs";
import { ActionBarMobile } from "@/components/crm/ui/action-bar-mobile";
import { DataTable, RowLink, type Column } from "@/components/crm/ui/data-table";
import { DetailLayout } from "@/components/crm/ui/detail-layout";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { KeyValueList, type KeyValueItem } from "@/components/crm/ui/key-value-list";
import { PageHeader } from "@/components/crm/ui/page-header";
import { SlaIndicator } from "@/components/crm/ui/sla-indicator";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatCnpj, formatPhoneBR } from "@/lib/crm/format";
import {
  REGIME_CONFIRMATION_LABELS,
  SEGMENT_LABELS,
  TAX_REGIME_LABELS,
} from "@/lib/crm/enum-labels";
import type { StageInfo } from "@/lib/crm/lead-view";
import { DECISION_MAKER_TONE } from "@/lib/crm/status-tones";
import type { LeadSegment } from "@/lib/domain/enums";
import type { Contact } from "@/lib/repos/contacts";
import { listContacts } from "@/lib/repos/contacts";
import {
  getOrganizationSummary,
  listLeadsForOrganization,
  listOrganizations,
  type OrganizationLead,
} from "@/lib/repos/organizations";
import { listProjectSummaries, type ProjectSummary } from "@/lib/repos/projects";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Organização" };

// Detalhe da organização (crm-design-system.md, seção 7.6): cabeçalho com tipo, cidade e quem
// cuida; principal = Contatos e Leads vinculados em DataTable; lateral = Dados (KeyValueList que
// esconde o vazio) e, para proponentes, os projetos da carteira. "Editar" abre um Sheet com o
// formulário; no celular as ações ficam na ActionBarMobile.

// listLeadsForOrganization não traz a data de entrada no estágio: o indicador usa só a próxima
// ação (ou a nota do estágio). Melhoria futura de repositório: devolver stageEnteredAt.
function stageInfoFromNextAction(nextActionAt: Date | null, now: Date): StageInfo {
  return {
    daysInStage: 0,
    slaDeadline: null,
    slaText: "sem prazo",
    slaOverdue: false,
    nextActionOverdue: !!nextActionAt && nextActionAt.getTime() < now.getTime(),
  };
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

// "decisor" com ícone e texto (seção 6.3: Crown, família brand).
function DecisionMakerBadge() {
  const Icon = DECISION_MAKER_TONE.icon;
  return (
    <Badge variant={DECISION_MAKER_TONE.tone}>
      <Icon aria-hidden="true" />
      {DECISION_MAKER_TONE.label}
    </Badge>
  );
}

function ContactName({ contact }: { contact: Contact }) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
      <span className="font-medium">{contact.name}</span>
      {contact.isDecisionMaker ? <DecisionMakerBadge /> : null}
    </span>
  );
}

function EmailLink({ email, className }: { email: string | null; className?: string }) {
  if (!email) return <span className="text-muted-foreground">—</span>;
  return (
    <a
      href={`mailto:${email}`}
      className={`relative z-10 break-all text-primary underline-offset-2 hover:underline ${className ?? ""}`}
    >
      {email}
    </a>
  );
}

function PhoneLink({ phone, className }: { phone: string | null; className?: string }) {
  if (!phone) return <span className="text-muted-foreground">—</span>;
  return (
    <a
      href={telHref(phone)}
      className={`relative z-10 text-primary tabular-nums underline-offset-2 hover:underline ${className ?? ""}`}
    >
      {formatPhoneBR(phone)}
    </a>
  );
}

export default async function OrganizationPage({
  params,
  searchParams,
}: PageProps<"/app/organizacoes/[id]">) {
  const ctx = await requireSession();
  const { id } = await params;
  const sp = await searchParams;
  const org = await getOrganizationSummary(ctx, id);
  if (!org) notFound();
  const isProponent = org.type === "proponente";
  const [contacts, leads, accountants, users, projects] = await Promise.all([
    listContacts(ctx, { orgId: org.id }),
    listLeadsForOrganization(ctx, org.id),
    listOrganizations(ctx, { type: "contabilidade", limit: 300 }),
    listTenantUsers(ctx),
    // Não há filtro por proponente no repositório: filtra em memória pelo nome (melhoria futura).
    isProponent
      ? listProjectSummaries(ctx, { includeArchived: true, limit: 500 })
      : Promise.resolve([] as ProjectSummary[]),
  ]);
  const now = new Date();
  const accountantOptions = accountants
    .filter((a) => a.id !== org.id)
    .map((a) => ({ value: a.id, label: a.name }));
  const userOptions = users.map((u) => ({ value: u.id, label: u.name }));
  const contactOptions = contacts.map((c) => ({ value: c.id, label: c.name }));
  const ownerName = users.find((u) => u.id === org.ownerUserId)?.name ?? null;
  const ownProjects = isProponent ? projects.filter((p) => p.proponentName === org.name) : [];
  const pageHref = `/app/organizacoes/${org.id}`;
  const openEdit = sp.editar === "1";
  const cityUf = [org.city, org.uf].filter(Boolean).join("/");

  // Dados (lateral). CNPJ sem valor numa empresa aparece mesmo assim, com a nota: é o que trava o
  // termo (regra organization.cnpj_when_pj).
  const needsCnpj = org.type === "empresa" && !org.cnpj;
  const dataItems: KeyValueItem[] = [
    {
      label: "CNPJ",
      value: org.cnpj ? (
        formatCnpj(org.cnpj)
      ) : needsCnpj ? (
        <span>
          <span aria-hidden="true">—</span>
          <span className="sr-only">sem CNPJ</span>
        </span>
      ) : null,
      code: true,
      hint: needsCnpj ? "necessário para o termo" : undefined,
    },
    { label: "Cidade/UF", value: cityUf },
    { label: "Setor", value: org.sector },
    { label: "Regime tributário", value: org.taxRegime ? TAX_REGIME_LABELS[org.taxRegime] : null },
    {
      label: "Regime confirmado por",
      value: org.taxRegimeConfirmedBy ? REGIME_CONFIRMATION_LABELS[org.taxRegimeConfirmedBy] : null,
    },
    {
      label: "IRPJ devido estimado",
      value: org.estimatedIrpj == null ? null : formatBRL(org.estimatedIrpj),
    },
    {
      label: "Contribuinte de ICMS no RS",
      value: org.icmsContributorRs == null ? null : org.icmsContributorRs ? "Sim" : "Não",
    },
    {
      label: "Escritório contábil",
      value: org.accountantName,
      href: org.accountantOrgId ? `/app/organizacoes/${org.accountantOrgId}` : undefined,
    },
    { label: "Quem cuida", value: ownerName },
    {
      label: "Notas",
      value: org.notes ? <span className="whitespace-pre-line">{org.notes}</span> : null,
    },
  ];

  // Contatos: não há página de contato, então a linha não é um link; e-mail e telefone são links
  // explícitos na tabela e no card.
  const contactColumns: Column<Contact>[] = [
    { key: "name", header: "Nome", cell: (c) => <ContactName contact={c} /> },
    {
      key: "title",
      header: "Cargo",
      priority: 2,
      cell: (c) => c.title || <span className="text-muted-foreground">—</span>,
    },
    { key: "email", header: "E-mail", cell: (c) => <EmailLink email={c.email} /> },
    { key: "phone", header: "Telefone", cell: (c) => <PhoneLink phone={c.phone} /> },
    {
      key: "source",
      header: "Origem do dado",
      priority: 3,
      cell: (c) => <span className="crm-meta">{c.sourceDetail}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      width: "w-24",
      cell: (c) => <EditContactDialog orgId={org.id} contact={c} size="sm" />,
    },
  ];

  const leadHref = (l: OrganizationLead) => `/app/leads/${l.id}`;
  const leadColumns: Column<OrganizationLead>[] = [
    {
      key: "name",
      header: "Nome",
      cell: (l) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <RowLink href={leadHref(l)}>{l.name}</RowLink>
          <span className="crm-meta truncate">{l.email}</span>
        </div>
      ),
    },
    {
      key: "segment",
      header: "Segmento",
      priority: 2,
      width: "w-40",
      cell: (l) => SEGMENT_LABELS[l.segment as LeadSegment] ?? l.segment,
    },
    {
      key: "stage",
      header: "Estágio",
      width: "w-44",
      cell: (l) => <StatusBadge kind="stage" value={l.stage} pipeline={l.pipeline} />,
    },
    {
      key: "next",
      header: "Próxima ação",
      priority: 2,
      width: "w-56",
      cell: (l) => (
        <SlaIndicator
          info={stageInfoFromNextAction(l.nextActionAt, now)}
          nextActionAt={l.nextActionAt}
          now={now}
          stage={l}
        />
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      width: "w-16",
      cell: (l) => <UnlinkLeadMenu orgId={org.id} leadId={l.id} leadName={l.name} />,
    },
  ];

  const header = (
    <PageHeader
      title={org.name}
      description={org.tradeName ?? undefined}
      meta={
        <>
          <StatusBadge kind="orgType" value={org.type} size="md" />
          {cityUf ? <span className="text-sm text-muted-foreground">{cityUf}</span> : null}
          {ownerName ? (
            // Item próprio, sem separador: quando a linha quebra no celular nenhum "·" fica órfão.
            <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground">
              <span>quem cuida:</span>
              <Avatar name={ownerName} size="sm" />
              <span className="text-foreground">{ownerName}</span>
            </span>
          ) : null}
        </>
      }
      primary={<NewContactDialog orgId={org.id} variant="default" />}
      secondary={[
        <EditOrganizationSheet
          key={openEdit ? "editar-aberto" : "editar-fechado"}
          org={org}
          accountants={accountantOptions}
          users={userOptions}
          defaultOpen={openEdit}
          returnHref={pageHref}
        />,
        <LinkLeadDialog key="vincular" orgId={org.id} contacts={contactOptions} />,
      ]}
    />
  );

  const main = (
    <>
      <section id="contatos" aria-labelledby="contatos-titulo" className="flex flex-col gap-3">
        <h2 id="contatos-titulo" className="crm-h2">
          Contatos ({contacts.length})
        </h2>
        <DataTable
          caption={`Contatos de ${org.name}`}
          columns={contactColumns}
          rows={contacts}
          rowKey={(c) => c.id}
          mobile={{
            primary: (c) => <ContactName contact={c} />,
            secondary: (c) => (
              <>
                {c.title ? <span>{c.title}</span> : null}
                {c.email ? <EmailLink email={c.email} className="basis-full truncate" /> : null}
                {c.phone ? <PhoneLink phone={c.phone} /> : null}
              </>
            ),
            action: (c) => <EditContactDialog orgId={org.id} contact={c} size="touch" />,
          }}
          empty={
            <EmptyState
              icon={Users}
              size="sm"
              title="Nenhum contato ainda."
              description="Cadastre quem decide e quem assina."
              action={<NewContactDialog orgId={org.id} size="sm" />}
            />
          }
        />
      </section>

      <section id="leads" aria-labelledby="leads-titulo" className="flex flex-col gap-3">
        <h2 id="leads-titulo" className="crm-h2">
          Leads vinculados ({leads.length})
        </h2>
        <DataTable
          caption={`Leads vinculados a ${org.name}`}
          columns={leadColumns}
          rows={leads}
          rowHref={leadHref}
          rowKey={(l) => l.id}
          mobile={{
            primary: (l) => l.name,
            secondary: (l) => (
              <>
                <StatusBadge kind="stage" value={l.stage} pipeline={l.pipeline} />
                <SlaIndicator
                  info={stageInfoFromNextAction(l.nextActionAt, now)}
                  nextActionAt={l.nextActionAt}
                  now={now}
                  stage={l}
                />
                <span className="basis-full truncate">
                  {SEGMENT_LABELS[l.segment as LeadSegment] ?? l.segment} · {l.email}
                </span>
              </>
            ),
            action: (l) => (
              <UnlinkLeadMenu orgId={org.id} leadId={l.id} leadName={l.name} size="touch" />
            ),
          }}
          empty={
            <EmptyState
              icon={Link2}
              size="sm"
              title="Nenhum lead vinculado."
              description="Vincule um lead do CRM para ver aqui o estágio e a próxima ação."
              action={<LinkLeadDialog orgId={org.id} contacts={contactOptions} size="sm" />}
            />
          }
        />
      </section>
    </>
  );

  const aside = (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <KeyValueList items={dataItems} columns={1} hideEmpty />
        </CardContent>
      </Card>
      {isProponent ? (
        <Card>
          <CardHeader>
            <CardTitle>Projetos deste proponente ({ownProjects.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {ownProjects.length === 0 ? (
              <EmptyState
                icon={Theater}
                size="sm"
                title="Nenhum projeto deste proponente ainda."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href="/app/projetos/novo" />}
                  >
                    Novo projeto
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col divide-y divide-divider">
                {ownProjects.map((p) => (
                  <li key={p.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/app/projetos/${p.id}`}
                      className="text-sm font-medium underline-offset-2 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <StatusBadge kind="stage" value={p.stage} pipeline="projetos" />
                      {p.balance != null ? (
                        <span className="crm-meta tabular-nums">saldo {formatBRL(p.balance)}</span>
                      ) : p.approvedAmount == null ? (
                        <span className="crm-meta">sem valor aprovado</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  );

  return (
    <DetailLayout
      header={header}
      main={main}
      aside={aside}
      asideLabel={`Dados de ${org.name}`}
      actionsMobile={
        <ActionBarMobile
          primary={<NewContactDialog orgId={org.id} variant="default" size="touch" />}
          secondary={<LinkLeadDialog orgId={org.id} contacts={contactOptions} size="touch" />}
          more={[{ label: "Editar organização", href: `${pageHref}?editar=1` }]}
        />
      }
    />
  );
}
