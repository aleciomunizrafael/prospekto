import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

// 404 global: o Next só usa este arquivo (na raiz de app/) para URLs sem segmento correspondente,
// renderizado dentro do layout raiz; por isso a moldura do site (cabeçalho e rodapé, como em
// (site)/layout.tsx) é montada aqui. O título fica no padrão do layout raiz: not-found.tsx não
// aceita `metadata` sem experimental.globalNotFound (file-conventions/not-found.md).
export default function NotFound() {
  return (
    <div data-site className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 outline-none"
      >
        <h1 className="text-2xl font-semibold">Página não encontrada</h1>
        <p className="text-muted-foreground">O endereço que você abriu não existe ou foi movido.</p>
        <Link href="/" className="underline underline-offset-4">
          Voltar para a página inicial
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
