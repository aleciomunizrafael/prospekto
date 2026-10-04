"use client";

import { useState, type FormEvent } from "react";
import { siteButtonClass } from "@/components/analytics/track-link";
import { ErrorSummary } from "@/components/site/form";
import {
  parseSimulatorInput,
  renderText,
  type SimulatorInput,
  type ValidationIssue,
} from "@/lib/simulator";
import type { LeadFormState } from "@/lib/validation/forms/state";
import { SimpleTabs, tabPanelProps } from "./tabs";
import { ControlledCheckbox, ControlledRadioGroup, CurrencyInput, HelpDetails } from "./fields";
import { bandOptions } from "./view-model";

// Tela 2 (PF): dados da declaração (simulador-spec.md, seção 10): modelo com ajuda, abas
// "Sei o imposto devido" e "Sei só a faixa", caixa de esporte, aporte desejado e tipo recolhidos.
export const PF_FIELD_LABELS: Record<string, string> = {
  declaration_model: "Modelo da declaração",
  tax_due: "Imposto devido",
  tax_band: "Faixa do imposto devido",
  includes_sport: "Esporte",
  desired_contribution: "Quanto pensa em destinar",
  contribution_type: "Tipo de aporte",
};

const MODEL_OPTIONS = [
  {
    value: "completa",
    label: "Completa",
    description: "com deduções de saúde, educação e dependentes",
  },
  {
    value: "simplificada",
    label: "Simplificada",
    description: "desconto padrão no lugar das deduções",
  },
  { value: "nao_sei", label: "Não sei" },
];

const INPUT_TABS = [
  { value: "tax_due", label: "Sei o imposto devido" },
  { value: "tax_band", label: "Sei só a faixa" },
] as const;
type InputMode = (typeof INPUT_TABS)[number]["value"];

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
    const key = issue.path.split(".")[0] || "declaration_model";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export function PfForm({ onCalculate, onBack }: Props) {
  const [model, setModel] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("tax_due");
  const [taxDue, setTaxDue] = useState("");
  const [taxBand, setTaxBand] = useState("");
  const [sport, setSport] = useState(false);
  const [desired, setDesired] = useState("");
  const [contributionType, setContributionType] = useState("patrocinio");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const simplified = model === "simplificada";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw: Record<string, unknown> = {
      taxpayer_type: "pf",
      declaration_model: model || undefined,
      input_mode: inputMode,
      includes_sport: sport,
      desired_contribution: desired ? desired : null,
      contribution_type: contributionType,
    };
    if (inputMode === "tax_due") raw.tax_due = taxDue ? taxDue : null;
    if (inputMode === "tax_band") raw.tax_band = taxBand ? taxBand : null;
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
      aria-label="Dados da declaração"
    >
      <ErrorSummary state={errorState} fieldLabels={PF_FIELD_LABELS} />

      <ControlledRadioGroup
        name="declaration_model"
        label="Modelo da sua declaração de imposto de renda"
        required
        options={MODEL_OPTIONS}
        value={model}
        onChange={(v) => {
          setModel(v);
          setErrors({});
          setMessage(null);
        }}
        error={errors.declaration_model}
      />
      <HelpDetails summary="Qual é a diferença entre completa e simplificada?">
        <p>{renderText("disqualified_model")}</p>
      </HelpDetails>

      {model ? (
        <div className="flex flex-col gap-4">
          {simplified ? (
            <p className="bg-sand rounded-lg p-4 text-[15px] leading-snug">
              {renderText("disqualified_model")} Informe o imposto mesmo assim para ver quanto
              caberia na declaração completa.
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <p className="font-medium">
              Como você prefere informar o imposto?
              <span className="text-muted-foreground font-normal"> (obrigatório)</span>
            </p>
            <SimpleTabs
              id="pf-modo"
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
            <div {...tabPanelProps("pf-modo", "tax_due")} className="flex flex-col gap-3">
              <CurrencyInput
                name="tax_due"
                label="Imposto devido na declaração"
                required
                size="large"
                value={taxDue}
                onChange={setTaxDue}
                error={errors.tax_due}
                help="Linha 'imposto devido' da sua última declaração, antes das deduções de incentivo. Zero se não houve imposto."
              />
            </div>
          ) : (
            <div {...tabPanelProps("pf-modo", "tax_band")} className="flex flex-col gap-3">
              <ControlledRadioGroup
                name="tax_band"
                label="Faixa do imposto devido"
                required
                options={bandOptions("pf")}
                value={taxBand}
                onChange={setTaxBand}
                error={errors.tax_band}
                help="O resultado sai em intervalo. Para o número exato, informe o imposto devido."
              />
            </div>
          )}
          <ControlledCheckbox
            name="includes_sport"
            label="Também quero apoiar esporte"
            checked={sport}
            onChange={setSport}
            help="Com esporte, o conjunto dos incentivos sobe de 6% para 7% do imposto devido."
          />
        </div>
      ) : null}

      {model ? (
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
          Calcular
        </button>
        <button type="button" onClick={onBack} className={siteButtonClass("link")}>
          Voltar
        </button>
      </div>
    </form>
  );
}
