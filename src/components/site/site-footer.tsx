import Link from "next/link";
import { TrackLink } from "@/components/analytics/track-link";
import { site, waLink } from "@/config/site";
import { LEGAL_SOURCES } from "./sources";

// Rodapé (estrutura-e-copy.md, seções 4.1 e 7.4): quatro colunas (contato, páginas, legal, fontes),
// ressalva legal em texto corrido; CNPJ e endereço só aparecem quando confirmados (site.legal).
export function SiteFooter() {
  return (
    <footer className="bg-sand border-border mt-auto border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <p className="font-[family-name:var(--font-heading)] text-xl font-semibold">
            {site.name}
          </p>
          <p className="text-muted-foreground text-[15px]">Responsável: {site.owner}</p>
          <ul className="flex flex-col gap-2 text-[15px]">
            <li>
              <TrackLink
                event="email_click"
                href={`mailto:${site.email}`}
                className="underline underline-offset-4"
              >
                {site.email}
              </TrackLink>
            </li>
            <li>
              <TrackLink
                event="whatsapp_click"
                eventProps={{ context: "footer" }}
                href={waLink(site.whatsappMessages.home)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                WhatsApp {site.whatsappDisplay}
              </TrackLink>
            </li>
            <li className="text-muted-foreground">
              {site.legal.address ? `${site.city}, ${site.legal.address}` : site.city}
            </li>
            {site.legal.cnpj ? (
              <li className="text-muted-foreground">CNPJ {site.legal.cnpj}</li>
            ) : null}
          </ul>
        </div>

        <nav aria-label="Páginas do site" className="flex flex-col gap-3">
          <p className="site-label">Páginas</p>
          <ul className="flex flex-col gap-2 text-[15px]">
            {site.footerPages.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="underline-offset-4 hover:underline">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Legal" className="flex flex-col gap-3">
          <p className="site-label">Legal</p>
          <ul className="flex flex-col gap-2 text-[15px]">
            <li>
              <Link href="/privacidade" className="underline-offset-4 hover:underline">
                Política de privacidade
              </Link>
            </li>
            <li>
              <a href="#ressalva-legal" className="underline-offset-4 hover:underline">
                Ressalva legal
              </a>
            </li>
            <li>
              <Link href="/privacidade#direitos" className="underline-offset-4 hover:underline">
                Seus direitos sobre os dados (LGPD)
              </Link>
            </li>
            <li>
              <Link
                href="/entrar"
                className="text-muted-foreground underline-offset-4 hover:underline"
              >
                Área da equipe
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Fontes" className="flex flex-col gap-3">
          <p className="site-label">Fontes</p>
          <ul className="flex flex-col gap-2 text-[15px]">
            <li>
              <Link href="/#fontes" className="underline-offset-4 hover:underline">
                Fontes dos números
              </Link>
            </li>
            {LEGAL_SOURCES.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:underline"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-[14px]">
          <p id="ressalva-legal">
            <span className="text-foreground font-medium">Ressalva legal. </span>
            {site.disclaimer}
          </p>
          <p>
            Projetos aprovados pelo Ministério da Cultura (SALIC) e pela Ancine. Valores e prazos
            conforme portaria publicada; sujeitos a atualização.
          </p>
        </div>
      </div>
    </footer>
  );
}
