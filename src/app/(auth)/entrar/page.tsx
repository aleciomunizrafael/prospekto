import type { Metadata } from "next";
import { describePath } from "@/components/crm/shell/modules";
import { Callout } from "@/components/crm/ui/callout";
import { CRM_PREFIX, isCrmPath } from "@/lib/routes";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

// Cartão do layout (auth) (crm-design-system.md, seção 7.1): título em serifa, avisos em Callout
// e o formulário. `next` chega do proxy quando a pessoa tenta abrir o CRM sem sessão.
export default async function LoginPage({ searchParams }: PageProps<"/entrar">) {
  const { next, reset } = await searchParams;
  // Só caminhos internos do CRM (/app, /app/...); nunca redirecionar para fora.
  const nextPath = typeof next === "string" && isCrmPath(next) ? next : CRM_PREFIX;
  const expired = typeof next === "string" && isCrmPath(next);
  const destination = expired ? describePath(nextPath).module?.label : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="crm-h1 md:text-2xl md:leading-[1.875rem]">Entrar</h1>
        <p className="text-sm text-muted-foreground">Acesso restrito à equipe da Prospekto.</p>
      </div>
      {reset === "1" ? (
        <Callout tone="success" role="status">
          Senha redefinida. Entre com a nova senha.
        </Callout>
      ) : null}
      {expired ? (
        <Callout tone="info" role="status">
          Sua sessão expirou. Entre de novo para continuar{" "}
          {destination ? `em ${destination}` : "no CRM"}.
        </Callout>
      ) : null}
      <LoginForm nextPath={nextPath} />
    </div>
  );
}
