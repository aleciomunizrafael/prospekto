import { formatBRL, formatPercent, renderText, type LicRsModule } from "@/lib/simulator";
import { Notice } from "./notice";

// Bloco 5 da tela 4 (simulador-spec.md, 4.7 e 5.2): LIC-RS, quando aplicável. Limite anual,
// repasse ao FAC, desembolso total e crédito de ICMS.
export function LicRsBlock({ lic }: { lic: LicRsModule }) {
  if (lic.status === "no_tax") {
    return (
      <Notice kind="warning" title="Sem ICMS no ano anterior">
        <p>{renderText("no_icms")}</p>
      </Notice>
    );
  }
  const rows = [
    { label: "ICMS próprio pago no ano anterior", value: formatBRL(lic.icms_prior_year) },
    {
      label: lic.band
        ? `Faixa: ${formatPercent(lic.band.percent)} do ICMS${lic.band.increment ? ` mais ${formatBRL(lic.band.increment)}` : ""}`
        : "Faixa",
      value: "",
    },
    { label: "Limite anual na LIC-RS", value: formatBRL(lic.annual_limit) },
    { label: "Aporte considerado", value: formatBRL(lic.applied) },
    {
      label: `Repasse ao FAC (${formatPercent(lic.fac_percent)}, custo não incentivado)`,
      value: formatBRL(lic.fac_transfer),
    },
    { label: "Desembolso total", value: formatBRL(lic.total_outlay) },
    { label: "Crédito de ICMS na GIA", value: formatBRL(lic.icms_credit) },
    { label: "Custo líquido", value: formatBRL(lic.net_cost) },
  ].filter((row) => row.value !== "" || row.label.startsWith("Faixa"));
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-[1fr_auto]">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="tabular font-medium sm:text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-[14px]">Base legal: {lic.legal_basis}.</p>
      {lic.over_cap ? (
        <Notice kind="warning">
          <p>{renderText("over_cap", { teto: formatBRL(lic.annual_limit) })}</p>
        </Notice>
      ) : null}
      <Notice kind="warning">
        <p>{renderText("lic_rs_notice")}</p>
      </Notice>
    </div>
  );
}
