import type { MetadataRoute } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// robots.txt (estrutura-e-copy.md, seção 6.3). CRM, API, login e páginas de obrigado não indexam.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/api/", "/entrar", "/obrigado/"] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
