// Textos explicativos e avisos legais do simulador (simulador-spec.md, seção 7, mais os textos
// das seções 4.1, 4.5, 5.2 e 8 que a tela precisa). Mantidos junto dos parâmetros, com a mesma
// data de revisão. Variáveis entre chaves duplas são preenchidas por renderText().
import type { SimulatorResult, TextKey } from "./types";

export const TEXTS_REVIEWED_AT = "2026-10-03";

export type SimulatorText = {
  where: string;
  text: string;
  revisado_em: string;
};

const t = (where: string, text: string): SimulatorText => ({
  where,
  text,
  revisado_em: TEXTS_REVIEWED_AT,
});

export const SIMULATOR_TEXTS: Record<TextKey, SimulatorText> = {
  disclaimer_main: t(
    "todas as telas de resultado",
    "Esta simulação é uma estimativa com base na legislação vigente em {{atualizado_em}}. A apuração final do limite e a formalização do aporte são feitas pelo contador da empresa ou de quem declara, conforme as particularidades de cada caso. Conteúdo informativo; não substitui orientação contábil ou jurídica.",
  ),
  base_pj: t(
    "ajuda do campo IRPJ",
    "O limite é calculado sobre o imposto de renda à alíquota de 15% sobre o lucro real do período. O adicional de 10% (sobre o lucro acima de R$ 20 mil por mês) é recolhido integralmente e não entra na conta (Lei 9.249/1995, art. 3º, § 4º).",
  ),
  base_pf: t(
    "bloco da base de cálculo PF",
    "Imposto devido apurado na Declaração de Ajuste Anual, modelo completo (deduções legais), antes das deduções de incentivo.",
  ),
  basket_pj: t(
    "tabela PJ",
    "Rouanet (arts. 18 e 26), Lei do Audiovisual (arts. 1º e 1º-A) e esporte de inclusão social dividem um único teto de 4% do imposto devido (Lei 9.532/1997, art. 6º, II; Solução de Consulta Cosit 4/2026). Esporte geral (2%), fundos da criança e do idoso, Pronon e Pronas (1% cada) têm tetos próprios.",
  ),
  lc224_notice: t(
    "PJ, junto ao interruptor",
    "A Lei Complementar 224/2025 determinou redução linear de 10% em incentivos federais a partir de 01/01/2026. Pela leitura da Receita Federal, o limite de cultura passa a 3,6% do imposto devido; o Ministério da Cultura contesta (Parecer Conjur 69/2026). Mostramos os dois cenários. Pessoas físicas não são alcançadas. [verificar]",
  ),
  art26_notice: t(
    "linhas do art. 26",
    "No art. 26 a dedução é parcial (30% do patrocínio ou 40% da doação para empresas; 60% ou 80% para pessoas físicas), mas a empresa no lucro real também lança o aporte como despesa operacional, o que reduz IRPJ e CSLL. O custo líquido é maior que zero e depende da apuração; mostramos uma faixa.",
  ),
  operating_expense_range: t(
    "faixa de economia operacional (art. 26 e art. 1º, PJ)",
    "A economia exata depende da apuração da empresa (adicional, CSLL, prejuízos). Faixa estimada entre {{economia_min}} e {{economia_max}}; o contador confirma. O simulador não recalcula o IRPJ devido (e o teto de 4%) depois de abater o aporte como despesa; o efeito é pequeno e circular. [verificar]",
  ),
  donation_notice: t(
    "quando contribution_type = doacao",
    "Doação não admite promoção do doador: sem exposição de marca (Lei 8.313/1991, art. 23). Patrocínio permite contrapartidas promocionais.",
  ),
  art1a_notice: t(
    "Audiovisual 1º-A",
    "Patrocínio a obra audiovisual brasileira independente aprovada pela Ancine, com dedução integral dentro do teto de 4% (PJ) ou 6% (PF). Não há participação em receita; vedada a dedução como despesa (Lei 8.685/1993, art. 1º-A, § 3º). Vigente até 2029 (Lei 15.132/2025).",
  ),
  art1_notice: t(
    "Audiovisual 1º",
    "Investimento em cotas de comercialização da obra (CVM), com participação nas receitas. Limite de 3% dentro da cesta. É um produto diferente do patrocínio; citado como referência.",
  ),
  pf_deadline: t(
    "PF",
    "Para valer no ano-calendário, o depósito identificado com o seu CPF na conta do projeto precisa ocorrer até o último dia útil bancário de dezembro. Para cultura não existe a opção de doar na própria declaração; ela existe só para os fundos da criança e do idoso, até 3%. O valor entra na ficha 'Doações Efetuadas' da declaração do ano seguinte, com o recibo de mecenato.",
  ),
  pf_basket: t(
    "PF",
    "O limite de 6% é compartilhado entre cultura, audiovisual, fundo da criança e fundo do idoso (Lei 9.532/1997, art. 22). Com esporte, o conjunto sobe para 7% (Lei 11.438/2006, art. 1º, § 1º, II).",
  ),
  pf_no_8pct: t(
    "PF, nota técnica",
    "Não existe limite de 8% para pessoa física na legislação federal vigente.",
  ),
  disqualified_regime: t(
    "PJ presumido, arbitrado ou Simples",
    "A Lei Rouanet e a Lei do Audiovisual só permitem dedução para empresas tributadas pelo lucro real.",
  ),
  disqualified_regime_lic_rs: t(
    "PJ presumido ou arbitrado, contribuinte de ICMS no RS",
    "Sua empresa pode patrocinar cultura pela Lei de Incentivo à Cultura do Rio Grande do Sul (LIC-RS), compensando o valor no ICMS. Veja abaixo.",
  ),
  disqualified_model: t(
    "PF simplificada",
    "O modelo simplificado substitui todas as deduções por um desconto padrão; incentivos não são dedutíveis nele. Vale conferir com quem faz a sua declaração qual modelo compensa mais. Se você tiver deduções de saúde, educação e dependentes, a completa pode valer a pena, e aí o incentivo entra.",
  ),
  no_tax: t(
    "imposto zero",
    "Sem imposto devido no período não há o que deduzir. Se a empresa espera lucro no próximo período, deixe seu contato e falamos antes do fechamento.",
  ),
  no_icms: t(
    "LIC-RS com ICMS zero no ano anterior",
    "Sem ICMS próprio pago no ano anterior não há limite anual na LIC-RS para este ano. Se a empresa espera recolher ICMS, deixe seu contato e falamos antes do próximo edital.",
  ),
  lic_rs_notice: t(
    "LIC-RS",
    "Limite anual por faixa do ICMS próprio pago no ano anterior; a empresa compensa 100% do valor aplicado no ICMS a recolher após a Carta de Habilitação de Patrocínio, e repassa ao FAC 10% (demais editais: artes, produção e fruição) ou 5% (Edital para Patrimônio e Espaços Públicos de Cultura) como custo não incentivado (IN Sedac 1/2026, art. 19). Tabela de faixas da Lei 13.490/2010, art. 6º (redação da Lei 15.449/2020); Decreto 57.531/2024; IN Sedac 1/2026. Confirme a tabela vigente com a Sedac ou com o contador. [verificar]",
  ),
  band_notice: t(
    "entrada por faixa",
    "Resultado em intervalo. Para o número exato, informe o imposto devido ou peça ao contador a apuração do período.",
  ),
  band_examples: t(
    "faixa nao_sei",
    "Sem a faixa do imposto não dá para calcular o seu limite. A tabela abaixo mostra exemplos para alguns valores de imposto devido; para o seu número, informe o imposto devido ou peça ao contador a apuração do período.",
  ),
  over_cap: t(
    "aporte acima do teto",
    "Acima de {{teto}} o excedente não é dedutível. Você pode destinar mais, mas o custo líquido sobe no valor que passar do limite.",
  ),
  too_large: t(
    "valor acima do limite de entrada",
    "Confirme o valor informado; parece alto. Se estiver correto, o cálculo segue normalmente.",
  ),
  unknown_regime: t(
    "PJ, regime nao_sei",
    "Resultado válido só se a empresa for tributada pelo lucro real. Pergunte ao contador: se a empresa fatura acima de R$ 78 milhões por ano, é lucro real obrigatório (Lei 9.718/1998, art. 14).",
  ),
  unknown_model: t(
    "PF, modelo nao_sei",
    "Resultado válido só se a sua declaração for pelo modelo completo. Se você usa deduções de saúde, educação e dependentes, provavelmente é a completa; confirme com quem faz sua declaração.",
  ),
  params_stale: t(
    "parâmetros com mais de 180 dias",
    "Parâmetros revisados em {{data}}; confirme com o contador.",
  ),
  pj_quarterly: t("PJ, apuração trimestral", "Na apuração trimestral, a decisão é por trimestre."),
  pj_period: t(
    "PJ, prazos",
    "O aporte precisa ocorrer dentro do período de apuração em que a dedução será usada.",
  ),
  sources_footer: t(
    "nota técnica",
    "Parâmetros atualizados em {{atualizado_em}}; ver docs/dominio/leis-de-incentivo.md.",
  ),
  no_financial_return: t(
    "nota técnica",
    "Patrocínio incentivado não devolve dinheiro ao patrocinador; devolve dedução e contrapartidas. Qualquer vantagem financeira ao incentivador é vedada.",
  ),
};

export const TEXT_KEYS = Object.keys(SIMULATOR_TEXTS) as TextKey[];

// Preenche as variáveis do texto ({{atualizado_em}}, {{teto}} etc.).
// Base legal do JSON (sem acentos, abreviaturas internas) na forma exibida: "par." vira "§" e as
// poucas palavras acentuadas são restauradas; o campo `fonte` continua como referência interna.
const LEGAL_BASIS_WORDS: Array<[RegExp, string]> = [
  [/\bpar\. /g, "§ "],
  [/\bprorrogacao\b/g, "prorrogação"],
  [/\bate\b/g, "até"],
  [/\bsecao\b/g, "seção"],
];

export function formatLegalBasis(fonte: string): string {
  return LEGAL_BASIS_WORDS.reduce((text, [pattern, word]) => text.replace(pattern, word), fonte);
}

export function renderText(key: TextKey, vars: Record<string, string | number> = {}): string {
  return SIMULATOR_TEXTS[key].text.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

// Chaves aplicáveis a um resultado, na ordem de exibição (disclaimer primeiro, fontes por último).
export function textsFor(result: SimulatorResult): TextKey[] {
  const keys: TextKey[] = ["disclaimer_main"];
  const add = (...k: TextKey[]) => {
    for (const key of k) if (!keys.includes(key)) keys.push(key);
  };
  const pj = result.taxpayer_type === "pj";

  for (const w of result.warnings) {
    if (w.code === "unknown_regime") add("unknown_regime");
    if (w.code === "unknown_model") add("unknown_model");
    if (w.code === "too_large") add("too_large");
    if (w.code === "params_stale") add("params_stale");
  }

  if (result.status === "disqualified") {
    if (result.disqualified?.reason === "regime") {
      add("disqualified_regime");
      if (result.lic_rs) add("disqualified_regime_lic_rs");
    } else {
      add("disqualified_model");
    }
  }
  if (result.status === "no_tax") add("no_tax");
  if (result.status === "band_only") add(result.examples ? "band_examples" : "band_notice");

  if (result.limits) {
    if (pj) {
      add("base_pj", "basket_pj");
      if (result.lc224.available) add("lc224_notice");
      add("art26_notice", "operating_expense_range", "art1a_notice", "art1_notice");
    } else {
      add("base_pf", "pf_basket", "pf_deadline");
      add("art26_notice", "art1a_notice", "art1_notice", "pf_no_8pct");
    }
    if (result.contribution_type === "doacao") add("donation_notice");
  }
  if (result.comparison?.over_cap) add("over_cap");
  for (const d of result.deadlines) {
    if (d.key === "pj_quarterly") add("pj_quarterly");
    if (d.key === "pj_period") add("pj_period");
  }
  if (result.lic_rs) {
    add("lic_rs_notice");
    if (result.lic_rs.status === "no_tax") add("no_icms");
    if (result.lic_rs.over_cap) add("over_cap");
  }
  if (result.limits || result.lic_rs) add("no_financial_return");
  add("sources_footer");
  return keys;
}
