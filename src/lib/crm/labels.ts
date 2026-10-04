// Rótulos em português dos enums e estágios para as telas do CRM (proposta-c, seção 9.1:
// "valor do enum traduzido"). Valores literais do banco continuam nos exports CSV.
import type {
  ActivityType,
  ConsentPurpose,
  LeadInterest,
  LeadSegment,
  LeadSource,
  LeadTemperature,
  LostReason,
} from "@/lib/domain/enums";
import type { Pipeline, Stage } from "@/lib/domain/pipelines";
import { AVAILABILITY_LABELS } from "@/lib/validation/forms/diagnostico-options";

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

export const SEGMENT_LABELS: Record<LeadSegment, string> = {
  PJ: "Empresa (PJ)",
  PF: "Pessoa física",
  CONT: "Contador",
  MUN: "Município",
  PROP: "Proponente",
  ALUNO: "Aluno",
};

export const TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
  frio: "Frio",
  morno: "Morno",
  quente: "Quente",
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  site: "Site",
  guia: "Guia",
  simulador: "Simulador",
  diagnostico: "Diagnóstico",
  linkedin: "LinkedIn",
  indicacao_contador: "Indicação de contador",
  indicacao_cliente: "Indicação de cliente",
  evento: "Evento",
  campanha: "Campanha",
  whatsapp: "WhatsApp",
  outro: "Outro",
};

export const INTEREST_LABELS: Record<LeadInterest, string> = {
  rouanet: "Lei Rouanet",
  audiovisual: "Lei do Audiovisual",
  lic_rs: "LIC-RS",
  lic_municipal: "Lei municipal",
  pnab_editais: "PNAB e editais",
  consultoria: "Consultoria",
  mentoria: "Mentoria",
  nao_sei: "Não sabe ainda",
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
  outro: "Outro",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  ligacao: "Ligação",
  reuniao: "Reunião",
  email: "E-mail",
  whatsapp: "WhatsApp",
  visita: "Visita",
  nota: "Nota",
  tarefa: "Tarefa",
  formulario: "Formulário",
  download: "Download",
  sistema: "Sistema",
};

export const CONSENT_PURPOSE_LABELS: Record<ConsentPurpose, string> = {
  contato_comercial: "Contato comercial",
  marketing: "Marketing",
};

export const CONSENT_CHANNEL_LABELS: Record<string, string> = {
  email: "e-mail",
  whatsapp: "WhatsApp",
  telefone: "telefone",
};

// Tipos de reunião do formulário "Registrar atividade" (estrutura-e-copy.md, seção 5.6).
export const MEETING_KINDS = [
  { value: "simulacao", label: "Simulação (20 min)" },
  { value: "diagnostico", label: "Diagnóstico com o contador (30 min)" },
  { value: "ligacao_pf", label: "Ligação com pessoa física (15 min)" },
] as const;
export type MeetingKind = (typeof MEETING_KINDS)[number]["value"];

// Valores de enum de `attributes` (personas-e-funis.md, seção 9.3), traduzidos para a tela.
export const ATTRIBUTE_VALUE_LABELS: Record<string, string> = {
  dono_ou_socio: "Dono ou sócio",
  financeiro: "Financeiro",
  contabilidade: "Contabilidade",
  marketing_esg: "Marketing ou ESG",
  outro: "Outro",
  lucro_real: "Lucro real",
  lucro_presumido: "Lucro presumido",
  lucro_arbitrado: "Lucro arbitrado",
  simples_nacional: "Simples Nacional",
  simples: "Simples Nacional",
  nao_sei: "Não sabe",
  contador: "Pelo contador",
  ecf: "Pela ECF",
  declarado: "Declarado pelo lead",
  ate_100k: "Até R$ 100 mil",
  "100k_500k": "R$ 100 mil a R$ 500 mil",
  "500k_2500k": "R$ 500 mil a R$ 2,5 milhões",
  acima_2500k: "Acima de R$ 2,5 milhões",
  trimestral: "Trimestral",
  anual: "Anual",
  nenhum: "Nenhum",
  cultura: "Cultura",
  esporte: "Esporte",
  fia_idoso: "FIA ou Idoso",
  outros: "Outros",
  completa: "Completa",
  simplificada: "Simplificada",
  ate_20k: "Até R$ 20 mil",
  "20k_80k": "R$ 20 mil a R$ 80 mil",
  acima_80k: "Acima de R$ 80 mil",
  saude: "Saúde",
  juridico: "Jurídico",
  executivo: "Executivo",
  empresario: "Empresário",
  socio: "Sócio",
  gerente_fiscal: "Gerente fiscal",
  analista: "Analista",
  "1_4": "1 a 4",
  "5_19": "5 a 19",
  "20_mais": "20 ou mais",
  secretario: "Secretário",
  diretor: "Diretor",
  tecnico: "Técnico",
  prefeito_gabinete: "Prefeito ou gabinete",
  conselho: "Conselho",
  ciclo_ativo: "Ciclo ativo",
  saldo_a_executar: "Saldo a executar",
  nao_aderiu: "Não aderiu",
  sim: "Sim",
  nao: "Não",
  em_tramitacao: "Em tramitação",
  editais: "Editais",
  prestacao_contas: "Prestação de contas",
  projetos_proprios: "Projetos próprios",
  lei_incentivo: "Lei de incentivo",
  capacitacao: "Capacitação",
  pf: "Pessoa física",
  mei: "MEI",
  pj: "Pessoa jurídica",
  ...AVAILABILITY_LABELS,
  instituicao: "Instituição",
  municipio: "Município",
  rouanet: "Lei Rouanet",
  audiovisual: "Lei do Audiovisual",
  lic_rs: "LIC-RS",
  lic_municipal: "Lei municipal",
  pnab: "PNAB",
  ideia: "Ideia",
  em_elaboracao: "Em elaboração",
  inscrito: "Inscrito",
  aprovado_captando: "Aprovado e captando",
  em_execucao: "Em execução",
  nunca_teve: "Nunca teve",
  aprovada: "Aprovada",
  pendente: "Pendente",
  reprovada: "Reprovada",
  primeiro_projeto: "Escrever o primeiro projeto",
  captar: "Captar",
  profissao: "Fazer disso profissão",
  atualizar: "Atualizar-se",
  nenhuma: "Nenhuma",
  ja_escrevi: "Já escrevi projeto",
  ja_captei: "Já captei",
  atuo_em_secretaria: "Atuo em secretaria",
};

export function stageLabel(stage: string): string {
  return (STAGE_LABELS as Record<string, string>)[stage] ?? stage;
}

export function pipelineLabel(pipeline: string): string {
  return (PIPELINE_LABELS as Record<string, string>)[pipeline] ?? pipeline;
}

export function enumLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "não informado";
  if (typeof value === "boolean") return value ? "sim" : "não";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return ATTRIBUTE_VALUE_LABELS[value] ?? value;
  return JSON.stringify(value);
}

// Tags gravadas pelos formulários e pela triagem (personas-e-funis.md, seção 9); `projeto:[slug]`
// vira "Projeto: slug". Texto cru quando não há rótulo.
export const TAG_LABELS: Record<string, string> = {
  contador_na_reuniao: "Contador na reunião",
  desqualificado_rouanet: "Desqualificado para Rouanet",
  fora_do_icp: "Fora do ICP",
  sem_projeto: "Sem projeto",
  triagem: "Triagem",
  avisar_projetos: "Avisar sobre projetos",
  webinar: "Webinar",
};

export function tagLabel(tag: string): string {
  if (tag.startsWith("projeto:")) return `Projeto: ${tag.slice("projeto:".length)}`;
  return TAG_LABELS[tag] ?? tag;
}
