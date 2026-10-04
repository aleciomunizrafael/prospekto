import { describe, expect, it } from "vitest";
import {
  bankingDaysBetween,
  daysLeftBand,
  deadlineInfo,
  formatDateBr,
  isBankingDay,
  lastBankingDayOfYear,
  todayInBrazil,
} from "@/components/site/deadline";
import { site } from "@/config/site";

const config = site.deadline;

describe("faixa de prazo: dias úteis bancários até o último dia útil de dezembro", () => {
  it("último dia útil bancário recua do dia 30 para o dia útil anterior quando cai no fim de semana", () => {
    expect(lastBankingDayOfYear(2026, config)).toBe("2026-12-30"); // quarta-feira
    expect(lastBankingDayOfYear(2028, config)).toBe("2028-12-29"); // 30 é sábado
    expect(lastBankingDayOfYear(2029, config)).toBe("2029-12-28"); // 30 é domingo
  });

  it("fins de semana e dias sem expediente bancário não contam", () => {
    expect(isBankingDay("2026-11-02", config)).toBe(false); // Finados
    expect(isBankingDay("2026-11-20", config)).toBe(false); // Consciência Negra
    expect(isBankingDay("2026-12-24", config)).toBe(false);
    expect(isBankingDay("2026-12-31", config)).toBe(false);
    expect(isBankingDay("2026-12-05", config)).toBe(false); // sábado
    expect(isBankingDay("2026-12-07", config)).toBe(true); // segunda
    expect(bankingDaysBetween("2026-12-28", "2026-12-30", config)).toBe(2);
    expect(bankingDaysBetween("2026-12-23", "2026-12-30", config)).toBe(3); // 28, 29, 30
    expect(bankingDaysBetween("2026-12-30", "2026-12-30", config)).toBe(0);
    expect(bankingDaysBetween("2027-01-05", "2026-12-30", config)).toBe(0);
  });

  it("só aparece em novembro e dezembro, até a data limite", () => {
    expect(deadlineInfo("2026-10-31", config)).toBeNull();
    expect(deadlineInfo("2026-11-01", config)).toMatchObject({
      deadline: "2026-12-30",
      isLastDay: false,
    });
    expect(deadlineInfo("2026-12-30", config)).toEqual({
      deadline: "2026-12-30",
      businessDaysLeft: 0,
      isLastDay: true,
    });
    expect(deadlineInfo("2026-12-31", config)).toBeNull();
    expect(deadlineInfo("2026-12-01", config)?.businessDaysLeft).toBe(19);
  });

  it("faixas do evento e formatação", () => {
    expect(daysLeftBand(0)).toBe("0-5");
    expect(daysLeftBand(6)).toBe("6-10");
    expect(daysLeftBand(20)).toBe("11-20");
    expect(daysLeftBand(21)).toBe("21+");
    expect(formatDateBr("2026-12-30")).toBe("30/12/2026");
    expect(todayInBrazil(new Date("2026-12-31T01:00:00Z"))).toBe("2026-12-30"); // 22h em Brasília
  });
});
