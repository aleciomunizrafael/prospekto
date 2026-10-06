import type { Metadata } from "next";
import Link from "next/link";
import { CRM_PREFIX, isCrmPath } from "@/lib/routes";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/entrar">) {
  const { next, reset } = await searchParams;
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
      {reset === "1" ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          Senha redefinida. Entre com a nova senha.
        </p>
      ) : null}
      <LoginForm nextPath={nextPath} />
      <p className="text-sm">
        <Link href="/redefinir-senha" className="underline underline-offset-4">
          Esqueci a senha
        </Link>
      </p>
    </section>
  );
}
