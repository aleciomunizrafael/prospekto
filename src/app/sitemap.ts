import type { MetadataRoute } from "next";
import { site } from "@/config/site";

// Sitemap (estrutura-e-copy.md, seção 6.3): só páginas públicas indexáveis de src/config/site.ts.
// Páginas de campanha, /obrigado, /entrar e /app ficam de fora.
const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return site.publicPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
