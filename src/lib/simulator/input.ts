// Entradas do simulador (simulador-spec.md, seções 3.1 a 3.4) validadas com Zod. As mesmas
// mensagens valem no cliente e na Server Action. Moeda aceita texto ("R$ 1.234,56") ou número.
// Puro: sem Next, sem banco.
import { z } from "zod";
import { parseCurrencyBR } from "./format";
import { params } from "./params";

export const TAXPAYER_TYPES = ["pj", "pf"] as const;
export type TaxpayerType = (typeof TAXPAYER_TYPES)[number];

export const PJ_REGIMES = [
  "lucro_real",
  "lucro_presumido",
  "simples_nacional",
  "lucro_arbitrado",
  "nao_sei",
] as const;
export type PjRegime = (typeof PJ_REGIMES)[number];

export const PJ_INPUT_MODES = ["tax_due", "taxable_profit", "tax_band"] as const;
export type PjInputMode = (typeof PJ_INPUT_MODES)[number];

export const PF_INPUT_MODES = ["tax_due", "tax_band"] as const;
export type PfInputMode = (typeof PF_INPUT_MODES)[number];

export const PERIODS = ["annual", "quarterly"] as const;
export type Period = (typeof PERIODS)[number];

// Mesmos códigos de irpj_faixa e ir_devido_faixa do CRM (lead-attributes.ts; spec, 3.2 e 3.3).
export const PJ_TAX_BANDS = [
  "ate_100k",
  "100k_500k",
  "500k_2500k",
  "acima_2500k",
  "nao_sei",
] as const;
export type PjTaxBand = (typeof PJ_TAX_BANDS)[number];

export const PF_TAX_BANDS = ["ate_20k", "20k_80k", "acima_80k", "nao_sei"] as const;
export type PfTaxBand = (typeof PF_TAX_BANDS)[number];

export const DECLARATION_MODELS = ["completa", "simplificada", "nao_sei"] as const;
export type DeclarationModel = (typeof DECLARATION_MODELS)[number];

export const CONTRIBUTION_TYPES = ["patrocinio", "doacao"] as const;
export type ContributionType = (typeof CONTRIBUTION_TYPES)[number];

export const YES_NO_UNKNOWN = ["sim", "nao", "nao_sei"] as const;
export type YesNoUnknown = (typeof YES_NO_UNKNOWN)[number];

// Chaves de mecanismos.lic_rs.repasse_adicional_fac_percentual (T-SCH-08 confere com o JSON).
export const LIC_RS_SEGMENTS = ["demais_editais", "edital_patrimonio_e_espacos_publicos"] as const;
export type LicRsSegment = (typeof LIC_RS_SEGMENTS)[number];

export const PJ_INTERESTS = ["cesta_cultural", "esporte", "fundos", "saude", "lic_rs"] as const;
export type PjInterest = (typeof PJ_INTERESTS)[number];

export const PF_INTERESTS = ["cultura", "audiovisual", "fundos", "esporte"] as const;
export type PfInterest = (typeof PF_INTERESTS)[number];

// Mecanismos com linha na tabela do resultado (spec, 5.2) e aba na comparação (spec, 4.8).
export const SIMULATOR_MECHANISM_KEYS = [
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
  "lic_rs",
] as const;
export type SimulatorMechanismKey = (typeof SIMULATOR_MECHANISM_KEYS)[number];

const ENUM_MESSAGE = "Escolha uma das opções da lista.";

function money(message: string) {
  return z.preprocess(
    (v) => (typeof v === "string" ? (parseCurrencyBR(v) ?? Number.NaN) : v),
    z.number({ error: message }).finite({ error: message }),
  );
}

// Imposto devido, lucro e ICMS: zero é aceito e vira o estado `no_tax` (spec, 4.1 e 8).
const taxAmount = money("Informe um valor em reais, por exemplo 50.000,00.").refine((v) => v >= 0, {
  error: "O valor não pode ser negativo.",
});

// Aporte desejado: maior que zero.
const positiveAmount = money("Informe um valor em reais, por exemplo 10.000,00.").refine(
  (v) => v > 0,
  { error: "O valor deve ser maior que zero." },
);

const optional = <T extends z.ZodType>(schema: T) => schema.nullish();

const commonFields = {
  apply_lc224: z.boolean({ error: "Valor inválido." }).nullish(),
  desired_contribution: optional(positiveAmount),
  contribution_type: z.enum(CONTRIBUTION_TYPES, { error: ENUM_MESSAGE }).nullish(),
  featured_mechanism: z.enum(SIMULATOR_MECHANISM_KEYS, { error: ENUM_MESSAGE }).nullish(),
};

export const pjSimulatorInputSchema = z
  .strictObject({
    taxpayer_type: z.literal("pj"),
    regime: z.enum(PJ_REGIMES, { error: "Informe o regime tributário da empresa." }),
    input_mode: z.enum(PJ_INPUT_MODES, { error: ENUM_MESSAGE }),
    tax_due: optional(taxAmount),
    taxable_profit: optional(taxAmount),
    period: z.enum(PERIODS, { error: ENUM_MESSAGE }).nullish(),
    tax_band: z.enum(PJ_TAX_BANDS, { error: ENUM_MESSAGE }).nullish(),
    icms_contributor_rs: z.enum(YES_NO_UNKNOWN, { error: ENUM_MESSAGE }).nullish(),
    icms_prior_year: optional(taxAmount),
    lic_rs_segment: z.enum(LIC_RS_SEGMENTS, { error: ENUM_MESSAGE }).nullish(),
    mechanisms_of_interest: z.array(z.enum(PJ_INTERESTS, { error: ENUM_MESSAGE })).nullish(),
    ...commonFields,
  })
  .superRefine((v, ctx) => {
    // Regime fora do lucro real não calcula incentivos sobre o IR (spec, 4.1): a tela não pede o
    // imposto e segue para "Ver o que é possível" (LIC-RS quando houver).
    const disqualified = params.regras_gerais.pj_regimes_nao_elegiveis.includes(v.regime);
    if (!disqualified && v.input_mode === "tax_due" && v.tax_due == null) {
      ctx.addIssue({
        code: "custom",
        path: ["tax_due"],
        message: "Informe o IRPJ devido no período.",
      });
    }
    if (!disqualified && v.input_mode === "taxable_profit") {
      if (v.taxable_profit == null) {
        ctx.addIssue({
          code: "custom",
          path: ["taxable_profit"],
          message: "Informe o lucro real estimado do período.",
        });
      }
      if (v.period == null) {
        ctx.addIssue({
          code: "custom",
          path: ["period"],
          message: "Informe se a apuração é anual ou trimestral.",
        });
      }
    }
    if (!disqualified && v.input_mode === "tax_band" && v.tax_band == null) {
      ctx.addIssue({ code: "custom", path: ["tax_band"], message: "Escolha a faixa do IRPJ." });
    }
    if (licRsRequested(v) && v.icms_prior_year == null) {
      ctx.addIssue({
        code: "custom",
        path: ["icms_prior_year"],
        message: "Informe o ICMS próprio pago no ano anterior.",
      });
    }
  });

export const pfSimulatorInputSchema = z
  .strictObject({
    taxpayer_type: z.literal("pf"),
    declaration_model: z.enum(DECLARATION_MODELS, {
      error: "Informe o modelo da sua declaração.",
    }),
    input_mode: z.enum(PF_INPUT_MODES, { error: ENUM_MESSAGE }),
    tax_due: optional(taxAmount),
    tax_band: z.enum(PF_TAX_BANDS, { error: ENUM_MESSAGE }).nullish(),
    includes_sport: z.boolean({ error: "Valor inválido." }).nullish(),
    mechanisms_of_interest: z.array(z.enum(PF_INTERESTS, { error: ENUM_MESSAGE })).nullish(),
    ...commonFields,
  })
  .superRefine((v, ctx) => {
    if (v.input_mode === "tax_due" && v.tax_due == null) {
      ctx.addIssue({
        code: "custom",
        path: ["tax_due"],
        message: "Informe o imposto devido na declaração.",
      });
    }
    if (v.input_mode === "tax_band" && v.tax_band == null) {
      ctx.addIssue({
        code: "custom",
        path: ["tax_band"],
        message: "Escolha a faixa do imposto devido.",
      });
    }
  });

// Combinações inválidas entre tipos (PF com `regime`, por exemplo) são erro de validação, não
// de cálculo (spec, 3.4): cada membro da união é estrito (strictObject) e rejeita chaves do outro
// tipo; parseSimulatorInput() traduz a mensagem.
export const simulatorInputSchema = z.discriminatedUnion(
  "taxpayer_type",
  [pjSimulatorInputSchema, pfSimulatorInputSchema],
  { error: "Informe se a simulação é para empresa (pj) ou pessoa física (pf)." },
);

export type PjSimulatorInput = z.output<typeof pjSimulatorInputSchema>;
export type PfSimulatorInput = z.output<typeof pfSimulatorInputSchema>;
export type SimulatorInput = z.output<typeof simulatorInputSchema>;
export type SimulatorRawInput = z.input<typeof simulatorInputSchema>;

// O módulo LIC-RS é pedido quando a empresa está fora do Simples e é (ou pode ser) contribuinte
// de ICMS no RS (mecanismos.lic_rs.quem_pode; spec, 4.1 e 4.7).
export function licRsRequested(input: {
  regime: PjRegime;
  icms_contributor_rs?: YesNoUnknown | null;
}): boolean {
  if (input.regime === "simples_nacional") return false;
  return input.icms_contributor_rs === "sim" || input.icms_contributor_rs === "nao_sei";
}

export type ValidationIssue = { path: string; message: string };
export type ParseResult =
  | { ok: true; input: SimulatorInput }
  | { ok: false; status: "validation_error"; issues: ValidationIssue[] };

// Valida e normaliza a entrada crua do formulário. Erro de validação não calcula nada (spec, 8).
export function parseSimulatorInput(raw: unknown): ParseResult {
  const result = simulatorInputSchema.safeParse(raw);
  if (result.success) return { ok: true, input: result.data };
  const seen = new Set<string>();
  const issues: ValidationIssue[] = [];
  for (const issue of result.error.issues) {
    const path = issue.path.map(String).join(".");
    const message =
      issue.code === "unrecognized_keys"
        ? `Campo não se aplica a este tipo de contribuinte: ${issue.keys.join(", ")}.`
        : issue.message;
    const key = `${path}:${message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push({ path, message });
  }
  return { ok: false, status: "validation_error", issues };
}
