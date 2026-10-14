// Cabeçalho e rodapé do site (src/components/site/site-header.tsx e site-footer.tsx), renderizados
// como o servidor faz (renderToString): o logo oficial aparece com o nome da empresa como texto
// acessível (no cabeçalho, pelo aria-label do link para a home, com dois SVGs decorativos
// alternados por CSS: compacto a 32px no celular e horizontal a 40px no desktop, como manda
// docs/design/marca.md, seção 4; no rodapé, um único SVG com role="img"), e a assinatura oficial
// (endereço e CNPJ de site.legal) está no rodapé e em /contato.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ContatoPage from "@/app/(site)/contato/page";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { site } from "@/config/site";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

const header = renderToString(createElement(SiteHeader));
const footer = renderToString(createElement(SiteFooter));
const contato = renderToString(createElement(ContatoPage));

// Atributos saem com &amp; (React escapa o & do nome).
const NAME_ATTR = site.name.replace(/&/g, "&amp;");
const ACCESSIBLE_NAME = `${NAME_ATTR}, página inicial`;

function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

// Classes de uma tag como tokens inteiros ("hidden" não casa com "md:hidden").
function classes(tag: string): string[] {
  return (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/).filter(Boolean);
}

describe("cabeçalho do site", () => {
  it("tem o logo oficial dentro do link para a home, com nome acessível só no link e alvo de toque", () => {
    const link = header.match(/<a [^>]*href="\/"[^>]*>/)?.[0] ?? "";
    expect(link).toContain(`aria-label="${ACCESSIBLE_NAME}"`);
    expect(count(header, `aria-label="${ACCESSIBLE_NAME}"`)).toBe(1);
    // Alvo de toque de 44px, como os vizinhos (menu e botão "Menu"; estrutura-e-copy.md, 7.6).
    expect(classes(link)).toContain("touch-target");
  });

  it("alterna por CSS o compacto a 32px no celular e o horizontal a 40px no desktop, ambos decorativos", () => {
    // marca.md, seção 4: o horizontal (com tagline) nunca abaixo de 40px; abaixo disso, o compacto.
    expect(count(header, "<svg ")).toBe(2);
    const svgs = header.match(/<svg [^>]*>/g) ?? [];
    expect(svgs).toHaveLength(2);
    for (const svg of svgs) {
      expect(svg).toContain('aria-hidden="true"');
      expect(svg).not.toContain("role=");
      expect(svg).not.toContain("aria-label");
    }
    // A prop `variant` não sai no HTML: a variante é reconhecida pelo viewBox (302:61 sem tagline,
    // 302:80 com tagline).
    const compacto = classes(svgs.find((s) => s.includes('viewBox="36 0 302 61"')) ?? "");
    const horizontal = classes(svgs.find((s) => s.includes('viewBox="36 0 302 80"')) ?? "");
    expect(compacto).toEqual(expect.arrayContaining(["h-8", "w-auto", "md:hidden"]));
    expect(compacto).not.toContain("hidden");
    expect(horizontal).toEqual(expect.arrayContaining(["hidden", "h-10", "w-auto", "md:block"]));
    // Nenhum dos dois usa o horizontal a 32px (h-8 só no compacto).
    expect(horizontal).not.toContain("h-8");
  });

  it("não repete o nome da empresa como texto visível ao lado do logo", () => {
    expect(text(header)).not.toContain("Consultoria & Projetos");
  });
});

describe("rodapé do site", () => {
  it("tem o logo oficial uma vez, como imagem nomeada com o nome da empresa", () => {
    expect(count(footer, "<svg ")).toBe(1);
    const svg = footer.match(/<svg [^>]*>/)?.[0] ?? "";
    expect(svg).toContain('role="img"');
    expect(svg).toContain(`aria-label="${NAME_ATTR}"`);
    expect(svg).not.toContain("aria-hidden");
    expect(svg).toMatch(/class="[^"]*\bw-\[180px\]/);
  });

  it("traz a assinatura oficial: responsável, e-mail, WhatsApp, endereço e CNPJ", () => {
    const t = text(footer);
    expect(t).toContain(`Responsável: ${site.owner}`);
    expect(t).toContain(site.email);
    expect(t).toContain(`WhatsApp ${site.whatsappDisplay}`);
    expect(t).toContain("Avenida Osvaldo Aranha, 945/401, Bento Gonçalves, RS");
    expect(t).toContain("CNPJ 30.665.797/0001-07");
    expect(t).not.toContain("[verificar");
  });
});

describe("/contato", () => {
  it("mostra o endereço completo e o CNPJ", () => {
    const t = text(contato);
    expect(t).toContain(`${site.legal.address}, ${site.city}`);
    expect(t).toContain(`CNPJ ${site.legal.cnpj}`);
  });
});
