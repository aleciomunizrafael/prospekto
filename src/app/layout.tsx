import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { site } from "@/config/site";
import { appUrl } from "@/lib/app-url";
import "./globals.css";

// Tipografia (estrutura-e-copy.md, seção 7.3): Source Serif 4 nos títulos e Inter no texto,
// servidas pelo próprio domínio via next/font (sem requisição ao Google no navegador).
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-source-serif",
  display: "swap",
});

const siteUrl = appUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: site.name, template: `%s · ${site.shortName}` },
  description: "Projetos culturais, leis de incentivo e captação de patrocínio na Serra Gaúcha.",
  openGraph: { siteName: site.name, locale: "pt_BR", type: "website" },
  twitter: { card: "summary" },
};

// viewport-fit=cover libera env(safe-area-inset-*) para a barra inferior do CRM
// (crm-design-system.md, seção 3.2); width e initialScale são os padrões do Next, explicitados.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`h-full antialiased ${inter.variable} ${sourceSerif.variable}`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
