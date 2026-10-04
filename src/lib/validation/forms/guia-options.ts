// Listas e rótulos do formulário guia, sem zod: os componentes "use client" importam daqui para o
// pacote zod não ir ao navegador (tests/lint.test.ts); o schema em guia.ts importa e reexporta.
export const GUIDE_PROFILES = ["empresa", "contador", "pessoa_fisica", "outro"] as const;
export type GuideProfile = (typeof GUIDE_PROFILES)[number];

export const GUIDE_PROFILE_LABELS: Record<GuideProfile, string> = {
  empresa: "Empresa",
  contador: "Escritório contábil",
  pessoa_fisica: "Pessoa física",
  outro: "Outro",
};
