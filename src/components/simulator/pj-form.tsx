"use client";

import { useState, type FormEvent } from "react";
import { siteButtonClass } from "@/components/analytics/track-link";
import { ErrorSummary } from "@/components/site/form";
import {
  params,
  parseSimulatorInput,
  renderText,
  type SimulatorInput,
  type ValidationIssue,
} from "@/lib/simulator";
import type { LeadFormState } from "@/lib/validation/forms/state";
import { SimpleTabs, tabPanelProps } from "./tabs";
import { ControlledRadioGroup, ControlledSelect, CurrencyInput, HelpDetails } from "./fields";
import { bandOptions } from "./view-model";

// Tela 2 (PJ): dados da empresa (simulador-spec.md, seção 10). Regime com LIC-RS condicional,
// abas input_mode (IRPJ devido, lucro estimado, só a faixa), período na aba de lucro, aporte
// desejado e tipo recolhidos. Validação com parseSimulatorInput e erros inline em pt-BR.
export const PJ_FIELD_LABELS: Record<string, string> = {
  regime: "Regime tributário",
  tax_due: "IRPJ devido",
  taxable_profit: "Lucro real estimado",
  period: "Apuração",
  tax_band: "Faixa do IRPJ",
  icms_contributor_rs: "Contribuinte de ICMS no RS",
  icms_prior_year: "ICMS pago no ano anterior",
  lic_rs_segment: "Edital da LIC-RS",
  desired_contribution: "Quanto pensa em destinar",
  contribution_type: "Tipo de aporte",
};

const REGIME_OPTIONS = [
  { value: "lucro_real", label: "Lucro real" },
  { value: "lucro_presumido", label: "Lucro presumido" },
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "lucro_arbitrado", label: "Lucro arbitrado" },
  { value: "nao_sei", label: "Não sei" },
];

const INPUT_TABS = [
  { value: "tax_due", label: "Sei o IRPJ devido" },
  { value: "taxable_profit", label: "Sei o lucro estimado" },
  { value: "tax_band", label: "Sei só a faixa" },
] as const;
type InputMode = (typeof INPUT_TABS)[number]["value"];

const PERIOD_OPTIONS = [
  { value: "annual", label: "Anual" },
  { value: "quarterly", label: "Trimestral" },
];

const ICMS_OPTIONS = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
  { value: "nao_sei", label: "Não sei" },
];

const SEGMENT_OPTIONS = [
  { value: "demais_editais", label: "Demais editais (artes, produção e fruição)" },
  {
    value: "edital_patrimonio_e_espacos_publicos",
    label: "Edital para Patrimônio e Espaços Públicos de Cultura",
  },
];

const TYPE_OPTIONS = [
  { value: "patrocinio", label: "Patrocínio", description: "permite contrapartidas promocionais" },
  { value: "doacao", label: "Doação", description: "sem exposição de marca" },
];

type Props = {
  onCalculate: (input: SimulatorInput) => void;
  onBack: () => void;
};

function errorsFrom(issues: ValidationIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.split(".")[0] || "regime";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export function PjForm({ onCalculate, onBack }: Props) {
  const [regime, setRegime] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("tax_due");
  const [taxDue, setTaxDue] = useState("");
  const [taxableProfit, setTaxableProfit] = useState("");
  const [period, setPeriod] = useState("");
  const [taxBand, setTaxBand] = useState("");
  const [icms, setIcms] = useState("");
  const [icmsPriorYear, setIcmsPriorYear] = useState("");
  const [segment, setSegment] = useState("demais_editais");
  const [desired, setDesired] = useState("");
  const [contributionType, setContributionType] = useState("patrocinio");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const disqualified =
    regime !== "" && params.regras_gerais.pj_regimes_nao_elegiveis.includes(regime);
  const simples = regime === "simples_nacional";
  const askIcms = regime !== "" && !simples;
  const licRequested = askIcms && (icms === "sim" || icms === "nao_sei");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw: Record<string, unknown> = {
      taxpayer_type: "pj",
      regime: regime || undefined,
      input_mode: inputMode,
      icms_contributor_rs: askIcms && icms ? icms : null,
      icms_prior_year: licRequested && icmsPriorYear ? icmsPriorYear : null,
      lic_rs_segment: licRequested ? segment : null,
      desired_contribution: desired ? desired : null,
      contribution_type: contributionType,
    };
    if (!disqualified) {
      if (inputMode === "tax_due") raw.tax_due = taxDue ? taxDue : null;
      if (inputMode === "taxable_profit") {
        raw.taxable_profit = taxableProfit ? taxableProfit : null;
        raw.period = period ? period : null;
      }
      if (inputMode === "tax_band") raw.tax_band = taxBand ? taxBand : null;
    }
    const parsed = parseSimulatorInput(raw);
    if (!parsed.ok) {
      setErrors(errorsFrom(parsed.issues));
      setMessage("Confira os campos destacados abaixo.");
      return;
    }
    setErrors({});
    setMessage(null);
    onCalculate(parsed.input);
  }

  const errorState: LeadFormState = message
    ? { status: "error", errorCode: "validation", message, fieldErrors: errors }
    : { status: "idle" };

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-6"
      aria-label="Dados da empresa"
    >
      <ErrorSummary state={errorState} fieldLabels={PJ_FIELD_LABELS} />

      <ControlledRadioGroup
        name="regime"
        label="Regime tributário da empresa"
        required
        options={REGIME_OPTIONS}
        value={regime}
        onChange={(v) => {
          setRegime(v);
          setErrors({});
          setMessage(null);
        }}
        error={errors.regime}
        help={
          simples
            ? "Empresas do Simples Nacional não deduzem incentivos do IRPJ nem compensam ICMS na LIC-RS."
            : undefined
        }
      />

      {disqualified ? (
        <p className="bg-sand rounded-lg p-4 text-[15px] leading-snug">
          {renderText("disqualified_regime")}
          {askIcms
            ? " Se a empresa recolhe ICMS no Rio Grande do Sul, há caminho pela LIC-RS: responda abaixo."
            : ""}
        </p>
      ) : regime ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p id="pj-modo-rotulo" className="font-medium">
              Como você prefere informar o imposto?
              <span className="text-muted-foreground font-normal"> (obrigatório)</span>
            </p>
            <SimpleTabs
              id="pj-modo"
              label="Como informar o imposto"
              tabs={[...INPUT_TABS]}
              value={inputMode}
              onChange={(v) => {
                setInputMode(v);
                setErrors({});
                setMessage(null);
              }}
            />
          </div>
          {inputMode === "tax_due" ? (
            <div {...tabPanelProps("pj-modo", "tax_due")} className="flex flex-col gap-3">
              <CurrencyInput
                name="tax_due"
                label="IRPJ devido no período"
                required
                size="large"
                value={taxDue}
                onChange={setTaxDue}
                error={errors.tax_due}
                help="Imposto de renda à alíquota de 15% sobre o lucro real, antes do adicional. Zero se não houve imposto."
              />
              <HelpDetails summary="Como o limite é calculado">
                <p>{renderText("base_pj")}</p>
              </HelpDetails>
            </div>
          ) : null}
          {inputMode === "taxable_profit" ? (
            <div {...tabPanelProps("pj-modo", "taxable_profit")} className="flex flex-col gap-3">
              <CurrencyInput
                name="taxable_profit"
                label="Lucro real estimado do período"
                required
                size="large"
                value={taxableProfit}
                onChange={setTaxableProfit}
                error={errors.taxable_profit}
                help="Calculamos o IRPJ de 15% sobre esse lucro; o adicional de 10% fica fora da conta."
              />
              <ControlledRadioGroup
                name="period"
                label="Apuração"
                required
                options={PERIOD_OPTIONS}
                value={period}
                onChange={setPeriod}
                error={errors.period}
              />
              <HelpDetails summary="Como o limite é calculado">
                <p>{renderText("base_pj")}</p>
              </HelpDetails>
            </div>
          ) : null}
          {inputMode === "tax_band" ? (
            <div {...tabPanelProps("pj-modo", "tax_band")} className="flex flex-col gap-3">
              <ControlledRadioGroup
                name="tax_band"
                label="Faixa do IRPJ devido no ano"
                required
                options={bandOptions("pj")}
                value={taxBand}
                onChange={setTaxBand}
                error={errors.tax_band}
                help="O resultado sai em intervalo. Para o número exato, informe o imposto devido."
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {askIcms ? (
        <div className="flex flex-col gap-4">
          <ControlledRadioGroup
            name="icms_contributor_rs"
            label="A empresa é contribuinte de ICMS no Rio Grande do Sul?"
            options={ICMS_OPTIONS}
            value={icms}
            onChange={setIcms}
            error={errors.icms_contributor_rs}
            help="Com ICMS próprio no RS, a empresa pode patrocinar cultura pela LIC-RS e compensar o valor no imposto estadual."
          />
          {licRequested ? (
            <>
              <CurrencyInput
                name="icms_prior_year"
                label="ICMS próprio pago no ano anterior"
                required
                value={icmsPriorYear}
                onChange={setIcmsPriorYear}
                error={errors.icms_prior_year}
                help="Base da faixa de limite anual da LIC-RS. O contador tem esse número na GIA."
              />
              <ControlledSelect
                name="lic_rs_segment"
                label="Tipo de edital da LIC-RS"
                options={SEGMENT_OPTIONS}
                value={segment}
                onChange={setSegment}
                error={errors.lic_rs_segment}
                help="Define o repasse ao FAC: 10% nos demais editais, 5% no edital de patrimônio."
              />
            </>
          ) : null}
        </div>
      ) : null}

      {regime ? (
        <details className="border-border rounded-lg border p-4">
          <summary className="touch-target cursor-pointer font-medium">
            Quanto pensa em destinar? (opcional)
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            <CurrencyInput
              name="desired_contribution"
              label="Aporte desejado"
              value={desired}
              onChange={setDesired}
              error={errors.desired_contribution}
              help="Se deixar em branco, usamos o aporte que atinge o teto."
            />
            <ControlledRadioGroup
              name="contribution_type"
              label="Tipo de aporte"
              options={TYPE_OPTIONS}
              value={contributionType}
              onChange={setContributionType}
              error={errors.contribution_type}
            />
          </div>
        </details>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className={siteButtonClass("primary")}>
          {disqualified ? "Ver o que é possível" : "Calcular"}
        </button>
        <button type="button" onClick={onBack} className={siteButtonClass("link")}>
          Voltar
        </button>
      </div>
    </form>
  );
}
