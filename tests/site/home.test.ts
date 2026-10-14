// Home (src/app/(site)/page.tsx), renderizada como o servidor faz (renderToString), com a carteira
// pública vazia (sem banco): o JSON-LD Organization/LocalBusiness lê endereço, cidade-sede e CNPJ
// de site.legal e o telefone de site.whatsappNumber, a mesma fonte do rodapé, de /contato, de
// /privacidade e dos e-mails (estrutura-e-copy.md, seção 6.3); e o rótulo do topo não repete o nome
// da empresa, que já está no logo do cabeçalho (docs/design/marca.md, seções 3 e 4).
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/(site)/page";
import { metadata as contatoMetadata } from "@/app/(site)/contato/page";
import { site } from "@/config/site";

vi.mock("@/lib/site/public-projects", () => ({
  getPublicProjects: async () => [],
}));

const html = renderToString(await HomePage());

const jsonLdScripts =
  html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? [];
const jsonLd = JSON.parse(
  jsonLdScripts[0]?.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "") ?? "null",
) as Record<string, unknown> | null;

describe("site.legal: cidade-sede estruturada", () => {
  it("locality e uf são a forma estruturada de site.city, a forma de exibição", () => {
    expect(site.legal.uf).toMatch(/^[A-Z]{2}$/);
    expect(site.city).toBe(`${site.legal.locality}, ${site.legal.uf}`);
  });

  it("a descrição de /contato cita a cidade-sede pelos mesmos campos", () => {
    expect(contatoMetadata.description).toContain(
      `${site.legal.locality}, Serra Gaúcha, ${site.legal.uf}`,
    );
  });
});

describe("home: JSON-LD da organização", () => {
  it("há um único bloco, Organization e LocalBusiness", () => {
    expect(jsonLdScripts).toHaveLength(1);
    expect(jsonLd?.["@type"]).toEqual(["Organization", "LocalBusiness"]);
    expect(jsonLd?.name).toBe(site.name);
    expect(jsonLd?.email).toBe(site.email);
  });

  it("endereço, cidade-sede e CNPJ vêm de site.legal; telefone em E.164 de site.whatsappNumber", () => {
    expect(jsonLd?.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: site.legal.address,
      addressLocality: site.legal.locality,
      addressRegion: site.legal.uf,
      addressCountry: "BR",
    });
    expect(jsonLd?.taxID).toBe(site.legal.cnpj);
    expect(jsonLd?.telephone).toBe(`+${site.whatsappNumber}`);
    expect(jsonLd?.telephone).toMatch(/^\+[1-9]\d{7,14}$/);
  });
});

describe("home: topo", () => {
  // O cabeçalho (layout do site) já mostra o logo, com o nome e a tagline, logo acima do topo.
  // marca.md, seção 4: nunca escrever "Prospekto" ao lado do logo; seção 3: um acento por tela.
  it("o rótulo em vermelho acima do h1 não repete o nome da empresa", () => {
    const label = html.match(/<p class="site-label">([^<]*)<\/p><h1\b/)?.[1];
    expect(label).toBeDefined();
    expect(label).not.toMatch(/prospekto/i);
    expect(label).not.toMatch(/consultoria/i);
  });
});
