import { describe, expect, it } from "vitest";
import { sanitizeProps, track } from "@/lib/analytics";

describe("analytics (seção 9.1): nunca nome, e-mail, telefone ou valores exatos", () => {
  it("remove chaves proibidas e mantém as permitidas", () => {
    expect(
      sanitizeProps({
        form_id: "guide",
        segment: "PJ",
        nome: "Maria",
        email: "m@x.com",
        telefone: "+55",
        whatsapp_number: "x",
        cnpj: "1",
        valor: 1000,
        irpj: 50,
        tax_band: "100k_500k",
        value: true,
      }),
    ).toEqual({ form_id: "guide", segment: "PJ", tax_band: "100k_500k", value: true });
  });

  it("corta textos longos e ignora undefined", () => {
    const out = sanitizeProps({ path: "a".repeat(300), x: undefined as unknown as string });
    expect((out.path as string).length).toBe(200);
    expect(out).not.toHaveProperty("x");
  });

  it("track no servidor é um no-op silencioso", () => {
    expect(() => track("cta_click", { cta_id: "x" })).not.toThrow();
  });
});
