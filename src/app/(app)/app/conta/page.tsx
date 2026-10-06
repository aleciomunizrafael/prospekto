import type { Metadata } from "next";
import { getSession, requireSession } from "@/lib/session";
import { ChangePasswordForm } from "./forms";

export const metadata: Metadata = { title: "Minha conta" };

const ROLE_LABELS = { owner: "Responsável", operator: "Operador(a)" } as const;

export default async function AccountPage() {
  const ctx = await requireSession();
  const session = await getSession();
  const user = session?.user;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Minha conta</h1>
        <p className="text-muted-foreground text-sm">
          Seus dados de acesso ao CRM. Para mudar o nome ou o e-mail, fale com quem administra a
          conta.
        </p>
      </div>
      <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Nome</dt>
          <dd className="font-medium">{user?.name ?? ""}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">E-mail</dt>
          <dd className="font-medium break-all">{user?.email ?? ""}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Papel</dt>
          <dd className="font-medium">{ROLE_LABELS[ctx.role]}</dd>
        </div>
      </dl>
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Trocar senha</h2>
          <p className="text-muted-foreground text-sm">
            Ao trocar a senha, a sua conta é desconectada dos outros aparelhos e navegadores em que
            estiver aberta. Este navegador continua conectado.
          </p>
        </div>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
