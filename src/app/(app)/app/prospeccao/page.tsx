import { PhoneOutgoing } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { PageHeader } from "@/components/crm/ui/page-header";
import { formatDate } from "@/lib/crm/format";
import { plural } from "@/lib/crm/text";
import { listLists } from "@/lib/repos/prospecting";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Prospecção" };

// Índice das listas de prospecção (ADR-004, 6.6). Fundação: cabeçalho real e a lista em forma
// simples; a frente C entrega a tabela, o diálogo "Nova lista" e o "Colar lista".
export default async function ProspectingPage() {
  const ctx = await requireSession();
  const lists = await listLists(ctx);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Prospecção"
        description="Listas de empresas para ligar, com a abertura de cada ligação e o resultado."
      />
      {lists.length === 0 ? (
        <EmptyState
          icon={PhoneOutgoing}
          title="Nenhuma lista de prospecção ainda."
          description="Cole uma lista de empresas e comece a ligar."
        />
      ) : (
        <ul className="divide-y divide-divider rounded-xl border border-border bg-card">
          {lists.map((list) => (
            <li
              key={list.id}
              className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-2"
            >
              <span className="min-w-0 truncate text-sm">
                <Link href={`/app/prospeccao/${list.id}`} className="font-medium hover:underline">
                  {list.name}
                </Link>
                {list.region ? <span className="crm-meta"> {list.region}</span> : null}
              </span>
              <span className="crm-meta tabular-nums">
                {list.contacted}/{list.total} contatadas ·{" "}
                {plural(list.meetings, "reunião", "reuniões")}
              </span>
              <span className="crm-meta col-start-1">
                {list.assigneeName ? `quem liga: ${list.assigneeName} · ` : ""}criada em{" "}
                {formatDate(list.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
