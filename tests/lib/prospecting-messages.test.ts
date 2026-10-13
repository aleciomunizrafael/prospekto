// Mensagens de WhatsApp da prospecção (ADR-004, 6.6; plano, P9): voz da Daniela, apresentação
// honesta, convite para a empresa contar como decide apoios, sem números, sem "dor", sempre com a
// saída "Responda SAIR". Hash estável por item e link wa.me só para celular brasileiro.
import { describe, expect, it } from "vitest";
import {
  PROSPECTING_EXIT_LINE,
  isWhatsappMobile,
  localRef,
  prospectingMessages,
  variantIndexFor,
  whatsappHrefForPhone,
} from "@/lib/crm/prospecting-messages";

describe("prospectingMessages", () => {
  const messages = prospectingMessages("Vinícola Exemplo");

  it("tem três variações, cada uma com Daniela, Prospekto e a saída SAIR no fim", () => {
    expect(messages).toHaveLength(3);
    for (const m of messages) {
      expect(m).toContain("Daniela");
      expect(m).toContain("Prospekto");
      expect(m.endsWith(PROSPECTING_EXIT_LINE)).toBe(true);
      expect(m).toContain("Responda SAIR se não quiser mensagens por aqui.");
    }
  });

  it("não traz números, R$, 4% nem a palavra dor, e não presume a rotina", () => {
    for (const m of messages) {
      expect(m).not.toMatch(/%/);
      expect(m).not.toMatch(/R\$/);
      expect(m).not.toContain("4%");
      expect(m).not.toMatch(/\bdor\b/i);
      expect(m).not.toMatch(/\bsei que\b|\bimagino que\b|\bvocês devem\b/i);
    }
  });

  it("convida a empresa a contar como decide apoios e patrocínios", () => {
    const joined = messages.join("\n");
    expect(joined).toMatch(/decidem apoios e patrocínios/);
    expect(joined).toMatch(/sem promessa de retorno|não prometo retorno/);
  });

  it.each([
    ["Vinícola Exemplo", "aí na Vinícola Exemplo"],
    ["Instituto Modelo", "aí no Instituto Modelo"],
    ["Metalúrgica Modelo", "aí na Metalúrgica Modelo"],
    ["ACME", "aí"],
    ["Vinícola com um nome comprido demais para caber na frase", "aí"],
    ["", "aí"],
  ])("localRef(%j) = %j", (name, expected) => {
    expect(localRef(name)).toBe(expected);
  });

  it("usa a referência ao local nas variações que convidam a contar a rotina", () => {
    const [first, , third] = prospectingMessages("Instituto Modelo");
    expect(first).toContain("aí no Instituto Modelo");
    expect(third).toContain("aí no Instituto Modelo");
  });
});

describe("variantIndexFor", () => {
  it("é estável e cobre as três variações", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(variantIndexFor(id, 3)).toBe(variantIndexFor(id, 3));
    const seen = new Set<number>();
    for (let i = 0; i < 60; i++) {
      const index = variantIndexFor(
        `00000000-0000-4000-8000-0000000000${String(i).padStart(2, "0")}`,
        3,
      );
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(3);
      seen.add(index);
    }
    expect(seen.size).toBe(3);
    expect(variantIndexFor("x", 0)).toBe(0);
  });
});

describe("whatsappHrefForPhone", () => {
  it("só aceita celular brasileiro em E.164 (+55, DDD, 9 e oito dígitos)", () => {
    expect(isWhatsappMobile("+5554990000001")).toBe(true);
    expect(isWhatsappMobile("+555430000000")).toBe(false);
    expect(whatsappHrefForPhone("+555430000000", "oi")).toBeNull();
    expect(whatsappHrefForPhone("5554990000001", "oi")).toBeNull();
    expect(whatsappHrefForPhone("+15554990000001", "oi")).toBeNull();
    expect(whatsappHrefForPhone(null, "oi")).toBeNull();
    expect(whatsappHrefForPhone("+5554990000001", "Olá, tudo bem?")).toBe(
      `https://wa.me/5554990000001?text=${encodeURIComponent("Olá, tudo bem?")}`,
    );
  });
});
