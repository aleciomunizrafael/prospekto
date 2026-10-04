import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  businessDaysBetween,
  isBusinessDay,
  slaBusinessDays,
  slaDeadline,
} from "./sla";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12));

describe("sla", () => {
  it("fim de semana não é dia útil", () => {
    expect(isBusinessDay(utc(2026, 10, 3))).toBe(false); // sábado
    expect(isBusinessDay(utc(2026, 10, 4))).toBe(false); // domingo
    expect(isBusinessDay(utc(2026, 10, 5))).toBe(true); // segunda
  });

  it("soma dias úteis pulando o fim de semana", () => {
    expect(addBusinessDays(utc(2026, 10, 2), 1)).toEqual(utc(2026, 10, 5)); // sexta + 1 = segunda
    expect(addBusinessDays(utc(2026, 10, 5), 5)).toEqual(utc(2026, 10, 12));
    expect(addBusinessDays(utc(2026, 10, 5), 0)).toEqual(utc(2026, 10, 5));
    expect(() => addBusinessDays(utc(2026, 10, 5), -1)).toThrow(RangeError);
  });

  it("conta dias úteis entre datas", () => {
    expect(businessDaysBetween(utc(2026, 10, 2), utc(2026, 10, 5))).toBe(1);
    expect(businessDaysBetween(utc(2026, 10, 5), utc(2026, 10, 12))).toBe(5);
    expect(businessDaysBetween(utc(2026, 10, 12), utc(2026, 10, 5))).toBe(-5);
  });

  it("proposta cai para 2 dias úteis em novembro e dezembro", () => {
    expect(slaBusinessDays("patrocinadores", "proposta", utc(2026, 6, 1))).toBe(5);
    expect(slaBusinessDays("patrocinadores", "proposta", utc(2026, 11, 1))).toBe(2);
    expect(slaBusinessDays("patrocinadores", "proposta", utc(2026, 12, 15))).toBe(2);
  });

  it("aporte é diário a partir de 10 de dezembro", () => {
    expect(slaBusinessDays("patrocinadores", "aporte", utc(2026, 12, 9))).toBe(2);
    expect(slaBusinessDays("patrocinadores", "aporte", utc(2026, 12, 10))).toBe(1);
  });

  it("estágios sem prazo em dias devolvem null", () => {
    expect(slaBusinessDays("contadores", "ativo", utc(2026, 3, 1))).toBeNull();
    expect(slaDeadline("patrocinadores", "renovacao", utc(2026, 3, 1))).toBeNull();
    expect(slaDeadline("patrocinadores", "novo", utc(2026, 10, 2))).toEqual(utc(2026, 10, 5));
  });

  it("municipios.contrato é em dias corridos (30 dias, personas-e-funis.md 8.3)", () => {
    expect(slaBusinessDays("municipios", "contrato", utc(2026, 10, 1))).toBeNull();
    expect(slaDeadline("municipios", "contrato", utc(2026, 10, 1))).toEqual(utc(2026, 10, 31));
  });
});
