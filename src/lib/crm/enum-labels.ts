// Rótulos em português dos enums e estágios para as telas do CRM (modelo-de-dados.md, seção 4;
// personas-e-funis.md, seção 8). Valores do banco ficam em inglês/sem acento; a Daniela vê isto.
import type {
  ContributionStatus,
  ContributionType,
  IncentiveMechanism,
  OrganizationType,
  RegimeConfirmation,
  TaxRegime,
} from "@/lib/domain/enums";

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  empresa: "Empresa",
  contabilidade: "Escritório contábil",
  municipio: "Município",
  proponente: "Proponente",
  outro: "Outro",
};

export const TAX_REGIME_LABELS: Record<TaxRegime, string> = {
  lucro_real: "Lucro real",
  lucro_presumido: "Lucro presumido",
  lucro_arbitrado: "Lucro arbitrado",
  simples_nacional: "Simples Nacional",
  nao_sei: "Não sei",
};

export const REGIME_CONFIRMATION_LABELS: Record<RegimeConfirmation, string> = {
  contador: "Confirmado pelo contador",
  ecf: "Confirmado pela ECF",
  declarado: "Declarado pelo lead",
};

export const MECHANISM_LABELS: Record<IncentiveMechanism, string> = {
  rouanet_art18: "Rouanet, art. 18 (100%)",
  rouanet_art26_patrocinio: "Rouanet, art. 26, patrocínio",
  rouanet_art26_doacao: "Rouanet, art. 26, doação",
  audiovisual_art1: "Lei do Audiovisual, art. 1º",
  audiovisual_art1A: "Lei do Audiovisual, art. 1º-A",
  audiovisual_art3: "Lei do Audiovisual, art. 3º",
  audiovisual_art3A: "Lei do Audiovisual, art. 3º-A",
  funcines: "Funcines",
  lic_rs: "LIC-RS (Pró-Cultura RS)",
  esporte: "Lei de Incentivo ao Esporte",
  fia: "FIA (criança e adolescente)",
  idoso: "Fundo do Idoso",
  pronon: "Pronon",
  pronas: "Pronas/PCD",
  lic_municipal: "Lei municipal de incentivo",
  fsa_brde: "FSA/BRDE (fomento direto)",
  pnab: "PNAB (fomento direto)",
  edital: "Edital (fomento direto)",
};

export const CONTRIBUTION_TYPE_LABELS: Record<ContributionType, string> = {
  patrocinio: "Patrocínio",
  doacao: "Doação",
};

export const CONTRIBUTION_STATUS_LABELS: Record<ContributionStatus, string> = {
  proposta: "Proposta",
  termo_assinado: "Termo assinado",
  depositado: "Depositado",
  recibo_emitido: "Recibo emitido",
  cancelado: "Cancelado",
};

// Rótulos compartilhados com as telas de leads: uma fonte só (src/lib/crm/labels.ts), para o mesmo
// segmento ou motivo não aparecer com texto diferente em leads, projetos e aportes.
export {
  LOST_REASON_LABELS,
  PIPELINE_LABELS,
  SEGMENT_LABELS,
  STAGE_LABELS,
  stageLabel,
} from "./labels";

export function mechanismLabel(mechanism: string | null | undefined): string {
  if (!mechanism) return "";
  return (MECHANISM_LABELS as Record<string, string>)[mechanism] ?? mechanism;
}

export function optionsFrom<T extends string>(
  labels: Record<T, string>,
): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
