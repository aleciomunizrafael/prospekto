"use client";

import { useMemo, useState } from "react";
import {
  compareScenario,
  formatBRL,
  formatRange,
  parseCurrencyBR,
  renderText,
  simulateLicRs,
  type Comparison,
  type LicRsModule,
  type MoneyRange,
  type SimulatorInput,
  type SimulatorMechanismKey,
  type SimulatorResult,
} from "@/lib/simulator";
import { CurrencyInput, formatCurrencyInput } from "./fields";
import { Notice } from "./notice";
import { SimpleTabs, tabPanelProps } from "./tabs";
import { comparisonTabs, mechanismShortLabel } from "./view-model";

// Bloco 4 da tela 4 (simulador-spec.md, 4.8 e 5.2): comparação "pagar imposto" contra
// "patrocinar", com o mecanismo em destaque por abas e o aporte editável, recalculando no cliente
// com compareScenario() (ou simulateLicRs() na aba LIC-RS). Duas colunas que viram linhas
// empilhadas no celular; destaque "Custo adicional: R$ 0,00" quando for zero.
type Props = {
  input: SimulatorInput;
  result: SimulatorResult;
};

function isZero(range: MoneyRange): boolean {
  return range.min === 0 && range.max === 0;
}

function Column({
  title,
  rows,
  receives,
  total,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
  receives: string[];
  total: string;
}) {
  return (
    <div className="border-border bg-background flex flex-col gap-3 rounded-lg border p-4">
      <h4 className="site-h3 text-xl">{title}</h4>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[15px]">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="tabular text-right">{row.value}</dd>
          </div>
        ))}
        <div className="contents">
          <dt className="border-border border-t pt-2 font-semibold">Desembolso total</dt>
          <dd className="border-border tabular border-t pt-2 text-right font-semibold">{total}</dd>
        </div>
      </dl>
      <div className="text-[15px]">
        <p className="text-muted-foreground">O que recebe</p>
        <ul className="list-disc pl-5">
          {receives.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FederalComparison({ comparison, pj }: { comparison: Comparison; pj: boolean }) {
  const zero = isZero(comparison.net_cost);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Column
          title="A. Pagar o imposto"
          rows={[
            {
              label: "Imposto recolhido ao Tesouro (DARF)",
              value: formatRange(comparison.pay_tax.tax_paid),
            },
            { label: "Aporte ao projeto", value: formatBRL(comparison.pay_tax.contribution) },
          ]}
          receives={comparison.pay_tax.receives}
          total={formatRange(comparison.pay_tax.total_outlay)}
        />
        <Column
          title="B. Patrocinar"
          rows={[
            {
              label: "Imposto recolhido ao Tesouro (DARF)",
              value: formatRange(comparison.sponsor.tax_paid),
            },
            { label: "Aporte ao projeto", value: formatBRL(comparison.sponsor.contribution) },
            ...(pj && !isZero(comparison.operating_savings)
              ? [
                  {
                    label: "Economia como despesa operacional",
                    value: `- ${formatRange(comparison.operating_savings)}`,
                  },
                ]
              : []),
          ]}
          receives={comparison.sponsor.receives}
          total={formatRange(comparison.sponsor.total_outlay)}
        />
      </div>
      <p
        className={`rounded-lg p-4 text-lg font-semibold ${zero ? "bg-sand" : "border-border border"}`}
      >
        Custo adicional de patrocinar:{" "}
        <span className="tabular">{formatRange(comparison.net_cost)}</span>
        {zero
          ? ""
          : ` (dedução de ${formatBRL(comparison.deduction)} sobre ${formatBRL(comparison.amount)})`}
      </p>
      {comparison.over_cap ? (
        <Notice kind="warning">
          <p>{renderText("over_cap", { teto: formatBRL(comparison.cap) })}</p>
        </Notice>
      ) : null}
      {comparison.notes
        .filter((key) => key !== "over_cap")
        .map((key) => (
          <p key={key} className="text-muted-foreground text-[14px] leading-snug">
            {renderText(key, {
              economia_min: formatBRL(comparison.operating_savings.min),
              economia_max: formatBRL(
                comparison.operating_savings.max ?? comparison.operating_savings.min,
              ),
              teto: formatBRL(comparison.cap),
            })}
          </p>
        ))}
    </div>
  );
}

function LicRsComparison({ lic }: { lic: LicRsModule }) {
  const c = lic.comparison;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Column
          title="A. Pagar o ICMS"
          rows={[
            { label: "ICMS recolhido ao Estado", value: formatBRL(c.pay_tax.icms_paid) },
            { label: "Aporte ao projeto", value: formatBRL(c.pay_tax.contribution) },
          ]}
          receives={["Nada além da quitação do ICMS"]}
          total={formatBRL(c.pay_tax.total_outlay)}
        />
        <Column
          title="B. Patrocinar pela LIC-RS"
          rows={[
            {
              label: "ICMS recolhido ao Estado (após o crédito)",
              value: formatBRL(c.sponsor.icms_paid),
            },
            { label: "Aporte ao projeto", value: formatBRL(c.sponsor.contribution) },
            {
              label: "Repasse ao FAC (custo não incentivado)",
              value: formatBRL(c.sponsor.fac_transfer),
            },
            { label: "Crédito de ICMS na GIA", value: `- ${formatBRL(c.sponsor.icms_credit)}` },
          ]}
          receives={[
            "Patrocínio a projeto cultural no RS",
            "Contrapartidas do projeto",
            "Carta de Habilitação de Patrocínio",
          ]}
          total={formatBRL(c.sponsor.total_outlay)}
        />
      </div>
      <p className="border-border rounded-lg border p-4 text-lg font-semibold">
        Custo adicional de patrocinar: <span className="tabular">{formatBRL(lic.net_cost)}</span>{" "}
        <span className="text-muted-foreground text-[15px] font-normal">(o repasse ao FAC)</span>
      </p>
      {lic.over_cap ? (
        <Notice kind="warning">
          <p>{renderText("over_cap", { teto: formatBRL(lic.annual_limit) })}</p>
        </Notice>
      ) : null}
    </div>
  );
}

export function ComparisonBlock({ input, result }: Props) {
  const tabs = comparisonTabs(result);
  const initial = tabs.includes(result.featured_mechanism)
    ? result.featured_mechanism
    : (tabs[0] ?? "rouanet_art18");
  const [tab, setTab] = useState<SimulatorMechanismKey>(initial);
  const defaultAmount = useMemo(() => {
    const cap =
      tab === "lic_rs"
        ? result.lic_rs?.applied
        : result.comparison && result.comparison.mechanism === tab
          ? result.comparison.amount
          : result.limits?.mechanisms.find((m) => m.key === tab)?.contribution_for_cap.min;
    return cap != null ? formatCurrencyInput(String(cap)) : "";
  }, [tab, result]);
  const [amounts, setAmounts] = useState<Partial<Record<SimulatorMechanismKey, string>>>({});
  const amountText = amounts[tab] ?? defaultAmount;
  const amount = parseCurrencyBR(amountText);
  const amountError =
    amountText !== "" && (amount === null || amount <= 0)
      ? "Informe um valor em reais maior que zero, por exemplo 10.000,00."
      : undefined;

  const federal = useMemo(() => {
    if (tab === "lic_rs" || amountError) return null;
    return compareScenario(result, tab, amount ?? null);
  }, [tab, amount, amountError, result]);

  const lic = useMemo(() => {
    if (tab !== "lic_rs" || amountError || input.taxpayer_type !== "pj") return null;
    if (input.icms_prior_year == null) return result.lic_rs;
    return simulateLicRs(input.icms_prior_year, input.lic_rs_segment, amount ?? null);
  }, [tab, amount, amountError, input, result]);

  if (tabs.length === 0 || (!result.base?.exact && !result.lic_rs)) {
    return <p className="site-prose">{renderText("band_notice")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <SimpleTabs
        id="comparacao"
        label="Mecanismo em destaque"
        tabs={tabs.map((key) => ({ value: key, label: mechanismShortLabel(key) }))}
        value={tab}
        onChange={setTab}
      />
      <div {...tabPanelProps("comparacao", tab)} className="flex flex-col gap-5">
        <div className="max-w-sm">
          <CurrencyInput
            name={`aporte_${tab}`}
            label="Aporte ao projeto"
            value={amountText}
            onChange={(value) => setAmounts((prev) => ({ ...prev, [tab]: value }))}
            error={amountError}
            help="Começa no aporte que atinge o teto; edite para ver outro cenário."
          />
        </div>
        {tab === "lic_rs" ? (
          lic ? (
            <LicRsComparison lic={lic} />
          ) : null
        ) : federal ? (
          <FederalComparison comparison={federal} pj={input.taxpayer_type === "pj"} />
        ) : !amountError ? (
          <p className="site-prose">{renderText("band_notice")}</p>
        ) : null}
      </div>
    </div>
  );
}
