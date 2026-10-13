// Mensagens do resultado da conversão "Reunião marcada" (ADR-004, 6.6 e 6.12): uma por situação,
// na ordem de prioridade que a tela usa (falha ao avançar, reativado, lead reaproveitado,
// organização reaproveitada, criação limpa). E o "há N d" da última tentativa e do WhatsApp
// aberto, que conta dias de calendário em São Paulo, não blocos de 24 h.
import { describe, expect, it } from "vitest";
import {
  agoShort,
  describeConversion,
  whatsappOpenedText,
  type ConversionResult,
} from "@/lib/crm/prospecting-view";

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

describe("agoShort", () => {
  // 09:00 de terça, 13 de outubro, em São Paulo.
  const now = new Date("2026-10-13T12:00:00Z");

  it.each<[string, string, string]>([
    ["mais cedo no mesmo dia", "2026-10-13T11:00:00Z", "hoje"],
    ["ontem às 23h, dez horas antes, é há 1 d e não hoje", "2026-10-13T02:00:00Z", "há 1 d"],
    ["anteontem às 10h, 47 horas antes, é há 2 d e não há 1 d", "2026-10-11T13:00:00Z", "há 2 d"],
    ["exatamente dois dias antes", "2026-10-11T12:00:00Z", "há 2 d"],
    ["data no futuro não vira negativo", "2026-10-14T12:00:00Z", "hoje"],
  ])("%s", (_name, date, expected) => {
    expect(agoShort(new Date(date), now)).toBe(expected);
  });

  it("whatsappOpenedText herda o dia de calendário e é nulo sem envio", () => {
    expect(whatsappOpenedText(new Date("2026-10-13T02:00:00Z"), now)).toBe(
      "WhatsApp aberto há 1 d",
    );
    expect(whatsappOpenedText(null, now)).toBeNull();
  });
});
