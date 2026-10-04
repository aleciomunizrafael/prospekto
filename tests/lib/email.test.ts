import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/email/send";
import {
  EMAIL_TEMPLATES,
  renderLeadNotification,
  renderTemplate,
  type EmailTemplateData,
  type EmailTemplateId,
} from "@/lib/email/templates";

const ctx = {
  name: "Maria",
  actionLabel: "pediu o guia Contabilizando Cultura",
  sentAt: new Date("2026-10-04T15:30:00Z"),
  marketing: false,
};

const sampleData: { [K in EmailTemplateId]: EmailTemplateData[K] } = {
  guia: { guideAvailable: true, downloadUrl: "http://localhost:3000/api/downloads/guia?token=abc" },
  simulador: { amountPhrase: "até R$ 12.000", summaryLines: ["Rouanet art. 18: R$ 12.000"] },
  diagnostico: { formato: "diagnostico", tipoPessoa: "PJ" },
  contadores: { foraDoIcp: false },
  municipios: {},
  proponentes: {},
  mentoria: { surveyUrl: null },
  contato: {},
  "aviso-projetos": {},
};

describe("sendEmail em modo log (sem RESEND_API_KEY)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("não envia, devolve mode=log e registra só template e lead, sem assunto (R-16)", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await sendEmail({
      to: "pessoa@example.test",
      subject: "Recebemos sua mensagem",
      text: "corpo",
      html: "<p>corpo</p>",
      templateId: "contato",
      leadId: "lead-1",
    });
    expect(result).toEqual({ delivered: false, mode: "log" });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(spy.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(line.templateId).toBe("contato");
    expect(line.leadId).toBe("lead-1");
    expect(line.subject).toBeUndefined();
    expect(JSON.stringify(line)).not.toContain("Recebemos sua mensagem");
    expect(JSON.stringify(line)).not.toContain("pessoa@example.test");
  });
});

describe("templates de resposta automática (seção 5.6)", () => {
  it.each(Object.keys(EMAIL_TEMPLATES) as EmailTemplateId[])(
    "%s tem assunto, motivo do envio, assinatura com cidade e ressalva legal",
    (id) => {
      const rendered = renderTemplate(id, ctx, sampleData[id] as never);
      expect(rendered.subject.length).toBeGreaterThan(5);
      expect(rendered.text).toContain("Olá, Maria.");
      expect(rendered.text).toContain("Você recebe este e-mail porque pediu o guia");
      expect(rendered.text).toContain("Serra Gaúcha, RS");
      expect(rendered.text).toContain("O cálculo final do limite é feito pelo contador");
      expect(rendered.text).not.toContain("cancele aqui");
      expect(rendered.html).toContain("<!doctype html>");
      expect(rendered.html).toContain('lang="pt-BR"');
      expect(rendered.html).toContain(rendered.subject.replace(/&/g, "&amp;"));
    },
  );

  it("inclui o link de descadastro só com consent_marketing", () => {
    const withMarketing = renderTemplate(
      "contato",
      { ...ctx, marketing: true, unsubscribeUrl: "http://localhost:3000/privacidade#direitos" },
      {},
    );
    expect(withMarketing.text).toContain(
      "cancele aqui: http://localhost:3000/privacidade#direitos",
    );
    expect(withMarketing.html).toContain("Cancelar o recebimento");
    const without = renderTemplate("contato", ctx, {});
    expect(without.html).not.toContain("Cancelar o recebimento");
  });

  it("guia: com link quando disponível; sem link avisa que a edição revisada está em revisão", () => {
    const ready = renderTemplate("guia", ctx, sampleData.guia);
    expect(ready.subject).toBe("Seu guia Contabilizando Cultura");
    expect(ready.text).toContain(
      "Baixar o guia (PDF): http://localhost:3000/api/downloads/guia?token=abc",
    );
    expect(ready.text).toContain("72 horas");
    const soon = renderTemplate("guia", ctx, { guideAvailable: false });
    expect(soon.text).toContain("edição revisada");
    expect(soon.text).not.toContain("api/downloads");
  });

  it("diagnóstico muda o texto por formato e tipo de pessoa; contadores por fora_do_icp", () => {
    expect(
      renderTemplate("diagnostico", ctx, { formato: "simulacao", tipoPessoa: "PJ" }).text,
    ).toContain("simulação de 20 minutos");
    expect(
      renderTemplate("diagnostico", ctx, { formato: "diagnostico", tipoPessoa: "PF" }).text,
    ).toContain("ligação de 15 minutos");
    expect(
      renderTemplate("diagnostico", ctx, { formato: "diagnostico", tipoPessoa: "PJ" }).text,
    ).toContain("30 minutos com o seu contador");
    expect(renderTemplate("contadores", ctx, { foraDoIcp: true }).text).toContain("LIC-RS");
  });

  it("escapa HTML nos dados do lead", () => {
    const rendered = renderTemplate("contato", { ...ctx, name: "<script>x</script>" }, {});
    expect(rendered.html).not.toContain("<script>x</script>");
    expect(rendered.html).toContain("&lt;script&gt;");
  });
});

describe("aviso interno de lead", () => {
  it("traz assunto com novo/atualizado, resumo e link para o CRM", () => {
    const rendered = renderLeadNotification({
      formId: "contact",
      segment: "PJ",
      pipeline: "patrocinadores",
      stage: "novo",
      created: true,
      leadId: "lead-1",
      summary: { nome: "Maria", mensagem: "<b>oi</b>" },
    });
    expect(rendered.subject).toBe("Novo lead: contact (PJ)");
    expect(rendered.text).toContain("Abrir no CRM: http://localhost:3000/app/leads/lead-1");
    expect(rendered.text).toContain("nome: Maria");
    expect(rendered.html).toContain("&lt;b&gt;oi&lt;/b&gt;");
    expect(
      renderLeadNotification({
        formId: "guide",
        segment: "CONT",
        pipeline: "contadores",
        stage: "novo",
        created: false,
        leadId: "lead-2",
        summary: {},
      }).subject,
    ).toBe("Lead atualizado: guide (CONT)");
  });
});
