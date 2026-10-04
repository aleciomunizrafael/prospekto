// Limites da remuneração de captação (regra R-8; IN MinC 29/2026, art. 19, via leis-de-incentivo.md,
// seção 2.8), lidos de docs/dominio/parametros-simulador.json (`captacao`).
//
// Bloqueantes: 10% do valor depositado e a rubrica de captação aprovada no projeto.
// Aviso (não bloqueia): soma por projeto acima de R$ 150.000,00, por ano em planos plurianuais.
// Os limites valem para mecanismos Rouanet; para `lic_rs` o JSON está em "verificar" (percentual
// null) e para os demais mecanismos não há limite conhecido: nesses casos só se emite um aviso.
import type { IncentiveMechanism } from "./enums";
import params from "../../../docs/dominio/parametros-simulador.json";

const rouanet = params.captacao.rouanet;
const licRs = params.captacao.lic_rs;

export const ROUANET_MECHANISMS = [
  "rouanet_art18",
  "rouanet_art26_patrocinio",
  "rouanet_art26_doacao",
] as const satisfies readonly IncentiveMechanism[];

export type CommissionLimits = {
  // Percentual máximo sobre o valor depositado; null = não verificado (sem limite aplicado).
  maxPercent: number | null;
  // Teto da soma por projeto (e por ano, em planos plurianuais); null = sem teto conhecido.
  capPerProject: number | null;
  capIsPerYearInMultiYearPlans: boolean;
  // "verificado" ou "verificar", como no JSON.
  status: string;
};

export const ROUANET_COMMISSION_LIMITS: CommissionLimits = {
  maxPercent: rouanet.remuneracao_captacao_percentual_max,
  capPerProject: rouanet.remuneracao_captacao_teto_reais,
  capIsPerYearInMultiYearPlans: rouanet.teto_por_ano_em_plano_plurianual,
  status: rouanet.status,
};

export const LIC_RS_COMMISSION_LIMITS: CommissionLimits = {
  maxPercent: licRs.remuneracao_captacao_percentual_max,
  capPerProject: null,
  capIsPerYearInMultiYearPlans: false,
  status: licRs.status,
};

export function isRouanetMechanism(mechanism: IncentiveMechanism): boolean {
  return (ROUANET_MECHANISMS as readonly string[]).includes(mechanism);
}

// Limites aplicáveis ao mecanismo do projeto; null quando o documento não traz nenhum.
export function commissionLimitsFor(mechanism: IncentiveMechanism): CommissionLimits | null {
  if (isRouanetMechanism(mechanism)) return ROUANET_COMMISSION_LIMITS;
  if (mechanism === "lic_rs") return LIC_RS_COMMISSION_LIMITS;
  return null;
}

export type CommissionCheckInput = {
  // Mecanismo do projeto (cultural_projects.mechanism): define quais limites valem.
  mechanism: IncentiveMechanism;
  // Valor efetivamente depositado do aporte sobre o qual a comissão incide.
  depositedAmount: number;
  // Comissão que se pretende registrar para este aporte.
  commissionDue: number;
  // Soma das comissões já registradas nos demais aportes do mesmo projeto, sem este aporte
  // (comparada à rubrica de captação).
  projectCommissionSoFar?: number;
  // Soma das comissões dos demais aportes do projeto no mesmo ano de depósito (comparada ao
  // teto, que é por ano em planos plurianuais). Ausente = usa projectCommissionSoFar.
  periodCommissionSoFar?: number;
  // Rubrica de captação aprovada no projeto (`cultural_projects.fundraising_fee_amount`); opcional.
  fundraisingFeeAmount?: number | null;
  // Percentual contratado com o proponente (`cultural_projects.commission_pct`); opcional.
  contractedPercent?: number | null;
};

export type CommissionWarningCode = "cap" | "unverified_limits";

export type CommissionWarning = { code: CommissionWarningCode; message: string };

export type CommissionCheckResult = {
  projectCommissionTotal: number;
  periodCommissionTotal: number;
  warnings: CommissionWarning[];
};

export class CommissionLimitError extends Error {
  readonly code: "percent" | "fee" | "contract" | "input";
  constructor(code: CommissionLimitError["code"], message: string) {
    super(message);
    this.name = "CommissionLimitError";
    this.code = code;
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function brl(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

// Comissão máxima pelo percentual do mecanismo; null quando o mecanismo não tem percentual conhecido.
export function maxCommissionFor(
  depositedAmount: number,
  mechanism: IncentiveMechanism = "rouanet_art18",
): number | null {
  const limits = commissionLimitsFor(mechanism);
  if (limits?.maxPercent == null) return null;
  return round2((depositedAmount * limits.maxPercent) / 100);
}

// Lança CommissionLimitError quando a comissão viola um limite bloqueante; devolve as somas
// resultantes e os avisos (teto de R$ 150 mil, limites não verificados).
export function assertCommissionWithinLimits(input: CommissionCheckInput): CommissionCheckResult {
  const { depositedAmount, commissionDue, mechanism } = input;
  if (!Number.isFinite(depositedAmount) || depositedAmount < 0) {
    throw new CommissionLimitError("input", "Valor depositado inválido.");
  }
  if (!Number.isFinite(commissionDue) || commissionDue < 0) {
    throw new CommissionLimitError(
      "input",
      "Comissão inválida: informe um valor maior ou igual a zero.",
    );
  }
  const warnings: CommissionWarning[] = [];
  const limits = commissionLimitsFor(mechanism);

  if (limits?.maxPercent != null) {
    const maxByPercent = round2((depositedAmount * limits.maxPercent) / 100);
    if (commissionDue > maxByPercent + 0.005) {
      throw new CommissionLimitError(
        "percent",
        `Comissão de ${brl(commissionDue)} excede ${limits.maxPercent}% do valor depositado (máximo ${brl(maxByPercent)}).`,
      );
    }
  } else {
    warnings.push({
      code: "unverified_limits",
      message: `Os limites de remuneração de captação para ${mechanism} ainda não foram verificados; confira o edital ou a norma antes de cobrar.`,
    });
  }

  if (input.contractedPercent != null) {
    const maxByContract = round2((depositedAmount * input.contractedPercent) / 100);
    if (commissionDue > maxByContract + 0.005) {
      throw new CommissionLimitError(
        "contract",
        `Comissão excede o percentual contratado de ${input.contractedPercent}% (máximo ${brl(maxByContract)}).`,
      );
    }
  }

  const projectCommissionTotal = round2((input.projectCommissionSoFar ?? 0) + commissionDue);
  if (
    input.fundraisingFeeAmount != null &&
    projectCommissionTotal > input.fundraisingFeeAmount + 0.005
  ) {
    throw new CommissionLimitError(
      "fee",
      `A soma das comissões do projeto (${brl(projectCommissionTotal)}) excede a rubrica de captação aprovada (${brl(input.fundraisingFeeAmount)}).`,
    );
  }

  const periodCommissionTotal = round2(
    (input.periodCommissionSoFar ?? input.projectCommissionSoFar ?? 0) + commissionDue,
  );
  if (limits?.capPerProject != null && periodCommissionTotal > limits.capPerProject + 0.005) {
    warnings.push({
      code: "cap",
      message: `A soma das comissões do projeto no ano (${brl(periodCommissionTotal)}) passa do teto de ${brl(limits.capPerProject)} por projeto${limits.capIsPerYearInMultiYearPlans ? " (por ano, em planos plurianuais)" : ""}; confira o plano antes de cobrar.`,
    });
  }

  return { projectCommissionTotal, periodCommissionTotal, warnings };
}
