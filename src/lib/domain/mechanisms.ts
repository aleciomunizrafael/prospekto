// Compatibilidade entre o mecanismo do projeto e o do aporte (regra R-9; leis-de-incentivo.md,
// seções 2.2 e 3.1; modelo-de-dados.md, seção 4.6).
import { DIRECT_FUNDING_MECHANISMS, type ContributionType, type IncentiveMechanism } from "./enums";

export function isDirectFunding(mechanism: IncentiveMechanism): boolean {
  return (DIRECT_FUNDING_MECHANISMS as readonly string[]).includes(mechanism);
}

// Mecanismos de aporte aceitos por um projeto com o mecanismo dado.
export function allowedContributionMechanisms(project: IncentiveMechanism): IncentiveMechanism[] {
  if (isDirectFunding(project)) return [];
  if (project === "rouanet_art26_patrocinio" || project === "rouanet_art26_doacao") {
    return ["rouanet_art26_patrocinio", "rouanet_art26_doacao"];
  }
  return [project];
}

// Tipo de aporte exigido pelo mecanismo, quando o mecanismo o fixa.
export function requiredContributionType(mechanism: IncentiveMechanism): ContributionType | null {
  if (mechanism === "rouanet_art26_patrocinio") return "patrocinio";
  if (mechanism === "rouanet_art26_doacao") return "doacao";
  return null;
}

export type MechanismCheck = { ok: true } | { ok: false; reason: string };

export function checkContributionMechanism(
  projectMechanism: IncentiveMechanism,
  contributionMechanism: IncentiveMechanism,
  type: ContributionType,
): MechanismCheck {
  if (isDirectFunding(projectMechanism)) {
    return {
      ok: false,
      reason:
        "Projetos de fomento direto (FSA/BRDE, PNAB, edital) não recebem aporte de incentivador.",
    };
  }
  if (!allowedContributionMechanisms(projectMechanism).includes(contributionMechanism)) {
    return {
      ok: false,
      reason: `O mecanismo ${contributionMechanism} não é compatível com um projeto ${projectMechanism}.`,
    };
  }
  const required = requiredContributionType(contributionMechanism);
  if (required && required !== type) {
    return {
      ok: false,
      reason: `O mecanismo ${contributionMechanism} exige aporte do tipo ${required}.`,
    };
  }
  return { ok: true };
}
