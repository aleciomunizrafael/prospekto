// Tipos públicos do simulador (simulador-spec.md, seções 3, 4, 5 e 8). Valores monetários são
// `number` com duas casas; intervalos são `{ min, max | null }` (max null = sem teto).
import type { MoneyRange } from "./format";
import type {
  ContributionType,
  LicRsSegment,
  Period,
  PfTaxBand,
  PjInputMode,
  PjTaxBand,
  SimulatorMechanismKey,
  TaxpayerType,
} from "./input";

export type { MoneyRange } from "./format";
export type {
  ContributionType,
  DeclarationModel,
  LicRsSegment,
  Period,
  PfInputMode,
  PfInterest,
  PfSimulatorInput,
  PfTaxBand,
  PjInputMode,
  PjInterest,
  PjRegime,
  PjSimulatorInput,
  PjTaxBand,
  SimulatorInput,
  SimulatorMechanismKey,
  SimulatorRawInput,
  TaxpayerType,
  YesNoUnknown,
} from "./input";

export type ParamStatus = "verificado" | "verificar";

export type SimulatorStatus = "ok" | "disqualified" | "no_tax" | "band_only";
export type DisqualifiedReason = "regime" | "modelo_simplificado";

// Códigos de aviso (spec, seção 8, mais o status `verificar` dos parâmetros propagado como aviso).
export type WarningCode =
  | "unknown_regime"
  | "unknown_model"
  | "over_cap"
  | "too_large"
  | "params_stale"
  | "lc224_unverified"
  | "lic_rs_unverified"
  | "csll_unverified";

export type SimulatorWarning = {
  code: WarningCode;
  // Chave em texts.ts com o texto a exibir.
  text_key: TextKey;
  // Variáveis para o texto (ex.: `teto` em over_cap, `data` em params_stale).
  vars?: Record<string, string | number>;
};

export type TextKey =
  | "disclaimer_main"
  | "base_pj"
  | "base_pf"
  | "basket_pj"
  | "lc224_notice"
  | "art26_notice"
  | "operating_expense_range"
  | "donation_notice"
  | "art1a_notice"
  | "art1_notice"
  | "pf_deadline"
  | "pf_basket"
  | "pf_no_8pct"
  | "disqualified_regime"
  | "disqualified_regime_lic_rs"
  | "disqualified_model"
  | "no_tax"
  | "no_icms"
  | "lic_rs_notice"
  | "band_notice"
  | "band_examples"
  | "over_cap"
  | "too_large"
  | "unknown_regime"
  | "unknown_model"
  | "params_stale"
  | "pj_quarterly"
  | "pj_period"
  | "sources_footer"
  | "no_financial_return";

// Base de cálculo (spec, 4.2 e 4.6). `value` é um ponto (min = max) quando a entrada é exata.
export type CalculationBase = {
  taxpayer_type: TaxpayerType;
  input_mode: PjInputMode;
  value: MoneyRange;
  exact: boolean;
  band: PjTaxBand | PfTaxBand | null;
  // Conta aberta quando a entrada é o lucro real (spec, 4.2 e 5.2, bloco 1).
  breakdown: {
    taxable_profit: number;
    period: Period;
    months: number;
    irpj_rate: number; // pontos percentuais (15)
    irpj: number; // base
    surtax_rate: number; // pontos percentuais (10)
    surtax_exempt: number; // parcela isenta do período (20.000 x meses)
    surtax: number; // informativo; não entra na base
  } | null;
  description: string; // texto da base (P.regras_gerais.pj_base_de_calculo ou pf_base_de_calculo)
  source: string;
};

export type GroupLimit = {
  key: string; // cesta_cultural_pj, esporte_pj, ..., cesta_pf
  label: string;
  percent: number; // pontos percentuais do JSON (4)
  effective_percent: number; // após o fator da LC 224 (3,6)
  limit: MoneyRange;
  members: string[];
  source: string;
  status: ParamStatus;
};

// Linha da tabela por mecanismo (spec, 5.2).
export type MechanismRow = {
  key: SimulatorMechanismKey;
  name: string;
  legal_basis: string;
  status: ParamStatus;
  highlighted: boolean; // conforme mechanisms_of_interest
  group: string; // grupo de limite que a linha compartilha
  shares_cultural_basket: boolean;
  percent: number; // pontos percentuais do mecanismo (4, 3, 2, 1)
  effective_percent: number; // após o fator
  limit: MoneyRange; // teto em reais
  deductible_percent: number; // d (100, 30, 40, 60, 80)
  deduction_per_real: number; // 1,00; 0,30; ...
  contribution_for_cap: MoneyRange; // aporte para atingir o teto
  net_cost_at_cap: MoneyRange; // zero no art. 18 e 1º-A; faixa no art. 26 e art. 1º
  operating_expense: boolean; // trata_como_despesa_operacional
  // PF, FIA e Idoso: limite da doação na própria declaração (3%), dentro da cesta.
  in_declaration_limit: MoneyRange | null;
  notes: TextKey[];
};

export type LimitsBlock = {
  factor: number; // 1 ou fator_pj
  groups: GroupLimit[];
  mechanisms: MechanismRow[];
  cultural_basket: MoneyRange; // cesta cultural (4% PJ; 6% ou 7% PF)
  total: MoneyRange; // soma dos limites de grupo arredondados (10% PJ; cesta PF)
};

export type ComparisonScenario = {
  tax_paid: MoneyRange; // imposto recolhido ao Tesouro (DARF) ou ICMS
  contribution: number; // aporte ao projeto
  operating_savings: MoneyRange; // economia como despesa operacional (faixa; zero quando não há)
  total_outlay: MoneyRange; // desembolso total
  receives: string[]; // o que recebe
};

// Comparação "pagar imposto" contra "patrocinar" (spec, 4.8) para um mecanismo e um aporte.
export type Comparison = {
  mechanism: SimulatorMechanismKey;
  mechanism_name: string;
  amount: number; // A
  cap: number; // aporte para atingir o teto
  limit: number; // teto de dedução do mecanismo
  deduction: number; // min(A x d, limit)
  deductible_percent: number;
  operating_savings: MoneyRange; // A x t_min a A x t_max (zero quando não há)
  savings_rate: { min: number; max: number }; // t_min e t_max (fração: 0,24 e 0,34)
  net_cost: MoneyRange; // A - dedução - economia
  over_cap: boolean;
  pay_tax: ComparisonScenario; // cenário A
  sponsor: ComparisonScenario; // cenário B
  notes: TextKey[];
};

export type LicRsComparison = {
  applied: number;
  pay_tax: { icms_paid: number; contribution: number; total_outlay: number };
  sponsor: {
    icms_paid: number; // ICMS após o crédito (recolhe `applied` ao projeto em vez do Estado)
    contribution: number; // aporte ao projeto
    fac_transfer: number; // repasse ao FAC
    icms_credit: number; // crédito na GIA
    total_outlay: number;
  };
};

// Módulo LIC-RS (spec, 4.7).
export type LicRsModule = {
  status: "ok" | "no_tax";
  param_status: ParamStatus; // limite_por_faixa_status (verificar propagado como aviso)
  segment: LicRsSegment;
  icms_prior_year: number;
  band: { percent: number; increment: number; from: number | null; to: number | null } | null;
  annual_limit: number;
  applied: number; // aporte (padrão: annual_limit)
  fac_percent: number; // 10 ou 5
  fac_transfer: number;
  icms_credit: number; // = applied
  total_outlay: number; // applied + fac_transfer
  net_cost: number; // = fac_transfer
  over_cap: boolean;
  comparison: LicRsComparison;
  legal_basis: string;
  notes: TextKey[];
};

export type Lc224Info = {
  available: boolean; // só PJ (aplica_a_pf: false)
  applied: boolean; // valor efetivo usado em `limits`
  default_from_params: boolean; // regras_gerais.lc_224_2025.aplicar_por_padrao
  factor: number; // fator_pj
  status: ParamStatus;
};

// Prazos PJ (apuração); o prazo PF é o texto pf_deadline, renderizado pela tela.
export type Deadline = { key: "pj_quarterly" | "pj_period"; text: string };

export type SimulatorResult = {
  status: SimulatorStatus;
  taxpayer_type: TaxpayerType;
  parameters_version: string; // P.atualizado_em
  disqualified: { reason: DisqualifiedReason } | null;
  warnings: SimulatorWarning[];
  lc224: Lc224Info;
  base: CalculationBase | null;
  // Limites do cenário efetivo (`lc224.applied`), ou null quando não há cálculo.
  limits: LimitsBlock | null;
  // PJ: os dois cenários lado a lado (spec, 5.2, bloco 4). PF: null.
  scenarios: { with_lc224: LimitsBlock; without_lc224: LimitsBlock } | null;
  // Mecanismo em destaque e aporte (padrão: o que atinge o teto); null sem base exata.
  comparison: Comparison | null;
  featured_mechanism: SimulatorMechanismKey;
  contribution_type: ContributionType;
  desired_contribution: number | null;
  lic_rs: LicRsModule | null;
  // `band_only` com tax_band = nao_sei: tabela de P.exemplos do tipo (spec, 4.2 e 8).
  examples: Array<Record<string, number>> | null;
  // Faixa para o CRM (irpj_faixa ou ir_devido_faixa): derivada do valor ou a informada.
  band: PjTaxBand | PfTaxBand | null;
  // Interesse para o lead (spec, 6): rouanet, audiovisual ou lic_rs.
  interest: "rouanet" | "audiovisual" | "lic_rs";
  deadlines: Deadline[];
  // Chaves de texto aplicáveis (spec, seção 7), na ordem de exibição.
  texts: TextKey[];
  // Fontes de P.fontes relevantes ao resultado (sources_footer).
  sources: Array<{ key: string; url: string }>;
};
