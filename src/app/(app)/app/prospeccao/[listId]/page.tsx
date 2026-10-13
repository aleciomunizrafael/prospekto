import { PhoneOutgoing } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddItemDialog } from "@/components/crm/prospecting/add-item-dialog";
import { ItemCards, type ItemCardsContext } from "@/components/crm/prospecting/item-cards";
import { ItemFilters } from "@/components/crm/prospecting/item-filters";
import { ListMoreMenu } from "@/components/crm/prospecting/list-dialogs";
import { PasteDialog } from "@/components/crm/prospecting/paste-dialog";
import { Callout } from "@/components/crm/ui/callout";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { Meter } from "@/components/crm/ui/meter";
import { PageHeader } from "@/components/crm/ui/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/crm/format";
import {
  defaultCallbackDate,
  defaultMeetingAt,
  parseItemFilters,
  progressText,
} from "@/lib/crm/prospecting-view";
import {
  countItemsByStatus,
  getList,
  listDiscardReasons,
  listItems,
} from "@/lib/repos/prospecting";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Lista de prospecção" };

const UUID = /^[0-9a-f-]{36}$/i;

// Uma lista de prospecção (ADR-004, 6.6): cabeçalho com quem liga, progresso, instruções, chips de
// status e busca na URL, e os cartões agrupados por segmento com Ligar, WhatsApp e os resultados.
export default async function ProspectingListPage({
  params,
  searchParams,
}: PageProps<"/app/prospeccao/[listId]">) {
  const ctx = await requireSession();
  const { listId } = await params;
  const sp = await searchParams;
  if (!UUID.test(listId)) notFound();
  const list = await getList(ctx, listId);
  if (!list) notFound();
  const filters = parseItemFilters(sp);
  const criada = (Array.isArray(sp.criada) ? sp.criada[0] : sp.criada) === "1";
  const now = new Date();
  const [items, counts, users, discardReasons] = await Promise.all([
    listItems(ctx, { listId: list.id, status: filters.status, search: filters.q }),
    countItemsByStatus(ctx, list.id),
    listTenantUsers(ctx),
    listDiscardReasons(ctx, { listId: list.id }),
  ]);
  const userOptions = users.map((u) => ({ value: u.id, label: u.name }));
  const cardsCtx: ItemCardsContext = {
    listId: list.id,
    now: now.toISOString(),
    users: userOptions,
    defaultOwnerUserId: list.assigneeUserId ?? ctx.userId,
    defaultMeetingAt: defaultMeetingAt(now),
    defaultCallbackAt: defaultCallbackDate(now),
    discardReasons,
  };
  const cardItems = items.map((i) => ({
    id: i.id,
    name: i.name,
    segment: i.segment,
    phone: i.phone,
    hook: i.hook,
    address: i.address,
    size: i.size,
    info: i.info,
    status: i.status,
    notes: i.notes,
    callbackAt: i.callbackAt,
    whatsappSentAt: i.whatsappSentAt ? i.whatsappSentAt.toISOString() : null,
    leadId: i.leadId,
  }));
  const filtered = Boolean(filters.status || filters.q);
  const listValues = {
    id: list.id,
    name: list.name,
    region: list.region,
    notes: list.notes,
    sourceDetail: list.sourceDetail,
    assigneeUserId: list.assigneeUserId,
    total: list.total,
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow={<Link href="/app/prospeccao">Prospecção</Link>}
        title={list.name}
        description={list.region ?? undefined}
        meta={
          <>
            {list.assigneeName ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Avatar name={list.assigneeName} size="sm" />
                quem liga: {list.assigneeName}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">sem responsável</span>
            )}
            <span className="crm-meta">criada em {formatDate(list.createdAt)}</span>
          </>
        }
        actionsOnMobile
        secondary={[<PasteDialog key="colar" listId={list.id} />]}
        more={<ListMoreMenu list={listValues} users={userOptions} />}
        primary={<AddItemDialog listId={list.id} />}
      />
      {criada ? (
        <Callout tone="success">
          Lista criada. Cole as empresas de uma vez ou adicione uma por uma.
        </Callout>
      ) : null}
      <Meter
        value={list.contacted}
        max={list.total}
        label={`Progresso da lista ${list.name}`}
        text={progressText(list)}
        className="flex w-full [&>[role=progressbar]]:w-auto [&>[role=progressbar]]:flex-1"
      />
      {list.notes ? (
        <Callout tone="info" title="Instruções para quem liga">
          <p className="whitespace-pre-line">{list.notes}</p>
        </Callout>
      ) : null}
      <ItemFilters listId={list.id} counts={counts} filters={filters} />
      {items.length === 0 ? (
        !filtered ? (
          <EmptyState
            icon={PhoneOutgoing}
            title="A lista está vazia."
            description="Use Colar lista para adicionar várias empresas de uma vez (nome, telefone e abertura), ou Adicionar para incluir uma por uma."
            action={
              <>
                <PasteDialog listId={list.id} />
                <AddItemDialog listId={list.id} />
              </>
            }
          />
        ) : (
          <EmptyState
            icon={PhoneOutgoing}
            size="sm"
            title={
              filters.q ? "Nenhuma empresa com esse nome." : "Nenhuma empresa com esse status."
            }
            action={
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/app/prospeccao/${list.id}`} />}
              >
                Ver todas
              </Button>
            }
          />
        )
      ) : (
        <ItemCards items={cardItems} ctx={cardsCtx} />
      )}
    </div>
  );
}
