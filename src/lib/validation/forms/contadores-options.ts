// Listas e rótulos do formulário contadores, sem zod: os componentes "use client" importam daqui para o
// pacote zod não ir ao navegador (tests/lint.test.ts); o schema em contadores.ts importa e reexporta.
export const ACCOUNTANT_ROLES = ["socio", "gerente_fiscal", "analista", "outro"] as const;
export const ACCOUNTANT_ROLE_LABELS: Record<(typeof ACCOUNTANT_ROLES)[number], string> = {
  socio: "Sócio",
  gerente_fiscal: "Gerente fiscal",
  analista: "Analista",
  outro: "Outro",
};

export const LUCRO_REAL_BANDS = ["nenhum", "1_4", "5_19", "20_mais"] as const;
export type LucroRealBand = (typeof LUCRO_REAL_BANDS)[number];
export const LUCRO_REAL_BAND_LABELS: Record<LucroRealBand, string> = {
  nenhum: "Nenhum",
  "1_4": "De 1 a 4",
  "5_19": "De 5 a 19",
  "20_mais": "20 ou mais",
};

export const YES_NO = ["sim", "nao"] as const;
export const YES_NO_LABELS: Record<(typeof YES_NO)[number], string> = { sim: "Sim", nao: "Não" };
