import type { SourceNote } from "./number-block";

// Fontes dos números usados na Home (estrutura-e-copy.md, seções 4.1 e 13). Os números de
// referência (1 a 5) são os mesmos do documento; o rodapé aponta para esta lista.
export const HOME_SOURCES: SourceNote[] = [
  {
    ref: 1,
    label: 'MinC, "Lei Rouanet alcança R$ 3,41 bilhões em captação" (jan/2026)',
    href: "https://www.gov.br/cultura/pt-br/assuntos/noticias/lei-rouanet-alcanca-r-3-41-bilhoes-em-captacao-e-consolida-politica-de-nacionalizacao-do-incentivo-cultural",
    note: "Consulta em 03/10/2026.",
  },
  {
    ref: 2,
    label:
      'MinC, "Com R$ 203,4 milhões movimentados pela Lei Rouanet no RS em 2025, Caxias do Sul recebe comissão" (mai/2026)',
    href: "https://www.gov.br/cultura/pt-br/assuntos/noticias/com-r-203-4-milhoes-movimentados-pela-lei-rouanet-no-rs-em-2025-caxias-do-sul-recebe-comissao-que-avalia-projetos",
    note: "Consulta em 03/10/2026.",
  },
  {
    ref: 3,
    label:
      "FGV para o MinC, Pesquisa de Impacto Econômico da Lei Rouanet 2024 (divulgada em jan/2026)",
    href: "https://www.gov.br/cultura/pt-br/assuntos/noticias/lei-rouanet-movimenta-r-25-7-bilhoes-e-gera-228-mil-empregos-em-2024-aponta-estudo-da-fgv",
    note: "Consulta em 03/10/2026.",
  },
  {
    ref: 4,
    label:
      "Cálculo da Prospekto: 6.252 CNPJs patrocinadores em 2025 (SALIC, via Times Brasil/CNBC) sobre cerca de 220 mil a 230 mil empresas no lucro real (fontes secundárias que citam a Receita Federal)",
    note: "[verificar contagem direta nos Dados Abertos CNPJ da Receita Federal]",
  },
  {
    ref: 5,
    label:
      'Times Brasil/CNBC com dados do SALIC, "Quais empresas mais patrocinaram a Lei Rouanet em 2025"',
    href: "https://timesbrasil.com.br/entretenimento/cinema-e-tv/quais-empresas-mais-patrocinaram-lei-rouanet-2025-veja-ranking/",
    note: "Consulta em 03/10/2026.",
  },
];

// Leis e normas citadas no rodapé (coluna "Fontes").
export const LEGAL_SOURCES: { label: string; href: string }[] = [
  {
    label: "Lei 8.313/1991 (Lei Rouanet)",
    href: "https://www.planalto.gov.br/ccivil_03/leis/l8313cons.htm",
  },
  {
    label: "Lei 9.532/1997, arts. 5º, 6º e 22 (limites de dedução)",
    href: "https://www.planalto.gov.br/ccivil_03/leis/l9532.htm",
  },
  {
    label: "Lei 8.685/1993 (Lei do Audiovisual)",
    href: "https://www.planalto.gov.br/ccivil_03/leis/l8685.htm",
  },
  {
    label: "IN MinC 29/2026 (procedimentos do Pronac)",
    href: "https://www.gov.br/cultura/pt-br/acesso-a-informacao/legislacao-e-normativas/instrucao-normativa-minc-no-29-de-29-de-janeiro-de-2026",
  },
  {
    label: "Lei 13.709/2018 (LGPD)",
    href: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
];
