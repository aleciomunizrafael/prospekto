// Cabeçalho com o logo e assinatura comercial dos e-mails (layout.ts, lead-reply.ts, digest.ts).
// Os dados da assinatura vêm de src/config/site.ts; aqui o módulo é substituído por vi.doMock
// para conferir os dois casos (legal preenchido e vazio) sem depender do valor atual do site.ts.
import { afterEach, describe, expect, it, vi } from "vitest";

const base = {
  tenantId: "prospekto",
  name: "Prospekto Consultoria & Projetos",
  shortName: "Prospekto",
  owner: "Daniela Sandrin Copat",
  email: "projetos@prospekto.com.br",
  whatsappNumber: "5554984032180",
  whatsappDisplay: "(54) 98403-2180",
  disclaimer: "Ressalva legal de teste.",
};

const ctx = {
  name: "Maria",
  actionLabel: "pediu o guia",
  sentAt: new Date("2026-10-14T12:00:00Z"),
  marketing: false,
};

async function loadWithSite(site: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock("@/config/site", () => ({ site }));
  const layout = await import("@/lib/email/templates/layout");
  const leadReply = await import("@/lib/email/templates/lead-reply");
  return { ...layout, ...leadReply };
}

afterEach(() => {
  vi.doUnmock("@/config/site");
  vi.resetModules();
});

const LOGO =
  '<img src="http://localhost:3000/brand/logo-email.png" width="151" height="40" alt="Prospekto Consultoria &amp; Projetos"';

describe("cabeçalho dos e-mails", () => {
  it("logo servido do domínio do app (appUrl), 151x40, alt com o nome da empresa, em tabela branca", async () => {
    const { emailHeaderHtml, renderEmail } = await loadWithSite({
      ...base,
      city: "Bento Gonçalves, RS",
      legal: { cnpj: null, address: null },
    });
    const header = emailHeaderHtml();
    expect(header).toContain('<table role="presentation"');
    expect(header).toContain("background:#ffffff");
    expect(header).toContain(LOGO);
    expect(header).toContain("width:151px;height:40px");
    // A base pode ser injetada (o digest recebe appUrl por parâmetro) e perde a barra final.
    expect(emailHeaderHtml("https://prospekto.com.br/")).toContain(
      'src="https://prospekto.com.br/brand/logo-email.png"',
    );

    const rendered = renderEmail(ctx, "Assunto", [{ type: "paragraph", text: "Oi." }]);
    expect(rendered.html).toContain(LOGO);
    expect(rendered.html.match(/<img /g)).toHaveLength(1);
    expect(rendered.html).not.toMatch(/width="1"|height="1"/);
    // O rótulo em texto que o logo substitui não volta.
    expect(rendered.html).not.toContain("text-transform:uppercase");
  });
});

describe("assinatura comercial", () => {
  it("completa quando site.legal e a cidade estão preenchidos (texto e HTML)", async () => {
    const { renderEmail, renderLeadReply, signatureLines } = await loadWithSite({
      ...base,
      city: "Bento Gonçalves, RS",
      legal: { cnpj: "30.665.797/0001-07", address: "Avenida Osvaldo Aranha, 945/401" },
    });
    expect(signatureLines()).toEqual([
      "Daniela Sandrin Copat",
      "Prospekto Consultoria & Projetos",
      "projetos@prospekto.com.br",
      "WhatsApp (54) 98403-2180",
      "Avenida Osvaldo Aranha, 945/401 · Bento Gonçalves, RS",
      "CNPJ 30.665.797/0001-07",
    ]);

    const auto = renderEmail(ctx, "Assunto", [{ type: "paragraph", text: "Oi." }]);
    expect(auto.text).toContain(
      "Oi.\n\nDaniela Sandrin Copat\nProspekto Consultoria & Projetos\nprojetos@prospekto.com.br\nWhatsApp (54) 98403-2180\nAvenida Osvaldo Aranha, 945/401 · Bento Gonçalves, RS\nCNPJ 30.665.797/0001-07\n\nVocê recebe este e-mail porque pediu o guia",
    );
    expect(auto.html).toContain('<strong style="color:#363435">Daniela Sandrin Copat</strong>');
    expect(auto.html).toContain("Prospekto Consultoria &amp; Projetos<br>");
    expect(auto.html).toContain(
      '<a href="mailto:projetos@prospekto.com.br" style="color:#163B5C">projetos@prospekto.com.br</a><br>WhatsApp (54) 98403-2180<br>',
    );
    expect(auto.html).toContain(
      "Avenida Osvaldo Aranha, 945/401 · Bento Gonçalves, RS<br>CNPJ 30.665.797/0001-07",
    );
    // O rodapé legal de descadastro e a ressalva seguem fora do cartão, como antes.
    expect(auto.html).toContain("Ressalva legal de teste.");

    const reply = renderLeadReply({ subject: "Oi", body: "Olá.\n\nDaniela" });
    expect(reply.text).toBe(
      "Olá.\n\nDaniela\n\nDaniela Sandrin Copat\nProspekto Consultoria & Projetos\nprojetos@prospekto.com.br\nWhatsApp (54) 98403-2180\nAvenida Osvaldo Aranha, 945/401 · Bento Gonçalves, RS\nCNPJ 30.665.797/0001-07\n\nRessalva legal de teste.",
    );
    expect(reply.html).toContain(LOGO);
    expect(reply.html).toContain("CNPJ 30.665.797/0001-07");
    expect(reply.html).toContain("Avenida Osvaldo Aranha, 945/401 · Bento Gonçalves, RS");
  });

  it("omite endereço e CNPJ quando site.legal está vazio; só a cidade quando houver", async () => {
    const { renderEmail, renderLeadReply, signatureLines } = await loadWithSite({
      ...base,
      city: "Serra Gaúcha, RS",
      legal: { cnpj: null, address: null },
    });
    expect(signatureLines()).toEqual([
      "Daniela Sandrin Copat",
      "Prospekto Consultoria & Projetos",
      "projetos@prospekto.com.br",
      "WhatsApp (54) 98403-2180",
      "Serra Gaúcha, RS",
    ]);
    const auto = renderEmail(ctx, "Assunto", [{ type: "paragraph", text: "Oi." }]);
    expect(auto.text).toContain("WhatsApp (54) 98403-2180\nSerra Gaúcha, RS\n\nVocê recebe");
    expect(auto.text).not.toContain("CNPJ");
    expect(auto.text).not.toContain("Avenida");
    expect(auto.html).not.toContain("CNPJ");
    expect(auto.html).not.toContain(" · ");
    expect(auto.html).toContain("WhatsApp (54) 98403-2180<br><span");
    expect(auto.html).toContain("Serra Gaúcha, RS");
    const reply = renderLeadReply({ subject: "Oi", body: "Olá." });
    expect(reply.text).not.toContain("CNPJ");
    expect(reply.html).not.toContain("CNPJ");
  });

  it("sem cidade nem dados legais, a assinatura para no WhatsApp", async () => {
    const { renderEmail, signatureLines } = await loadWithSite({
      ...base,
      city: "",
      legal: { cnpj: "", address: null },
    });
    expect(signatureLines()).toEqual([
      "Daniela Sandrin Copat",
      "Prospekto Consultoria & Projetos",
      "projetos@prospekto.com.br",
      "WhatsApp (54) 98403-2180",
    ]);
    const auto = renderEmail(ctx, "Assunto", [{ type: "paragraph", text: "Oi." }]);
    expect(auto.text).toContain("WhatsApp (54) 98403-2180\n\nVocê recebe");
    expect(auto.html).toContain("WhatsApp (54) 98403-2180\n</td>");
    expect(auto.html).not.toContain("<span");
  });
});
