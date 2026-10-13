// Mensagens do resultado da conversão "Reunião marcada" (ADR-004, 6.6 e 6.12): uma por situação,
// na ordem de prioridade que a tela usa (falha ao avançar, reativado, lead reaproveitado,
// organização reaproveitada, criação limpa).
import { describe, expect, it } from "vitest";
import { describeConversion, type ConversionResult } from "@/lib/crm/prospecting-view";

const base: ConversionResult = {
  leadId: "lead",
  orgId: "org",
  contactId: "contact",
  created: true,
  reactivated: false,
  orgReused: false,
  stage: "qualificado",
  advanceFailed: false,
};

describe("describeConversion", () => {
  it.each<[string, Partial<ConversionResult>, string]>([
    ["criação limpa", {}, "Reunião marcada. Lead criado em Qualificado."],
    [
      "organização de mesmo nome já existia",
      { orgReused: true },
      "Reunião marcada. Lead criado em Qualificado e vinculado à organização já cadastrada com este nome; confira a ficha.",
    ],
    [
      "lead reaproveitado (o aviso do lead vence o da organização)",
      { created: false, orgReused: true, stage: "diagnostico" },
      "Já existe um lead com este e-mail; a reunião foi registrada nele.",
    ],
    [
      "lead perdido reativado",
      { created: false, reactivated: true, orgReused: true },
      "Lead reativado em Qualificado.",
    ],
    [
      "estágio não avançado",
      { advanceFailed: true, orgReused: true, stage: "novo" },
      "Reunião registrada; não foi possível avançar o estágio: abra o lead e use Mover para.",
    ],
  ])("%s", (_name, overrides, expected) => {
    expect(describeConversion({ ...base, ...overrides })).toBe(expected);
  });
});
