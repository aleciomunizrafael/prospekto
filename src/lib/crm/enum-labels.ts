// Rótulos em português dos enums e estágios para as telas do CRM (modelo-de-dados.md, seção 4;
// personas-e-funis.md, seção 8). Valores do banco ficam em inglês/sem acento; a Daniela vê isto.
import type {
  ContributionStatus,
  ContributionType,
  IncentiveMechanism,
  LeadSegment,
  LostReason,
  OrganizationType,
  RegimeConfirmation,
  TaxRegime,
} from "@/lib/domain/enums";
import type { Pipeline, Stage } from "@/lib/domain/pipelines";

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

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  sem_irpj: "Sem IRPJ a pagar",
  regime_inelegivel: "Regime tributário inelegível",
  sem_decisor: "Sem acesso ao decisor",
  sem_interesse: "Sem interesse",
  prazo_perdido: "Prazo perdido",
  escolheu_outro_captador: "Escolheu outro captador",
  escolheu_outro_incentivo: "Escolheu outro incentivo",
  vinculo_art27: "Vínculo com o proponente (art. 27)",
  vantagem_indevida: "Pedido de vantagem indevida",
  sem_resposta: "Sem resposta",
  outro: "Outro (detalhar)",
};

export const SEGMENT_LABELS: Record<LeadSegment, string> = {
  PJ: "Empresa (PJ)",
  PF: "Pessoa física (PF)",
  CONT: "Contador",
  MUN: "Município",
  PROP: "Proponente",
  ALUNO: "Aluno",
};

export const PIPELINE_LABELS: Record<Pipeline, string> = {
  patrocinadores: "Patrocinadores",
  contadores: "Contadores",
  municipios: "Municípios",
  projetos: "Projetos",
  alunos: "Alunos",
};

export const STAGE_LABELS: Record<Stage, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  diagnostico: "Diagnóstico",
  proposta: "Proposta",
  termo: "Termo",
  aporte: "Aporte",
  recibo: "Recibo",
  renovacao: "Renovação",
  perdido: "Perdido",
  contato: "Contato",
  apresentacao: "Apresentação",
  parceria: "Parceria",
  ativo: "Ativo",
  inativo: "Inativo",
  contrato: "Contrato",
  execucao: "Execução",
  encerrado: "Encerrado",
  prospeccao: "Prospecção",
  avaliacao: "Avaliação",
  elaboracao: "Elaboração",
  inscrito: "Inscrito",
  autorizado: "Autorizado",
  captando: "Captando",
  prestacao_contas: "Prestação de contas",
  arquivado: "Arquivado",
  lista_espera: "Lista de espera",
  pesquisado: "Pesquisado",
  aluno: "Aluno",
  alumni: "Alumni",
};

export function stageLabel(stage: string): string {
  return (STAGE_LABELS as Record<string, string>)[stage] ?? stage;
}

export function mechanismLabel(mechanism: string | null | undefined): string {
  if (!mechanism) return "";
  return (MECHANISM_LABELS as Record<string, string>)[mechanism] ?? mechanism;
}

export function optionsFrom<T extends string>(
  labels: Record<T, string>,
): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
