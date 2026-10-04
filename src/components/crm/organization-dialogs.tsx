"use client";
// Diálogos da tela de organizações: nova organização, novo/editar contato e vincular lead.
import {
  createContactAction,
  createOrganizationAction,
  linkLeadToOrganizationAction,
  searchLeadsAction,
  unlinkLeadFromOrganizationAction,
  updateContactAction,
  updateOrganizationAction,
} from "@/actions/organizations";
import { ActionDialog } from "./project-forms/action-dialog";
import {
  ActionForm,
  CheckboxField,
  HiddenField,
  SelectField,
  TextField,
  type Option,
} from "./project-forms/action-form";
import { LeadPicker } from "./project-forms/lead-picker";
import { OrganizationFields } from "./organization-form";

export function NewOrganizationDialog({
  accountants,
  users,
}: {
  accountants: Option[];
  users: Option[];
}) {
  return (
    <ActionDialog
      triggerLabel="Nova organização"
      title="Nova organização"
      description="Empresa patrocinadora, escritório contábil, município ou proponente."
      action={createOrganizationAction}
      submitLabel="Criar organização"
      variant="default"
      wide
    >
      <OrganizationFields accountants={accountants} users={users} />
    </ActionDialog>
  );
}

export type ContactValues = {
  id?: string;
  name?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  isDecisionMaker?: boolean;
  sourceDetail?: string | null;
};

function ContactFields({ orgId, contact }: { orgId: string; contact?: ContactValues }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <HiddenField name="orgId" value={orgId} />
      {contact?.id ? <HiddenField name="contactId" value={contact.id} /> : null}
      <TextField name="name" label="Nome" required defaultValue={contact?.name ?? ""} />
      <TextField name="title" label="Cargo" defaultValue={contact?.title ?? ""} />
      <TextField name="email" label="E-mail" type="email" defaultValue={contact?.email ?? ""} />
      <TextField
        name="phone"
        label="Telefone"
        help="Com DDD, por exemplo (54) 98403-2180."
        defaultValue={contact?.phone ?? ""}
      />
      <TextField
        name="linkedinUrl"
        label="LinkedIn (URL)"
        type="url"
        className="sm:col-span-2"
        defaultValue={contact?.linkedinUrl ?? ""}
      />
      <TextField
        name="sourceDetail"
        label="De onde veio este dado"
        required
        help="Obrigatório pela LGPD (art. 18): por exemplo linkedin:busca, formulario:diagnostico, indicacao."
        className="sm:col-span-2"
        defaultValue={contact?.sourceDetail ?? ""}
      />
      <CheckboxField
        name="isDecisionMaker"
        label="É decisor"
        help="Quem decide o patrocínio na organização."
        defaultChecked={contact?.isDecisionMaker ?? false}
        className="sm:col-span-2"
      />
    </div>
  );
}

export function NewContactDialog({ orgId }: { orgId: string }) {
  return (
    <ActionDialog
      triggerLabel="Novo contato"
      title="Novo contato"
      description="Pessoa dentro da organização (decisor, contador, secretário)."
      action={createContactAction}
      submitLabel="Salvar contato"
      wide
    >
      <ContactFields orgId={orgId} />
    </ActionDialog>
  );
}

export function EditContactDialog({ orgId, contact }: { orgId: string; contact: ContactValues }) {
  return (
    <ActionDialog
      triggerLabel="Editar"
      title="Editar contato"
      action={updateContactAction}
      submitLabel="Salvar contato"
      size="sm"
      wide
    >
      <ContactFields orgId={orgId} contact={contact} />
    </ActionDialog>
  );
}

export function LinkLeadDialog({ orgId, contacts }: { orgId: string; contacts: Option[] }) {
  return (
    <ActionDialog
      triggerLabel="Vincular lead"
      title="Vincular lead a esta organização"
      description="O lead passa a aparecer aqui e a organização aparece no lead."
      action={linkLeadToOrganizationAction}
      submitLabel="Vincular"
      wide
    >
      <HiddenField name="orgId" value={orgId} />
      <LeadPicker search={searchLeadsAction} label="Lead" />
      <SelectField
        name="contactId"
        label="Contato correspondente"
        placeholder="Nenhum"
        options={contacts}
        help="Opcional: a pessoa desta organização que é o lead."
      />
    </ActionDialog>
  );
}

export function UnlinkLeadForm({ orgId, leadId }: { orgId: string; leadId: string }) {
  return (
    <ActionForm
      action={unlinkLeadFromOrganizationAction}
      submitLabel="Desvincular"
      variant="ghost"
      showSuccess={false}
      className="inline-flex"
    >
      <HiddenField name="orgId" value={orgId} />
      <HiddenField name="leadId" value={leadId} />
    </ActionForm>
  );
}

export function EditOrganizationForm({
  org,
  accountants,
  users,
}: {
  org: Parameters<typeof OrganizationFields>[0]["org"];
  accountants: Option[];
  users: Option[];
}) {
  return (
    <ActionForm action={updateOrganizationAction} submitLabel="Salvar alterações">
      <OrganizationFields org={org} accountants={accountants} users={users} />
    </ActionForm>
  );
}
