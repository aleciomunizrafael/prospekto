// Listas e rótulos do formulário municipios, sem zod: os componentes "use client" importam daqui para o
// pacote zod não ir ao navegador (tests/lint.test.ts); o schema em municipios.ts importa e reexporta.
export const MUNICIPALITY_BODIES = ["secretaria", "diretoria", "fundacao", "outro"] as const;
export const MUNICIPALITY_BODY_LABELS: Record<(typeof MUNICIPALITY_BODIES)[number], string> = {
  secretaria: "Secretaria",
  diretoria: "Diretoria ou departamento",
  fundacao: "Fundação",
  outro: "Outro",
};

export const MUNICIPALITY_ROLES = [
  "secretario",
  "diretor",
  "tecnico",
  "prefeito_gabinete",
  "conselho",
  "outro",
] as const;
export const MUNICIPALITY_ROLE_LABELS: Record<(typeof MUNICIPALITY_ROLES)[number], string> = {
  secretario: "Secretário ou secretária",
  diretor: "Diretor ou diretora",
  tecnico: "Técnico ou técnica",
  prefeito_gabinete: "Prefeito ou gabinete",
  conselho: "Conselho de cultura",
  outro: "Outro",
};

export const MUNICIPALITY_NEEDS = [
  "editais",
  "prestacao_contas",
  "projetos_proprios",
  "lei_incentivo",
  "capacitacao",
  "outro",
] as const;
export const MUNICIPALITY_NEED_LABELS: Record<(typeof MUNICIPALITY_NEEDS)[number], string> = {
  editais: "Editais e comissões de seleção",
  prestacao_contas: "Prestação de contas (PNAB e editais)",
  projetos_proprios: "Projetos próprios do município (LIC-RS, Rouanet)",
  lei_incentivo: "Lei municipal de incentivo",
  capacitacao: "Capacitação da equipe e dos agentes culturais",
  outro: "Outro",
};

export const PNAB_STATUSES = ["ciclo_ativo", "saldo_a_executar", "nao_aderiu", "nao_sei"] as const;
export const PNAB_STATUS_LABELS: Record<(typeof PNAB_STATUSES)[number], string> = {
  ciclo_ativo: "Ciclo ativo",
  saldo_a_executar: "Com saldo a executar",
  nao_aderiu: "Não aderiu",
  nao_sei: "Não sei",
};

export const LOCAL_LAW_STATUSES = ["sim", "nao", "em_tramitacao", "nao_sei"] as const;
export const LOCAL_LAW_STATUS_LABELS: Record<(typeof LOCAL_LAW_STATUSES)[number], string> = {
  sim: "Sim",
  nao: "Não",
  em_tramitacao: "Em tramitação",
  nao_sei: "Não sei",
};
