import { describe, expect, it } from "vitest";
import { formActivitySubject, formActivityText } from "@/lib/crm/activity-text";

describe("texto das atividades de formulário", () => {
  it("omite dados pessoais e ids e traduz chaves e enums", () => {
    const text = formActivityText({
      form_id: "diagnostico",
      tipo_pessoa: "PJ",
      nome: "Teste Revisor",
      email: "x@example.test",
      telefone: "+5554999990000",
      cidade: "Caxias do Sul",
      uf: "RS",
      formato: "simulacao",
      disponibilidade: "manha",
      mensagem: null,
      projeto_id: "0b9d8f6a-0000-4000-8000-000000000000",
      simulation_id: "0b9d8f6a-0000-4000-8000-000000000001",
      consent_lgpd: true,
      consent_marketing: false,
      cargo: "financeiro",
      regime_tributario: "lucro_real",
      irpj_faixa: "500k_2500k",
      contador_participa: true,
    });
    expect(text).toBe(
      [
        "Quem patrocina: Empresa (PJ)",
        "Cidade: Caxias do Sul",
        "UF: RS",
        "Formato: Simulação (20 min)",
        "Disponibilidade: Manhã",
        "Cargo: Financeiro",
        "Regime tributário: Lucro real",
        "Faixa de IRPJ: R$ 500 mil a R$ 2,5 milhões",
        "Contador participa da conversa: sim",
      ].join(" · "),
    );
    expect(text).not.toContain("example.test");
    expect(text).not.toContain("+55");
  });

  it("devolve null sem dados e mantém chaves desconhecidas", () => {
    expect(formActivityText(null)).toBeNull();
    expect(formActivityText({ form_id: "x" })).toBeNull();
    expect(formActivityText({ chave_nova: "valor" })).toBe("chave_nova: valor");
  });

  it("traduz a origem no assunto do formulário", () => {
    expect(formActivitySubject("Formulário recebido (diagnostico)")).toBe(
      "Formulário recebido: Diagnóstico",
    );
    expect(formActivitySubject("Formulário reenviado (guia)")).toBe("Formulário reenviado: Guia");
    expect(formActivitySubject("Outro assunto")).toBe("Outro assunto");
  });
});
