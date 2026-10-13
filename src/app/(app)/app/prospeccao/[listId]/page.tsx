import { PhoneOutgoing } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { Meter } from "@/components/crm/ui/meter";
import { PageHeader } from "@/components/crm/ui/page-header";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { formatDate, formatPhoneBR } from "@/lib/crm/format";
import { plural } from "@/lib/crm/text";
import { getList, listItems } from "@/lib/repos/prospecting";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Lista de prospecção" };

// Uma lista de prospecção (ADR-004, 6.6). Fundação: cabeçalho real, progresso e os itens em lista
// simples; a frente C entrega os cartões, os filtros, os botões de resultado e os diálogos.
export default async function ProspectingListPage({
  params,
}: PageProps<"/app/prospeccao/[listId]">) {
  const ctx = await requireSession();
  const { listId } = await params;
  const list = await getList(ctx, listId);
  if (!list) notFound();
  const items = await listItems(ctx, { listId: list.id });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow={<Link href="/app/prospeccao">Prospecção</Link>}
        title={list.name}
        description={list.region ?? undefined}
        meta={
          <span className="crm-meta">
            {list.assigneeName ? `quem liga: ${list.assigneeName} · ` : ""}criada em{" "}
            {formatDate(list.createdAt)}
          </span>
        }
      />
      <Meter
        value={list.contacted}
        max={list.total}
        label={`Progresso da lista ${list.name}`}
        text={`${list.contacted}/${list.total} contatadas · ${plural(list.meetings, "reunião marcada", "reuniões marcadas")}`}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={PhoneOutgoing}
          title="A lista está vazia."
          description="Use Colar lista para adicionar várias empresas de uma vez (nome, telefone e abertura), ou Adicionar para incluir uma por uma."
        />
      ) : (
        <ul className="divide-y divide-divider rounded-xl border border-border bg-card">
          {items.map((item) => (
            <li
              key={item.id}
              className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2"
            >
              <span className="min-w-0 text-sm break-words">
                <Link
                  href={`/app/prospeccao/${list.id}/${item.id}`}
                  className="font-medium hover:underline"
                >
                  {item.name}
                </Link>
                <span className="crm-meta whitespace-nowrap">
                  {" "}
                  {item.phone ? formatPhoneBR(item.phone) : "sem telefone"}
                </span>
              </span>
              <StatusBadge kind="prospecting" value={item.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
