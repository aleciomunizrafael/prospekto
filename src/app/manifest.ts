import type { MetadataRoute } from "next";
import { site } from "@/config/site";

// Manifest do app instalável, servido em /manifest.webmanifest (o Next injeta o <link rel="manifest">
// sozinho). Os ícones são a marca em PNG (public/brand/, docs/design/marca.md, seção 1); as cores
// são `--background` e `--brand-ink` do modo claro em globals.css: o cinza do logo na barra de
// título, e não o vermelho, que fica só na marca ("um acento por tela", crm-design-system.md, D5).
// Coberto por tests/site/manifest.test.ts.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.shortName,
    // Mesma frase de `metadata.description` em src/app/layout.tsx.
    description: "Projetos culturais, leis de incentivo e captação de patrocínio na Serra Gaúcha.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#363435",
    icons: [
      { src: "/brand/marca-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/marca-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
