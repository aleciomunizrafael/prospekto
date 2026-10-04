// Opções e rótulos do formulário de diagnóstico (estrutura-e-copy.md, seção 5.4), sem importar
// repositórios: este módulo é compartilhado com o componente cliente do formulário.
export const DIAGNOSTIC_ROLES = [
  "dono_ou_socio",
  "financeiro",
  "contabilidade",
  "marketing_esg",
  "outro",
] as const;
export const DIAGNOSTIC_ROLE_LABELS: Record<(typeof DIAGNOSTIC_ROLES)[number], string> = {
  dono_ou_socio: "Dono ou sócio",
  financeiro: "Financeiro",
  contabilidade: "Contabilidade",
  marketing_esg: "Marketing ou ESG",
  outro: "Outro",
};

export const TAX_REGIME_OPTIONS = ["lucro_real", "lucro_presumido", "simples", "nao_sei"] as const;
export const TAX_REGIME_LABELS: Record<(typeof TAX_REGIME_OPTIONS)[number], string> = {
  lucro_real: "Lucro real",
  lucro_presumido: "Lucro presumido",
  simples: "Simples Nacional",
  nao_sei: "Não sei",
};

export const IRPJ_BANDS = [
  "ate_100k",
  "100k_500k",
  "500k_2500k",
  "acima_2500k",
  "nao_sei",
] as const;
export const IRPJ_BAND_LABELS: Record<(typeof IRPJ_BANDS)[number], string> = {
  ate_100k: "Até R$ 100 mil",
  "100k_500k": "De R$ 100 mil a R$ 500 mil",
  "500k_2500k": "De R$ 500 mil a R$ 2,5 milhões",
  acima_2500k: "Acima de R$ 2,5 milhões",
  nao_sei: "Não sei",
};

export const APURACAO_OPTIONS = ["trimestral", "anual", "nao_sei"] as const;
export const APURACAO_LABELS: Record<(typeof APURACAO_OPTIONS)[number], string> = {
  trimestral: "Trimestral",
  anual: "Anual",
  nao_sei: "Não sei",
};

export const DIAGNOSTIC_FORMATS = ["diagnostico", "simulacao"] as const;
export type DiagnosticFormat = (typeof DIAGNOSTIC_FORMATS)[number];
export const DIAGNOSTIC_FORMAT_LABELS: Record<DiagnosticFormat, string> = {
  diagnostico: "Diagnóstico: 30 minutos, com o meu contador presente",
  simulacao: "Simulação: 20 minutos, ainda sem o contador",
};

export const DECLARATION_MODELS = ["completa", "simplificada", "nao_sei"] as const;
export const DECLARATION_MODEL_LABELS: Record<(typeof DECLARATION_MODELS)[number], string> = {
  completa: "Modelo completo",
  simplificada: "Modelo simplificado",
  nao_sei: "Não sei",
};

export const IR_BANDS = ["ate_20k", "20k_80k", "acima_80k", "nao_sei"] as const;
export const IR_BAND_LABELS: Record<(typeof IR_BANDS)[number], string> = {
  ate_20k: "Até R$ 20 mil",
  "20k_80k": "De R$ 20 mil a R$ 80 mil",
  acima_80k: "Acima de R$ 80 mil",
  nao_sei: "Não sei",
};

export const AVAILABILITY_OPTIONS = ["manha", "tarde", "qualquer"] as const;
export const AVAILABILITY_LABELS: Record<(typeof AVAILABILITY_OPTIONS)[number], string> = {
  manha: "Manhã",
  tarde: "Tarde",
  qualquer: "Qualquer horário comercial",
};

// Próximo passo por formato e tipo, usado no e-mail "diagnostico" (templates/index.ts) e na página
// de obrigado (DiagnosticoNextStep): uma fonte só, para a confirmação não contradizer o formulário.
export const DIAGNOSTIC_NEXT_STEP_VARIANTS = ["simulacao", "pj", "pf"] as const;
export type DiagnosticNextStepVariant = (typeof DIAGNOSTIC_NEXT_STEP_VARIANTS)[number];

export const DIAGNOSTIC_NEXT_STEP: Record<DiagnosticNextStepVariant, string> = {
  simulacao:
    "marcar a simulação de 20 minutos. O contador não precisa participar desta primeira conversa.",
  pj: "marcar o diagnóstico: 30 minutos com o seu contador.",
  pf: "marcar o diagnóstico: uma ligação de 15 minutos.",
};

export function diagnosticNextStepVariant(
  formato: "diagnostico" | "simulacao",
  tipoPessoa: "PJ" | "PF",
): DiagnosticNextStepVariant {
  if (formato === "simulacao") return "simulacao";
  return tipoPessoa === "PF" ? "pf" : "pj";
}
