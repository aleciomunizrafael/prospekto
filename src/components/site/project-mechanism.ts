// Rótulos públicos dos mecanismos de incentivo (modelo-de-dados.md, 4.6; leis-de-incentivo.md):
// nome curto para o cartão, base legal para a página do projeto, selo "dedução integral" (art. 18
// da Lei Rouanet e art. 1º-A da Lei do Audiovisual) e se o mecanismo aceita aporte de pessoa física.
import type { IncentiveMechanism } from "@/lib/domain/enums";

type MechanismInfo = {
  label: string;
  legalBasis: string;
  // Dedução de 100% do aporte dentro do limite (custo líquido zero para a PJ).
  fullDeduction: boolean;
  acceptsIndividuals: boolean;
  acceptsCompanies: boolean;
};

const ROUANET = "Lei 8.313/1991 (Lei Rouanet)";
const AUDIOVISUAL = "Lei 8.685/1993 (Lei do Audiovisual)";

export const MECHANISM_INFO: Record<IncentiveMechanism, MechanismInfo> = {
  rouanet_art18: {
    label: "Lei Rouanet, art. 18",
    legalBasis: `${ROUANET}, art. 18: dedução integral do aporte, dentro de 4% do IRPJ devido (PJ) ou de 6% do imposto devido (PF).`,
    fullDeduction: true,
    acceptsIndividuals: true,
    acceptsCompanies: true,
  },
  rouanet_art26_patrocinio: {
    label: "Lei Rouanet, art. 26 (patrocínio)",
    legalBasis: `${ROUANET}, art. 26: dedução de 30% do patrocínio (PJ) ou 60% (PF), dentro dos limites de 4% e 6%; o valor pode ser lançado como despesa operacional pela PJ.`,
    fullDeduction: false,
    acceptsIndividuals: true,
    acceptsCompanies: true,
  },
  rouanet_art26_doacao: {
    label: "Lei Rouanet, art. 26 (doação)",
    legalBasis: `${ROUANET}, art. 26: dedução de 40% da doação (PJ) ou 80% (PF), dentro dos limites de 4% e 6%; o valor pode ser lançado como despesa operacional pela PJ.`,
    fullDeduction: false,
    acceptsIndividuals: true,
    acceptsCompanies: true,
  },
  audiovisual_art1: {
    label: "Lei do Audiovisual, art. 1º",
    legalBasis: `${AUDIOVISUAL}, art. 1º: investimento em cotas de produção, dedução dentro de 3% do imposto devido; produto com participação em receita.`,
    fullDeduction: false,
    acceptsIndividuals: true,
    acceptsCompanies: true,
  },
  audiovisual_art1A: {
    label: "Lei do Audiovisual, art. 1º-A",
    legalBasis: `${AUDIOVISUAL}, art. 1º-A: patrocínio com dedução integral do aporte, dentro de 4% do IRPJ devido (PJ) ou de 6% do imposto devido (PF); vigente até 2029 (Lei 15.132/2025).`,
    fullDeduction: true,
    acceptsIndividuals: true,
    acceptsCompanies: true,
  },
  audiovisual_art3: {
    label: "Lei do Audiovisual, art. 3º",
    legalBasis: `${AUDIOVISUAL}, art. 3º: abatimento do imposto retido na remessa ao exterior, aplicado em coprodução.`,
    fullDeduction: false,
    acceptsIndividuals: false,
    acceptsCompanies: true,
  },
  audiovisual_art3A: {
    label: "Lei do Audiovisual, art. 3º-A",
    legalBasis: `${AUDIOVISUAL}, art. 3º-A: abatimento do imposto retido na remessa ao exterior por programadoras e distribuidoras.`,
    fullDeduction: false,
    acceptsIndividuals: false,
    acceptsCompanies: true,
  },
  funcines: {
    label: "Funcines",
    legalBasis: `${AUDIOVISUAL}, art. 41: aquisição de cotas de Funcines, dedução dentro do limite próprio.`,
    fullDeduction: false,
    acceptsIndividuals: true,
    acceptsCompanies: true,
  },
  lic_rs: {
    label: "LIC-RS (ICMS)",
    legalBasis:
      "Lei estadual 13.490/2010 (Lei de Incentivo à Cultura do RS): compensação no ICMS para empresas contribuintes no estado, fora do Simples; não exige lucro real.",
    fullDeduction: false,
    acceptsIndividuals: false,
    acceptsCompanies: true,
  },
  esporte: {
    label: "Lei de Incentivo ao Esporte",
    legalBasis: "Lei 11.438/2006: dedução dentro de 2% do IRPJ devido (PJ) ou 7% em conjunto (PF).",
    fullDeduction: true,
    acceptsIndividuals: true,
    acceptsCompanies: true,
  },
  fia: {
    label: "Fundo da Criança e do Adolescente",
    legalBasis: "Lei 8.069/1990, art. 260: dedução dentro de 1% do IRPJ devido (PJ) ou 6% (PF).",
    fullDeduction: true,
    acceptsIndividuals: true,
    acceptsCompanies: true,
  },
  idoso: {
    label: "Fundo do Idoso",
    legalBasis: "Lei 12.213/2010: dedução dentro de 1% do IRPJ devido (PJ) ou 6% (PF).",
    fullDeduction: true,
    acceptsIndividuals: true,
    acceptsCompanies: true,
  },
  pronon: {
    label: "Pronon",
    legalBasis: "Lei 12.715/2012: dedução dentro de 1% do IRPJ devido (PJ).",
    fullDeduction: true,
    acceptsIndividuals: false,
    acceptsCompanies: true,
  },
  pronas: {
    label: "Pronas/PCD",
    legalBasis: "Lei 12.715/2012: dedução dentro de 1% do IRPJ devido (PJ).",
    fullDeduction: true,
    acceptsIndividuals: false,
    acceptsCompanies: true,
  },
  lic_municipal: {
    label: "Lei municipal de incentivo",
    legalBasis:
      "Lei municipal de incentivo à cultura: renúncia de tributo municipal, conforme o município.",
    fullDeduction: false,
    acceptsIndividuals: false,
    acceptsCompanies: true,
  },
  fsa_brde: {
    label: "FSA/BRDE",
    legalBasis:
      "Fundo Setorial do Audiovisual, operado pelo BRDE: fomento direto, sem aporte de incentivador.",
    fullDeduction: false,
    acceptsIndividuals: false,
    acceptsCompanies: false,
  },
  pnab: {
    label: "PNAB",
    legalBasis:
      "Lei 14.399/2022 (Política Nacional Aldir Blanc): fomento direto, sem aporte de incentivador.",
    fullDeduction: false,
    acceptsIndividuals: false,
    acceptsCompanies: false,
  },
  edital: {
    label: "Edital",
    legalBasis: "Edital público: fomento direto, sem aporte de incentivador.",
    fullDeduction: false,
    acceptsIndividuals: false,
    acceptsCompanies: false,
  },
};

export function mechanismInfo(mechanism: IncentiveMechanism): MechanismInfo {
  return MECHANISM_INFO[mechanism];
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function formatBrl(value: number | null | undefined): string {
  if (value == null) return "a confirmar";
  return brl.format(value);
}

export const PROJECTS_DISCLAIMER =
  "Valores e prazos conforme portaria publicada; sujeitos a atualização.";
