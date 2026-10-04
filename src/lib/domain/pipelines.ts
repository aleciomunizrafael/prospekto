// Pipelines e estágios (personas-e-funis.md, seção 8; modelo-de-dados.md, seção 4.2).
// Constantes em código com CHECK no banco; a Fase 2 promove a tabela por tenant.
import type { LeadSegment } from "./enums";

export const PIPELINES = [
  "patrocinadores",
  "contadores",
  "municipios",
  "projetos",
  "alunos",
] as const;
export type Pipeline = (typeof PIPELINES)[number];

export const STAGES = {
  patrocinadores: [
    "novo",
    "qualificado",
    "diagnostico",
    "proposta",
    "termo",
    "aporte",
    "recibo",
    "renovacao",
    "perdido",
  ],
  contadores: ["novo", "contato", "apresentacao", "parceria", "ativo", "inativo", "perdido"],
  municipios: [
    "novo",
    "contato",
    "diagnostico",
    "proposta",
    "contrato",
    "execucao",
    "encerrado",
    "perdido",
  ],
  projetos: [
    "prospeccao",
    "avaliacao",
    "elaboracao",
    "inscrito",
    "autorizado",
    "captando",
    "execucao",
    "prestacao_contas",
    "encerrado",
    "arquivado",
  ],
  alunos: ["lista_espera", "pesquisado", "inscrito", "aluno", "alumni", "perdido"],
} as const satisfies Record<Pipeline, readonly string[]>;

export type StageOf<P extends Pipeline> = (typeof STAGES)[P][number];
export type Stage = StageOf<Pipeline>;

export const ALL_STAGES: readonly Stage[] = [...new Set(Object.values(STAGES).flat())];

// Estágio terminal de cada pipeline (exige lost_reason; regra R-4).
export const TERMINAL_STAGES = {
  patrocinadores: "perdido",
  contadores: "perdido",
  municipios: "perdido",
  projetos: "arquivado",
  alunos: "perdido",
} as const satisfies Record<Pipeline, Stage>;

// Estágio inicial de cada pipeline (sair dele exige dono e próxima ação; regra R-3).
export const INITIAL_STAGES = {
  patrocinadores: "novo",
  contadores: "novo",
  municipios: "novo",
  projetos: "prospeccao",
  alunos: "lista_espera",
} as const satisfies Record<Pipeline, Stage>;

export const SEGMENT_PIPELINE = {
  PJ: "patrocinadores",
  PF: "patrocinadores",
  CONT: "contadores",
  MUN: "municipios",
  PROP: "projetos",
  ALUNO: "alunos",
} as const satisfies Record<LeadSegment, Pipeline>;

export function pipelineForSegment(segment: LeadSegment): Pipeline {
  return SEGMENT_PIPELINE[segment];
}

export function isPipeline(value: string): value is Pipeline {
  return (PIPELINES as readonly string[]).includes(value);
}

export function isStageOf(pipeline: Pipeline, stage: string): stage is Stage {
  return (STAGES[pipeline] as readonly string[]).includes(stage);
}

export function isTerminalStage(pipeline: Pipeline, stage: string): boolean {
  return TERMINAL_STAGES[pipeline] === stage;
}

export function isInitialStage(pipeline: Pipeline, stage: string): boolean {
  return INITIAL_STAGES[pipeline] === stage;
}

export function stageIndex(pipeline: Pipeline, stage: string): number {
  return (STAGES[pipeline] as readonly string[]).indexOf(stage);
}

// SLA de follow-up em dias úteis (personas-e-funis.md, seção 8). `null` quando o documento
// não fixa prazo em dias (ex.: "quando abrir turma", "contato em janeiro"). `novDec` é o
// prazo que vale em novembro e dezembro quando o documento o diferencia; `dailyFromDec10`
// marca o estágio `aporte`, diário a partir de 10 de dezembro.
// `calendarDays` cobre o único SLA do documento em dias corridos (municipios.contrato: "30 dias",
// sem "úteis"); nesse caso `businessDays` é null e sla.ts soma dias corridos.
export type StageSla = {
  businessDays: number | null;
  calendarDays?: number;
  novDec?: number;
  dailyFromDec10?: boolean;
  note?: string;
};

export const STAGE_SLA: { [P in Pipeline]: Record<StageOf<P>, StageSla> } = {
  patrocinadores: {
    novo: { businessDays: 1 },
    qualificado: { businessDays: 3 },
    diagnostico: { businessDays: 5 },
    proposta: { businessDays: 5, novDec: 2 },
    termo: { businessDays: 3 },
    aporte: { businessDays: 2, dailyFromDec10: true, note: "até a data prevista" },
    recibo: { businessDays: 5, note: "[verificar prazo de emissão por mecanismo]" },
    renovacao: { businessDays: null, note: "contato em janeiro; depois trimestral" },
    perdido: { businessDays: null },
  },
  contadores: {
    novo: { businessDays: 2 },
    contato: { businessDays: 5 },
    apresentacao: { businessDays: 7 },
    parceria: { businessDays: 7 },
    ativo: {
      businessDays: null,
      note: "contato mensal de fevereiro a outubro; quinzenal em novembro e dezembro",
    },
    inativo: { businessDays: null, note: "trimestral" },
    perdido: { businessDays: null },
  },
  municipios: {
    novo: { businessDays: 5 },
    contato: { businessDays: 10 },
    diagnostico: { businessDays: 15 },
    proposta: { businessDays: 15, note: "alinhado a LDO e LOA" },
    contrato: { businessDays: null, calendarDays: 30, note: "30 dias; acompanhar semanalmente" },
    execucao: { businessDays: null, note: "mensal" },
    encerrado: { businessDays: null, note: "contato em janeiro e em julho" },
    perdido: { businessDays: null },
  },
  projetos: {
    prospeccao: { businessDays: 5 },
    avaliacao: { businessDays: 10 },
    elaboracao: { businessDays: 5, note: "semanal; respeitar a janela 1º/02 a 31/10" },
    inscrito: { businessDays: 10, note: "quinzenal; verificar diligências" },
    autorizado: { businessDays: 10 },
    captando: { businessDays: 5, note: "semanal; registrar cada aporte" },
    execucao: { businessDays: null, note: "mensal" },
    prestacao_contas: { businessDays: 5, note: "semanal até a entrega" },
    encerrado: { businessDays: null, note: "anual" },
    arquivado: { businessDays: null },
  },
  alunos: {
    lista_espera: { businessDays: 0, note: "automático" },
    pesquisado: { businessDays: null, note: "quando abrir turma" },
    inscrito: { businessDays: 3 },
    aluno: { businessDays: 5, note: "semanal" },
    alumni: { businessDays: null, note: "trimestral" },
    perdido: { businessDays: null },
  },
};

export function stageSla(pipeline: Pipeline, stage: string): StageSla | undefined {
  return (STAGE_SLA[pipeline] as Record<string, StageSla>)[stage];
}

// Campos obrigatórios por estágio (modelo-de-dados.md, seção 4.2), como dados declarativos.
// `moment`: "entrar" valida ao entrar no estágio; "sair" valida ao deixá-lo.
// `fields` são chaves lidas por src/lib/repos (leads.ts e projects.ts), no formato
// entidade.campo; `*` em pipeline/estágio quer dizer "qualquer".
export type StageMoment = "entrar" | "sair";

export type StageRequirement = {
  pipeline: Pipeline | "*";
  stage: Stage | "*initial" | "*terminal";
  moment: StageMoment;
  fields: readonly string[];
  description: string;
};

export const STAGE_REQUIREMENTS: readonly StageRequirement[] = [
  {
    pipeline: "patrocinadores",
    stage: "proposta",
    moment: "entrar",
    fields: ["contribution.project_id", "contribution.proposed_amount"],
    description: "Uma proposta de aporte com projeto e valor proposto.",
  },
  {
    pipeline: "patrocinadores",
    stage: "termo",
    moment: "entrar",
    fields: [
      "contribution.type",
      "contribution.mechanism",
      "organization.cnpj_when_pj",
      "lead.attributes.vinculo_art27_checado",
    ],
    description:
      "Tipo e mecanismo do aporte, CNPJ da empresa (PJ) e checagem de vínculo do art. 27 (regra R-10).",
  },
  {
    pipeline: "patrocinadores",
    stage: "termo",
    moment: "sair",
    fields: [
      "contribution.term_signed_at",
      "contribution.bank_details_sent_at",
      "contribution.org_id_when_pj",
    ],
    description:
      "Termo assinado, dados da conta vinculada enviados e, para PJ, a empresa patrocinadora (com CNPJ) no aporte; o aporte passa a termo_assinado.",
  },
  {
    pipeline: "patrocinadores",
    stage: "aporte",
    moment: "sair",
    fields: ["contribution.deposited_at", "contribution.deposited_amount"],
    description: "Depósito confirmado com data e valor maior que zero (regra R-6).",
  },
  {
    pipeline: "patrocinadores",
    stage: "recibo",
    moment: "sair",
    fields: [
      "contribution.receipt_number",
      "contribution.receipt_issued_at",
      "contribution.receipt_sent_to_accountant_at",
    ],
    description: "Recibo emitido, datado e enviado ao contador (regra R-7).",
  },
  {
    pipeline: "patrocinadores",
    stage: "renovacao",
    moment: "sair",
    fields: ["contribution.new_proposal"],
    description:
      "Nova proposta de aporte com projeto e valor; a anterior permanece em recibo_emitido.",
  },
  {
    pipeline: "projetos",
    stage: "autorizado",
    moment: "entrar",
    fields: [
      "project.mechanism",
      "project.process_number",
      "project.approved_amount",
      "project.fundraising_deadline",
      "project.fundraising_fee_amount",
    ],
    description: "Mecanismo, número do processo, valor aprovado, prazo e rubrica de captação.",
  },
  {
    pipeline: "projetos",
    stage: "captando",
    moment: "entrar",
    fields: ["project.balance_positive"],
    description: "Saldo a captar maior que zero (approved_amount - raised_amount).",
  },
  {
    pipeline: "projetos",
    stage: "prestacao_contas",
    moment: "entrar",
    fields: ["project.report_due_at"],
    description: "Data limite do relatório de prestação de contas.",
  },
  {
    pipeline: "*",
    stage: "*terminal",
    moment: "entrar",
    fields: ["lost_reason"],
    description: "Motivo de perda; `outro` exige detalhe (regra R-4).",
  },
  {
    pipeline: "*",
    stage: "*initial",
    moment: "sair",
    fields: ["owner_user_id", "next_action_at"],
    description: "Dono do lead e data da próxima ação (regra R-3).",
  },
];

// Requisitos aplicáveis a um movimento (from -> to) em um pipeline.
export function requirementsForMove(
  pipeline: Pipeline,
  from: string,
  to: string,
): StageRequirement[] {
  const matches = (r: StageRequirement, stage: string) => {
    if (r.pipeline !== "*" && r.pipeline !== pipeline) return false;
    if (r.stage === "*initial") return isInitialStage(pipeline, stage);
    if (r.stage === "*terminal") return isTerminalStage(pipeline, stage);
    return r.stage === stage;
  };
  return STAGE_REQUIREMENTS.filter(
    (r) => (r.moment === "sair" && matches(r, from)) || (r.moment === "entrar" && matches(r, to)),
  );
}
