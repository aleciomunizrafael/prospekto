import { describe, expect, it } from "vitest";
import { site } from "@/config/site";
import { renderLeadReply } from "@/lib/email/templates/lead-reply";

const body = `Olá, Maria.\n\nVi o seu pedido pelo site. Posso explicar em 5 linhas <como> funciona?\nLinha dentro do parágrafo.\n\nTenho horários segunda-feira, 12 de outubro, às 10h e terça-feira, 13 de outubro, às 15h. Qual prefere?\n\nDaniela`;

describe("renderLeadReply", () => {
  const rendered = renderLeadReply({ subject: "Sobre o seu contato & a Prospekto", body });

  it("texto: corpo como veio, assinatura com cidade e ressalva legal; sem motivo de envio", () => {
    expect(rendered.subject).toBe("Sobre o seu contato & a Prospekto");
    expect(rendered.text.startsWith("Olá, Maria.")).toBe(true);
    expect(rendered.text).toContain("Posso explicar em 5 linhas <como> funciona?");
    expect(rendered.text).toContain(`${site.owner}\n${site.name}\n${site.email} · WhatsApp`);
    // O corpo assina só "Daniela"; nome completo e empresa aparecem uma vez, no bloco do CRM.
    expect(rendered.text).toContain("Qual prefere?\n\nDaniela\n\nDaniela Sandrin Copat\n");
    expect(rendered.text.split("Daniela Sandrin Copat")).toHaveLength(2);
    expect(rendered.text.split(site.name)).toHaveLength(2);
    expect(rendered.text).toContain("Serra Gaúcha, RS");
    expect(rendered.text).toContain("O cálculo final do limite é feito pelo contador");
    expect(rendered.text).not.toContain("você recebe este e-mail");
    expect(rendered.text).not.toContain("Você recebe este e-mail");
    expect(rendered.text).not.toContain("cancele aqui");
    expect(rendered.text).not.toMatch(/\n{3,}/);
  });

  it("HTML: um parágrafo por bloco, escapa < e &, assinatura e ressalva, sem descadastro", () => {
    expect(rendered.html).toContain("<!doctype html>");
    expect(rendered.html).toContain('lang="pt-BR"');
    expect(rendered.html).toContain("<title>Sobre o seu contato &amp; a Prospekto</title>");
    expect(rendered.html).toContain("&lt;como&gt;");
    expect(rendered.html).not.toContain("<como>");
    expect(rendered.html).toContain("funciona?<br>Linha dentro do parágrafo.");
    expect((rendered.html.match(/<p style="margin:0 0 16px">/g) ?? []).length).toBe(4);
    expect(rendered.html).toContain(`mailto:${site.email}`);
    expect(rendered.html).toContain('<p style="margin:0 0 16px">Daniela</p>');
    expect(rendered.html.split("Daniela Sandrin Copat")).toHaveLength(2);
    expect(rendered.html).toContain("Serra Gaúcha, RS");
    expect(rendered.html).toContain("O cálculo final do limite");
    expect(rendered.html).not.toContain("Cancelar o recebimento");
    expect(rendered.html).not.toContain("recebe este e-mail");
  });

  it("normaliza quebras de linha do Windows e espaços nas pontas", () => {
    const out = renderLeadReply({ subject: "  Assunto  ", body: "  Olá.\r\n\r\nTchau.  " });
    expect(out.subject).toBe("Assunto");
    expect(out.text.startsWith("Olá.\n\nTchau.\n\n")).toBe(true);
    expect(out.html).toContain('<p style="margin:0 0 16px">Olá.</p>');
  });
});
