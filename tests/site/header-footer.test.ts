// Cabeçalho e rodapé do site (src/components/site/site-header.tsx e site-footer.tsx), renderizados
// como o servidor faz (renderToString): o logo oficial aparece uma vez em cada um com o nome da
// empresa como texto acessível (no cabeçalho, pelo aria-label do link para a home, com o SVG
// decorativo; no rodapé, pelo próprio SVG com role="img"), e a assinatura oficial (endereço e
// CNPJ de site.legal) está no rodapé e em /contato.
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

describe("cabeçalho do site", () => {
  it("tem o logo oficial uma vez, decorativo, dentro do link para a home com nome acessível", () => {
    expect(count(header, "<svg ")).toBe(1);
    const link = header.match(/<a [^>]*href="\/"[^>]*>/)?.[0] ?? "";
    expect(link).toContain(`aria-label="${ACCESSIBLE_NAME}"`);
    expect(count(header, `aria-label="${ACCESSIBLE_NAME}"`)).toBe(1);
    const svg = header.match(/<svg [^>]*>/)?.[0] ?? "";
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toContain("role=");
    // 32px no celular, 40px no desktop (o SVG é 302:80, largura automática).
    expect(svg).toMatch(/class="[^"]*\bh-8\b[^"]*\bmd:h-10\b/);
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
