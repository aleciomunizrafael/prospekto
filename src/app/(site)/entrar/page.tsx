import type { Metadata } from "next";
import { CRM_PREFIX, isCrmPath } from "@/lib/routes";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/entrar">) {
  const { next } = await searchParams;
  // Só caminhos internos do CRM (/app, /app/...); nunca redirecionar para fora.
  const nextPath = typeof next === "string" && isCrmPath(next) ? next : CRM_PREFIX;

  return (
    <section className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Entrar no CRM</h1>
        <p className="text-muted-foreground text-sm">
          Acesso restrito à equipe da Prospekto. Cadastro fechado: as contas são criadas pelo
          administrador.
        </p>
      </div>
      <LoginForm nextPath={nextPath} />
    </section>
  );
}
