import { Phone, StickyNote } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatPhoneBR } from "@/lib/crm/format";
import { formatShortCalendarDate, groupBySegment } from "@/lib/crm/prospecting-view";
import { cn } from "@/lib/utils";
import { StatusBadge } from "../ui/status-badge";
import type { ConvertDefaults } from "./convert-dialog";
import { ResultButtons } from "./result-buttons";
import { WhatsappDialog } from "./whatsapp-dialog";

// Cartões da lista de prospecção (ADR-004, 6.6 e 6.10), agrupados por segmento (os sem segmento
// primeiro, sem cabeçalho). Cada cartão: nome como link real para a ficha (o `row-link` cobre o
// cartão), badge de status (com "retorna sex., 17 de out." quando há data), endereço e porte,
// a abertura como citação, a anotação, e a linha de ações: "Ligar (54) 3000-0000" (tel:), WhatsApp,
// os botões de resultado e "Ver lead" quando convertido. Tudo o que é clicável fica `relative
// z-10` sobre o link do nome (D10). Server Component puro: as datas chegam como ISO.
export type ItemCardItem = {
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
  whatsappSentAt: string | null;
  leadId: string | null;
};

export type ItemCardsContext = ConvertDefaults & {
  listId: string;
  // ISO do servidor: o cliente calcula "há 2 d" sem divergir na hidratação.
  now: string;
  defaultCallbackAt: string;
  discardReasons: Record<string, string>;
};

export function ItemCard({ item, ctx }: { item: ItemCardItem; ctx: ItemCardsContext }) {
  const href = `/app/prospeccao/${ctx.listId}/${item.id}`;
  const meta = [item.address, item.size].filter(Boolean).join(" · ");
  return (
    <article
      data-status={item.status}
      className={cn(
        "relative flex flex-col gap-2 rounded-lg border border-border bg-card p-3.5 transition-colors duration-120 focus-within:bg-primary-soft/40",
        item.status === "descartado" && "text-muted-foreground",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <Link href={href} className="row-link min-w-0 text-sm font-medium text-foreground">
          {item.name}
        </Link>
        <span className="flex shrink-0 items-center gap-1.5">
          <StatusBadge kind="prospecting" value={item.status} />
          {item.status === "retornar" && item.callbackAt ? (
            <span className="crm-meta">· retorna {formatShortCalendarDate(item.callbackAt)}</span>
          ) : null}
        </span>
      </div>
      {meta ? <p className="crm-meta">{meta}</p> : null}
      {item.hook ? (
        <blockquote className="border-l-[3px] border-l-brand pl-3 text-sm italic">
          {item.hook}
        </blockquote>
      ) : null}
      {item.notes ? (
        <p className="crm-meta flex items-start gap-1.5">
          <StickyNote className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{item.notes}</span>
        </p>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {item.phone ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="relative z-10 h-11 md:h-7"
              nativeButton={false}
              render={<a href={`tel:${item.phone}`} />}
            >
              <Phone aria-hidden="true" />
              Ligar {formatPhoneBR(item.phone)}
            </Button>
            <WhatsappDialog
              item={{
                id: item.id,
                name: item.name,
                phone: item.phone,
                whatsappSentAt: item.whatsappSentAt,
              }}
              now={ctx.now}
              size="sm"
            />
          </>
        ) : (
          <span className="crm-meta relative z-10 px-1">sem telefone</span>
        )}
        <ResultButtons
          item={{ id: item.id, name: item.name, status: item.status, notes: item.notes }}
          ctx={{
            users: ctx.users,
            defaultOwnerUserId: ctx.defaultOwnerUserId,
            defaultMeetingAt: ctx.defaultMeetingAt,
            defaultCallbackAt: ctx.defaultCallbackAt,
            discardReason: ctx.discardReasons[item.id] ?? null,
          }}
          size="sm"
        />
        {item.leadId ? (
          <Link
            href={`/app/leads/${item.leadId}`}
            className="relative z-10 ml-auto text-sm text-primary underline-offset-2 hover:underline"
          >
            Ver lead ›
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function ItemCards({ items, ctx }: { items: ItemCardItem[]; ctx: ItemCardsContext }) {
  const groups = groupBySegment(items);
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section
          key={group.segment ?? "__sem_segmento"}
          aria-label={group.segment ?? "Sem segmento"}
          className="flex flex-col gap-2"
        >
          {group.segment ? <h2 className="crm-eyebrow">{group.segment}</h2> : null}
          {group.items.map((item) => (
            <ItemCard key={item.id} item={item} ctx={ctx} />
          ))}
        </section>
      ))}
    </div>
  );
}
