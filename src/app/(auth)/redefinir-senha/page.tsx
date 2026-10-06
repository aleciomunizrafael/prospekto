import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/crm/ui/callout";
import { RequestResetForm, ResetPasswordForm } from "./forms";

export const metadata: Metadata = { title: "Redefinir senha", robots: { index: false } };

// Sem token: pede o link por e-mail (Better Auth requestPasswordReset). Com token (o link do
// e-mail passa por /api/auth/reset-password/[token] e volta para cá com ?token=): define a nova
// senha. ?error=INVALID_TOKEN chega quando o link expirou. Mesmo cartão do layout (auth)
// (crm-design-system.md, seção 7.1).
export default async function ResetPasswordPage({ searchParams }: PageProps<"/redefinir-senha">) {
  const { token, error } = await searchParams;
  const validToken = typeof token === "string" && token.length > 0 ? token : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="crm-h1 md:text-2xl md:leading-[1.875rem]">
          {validToken ? "Definir nova senha" : "Redefinir a senha"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {validToken
            ? "Escolha a nova senha do CRM."
            : "Informe o e-mail da sua conta. Se ele tiver acesso ao CRM, você recebe um link que vale por uma hora."}
        </p>
      </div>
      {error === "INVALID_TOKEN" ? (
        <Callout tone="danger" role="alert">
          Este link expirou ou já foi usado. Peça um novo abaixo.
        </Callout>
      ) : null}
      {validToken ? <ResetPasswordForm token={validToken} /> : <RequestResetForm />}
      <p className="text-sm">
        <Link
          href="/entrar"
          className="inline-flex items-center gap-1 rounded-sm text-primary underline-offset-2 hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Voltar para entrar
        </Link>
      </p>
    </div>
  );
}
