"use client";
// Diálogos da tela de organizações (crm-design-system.md, seção 7.6): nova organização (botão do
// cabeçalho no desktop, FAB no celular, ou aberto por ?novo=1), editar organização em Sheet
// lateral, novo/editar contato, vincular e desvincular lead. Todos sobre ActionDialog/ActionForm,
// que fazem router.refresh() e fecham ao concluir.
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import { toast } from "sonner";
import {
  createContactAction,
  createOrganizationAction,
  linkLeadToOrganizationAction,
  searchLeadsAction,
  unlinkLeadFromOrganizationAction,
  updateContactAction,
  updateOrganizationAction,
} from "@/actions/organizations";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { OrganizationType } from "@/lib/domain/enums";
import { cn } from "@/lib/utils";
import { fabClassName } from "./shell/fab";
import { ActionDialog, ActionDialogMenu } from "./project-forms/action-dialog";
import {
  ActionForm,
  CheckboxField,
  HiddenField,
  SelectField,
  TextField,
  type Option,
} from "./project-forms/action-form";
import { LeadPicker } from "./project-forms/lead-picker";
import { OrganizationFields, type OrganizationFormValues } from "./organization-form";

type NewOrganizationDialogProps = {
  accountants: Option[];
  users: Option[];
  // Abre ao carregar (/app/organizacoes?novo=1). A página troca a `key` quando o parâmetro muda.
  defaultOpen?: boolean;
  // Tipo pré-selecionado (?tipo=proponente, vindo de Projetos).
  defaultType?: OrganizationType;
  // Para onde voltar ao fechar quando foi aberto pela URL (tira o ?novo=1 do endereço).
  returnHref?: string;
  // "header": botão no desktop + FAB no celular (padrão); "none": sem gatilho visível.
  trigger?: "header" | "none";
};

export function NewOrganizationDialog({
  accountants,
  users,
  defaultOpen = false,
  defaultType,
  returnHref,
  trigger = "header",
}: NewOrganizationDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const router = useRouter();
  const onOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value && defaultOpen && returnHref) router.replace(returnHref);
  };
  return (
    <>
      {trigger === "header" ? (
        <>
          <Button type="button" className="hidden md:inline-flex" onClick={() => setOpen(true)}>
            <Plus aria-hidden="true" />
            Nova organização
          </Button>
          <button
            type="button"
            aria-label="Nova organização"
            className={fabClassName}
            onClick={() => setOpen(true)}
          >
            <Plus className="size-6" aria-hidden="true" />
          </button>
        </>
      ) : null}
      <ActionDialog
        trigger={null}
        open={open}
        onOpenChange={onOpenChange}
        triggerLabel="Nova organização"
        title="Nova organização"
        description="Empresa patrocinadora, escritório contábil, município ou proponente."
        action={createOrganizationAction}
        submitLabel="Criar organização"
        pendingLabel="Criando..."
        successMessage="Organização criada."
        wide
      >
        <OrganizationFields accountants={accountants} users={users} defaultType={defaultType} />
      </ActionDialog>
    </>
  );
}

// "Editar" do cabeçalho: folha lateral com o mesmo formulário da organização. Salvar fecha a
// folha e o ActionForm chama router.refresh() para atualizar os dados da página.
export function EditOrganizationSheet({
  org,
  accountants,
  users,
  defaultOpen = false,
  returnHref,
  trigger,
}: {
  org: OrganizationFormValues;
  accountants: Option[];
  users: Option[];
  defaultOpen?: boolean;
  returnHref?: string;
  // Elemento que abre a folha (padrão: botão "Editar"); `null` não renderiza gatilho.
  trigger?: ReactElement | null;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const router = useRouter();
  const onOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value && defaultOpen && returnHref) router.replace(returnHref);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger === null ? null : trigger ? (
        <SheetTrigger render={trigger} />
      ) : (
        <SheetTrigger render={<Button variant="outline" />}>
          <Pencil aria-hidden="true" />
          Editar
        </SheetTrigger>
      )}
      <SheetContent side="right" className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Editar organização</SheetTitle>
          <SheetDescription>{org.name}</SheetDescription>
        </SheetHeader>
        <ActionForm
          action={updateOrganizationAction}
          submitLabel="Salvar alterações"
          showSuccess={false}
          onSuccess={() => {
            toast.success("Organização salva.");
            router.refresh();
            onOpenChange(false);
          }}
          secondaryAction={
            <Button
              type="button"
              variant="ghost"
              size="touch"
              className="md:h-9"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          }
        >
          <OrganizationFields org={org} accountants={accountants} users={users} />
        </ActionForm>
      </SheetContent>
    </Sheet>
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
      <TextField
        name="name"
        label="Nome"
        required
        autoComplete="off"
        defaultValue={contact?.name ?? ""}
      />
      <TextField name="title" label="Cargo" defaultValue={contact?.title ?? ""} />
      <TextField
        name="email"
        label="E-mail"
        type="email"
        inputMode="email"
        autoComplete="off"
        defaultValue={contact?.email ?? ""}
      />
      <TextField
        name="phone"
        label="Telefone"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        help="Com DDD, por exemplo (54) 98403-2180."
        defaultValue={contact?.phone ?? ""}
      />
      <TextField
        name="linkedinUrl"
        label="LinkedIn (URL)"
        type="url"
        inputMode="url"
        className="sm:col-span-2"
        defaultValue={contact?.linkedinUrl ?? ""}
      />
      <TextField
        name="sourceDetail"
        label="De onde veio este dado"
        required
        help="Obrigatório pela LGPD (art. 18): por exemplo busca no LinkedIn, formulário de diagnóstico, indicação."
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

type TriggerProps = {
  variant?: "default" | "outline";
  size?: "sm" | "touch";
  className?: string;
};

export function NewContactDialog({
  orgId,
  variant = "outline",
  size,
  className,
}: { orgId: string } & TriggerProps) {
  return (
    <ActionDialog
      triggerLabel="Novo contato"
      title="Novo contato"
      description="Pessoa dentro da organização (decisor, contador, secretário)."
      action={createContactAction}
      submitLabel="Salvar contato"
      successMessage="Contato salvo."
      variant={variant}
      size={size}
      className={className}
      wide
    >
      <ContactFields orgId={orgId} />
    </ActionDialog>
  );
}

export function EditContactDialog({
  orgId,
  contact,
  size = "sm",
}: {
  orgId: string;
  contact: ContactValues;
  size?: "sm" | "touch";
}) {
  return (
    <ActionDialog
      triggerLabel="Editar"
      title={`Editar ${contact.name ?? "contato"}`}
      action={updateContactAction}
      submitLabel="Salvar contato"
      successMessage="Contato salvo."
      size={size}
      wide
    >
      <ContactFields orgId={orgId} contact={contact} />
    </ActionDialog>
  );
}

export function LinkLeadDialog({
  orgId,
  contacts,
  size,
  className,
}: { orgId: string; contacts: Option[] } & Omit<TriggerProps, "variant">) {
  return (
    <ActionDialog
      triggerLabel="Vincular lead"
      title="Vincular lead a esta organização"
      description="O lead passa a aparecer aqui e a organização aparece no lead."
      action={linkLeadToOrganizationAction}
      submitLabel="Vincular"
      pendingLabel="Vinculando..."
      successMessage="Lead vinculado."
      size={size}
      className={className}
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

// "⋯" da linha do lead vinculado com "Desvincular" (confirmação; nada é apagado).
export function UnlinkLeadMenu({
  orgId,
  leadId,
  leadName,
  size = "sm",
  className,
}: {
  orgId: string;
  leadId: string;
  leadName: string;
  size?: "sm" | "touch";
  className?: string;
}) {
  return (
    <ActionDialogMenu
      items={[{ label: "Desvincular", variant: "destructive" }]}
      menuLabel={`Mais ações para ${leadName}`}
      size={size}
      className={cn("relative z-10", className)}
    >
      <ActionDialog
        triggerLabel="Desvincular"
        title={`Desvincular ${leadName} desta organização`}
        description="O lead continua no CRM com o histórico; só o vínculo com a organização é removido."
        action={unlinkLeadFromOrganizationAction}
        submitLabel="Desvincular"
        pendingLabel="Desvinculando..."
        successMessage="Lead desvinculado."
        submitVariant="destructive"
        alert
      >
        <HiddenField name="orgId" value={orgId} />
        <HiddenField name="leadId" value={leadId} />
      </ActionDialog>
    </ActionDialogMenu>
  );
}
