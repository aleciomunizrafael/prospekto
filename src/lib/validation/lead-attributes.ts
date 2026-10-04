// Um schema Zod por segmento para leads.attributes (personas-e-funis.md, seção 9.3;
// modelo-de-dados.md, seção 3.5). Chaves em snake_case exatamente como no documento.
// Todos os campos são opcionais aqui: a obrigatoriedade por formulário fica no schema do
// formulário, e a obrigatoriedade por estágio em moveLeadStage. Chaves desconhecidas são
// preservadas (passthrough) para não perder dados de importação.
import { z } from "zod";
import type { LeadSegment } from "@/lib/domain/enums";

// Regra R-10: a checagem do vínculo do art. 27 vem "com data e quem checou". Quando
// `vinculo_art27_checado` é true, `vinculo_art27_checado_em` (data válida) e
// `vinculo_art27_checado_por` são obrigatórios.
function requireArt27Details(
  value: {
    vinculo_art27_checado?: boolean;
    vinculo_art27_checado_em?: string;
    vinculo_art27_checado_por?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (value.vinculo_art27_checado !== true) return;
  const em = value.vinculo_art27_checado_em;
  if (!em || Number.isNaN(Date.parse(em))) {
    ctx.addIssue({
      code: "custom",
      path: ["vinculo_art27_checado_em"],
      message: "Informe a data em que o vínculo do art. 27 foi checado.",
    });
  }
  if (!value.vinculo_art27_checado_por) {
    ctx.addIssue({
      code: "custom",
      path: ["vinculo_art27_checado_por"],
      message: "Informe quem checou o vínculo do art. 27.",
    });
  }
}

// `simples` dos formulários é normalizado para `simples_nacional` (modelo-de-dados.md, 4.5).
export const regimeTributarioSchema = z
  .enum([
    "lucro_real",
    "lucro_presumido",
    "lucro_arbitrado",
    "simples",
    "simples_nacional",
    "nao_sei",
  ])
  .transform((v) => (v === "simples" ? "simples_nacional" : v));

export const pjAttributesSchema = z
  .object({
    empresa: z.string().trim().min(1).max(200),
    cnpj: z.string().trim().max(20),
    cargo: z.enum(["dono_ou_socio", "financeiro", "contabilidade", "marketing_esg", "outro"]),
    regime_tributario: regimeTributarioSchema,
    regime_confirmado_por: z.enum(["contador", "ecf", "declarado"]),
    irpj_faixa: z.enum(["ate_100k", "100k_500k", "500k_2500k", "acima_2500k", "nao_sei"]),
    apuracao: z.enum(["trimestral", "anual", "nao_sei"]),
    usa_incentivos: z.enum(["nenhum", "cultura", "esporte", "fia_idoso", "outros"]),
    contador_escritorio: z.string().trim().max(200),
    contador_id: z.uuid(),
    contribuinte_icms_rs: z.boolean(),
    setor: z.string().trim().max(120),
    numero_funcionarios_faixa: z.string().trim().max(40),
    contador_participa: z.boolean(),
    disponibilidade: z.string().trim().max(200),
    decisor_em_contato: z.boolean(),
    conhece_incentivos: z.boolean(),
    // Regra R-10: checagem do vínculo do art. 27 antes de `termo`.
    vinculo_art27_checado: z.boolean(),
    vinculo_art27_checado_em: z.string().trim().max(40),
    vinculo_art27_checado_por: z.string().trim().max(120),
  })
  .partial()
  .passthrough()
  .superRefine(requireArt27Details);

export const pfAttributesSchema = z
  .object({
    modelo_declaracao: z.enum(["completa", "simplificada", "nao_sei"]),
    ir_devido_faixa: z.enum(["ate_20k", "20k_80k", "acima_80k", "nao_sei"]),
    profissao: z.enum(["saude", "juridico", "executivo", "empresario", "outro"]),
    contador_declaracao: z.string().trim().max(200),
    empresa_vinculada_id: z.uuid(),
    ja_doa_com_incentivo: z.boolean(),
    contador_participa: z.boolean(),
    disponibilidade: z.string().trim().max(200),
    vinculo_art27_checado: z.boolean(),
    vinculo_art27_checado_em: z.string().trim().max(40),
    vinculo_art27_checado_por: z.string().trim().max(120),
  })
  .partial()
  .passthrough()
  .superRefine(requireArt27Details);

export const contAttributesSchema = z
  .object({
    escritorio: z.string().trim().min(1).max(200),
    cnpj: z.string().trim().max(20),
    cargo: z.enum(["socio", "gerente_fiscal", "analista", "outro"]),
    clientes_lucro_real_faixa: z.enum(["nenhum", "1_4", "5_19", "20_mais"]),
    ja_lancou_incentivo: z.boolean(),
    registro_crc: z.string().trim().max(40),
    acordo_assinado_em: z.string().trim().max(40),
    modelo_remuneracao: z.string().trim().max(200),
    sede_serra_gaucha: z.boolean(),
    uf: z.string().trim().length(2),
    socio_em_contato: z.boolean(),
    reuniao_aceita: z.boolean(),
  })
  .partial()
  .passthrough();

export const munAttributesSchema = z
  .object({
    municipio: z.string().trim().min(1).max(120),
    orgao: z.string().trim().max(120),
    cargo: z.enum(["secretario", "diretor", "tecnico", "prefeito_gabinete", "conselho", "outro"]),
    pnab_status: z.enum(["ciclo_ativo", "saldo_a_executar", "nao_aderiu", "nao_sei"]),
    lei_incentivo_municipal: z.enum(["sim", "nao", "em_tramitacao", "nao_sei"]),
    necessidade: z.enum([
      "editais",
      "prestacao_contas",
      "projetos_proprios",
      "lei_incentivo",
      "capacitacao",
      "outro",
    ]),
    populacao_faixa: z.string().trim().max(40),
    dotacao_consultoria: z.boolean(),
    prazo_60_dias: z.boolean(),
    relacao_previa: z.boolean(),
  })
  .partial()
  .passthrough();

export const propAttributesSchema = z
  .object({
    proponente: z.string().trim().min(1).max(200),
    tipo_proponente: z.enum(["pf", "mei", "pj", "instituicao", "municipio"]),
    projeto_nome: z.string().trim().max(200),
    mecanismo: z.enum(["rouanet", "audiovisual", "lic_rs", "lic_municipal", "pnab", "nao_sei"]),
    status_projeto: z.enum([
      "ideia",
      "em_elaboracao",
      "inscrito",
      "aprovado_captando",
      "em_execucao",
    ]),
    numero_processo: z.string().trim().max(60),
    valor_aprovado: z.number().nonnegative(),
    saldo_a_captar: z.number().nonnegative(),
    prazo_captacao: z.string().trim().max(40),
    segmento_cultural: z.string().trim().max(120),
    link_material: z.url(),
    prestacao_contas_anterior: z.enum(["nunca_teve", "aprovada", "pendente", "reprovada"]),
    saldo_e_prazo_ok: z.boolean(),
    apelo_regional: z.boolean(),
    rubrica_captacao: z.boolean(),
  })
  .partial()
  .passthrough();

export const alunoAttributesSchema = z
  .object({
    objetivo: z.enum(["primeiro_projeto", "captar", "profissao", "atualizar"]),
    experiencia: z.enum(["nenhuma", "ja_escrevi", "ja_captei", "atuo_em_secretaria"]),
    faixa_investimento: z.string().trim().max(40),
    instagram_ou_linkedin: z.string().trim().max(200),
    pesquisa_respondida: z.boolean(),
    aula_aberta: z.boolean(),
  })
  .partial()
  .passthrough();

export const ATTRIBUTES_BY_SEGMENT = {
  PJ: pjAttributesSchema,
  PF: pfAttributesSchema,
  CONT: contAttributesSchema,
  MUN: munAttributesSchema,
  PROP: propAttributesSchema,
  ALUNO: alunoAttributesSchema,
} as const satisfies Record<LeadSegment, z.ZodType>;

export function parseAttributes(
  segment: LeadSegment,
  attributes: unknown,
): Record<string, unknown> {
  return ATTRIBUTES_BY_SEGMENT[segment].parse(attributes ?? {}) as Record<string, unknown>;
}
