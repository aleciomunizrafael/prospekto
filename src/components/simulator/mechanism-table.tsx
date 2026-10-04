import {
  formatBRL,
  formatPercent,
  formatRange,
  renderText,
  type LimitsBlock,
  type MechanismRow,
  type TaxpayerType,
} from "@/lib/simulator";
import { basketPercent } from "./view-model";

// Bloco 3 da tela 4 (simulador-spec.md, 5.2): tabela por mecanismo. No celular vira uma lista de
// cartões, um por mecanismo, com o teto em destaque e "ver detalhes" para as demais colunas.
type Props = {
  limits: LimitsBlock;
  taxpayerType: TaxpayerType;
  id: string;
};

function yesNo(value: boolean): string {
  return value ? "Sim" : "Não";
}

function sharesLabel(row: MechanismRow, pj: boolean): string {
  if (row.key === "audiovisual_art1") return "Sim (limite 3%)";
  if (row.key === "esporte" && pj) return "Não (inclusão social: sim)";
  return yesNo(row.shares_cultural_basket);
}

function netCost(row: MechanismRow): string {
  if (row.net_cost_at_cap.min === 0 && row.net_cost_at_cap.max === 0) return formatBRL(0);
  return formatRange(row.net_cost_at_cap);
}

export function MechanismTable({ limits, taxpayerType, id }: Props) {
  const pj = taxpayerType === "pj";
  const basketLabel = `Compartilha a cesta de ${formatPercent(basketPercent(limits, taxpayerType))}?`;
  return (
    <div className="flex flex-col gap-4">
      <p className="site-prose">{renderText(pj ? "basket_pj" : "pf_basket")}</p>

      <ul className="flex flex-col gap-3 md:hidden" aria-label="Limite por mecanismo">
        {limits.mechanisms.map((row) => (
          <li
            key={row.key}
            className={`border-border rounded-lg border p-4 ${row.highlighted ? "border-primary border-2" : ""}`}
          >
            <p className="font-semibold">{row.name}</p>
            <p className="text-muted-foreground text-[14px]">{row.legal_basis}</p>
            <p className="tabular mt-2 text-xl font-semibold">
              Teto: {formatRange(row.limit)}{" "}
              <span className="text-muted-foreground text-[14px] font-normal">
                ({formatPercent(row.effective_percent)})
              </span>
            </p>
            <details className="mt-2 text-[15px]">
              <summary className="text-primary touch-target cursor-pointer underline underline-offset-4">
                Ver detalhes
              </summary>
              <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Dedução por R$ 1 aportado</dt>
                <dd className="tabular text-right">{formatBRL(row.deduction_per_real)}</dd>
                <dt className="text-muted-foreground">Aporte para atingir o teto</dt>
                <dd className="tabular text-right">{formatRange(row.contribution_for_cap)}</dd>
                <dt className="text-muted-foreground">Custo líquido no teto</dt>
                <dd className="tabular text-right">{netCost(row)}</dd>
                {pj ? (
                  <>
                    <dt className="text-muted-foreground">Despesa operacional</dt>
                    <dd className="text-right">{yesNo(row.operating_expense)}</dd>
                  </>
                ) : null}
                {row.in_declaration_limit ? (
                  <>
                    <dt className="text-muted-foreground">Na própria declaração (até 3%)</dt>
                    <dd className="tabular text-right">{formatRange(row.in_declaration_limit)}</dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground">{basketLabel}</dt>
                <dd className="text-right">{sharesLabel(row, pj)}</dd>
                <dt className="text-muted-foreground">Status do parâmetro</dt>
                <dd className="text-right">
                  {row.status === "verificado" ? "verificado" : "[verificar]"}
                </dd>
              </dl>
            </details>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table id={id} className="w-full text-[14px]">
          <caption className="sr-only">Limite de dedução por mecanismo</caption>
          <thead>
            <tr className="bg-sand text-left align-bottom">
              <th scope="col" className="p-2 font-semibold">
                Mecanismo
              </th>
              <th scope="col" className="p-2 font-semibold">
                Base legal
              </th>
              <th scope="col" className="p-2 font-semibold">
                Teto (R$)
              </th>
              <th scope="col" className="p-2 font-semibold">
                Dedução por R$ 1 aportado
              </th>
              <th scope="col" className="p-2 font-semibold">
                Aporte para atingir o teto
              </th>
              <th scope="col" className="p-2 font-semibold">
                Custo líquido no teto
              </th>
              {pj ? (
                <th scope="col" className="p-2 font-semibold">
                  Despesa operacional
                </th>
              ) : (
                <th scope="col" className="p-2 font-semibold">
                  Na própria declaração
                </th>
              )}
              <th scope="col" className="p-2 font-semibold">
                {basketLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {limits.mechanisms.map((row) => (
              <tr
                key={row.key}
                className={`border-border border-b align-top ${row.highlighted ? "bg-sand/60" : ""}`}
              >
                <th scope="row" className="p-2 text-left font-medium">
                  {row.name}
                  {row.status === "verificar" ? (
                    <span className="text-muted-foreground block text-[12px] font-normal">
                      [verificar]
                    </span>
                  ) : null}
                </th>
                <td className="p-2">{row.legal_basis}</td>
                <td className="tabular p-2">
                  {formatRange(row.limit)}
                  <span className="text-muted-foreground block text-[12px]">
                    {formatPercent(row.effective_percent)}
                  </span>
                </td>
                <td className="tabular p-2">{formatBRL(row.deduction_per_real)}</td>
                <td className="tabular p-2">{formatRange(row.contribution_for_cap)}</td>
                <td className="tabular p-2">{netCost(row)}</td>
                {pj ? (
                  <td className="p-2">{yesNo(row.operating_expense)}</td>
                ) : (
                  <td className="tabular p-2">
                    {row.in_declaration_limit
                      ? `até ${formatRange(row.in_declaration_limit)}`
                      : "Não"}
                  </td>
                )}
                <td className="p-2">{sharesLabel(row, pj)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="grid gap-2 text-[15px] sm:grid-cols-2">
        {limits.groups.map((group) => (
          <div
            key={group.key}
            className="border-border flex justify-between gap-4 rounded-lg border p-3"
          >
            <dt>
              {group.label}{" "}
              <span className="text-muted-foreground">
                ({formatPercent(group.effective_percent)})
              </span>
            </dt>
            <dd className="tabular font-medium">{formatRange(group.limit)}</dd>
          </div>
        ))}
        <div className="bg-sand flex justify-between gap-4 rounded-lg p-3 sm:col-span-2">
          <dt className="font-semibold">Total dos incentivos</dt>
          <dd className="tabular font-semibold">{formatRange(limits.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
