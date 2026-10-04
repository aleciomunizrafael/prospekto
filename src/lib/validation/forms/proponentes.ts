// Proponentes: envio de projeto para avaliação (estrutura-e-copy.md, seção 5.5). Lead PROP em
// projetos, estágio prospeccao, origem site. O projeto (cultural_projects) e a organização
// proponente são criados pela Daniela na avaliação, não pelo formulário (modelo-de-dados.md, 7).
import { z } from "zod";
import type { LeadInterest } from "@/lib/domain/enums";
import {
  cityField,
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

export const PROPONENT_TYPES = ["pf", "mei", "pj", "instituicao", "municipio"] as const;
export const PROPONENT_TYPE_LABELS: Record<(typeof PROPONENT_TYPES)[number], string> = {
  pf: "Pessoa física",
  mei: "MEI",
  pj: "Empresa (produtora)",
  instituicao: "Instituição sem fins lucrativos",
  municipio: "Município",
};

export const PROJECT_MECHANISMS = [
  "rouanet",
  "audiovisual",
  "lic_rs",
  "lic_municipal",
  "pnab",
  "nao_sei",
] as const;
export const PROJECT_MECHANISM_LABELS: Record<(typeof PROJECT_MECHANISMS)[number], string> = {
  rouanet: "Lei Rouanet (Lei 8.313/1991)",
  audiovisual: "Lei do Audiovisual (Lei 8.685/1993)",
  lic_rs: "LIC-RS (ICMS)",
  lic_municipal: "Lei municipal de incentivo",
  pnab: "PNAB ou edital",
  nao_sei: "Ainda não sei",
};

export const PROJECT_STATUSES = [
  "ideia",
  "em_elaboracao",
  "inscrito",
  "aprovado_captando",
  "em_execucao",
] as const;
export const PROJECT_STATUS_LABELS: Record<(typeof PROJECT_STATUSES)[number], string> = {
  ideia: "Ideia",
  em_elaboracao: "Em elaboração",
  inscrito: "Inscrito, aguardando análise",
  aprovado_captando: "Aprovado e autorizado a captar",
  em_execucao: "Em execução",
};

export const PRIOR_ACCOUNTABILITY = ["nunca_teve", "aprovada", "pendente", "reprovada"] as const;
export const PRIOR_ACCOUNTABILITY_LABELS: Record<(typeof PRIOR_ACCOUNTABILITY)[number], string> = {
  nunca_teve: "Nunca prestei contas de projeto incentivado",
  aprovada: "Aprovada",
  pendente: "Pendente de análise",
  reprovada: "Reprovada ou com diligência",
};

// Valor em reais digitado livremente ("150.000,00", "150000"); vazio vira undefined.
export const optionalMoneyField = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const raw = v.trim();
    if (!raw) return undefined;
    const normalized = raw
      .replace(/[R$\s]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : Number.NaN;
  },
  z
    .number({ error: "Informe um valor em reais, por exemplo 150.000." })
    .nonnegative({ error: "O valor não pode ser negativo." })
    .max(1_000_000_000, { error: "Confira o valor: parece alto demais." })
    .optional(),
);

export const optionalUrlField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(
    z
      .url({ error: "Informe um link completo, por exemplo https://drive.google.com/..." })
      .max(500, { error: "O link pode ter até 500 caracteres." })
      .optional(),
  );

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.enum(values, { error: "Escolha uma das opções." }).optional(),
  );

export const proponentesFormSchema = z.object({
  ...hiddenFields,
  proponente: z
    .string({ error: "Informe o nome do proponente." })
    .trim()
    .min(2, { error: "Informe o nome do proponente (pelo menos 2 letras)." })
    .max(200, { error: "O nome do proponente pode ter até 200 caracteres." }),
  tipo_proponente: z.enum(PROPONENT_TYPES, { error: "Escolha o tipo de proponente." }),
  nome: nameField,
  email: emailField,
  telefone: requiredPhoneField,
  projeto_nome: z
    .string({ error: "Informe o nome do projeto." })
    .trim()
    .min(2, { error: "Informe o nome do projeto (pelo menos 2 letras)." })
    .max(200, { error: "O nome do projeto pode ter até 200 caracteres." }),
  mecanismo: z.enum(PROJECT_MECHANISMS, { error: "Escolha o mecanismo do projeto." }),
  status_projeto: z.enum(PROJECT_STATUSES, { error: "Escolha a situação do projeto." }),
  segmento_cultural: z
    .string({ error: "Informe o segmento cultural." })
    .trim()
    .min(2, { error: "Informe o segmento cultural, por exemplo música instrumental." })
    .max(120, { error: "O segmento cultural pode ter até 120 caracteres." }),
  cidade: cityField,
  uf: ufField,
  numero_processo: optionalText(2, 60, "O número do processo"),
  valor_aprovado: optionalMoneyField,
  saldo_a_captar: optionalMoneyField,
  prazo_captacao: optionalText(4, 40, "O prazo de captação"),
  link_material: optionalUrlField,
  prestacao_contas_anterior: optionalEnum(PRIOR_ACCOUNTABILITY),
  mensagem: messageField.optional().default(""),
  ...consentFields,
});
export type ProponentesFormInput = z.input<typeof proponentesFormSchema>;

export function interestForMechanism(mechanism: (typeof PROJECT_MECHANISMS)[number]): LeadInterest {
  switch (mechanism) {
    case "rouanet":
      return "rouanet";
    case "audiovisual":
      return "audiovisual";
    case "lic_rs":
      return "lic_rs";
    case "lic_municipal":
      return "lic_municipal";
    case "pnab":
      return "pnab_editais";
    case "nao_sei":
      return "nao_sei";
  }
}

export const proponentesForm = defineForm({
  id: "proponent",
  schema: proponentesFormSchema,
  toLead: (d): LeadDraft => {
    const attributes: Record<string, unknown> = {
      proponente: d.proponente,
      tipo_proponente: d.tipo_proponente,
      projeto_nome: d.projeto_nome,
      mecanismo: d.mecanismo,
      status_projeto: d.status_projeto,
      segmento_cultural: d.segmento_cultural,
    };
    if (d.numero_processo) attributes.numero_processo = d.numero_processo;
    if (d.valor_aprovado !== undefined) attributes.valor_aprovado = d.valor_aprovado;
    if (d.saldo_a_captar !== undefined) attributes.saldo_a_captar = d.saldo_a_captar;
    if (d.prazo_captacao) attributes.prazo_captacao = d.prazo_captacao;
    if (d.link_material) attributes.link_material = d.link_material;
    if (d.prestacao_contas_anterior)
      attributes.prestacao_contas_anterior = d.prestacao_contas_anterior;
    return {
      segment: "PROP",
      interest: interestForMechanism(d.mecanismo),
      source: "site",
      sourceDetail: d.source_page || "/proponentes",
      name: d.nome,
      email: d.email,
      phone: d.telefone,
      city: d.cidade,
      uf: d.uf,
      message: d.mensagem || undefined,
      tags: [],
      attributes,
      consentMarketing: d.consent_marketing,
      formData: {
        proponente: d.proponente,
        tipo_proponente: d.tipo_proponente,
        nome: d.nome,
        email: d.email,
        telefone: d.telefone,
        projeto_nome: d.projeto_nome,
        mecanismo: d.mecanismo,
        status_projeto: d.status_projeto,
        segmento_cultural: d.segmento_cultural,
        cidade: d.cidade,
        uf: d.uf,
        numero_processo: d.numero_processo ?? null,
        valor_aprovado: d.valor_aprovado ?? null,
        saldo_a_captar: d.saldo_a_captar ?? null,
        prazo_captacao: d.prazo_captacao ?? null,
        link_material: d.link_material ?? null,
        prestacao_contas_anterior: d.prestacao_contas_anterior ?? null,
        mensagem: d.mensagem || null,
        consent_lgpd: d.consent_lgpd,
        consent_marketing: d.consent_marketing,
      },
      thanksType: "proponentes",
      actionLabel: "enviou um projeto cultural para avaliação",
      emailTemplate: { id: "proponentes", data: {} },
    };
  },
});
