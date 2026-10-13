import { Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ItemAboutSection,
  ItemCrmCard,
  ItemDataCard,
  ItemHeaderMeta,
  ItemHistoryCard,
  ItemHookSection,
} from "@/components/crm/prospecting/item-detail";
import {
  ItemActionBar,
  ItemMoreMenu,
  ResultButtons,
  type ResultContext,
} from "@/components/crm/prospecting/result-buttons";
import { WhatsappDialog } from "@/components/crm/prospecting/whatsapp-dialog";
import { DetailLayout } from "@/components/crm/ui/detail-layout";
import { PageHeader } from "@/components/crm/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCalendarDate, formatPhoneBR } from "@/lib/crm/format";
import { defaultCallbackDate, defaultMeetingAt } from "@/lib/crm/prospecting-view";
import { listActivities } from "@/lib/repos/activities";
import { getLeadDetail } from "@/lib/repos/leads";
import { getOrganization } from "@/lib/repos/organizations";
import { getItem, getList, listDiscardReasons } from "@/lib/repos/prospecting";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Empresa" };

const UUID = /^[0-9a-f-]{36}$/i;

// Ficha de uma empresa da prospecção (ADR-004, 6.6 e 6.10): "Ligar" é a única ação sólida da
// tela; WhatsApp ao lado; os resultados da ligação no primeiro card; abertura e "Sobre a empresa"
// com autosave; histórico do item; dados e, quando convertida, os links para o lead e a organização.
export default async function ProspectingItemPage({
  params,
}: PageProps<"/app/prospeccao/[listId]/[itemId]">) {
  const ctx = await requireSession();
  const { listId, itemId } = await params;
  if (!UUID.test(listId) || !UUID.test(itemId)) notFound();
  const [list, item] = await Promise.all([getList(ctx, listId), getItem(ctx, itemId)]);
  if (!list || !item || item.listId !== list.id) notFound();

  const now = new Date();
  const [activities, users, discardReasons, lead, org] = await Promise.all([
    listActivities(ctx, { prospectingItemId: item.id, limit: 100 }),
    listTenantUsers(ctx),
    listDiscardReasons(ctx, { itemId: item.id }),
    item.leadId ? getLeadDetail(ctx, item.leadId) : Promise.resolve(null),
    item.orgId ? getOrganization(ctx, item.orgId) : Promise.resolve(null),
  ]);
  const userNames = new Map(users.map((u) => [u.id, u.name]));
  const userOptions = users.map((u) => ({ value: u.id, label: u.name }));
  const resultCtx: ResultContext = {
    users: userOptions,
    defaultOwnerUserId: list.assigneeUserId ?? ctx.userId,
    defaultMeetingAt: defaultMeetingAt(now),
    defaultCallbackAt: defaultCallbackDate(now),
    discardReason: discardReasons[item.id] ?? null,
  };
  const resultItem = {
    id: item.id,
    name: item.name,
    status: item.status,
    notes: item.notes,
    leadId: item.leadId,
  };
  const whatsappItem = {
    id: item.id,
    name: item.name,
    phone: item.phone,
    whatsappSentAt: item.whatsappSentAt ? item.whatsappSentAt.toISOString() : null,
  };
  const nowIso = now.toISOString();

  const header = (
    <PageHeader
      eyebrow={<Link href={`/app/prospeccao/${list.id}`}>{list.name}</Link>}
      title={item.name}
      meta={<ItemHeaderMeta item={item} now={now} />}
      primary={
        item.phone ? (
          <Button nativeButton={false} render={<a href={`tel:${item.phone}`} />}>
            <Phone aria-hidden="true" />
            Ligar {formatPhoneBR(item.phone)}
          </Button>
        ) : undefined
      }
      secondary={
        item.phone
          ? [<WhatsappDialog key="whatsapp" item={whatsappItem} now={nowIso} size="default" />]
          : []
      }
      more={
        <ItemMoreMenu item={resultItem} listId={list.id} discardReason={resultCtx.discardReason} />
      }
    />
  );

  const main = (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Resultado da ligação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!item.phone ? (
            <p className="crm-meta">
              Sem telefone: ligue por outro número e registre o resultado aqui mesmo.
            </p>
          ) : null}
          <ResultButtons item={resultItem} ctx={resultCtx} size="default" />
          {item.status === "retornar" && item.callbackAt ? (
            <p className="crm-meta">
              Retorno marcado para {formatCalendarDate(item.callbackAt)}. Use Retornar para mudar a
              data.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <ItemHookSection item={item} />
      <ItemAboutSection item={item} />
      <ItemHistoryCard activities={activities} users={userNames} now={now} />
    </>
  );

  const aside = (
    <>
      <ItemDataCard item={item} list={{ id: list.id, name: list.name }} />
      <ItemCrmCard
        lead={
          lead ? { id: lead.id, name: lead.name, stage: lead.stage, pipeline: lead.pipeline } : null
        }
        org={org ? { id: org.id, name: org.name } : null}
      />
    </>
  );

  return (
    <DetailLayout
      header={header}
      main={main}
      aside={aside}
      asideLabel="Dados da empresa"
      actionsMobile={
        <ItemActionBar
          item={resultItem}
          phone={item.phone}
          whatsapp={whatsappItem}
          now={nowIso}
          ctx={resultCtx}
        />
      }
    />
  );
}
