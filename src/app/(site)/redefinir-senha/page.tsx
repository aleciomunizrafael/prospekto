import type { Metadata } from "next";
import Link from "next/link";
import { RequestResetForm, ResetPasswordForm } from "./forms";

export const metadata: Metadata = { title: "Redefinir senha", robots: { index: false } };

// Sem token: pede o link por e-mail (Better Auth requestPasswordReset). Com token (o link do
// e-mail passa por /api/auth/reset-password/[token] e volta para cá com ?token=): define a nova
// senha. ?error=INVALID_TOKEN chega quando o link expirou.
export default async function ResetPasswordPage({ searchParams }: PageProps<"/redefinir-senha">) {
  const { token, error } = await searchParams;
  const validToken = typeof token === "string" && token.length > 0 ? token : null;

  return (
    <section className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {validToken ? "Definir nova senha" : "Redefinir a senha"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {validToken
            ? "Escolha a nova senha do CRM."
            : "Informe o e-mail da sua conta. Se ele tiver acesso ao CRM, você recebe um link que vale por uma hora."}
        </p>
      </div>
      {error === "INVALID_TOKEN" ? (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-sm"
        >
          Este link expirou ou já foi usado. Peça um novo abaixo.
        </p>
      ) : null}
      {validToken ? <ResetPasswordForm token={validToken} /> : <RequestResetForm />}
      <p className="text-sm">
        <Link href="/entrar" className="underline underline-offset-4">
          Voltar para entrar
        </Link>
      </p>
    </section>
  );
}
