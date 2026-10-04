// Contato (estrutura-e-copy.md, seção 5.5): o assunto define o pipeline; imprensa e outro
// entram em patrocinadores com a tag triagem.
import { z } from "zod";
import type { LeadInterest, LeadSegment } from "@/lib/domain/enums";
import {
  consentFields,
  defineForm,
  emailField,
  hiddenFields,
  nameField,
  optionalText,
  phoneField,
  requiredMessageField,
  type LeadDraft,
} from "./common";

export const CONTACT_SUBJECTS = [
  "patrocinar",
  "contador",
  "pessoa_fisica",
  "municipio",
  "proponente",
  "mentoria",
  "imprensa",
  "outro",
] as const;
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

export const CONTACT_SUBJECT_LABELS: Record<ContactSubject, string> = {
  patrocinar: "Quero patrocinar um projeto com a minha empresa",
  contador: "Sou contador e quero conhecer a parceria",
  pessoa_fisica: "Quero destinar parte do meu IR (pessoa física)",
  municipio: "Represento um município ou secretaria",
  proponente: "Tenho um projeto cultural",
  mentoria: "Tenho interesse na mentoria",
  imprensa: "Imprensa",
  outro: "Outro assunto",
};

export function segmentForSubject(subject: ContactSubject): {
  segment: LeadSegment;
  interest: LeadInterest;
  tags: string[];
} {
  switch (subject) {
    case "patrocinar":
      return { segment: "PJ", interest: "rouanet", tags: [] };
    case "pessoa_fisica":
      return { segment: "PF", interest: "rouanet", tags: [] };
    case "contador":
      return { segment: "CONT", interest: "rouanet", tags: [] };
    case "municipio":
      return { segment: "MUN", interest: "consultoria", tags: [] };
    case "proponente":
      return { segment: "PROP", interest: "nao_sei", tags: [] };
    case "mentoria":
      return { segment: "ALUNO", interest: "mentoria", tags: [] };
    case "imprensa":
    case "outro":
      return { segment: "PJ", interest: "nao_sei", tags: ["triagem"] };
  }
}

export const contatoFormSchema = z.object({
  ...hiddenFields,
  nome: nameField,
  email: emailField,
  telefone: phoneField,
  empresa: optionalText(2, 120, "O nome da empresa"),
  assunto: z.enum(CONTACT_SUBJECTS, { error: "Escolha o assunto." }),
  mensagem: requiredMessageField,
  ...consentFields,
});
export type ContatoFormInput = z.input<typeof contatoFormSchema>;

export const contatoForm = defineForm({
  id: "contact",
  schema: contatoFormSchema,
  toLead: (d): LeadDraft => {
    const { segment, interest, tags } = segmentForSubject(d.assunto);
    const attributes: Record<string, unknown> = { assunto: d.assunto };
    if (d.empresa) {
      if (segment === "CONT") attributes.escritorio = d.empresa;
      else if (segment === "MUN") attributes.municipio = d.empresa;
      else if (segment === "PROP") attributes.proponente = d.empresa;
      else attributes.empresa = d.empresa;
    }
    return {
      segment,
      interest,
      source: "site",
      sourceDetail: d.source_page || "/contato",
      name: d.nome,
      email: d.email,
      phone: d.telefone,
      message: d.mensagem,
      tags,
      attributes,
      consentMarketing: d.consent_marketing,
      formData: {
        nome: d.nome,
        email: d.email,
        telefone: d.telefone ?? null,
        empresa: d.empresa ?? null,
        assunto: d.assunto,
        mensagem: d.mensagem,
        consent_lgpd: d.consent_lgpd,
        consent_marketing: d.consent_marketing,
      },
      thanksType: "contato",
      actionLabel: "enviou uma mensagem pelo site da Prospekto",
      emailTemplate: { id: "contato", data: {} },
    };
  },
});
