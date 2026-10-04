import {
  formatBRL,
  formatPercent,
  formatRange,
  renderText,
  type CalculationBase,
  type SimulatorInput,
} from "@/lib/simulator";
import { bandLabel } from "./view-model";

// Bloco 1 da tela 4 (simulador-spec.md, 5.2): o que foi informado e, para o lucro real, a conta
// aberta (lucro, 15%, adicional recolhido à parte e fora da base).
type Props = { base: CalculationBase; input: SimulatorInput };

const REGIME_LABELS: Record<string, string> = {
  lucro_real: "Lucro real",
  lucro_presumido: "Lucro presumido",
  simples_nacional: "Simples Nacional",
  lucro_arbitrado: "Lucro arbitrado",
  nao_sei: "Não sei",
};

const MODEL_LABELS: Record<string, string> = {
  completa: "Completa",
  simplificada: "Simplificada",
  nao_sei: "Não sei",
};

export function BaseBlock({ base, input }: Props) {
  const pj = input.taxpayer_type === "pj";
  const rows: Array<{ label: string; value: string }> = [];
  if (input.taxpayer_type === "pj") {
    rows.push({ label: "Regime tributário", value: REGIME_LABELS[input.regime] ?? input.regime });
    if (input.input_mode === "tax_due" && input.tax_due != null) {
      rows.push({ label: "IRPJ devido informado", value: formatBRL(input.tax_due) });
    }
    if (input.input_mode === "tax_band" && input.tax_band) {
      rows.push({ label: "Faixa do IRPJ informada", value: bandLabel("pj", input.tax_band) });
    }
    if (input.period) {
      rows.push({ label: "Apuração", value: input.period === "annual" ? "Anual" : "Trimestral" });
    }
  } else {
    rows.push({
      label: "Modelo da declaração",
      value: MODEL_LABELS[input.declaration_model] ?? input.declaration_model,
    });
    if (input.input_mode === "tax_due" && input.tax_due != null) {
      rows.push({ label: "Imposto devido informado", value: formatBRL(input.tax_due) });
    }
    if (input.input_mode === "tax_band" && input.tax_band) {
      rows.push({ label: "Faixa informada", value: bandLabel("pf", input.tax_band) });
    }
    rows.push({ label: "Inclui esporte", value: input.includes_sport ? "Sim" : "Não" });
  }
  rows.push({
    label: "Base de cálculo dos limites",
    value: base.exact ? formatBRL(base.value.min) : formatRange(base.value),
  });

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-[auto_1fr]">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="tabular font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
      {base.breakdown ? (
        <div className="bg-sand flex flex-col gap-2 rounded-lg p-4 text-[15px]">
          <p className="font-semibold">Conta aberta</p>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
            <dt>Lucro real do período ({base.breakdown.months} meses)</dt>
            <dd className="tabular text-right">{formatBRL(base.breakdown.taxable_profit)}</dd>
            <dt>IRPJ à alíquota de {formatPercent(base.breakdown.irpj_rate)} (base dos limites)</dt>
            <dd className="tabular text-right font-semibold">{formatBRL(base.breakdown.irpj)}</dd>
            <dt>
              Adicional de {formatPercent(base.breakdown.surtax_rate)} sobre o que passa de{" "}
              {formatBRL(base.breakdown.surtax_exempt)} (recolhido à parte, fora da base)
            </dt>
            <dd className="tabular text-right">{formatBRL(base.breakdown.surtax)}</dd>
          </dl>
        </div>
      ) : null}
      <p className="text-muted-foreground text-[14px] leading-snug">
        {renderText(pj ? "base_pj" : "base_pf")}
      </p>
    </div>
  );
}
