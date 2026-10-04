import type { SourceNote } from "./number-block";
import { HOME_SOURCES } from "./sources";

// Fontes das páginas por segmento (estrutura-e-copy.md, seção 13). A numeração segue a tabela
// do documento, para as notas de rodapé baterem com a referência do texto.
const byRef = (ref: number): SourceNote => {
  const found = HOME_SOURCES.find((s) => s.ref === ref);
  if (!found) throw new Error(`Fonte ${ref} não cadastrada em HOME_SOURCES.`);
  return found;
};

export const SOURCE_6: SourceNote = {
  ref: 6,
  label: "Receita Federal, balanço final do IRPF 2025 (espelho Agência Gov)",
  href: "https://agenciagov.ebc.com.br/noticias/202505/receita-federal-divulga-balanco-final-do-imposto-de-renda-de-2025",
  note: "43.344.108 declarações. Consulta em 03/10/2026.",
};

export const SOURCE_8: SourceNote = {
  ref: 8,
  label:
    "Lei 8.313/1991, arts. 18, 23, 26 e 27; Lei 9.532/1997, arts. 5º, 6º e 22; Lei 9.249/1995, art. 3º, § 4º; Lei 9.250/1995, art. 12",
  href: "https://www.planalto.gov.br/ccivil_03/leis/l8313cons.htm",
  note: "Limites de 4% e 6%, base de cálculo, art. 18 e 26.",
};

export const SOURCE_9: SourceNote = {
  ref: 9,
  label: "Lei 8.685/1993, art. 1º-A; Lei 15.132/2025",
  href: "https://www.planalto.gov.br/ccivil_03/leis/l8685.htm",
  note: "Audiovisual art. 1º-A, vigência até 2029.",
};

export const SOURCE_10: SourceNote = {
  ref: 10,
  label: "Solução de Consulta Cosit 4/2026",
  href: "https://chambarelli.com.br/solucao-de-consulta-cosit-no-4-2026-como-ficam-os-limites-de-deducao-no-irpj-para-esporte-cultura-e-audiovisual/",
  note: "Cesta compartilhada de 4%; esporte geral fora. Consulta em 03/10/2026.",
};

export const SOURCE_11: SourceNote = {
  ref: 11,
  label: "LC 224/2025; IN RFB 2.305/2025 e 2.307/2026",
  note: "Aviso de 3,6% [verificar].",
};

export const SOURCE_12: SourceNote = {
  ref: 12,
  label: "IN MinC 29/2026, arts. 5º, 19, 53, 54 e 69",
  href: "https://www.gov.br/cultura/pt-br/acesso-a-informacao/legislacao-e-normativas/instrucao-normativa-minc-no-29-de-29-de-janeiro-de-2026",
  note: "Remuneração de captação (10%, R$ 150 mil), janela do SALIC, depósito e recibo, prestação de contas.",
};

export const EMPRESAS_SOURCES: SourceNote[] = [
  byRef(2),
  byRef(4),
  byRef(5),
  SOURCE_8,
  SOURCE_9,
  SOURCE_10,
  SOURCE_11,
  SOURCE_12,
];

export const CONTADORES_SOURCES: SourceNote[] = [
  byRef(3),
  byRef(4),
  SOURCE_8,
  SOURCE_9,
  SOURCE_10,
  SOURCE_11,
  SOURCE_12,
];

export const PESSOA_FISICA_SOURCES: SourceNote[] = [byRef(5), SOURCE_6, SOURCE_8];

export const PROPONENTES_SOURCES: SourceNote[] = [SOURCE_8, SOURCE_12];
