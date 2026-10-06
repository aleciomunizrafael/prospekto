import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// Entrar e Redefinir senha (crm-design-system.md, seção 7.1; decisão D20): cartão centrado sobre o
// canvas areia, sem cabeçalho e rodapé do site. As URLs /entrar e /redefinir-senha não mudam; o
// proxy e routes.ts ficam intactos. [data-crm] liga a escala e os tokens do CRM.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      data-crm
      className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-canvas px-4 py-10"
    >
      <Link
        href="/"
        aria-label="Prospekto CRM, voltar ao site"
        className="mb-6 flex flex-col items-center rounded-lg leading-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="font-heading text-2xl font-semibold text-foreground">Prospekto</span>
        <span className="crm-eyebrow mt-1 text-brand">CRM</span>
      </Link>
      <main id="conteudo" tabIndex={-1} className="w-full max-w-sm outline-none">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">{children}</div>
      </main>
      <p className="mt-6 text-sm text-muted-foreground">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-sm transition-colors duration-120 hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Voltar ao site
        </Link>
      </p>
    </div>
  );
}
