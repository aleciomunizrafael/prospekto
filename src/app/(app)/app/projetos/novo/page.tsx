import { Theater } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewProjectForm } from "@/components/crm/project-dialogs";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { PageHeader } from "@/components/crm/ui/page-header";
import { Button } from "@/components/ui/button";
import { listOrganizations } from "@/lib/repos/organizations";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Novo projeto" };

// Novo projeto (crm-design-system.md, seção 7.8): só proponente, mecanismo e nome são
// obrigatórios; o resto fica em seções dobráveis. Sem proponente cadastrado, em vez do formulário
// aparece o convite para cadastrar um (o diálogo de Organizações abre já com o tipo).
export default async function NewProjectPage() {
  const ctx = await requireSession();
  const [proponents, users] = await Promise.all([
    listOrganizations(ctx, { type: "proponente", limit: 500 }),
    listTenantUsers(ctx),
  ]);
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: "Projetos", href: "/app/projetos" }]}
        title="Novo projeto"
        description="O projeto nasce em Prospecção. Os demais campos passam a ser exigidos conforme o estágio."
        backHref="/app/projetos"
        backLabel="Projetos"
      />
      {proponents.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Theater}
            title="Ainda não há organização do tipo proponente."
            description="Todo projeto pertence a um proponente (instituto, associação, produtora). Cadastre-o primeiro; depois o formulário aparece aqui."
            action={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/app/organizacoes?novo=1&tipo=proponente" />}
              >
                Cadastrar proponente
              </Button>
            }
          />
        </div>
      ) : (
        <NewProjectForm
          proponents={proponents.map((p) => ({ value: p.id, label: p.name }))}
          users={users.map((u) => ({ value: u.id, label: u.name }))}
        />
      )}
    </section>
  );
}
