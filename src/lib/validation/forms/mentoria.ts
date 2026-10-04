// Mentoria: lista de espera (estrutura-e-copy.md, seção 5.5; docs/produto/mentoria-e-curso.md).
// Lead ALUNO em alunos, estágio lista_espera, origem site, interesse mentoria.
import { z } from "zod";
import {
  consentFields,
  defineForm,
  emailField,
  hiddenFields,
  nameField,
  optionalText,
  phoneField,
  ufField,
  type LeadDraft,
} from "./common";

export const WAITLIST_GOALS = ["primeiro_projeto", "captar", "profissao", "atualizar"] as const;
export const WAITLIST_GOAL_LABELS: Record<(typeof WAITLIST_GOALS)[number], string> = {
  primeiro_projeto: "Inscrever meu primeiro projeto",
  captar: "Captar patrocínio para um projeto que já tenho",
  profissao: "Trabalhar como elaborador ou captador",
  atualizar: "Me atualizar nas normas (IN MinC 29/2026 e outras)",
};

export const WAITLIST_EXPERIENCES = [
  "nenhuma",
  "ja_escrevi",
  "ja_captei",
  "atuo_em_secretaria",
] as const;
export const WAITLIST_EXPERIENCE_LABELS: Record<(typeof WAITLIST_EXPERIENCES)[number], string> = {
  nenhuma: "Nenhuma: estou começando",
  ja_escrevi: "Já escrevi ou inscrevi projeto",
  ja_captei: "Já captei patrocínio",
  atuo_em_secretaria: "Atuo em secretaria ou órgão público de cultura",
};

export const INVESTMENT_BANDS = ["ate_500", "500_1500", "acima_1500", "prefiro_nao_dizer"] as const;
export const INVESTMENT_BAND_LABELS: Record<(typeof INVESTMENT_BANDS)[number], string> = {
  ate_500: "Até R$ 500",
  "500_1500": "De R$ 500 a R$ 1.500",
  acima_1500: "Acima de R$ 1.500",
  prefiro_nao_dizer: "Prefiro não dizer",
};

const optionalUf = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  ufField.optional(),
);

const optionalBand = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.enum(INVESTMENT_BANDS, { error: "Escolha uma das faixas." }).optional(),
);

export const mentoriaFormSchema = z.object({
  ...hiddenFields,
  nome: nameField,
  email: emailField,
  objetivo: z.enum(WAITLIST_GOALS, { error: "Escolha o seu objetivo com a mentoria." }),
  experiencia: z.enum(WAITLIST_EXPERIENCES, { error: "Escolha a sua experiência." }),
  telefone: phoneField,
  cidade: optionalText(2, 80, "A cidade"),
  uf: optionalUf,
  faixa_investimento: optionalBand,
  instagram_ou_linkedin: optionalText(2, 200, "O perfil no Instagram ou LinkedIn"),
  ...consentFields,
});
export type MentoriaFormInput = z.input<typeof mentoriaFormSchema>;

export const mentoriaForm = defineForm({
  id: "waitlist",
  schema: mentoriaFormSchema,
  toLead: (d): LeadDraft => {
    const attributes: Record<string, unknown> = {
      objetivo: d.objetivo,
      experiencia: d.experiencia,
    };
    if (d.faixa_investimento) attributes.faixa_investimento = d.faixa_investimento;
    if (d.instagram_ou_linkedin) attributes.instagram_ou_linkedin = d.instagram_ou_linkedin;
    return {
      segment: "ALUNO",
      interest: "mentoria",
      source: "site",
      sourceDetail: d.source_page || "/mentoria",
      name: d.nome,
      email: d.email,
      phone: d.telefone,
      city: d.cidade,
      uf: d.uf,
      tags: [],
      attributes,
      consentMarketing: d.consent_marketing,
      formData: {
        nome: d.nome,
        email: d.email,
        objetivo: d.objetivo,
        experiencia: d.experiencia,
        telefone: d.telefone ?? null,
        cidade: d.cidade ?? null,
        uf: d.uf ?? null,
        faixa_investimento: d.faixa_investimento ?? null,
        instagram_ou_linkedin: d.instagram_ou_linkedin ?? null,
        consent_lgpd: d.consent_lgpd,
        consent_marketing: d.consent_marketing,
      },
      thanksType: "mentoria",
      actionLabel: "entrou na lista de espera da mentoria",
      emailTemplate: { id: "mentoria", data: { surveyUrl: null } },
    };
  },
});
