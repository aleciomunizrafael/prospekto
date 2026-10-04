// Casos de docs/site/simulador-spec.md, seção 9: um `it` por ID (T-PJ-01..25, T-PF-01..11,
// T-LIC-01..09, T-FMT-01..06, T-SCH-01..08), com os valores exatos das tabelas. Os valores de
// T-PJ-01 a 06, T-PF-01 e 02 e T-LIC-01 a 04 reproduzem `exemplos` do JSON.
import { describe, expect, it } from "vitest";
import { formatBRL, formatRange, parseCurrencyBR, round2 } from "./format";
import {
  LIC_RS_SEGMENTS,
  parseSimulatorInput,
  pjSimulatorInputSchema,
  type SimulatorInput,
  type SimulatorMechanismKey,
  type SimulatorRawInput,
} from "./input";
import {
  SIMULATOR_MECHANISMS,
  licRsAnnualLimit,
  loadParams,
  params,
  paramsAgeInDays,
  type SimulatorParams,
} from "./params";
import { bandFor, compareScenario, simulate, simulateLicRs } from "./simulate";
import { TEXT_KEYS, SIMULATOR_TEXTS, renderText, textsFor } from "./texts";
import type { SimulatorResult } from "./types";

// Data fixa para o aviso params_stale não depender do relógio da máquina.
const NOW = new Date("2026-10-04T12:00:00Z");

function parse(raw: SimulatorRawInput): SimulatorInput {
  const parsed = parseSimulatorInput(raw);
  if (!parsed.ok) {
    throw new Error(`Entrada inválida no teste: ${JSON.stringify(parsed.issues)}`);
  }
  return parsed.input;
}

function run(raw: SimulatorRawInput, p: SimulatorParams = params): SimulatorResult {
  return simulate(parse(raw), p, { now: NOW });
}

const pj = (extra: Partial<Extract<SimulatorRawInput, { taxpayer_type: "pj" }>> = {}) =>
  ({
    taxpayer_type: "pj",
    regime: "lucro_real",
    input_mode: "tax_due",
    tax_due: 500000,
    apply_lc224: false,
    ...extra,
  }) as SimulatorRawInput;

const pf = (extra: Partial<Extract<SimulatorRawInput, { taxpayer_type: "pf" }>> = {}) =>
  ({
    taxpayer_type: "pf",
    declaration_model: "completa",
    input_mode: "tax_due",
    tax_due: 20000,
    ...extra,
  }) as SimulatorRawInput;

function row(result: SimulatorResult, key: SimulatorMechanismKey) {
  const found = result.limits?.mechanisms.find((r) => r.key === key);
  if (!found) throw new Error(`Sem linha para ${key}`);
  return found;
}

function group(result: SimulatorResult, key: string) {
  const found = result.limits?.groups.find((g) => g.key === key);
  if (!found) throw new Error(`Sem grupo ${key}`);
  return found;
}

function limitsSummary(result: SimulatorResult) {
  return {
    basket: result.limits!.cultural_basket.min,
    art1: row(result, "audiovisual_art1").limit.min,
    sport: group(result, "esporte_pj").limit.min,
    funds: ["fia_pj", "idoso_pj", "pronon_pj", "pronas_pj"].map((g) => group(result, g).limit.min),
    total: result.limits!.total.min,
    art26Sponsor: row(result, "rouanet_art26_patrocinio").contribution_for_cap.min,
    art26Donation: row(result, "rouanet_art26_doacao").contribution_for_cap.min,
  };
}

const warningCodes = (result: SimulatorResult) => result.warnings.map((w) => w.code);

describe("9.1 Pessoa jurídica: limites", () => {
  const cases = [
    ["T-PJ-01", 500000, false, 20000, 15000, 10000, 5000, 50000, 66666.67, 50000],
    ["T-PJ-02", 500000, true, 18000, 13500, 9000, 4500, 45000, 60000, 45000],
    ["T-PJ-03", 2000000, false, 80000, 60000, 40000, 20000, 200000, 266666.67, 200000],
    ["T-PJ-04", 2000000, true, 72000, 54000, 36000, 18000, 180000, 240000, 180000],
    ["T-PJ-05", 10000000, false, 400000, 300000, 200000, 100000, 1000000, 1333333.33, 1000000],
  ] as const;

  it.each(cases)(
    "%s: tax_due = %d, LC 224 = %s",
    (_id, taxDue, lc, basket, art1, sport, fund, total, art26Sponsor, art26Donation) => {
      const result = run(pj({ tax_due: taxDue, apply_lc224: lc }));
      expect(result.status).toBe("ok");
      expect(result.lc224.applied).toBe(lc);
      expect(limitsSummary(result)).toEqual({
        basket,
        art1,
        sport,
        funds: [fund, fund, fund, fund],
        total,
        art26Sponsor,
        art26Donation,
      });
      // Tetos por mecanismo dentro da cesta: 4% (art. 18, 26 e 1º-A) e 3% (art. 1º).
      expect(row(result, "rouanet_art18").limit.min).toBe(basket);
      expect(row(result, "rouanet_art26_patrocinio").limit.min).toBe(basket);
      expect(row(result, "audiovisual_art1A").limit.min).toBe(basket);
      for (const key of ["fia", "idoso", "pronon", "pronas"] as const) {
        expect(row(result, key).limit.min).toBe(fund);
      }
    },
  );

  it("T-PJ-17: tax_due = 123.456,78; cada limite arredondado e total somado", () => {
    const without = run(pj({ tax_due: 123456.78, apply_lc224: false }));
    expect(limitsSummary(without)).toEqual({
      basket: 4938.27,
      art1: 3703.7,
      sport: 2469.14,
      funds: [1234.57, 1234.57, 1234.57, 1234.57],
      total: 12345.69,
      art26Sponsor: 16460.9,
      art26Donation: 12345.68,
    });
    const withLc = run(pj({ tax_due: 123456.78, apply_lc224: true }));
    expect(limitsSummary(withLc)).toEqual({
      basket: 4444.44,
      art1: 3333.33,
      sport: 2222.22,
      funds: [1111.11, 1111.11, 1111.11, 1111.11],
      total: 11111.1,
      art26Sponsor: 14814.8,
      art26Donation: 11111.1,
    });
    // Os dois cenários vêm juntos no resultado (spec, 5.2, bloco 4).
    expect(without.scenarios?.with_lc224.total.min).toBe(11111.1);
    expect(withLc.scenarios?.without_lc224.total.min).toBe(12345.69);
  });

  it("padrão da LC 224 vem do JSON (aplicar_por_padrao), não do código", () => {
    const fromJson = run(pj({ apply_lc224: undefined }));
    expect(fromJson.lc224.default_from_params).toBe(
      params.regras_gerais.lc_224_2025.aplicar_por_padrao,
    );
    expect(fromJson.lc224.applied).toBe(params.regras_gerais.lc_224_2025.aplicar_por_padrao);
    expect(fromJson.limits?.cultural_basket.min).toBe(
      params.regras_gerais.lc_224_2025.aplicar_por_padrao ? 18000 : 20000,
    );

    const flipped = structuredClone(params);
    flipped.regras_gerais.lc_224_2025.aplicar_por_padrao =
      !params.regras_gerais.lc_224_2025.aplicar_por_padrao;
    const other = run(pj({ apply_lc224: undefined }), loadParams(flipped));
    expect(other.lc224.applied).toBe(!fromJson.lc224.applied);
    expect(other.limits?.cultural_basket.min).toBe(fromJson.lc224.applied ? 20000 : 18000);
    // O interruptor explícito vence o padrão.
    expect(run(pj({ apply_lc224: true }), loadParams(flipped)).limits?.cultural_basket.min).toBe(
      18000,
    );
  });

  it("percentuais da tela vêm do JSON (4% e 3,6% com o fator)", () => {
    const result = run(pj({ apply_lc224: true }));
    const basket = group(result, "cesta_cultural_pj");
    expect(basket.percent).toBe(4);
    expect(basket.effective_percent).toBe(3.6);
    expect(basket.source).toContain("Lei 9.532/1997");
    expect(result.limits?.factor).toBe(params.regras_gerais.lc_224_2025.fator_pj);
  });
});

describe("9.2 Pessoa jurídica: a partir do lucro real", () => {
  const cases = [
    ["T-PJ-06", 3333333.33, "annual", 500000, 309333.33, 20000, 18000],
    ["T-PJ-07", 1000000, "quarterly", 150000, 94000, 6000, 5400],
    ["T-PJ-08", 200000, "annual", 30000, 0, 1200, 1080],
    ["T-PJ-18", 240000, "annual", 36000, 0, 1440, 1296],
  ] as const;

  it.each(cases)(
    "%s: taxable_profit = %d, period = %s",
    (_id, profit, period, irpj, surtax, basket, basketLc) => {
      const result = run(
        pj({ input_mode: "taxable_profit", taxable_profit: profit, period, tax_due: undefined }),
      );
      expect(result.status).toBe("ok");
      expect(result.base?.value).toEqual({ min: irpj, max: irpj });
      expect(result.base?.breakdown).toMatchObject({
        taxable_profit: profit,
        period,
        months: period === "annual" ? 12 : 3,
        irpj_rate: 15,
        irpj,
        surtax_rate: 10,
        surtax_exempt: period === "annual" ? 240000 : 60000,
        surtax,
      });
      expect(result.scenarios?.without_lc224.cultural_basket.min).toBe(basket);
      expect(result.scenarios?.with_lc224.cultural_basket.min).toBe(basketLc);
      expect(result.base?.source).toContain("Lei 9.249/1995");
      if (period === "quarterly") {
        expect(result.deadlines.map((d) => d.key)).toContain("pj_quarterly");
      }
    },
  );
});

describe("9.3 Pessoa jurídica: custo líquido e comparação", () => {
  it("T-PJ-14a: art. 26 patrocínio, A = 66.666,67", () => {
    const result = run(
      pj({ featured_mechanism: "rouanet_art26_patrocinio", desired_contribution: 66666.67 }),
    );
    const c = result.comparison!;
    expect(c.mechanism).toBe("rouanet_art26_patrocinio");
    expect(c.deduction).toBe(20000);
    expect(c.operating_savings).toEqual({ min: 16000, max: 22666.67 });
    expect(c.net_cost).toEqual({ min: 24000, max: 30666.67 });
    expect(c.sponsor.tax_paid.min).toBe(480000);
    expect(c.sponsor.total_outlay).toEqual({ min: 524000, max: 530666.67 });
    expect(c.pay_tax.total_outlay).toEqual({ min: 500000, max: 500000 });
    expect(c.savings_rate).toEqual({ min: 0.24, max: 0.34 });
    expect(c.over_cap).toBe(false);
    expect(c.notes).toContain("operating_expense_range");
    // compareScenario() devolve o mesmo cálculo para a UI.
    const again = compareScenario(result, "rouanet_art26_patrocinio", 66666.67);
    expect(again).toEqual(c);
  });

  it("T-PJ-14b: art. 26 doação, A = 50.000,00", () => {
    const result = run(
      pj({
        featured_mechanism: "rouanet_art26_doacao",
        contribution_type: "doacao",
        desired_contribution: 50000,
      }),
    );
    const c = result.comparison!;
    expect(c.deduction).toBe(20000);
    expect(c.operating_savings).toEqual({ min: 12000, max: 17000 });
    expect(c.net_cost).toEqual({ min: 13000, max: 18000 });
    expect(c.sponsor.tax_paid.min).toBe(480000);
    expect(c.sponsor.total_outlay).toEqual({ min: 513000, max: 518000 });
    expect(c.sponsor.receives).toContain("Sem contrapartida de marca (doação)");
    expect(result.texts).toContain("donation_notice");
  });

  it("T-PJ-15: art. 18, A = 20.000,00 (teto)", () => {
    const result = run(pj({ desired_contribution: 20000 }));
    const c = result.comparison!;
    expect(c.mechanism).toBe("rouanet_art18");
    expect(c.deduction).toBe(20000);
    expect(c.operating_savings).toEqual({ min: 0, max: 0 });
    expect(c.net_cost).toEqual({ min: 0, max: 0 });
    expect(c.sponsor.tax_paid.min).toBe(480000);
    expect(c.sponsor.total_outlay).toEqual({ min: 500000, max: 500000 });
    expect(c.over_cap).toBe(false);
    expect(warningCodes(result)).not.toContain("over_cap");
    // Sem aporte informado, a comparação usa o aporte que atinge o teto.
    expect(run(pj()).comparison).toEqual(c);
  });

  it("T-PJ-16: art. 18, A = 30.000,00 (dedução travada; aviso over_cap)", () => {
    const result = run(pj({ desired_contribution: 30000 }));
    const c = result.comparison!;
    expect(c.deduction).toBe(20000);
    expect(c.net_cost).toEqual({ min: 10000, max: 10000 });
    expect(c.sponsor.tax_paid.min).toBe(480000);
    expect(c.sponsor.total_outlay).toEqual({ min: 510000, max: 510000 });
    expect(c.over_cap).toBe(true);
    const warning = result.warnings.find((w) => w.code === "over_cap");
    expect(warning?.vars?.teto).toBe("R$ 20.000,00");
    expect(result.texts).toContain("over_cap");
    expect(renderText("over_cap", warning!.vars)).toContain("Acima de R$ 20.000,00");
  });

  it("T-PJ-19: art. 1º-A, A = 12.000,00", () => {
    const result = run(
      pj({ featured_mechanism: "audiovisual_art1A", desired_contribution: 12000 }),
    );
    const c = result.comparison!;
    expect(c.deduction).toBe(12000);
    expect(c.net_cost).toEqual({ min: 0, max: 0 });
    expect(c.sponsor.tax_paid.min).toBe(488000);
    expect(c.sponsor.total_outlay).toEqual({ min: 500000, max: 500000 });
    expect(result.interest).toBe("audiovisual");
  });

  it("T-PJ-20: LC 224 sim, art. 18, A = 20.000,00 (teto 18.000; over_cap)", () => {
    const result = run(pj({ apply_lc224: true, desired_contribution: 20000 }));
    const c = result.comparison!;
    expect(c.limit).toBe(18000);
    expect(c.deduction).toBe(18000);
    expect(c.net_cost).toEqual({ min: 2000, max: 2000 });
    expect(c.sponsor.tax_paid.min).toBe(482000);
    expect(c.sponsor.total_outlay).toEqual({ min: 502000, max: 502000 });
    expect(c.over_cap).toBe(true);
    expect(warningCodes(result)).toContain("over_cap");
  });

  it("custo líquido no teto por linha (art. 26 em faixa; art. 18 zero)", () => {
    const result = run(pj());
    expect(row(result, "rouanet_art18").net_cost_at_cap).toEqual({ min: 0, max: 0 });
    expect(row(result, "rouanet_art26_patrocinio").net_cost_at_cap).toEqual({
      min: 24000,
      max: 30666.67,
    });
    expect(row(result, "rouanet_art26_doacao").net_cost_at_cap).toEqual({
      min: 13000,
      max: 18000,
    });
    expect(row(result, "rouanet_art26_patrocinio").deduction_per_real).toBe(0.3);
    expect(row(result, "rouanet_art26_doacao").deduction_per_real).toBe(0.4);
    expect(row(result, "audiovisual_art1").operating_expense).toBe(true);
    expect(row(result, "esporte").shares_cultural_basket).toBe(false);
  });
});

describe("9.4 Pessoa jurídica: faixas e desqualificação", () => {
  it("T-PJ-13: tax_band = 500k_2500k, LC 224 não / sim", () => {
    const without = run(pj({ input_mode: "tax_band", tax_band: "500k_2500k", tax_due: undefined }));
    expect(without.status).toBe("band_only");
    expect(without.limits?.cultural_basket).toEqual({ min: 20000, max: 100000 });
    expect(without.limits?.total).toEqual({ min: 50000, max: 250000 });
    expect(formatRange(without.limits!.cultural_basket)).toBe("entre R$ 20.000,00 e R$ 100.000,00");
    expect(without.comparison).toBeNull();
    expect(without.band).toBe("500k_2500k");
    expect(without.texts).toContain("band_notice");

    const withLc = run(
      pj({ input_mode: "tax_band", tax_band: "500k_2500k", tax_due: undefined, apply_lc224: true }),
    );
    expect(withLc.limits?.cultural_basket).toEqual({ min: 18000, max: 90000 });
    expect(withLc.limits?.total).toEqual({ min: 45000, max: 225000 });
  });

  it("T-PJ-21: tax_band = acima_2500k, sem limite superior", () => {
    const result = run(pj({ input_mode: "tax_band", tax_band: "acima_2500k", tax_due: undefined }));
    expect(result.status).toBe("band_only");
    expect(result.limits?.cultural_basket).toEqual({ min: 100000, max: null });
    expect(result.limits?.total).toEqual({ min: 250000, max: null });
    expect(formatRange(result.limits!.cultural_basket)).toBe("acima de R$ 100.000,00");
    expect(compareScenario(result, "rouanet_art18", 1000)).toBeNull();
  });

  it("T-PJ-22: tax_band = nao_sei mostra a tabela de exemplos", () => {
    const result = run(pj({ input_mode: "tax_band", tax_band: "nao_sei", tax_due: undefined }));
    expect(result.status).toBe("band_only");
    expect(result.limits).toBeNull();
    expect(result.examples).toEqual(params.exemplos.pj);
    expect(result.band).toBe("nao_sei");
    expect(result.texts).toContain("band_examples");
  });

  it("T-PJ-09: lucro presumido, contribuinte de ICMS no RS: desqualificado com módulo LIC-RS", () => {
    const result = run(
      pj({
        regime: "lucro_presumido",
        icms_contributor_rs: "sim",
        icms_prior_year: 500000,
        tax_due: undefined,
      }),
    );
    expect(result.status).toBe("disqualified");
    expect(result.disqualified).toEqual({ reason: "regime" });
    expect(result.limits).toBeNull();
    expect(result.lc224.applied).toBe(false);
    expect(result.lic_rs).toMatchObject({
      status: "ok",
      annual_limit: 100000,
      fac_transfer: 10000,
      total_outlay: 110000,
      icms_credit: 100000,
      net_cost: 10000,
    });
    expect(result.featured_mechanism).toBe("lic_rs");
    expect(result.interest).toBe("lic_rs");
    expect(warningCodes(result)).toContain("lic_rs_unverified");
    expect(result.texts).toEqual(
      expect.arrayContaining([
        "disqualified_regime",
        "disqualified_regime_lic_rs",
        "lic_rs_notice",
      ]),
    );
  });

  it("T-PJ-10: Simples Nacional: desqualificado, sem LIC-RS", () => {
    const result = run(
      pj({
        regime: "simples_nacional",
        icms_contributor_rs: "sim",
        icms_prior_year: 500000,
        tax_due: undefined,
      }),
    );
    expect(result.status).toBe("disqualified");
    expect(result.disqualified?.reason).toBe("regime");
    expect(result.lic_rs).toBeNull();
    expect(result.interest).toBe("rouanet");
    expect(result.texts).toContain("disqualified_regime");
    expect(result.texts).not.toContain("disqualified_regime_lic_rs");
  });

  it("T-PJ-23: lucro arbitrado sem ICMS no RS: desqualificado, sem LIC-RS", () => {
    const result = run(pj({ regime: "lucro_arbitrado", icms_contributor_rs: "nao" }));
    expect(result.status).toBe("disqualified");
    expect(result.lic_rs).toBeNull();
  });

  it("T-PJ-11: tax_due = 0 é no_tax", () => {
    const result = run(pj({ tax_due: 0 }));
    expect(result.status).toBe("no_tax");
    expect(result.limits).toBeNull();
    expect(result.texts).toContain("no_tax");
    expect(
      run(pj({ input_mode: "taxable_profit", taxable_profit: 0, period: "annual" })).status,
    ).toBe("no_tax");
  });

  it("T-PJ-12: tax_due = -1 ou 'abc' é validation_error", () => {
    const negative = parseSimulatorInput(pj({ tax_due: -1 }));
    expect(negative.ok).toBe(false);
    if (!negative.ok) {
      expect(negative.status).toBe("validation_error");
      expect(negative.issues).toEqual([
        { path: "tax_due", message: "O valor não pode ser negativo." },
      ]);
    }
    const text = parseSimulatorInput({ ...pj(), tax_due: "abc" } as unknown as SimulatorRawInput);
    expect(text.ok).toBe(false);
    if (!text.ok) expect(text.issues[0]?.path).toBe("tax_due");
  });

  it("T-PJ-24: regime nao_sei calcula como lucro real com aviso unknown_regime", () => {
    const result = run(pj({ regime: "nao_sei" }));
    const reference = run(pj());
    expect(result.status).toBe("ok");
    expect(result.limits).toEqual(reference.limits);
    expect(warningCodes(result)).toContain("unknown_regime");
    expect(warningCodes(reference)).not.toContain("unknown_regime");
    expect(result.texts).toContain("unknown_regime");
  });

  it("T-PJ-25: taxable_profit sem period é validation_error", () => {
    const parsed = parseSimulatorInput(
      pj({ input_mode: "taxable_profit", taxable_profit: 1000000, tax_due: undefined }),
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.issues.map((i) => i.path)).toContain("period");
  });

  it("combinação inválida entre tipos (PF com regime) é validation_error", () => {
    const parsed = parseSimulatorInput({ ...pf(), regime: "lucro_real" } as SimulatorRawInput);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.issues[0]?.message).toContain("regime");
    const licWithout = parseSimulatorInput(
      pj({ regime: "lucro_presumido", icms_contributor_rs: "nao_sei", tax_due: undefined }),
    );
    expect(licWithout.ok).toBe(false);
    if (!licWithout.ok) expect(licWithout.issues.map((i) => i.path)).toContain("icms_prior_year");
  });

  it("too_large: acima do limite de entrada avisa e segue", () => {
    const result = run(pj({ tax_due: params.regras_gerais.limites_entrada.pj_max + 1 }));
    expect(result.status).toBe("ok");
    expect(warningCodes(result)).toContain("too_large");
  });
});

describe("9.5 Pessoa física", () => {
  const cases = [
    ["T-PF-01", 20000, 1200, 1400, 1200, 1500, 2000, 600, 600],
    ["T-PF-02", 80000, 4800, 5600, 4800, 6000, 8000, 2400, 2400],
    ["T-PF-09", 33333.33, 2000, 2333.33, 2000, 2500, 3333.33, 1000, 1000],
  ] as const;

  it.each(cases)(
    "%s: tax_due = %d",
    (_id, taxDue, basket, basketSport, art18, art26Donation, art26Sponsor, art1, inDeclaration) => {
      const result = run(pf({ tax_due: taxDue }));
      expect(result.status).toBe("ok");
      expect(result.lc224.available).toBe(false);
      expect(result.limits?.cultural_basket.min).toBe(basket);
      expect(result.limits?.total.min).toBe(basket);
      expect(row(result, "rouanet_art18").contribution_for_cap.min).toBe(art18);
      expect(row(result, "audiovisual_art1A").contribution_for_cap.min).toBe(art18);
      expect(row(result, "rouanet_art26_doacao").contribution_for_cap.min).toBe(art26Donation);
      expect(row(result, "rouanet_art26_patrocinio").contribution_for_cap.min).toBe(art26Sponsor);
      expect(row(result, "audiovisual_art1").limit.min).toBe(art1);
      expect(row(result, "fia").in_declaration_limit?.min).toBe(inDeclaration);
      expect(row(result, "idoso").in_declaration_limit?.min).toBe(inDeclaration);
      expect(row(result, "rouanet_art18").in_declaration_limit).toBeNull();
      expect(result.limits?.mechanisms.map((r) => r.key)).not.toContain("esporte");

      const withSport = run(pf({ tax_due: taxDue, includes_sport: true }));
      expect(withSport.limits?.cultural_basket.min).toBe(basketSport);
      expect(row(withSport, "esporte").limit.min).toBe(basketSport);
      expect(group(withSport, "cesta_pf").percent).toBe(7);
    },
  );

  it("T-PF-05: art. 26 doação no teto (A = 1.500,00)", () => {
    const result = run(
      pf({
        featured_mechanism: "rouanet_art26_doacao",
        contribution_type: "doacao",
        desired_contribution: 1500,
      }),
    );
    const c = result.comparison!;
    expect(c.deduction).toBe(1200);
    expect(c.net_cost).toEqual({ min: 300, max: 300 });
    expect(c.operating_savings).toEqual({ min: 0, max: 0 });
    expect(c.sponsor.tax_paid.min).toBe(18800);
    expect(c.sponsor.total_outlay).toEqual({ min: 20300, max: 20300 });
    expect(c.over_cap).toBe(false);
  });

  it("T-PF-10: art. 26 patrocínio no teto (A = 2.000,00)", () => {
    const result = run(
      pf({ featured_mechanism: "rouanet_art26_patrocinio", desired_contribution: 2000 }),
    );
    const c = result.comparison!;
    expect(c.deduction).toBe(1200);
    expect(c.net_cost).toEqual({ min: 800, max: 800 });
    expect(c.sponsor.total_outlay).toEqual({ min: 20800, max: 20800 });
    expect(compareScenario(result, "rouanet_art26_patrocinio", 2000)).toEqual(c);
  });

  it("T-PF-08: art. 18, A = 1.200,00", () => {
    const result = run(pf({ desired_contribution: 1200 }));
    const c = result.comparison!;
    expect(c.mechanism).toBe("rouanet_art18");
    expect(c.deduction).toBe(1200);
    expect(c.net_cost).toEqual({ min: 0, max: 0 });
    expect(c.sponsor.tax_paid.min).toBe(18800);
    expect(c.sponsor.total_outlay).toEqual({ min: 20000, max: 20000 });
  });

  it("T-PF-06: apply_lc224 forçado é ignorado para PF", () => {
    const forced = run(pf({ apply_lc224: true }));
    const reference = run(pf());
    expect(forced.lc224).toEqual({ ...reference.lc224, available: false, applied: false });
    expect(forced.limits).toEqual(reference.limits);
    expect(forced.limits?.factor).toBe(1);
    expect(forced.scenarios).toBeNull();
    expect(forced.texts).not.toContain("lc224_notice");
  });

  it("T-PF-07: tax_band = 20k_80k", () => {
    const result = run(pf({ input_mode: "tax_band", tax_band: "20k_80k", tax_due: undefined }));
    expect(result.status).toBe("band_only");
    expect(result.limits?.cultural_basket).toEqual({ min: 1200, max: 4800 });
    expect(formatRange(result.limits!.cultural_basket)).toBe("entre R$ 1.200,00 e R$ 4.800,00");
    expect(result.comparison).toBeNull();
  });

  it("T-PF-03: declaração simplificada é desqualificada", () => {
    const result = run(pf({ declaration_model: "simplificada" }));
    expect(result.status).toBe("disqualified");
    expect(result.disqualified).toEqual({ reason: "modelo_simplificado" });
    expect(result.limits).toBeNull();
    expect(result.texts).toContain("disqualified_model");
  });

  it("T-PF-04: tax_due = 0 é no_tax", () => {
    const result = run(pf({ tax_due: 0 }));
    expect(result.status).toBe("no_tax");
    expect(result.texts).toContain("no_tax");
  });

  it("T-PF-11: modelo nao_sei calcula como completa com aviso unknown_model", () => {
    const result = run(pf({ declaration_model: "nao_sei" }));
    expect(result.limits).toEqual(run(pf()).limits);
    expect(warningCodes(result)).toContain("unknown_model");
    expect(result.texts).toContain("unknown_model");
  });

  it("prazos e textos da PF", () => {
    const result = run(pf());
    expect(result.deadlines.map((d) => d.key)).toEqual(["pf_deposit"]);
    expect(result.deadlines[0].text).toContain(params.pf.prazo_aporte);
    expect(result.texts).toEqual(
      expect.arrayContaining(["pf_basket", "pf_deadline", "pf_no_8pct", "disclaimer_main"]),
    );
  });
});

describe("9.6 LIC-RS", () => {
  const cases = [
    ["T-LIC-01", 500000, "demais_editais", 100000, 10000, 110000, 100000, 10000],
    ["T-LIC-02", 1000000, "demais_editais", 180000, 18000, 198000, 180000, 18000],
    ["T-LIC-03", 2000000, "demais_editais", 290000, 29000, 319000, 290000, 29000],
    ["T-LIC-04", 5000000, "demais_editais", 460000, 46000, 506000, 460000, 46000],
    ["T-LIC-05", 600000, "demais_editais", 120000, 12000, 132000, 120000, 12000],
    ["T-LIC-06", 600000.01, "demais_editais", 120000, 12000, 132000, 120000, 12000],
    [
      "T-LIC-07",
      500000,
      "edital_patrimonio_e_espacos_publicos",
      100000,
      5000,
      105000,
      100000,
      5000,
    ],
    ["T-LIC-08", 2400000.01, "demais_editais", 330000, 33000, 363000, 330000, 33000],
  ] as const;

  it.each(cases)(
    "%s: icms_prior_year = %d, %s",
    (_id, icms, segment, annualLimit, fac, total, credit, netCost) => {
      const lic = simulateLicRs(icms, segment, null);
      expect(lic.status).toBe("ok");
      expect(lic).toMatchObject({
        annual_limit: annualLimit,
        applied: annualLimit,
        fac_transfer: fac,
        total_outlay: total,
        icms_credit: credit,
        net_cost: netCost,
        over_cap: false,
      });
      expect(lic.comparison.pay_tax).toEqual({
        icms_paid: annualLimit,
        contribution: 0,
        total_outlay: annualLimit,
      });
      expect(lic.comparison.sponsor).toEqual({
        icms_paid: 0,
        contribution: annualLimit,
        fac_transfer: fac,
        icms_credit: credit,
        total_outlay: total,
      });
      // O mesmo módulo dentro de simulate(), para lucro presumido.
      const viaSimulate = run(
        pj({
          regime: "lucro_presumido",
          icms_contributor_rs: "sim",
          icms_prior_year: icms,
          lic_rs_segment: segment,
          tax_due: undefined,
        }),
      ).lic_rs;
      expect(viaSimulate).toEqual(lic);
    },
  );

  it("T-LIC-09: icms_prior_year = 0 é no_tax no módulo", () => {
    const lic = simulateLicRs(0, "demais_editais", null);
    expect(lic.status).toBe("no_tax");
    expect(lic).toMatchObject({
      annual_limit: 0,
      fac_transfer: 0,
      total_outlay: 0,
      icms_credit: 0,
      net_cost: 0,
    });
    expect(lic.notes).toContain("no_icms");
    const result = run(
      pj({
        regime: "lucro_presumido",
        icms_contributor_rs: "sim",
        icms_prior_year: 0,
        tax_due: undefined,
      }),
    );
    expect(result.status).toBe("disqualified");
    expect(result.lic_rs?.status).toBe("no_tax");
    expect(result.texts).toContain("no_icms");
  });

  it("aporte acima do limite anual: crédito travado e over_cap", () => {
    const lic = simulateLicRs(500000, "demais_editais", 150000);
    expect(lic.over_cap).toBe(true);
    expect(lic.icms_credit).toBe(100000);
    expect(lic.fac_transfer).toBe(15000);
    expect(lic.net_cost).toBe(65000);
    expect(lic.notes).toContain("over_cap");
  });

  it("status verificar do JSON vira aviso lic_rs_unverified", () => {
    const result = run(
      pj({
        regime: "lucro_presumido",
        icms_contributor_rs: "nao_sei",
        icms_prior_year: 500000,
        tax_due: undefined,
      }),
    );
    expect(result.lic_rs?.param_status).toBe(params.mecanismos.lic_rs.limite_por_faixa_status);
    const flagged = warningCodes(result).includes("lic_rs_unverified");
    expect(flagged).toBe(
      params.mecanismos.lic_rs.limite_por_faixa_status === "verificar" ||
        params.mecanismos.lic_rs.status === "verificar",
    );
  });
});

describe("9.7 Arredondamento e formatação", () => {
  it("T-FMT-01: 'R$ 1.234.567,89' normaliza para 1234567.89", () => {
    expect(parseCurrencyBR("R$ 1.234.567,89")).toBe(1234567.89);
  });

  it("T-FMT-02: '1234567.89' normaliza para 1234567.89", () => {
    expect(parseCurrencyBR("1234567.89")).toBe(1234567.89);
  });

  it("T-FMT-03: '1.234' é 1234.00 (ponto como milhar sem vírgula)", () => {
    expect(parseCurrencyBR("1.234")).toBe(1234);
    expect(parseCurrencyBR("1.234.567")).toBe(1234567);
    expect(parseCurrencyBR("abc")).toBeNull();
    expect(parseCurrencyBR("")).toBeNull();
    expect(parseCurrencyBR("-10,00")).toBe(-10);
  });

  it("T-FMT-04: 20.000 / 0,30 arredonda para 66.666,67", () => {
    expect(round2(20000 / 0.3)).toBe(66666.67);
  });

  it("T-FMT-05: 2.000,005 arredonda para 2.000,01 (meio para cima)", () => {
    expect(round2(2000.005)).toBe(2000.01);
    expect(round2(12345.675)).toBe(12345.68);
    expect(round2(1.005)).toBe(1.01);
  });

  it("T-FMT-06: 66666.67 em tela é 'R$ 66.666,67'", () => {
    expect(formatBRL(66666.67)).toBe("R$ 66.666,67");
    expect(formatRange({ min: 100, max: 100 })).toBe("R$ 100,00");
  });
});

describe("9.8 Esquema do JSON", () => {
  it("T-SCH-01: cesta cultural PJ é 4% e inclui os mecanismos culturais", () => {
    const cesta = params.regras_gerais.grupos_de_limite_compartilhado.cesta_cultural_pj;
    expect(cesta.limite_percentual).toBe(4);
    expect(cesta.membros).toEqual(
      expect.arrayContaining([
        "rouanet_art18",
        "rouanet_art26_patrocinio",
        "rouanet_art26_doacao",
        "audiovisual_art1",
        "audiovisual_art1A",
      ]),
    );
  });

  it("T-SCH-02: cesta PF é 6% e 7% com esporte", () => {
    expect(params.pf.limite_percentual_cesta).toBe(6);
    expect(params.pf.limite_percentual_cesta_com_esporte).toBe(7);
  });

  it("T-SCH-03: fator da LC 224 entre 0 e 1 e não se aplica a PF", () => {
    const lc = params.regras_gerais.lc_224_2025;
    expect(lc.fator_pj).toBeGreaterThan(0);
    expect(lc.fator_pj).toBeLessThanOrEqual(1);
    expect(lc.aplica_a_pf).toBe(false);
  });

  it("T-SCH-04: todo mecanismo usado pelo simulador tem fonte e status", () => {
    for (const key of SIMULATOR_MECHANISMS) {
      const m = params.mecanismos[key];
      expect(m.fonte, key).toBeTruthy();
      expect(["verificado", "verificar"], key).toContain(m.status);
    }
    expect(params.regras_gerais.pj_apuracao.fonte).toContain("Lei 9.249/1995");
    expect(params.regras_gerais.pj_apuracao.aliquota_csll_fonte).toContain("Lei 7.689/1988");
  });

  it("T-SCH-05: atualizado_em é uma data válida; aviso (não falha) se tiver mais de 180 dias", () => {
    expect(Number.isNaN(Date.parse(params.atualizado_em))).toBe(false);
    const age = paramsAgeInDays();
    expect(age).toBeGreaterThanOrEqual(0);
    if (age > 180) {
      console.warn(`[T-SCH-05] parametros-simulador.json tem ${age} dias; revisar as fontes.`);
    }
    // O simulador emite params_stale quando a data de referência passa de 180 dias.
    const stale = simulate(parse(pj()), params, { now: new Date("2027-06-01T00:00:00Z") });
    expect(warningCodes(stale)).toContain("params_stale");
    expect(warningCodes(run(pj()))).not.toContain("params_stale");
  });

  it("T-SCH-06: faixas da LIC-RS são contínuas (tolerância de R$ 0,01)", () => {
    const bands = params.mecanismos.lic_rs.limite_por_faixa_icms_ano_anterior;
    for (let i = 0; i < bands.length - 1; i += 1) {
      const end = bands[i].ate!;
      const atEnd = (end * bands[i].percentual) / 100 + bands[i].acrescimo;
      const next = bands[i + 1];
      const atNextStart = ((next.de ?? end) * next.percentual) / 100 + next.acrescimo;
      expect(Math.abs(atEnd - atNextStart)).toBeLessThanOrEqual(0.01);
    }
    expect(bands.at(-1)!.ate).toBeNull();
    for (const ex of params.exemplos.lic_rs) {
      expect(licRsAnnualLimit(ex.icms_proprio_ano_anterior)).toBe(ex.limite_anual_compensacao);
    }
  });

  it("T-SCH-07: contrato de chaves (schema Zod rejeita caminho ausente ou com tipo errado)", () => {
    expect(() => loadParams()).not.toThrow();
    const broken = structuredClone(params) as Record<string, unknown>;
    (broken.regras_gerais as Record<string, unknown>).lc_224_2025 = { fator_pj: "0.9" };
    expect(() => loadParams(broken)).toThrow();
    const missing = structuredClone(params) as Record<string, unknown>;
    delete (missing.pf as Record<string, unknown>).limite_percentual_cesta;
    expect(() => loadParams(missing)).toThrow();
    const noApuracao = structuredClone(params) as Record<string, unknown>;
    delete (noApuracao.regras_gerais as Record<string, unknown>).pj_apuracao;
    expect(() => loadParams(noApuracao)).toThrow();
    expect(params.regras_gerais.pj_apuracao).toMatchObject({
      aliquota_irpj: 15,
      aliquota_adicional: 10,
      parcela_isenta_adicional_mensal: 20000,
      aliquota_csll: 9,
    });
    expect(params.regras_gerais.limites_entrada).toEqual({
      ...params.regras_gerais.limites_entrada,
      pj_max: 1000000000,
      pf_max: 100000000,
    });
    expect(params.captacao.rouanet.remuneracao_captacao_percentual_max).toBe(10);
  });

  it("T-SCH-08: enum lic_rs_segment do formulário igual às chaves de repasse_adicional_fac_percentual", () => {
    const fromJson = Object.keys(params.mecanismos.lic_rs.repasse_adicional_fac_percentual).sort();
    expect([...LIC_RS_SEGMENTS].sort()).toEqual(fromJson);
    for (const segment of fromJson) {
      const parsed = pjSimulatorInputSchema.safeParse({
        ...pj({ regime: "lucro_presumido", icms_contributor_rs: "sim", icms_prior_year: 1 }),
        lic_rs_segment: segment,
      });
      expect(parsed.success, segment).toBe(true);
    }
    expect(
      pjSimulatorInputSchema.safeParse({ ...pj(), lic_rs_segment: "outro_edital" }).success,
    ).toBe(false);
  });
});

describe("faixas para o CRM e textos", () => {
  it("bandFor devolve o código de faixa do CRM a partir do valor", () => {
    expect(bandFor("pj", 50000)).toBe("ate_100k");
    expect(bandFor("pj", 100000)).toBe("ate_100k");
    expect(bandFor("pj", 100000.01)).toBe("100k_500k");
    expect(bandFor("pj", 500000)).toBe("100k_500k");
    expect(bandFor("pj", 2500000.01)).toBe("acima_2500k");
    expect(bandFor("pj", 0)).toBe("nao_sei");
    expect(bandFor("pj", null)).toBe("nao_sei");
    expect(bandFor("pf", 20000)).toBe("ate_20k");
    expect(bandFor("pf", 50000)).toBe("20k_80k");
    expect(bandFor("pf", 80000.01)).toBe("acima_80k");
    expect(run(pj({ tax_due: 500000 })).band).toBe("100k_500k");
    expect(run(pf({ tax_due: 20000 })).band).toBe("ate_20k");
  });

  it("textos da seção 7 existem com revisado_em e textsFor ordena disclaimer e fontes", () => {
    for (const key of TEXT_KEYS) {
      expect(SIMULATOR_TEXTS[key].text.length, key).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(SIMULATOR_TEXTS[key].revisado_em)), key).toBe(false);
    }
    const result = run(pj({ apply_lc224: true }));
    const keys = textsFor(result);
    expect(keys).toEqual(result.texts);
    expect(keys[0]).toBe("disclaimer_main");
    expect(keys.at(-1)).toBe("sources_footer");
    expect(keys).toEqual(
      expect.arrayContaining(["base_pj", "basket_pj", "lc224_notice", "art26_notice"]),
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(renderText("disclaimer_main", { atualizado_em: "03/10/2026" })).toContain("03/10/2026");
    expect(result.sources.map((s) => s.key)).toEqual(
      expect.arrayContaining(["lei_8313_1991", "lei_9249_1995_art3", "documento_de_referencia"]),
    );
    expect(result.parameters_version).toBe(params.atualizado_em);
  });
});
