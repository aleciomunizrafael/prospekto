import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KeyValueList, type KeyValueItem } from "@/components/crm/ui/key-value-list";
import { PageHeader } from "@/components/crm/ui/page-header";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCalendarDate, formatDateTime, formatPhoneBR } from "@/lib/crm/format";
import { getItem, getList } from "@/lib/repos/prospecting";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Empresa" };

// Ficha de uma empresa da prospecção (ADR-004, 6.6 e 6.10). Fundação: cabeçalho real e os dados;
// a frente C entrega "Ligar", WhatsApp, os botões de resultado, o autosave e o histórico.
export default async function ProspectingItemPage({
  params,
}: PageProps<"/app/prospeccao/[listId]/[itemId]">) {
  const ctx = await requireSession();
  const { listId, itemId } = await params;
  const [list, item] = await Promise.all([getList(ctx, listId), getItem(ctx, itemId)]);
  if (!list || !item || item.listId !== list.id) notFound();

  const data: KeyValueItem[] = [
    {
      label: "Telefone",
      value: item.phone ? formatPhoneBR(item.phone) : null,
      href: item.phone ? `tel:${item.phone}` : undefined,
    },
    { label: "Segmento", value: item.segment },
    { label: "Lista", value: list.name, href: `/app/prospeccao/${list.id}` },
    { label: "Localização", value: item.address },
    { label: "Porte", value: item.size },
    { label: "Informações", value: item.info },
    { label: "Adicionada em", value: formatDateTime(item.createdAt) },
    { label: "Última tentativa", value: item.calledAt ? formatDateTime(item.calledAt) : null },
    { label: "Retornar em", value: item.callbackAt ? formatCalendarDate(item.callbackAt) : null },
    {
      label: "WhatsApp aberto em",
      value: item.whatsappSentAt ? formatDateTime(item.whatsappSentAt) : null,
    },
    { label: "Anotação", value: item.notes },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow={<Link href={`/app/prospeccao/${list.id}`}>{list.name}</Link>}
        title={item.name}
        meta={<StatusBadge kind="prospecting" value={item.status} size="md" />}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Abertura da ligação</CardTitle>
          </CardHeader>
          <CardContent>
            {item.hook ? (
              <blockquote className="border-l-[3px] border-l-brand pl-3 text-sm italic">
                {item.hook}
              </blockquote>
            ) : (
              <p className="crm-meta">Sem abertura registrada.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyValueList items={data} hideEmpty columns={1} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
