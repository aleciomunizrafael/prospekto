// Núcleo de qualificação (src/lib/ai/qualification.ts): perguntas por segmento, horários
// propostos em America/Sao_Paulo e o texto fixo de regras.
import { describe, expect, it } from "vitest";
import { LEAD_SEGMENTS } from "@/lib/domain/enums";
import { proposeSlots, qualificationQuestions, qualificationRules } from "@/lib/ai/qualification";

const SP = "America/Sao_Paulo";

function localParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SP,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return {
    weekday: get("weekday"),
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

describe("proposeSlots", () => {
  it("numa sexta-feira às 16h devolve segunda e terça seguintes dentro das janelas", () => {
    // 09/10/2026 é sexta-feira; 16:00 em São Paulo = 19:00Z.
    const slots = proposeSlots(new Date("2026-10-09T19:00:00Z"));
    expect(slots).toHaveLength(2);
    expect(slots[0].label).toBe("segunda-feira, 12 de outubro, às 10h");
    expect(slots[1].label).toBe("terça-feira, 13 de outubro, às 15h");
    expect(localParts(slots[0].iso)).toEqual({ weekday: "Mon", date: "2026-10-12", time: "10:00" });
    expect(localParts(slots[1].iso)).toEqual({ weekday: "Tue", date: "2026-10-13", time: "15:00" });
  });

  it("numa segunda às 10h devolve terça e quarta", () => {
    const slots = proposeSlots(new Date("2026-10-12T13:00:00Z"));
    expect(slots.map((s) => localParts(s.iso).date)).toEqual(["2026-10-13", "2026-10-14"]);
    expect(slots[0].label).toMatch(/^terça-feira, 13 de outubro, às 10h$/);
    expect(slots[1].label).toMatch(/^quarta-feira, 14 de outubro, às 15h$/);
  });

  it("nunca propõe hoje, sábado ou domingo, e os dois dias são diferentes", () => {
    for (let day = 0; day < 21; day++) {
      const now = new Date(Date.UTC(2026, 9, 1 + day, 15, 0)); // 12:00 em São Paulo
      const today = localParts(now.toISOString()).date;
      const slots = proposeSlots(now);
      expect(slots).toHaveLength(2);
      const days = slots.map((s) => localParts(s.iso));
      for (const d of days) {
        expect(["Sat", "Sun"]).not.toContain(d.weekday);
        expect(d.date > today).toBe(true);
      }
      expect(days[0].date).not.toBe(days[1].date);
      expect(slots[0].label).toMatch(/-feira, \d{1,2} de [a-zç]+, às \d{1,2}h(\d{2})?$/);
    }
  });

  it("respeita o fim da janela: slot curto demais cai no início da janela", () => {
    const slots = proposeSlots(new Date("2026-10-09T19:00:00Z"), {
      windows: [{ days: [1, 2, 3, 4, 5], start: "09:00", end: "09:30" }],
    });
    expect(slots.map((s) => localParts(s.iso).time)).toEqual(["09:00", "09:00"]);
  });

  it("virada do dia em São Paulo: 23h30 de sexta ainda conta como sexta", () => {
    // 23:30 de sexta 09/10 em SP = 02:30Z de sábado 10/10.
    const slots = proposeSlots(new Date("2026-10-10T02:30:00Z"));
    expect(localParts(slots[0].iso).date).toBe("2026-10-12");
  });
});

describe("qualificationQuestions", () => {
  it("não repete o que o lead já informou", () => {
    const all = qualificationQuestions("PJ", {});
    const filtered = qualificationQuestions("PJ", { regime_tributario: "lucro_real" });
    expect(all.length - filtered.length).toBe(1);
    expect(filtered.some((q) => /lucro real/i.test(q))).toBe(false);
    expect(all.some((q) => /lucro real/i.test(q))).toBe(true);
  });

  it('"nao_sei" e valor vazio contam como não respondido', () => {
    const base = qualificationQuestions("PJ", {}).length;
    expect(qualificationQuestions("PJ", { regime_tributario: "nao_sei" })).toHaveLength(base);
    expect(qualificationQuestions("PJ", { regime_tributario: "" })).toHaveLength(base);
    expect(qualificationQuestions("PJ", { contador_participa: false })).toHaveLength(base - 1);
  });

  it.each(LEAD_SEGMENTS)("%s devolve entre 3 e 6 perguntas em português", (segment) => {
    const questions = qualificationQuestions(segment, {});
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.length).toBeLessThanOrEqual(6);
    for (const q of questions) expect(q).toMatch(/\?$/);
  });
});

describe("qualificationRules", () => {
  it("é um texto fixo com ressalvas, desqualificações e objeções, sem data", () => {
    const text = qualificationRules();
    expect(text).toBe(qualificationRules());
    expect(text).toMatch(/3,6%/);
    expect(text).toMatch(/LC 224\/2025/);
    expect(text).toMatch(/art\. 27/);
    expect(text).toMatch(/Simples Nacional/);
    expect(text).toMatch(/retorno financeiro/);
    expect(text).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(text).not.toMatch(/Hoje é/);
  });
});
