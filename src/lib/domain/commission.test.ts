import { describe, expect, it } from "vitest";
import params from "../../../docs/dominio/parametros-simulador.json";
import {
  CommissionLimitError,
  LIC_RS_COMMISSION_LIMITS,
  ROUANET_COMMISSION_LIMITS,
  assertCommissionWithinLimits,
  commissionLimitsFor,
  maxCommissionFor,
} from "./commission";

describe("commission (R-8, IN MinC 29/2026, art. 19)", () => {
  it("lê 10% e R$ 150.000 do JSON para a Rouanet; LIC-RS fica a verificar", () => {
    expect(ROUANET_COMMISSION_LIMITS.maxPercent).toBe(10);
    expect(ROUANET_COMMISSION_LIMITS.capPerProject).toBe(150000);
    expect(ROUANET_COMMISSION_LIMITS.capIsPerYearInMultiYearPlans).toBe(true);
    expect(LIC_RS_COMMISSION_LIMITS.maxPercent).toBeNull();
    expect(LIC_RS_COMMISSION_LIMITS.status).toBe("verificar");
    expect(commissionLimitsFor("rouanet_art26_doacao")).toBe(ROUANET_COMMISSION_LIMITS);
    expect(commissionLimitsFor("lic_rs")).toBe(LIC_RS_COMMISSION_LIMITS);
    expect(commissionLimitsFor("audiovisual_art1A")).toBeNull();
  });

  it("reproduz os exemplos de comissao_captacao_rouanet", () => {
    for (const ex of params.exemplos.comissao_captacao_rouanet) {
      const expected =
        "comissao_maxima" in ex ? ex.comissao_maxima : ex.comissao_maxima_proporcional;
      const byPercent = maxCommissionFor(ex.captado, "rouanet_art18")!;
      expect(Math.min(byPercent, ROUANET_COMMISSION_LIMITS.capPerProject!)).toBe(expected);
    }
  });

  it("aceita comissão até 10% do depositado, sem avisos", () => {
    expect(
      assertCommissionWithinLimits({
        mechanism: "rouanet_art18",
        depositedAmount: 50000,
        commissionDue: 5000,
      }),
    ).toEqual({ projectCommissionTotal: 5000, periodCommissionTotal: 5000, warnings: [] });
  });

  it("rejeita comissão acima de 10% (bloqueante)", () => {
    expect(() =>
      assertCommissionWithinLimits({
        mechanism: "rouanet_art18",
        depositedAmount: 50000,
        commissionDue: 5000.01,
      }),
    ).toThrow(CommissionLimitError);
    try {
      assertCommissionWithinLimits({
        mechanism: "rouanet_art18",
        depositedAmount: 50000,
        commissionDue: 6000,
      });
    } catch (e) {
      expect((e as CommissionLimitError).code).toBe("percent");
    }
  });

  it("teto de R$ 150.000 por projeto e ano é aviso, não erro", () => {
    const over = assertCommissionWithinLimits({
      mechanism: "rouanet_art18",
      depositedAmount: 1_000_000,
      commissionDue: 100_000,
      projectCommissionSoFar: 60_000,
    });
    expect(over.projectCommissionTotal).toBe(160_000);
    expect(over.warnings.map((w) => w.code)).toEqual(["cap"]);
    expect(over.warnings[0].message).toMatch(/teto/);
    const exact = assertCommissionWithinLimits({
      mechanism: "rouanet_art18",
      depositedAmount: 1_000_000,
      commissionDue: 90_000,
      projectCommissionSoFar: 60_000,
    });
    expect(exact.projectCommissionTotal).toBe(150_000);
    expect(exact.warnings).toEqual([]);
  });

  it("teto é medido no ano (planos plurianuais): soma do projeto pode passar sem aviso", () => {
    const r = assertCommissionWithinLimits({
      mechanism: "rouanet_art18",
      depositedAmount: 1_000_000,
      commissionDue: 100_000,
      projectCommissionSoFar: 140_000, // anos anteriores
      periodCommissionSoFar: 20_000, // mesmo ano
      fundraisingFeeAmount: 300_000,
    });
    expect(r.projectCommissionTotal).toBe(240_000);
    expect(r.periodCommissionTotal).toBe(120_000);
    expect(r.warnings).toEqual([]);
  });

  it("rejeita quando a soma excede a rubrica aprovada ou o percentual contratado", () => {
    expect(() =>
      assertCommissionWithinLimits({
        mechanism: "rouanet_art18",
        depositedAmount: 100_000,
        commissionDue: 8_000,
        projectCommissionSoFar: 5_000,
        fundraisingFeeAmount: 12_000,
      }),
    ).toThrow(/rubrica/);
    expect(() =>
      assertCommissionWithinLimits({
        mechanism: "rouanet_art18",
        depositedAmount: 100_000,
        commissionDue: 9_000,
        contractedPercent: 8,
      }),
    ).toThrow(/contratado/);
  });

  it("lic_rs (limites a verificar) não aplica o percentual nem o teto; só avisa", () => {
    const r = assertCommissionWithinLimits({
      mechanism: "lic_rs",
      depositedAmount: 100_000,
      commissionDue: 20_000,
      projectCommissionSoFar: 200_000,
    });
    expect(r.warnings.map((w) => w.code)).toEqual(["unverified_limits"]);
    expect(maxCommissionFor(100_000, "lic_rs")).toBeNull();
    // A rubrica do projeto continua bloqueante para qualquer mecanismo.
    expect(() =>
      assertCommissionWithinLimits({
        mechanism: "lic_rs",
        depositedAmount: 100_000,
        commissionDue: 20_000,
        fundraisingFeeAmount: 10_000,
      }),
    ).toThrow(/rubrica/);
  });

  it("rejeita valores inválidos", () => {
    expect(() =>
      assertCommissionWithinLimits({
        mechanism: "rouanet_art18",
        depositedAmount: -1,
        commissionDue: 0,
      }),
    ).toThrow(/inválido/);
    expect(() =>
      assertCommissionWithinLimits({
        mechanism: "rouanet_art18",
        depositedAmount: 100,
        commissionDue: Number.NaN,
      }),
    ).toThrow();
  });
});
