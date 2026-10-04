import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { FloatingWhatsapp } from "@/components/site/whatsapp-button";

// Moldura do site público (estrutura-e-copy.md, seção 3): cabeçalho e rodapé iguais em toda
// página, link "pular para o conteúdo" (no cabeçalho) e botão flutuante de WhatsApp no celular.
// [data-site] liga a escala tipográfica do site (globals.css) sem afetar o CRM.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div data-site className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
      <SiteFooter />
      <FloatingWhatsapp />
    </div>
  );
}
