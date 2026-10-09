import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { appUrl } from "@/lib/app-url";
import { getPublicProjects } from "@/lib/site/public-projects";

// Sitemap (estrutura-e-copy.md, seção 6.3): páginas públicas indexáveis de src/config/site.ts mais
// os projetos publicados (/projetos/[slug]), lidos pelo cache com a tag `projects`: publicar ou
// despublicar no CRM regenera o sitemap, com a mesma rede de segurança por tempo das páginas.
// Páginas de campanha, /obrigado, /entrar e /app ficam de fora.
// Literal exigido pelo Next (configuração de segmento): igual a PROJECTS_REVALIDATE_SECONDS.
export const revalidate = 3600;

// Data da última revisão da copy do site (estrutura-e-copy.md); a hora do build não é uma
// modificação de conteúdo. Só exportações de configuração de segmento são permitidas aqui.
const STATIC_PAGES_LAST_MODIFIED = new Date("2026-10-09T00:00:00-03:00");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = appUrl();
  const staticPages: MetadataRoute.Sitemap = site.publicPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: STATIC_PAGES_LAST_MODIFIED,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
  const projects: MetadataRoute.Sitemap = (await getPublicProjects()).map((project) => ({
    url: `${baseUrl}/projetos/${project.slug}`,
    lastModified: project.publishedAt ? new Date(project.publishedAt) : STATIC_PAGES_LAST_MODIFIED,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  return [...staticPages, ...projects];
}
