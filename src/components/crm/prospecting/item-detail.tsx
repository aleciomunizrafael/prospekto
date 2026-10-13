import { updateItemFieldAction } from "@/actions/prospecting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCalendarDate, formatDateTime, formatPhoneBR } from "@/lib/crm/format";
import { stageLabel } from "@/lib/crm/labels";
import { agoShort, whatsappOpenedText } from "@/lib/crm/prospecting-view";
import type { Activity } from "@/lib/repos/activities";
import { AutosaveField } from "../ui/autosave-field";
import { FormSection } from "../ui/form-section";
import { KeyValueList, type KeyValueItem } from "../ui/key-value-list";
import { StatusBadge } from "../ui/status-badge";
import { Timeline } from "../ui/timeline";

// Blocos da ficha da empresa (ADR-004, 6.6): meta do cabeçalho, abertura e "Sobre a empresa" com
// AutosaveField (salva ao perder o foco, nunca por tecla; P8), "Dados", "No CRM" e o histórico do
// item pela Timeline. Server Components puros; o autosave é o único cliente.
export type ItemDetailData = {
  id: string;
  name: string;
  segment: string | null;
  phone: string | null;
  hook: string | null;
  address: string | null;
  size: string | null;
  info: string | null;
  status: string;
  notes: string | null;
  callbackAt: string | null;
  calledAt: Date | null;
  whatsappSentAt: Date | null;
  createdAt: Date;
};

export const HOOK_PLACEHOLDER =
  "Roteiro dos primeiros 20 segundos: quem é você, o que a Prospekto faz e o convite para a empresa contar como decide apoios. Fatos públicos entram; adivinhar a dor, não.";

export function ItemHeaderMeta({ item, now }: { item: ItemDetailData; now: Date }) {
  const whatsapp = whatsappOpenedText(item.whatsappSentAt, now);
  return (
    <>
      <StatusBadge kind="prospecting" value={item.status} size="md" />
      {item.status === "retornar" && item.callbackAt ? (
        <span className="crm-meta">retorna em {formatCalendarDate(item.callbackAt)}</span>
      ) : null}
      {item.segment ? <span className="crm-meta">{item.segment}</span> : null}
      {item.calledAt ? (
        <span className="crm-meta">última tentativa {agoShort(item.calledAt, now)}</span>
      ) : (
        <span className="crm-meta">nenhuma tentativa ainda</span>
      )}
      {whatsapp ? <span className="crm-meta">{whatsapp}</span> : null}
    </>
  );
}

function field(itemId: string, name: "hook" | "address" | "size" | "info" | "notes") {
  return { name: "value", hidden: { itemId, field: name }, action: updateItemFieldAction };
}

export function ItemHookSection({ item, className }: { item: ItemDetailData; className?: string }) {
  return (
    <FormSection
      title="Abertura da ligação"
      description="Quem é você, o que a Prospekto faz e o convite para a empresa contar como decide apoios. Salva ao sair do campo."
      className={className}
    >
      <AutosaveField
        {...field(item.id, "hook")}
        label="Abertura"
        defaultValue={item.hook}
        multiline
        rows={4}
        maxLength={2000}
        placeholder={HOOK_PLACEHOLDER}
      />
    </FormSection>
  );
}

export function ItemAboutSection({
  item,
  className,
}: {
  item: ItemDetailData;
  className?: string;
}) {
  return (
    <FormSection
      title="Sobre a empresa"
      description="O que a pesquisa descobriu: fatos públicos, não suposições. Salva ao sair de cada campo."
      className={className}
    >
      <AutosaveField
        {...field(item.id, "address")}
        label="Localização"
        defaultValue={item.address}
        maxLength={2000}
        placeholder="Bairro, cidade ou endereço."
      />
      <AutosaveField
        {...field(item.id, "size")}
        label="Porte"
        defaultValue={item.size}
        maxLength={2000}
        placeholder="Por exemplo: 40 funcionários, 2 unidades, desde 1994."
      />
      <AutosaveField
        {...field(item.id, "info")}
        label="Informações relevantes"
        defaultValue={item.info}
        multiline
        rows={4}
        maxLength={2000}
        placeholder="Prêmios, patrocínios anteriores, lançamentos, quem decide."
      />
    </FormSection>
  );
}

export function ItemDataCard({
  item,
  list,
  className,
}: {
  item: ItemDetailData;
  list: { id: string; name: string };
  className?: string;
}) {
  const items: KeyValueItem[] = [
    {
      label: "Telefone",
      value: item.phone ? (
        <a href={`tel:${item.phone}`} className="text-primary underline-offset-2 hover:underline">
          {formatPhoneBR(item.phone)}
        </a>
      ) : null,
    },
    { label: "Segmento", value: item.segment },
    { label: "Lista", value: list.name, href: `/app/prospeccao/${list.id}` },
    { label: "Adicionada em", value: formatDateTime(item.createdAt) },
    { label: "Última tentativa", value: item.calledAt ? formatDateTime(item.calledAt) : null },
    { label: "Retornar em", value: item.callbackAt ? formatCalendarDate(item.callbackAt) : null },
    {
      label: "WhatsApp aberto em",
      value: item.whatsappSentAt ? formatDateTime(item.whatsappSentAt) : null,
    },
    {
      label: "Anotação",
      value: item.notes ? <span className="whitespace-pre-line">{item.notes}</span> : null,
    },
  ];
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Dados</CardTitle>
      </CardHeader>
      <CardContent>
        <KeyValueList items={items} columns={1} hideEmpty />
      </CardContent>
    </Card>
  );
}

export function ItemCrmCard({
  lead,
  org,
  className,
}: {
  lead: { id: string; name: string; stage: string; pipeline: string } | null;
  org: { id: string; name: string } | null;
  className?: string;
}) {
  if (!lead && !org) return null;
  const items: KeyValueItem[] = [];
  if (lead) {
    items.push({
      label: "Lead",
      value: `${lead.name} (${stageLabel(lead.stage)})`,
      href: `/app/leads/${lead.id}`,
    });
  }
  if (org) {
    items.push({ label: "Organização", value: org.name, href: `/app/organizacoes/${org.id}` });
  }
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>No CRM</CardTitle>
      </CardHeader>
      <CardContent>
        <KeyValueList items={items} columns={1} />
      </CardContent>
    </Card>
  );
}

export function ItemHistoryCard({
  activities,
  users,
  now,
  className,
}: {
  activities: Activity[];
  users: Map<string, string>;
  now: Date;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Histórico ({activities.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Timeline activities={activities} users={users} now={now} />
      </CardContent>
    </Card>
  );
}
