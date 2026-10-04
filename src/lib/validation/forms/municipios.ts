// Municípios: diagnóstico do fomento municipal (estrutura-e-copy.md, seção 5.5). Lead MUN em
// municipios, estágio novo, origem site, interesse consultoria.
import { z } from "zod";
import {
  consentFields,
  defineForm,
  emailField,
  hiddenFields,
  messageField,
  nameField,
  requiredPhoneField,
  type LeadDraft,
} from "./common";
import {
  MUNICIPALITY_BODIES,
  MUNICIPALITY_ROLES,
  MUNICIPALITY_NEEDS,
  PNAB_STATUSES,
  LOCAL_LAW_STATUSES,
} from "./municipios-options";

export * from "./municipios-options";

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.enum(values, { error: "Escolha uma das opções." }).optional(),
  );

export const municipiosFormSchema = z.object({
  ...hiddenFields,
  municipio: z
    .string({ error: "Informe o município." })
    .trim()
    .min(2, { error: "Informe o município (pelo menos 2 letras)." })
    .max(120, { error: "O município pode ter até 120 caracteres." }),
  orgao: z.enum(MUNICIPALITY_BODIES, { error: "Escolha o tipo de órgão." }),
  cargo: z.enum(MUNICIPALITY_ROLES, { error: "Escolha o seu cargo." }),
  nome: nameField,
  email: emailField,
  telefone: requiredPhoneField,
  necessidade: z.enum(MUNICIPALITY_NEEDS, { error: "Escolha a principal necessidade." }),
  pnab_status: optionalEnum(PNAB_STATUSES),
  lei_incentivo_municipal: optionalEnum(LOCAL_LAW_STATUSES),
  mensagem: messageField.optional().default(""),
  ...consentFields,
});
export type MunicipiosFormInput = z.input<typeof municipiosFormSchema>;

export const municipiosForm = defineForm({
  id: "municipality",
  schema: municipiosFormSchema,
  toLead: (d): LeadDraft => {
    const attributes: Record<string, unknown> = {
      municipio: d.municipio,
      orgao: d.orgao,
      cargo: d.cargo,
      necessidade: d.necessidade,
    };
    if (d.pnab_status) attributes.pnab_status = d.pnab_status;
    if (d.lei_incentivo_municipal) attributes.lei_incentivo_municipal = d.lei_incentivo_municipal;
    return {
      segment: "MUN",
      interest: "consultoria",
      source: "site",
      sourceDetail: d.source_page || "/municipios",
      name: d.nome,
      email: d.email,
      phone: d.telefone,
      city: d.municipio,
      message: d.mensagem || undefined,
      tags: [],
      attributes,
      consentMarketing: d.consent_marketing,
      formData: {
        municipio: d.municipio,
        orgao: d.orgao,
        cargo: d.cargo,
        nome: d.nome,
        email: d.email,
        telefone: d.telefone,
        necessidade: d.necessidade,
        pnab_status: d.pnab_status ?? null,
        lei_incentivo_municipal: d.lei_incentivo_municipal ?? null,
        mensagem: d.mensagem || null,
        consent_lgpd: d.consent_lgpd,
        consent_marketing: d.consent_marketing,
      },
      thanksType: "municipios",
      actionLabel: "pediu o diagnóstico do fomento municipal",
      emailTemplate: { id: "municipios", data: {} },
    };
  },
});
