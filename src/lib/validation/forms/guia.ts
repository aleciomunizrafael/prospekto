// Guia gratuito (estrutura-e-copy.md, seção 5.2) e modo "edição revisada em breve" (seção 10.3).
import { z } from "zod";
import { site } from "@/config/site";
import type { LeadSegment } from "@/lib/domain/enums";
import {
  cityField,
  consentFields,
  defineForm,
  emailField,
  hiddenFields,
  nameField,
  optionalText,
  ufField,
  type LeadDraft,
} from "./common";
import { GUIDE_PROFILES, type GuideProfile } from "./guia-options";

export * from "./guia-options";

const perfilField = z.enum(GUIDE_PROFILES, { error: "Escolha o seu perfil." });

// `outro` vai para PJ com tag perfil_outro (modelo-de-dados.md, seção 7).
export function segmentForProfile(perfil: GuideProfile): { segment: LeadSegment; tags: string[] } {
  switch (perfil) {
    case "empresa":
      return { segment: "PJ", tags: [] };
    case "contador":
      return { segment: "CONT", tags: [] };
    case "pessoa_fisica":
      return { segment: "PF", tags: [] };
    case "outro":
      return { segment: "PJ", tags: ["perfil_outro"] };
  }
}

export const guiaFormSchema = z.object({
  ...hiddenFields,
  nome: nameField,
  email: emailField,
  perfil: perfilField,
  empresa_ou_escritorio: optionalText(2, 120, "O nome da empresa ou do escritório"),
  cidade: cityField,
  uf: ufField,
  ...consentFields,
});
export type GuiaFormInput = z.input<typeof guiaFormSchema>;

export const guiaForm = defineForm({
  id: "guide",
  schema: guiaFormSchema,
  toLead: (d): LeadDraft => {
    const { segment, tags } = segmentForProfile(d.perfil);
    const attributes: Record<string, unknown> =
      segment === "CONT"
        ? { escritorio: d.empresa_ou_escritorio }
        : segment === "PJ"
          ? { empresa: d.empresa_ou_escritorio }
          : {};
    return {
      segment,
      interest: "rouanet",
      source: "guia",
      sourceDetail: d.source_page || "/guia",
      name: d.nome,
      email: d.email,
      city: d.cidade,
      uf: d.uf,
      tags: site.guide.available ? tags : [...tags, "avisar_guia"],
      attributes: Object.fromEntries(Object.entries(attributes).filter(([, v]) => v !== undefined)),
      guideVersion: site.guide.available ? site.guide.version : undefined,
      consentMarketing: d.consent_marketing,
      formData: {
        nome: d.nome,
        email: d.email,
        perfil: d.perfil,
        empresa_ou_escritorio: d.empresa_ou_escritorio ?? null,
        cidade: d.cidade,
        uf: d.uf,
        consent_lgpd: d.consent_lgpd,
        consent_marketing: d.consent_marketing,
      },
      thanksType: "guia",
      actionLabel: site.guide.available
        ? "pediu o guia Contabilizando Cultura"
        : "pediu para ser avisado sobre a edição revisada do guia Contabilizando Cultura",
      emailTemplate: { id: "guia", data: { guideAvailable: site.guide.available } },
    };
  },
});

// Modo "em breve": só e-mail, perfil e consentimento; lead com tag avisar_guia (seção 10.3).
export const guiaAvisoFormSchema = z.object({
  ...hiddenFields,
  email: emailField,
  perfil: perfilField,
  ...consentFields,
});
export type GuiaAvisoFormInput = z.input<typeof guiaAvisoFormSchema>;

export const guiaAvisoForm = defineForm({
  id: "guide_notify",
  schema: guiaAvisoFormSchema,
  toLead: (d): LeadDraft => {
    const { segment, tags } = segmentForProfile(d.perfil);
    return {
      segment,
      interest: "rouanet",
      source: "guia",
      sourceDetail: d.source_page || "/guia",
      // Sem campo de nome neste modo: usa a parte local do e-mail até a Daniela completar no CRM.
      name: nameFromEmail(d.email),
      email: d.email,
      tags: [...tags, "avisar_guia"],
      attributes: {},
      consentMarketing: d.consent_marketing,
      formData: {
        email: d.email,
        perfil: d.perfil,
        consent_lgpd: d.consent_lgpd,
        consent_marketing: d.consent_marketing,
      },
      thanksType: "guia",
      actionLabel: "pediu para ser avisado sobre a edição revisada do guia Contabilizando Cultura",
      emailTemplate: { id: "guia", data: { guideAvailable: false } },
    };
  },
});

export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  return cleaned.length >= 2 ? cleaned.slice(0, 120) : "Contato pelo site";
}
