// Listas e rótulos do formulário proponentes, sem zod: os componentes "use client" importam daqui para o
// pacote zod não ir ao navegador (tests/lint.test.ts); o schema em proponentes.ts importa e reexporta.
export const PROPONENT_TYPES = ["pf", "mei", "pj", "instituicao", "municipio"] as const;
export const PROPONENT_TYPE_LABELS: Record<(typeof PROPONENT_TYPES)[number], string> = {
  pf: "Pessoa física",
  mei: "MEI",
  pj: "Empresa (produtora)",
  instituicao: "Instituição sem fins lucrativos",
  municipio: "Município",
};

export const PROJECT_MECHANISMS = [
  "rouanet",
  "audiovisual",
  "lic_rs",
  "lic_municipal",
  "pnab",
  "nao_sei",
] as const;
export const PROJECT_MECHANISM_LABELS: Record<(typeof PROJECT_MECHANISMS)[number], string> = {
  rouanet: "Lei Rouanet (Lei 8.313/1991)",
  audiovisual: "Lei do Audiovisual (Lei 8.685/1993)",
  lic_rs: "LIC-RS (ICMS)",
  lic_municipal: "Lei municipal de incentivo",
  pnab: "PNAB ou edital",
  nao_sei: "Ainda não sei",
};

export const PROJECT_STATUSES = [
  "ideia",
  "em_elaboracao",
  "inscrito",
  "aprovado_captando",
  "em_execucao",
] as const;
export const PROJECT_STATUS_LABELS: Record<(typeof PROJECT_STATUSES)[number], string> = {
  ideia: "Ideia",
  em_elaboracao: "Em elaboração",
  inscrito: "Inscrito, aguardando análise",
  aprovado_captando: "Aprovado e autorizado a captar",
  em_execucao: "Em execução",
};

export const PRIOR_ACCOUNTABILITY = ["nunca_teve", "aprovada", "pendente", "reprovada"] as const;
export const PRIOR_ACCOUNTABILITY_LABELS: Record<(typeof PRIOR_ACCOUNTABILITY)[number], string> = {
  nunca_teve: "Nunca prestei contas de projeto incentivado",
  aprovada: "Aprovada",
  pendente: "Pendente de análise",
  reprovada: "Reprovada ou com diligência",
};

// Valor em reais digitado livremente ("150.000,00", "150000"); vazio vira undefined.
