// Função pura do simulador (simulador-spec.md, seção 4; arredondamento da seção 9.1). Nenhum
// percentual literal: tudo vem de `params` (parametros-simulador.json). Sem Next, sem banco.
import { type MoneyRange, round2, formatBRL } from "./format";
import {
  LIC_RS_SEGMENTS,
  SIMULATOR_MECHANISM_KEYS,
  licRsRequested,
  type ContributionType,
  type LicRsSegment,
  type PfSimulatorInput,
  type PfTaxBand,
  type PjSimulatorInput,
  type PjTaxBand,
  type SimulatorInput,
  type SimulatorMechanismKey,
  type TaxpayerType,
} from "./input";
import {
  licRsAnnualLimit,
  params as defaultParams,
  paramsAgeInDays,
  type MechanismParam,
  type SimulatorParams,
} from "./params";
import { renderText, textsFor } from "./texts";
import type {
  CalculationBase,
  Comparison,
  Deadline,
  GroupLimit,
  Lc224Info,
  LicRsModule,
  LimitsBlock,
  MechanismRow,
  ParamStatus,
  SimulatorResult,
  SimulatorWarning,
  TextKey,
} from "./types";

export type SimulateOptions = {
  // Data de referência para o aviso `params_stale` (padrão: agora). Passe uma data fixa em testes.
  now?: Date;
};

export const PARAMS_STALE_DAYS = 180;

type Rates = { min: number; max: number }; // t_min e t_max como fração (0,24 e 0,34)

// Rótulos de tela (não são números legais; os números vêm do JSON).
export const MECHANISM_LABELS: Record<SimulatorMechanismKey, string> = {
  rouanet_art18: "Rouanet art. 18",
  rouanet_art26_patrocinio: "Rouanet art. 26, patrocínio",
  rouanet_art26_doacao: "Rouanet art. 26, doação",
  audiovisual_art1A: "Audiovisual art. 1º-A",
  audiovisual_art1: "Audiovisual art. 1º (referência)",
  esporte: "Esporte",
  fia: "Fundo da Criança e do Adolescente (FIA)",
  idoso: "Fundo do Idoso",
  pronon: "Pronon",
  pronas: "Pronas/PCD",
  lic_rs: "LIC-RS (ICMS)",
};

const GROUP_LABELS: Record<string, string> = {
  cesta_cultural_pj: "Cesta cultural (Rouanet, Audiovisual e esporte de inclusão social)",
  esporte_pj: "Esporte",
  fia_pj: "Fundo da Criança e do Adolescente (FIA)",
  idoso_pj: "Fundo do Idoso",
  pronon_pj: "Pronon",
  pronas_pj: "Pronas/PCD",
  cesta_pf: "Cesta da pessoa física (cultura, audiovisual, FIA, Idoso e esporte)",
};

// Grupos de limite da PJ (sufixo `_pj` em regras_gerais.grupos_de_limite_compartilhado; spec, 4.3).
const PJ_GROUP_KEYS = [
  "cesta_cultural_pj",
  "esporte_pj",
  "fia_pj",
  "idoso_pj",
  "pronon_pj",
  "pronas_pj",
] as const;

// Linhas da tabela por tipo (spec, 5.2). Esporte entra na PF só com `includes_sport`.
const PJ_ROWS: SimulatorMechanismKey[] = [
  "rouanet_art18",
  "rouanet_art26_patrocinio",
  "rouanet_art26_doacao",
  "audiovisual_art1A",
  "audiovisual_art1",
  "esporte",
  "fia",
  "idoso",
  "pronon",
  "pronas",
];
const PF_ROWS: SimulatorMechanismKey[] = [
  "rouanet_art18",
  "rouanet_art26_patrocinio",
  "rouanet_art26_doacao",
  "audiovisual_art1A",
  "audiovisual_art1",
  "fia",
  "idoso",
  "esporte",
];

// mechanisms_of_interest (spec, 3.1) para as linhas em destaque.
const PJ_INTEREST_ROWS: Record<string, SimulatorMechanismKey[]> = {
  cesta_cultural: [
    "rouanet_art18",
    "rouanet_art26_patrocinio",
    "rouanet_art26_doacao",
    "audiovisual_art1A",
    "audiovisual_art1",
  ],
  esporte: ["esporte"],
  fundos: ["fia", "idoso"],
  saude: ["pronon", "pronas"],
  lic_rs: ["lic_rs"],
};
const PF_INTEREST_ROWS: Record<string, SimulatorMechanismKey[]> = {
  cultura: ["rouanet_art18", "rouanet_art26_patrocinio", "rouanet_art26_doacao"],
  audiovisual: ["audiovisual_art1A", "audiovisual_art1"],
  fundos: ["fia", "idoso"],
  esporte: ["esporte"],
};

const ROW_NOTES: Partial<Record<SimulatorMechanismKey, TextKey[]>> = {
  rouanet_art26_patrocinio: ["art26_notice"],
  rouanet_art26_doacao: ["art26_notice", "donation_notice"],
  audiovisual_art1A: ["art1a_notice"],
  audiovisual_art1: ["art1_notice"],
};

// Chaves de P.fontes relevantes por mecanismo (sources_footer); filtradas pelo que existe no JSON.
const SOURCE_KEYS: Record<SimulatorMechanismKey, string[]> = {
  rouanet_art18: ["lei_8313_1991", "lei_9532_1997", "sc_cosit_4_2026"],
  rouanet_art26_patrocinio: ["lei_8313_1991", "lei_9532_1997"],
  rouanet_art26_doacao: ["lei_8313_1991", "lei_9532_1997"],
  audiovisual_art1A: ["lei_8685_1993", "lei_15132_2025", "sc_cosit_4_2026"],
  audiovisual_art1: ["lei_8685_1993", "lei_9323_1996", "lei_15132_2025"],
  esporte: ["lei_11438_2006", "lei_14439_2022"],
  fia: ["eca_art260"],
  idoso: ["lei_12213_2010_lei_13797_2019"],
  pronon: ["lei_12715_2012_lei_14564_2023_lei_15513_2026"],
  pronas: ["lei_12715_2012_lei_14564_2023_lei_15513_2026"],
  lic_rs: ["lic_rs_lei_13490_2010", "lic_rs_decreto_57531_2024", "lic_rs_pagina_oficial"],
};
const PJ_BASE_SOURCES = ["lei_9249_1995_art3", "lc_224_2025_receita_perguntas_respostas_v5"];
const PF_BASE_SOURCES = [
  "lei_9250_1995_art12",
  "receita_perguntas_respostas_irpf_2026_pergunta_455",
];

// ---------- utilitários ----------

const point = (v: number): MoneyRange => ({ min: v, max: v });

function mapRange(range: MoneyRange, fn: (v: number) => number): MoneyRange {
  return { min: fn(range.min), max: range.max === null ? null : fn(range.max) };
}

function minRange(a: MoneyRange, b: MoneyRange): MoneyRange {
  return {
    min: Math.min(a.min, b.min),
    max: a.max === null ? b.max : b.max === null ? a.max : Math.min(a.max, b.max),
  };
}

function sumRanges(ranges: MoneyRange[]): MoneyRange {
  let min = 0;
  let max: number | null = 0;
  for (const r of ranges) {
    min = round2(min + r.min);
    max = max === null || r.max === null ? null : round2(max + r.max);
  }
  return { min, max };
}

// Percentual efetivo após o fator (4 x 0,9 = 3,6), com quatro casas.
function effectivePercent(points: number, factor: number): number {
  return Number((points * factor).toFixed(4));
}

function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function bandTable(taxpayerType: TaxpayerType, p: SimulatorParams) {
  return taxpayerType === "pj" ? p.regras_gerais.faixas_irpj.faixas : p.pf.faixas_ir_devido.faixas;
}

// Código de faixa (irpj_faixa ou ir_devido_faixa) para um imposto devido; `nao_sei` sem valor.
export function bandFor(
  taxpayerType: TaxpayerType,
  value: number | null | undefined,
  p: SimulatorParams = defaultParams,
): PjTaxBand | PfTaxBand {
  if (value == null || !Number.isFinite(value) || value <= 0) return "nao_sei";
  for (const band of bandTable(taxpayerType, p)) {
    if (band.max === null || value <= band.max) return band.codigo as PjTaxBand | PfTaxBand;
  }
  return "nao_sei";
}

export function bandRange(
  taxpayerType: TaxpayerType,
  code: string,
  p: SimulatorParams = defaultParams,
): MoneyRange | null {
  const band = bandTable(taxpayerType, p).find((b) => b.codigo === code);
  return band ? { min: band.min, max: band.max } : null;
}

// Faixa de economia como despesa operacional (spec, 4.5): t_min = IRPJ + CSLL; t_max soma o adicional.
export function operatingSavingsRates(p: SimulatorParams = defaultParams): Rates {
  const a = p.regras_gerais.pj_apuracao;
  return {
    min: (a.aliquota_irpj + a.aliquota_csll) / 100,
    max: (a.aliquota_irpj + a.aliquota_adicional + a.aliquota_csll) / 100,
  };
}

function deductiblePercentPj(m: MechanismParam, contributionType: ContributionType): number | null {
  const table = m.percentual_dedutivel;
  const value = table.pj ?? table[`pj_${contributionType}`];
  return typeof value === "number" ? value : null;
}

function mechanismParam(key: SimulatorMechanismKey, p: SimulatorParams): MechanismParam {
  return p.mecanismos[key];
}

// ---------- limites ----------

type RowSpec = {
  key: SimulatorMechanismKey;
  group: string;
  percent: number;
  deductiblePercent: number;
  operatingExpense: boolean;
  inDeclarationPercent: number | null;
};

function netCostAtCap(
  limit: number,
  deductiblePercent: number,
  operatingExpense: boolean,
  rates: Rates,
): { min: number; max: number } {
  const cap = round2(limit / (deductiblePercent / 100));
  if (!operatingExpense) {
    const cost = round2(cap - limit);
    return { min: cost, max: cost };
  }
  return { min: round2(cap - limit - cap * rates.max), max: round2(cap - limit - cap * rates.min) };
}

function buildRow(
  spec: RowSpec,
  base: MoneyRange,
  factor: number,
  groupLimit: MoneyRange,
  rates: Rates,
  highlighted: boolean,
  p: SimulatorParams,
): MechanismRow {
  const m = mechanismParam(spec.key, p);
  const inDeclaration = spec.inDeclarationPercent;
  const own = mapRange(base, (b) => round2((b * spec.percent * factor) / 100));
  const limit = minRange(own, groupLimit);
  const d = spec.deductiblePercent;
  const contributionForCap = mapRange(limit, (l) => round2(l / (d / 100)));
  const costLo = netCostAtCap(limit.min, d, spec.operatingExpense, rates);
  const costHi =
    limit.max === null ? null : netCostAtCap(limit.max, d, spec.operatingExpense, rates);
  const netCost: MoneyRange =
    costHi === null
      ? { min: costLo.min, max: costLo.min === costLo.max && costLo.min === 0 ? 0 : null }
      : { min: Math.min(costLo.min, costHi.min), max: Math.max(costLo.max, costHi.max) };
  return {
    key: spec.key,
    name: MECHANISM_LABELS[spec.key],
    legal_basis: m.fonte,
    status: m.status,
    highlighted,
    group: spec.group,
    shares_cultural_basket: spec.group === "cesta_cultural_pj" || spec.group === "cesta_pf",
    percent: spec.percent,
    effective_percent: effectivePercent(spec.percent, factor),
    limit,
    deductible_percent: d,
    deduction_per_real: round2(d / 100),
    contribution_for_cap: contributionForCap,
    net_cost_at_cap: netCost,
    operating_expense: spec.operatingExpense,
    in_declaration_limit:
      inDeclaration === null ? null : mapRange(base, (b) => round2((b * inDeclaration) / 100)),
    notes: ROW_NOTES[spec.key] ?? [],
  };
}

function highlightedKeys(input: SimulatorInput): Set<SimulatorMechanismKey> | null {
  const interests = input.mechanisms_of_interest;
  if (!interests || interests.length === 0) return null;
  const table = input.taxpayer_type === "pj" ? PJ_INTEREST_ROWS : PF_INTEREST_ROWS;
  const keys = new Set<SimulatorMechanismKey>();
  for (const i of interests) for (const k of table[i] ?? []) keys.add(k);
  return keys;
}

// Limites da PJ (spec, 4.3): cada grupo `_pj` e cada mecanismo elegível, com o fator da LC 224.
function pjLimits(
  base: MoneyRange,
  factor: number,
  input: PjSimulatorInput,
  p: SimulatorParams,
): LimitsBlock {
  const rates = operatingSavingsRates(p);
  const contributionType = input.contribution_type ?? "patrocinio";
  const groups: GroupLimit[] = [];
  const groupLimits = new Map<string, MoneyRange>();
  for (const key of PJ_GROUP_KEYS) {
    const g = p.regras_gerais.grupos_de_limite_compartilhado[key];
    const limit = mapRange(base, (b) => round2((b * g.limite_percentual * factor) / 100));
    groupLimits.set(key, limit);
    groups.push({
      key,
      label: GROUP_LABELS[key] ?? key,
      percent: g.limite_percentual,
      effective_percent: effectivePercent(g.limite_percentual, factor),
      limit,
      members: g.membros,
      source: g.fonte,
      status: g.status,
    });
  }
  const highlight = highlightedKeys(input);
  const mechanisms: MechanismRow[] = [];
  for (const key of PJ_ROWS) {
    const m = mechanismParam(key, p);
    if (!m.quem_pode.includes("pj_lucro_real") || typeof m.limite_percentual !== "number") continue;
    const d = deductiblePercentPj(m, contributionType);
    const group = m.grupo_de_limite_compartilhado;
    if (d === null || !group || !groupLimits.has(group)) continue;
    mechanisms.push(
      buildRow(
        {
          key,
          group,
          percent: m.limite_percentual,
          deductiblePercent: d,
          operatingExpense: m.trata_como_despesa_operacional === true,
          inDeclarationPercent: null,
        },
        base,
        factor,
        groupLimits.get(group)!,
        rates,
        highlight === null || highlight.has(key),
        p,
      ),
    );
  }
  const basket = groupLimits.get("cesta_cultural_pj") ?? point(0);
  return {
    factor,
    groups,
    mechanisms,
    cultural_basket: basket,
    total: sumRanges(groups.map((g) => g.limit)),
  };
}

// Limites da PF (spec, 4.6): cesta de 6% (7% com esporte), fator 1, sem despesa operacional.
function pfLimits(
  base: MoneyRange,
  factor: number,
  input: PfSimulatorInput,
  p: SimulatorParams,
): LimitsBlock {
  const includesSport = input.includes_sport === true;
  const basketPercent = includesSport
    ? p.pf.limite_percentual_cesta_com_esporte
    : p.pf.limite_percentual_cesta;
  const basket = mapRange(base, (b) => round2((b * basketPercent * factor) / 100));
  const cestaPf = p.regras_gerais.grupos_de_limite_compartilhado.cesta_pf;
  const groups: GroupLimit[] = [
    {
      key: "cesta_pf",
      label: GROUP_LABELS.cesta_pf,
      percent: basketPercent,
      effective_percent: effectivePercent(basketPercent, factor),
      limit: basket,
      members: cestaPf.membros,
      source: cestaPf.fonte,
      status: cestaPf.status,
    },
  ];
  const rates: Rates = { min: 0, max: 0 };
  const highlight = highlightedKeys(input);
  const mechanisms: MechanismRow[] = [];
  for (const key of PF_ROWS) {
    if (key === "esporte" && !includesSport) continue;
    const m = mechanismParam(key, p);
    if (!m.quem_pode.includes("pf_declaracao_completa")) continue;
    const d = p.pf.percentual_dedutivel[key];
    if (typeof d !== "number") continue;
    const percent =
      key === "audiovisual_art1" ? p.pf.limite_individual_audiovisual_art1 : basketPercent;
    const inDeclaration = p.pf.doacao_na_declaracao[key];
    mechanisms.push(
      buildRow(
        {
          key,
          group: "cesta_pf",
          percent,
          deductiblePercent: d,
          operatingExpense: false,
          inDeclarationPercent:
            typeof inDeclaration === "number" && inDeclaration > 0 ? inDeclaration : null,
        },
        base,
        factor,
        basket,
        rates,
        highlight === null || highlight.has(key),
        p,
      ),
    );
  }
  return { factor, groups, mechanisms, cultural_basket: basket, total: basket };
}

// ---------- comparação (spec, 4.8) ----------

function buildComparison(
  base: number,
  row: MechanismRow,
  amount: number,
  rates: Rates,
  contributionType: ContributionType,
): Comparison {
  const limit = row.limit.min;
  const d = row.deductible_percent / 100;
  const cap = round2(limit / d);
  const deduction = round2(Math.min(amount * d, limit));
  const operating = row.operating_expense;
  const savings: MoneyRange = operating
    ? { min: round2(amount * rates.min), max: round2(amount * rates.max) }
    : point(0);
  const netCost: MoneyRange = operating
    ? {
        min: round2(amount - deduction - amount * rates.max),
        max: round2(amount - deduction - amount * rates.min),
      }
    : point(round2(amount - deduction));
  const taxB = round2(base - deduction);
  const outlayB: MoneyRange = operating
    ? {
        min: round2(base - deduction + amount - amount * rates.max),
        max: round2(base - deduction + amount - amount * rates.min),
      }
    : point(round2(base - deduction + amount));
  const overCap = amount > cap;
  const receives: string[] = ["Recibo de mecenato"];
  if (row.key === "audiovisual_art1") {
    receives.push("Cotas de comercialização da obra, com participação nas receitas");
  } else if (row.key === "rouanet_art26_doacao" || contributionType === "doacao") {
    receives.push("Sem contrapartida de marca (doação)");
  } else {
    receives.push("Contrapartidas de marca (patrocínio)");
  }
  receives.push("Projeto na região");
  const notes: TextKey[] = [...row.notes];
  if (operating) notes.push("operating_expense_range");
  if (overCap) notes.push("over_cap");
  return {
    mechanism: row.key,
    mechanism_name: row.name,
    amount,
    cap,
    limit,
    deduction,
    deductible_percent: row.deductible_percent,
    operating_savings: savings,
    savings_rate: operating ? rates : { min: 0, max: 0 },
    net_cost: netCost,
    over_cap: overCap,
    pay_tax: {
      tax_paid: point(base),
      contribution: 0,
      operating_savings: point(0),
      total_outlay: point(base),
      receives: ["Nada específico"],
    },
    sponsor: {
      tax_paid: point(taxB),
      contribution: amount,
      operating_savings: savings,
      total_outlay: outlayB,
      receives,
    },
    notes,
  };
}

// Recalcula a comparação quando o visitante troca a aba ou edita o aporte. Null quando o
// resultado não tem base exata (faixa, desqualificado, sem imposto) ou o mecanismo não tem linha.
// Para a LIC-RS use simulateLicRs() com o novo aporte.
export function compareScenario(
  result: SimulatorResult,
  mechanism: SimulatorMechanismKey,
  amount: number | null | undefined,
  p: SimulatorParams = defaultParams,
): Comparison | null {
  if (!result.base?.exact || !result.limits) return null;
  const row = result.limits.mechanisms.find((r) => r.key === mechanism);
  if (!row) return null;
  const rates = result.taxpayer_type === "pj" ? operatingSavingsRates(p) : { min: 0, max: 0 };
  const a = amount != null && amount > 0 ? round2(amount) : row.contribution_for_cap.min;
  return buildComparison(result.base.value.min, row, a, rates, result.contribution_type);
}

// ---------- LIC-RS (spec, 4.7) ----------

export function simulateLicRs(
  icmsPriorYear: number,
  segment: LicRsSegment | null | undefined,
  applied: number | null | undefined,
  p: SimulatorParams = defaultParams,
): LicRsModule {
  const lic = p.mecanismos.lic_rs;
  const seg: LicRsSegment = segment ?? LIC_RS_SEGMENTS[0];
  const facPercent = lic.repasse_adicional_fac_percentual[seg] ?? 0;
  const icms = round2(Math.max(0, icmsPriorYear));
  const annualLimit = licRsAnnualLimit(icms, p);
  const band =
    icms > 0
      ? (lic.limite_por_faixa_icms_ano_anterior.find((b) => b.ate === null || icms <= b.ate) ??
        null)
      : null;
  const notes: TextKey[] = ["lic_rs_notice"];
  if (annualLimit <= 0) {
    return {
      status: "no_tax",
      param_status: lic.limite_por_faixa_status,
      segment: seg,
      icms_prior_year: icms,
      band: null,
      annual_limit: 0,
      applied: 0,
      fac_percent: facPercent,
      fac_transfer: 0,
      icms_credit: 0,
      total_outlay: 0,
      net_cost: 0,
      over_cap: false,
      comparison: {
        applied: 0,
        pay_tax: { icms_paid: 0, contribution: 0, total_outlay: 0 },
        sponsor: {
          icms_paid: 0,
          contribution: 0,
          fac_transfer: 0,
          icms_credit: 0,
          total_outlay: 0,
        },
      },
      legal_basis: lic.fonte,
      notes: [...notes, "no_icms"],
    };
  }
  const a = applied != null && applied > 0 ? round2(applied) : annualLimit;
  const credit = round2(Math.min(a, annualLimit));
  const fac = round2((a * facPercent) / 100);
  const overCap = a > annualLimit;
  const total = round2(a + fac);
  const netCost = round2(fac + (a - credit));
  if (overCap) notes.push("over_cap");
  return {
    status: "ok",
    param_status: lic.limite_por_faixa_status,
    segment: seg,
    icms_prior_year: icms,
    band: band
      ? { percent: band.percentual, increment: band.acrescimo, from: band.de ?? null, to: band.ate }
      : null,
    annual_limit: annualLimit,
    applied: a,
    fac_percent: facPercent,
    fac_transfer: fac,
    icms_credit: credit,
    total_outlay: total,
    net_cost: netCost,
    over_cap: overCap,
    comparison: {
      applied: a,
      pay_tax: { icms_paid: a, contribution: 0, total_outlay: a },
      sponsor: {
        icms_paid: round2(a - credit),
        contribution: a,
        fac_transfer: fac,
        icms_credit: credit,
        total_outlay: round2(total + (a - credit)),
      },
    },
    legal_basis: lic.fonte,
    notes,
  };
}

// ---------- montagem do resultado ----------

function lc224Info(
  taxpayerType: TaxpayerType,
  apply: boolean | null | undefined,
  p: SimulatorParams,
): Lc224Info {
  const lc = p.regras_gerais.lc_224_2025;
  // PJ: interruptor disponível; PF: só se o JSON disser que a LC alcança PF (hoje não).
  const available = taxpayerType === "pj" ? true : lc.aplica_a_pf && p.pf.lc_224_aplica;
  return {
    available,
    applied: available ? (apply ?? lc.aplicar_por_padrao) : false,
    default_from_params: lc.aplicar_por_padrao,
    factor: lc.fator_pj,
    status: lc.status,
  };
}

function sourcesFor(
  taxpayerType: TaxpayerType,
  keys: SimulatorMechanismKey[],
  p: SimulatorParams,
): Array<{ key: string; url: string }> {
  const wanted = new Set<string>(taxpayerType === "pj" ? PJ_BASE_SOURCES : PF_BASE_SOURCES);
  for (const k of keys) for (const s of SOURCE_KEYS[k]) wanted.add(s);
  wanted.add("documento_de_referencia");
  return Object.entries(p.fontes)
    .filter(([key]) => wanted.has(key))
    .map(([key, url]) => ({ key, url }));
}

function pickFeatured(
  input: SimulatorInput,
  limits: LimitsBlock | null,
  lic: LicRsModule | null,
): SimulatorMechanismKey {
  if (lic && !limits) return "lic_rs";
  const available = new Set(limits?.mechanisms.map((r) => r.key) ?? []);
  const requested = input.featured_mechanism;
  if (requested && (available.has(requested) || (requested === "lic_rs" && lic))) return requested;
  if (
    input.taxpayer_type === "pf" &&
    (input.mechanisms_of_interest ?? []).includes("audiovisual")
  ) {
    return "audiovisual_art1A";
  }
  return "rouanet_art18";
}

function statusWarnings(
  warnings: SimulatorWarning[],
  lc224: Lc224Info,
  hasLimits: boolean,
  lic: LicRsModule | null,
  taxpayerType: TaxpayerType,
  p: SimulatorParams,
) {
  if (hasLimits && taxpayerType === "pj") {
    if (lc224.available && lc224.status === "verificar") {
      warnings.push({ code: "lc224_unverified", text_key: "lc224_notice" });
    }
    if (p.regras_gerais.pj_apuracao.aliquota_csll_status === "verificar") {
      warnings.push({ code: "csll_unverified", text_key: "operating_expense_range" });
    }
  }
  if (lic && (lic.param_status === "verificar" || p.mecanismos.lic_rs.status === "verificar")) {
    warnings.push({ code: "lic_rs_unverified", text_key: "lic_rs_notice" });
  }
}

function finish(
  partial: Omit<SimulatorResult, "texts" | "sources" | "interest">,
  rowKeys: SimulatorMechanismKey[],
  p: SimulatorParams,
): SimulatorResult {
  const interest: SimulatorResult["interest"] =
    partial.featured_mechanism === "lic_rs"
      ? "lic_rs"
      : partial.featured_mechanism.startsWith("audiovisual")
        ? "audiovisual"
        : "rouanet";
  const result: SimulatorResult = {
    ...partial,
    interest,
    texts: [],
    sources: sourcesFor(partial.taxpayer_type, rowKeys, p),
  };
  result.texts = textsFor(result);
  return result;
}

function pjBase(
  input: PjSimulatorInput,
  p: SimulatorParams,
): CalculationBase | "no_tax" | "band_nao_sei" {
  const a = p.regras_gerais.pj_apuracao;
  const common = {
    taxpayer_type: "pj" as const,
    input_mode: input.input_mode,
    description: p.regras_gerais.pj_base_de_calculo,
    source: a.fonte,
  };
  if (input.input_mode === "tax_due") {
    const value = round2(input.tax_due ?? 0);
    if (value <= 0) return "no_tax";
    return {
      ...common,
      value: point(value),
      exact: true,
      band: bandFor("pj", value, p),
      breakdown: null,
    };
  }
  if (input.input_mode === "taxable_profit") {
    const profit = round2(input.taxable_profit ?? 0);
    const period = input.period;
    if (!period)
      throw new Error("Entrada inválida: lucro real sem período; valide com parseSimulatorInput.");
    if (profit <= 0) return "no_tax";
    const months = period === "annual" ? 12 : 3;
    const irpj = round2((profit * a.aliquota_irpj) / 100);
    const exempt = round2(a.parcela_isenta_adicional_mensal * months);
    const surtax = round2((Math.max(0, profit - exempt) * a.aliquota_adicional) / 100);
    if (irpj <= 0) return "no_tax";
    return {
      ...common,
      value: point(irpj),
      exact: true,
      band: bandFor("pj", irpj, p),
      breakdown: {
        taxable_profit: profit,
        period,
        months,
        irpj_rate: a.aliquota_irpj,
        irpj,
        surtax_rate: a.aliquota_adicional,
        surtax_exempt: exempt,
        surtax,
      },
    };
  }
  const band = input.tax_band ?? "nao_sei";
  const range = bandRange("pj", band, p);
  if (band === "nao_sei" || !range) return "band_nao_sei";
  return { ...common, value: range, exact: false, band, breakdown: null };
}

function pfBase(
  input: PfSimulatorInput,
  p: SimulatorParams,
): CalculationBase | "no_tax" | "band_nao_sei" {
  const common = {
    taxpayer_type: "pf" as const,
    input_mode: input.input_mode,
    description: p.regras_gerais.pf_base_de_calculo,
    source: p.pf.fonte,
  };
  if (input.input_mode === "tax_due") {
    const value = round2(input.tax_due ?? 0);
    if (value <= 0) return "no_tax";
    return {
      ...common,
      value: point(value),
      exact: true,
      band: bandFor("pf", value, p),
      breakdown: null,
    };
  }
  const band = input.tax_band ?? "nao_sei";
  const range = bandRange("pf", band, p);
  if (band === "nao_sei" || !range) return "band_nao_sei";
  return { ...common, value: range, exact: false, band, breakdown: null };
}

function simulatePj(
  input: PjSimulatorInput,
  p: SimulatorParams,
  options: SimulateOptions,
): SimulatorResult {
  const warnings: SimulatorWarning[] = [];
  const stale = paramsAgeInDays(options.now ?? new Date(), p);
  if (stale > PARAMS_STALE_DAYS) {
    warnings.push({
      code: "params_stale",
      text_key: "params_stale",
      vars: { data: formatDateBR(p.atualizado_em) },
    });
  }
  const lc224 = lc224Info("pj", input.apply_lc224, p);
  const contributionType = input.contribution_type ?? "patrocinio";
  const desired = input.desired_contribution ?? null;
  const lic =
    licRsRequested(input) && input.icms_prior_year != null
      ? simulateLicRs(input.icms_prior_year, input.lic_rs_segment, desired, p)
      : null;
  const skeleton = {
    taxpayer_type: "pj" as const,
    parameters_version: p.atualizado_em,
    disqualified: null,
    warnings,
    lc224,
    base: null,
    limits: null,
    scenarios: null,
    comparison: null,
    contribution_type: contributionType,
    desired_contribution: desired,
    lic_rs: lic,
    examples: null,
    band: null as PjTaxBand | PfTaxBand | null,
    deadlines: [] as Deadline[],
  };

  // 4.1 Elegibilidade.
  if (p.regras_gerais.pj_regimes_nao_elegiveis.includes(input.regime)) {
    statusWarnings(warnings, lc224, false, lic, "pj", p);
    return finish(
      {
        ...skeleton,
        status: "disqualified",
        disqualified: { reason: "regime" },
        lc224: { ...lc224, applied: false },
        featured_mechanism: pickFeatured(input, null, lic),
      },
      lic ? ["lic_rs"] : [],
      p,
    );
  }
  if (!p.regras_gerais.pj_regimes_elegiveis.includes(input.regime)) {
    warnings.push({ code: "unknown_regime", text_key: "unknown_regime" });
  }

  const base = pjBase(input, p);
  if (base === "no_tax") {
    statusWarnings(warnings, lc224, false, lic, "pj", p);
    return finish(
      {
        ...skeleton,
        status: "no_tax",
        band: "nao_sei",
        featured_mechanism: pickFeatured(input, null, lic),
      },
      lic ? ["lic_rs"] : [],
      p,
    );
  }
  if (base === "band_nao_sei") {
    statusWarnings(warnings, lc224, false, lic, "pj", p);
    return finish(
      {
        ...skeleton,
        status: "band_only",
        examples: p.exemplos.pj,
        band: "nao_sei",
        featured_mechanism: pickFeatured(input, null, lic),
      },
      lic ? ["lic_rs"] : [],
      p,
    );
  }
  if (base.exact && base.value.min > p.regras_gerais.limites_entrada.pj_max) {
    warnings.push({ code: "too_large", text_key: "too_large" });
  }

  // 4.3 Limites nos dois cenários; o efetivo segue `lc224.applied` (ADR-002, D1).
  const withLc = pjLimits(base.value, lc224.factor, input, p);
  const without = pjLimits(base.value, 1, input, p);
  const limits = lc224.applied ? withLc : without;
  const featured = pickFeatured(input, limits, lic);

  // 4.8 Comparação para o mecanismo em destaque (aporte: o desejado ou o que atinge o teto).
  let comparison: Comparison | null = null;
  if (base.exact) {
    const row = limits.mechanisms.find((r) => r.key === featured);
    if (row) {
      comparison = buildComparison(
        base.value.min,
        row,
        desired ?? row.contribution_for_cap.min,
        operatingSavingsRates(p),
        contributionType,
      );
      if (comparison.over_cap) {
        warnings.push({
          code: "over_cap",
          text_key: "over_cap",
          vars: { teto: formatBRL(comparison.cap) },
        });
      }
    }
  }
  statusWarnings(warnings, lc224, true, lic, "pj", p);

  const deadlines: Deadline[] = [];
  if (input.period === "quarterly") {
    deadlines.push({ key: "pj_quarterly", text: renderText("pj_quarterly") });
  }
  deadlines.push({ key: "pj_period", text: renderText("pj_period") });

  return finish(
    {
      ...skeleton,
      status: base.exact ? "ok" : "band_only",
      base,
      limits,
      scenarios: { with_lc224: withLc, without_lc224: without },
      comparison,
      featured_mechanism: featured,
      band: base.band,
      deadlines,
    },
    [
      ...limits.mechanisms.map((r) => r.key),
      ...(lic ? (["lic_rs"] as SimulatorMechanismKey[]) : []),
    ],
    p,
  );
}

function simulatePf(
  input: PfSimulatorInput,
  p: SimulatorParams,
  options: SimulateOptions,
): SimulatorResult {
  const warnings: SimulatorWarning[] = [];
  const stale = paramsAgeInDays(options.now ?? new Date(), p);
  if (stale > PARAMS_STALE_DAYS) {
    warnings.push({
      code: "params_stale",
      text_key: "params_stale",
      vars: { data: formatDateBR(p.atualizado_em) },
    });
  }
  const lc224 = lc224Info("pf", input.apply_lc224, p);
  const contributionType = input.contribution_type ?? "patrocinio";
  const desired = input.desired_contribution ?? null;
  const skeleton = {
    taxpayer_type: "pf" as const,
    parameters_version: p.atualizado_em,
    disqualified: null,
    warnings,
    lc224,
    base: null,
    limits: null,
    scenarios: null,
    comparison: null,
    contribution_type: contributionType,
    desired_contribution: desired,
    lic_rs: null,
    examples: null,
    band: null as PjTaxBand | PfTaxBand | null,
    deadlines: [] as Deadline[],
  };

  if (input.declaration_model === "simplificada") {
    return finish(
      {
        ...skeleton,
        status: "disqualified",
        disqualified: { reason: "modelo_simplificado" },
        featured_mechanism: pickFeatured(input, null, null),
      },
      [],
      p,
    );
  }
  if (input.declaration_model === "nao_sei") {
    warnings.push({ code: "unknown_model", text_key: "unknown_model" });
  }

  const base = pfBase(input, p);
  if (base === "no_tax") {
    return finish(
      {
        ...skeleton,
        status: "no_tax",
        band: "nao_sei",
        featured_mechanism: pickFeatured(input, null, null),
      },
      [],
      p,
    );
  }
  if (base === "band_nao_sei") {
    return finish(
      {
        ...skeleton,
        status: "band_only",
        examples: p.exemplos.pf,
        band: "nao_sei",
        featured_mechanism: pickFeatured(input, null, null),
      },
      [],
      p,
    );
  }
  if (base.exact && base.value.min > p.regras_gerais.limites_entrada.pf_max) {
    warnings.push({ code: "too_large", text_key: "too_large" });
  }

  const limits = pfLimits(base.value, lc224.applied ? lc224.factor : 1, input, p);
  const featured = pickFeatured(input, limits, null);
  let comparison: Comparison | null = null;
  if (base.exact) {
    const row = limits.mechanisms.find((r) => r.key === featured);
    if (row) {
      comparison = buildComparison(
        base.value.min,
        row,
        desired ?? row.contribution_for_cap.min,
        { min: 0, max: 0 },
        contributionType,
      );
      if (comparison.over_cap) {
        warnings.push({
          code: "over_cap",
          text_key: "over_cap",
          vars: { teto: formatBRL(comparison.cap) },
        });
      }
    }
  }
  const deadlines: Deadline[] = [
    {
      key: "pf_deposit",
      text: `Depósito identificado com o CPF na conta do projeto ${p.pf.prazo_aporte}; o valor entra na ${p.pf.onde_declarar}.`,
    },
  ];
  return finish(
    {
      ...skeleton,
      status: base.exact ? "ok" : "band_only",
      base,
      limits,
      comparison,
      featured_mechanism: featured,
      band: base.band,
      deadlines,
    },
    limits.mechanisms.map((r) => r.key),
    p,
  );
}

// Entrada já validada por parseSimulatorInput() (spec, 3.4). Pura: o mesmo input e os mesmos
// params produzem o mesmo resultado (exceto o aviso params_stale, que depende de `options.now`).
export function simulate(
  input: SimulatorInput,
  p: SimulatorParams = defaultParams,
  options: SimulateOptions = {},
): SimulatorResult {
  return input.taxpayer_type === "pj"
    ? simulatePj(input, p, options)
    : simulatePf(input, p, options);
}

// Útil para a UI (lista de abas da comparação) e para o CRM.
export { SIMULATOR_MECHANISM_KEYS };
export type { ParamStatus };
