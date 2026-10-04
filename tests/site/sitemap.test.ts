// Sitemap (src/app/sitemap.ts): páginas estáticas de site.publicPages mais os projetos publicados.
import { describe, expect, it, vi } from "vitest";
import { site } from "@/config/site";

vi.mock("@/lib/site/public-projects", () => ({
  PROJECTS_REVALIDATE_SECONDS: 3600,
  getPublicProjects: vi.fn(async () => [
    { slug: "projeto-a", publishedAt: "2026-09-20T12:00:00.000Z" },
    { slug: "projeto-b", publishedAt: null },
  ]),
}));

const { default: sitemap, revalidate } = await import("@/app/sitemap");
const STATIC_PAGES_LAST_MODIFIED = new Date("2026-10-03T00:00:00-03:00");

describe("sitemap", () => {
  it("lista as páginas públicas com data fixa e os projetos publicados com a data de publicação", async () => {
    expect(revalidate).toBe(3600);
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    for (const page of site.publicPages) {
      expect(urls).toContain(`http://localhost:3000${page.path}`);
    }
    expect(urls).toContain("http://localhost:3000/projetos/projeto-a");
    expect(urls).toContain("http://localhost:3000/projetos/projeto-b");
    expect(urls.some((u) => /\/(app|entrar|obrigado)/.test(u))).toBe(false);
    const home = entries.find((e) => e.url === "http://localhost:3000/");
    expect(home?.lastModified).toEqual(STATIC_PAGES_LAST_MODIFIED);
    const a = entries.find((e) => e.url.endsWith("/projetos/projeto-a"));
    expect(a?.lastModified).toEqual(new Date("2026-09-20T12:00:00.000Z"));
    const b = entries.find((e) => e.url.endsWith("/projetos/projeto-b"));
    expect(b?.lastModified).toEqual(STATIC_PAGES_LAST_MODIFIED);
  });
});
