// Aviso de novos projetos (estrutura-e-copy.md, seção 5.5): Home com a carteira vazia.
// Lead PJ em patrocinadores, estágio novo, origem site, tag avisar_projetos (modelo-de-dados.md, 7).
import { z } from "zod";
import { consentFields, defineForm, emailField, hiddenFields, optionalText } from "./common";
import type { LeadDraft } from "./common";
import { nameFromEmail } from "./guia";

export const avisoProjetosFormSchema = z.object({
  ...hiddenFields,
  email: emailField,
  cidade: optionalText(2, 80, "A cidade"),
  ...consentFields,
});
export type AvisoProjetosFormInput = z.input<typeof avisoProjetosFormSchema>;

export const avisoProjetosForm = defineForm({
  id: "projects_notify",
  schema: avisoProjetosFormSchema,
  toLead: (d): LeadDraft => ({
    segment: "PJ",
    interest: "rouanet",
    source: "site",
    sourceDetail: d.source_page || "/",
    name: nameFromEmail(d.email),
    email: d.email,
    city: d.cidade,
    tags: ["avisar_projetos"],
    attributes: {},
    consentMarketing: d.consent_marketing,
    formData: {
      email: d.email,
      cidade: d.cidade ?? null,
      consent_lgpd: d.consent_lgpd,
      consent_marketing: d.consent_marketing,
    },
    thanksType: "aviso-projetos",
    actionLabel: "pediu para ser avisado sobre novos projetos em captação",
    emailTemplate: { id: "aviso-projetos", data: {} },
  }),
});
