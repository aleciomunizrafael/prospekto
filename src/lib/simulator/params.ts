// Carrega docs/dominio/parametros-simulador.json por caminho relativo (sem cópia) e valida
// a estrutura com Zod (simulador-spec.md, seções 9.8 e 12). Puro: sem Next, sem banco.
import { z } from "zod";
import rawParams from "../../../docs/dominio/parametros-simulador.json";
import { round2 } from "./format";

const status = z.enum(["verificado", "verificar"]);
const sharedGroup = z
  .object({
    limite_percentual: z.number().min(0).max(100),
    membros: z.array(z.string()),
    fonte: z.string(),
    status,
  })
  .loose();

const mechanism = z
  .object({
    nome: z.string(),
    quem_pode: z.array(z.string()),
    base_de_calculo: z.string(),
    percentual_dedutivel: z.record(z.string(), z.union([z.number(), z.string()])),
    limite_percentual: z.number().nullable(),
    grupo_de_limite_compartilhado: z.string().nullable(),
    trata_como_despesa_operacional: z.boolean().nullable(),
    observacoes: z.string(),
    fonte: z.string(),
    status,
  })
  .loose();
export type MechanismParam = z.infer<typeof mechanism>;

const licRsBand = z.object({
  de: z.number().optional(),
  ate: z.number().nullable(),
  percentual: z.number(),
  acrescimo: z.number(),
});

// Faixas de imposto devido (contrato com irpj_faixa e ir_devido_faixa do CRM; spec, 4.2 e 4.6).
const taxBandTable = z
  .object({
    faixas: z
      .array(
        z.object({
          codigo: z.string().min(1),
          min: z.number().nonnegative(),
          max: z.number().positive().nullable(),
        }),
      )
      .min(1),
    fonte: z.string(),
    status,
  })
  .loose();
export type TaxBandTable = z.infer<typeof taxBandTable>;

export const simulatorParamsSchema = z
  .object({
    atualizado_em: z.iso.date(),
    moeda: z.literal("BRL"),
    aviso: z.string(),
    fontes: z.record(z.string(), z.string()),
    regras_gerais: z
      .object({
        pj_base_de_calculo: z.string(),
        pf_base_de_calculo: z.string(),
        pj_regimes_elegiveis: z.array(z.string()),
        pj_regimes_nao_elegiveis: z.array(z.string()),
        pf_modelo_elegivel: z.string(),
        // Alíquotas para abrir a conta do IRPJ e a faixa de economia operacional (spec, 4.2 e 4.5).
        pj_apuracao: z
          .object({
            aliquota_irpj: z.number().min(0).max(100),
            aliquota_adicional: z.number().min(0).max(100),
            parcela_isenta_adicional_mensal: z.number().nonnegative(),
            fonte: z.string(),
            status,
            aliquota_csll: z.number().min(0).max(100),
            aliquota_csll_fonte: z.string(),
            aliquota_csll_status: status,
          })
          .loose(),
        faixas_irpj: taxBandTable,
        limites_entrada: z
          .object({ pj_max: z.number().positive(), pf_max: z.number().positive() })
          .loose(),
        lc_224_2025: z
          .object({
            fator_pj: z.number().gt(0).lte(1),
            aplicar_por_padrao: z.boolean(),
            aplica_a_pf: z.boolean(),
            status,
          })
          .loose(),
        grupos_de_limite_compartilhado: z
          .object({
            cesta_cultural_pj: sharedGroup,
            esporte_pj: sharedGroup,
            fia_pj: sharedGroup,
            idoso_pj: sharedGroup,
            pronon_pj: sharedGroup,
            pronas_pj: sharedGroup,
            cesta_pf: sharedGroup.extend({ limite_percentual_com_esporte: z.number() }),
          })
          .loose(),
      })
      .loose(),
    mecanismos: z
      .object({
        rouanet_art18: mechanism,
        rouanet_art26_patrocinio: mechanism,
        rouanet_art26_doacao: mechanism,
        audiovisual_art1: mechanism,
        audiovisual_art1A: mechanism,
        audiovisual_art3: mechanism,
        audiovisual_art3A: mechanism,
        funcines: mechanism,
        lic_rs: mechanism.extend({
          limite_por_faixa_icms_ano_anterior: z.array(licRsBand).min(1),
          limite_por_faixa_status: status,
          repasse_adicional_fac_percentual: z.record(z.string(), z.number()),
          repasse_adicional_incentivado_rai: z
            .object({
              gatilho_beneficio_anual_reais: z.number(),
              percentual_do_valor_recebido: z.number(),
              compensavel_com_icms: z.boolean(),
              sujeito_ao_limite_anual: z.boolean(),
            })
            .loose(),
        }),
        esporte: mechanism,
        fia: mechanism,
        idoso: mechanism,
        pronon: mechanism,
        pronas: mechanism,
      })
      .loose(),
    pf: z
      .object({
        modelo_declaracao: z.string(),
        limite_percentual_cesta: z.number(),
        limite_percentual_cesta_com_esporte: z.number(),
        membros_cesta: z.array(z.string()),
        percentual_dedutivel: z.record(z.string(), z.number()),
        limite_individual_audiovisual_art1: z.number(),
        doacao_na_declaracao: z.record(z.string(), z.number()),
        prazo_aporte: z.string(),
        onde_declarar: z.string(),
        lc_224_aplica: z.boolean(),
        faixas_ir_devido: taxBandTable,
        fonte: z.string(),
        status,
      })
      .loose(),
    captacao: z
      .object({
        rouanet: z
          .object({
            remuneracao_captacao_percentual_max: z.number(),
            remuneracao_captacao_teto_reais: z.number(),
            teto_por_ano_em_plano_plurianual: z.boolean(),
            pagamento_proporcional_ao_captado: z.boolean(),
            status,
          })
          .loose(),
      })
      .loose(),
    exemplos: z
      .object({
        pj: z.array(z.record(z.string(), z.number())).min(1),
        pf: z.array(z.record(z.string(), z.number())).min(1),
        lic_rs: z.array(z.record(z.string(), z.number())).min(1),
        comissao_captacao_rouanet: z.array(z.record(z.string(), z.number())).min(1),
      })
      .loose(),
  })
  .loose();

export type SimulatorParams = z.infer<typeof simulatorParamsSchema>;

// Mecanismos usados pelo simulador (simulador-spec.md, seção 2).
export const SIMULATOR_MECHANISMS = [
  "rouanet_art18",
  "rouanet_art26_patrocinio",
  "rouanet_art26_doacao",
  "audiovisual_art1",
  "audiovisual_art1A",
  "lic_rs",
  "esporte",
  "fia",
  "idoso",
  "pronon",
  "pronas",
] as const;

export function loadParams(input: unknown = rawParams): SimulatorParams {
  return simulatorParamsSchema.parse(input);
}

// Validado uma vez na importação: um JSON inválido falha o build (scaffold.md, seção 6).
export const params: SimulatorParams = loadParams();

export function paramsAgeInDays(now: Date = new Date(), p: SimulatorParams = params): number {
  const updated = Date.parse(`${p.atualizado_em}T00:00:00Z`);
  return Math.floor((now.getTime() - updated) / 86_400_000);
}

// Limite anual da LIC-RS para o ICMS próprio do ano anterior (Lei 13.490/2010, art. 6).
// Faixas contínuas nos limites: 600.000 dá 120.000 pelas duas fórmulas (spec, 4.7).
// Arredondado a duas casas, meio para cima (spec, 9.1).
export function licRsAnnualLimit(icmsPriorYear: number, p: SimulatorParams = params): number {
  if (!(icmsPriorYear > 0)) return 0;
  for (const band of p.mecanismos.lic_rs.limite_por_faixa_icms_ano_anterior) {
    if (band.ate === null || icmsPriorYear <= band.ate) {
      return round2((icmsPriorYear * band.percentual) / 100 + band.acrescimo);
    }
  }
  return 0;
}
