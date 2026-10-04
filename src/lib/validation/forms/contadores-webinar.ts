// Contadores: inscrição no webinar (estrutura-e-copy.md, seção 5.5). Lead CONT em contadores,
// estágio novo, origem site com source_detail = webinar:[data]. A data é a da próxima edição.
import { z } from "zod";
import {
  consentFields,
  defineForm,
  emailField,
  hiddenFields,
  nameField,
  type LeadDraft,
} from "./common";
import { LUCRO_REAL_BANDS, isOutsideIcp } from "./contadores";

// Próxima edição do webinar para contadores (docs/playbooks/parceiros-contadores.md). A data
// entra em source_detail; o site mostra "data a confirmar" enquanto marcada com [verificar].
export const WEBINAR = {
  date: "2026-11",
  title: "Lei Rouanet no planejamento tributário: o que o escritório precisa saber",
  whenLabel: "Novembro de 2026, ao vivo, 1 hora [verificar data e horário]",
} as const;

const optionalBand = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.enum(LUCRO_REAL_BANDS, { error: "Escolha uma das faixas." }).optional(),
);

export const contadoresWebinarFormSchema = z.object({
  ...hiddenFields,
  nome: nameField,
  email: emailField,
  escritorio: z
    .string({ error: "Informe o nome do escritório." })
    .trim()
    .min(2, { error: "Informe o nome do escritório (pelo menos 2 letras)." })
    .max(120, { error: "O nome do escritório pode ter até 120 caracteres." }),
  clientes_lucro_real_faixa: optionalBand,
  ...consentFields,
});
export type ContadoresWebinarFormInput = z.input<typeof contadoresWebinarFormSchema>;

export const contadoresWebinarForm = defineForm({
  id: "accountant_webinar",
  schema: contadoresWebinarFormSchema,
  toLead: (d): LeadDraft => {
    const band = d.clientes_lucro_real_faixa;
    const foraDoIcp = band ? isOutsideIcp(band) : false;
    const attributes: Record<string, unknown> = { escritorio: d.escritorio };
    if (band) attributes.clientes_lucro_real_faixa = band;
    return {
      segment: "CONT",
      interest: "rouanet",
      source: "site",
      sourceDetail: `webinar:${WEBINAR.date}`,
      name: d.nome,
      email: d.email,
      tags: foraDoIcp ? ["webinar", "fora_do_icp"] : ["webinar"],
      attributes,
      consentMarketing: d.consent_marketing,
      formData: {
        nome: d.nome,
        email: d.email,
        escritorio: d.escritorio,
        clientes_lucro_real_faixa: band ?? null,
        webinar: WEBINAR.date,
        consent_lgpd: d.consent_lgpd,
        consent_marketing: d.consent_marketing,
      },
      thanksType: "contadores",
      actionLabel: "se inscreveu no webinar da Prospekto para escritórios contábeis",
      emailTemplate: { id: "contadores", data: { foraDoIcp } },
    };
  },
});
