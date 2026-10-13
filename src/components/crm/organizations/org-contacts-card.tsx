import { Crown, Mail, Phone, Users } from "lucide-react";
import { EditContactDialog, NewContactDialog } from "@/components/crm/organization-dialogs";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPhoneBR } from "@/lib/crm/format";
import type { Contact } from "@/lib/repos/contacts";

// "Contatos" da ficha da organização (ADR-004, 6.9): lista compacta na lateral, nome com a coroa
// de decisor, cargo, e-mail e telefone como links-ícone com nome acessível, "Editar" por contato
// e "Novo contato" no rodapé. Sem remoção de contato nesta entrega (dado pessoal com origem
// registrada; apagar exige a política de retenção dos leads). Componente puro.

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

const ICON_LINK = "size-11 md:size-7";

function ContactRow({ orgId, contact }: { orgId: string; contact: Contact }) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
      <span className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          <span className="truncate">{contact.name}</span>
          {contact.isDecisionMaker ? (
            <span className="inline-flex shrink-0 items-center text-brand" title="decisor">
              <Crown aria-hidden="true" className="size-3.5" />
              <span className="sr-only">decisor</span>
            </span>
          ) : null}
        </span>
        {contact.title ? <span className="crm-meta truncate">{contact.title}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-0.5">
        {contact.email ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className={ICON_LINK}
            nativeButton={false}
            render={
              <a
                href={`mailto:${contact.email}`}
                aria-label={`Enviar e-mail para ${contact.name}`}
              />
            }
          >
            <Mail aria-hidden="true" />
          </Button>
        ) : null}
        {contact.phone ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className={ICON_LINK}
            nativeButton={false}
            render={
              <a
                href={telHref(contact.phone)}
                aria-label={`Ligar para ${contact.name}, ${formatPhoneBR(contact.phone)}`}
              />
            }
          >
            <Phone aria-hidden="true" />
          </Button>
        ) : null}
        <EditContactDialog orgId={orgId} contact={contact} size="sm" />
      </span>
    </li>
  );
}

export function OrgContactsCard({
  orgId,
  contacts,
  className,
}: {
  orgId: string;
  contacts: Contact[];
  className?: string;
}) {
  return (
    <Card id="contatos" className={className}>
      <CardHeader>
        <CardTitle id="contatos-titulo">Contatos ({contacts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            size="sm"
            title="Nenhum contato ainda."
            description="Cadastre quem decide e quem assina."
            action={<NewContactDialog orgId={orgId} size="sm" />}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col divide-y divide-divider">
              {contacts.map((c) => (
                <ContactRow key={c.id} orgId={orgId} contact={c} />
              ))}
            </ul>
            <div className="border-t border-divider pt-3">
              <NewContactDialog orgId={orgId} size="sm" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
