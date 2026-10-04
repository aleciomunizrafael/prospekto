// Formatação do CRM (src/lib/crm/format.ts): datas de calendário sem fuso, data e hora em
// America/Sao_Paulo, ida e volta do datetime-local, dia de calendário perto da meia-noite UTC,
// telefone E.164 e moeda.
import { describe, expect, it } from "vitest";
import {
  calendarDateInSaoPaulo,
  dayBounds,
  formatBRL,
  formatDate,
  formatDateTime,
  formatPhoneBR,
  fromDateTimeLocal,
  toDateTimeLocal,
} from "@/lib/crm/format";

describe("format.ts", () => {
  it("formatDate trata 'AAAA-MM-DD' como data de calendário, sem fuso", () => {
    expect(formatDate("2025-03-10")).toBe("10/03/2025");
    expect(formatDate(new Date("2025-03-10T01:00:00Z"))).toBe("09/03/2025");
    expect(formatDate(null)).toBe("");
    expect(formatDate("inválida")).toBe("");
  });

  it("formatDateTime usa America/Sao_Paulo", () => {
    expect(formatDateTime(new Date("2026-10-04T18:14:00Z"))).toBe("04/10/2026, 15:14");
    expect(formatDateTime("2026-01-01T02:30:00Z")).toBe("31/12/2025, 23:30");
  });

  it("toDateTimeLocal e fromDateTimeLocal fazem ida e volta", () => {
    const at = new Date("2026-10-10T12:00:00Z");
    const local = toDateTimeLocal(at);
    expect(local).toBe("2026-10-10T09:00");
    expect(fromDateTimeLocal(local)?.toISOString()).toBe(at.toISOString());
    expect(fromDateTimeLocal("x")).toBeNull();
    expect(toDateTimeLocal(null)).toBe("");
  });

  it("calendarDateInSaoPaulo e dayBounds perto da meia-noite UTC", () => {
    expect(calendarDateInSaoPaulo(new Date("2026-10-05T01:00:00Z"))).toBe("2026-10-04");
    expect(calendarDateInSaoPaulo(new Date("2026-10-05T03:30:00Z"))).toBe("2026-10-05");
    const { start, end } = dayBounds(new Date("2026-10-05T01:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-04T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-05T02:59:59.999Z");
  });

  it("formatPhoneBR formata E.164 brasileiro e deixa o resto como está", () => {
    expect(formatPhoneBR("+5554999990000")).toBe("(54) 99999-0000");
    expect(formatPhoneBR("+555433330000")).toBe("(54) 3333-0000");
    expect(formatPhoneBR("+351912345678")).toBe("+351912345678");
    expect(formatPhoneBR(null)).toBe("");
  });

  it("formatBRL", () => {
    expect(formatBRL(1234.5).replace(/ /g, " ")).toBe("R$ 1.234,50");
    expect(formatBRL(null)).toBe("");
  });
});
