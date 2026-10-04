// Listas e rótulos do formulário mentoria, sem zod: os componentes "use client" importam daqui para o
// pacote zod não ir ao navegador (tests/lint.test.ts); o schema em mentoria.ts importa e reexporta.
export const WAITLIST_GOALS = ["primeiro_projeto", "captar", "profissao", "atualizar"] as const;
export const WAITLIST_GOAL_LABELS: Record<(typeof WAITLIST_GOALS)[number], string> = {
  primeiro_projeto: "Inscrever meu primeiro projeto",
  captar: "Captar patrocínio para um projeto que já tenho",
  profissao: "Trabalhar como elaborador ou captador",
  atualizar: "Me atualizar nas normas (IN MinC 29/2026 e outras)",
};

export const WAITLIST_EXPERIENCES = [
  "nenhuma",
  "ja_escrevi",
  "ja_captei",
  "atuo_em_secretaria",
] as const;
export const WAITLIST_EXPERIENCE_LABELS: Record<(typeof WAITLIST_EXPERIENCES)[number], string> = {
  nenhuma: "Nenhuma: estou começando",
  ja_escrevi: "Já escrevi ou inscrevi projeto",
  ja_captei: "Já captei patrocínio",
  atuo_em_secretaria: "Atuo em secretaria ou órgão público de cultura",
};

export const INVESTMENT_BANDS = ["ate_500", "500_1500", "acima_1500", "prefiro_nao_dizer"] as const;
export const INVESTMENT_BAND_LABELS: Record<(typeof INVESTMENT_BANDS)[number], string> = {
  ate_500: "Até R$ 500",
  "500_1500": "De R$ 500 a R$ 1.500",
  acima_1500: "Acima de R$ 1.500",
  prefiro_nao_dizer: "Prefiro não dizer",
};
