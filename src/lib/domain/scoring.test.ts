import { describe, expect, it } from "vitest";
import {
  daysToPeriodClose,
  scoreAluno,
  scoreCont,
  scoreLead,
  scoreMun,
  scorePf,
  scorePj,
  scoreProp,
  temperatureFor,
} from "./scoring";

describe("scoring (personas-e-funis.md, 5.2 e 5.3)", () => {
  it("temperatura deriva do score", () => {
    expect(temperatureFor(0)).toBe("frio");
    expect(temperatureFor(39)).toBe("frio");
    expect(temperatureFor(40)).toBe("morno");
    expect(temperatureFor(69)).toBe("morno");
    expect(temperatureFor(70)).toBe("quente");
    expect(temperatureFor(100)).toBe("quente");
  });

  it("PJ: máximo 100 e mínimo 2 (origem 'demais')", () => {
    expect(
      scorePj({
        regimeConfirmedLucroReal: true,
        irpjBand: "acima_2500k",
        decisionMakerInContact: true,
        incentiveHistory: "usou",
        daysToPeriodClose: 30,
        source: "indicacao_contador",
      }).score,
    ).toBe(100);
    const min = scorePj({
      regimeConfirmedLucroReal: false,
      irpjBand: "nao_sei",
      decisionMakerInContact: false,
      incentiveHistory: "nenhum",
      daysToPeriodClose: 300,
      source: "outro",
    });
    expect(min.score).toBe(2);
    expect(min.temperature).toBe("frio");
  });

  it("PJ: lead típico da Fase 1 (lucro real confirmado, 500k a 2,5mi, indicação) é quente", () => {
    const r = scorePj({
      regimeConfirmedLucroReal: true,
      irpjBand: "500k_2500k",
      decisionMakerInContact: true,
      incentiveHistory: "conhece",
      daysToPeriodClose: 120,
      source: "indicacao_contador",
    });
    expect(r.breakdown).toEqual({
      regime: 30,
      irpj: 20,
      decisor: 15,
      historico: 5,
      timing: 5,
      origem: 10,
    });
    expect(r.score).toBe(85);
    expect(r.temperature).toBe("quente");
  });

  it("PF, CONT, MUN, PROP e ALUNO somam 100 no máximo", () => {
    expect(
      scorePf({
        fullDeclarationModel: true,
        irBand: "acima_80k",
        accountantIdentified: true,
        alreadyDonatesWithIncentive: true,
        month: 11,
        source: "indicacao_cliente",
      }).score,
    ).toBe(100);
    expect(
      scoreCont({
        lucroRealClientsBand: "20_mais",
        partnerInContact: true,
        alreadyFiledIncentive: true,
        location: "serra",
        acceptedMeetingOrWebinar: true,
        source: "evento",
      }).score,
    ).toBe(100);
    expect(
      scoreMun({
        hasCultureDepartmentWithHead: true,
        pnabActiveOrBalance: true,
        canContractThisYear: true,
        secretaryOrMayorInContact: true,
        within60DaysOfDeadline: true,
        priorRelationship: true,
      }).score,
    ).toBe(100);
    expect(
      scoreProp({
        hasValidAuthorization: true,
        balanceInRangeAndDeadlineOver6Months: true,
        fullDeductionMechanism: true,
        proponentRegular: true,
        regionalAppealAndPartners: true,
        fundraisingFeeBudgeted: true,
      }).score,
    ).toBe(100);
    expect(
      scoreAluno({
        objectiveDeclared: true,
        hasProjectOrWorksInCulture: true,
        willingToInvest: true,
        answeredSurvey: true,
        fromReferralOrOpenClass: true,
      }).score,
    ).toBe(100);
  });

  it("PF: fora de setembro a dezembro o timing vale 3", () => {
    const r = scorePf({
      fullDeclarationModel: true,
      irBand: "20k_80k",
      accountantIdentified: false,
      alreadyDonatesWithIncentive: false,
      month: 4,
      source: "simulador",
    });
    expect(r.breakdown.timing).toBe(3);
    expect(r.score).toBe(30 + 15 + 3 + 7);
  });

  it("dias até o fechamento do período de apuração", () => {
    const now = new Date(Date.UTC(2026, 9, 4, 12)); // 4 de outubro
    expect(daysToPeriodClose("anual", now)).toBe(89);
    expect(daysToPeriodClose("trimestral", now)).toBe(89);
    expect(daysToPeriodClose("trimestral", new Date(Date.UTC(2026, 6, 1, 12)))).toBe(92);
    expect(daysToPeriodClose("nao_sei", now)).toBeNull();
  });

  it("scoreLead lê os attributes do formulário (seção 9.3)", () => {
    const now = new Date(Date.UTC(2026, 9, 4, 12));
    const pj = scoreLead(
      "PJ",
      "simulador",
      {
        regime_tributario: "lucro_real",
        regime_confirmado_por: "contador",
        irpj_faixa: "500k_2500k",
        apuracao: "anual",
      },
      now,
    );
    expect(pj.breakdown).toMatchObject({ regime: 30, irpj: 20, timing: 10, origem: 7 });
    const pjDeclared = scoreLead("PJ", "site", { regime_tributario: "lucro_real" }, now);
    expect(pjDeclared.breakdown.regime).toBe(0);
    const aluno = scoreLead(
      "ALUNO",
      "site",
      { objetivo: "captar", experiencia: "ja_escrevi" },
      now,
    );
    expect(aluno.score).toBe(20 + 25 + 5);
    expect(scoreLead("MUN", "site", {}, now).score).toBe(0);
  });
});
