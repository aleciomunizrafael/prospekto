// Listas e rótulos do formulário contato, sem zod: os componentes "use client" importam daqui para o
// pacote zod não ir ao navegador (tests/lint.test.ts); o schema em contato.ts importa e reexporta.
export const CONTACT_SUBJECTS = [
  "patrocinar",
  "contador",
  "pessoa_fisica",
  "municipio",
  "proponente",
  "mentoria",
  "imprensa",
  "outro",
] as const;
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

export const CONTACT_SUBJECT_LABELS: Record<ContactSubject, string> = {
  patrocinar: "Quero patrocinar um projeto com a minha empresa",
  contador: "Sou contador e quero conhecer a parceria",
  pessoa_fisica: "Quero destinar parte do meu IR (pessoa física)",
  municipio: "Represento um município ou secretaria",
  proponente: "Tenho um projeto cultural",
  mentoria: "Tenho interesse na mentoria",
  imprensa: "Imprensa",
  outro: "Outro assunto",
};
