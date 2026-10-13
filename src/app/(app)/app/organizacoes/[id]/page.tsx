import { Phone, Theater } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityForm } from "@/components/crm/forms/activity-form";
import {
  EditOrganizationSheet,
  LinkLeadDialog,
  NewContactDialog,
} from "@/components/crm/organization-dialogs";
import { OrgContactsCard, telHref } from "@/components/crm/organizations/org-contacts-card";
import { OrgLeadsCard } from "@/components/crm/organizations/org-leads-card";
import { OrgNotesForm } from "@/components/crm/organizations/org-notes-form";
import { ActionBarMobile } from "@/components/crm/ui/action-bar-mobile";
import { DetailLayout } from "@/components/crm/ui/detail-layout";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { FoldsOpenOnDesktop } from "@/components/crm/ui/folds-open-on-desktop";
import { FormSection } from "@/components/crm/ui/form-section";
import { KeyValueList, type KeyValueItem } from "@/components/crm/ui/key-value-list";
import { PageHeader } from "@/components/crm/ui/page-header";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { Timeline } from "@/components/crm/ui/timeline";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatCnpj, formatPhoneBR } from "@/lib/crm/format";
import { REGIME_CONFIRMATION_LABELS, TAX_REGIME_LABELS } from "@/lib/crm/enum-labels";
import { listContacts } from "@/lib/repos/contacts";
import {
  getOrganizationSummary,
  listLeadsForOrganization,
  listOrganizationActivities,
  listOrganizations,
} from "@/lib/repos/organizations";
import { listProjectSummaries, type ProjectSummary } from "@/lib/repos/projects";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Organização" };

// Ficha da organização (ADR-004, 6.9; crm-design-system.md, seção 7.6) sobre o DetailLayout:
// cabeçalho com tipo, cidade, quem cuida e "Ligar"; principal = "Registrar atividade" (ActivityForm
// em modo organização) e o histórico (atividades da organização e dos seus leads); lateral =
// Leads e aportes, Contatos, Dados, Notas (autosave) e, para proponentes, os projetos. No celular
// os blocos das duas colunas se intercalam na ordem do ADR por `max-lg:order-*`, e as ações ficam
// na ActionBarMobile.

export default async function OrganizationPage({
  params,
  searchParams,
}: PageProps<"/app/organizacoes/[id]">) {
  const ctx = await requireSession();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const org = await getOrganizationSummary(ctx, id);
  if (!org) notFound();
  const isProponent = org.type === "proponente";
  const now = new Date();
  const [contacts, leads, activities, accountants, users, projects] = await Promise.all([
    listContacts(ctx, { orgId: org.id }),
    listLeadsForOrganization(ctx, org.id),
    listOrganizationActivities(ctx, org.id, { limit: 300 }),
    listOrganizations(ctx, { type: "contabilidade", limit: 300 }),
    listTenantUsers(ctx),
    // Não há filtro por proponente no repositório: filtra em memória pelo nome (melhoria futura).
    isProponent
      ? listProjectSummaries(ctx, { includeArchived: true, limit: 500 })
      : Promise.resolve([] as ProjectSummary[]),
  ]);
  const accountantOptions = accountants
    .filter((a) => a.id !== org.id)
    .map((a) => ({ value: a.id, label: a.name }));
  const userOptions = users.map((u) => ({ value: u.id, label: u.name }));
  const userNames = new Map(users.map((u) => [u.id, u.name]));
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  const contactOptions = contacts.map((c) => ({ value: c.id, label: c.name }));
  const ownerName = users.find((u) => u.id === org.ownerUserId)?.name ?? null;
  const ownProjects = isProponent ? projects.filter((p) => p.proponentName === org.name) : [];
  const pageHref = `/app/organizacoes/${org.id}`;
  const openEdit = sp.editar === "1";
  const openLink = sp.vincular === "1";
  const cityUf = [org.city, org.uf].filter(Boolean).join("/");

  // "Ligar" (ADR-004, 6.10): o telefone do decisor; na falta, o do primeiro contato com telefone;
  // na falta, o da empresa (organizations.phone).
  const callPhone =
    contacts.find((c) => c.isDecisionMaker && c.phone)?.phone ??
    contacts.find((c) => c.phone)?.phone ??
    org.phone ??
    null;
  const callButton = (size?: "touch") =>
    callPhone ? (
      <Button
        key="ligar"
        variant="outline"
        size={size}
        nativeButton={false}
        render={<a href={telHref(callPhone)} />}
      >
        <Phone aria-hidden="true" />
        Ligar {formatPhoneBR(callPhone)}
      </Button>
    ) : null;

  // Dados (lateral), sem o item "Notas" (que tem card próprio). CNPJ sem valor numa empresa
  // aparece mesmo assim, com a nota: é o que trava o termo (regra organization.cnpj_when_pj).
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
    {
      label: "Telefone",
      value: org.phone ? (
        <a
          href={telHref(org.phone)}
          className="text-primary tabular-nums underline-offset-2 hover:underline"
        >
          {formatPhoneBR(org.phone)}
        </a>
      ) : null,
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
        callButton(),
        <LinkLeadDialog
          key={openLink ? "vincular-aberto" : "vincular-fechado"}
          orgId={org.id}
          contacts={contactOptions}
          defaultOpen={openLink}
          returnHref={pageHref}
        />,
      ].filter(Boolean)}
    />
  );

  const main = (
    <>
      <FormSection
        id="registrar"
        title="Registrar atividade"
        collapsible
        className="crm-fold max-lg:order-1"
      >
        <ActivityForm
          target={{ orgId: org.id }}
          now={now.toISOString()}
          suggestedNextActionAt={null}
          aiEnabled={false}
          segment={null}
          autoFocus={sp.registrar === "1"}
        />
      </FormSection>
      <section
        id="historico"
        aria-labelledby="historico-titulo"
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 text-sm md:p-5 max-lg:order-4"
      >
        <h2 id="historico-titulo" className="crm-h2">
          Histórico ({activities.length})
        </h2>
        <Timeline activities={activities} users={userNames} projects={projectNames} now={now} />
      </section>
    </>
  );

  const aside = (
    <>
      <OrgLeadsCard
        orgId={org.id}
        leads={leads}
        contacts={contactOptions}
        now={now}
        className="max-lg:order-2"
      />
      <OrgContactsCard orgId={org.id} contacts={contacts} className="max-lg:order-3" />
      <Card className="max-lg:order-5">
        <CardHeader>
          <CardTitle>Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <KeyValueList items={dataItems} columns={1} hideEmpty />
        </CardContent>
      </Card>
      <Card className="max-lg:order-6">
        <CardHeader>
          <CardTitle>Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgNotesForm orgId={org.id} notes={org.notes} />
        </CardContent>
      </Card>
      {isProponent ? (
        <Card className="max-lg:order-7">
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
    <>
      <DetailLayout
        header={header}
        main={main}
        aside={aside}
        asideLabel={`Dados de ${org.name}`}
        // No celular os blocos das duas colunas se intercalam (ADR-004, 6.9): os contêineres viram
        // `display: contents` e cada bloco traz a sua ordem em `max-lg:order-*`.
        className="max-lg:[&>div.grid>*]:contents"
        actionsMobile={
          <ActionBarMobile
            primary={<NewContactDialog orgId={org.id} variant="default" size="touch" />}
            secondary={
              callPhone ? (
                callButton("touch")
              ) : (
                <LinkLeadDialog orgId={org.id} contacts={contactOptions} size="touch" />
              )
            }
            more={[
              ...(callPhone ? [{ label: "Vincular lead", href: `${pageHref}?vincular=1` }] : []),
              { label: "Editar organização", href: `${pageHref}?editar=1` },
            ]}
          />
        }
      />
      <FoldsOpenOnDesktop selector="details.crm-fold" minWidth="64rem" />
    </>
  );
}
