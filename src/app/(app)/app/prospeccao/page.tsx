import { PhoneOutgoing } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewListDialog } from "@/components/crm/prospecting/list-dialogs";
import { ListTable } from "@/components/crm/prospecting/list-table";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { PageHeader } from "@/components/crm/ui/page-header";
import { Button } from "@/components/ui/button";
import { listLists } from "@/lib/repos/prospecting";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Prospecção" };

// Índice das listas de prospecção (ADR-004, 6.6): tabela com nome, responsável, progresso e
// reuniões; "Nova lista" no cabeçalho (FAB no celular) ou aberto por ?nova=1.
export default async function ProspectingPage({ searchParams }: PageProps<"/app/prospeccao">) {
  const ctx = await requireSession();
  const sp = await searchParams;
  const nova = (Array.isArray(sp.nova) ? sp.nova[0] : sp.nova) === "1";
  const [lists, users] = await Promise.all([listLists(ctx), listTenantUsers(ctx)]);
  const userOptions = users.map((u) => ({ value: u.id, label: u.name }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Prospecção"
        description="Listas de empresas para ligar, com a abertura de cada ligação e o resultado."
        actionsOnMobile
        primary={
          <NewListDialog
            key={nova ? "aberta" : "fechada"}
            users={userOptions}
            defaultAssigneeUserId={ctx.userId}
            defaultOpen={nova}
            returnHref="/app/prospeccao"
          />
        }
      />
      <ListTable
        lists={lists}
        empty={
          <EmptyState
            icon={PhoneOutgoing}
            title="Nenhuma lista de prospecção ainda."
            description="Cole uma lista de empresas e comece a ligar."
            action={
              <Button nativeButton={false} render={<Link href="/app/prospeccao?nova=1" />}>
                Nova lista
              </Button>
            }
          />
        }
      />
    </div>
  );
}
