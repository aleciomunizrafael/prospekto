// Contadores: diagnóstico de carteira (estrutura-e-copy.md, seção 5.5; modelo-de-dados.md, 7).
// Lead CONT em contadores, estágio novo, origem site; `clientes_lucro_real_faixa = nenhum` cria o
// lead com a tag fora_do_icp e a resposta automática sugere a LIC-RS.
import { z } from "zod";
import {
  cityField,
  cnpjField,
  consentFields,
  defineForm,
  emailField,
  hiddenFields,
  messageField,
  nameField,
  optionalText,
  requiredPhoneField,
  ufField,
  type LeadDraft,
} from "./common";

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

const officeField = z
  .string({ error: "Informe o nome do escritório." })
  .trim()
  .min(2, { error: "Informe o nome do escritório (pelo menos 2 letras)." })
  .max(120, { error: "O nome do escritório pode ter até 120 caracteres." });

const optionalYesNo = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.enum(YES_NO, { error: "Escolha sim ou não." }).optional(),
);

export const contadoresFormSchema = z.object({
  ...hiddenFields,
  escritorio: officeField,
  nome: nameField,
  cargo: z.enum(ACCOUNTANT_ROLES, { error: "Escolha o seu cargo no escritório." }),
  email: emailField,
  telefone: requiredPhoneField,
  clientes_lucro_real_faixa: z.enum(LUCRO_REAL_BANDS, {
    error: "Informe quantos clientes do escritório estão no lucro real.",
  }),
  cidade: cityField,
  uf: ufField,
  cnpj: cnpjField,
  ja_lancou_incentivo: optionalYesNo,
  registro_crc: optionalText(2, 40, "O registro no CRC"),
  mensagem: messageField.optional().default(""),
  ...consentFields,
});
export type ContadoresFormInput = z.input<typeof contadoresFormSchema>;

export function isOutsideIcp(band: LucroRealBand): boolean {
  return band === "nenhum";
}

export const contadoresForm = defineForm({
  id: "accountant",
  schema: contadoresFormSchema,
  toLead: (d): LeadDraft => {
    const foraDoIcp = isOutsideIcp(d.clientes_lucro_real_faixa);
    const attributes: Record<string, unknown> = {
      escritorio: d.escritorio,
      cargo: d.cargo,
      clientes_lucro_real_faixa: d.clientes_lucro_real_faixa,
      uf: d.uf,
    };
    if (d.cnpj) attributes.cnpj = d.cnpj;
    if (d.ja_lancou_incentivo) attributes.ja_lancou_incentivo = d.ja_lancou_incentivo === "sim";
    if (d.registro_crc) attributes.registro_crc = d.registro_crc;
    return {
      segment: "CONT",
      interest: foraDoIcp ? "lic_rs" : "rouanet",
      source: "site",
      sourceDetail: d.source_page || "/contadores",
      name: d.nome,
      email: d.email,
      phone: d.telefone,
      city: d.cidade,
      uf: d.uf,
      message: d.mensagem || undefined,
      tags: foraDoIcp ? ["fora_do_icp"] : [],
      attributes,
      consentMarketing: d.consent_marketing,
      formData: {
        escritorio: d.escritorio,
        nome: d.nome,
        cargo: d.cargo,
        email: d.email,
        telefone: d.telefone,
        clientes_lucro_real_faixa: d.clientes_lucro_real_faixa,
        cidade: d.cidade,
        uf: d.uf,
        cnpj: d.cnpj ?? null,
        ja_lancou_incentivo: d.ja_lancou_incentivo ?? null,
        registro_crc: d.registro_crc ?? null,
        mensagem: d.mensagem || null,
        consent_lgpd: d.consent_lgpd,
        consent_marketing: d.consent_marketing,
      },
      thanksType: "contadores",
      actionLabel: "pediu o diagnóstico da carteira do escritório",
      emailTemplate: { id: "contadores", data: { foraDoIcp } },
    };
  },
});
