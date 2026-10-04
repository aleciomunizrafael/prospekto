// Página de obrigado do diagnóstico: o próximo passo varia pelo formato pedido (`v`), com a mesma
// fonte do e-mail (DIAGNOSTIC_NEXT_STEP), e o texto genérico cobre `v` ausente ou inválido.
import { describe, expect, it } from "vitest";
import {
  DIAGNOSTIC_GENERIC_NEXT_STEP,
  diagnosticNextStepText,
} from "@/app/(site)/obrigado/[tipo]/diagnostico-next-step";
import { renderTemplate } from "@/lib/email/templates";
import { diagnosticoForm } from "@/lib/validation/forms/diagnostico";
import { diagnosticNextStepVariant } from "@/lib/validation/forms/diagnostico-options";

describe("variante do próximo passo do diagnóstico", () => {
  it("formato e tipo escolhem simulacao, pj ou pf", () => {
    expect(diagnosticNextStepVariant("simulacao", "PJ")).toBe("simulacao");
    expect(diagnosticNextStepVariant("diagnostico", "PJ")).toBe("pj");
    expect(diagnosticNextStepVariant("diagnostico", "PF")).toBe("pf");
  });

  it("texto da página casa com o e-mail e não contradiz o formulário", () => {
    expect(diagnosticNextStepText("simulacao")).toContain("simulação de 20 minutos");
    expect(diagnosticNextStepText("simulacao")).not.toContain("30 minutos com o seu contador");
    expect(diagnosticNextStepText("pf")).toContain("ligação de 15 minutos");
    expect(diagnosticNextStepText("pj")).toContain("30 minutos com o seu contador");
    expect(diagnosticNextStepText(null)).toBe(DIAGNOSTIC_GENERIC_NEXT_STEP);
    expect(diagnosticNextStepText("x")).toBe(DIAGNOSTIC_GENERIC_NEXT_STEP);
    const email = renderTemplate(
      "diagnostico",
      { name: "Maria", actionLabel: "pediu", sentAt: new Date("2026-10-04"), marketing: false },
      { formato: "simulacao", tipoPessoa: "PJ" },
    );
    expect(email.text).toContain("simulação de 20 minutos");
  });

  it("toLead do diagnóstico define thanksVariant", () => {
    const draft = diagnosticoForm.toLead({
      form_id: "diagnostic",
      tipo_pessoa: "PJ",
      nome: "Maria",
      email: "maria@example.test",
      telefone: "(54) 98403-2180",
      empresa: "Vinícola",
      cargo: "financeiro",
      regime_tributario: "lucro_real",
      irpj_faixa: "500k_2500k",
      apuracao: "anual",
      formato: "simulacao",
      cidade: "Bento Gonçalves",
      uf: "RS",
      consent_lgpd: true,
      consent_marketing: false,
    } as never);
    expect(draft.thanksVariant).toBe("simulacao");
  });
});
