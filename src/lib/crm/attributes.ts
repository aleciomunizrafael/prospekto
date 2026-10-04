// Campos de `attributes` por segmento, na ordem de personas-e-funis.md, seção 9.3, com rótulo em
// português e tipo de controle para "Editar". As chaves e os enums são os de
// src/lib/validation/lead-attributes.ts (que valida o que a tela grava).
import type { LeadSegment } from "@/lib/domain/enums";
import { AVAILABILITY_OPTIONS } from "@/lib/validation/forms/diagnostico-options";

export type AttributeField = {
  key: string;
  label: string;
  type: "text" | "select" | "boolean" | "number" | "date";
  options?: readonly string[];
  help?: string;
};

const PJ: AttributeField[] = [
  { key: "empresa", label: "Empresa", type: "text" },
  { key: "cnpj", label: "CNPJ", type: "text" },
  {
    key: "cargo",
    label: "Cargo",
    type: "select",
    options: ["dono_ou_socio", "financeiro", "contabilidade", "marketing_esg", "outro"],
  },
  {
    key: "regime_tributario",
    label: "Regime tributário",
    type: "select",
    options: ["lucro_real", "lucro_presumido", "lucro_arbitrado", "simples_nacional", "nao_sei"],
  },
  {
    key: "regime_confirmado_por",
    label: "Regime confirmado por",
    type: "select",
    options: ["contador", "ecf", "declarado"],
  },
  {
    key: "irpj_faixa",
    label: "Faixa de IRPJ",
    type: "select",
    options: ["ate_100k", "100k_500k", "500k_2500k", "acima_2500k", "nao_sei"],
  },
  {
    key: "apuracao",
    label: "Apuração",
    type: "select",
    options: ["trimestral", "anual", "nao_sei"],
  },
  {
    key: "usa_incentivos",
    label: "Já usa incentivos",
    type: "select",
    options: ["nenhum", "cultura", "esporte", "fia_idoso", "outros"],
  },
  { key: "contador_escritorio", label: "Escritório contábil", type: "text" },
  { key: "contribuinte_icms_rs", label: "Contribuinte de ICMS no RS", type: "boolean" },
  { key: "setor", label: "Setor", type: "text" },
  { key: "numero_funcionarios_faixa", label: "Faixa de funcionários", type: "text" },
  { key: "contador_participa", label: "Contador participa da conversa", type: "boolean" },
  {
    key: "disponibilidade",
    label: "Disponibilidade",
    type: "select",
    options: AVAILABILITY_OPTIONS,
  },
  { key: "decisor_em_contato", label: "Decisor em contato", type: "boolean" },
  { key: "conhece_incentivos", label: "Conhece incentivos", type: "boolean" },
  {
    key: "vinculo_art27_checado",
    label: "Vínculo com o proponente checado (art. 27)",
    type: "boolean",
    help: "Obrigatório antes de Termo (regra R-10). Preencha também a data e quem checou.",
  },
  { key: "vinculo_art27_checado_em", label: "Checagem do art. 27 em", type: "date" },
  { key: "vinculo_art27_checado_por", label: "Checagem do art. 27 por", type: "text" },
];

const PF: AttributeField[] = [
  {
    key: "modelo_declaracao",
    label: "Modelo de declaração",
    type: "select",
    options: ["completa", "simplificada", "nao_sei"],
  },
  {
    key: "ir_devido_faixa",
    label: "Faixa de IR devido",
    type: "select",
    options: ["ate_20k", "20k_80k", "acima_80k", "nao_sei"],
  },
  {
    key: "profissao",
    label: "Profissão",
    type: "select",
    options: ["saude", "juridico", "executivo", "empresario", "outro"],
  },
  { key: "contador_declaracao", label: "Contador da declaração", type: "text" },
  { key: "ja_doa_com_incentivo", label: "Já doa com incentivo", type: "boolean" },
  { key: "contador_participa", label: "Contador participa da conversa", type: "boolean" },
  {
    key: "disponibilidade",
    label: "Disponibilidade",
    type: "select",
    options: AVAILABILITY_OPTIONS,
  },
  {
    key: "vinculo_art27_checado",
    label: "Vínculo com o proponente checado (art. 27)",
    type: "boolean",
    help: "Obrigatório antes de Termo (regra R-10). Preencha também a data e quem checou.",
  },
  { key: "vinculo_art27_checado_em", label: "Checagem do art. 27 em", type: "date" },
  { key: "vinculo_art27_checado_por", label: "Checagem do art. 27 por", type: "text" },
];

const CONT: AttributeField[] = [
  { key: "escritorio", label: "Escritório", type: "text" },
  { key: "cnpj", label: "CNPJ", type: "text" },
  {
    key: "cargo",
    label: "Cargo",
    type: "select",
    options: ["socio", "gerente_fiscal", "analista", "outro"],
  },
  {
    key: "clientes_lucro_real_faixa",
    label: "Clientes no lucro real",
    type: "select",
    options: ["nenhum", "1_4", "5_19", "20_mais"],
  },
  { key: "ja_lancou_incentivo", label: "Já lançou incentivo", type: "boolean" },
  { key: "registro_crc", label: "Registro no CRC", type: "text" },
  { key: "acordo_assinado_em", label: "Acordo assinado em", type: "date" },
  { key: "modelo_remuneracao", label: "Modelo de remuneração", type: "text" },
  { key: "sede_serra_gaucha", label: "Sede na Serra Gaúcha", type: "boolean" },
  { key: "socio_em_contato", label: "Sócio em contato", type: "boolean" },
  { key: "reuniao_aceita", label: "Reunião aceita", type: "boolean" },
];

const MUN: AttributeField[] = [
  { key: "municipio", label: "Município", type: "text" },
  { key: "orgao", label: "Órgão", type: "text" },
  {
    key: "cargo",
    label: "Cargo",
    type: "select",
    options: ["secretario", "diretor", "tecnico", "prefeito_gabinete", "conselho", "outro"],
  },
  {
    key: "pnab_status",
    label: "Situação na PNAB",
    type: "select",
    options: ["ciclo_ativo", "saldo_a_executar", "nao_aderiu", "nao_sei"],
  },
  {
    key: "lei_incentivo_municipal",
    label: "Lei de incentivo municipal",
    type: "select",
    options: ["sim", "nao", "em_tramitacao", "nao_sei"],
  },
  {
    key: "necessidade",
    label: "Necessidade",
    type: "select",
    options: [
      "editais",
      "prestacao_contas",
      "projetos_proprios",
      "lei_incentivo",
      "capacitacao",
      "outro",
    ],
  },
  { key: "populacao_faixa", label: "Faixa de população", type: "text" },
  { key: "dotacao_consultoria", label: "Tem dotação para consultoria", type: "boolean" },
  { key: "prazo_60_dias", label: "Prazo de 60 dias", type: "boolean" },
  { key: "relacao_previa", label: "Relação prévia", type: "boolean" },
];

const PROP: AttributeField[] = [
  { key: "proponente", label: "Proponente", type: "text" },
  {
    key: "tipo_proponente",
    label: "Tipo de proponente",
    type: "select",
    options: ["pf", "mei", "pj", "instituicao", "municipio"],
  },
  { key: "projeto_nome", label: "Nome do projeto", type: "text" },
  {
    key: "mecanismo",
    label: "Mecanismo",
    type: "select",
    options: ["rouanet", "audiovisual", "lic_rs", "lic_municipal", "pnab", "nao_sei"],
  },
  {
    key: "status_projeto",
    label: "Situação do projeto",
    type: "select",
    options: ["ideia", "em_elaboracao", "inscrito", "aprovado_captando", "em_execucao"],
  },
  { key: "numero_processo", label: "Número do processo", type: "text" },
  { key: "valor_aprovado", label: "Valor aprovado (R$)", type: "number" },
  { key: "saldo_a_captar", label: "Saldo a captar (R$)", type: "number" },
  { key: "prazo_captacao", label: "Prazo de captação", type: "text" },
  { key: "segmento_cultural", label: "Segmento cultural", type: "text" },
  { key: "link_material", label: "Link do material", type: "text" },
  {
    key: "prestacao_contas_anterior",
    label: "Prestação de contas anterior",
    type: "select",
    options: ["nunca_teve", "aprovada", "pendente", "reprovada"],
  },
  { key: "saldo_e_prazo_ok", label: "Saldo e prazo compatíveis", type: "boolean" },
  { key: "apelo_regional", label: "Apelo regional", type: "boolean" },
  { key: "rubrica_captacao", label: "Tem rubrica de captação", type: "boolean" },
];

const ALUNO: AttributeField[] = [
  {
    key: "objetivo",
    label: "Objetivo",
    type: "select",
    options: ["primeiro_projeto", "captar", "profissao", "atualizar"],
  },
  {
    key: "experiencia",
    label: "Experiência",
    type: "select",
    options: ["nenhuma", "ja_escrevi", "ja_captei", "atuo_em_secretaria"],
  },
  { key: "faixa_investimento", label: "Faixa de investimento", type: "text" },
  { key: "instagram_ou_linkedin", label: "Instagram ou LinkedIn", type: "text" },
  { key: "pesquisa_respondida", label: "Pesquisa respondida", type: "boolean" },
  { key: "aula_aberta", label: "Participou da aula aberta", type: "boolean" },
];

export const ATTRIBUTE_FIELDS: Record<LeadSegment, readonly AttributeField[]> = {
  PJ,
  PF,
  CONT,
  MUN,
  PROP,
  ALUNO,
};

// Chave de `attributes` que funciona como "empresa" na lista e nas mensagens.
export const COMPANY_ATTRIBUTE: Record<LeadSegment, string | null> = {
  PJ: "empresa",
  PF: null,
  CONT: "escritorio",
  MUN: "municipio",
  PROP: "proponente",
  ALUNO: null,
};

export function companyFromAttributes(
  segment: LeadSegment,
  attributes: Record<string, unknown>,
): string | null {
  const key = COMPANY_ATTRIBUTE[segment];
  if (!key) return null;
  const value = attributes[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Chaves conhecidas de todos os segmentos (colunas do CSV de leads; o resto vai em atributos_extra).
export const ALL_ATTRIBUTE_KEYS: readonly string[] = [
  ...new Set(Object.values(ATTRIBUTE_FIELDS).flatMap((fields) => fields.map((f) => f.key))),
];

// Converte os valores de um formulário (strings) nos tipos do schema do segmento. Campo vazio
// vira ausente (não apaga o valor existente); "__clear" apaga.
export function attributesFromForm(
  segment: LeadSegment,
  values: Record<string, string>,
  prefix = "attr_",
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of ATTRIBUTE_FIELDS[segment]) {
    const raw = values[`${prefix}${field.key}`];
    if (raw === undefined) continue;
    const value = raw.trim();
    if (field.type === "boolean") {
      if (value === "sim") out[field.key] = true;
      else if (value === "nao") out[field.key] = false;
      continue;
    }
    if (value === "") continue;
    if (field.type === "number") {
      const n = Number(value.replace(/\./g, "").replace(",", "."));
      if (Number.isFinite(n)) out[field.key] = n;
      continue;
    }
    out[field.key] = value;
  }
  return out;
}
