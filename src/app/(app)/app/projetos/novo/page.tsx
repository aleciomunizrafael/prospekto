import type { Metadata } from "next";
import Link from "next/link";
import { NewProjectForm } from "@/components/crm/project-dialogs";
import { listOrganizations } from "@/lib/repos/organizations";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Novo projeto" };

export default async function NewProjectPage() {
  const ctx = await requireSession();
  const [proponents, users] = await Promise.all([
    listOrganizations(ctx, { type: "proponente", limit: 500 }),
    listTenantUsers(ctx),
  ]);
  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link href="/app/projetos" className="text-muted-foreground text-sm underline">
          Projetos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Novo projeto</h1>
        <p className="text-muted-foreground text-sm">
          O projeto nasce em Prospecção. Só o proponente, o mecanismo e o nome são obrigatórios
          agora; os demais campos passam a ser exigidos conforme o estágio.
        </p>
      </div>
      {proponents.length === 0 ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Ainda não há organização do tipo proponente.{" "}
          <Link href="/app/organizacoes" className="underline">
            Cadastre o proponente em Organizações
          </Link>{" "}
          antes de criar o projeto.
        </p>
      ) : null}
      <NewProjectForm
        proponents={proponents.map((p) => ({ value: p.id, label: p.name }))}
        users={users.map((u) => ({ value: u.id, label: u.name }))}
      />
    </section>
  );
}
