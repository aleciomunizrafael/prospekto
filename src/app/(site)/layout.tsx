import Link from "next/link";
import { site } from "@/config/site";
import { WhatsappButton } from "@/components/site/whatsapp-button";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-semibold tracking-tight">
            {site.name}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/simulador">Simulador</Link>
            <Link href="/entrar" className="text-muted-foreground">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-foreground font-medium">{site.name}</p>
            <p>Responsável: {site.owner}</p>
            <p>
              <a href={`mailto:${site.email}`} className="underline underline-offset-4">
                {site.email}
              </a>{" "}
              · WhatsApp {site.whatsappDisplay} · {site.city}
            </p>
          </div>
          <WhatsappButton />
        </div>
      </footer>
    </div>
  );
}
