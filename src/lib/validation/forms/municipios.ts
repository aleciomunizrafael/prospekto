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

export const MUNICIPALITY_BODIES = ["secretaria", "diretoria", "fundacao", "outro"] as const;
export const MUNICIPALITY_BODY_LABELS: Record<(typeof MUNICIPALITY_BODIES)[number], string> = {
  secretaria: "Secretaria",
  diretoria: "Diretoria ou departamento",
  fundacao: "Fundação",
  outro: "Outro",
};

export const MUNICIPALITY_ROLES = [
  "secretario",
  "diretor",
  "tecnico",
  "prefeito_gabinete",
  "conselho",
  "outro",
] as const;
export const MUNICIPALITY_ROLE_LABELS: Record<(typeof MUNICIPALITY_ROLES)[number], string> = {
  secretario: "Secretário ou secretária",
  diretor: "Diretor ou diretora",
  tecnico: "Técnico ou técnica",
  prefeito_gabinete: "Prefeito ou gabinete",
  conselho: "Conselho de cultura",
  outro: "Outro",
};

export const MUNICIPALITY_NEEDS = [
  "editais",
  "prestacao_contas",
  "projetos_proprios",
  "lei_incentivo",
  "capacitacao",
  "outro",
] as const;
export const MUNICIPALITY_NEED_LABELS: Record<(typeof MUNICIPALITY_NEEDS)[number], string> = {
  editais: "Editais e comissões de seleção",
  prestacao_contas: "Prestação de contas (PNAB e editais)",
  projetos_proprios: "Projetos próprios do município (LIC-RS, Rouanet)",
  lei_incentivo: "Lei municipal de incentivo",
  capacitacao: "Capacitação da equipe e dos agentes culturais",
  outro: "Outro",
};

export const PNAB_STATUSES = ["ciclo_ativo", "saldo_a_executar", "nao_aderiu", "nao_sei"] as const;
export const PNAB_STATUS_LABELS: Record<(typeof PNAB_STATUSES)[number], string> = {
  ciclo_ativo: "Ciclo ativo",
  saldo_a_executar: "Com saldo a executar",
  nao_aderiu: "Não aderiu",
  nao_sei: "Não sei",
};

export const LOCAL_LAW_STATUSES = ["sim", "nao", "em_tramitacao", "nao_sei"] as const;
export const LOCAL_LAW_STATUS_LABELS: Record<(typeof LOCAL_LAW_STATUSES)[number], string> = {
  sim: "Sim",
  nao: "Não",
  em_tramitacao: "Em tramitação",
  nao_sei: "Não sei",
};

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
