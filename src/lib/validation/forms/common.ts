// Campos padrão dos formulários públicos (estrutura-e-copy.md, seção 5.1): nome 2 a 120, e-mail
// válido em minúsculas, telefone opcional em E.164, cidade 2 a 80, UF das 27, CNPJ opcional com
// dígitos verificadores, mensagem até 2.000; consentimento em duas caixas, nenhuma pré-marcada.
// Mensagens em português e concretas. Reaproveita src/lib/validation/common.ts.
import { z } from "zod";
import type { LeadInterest, LeadSegment, LeadSource, Uf } from "@/lib/domain/enums";
import { cnpjSchema, emailSchema, phoneSchema, ufSchema } from "@/lib/validation/common";
import type { EmailTemplateData, EmailTemplateId } from "@/lib/email/templates";
import type { Ctx } from "@/lib/repos/ctx";

export const nameField = z
  .string({ error: "Informe seu nome." })
  .trim()
  .min(2, { error: "Informe seu nome (pelo menos 2 letras)." })
  .max(120, { error: "O nome pode ter até 120 caracteres." });

// Espaços e maiúsculas são normalizados antes da checagem de formato (seção 5.1).
export const emailField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  emailSchema,
);

// Campo vazio vira undefined; preenchido precisa ser um telefone com DDD.
export const phoneField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(phoneSchema.optional())
  .transform((v) => (v ? v : undefined));

// Telefone obrigatório (diagnóstico, contadores, municípios, proponentes): a conversa é marcada
// por WhatsApp ou ligação.
const PHONE_REQUIRED_MESSAGE = "Informe um telefone com DDD, por exemplo (54) 98403-2180.";
export const requiredPhoneField = z
  .string({ error: PHONE_REQUIRED_MESSAGE })
  .trim()
  .min(1, { error: PHONE_REQUIRED_MESSAGE })
  .pipe(phoneSchema)
  .refine((v) => v !== "", { error: PHONE_REQUIRED_MESSAGE });

export const cityField = z
  .string({ error: "Informe a cidade." })
  .trim()
  .min(2, { error: "Informe a cidade." })
  .max(80, { error: "A cidade pode ter até 80 caracteres." });

export const ufField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
  ufSchema,
);

export const messageField = z
  .string()
  .trim()
  .max(2000, { error: "A mensagem pode ter até 2.000 caracteres." });

export const requiredMessageField = messageField.refine((v) => v.length > 0, {
  error: "Conte o que você quer realizar.",
});

export const cnpjField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(cnpjSchema.optional());

// Texto opcional: vazio vira undefined; preenchido respeita o tamanho.
export const optionalText = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(
      z
        .string()
        .min(min, { error: `${label} precisa ter pelo menos ${min} caracteres.` })
        .max(max, { error: `${label} pode ter até ${max} caracteres.` })
        .optional(),
    );

// Caixa de seleção vinda de FormData: "on", "true" ou "1" marcam; ausente ou vazio não.
export const checkboxField = z.preprocess(
  (v) => v === "on" || v === "true" || v === "1" || v === true,
  z.boolean(),
);

export const CONSENT_REQUIRED_MESSAGE =
  "Para enviar, marque a caixa de autorização de contato (obrigatória).";

export const consentFields = {
  consent_lgpd: checkboxField.refine((v) => v === true, { error: CONSENT_REQUIRED_MESSAGE }),
  consent_marketing: checkboxField,
};

// Campos ocultos preenchidos no cliente (LeadForm): atribuição e página; e os de antispam.
export const hiddenFields = {
  form_id: z.string().trim().min(1).max(40),
  utm_source: z.string().trim().max(200).optional().default(""),
  utm_medium: z.string().trim().max(200).optional().default(""),
  utm_campaign: z.string().trim().max(200).optional().default(""),
  referrer: z.string().trim().max(2000).optional().default(""),
  landing_path: z.string().trim().max(500).optional().default(""),
  source_page: z.string().trim().max(200).optional().default(""),
  // Carimbo de tempo assinado (src/lib/signing.ts) e honeypot (`website`).
  form_ts: z.string().trim().max(500).optional().default(""),
  website: z.string().trim().max(500).optional().default(""),
};

export const hiddenFieldsSchema = z.object(hiddenFields);
export type HiddenFields = z.infer<typeof hiddenFieldsSchema>;

// FormData -> objeto simples (primeiro valor por chave; campos internos $ACTION_ ignorados).
export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    if (typeof value === "string" && !(key in out)) out[key] = value;
  }
  return out;
}

// Rascunho do lead produzido por cada formulário e consumido pela Server Action.
export type ThanksType =
  | "guia"
  | "contato"
  | "diagnostico"
  | "contadores"
  | "municipios"
  | "proponentes"
  | "mentoria"
  | "aviso-projetos";

export const THANKS_TYPES: readonly ThanksType[] = [
  "guia",
  "contato",
  "diagnostico",
  "contadores",
  "municipios",
  "proponentes",
  "mentoria",
  "aviso-projetos",
];

export type LeadDraft = {
  segment: LeadSegment;
  interest: LeadInterest;
  source: LeadSource;
  sourceDetail?: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  uf?: Uf;
  message?: string;
  tags: string[];
  attributes: Record<string, unknown>;
  guideVersion?: string;
  projectInterestId?: string;
  consentMarketing: boolean;
  // Dados enviados, gravados em activities.formulario (regra R-1) e usados no aviso interno.
  formData: Record<string, unknown>;
  thanksType: ThanksType;
  // Ação no passado para o motivo do e-mail ("baixou o guia Contabilizando Cultura").
  actionLabel: string;
  emailTemplate: {
    [K in EmailTemplateId]: { id: K; data: EmailTemplateData[K] };
  }[EmailTemplateId];
};

// Saída mínima de todo schema de formulário: os campos ocultos (atribuição e antispam).
export type FormOutput = HiddenFields & Record<string, unknown>;

// Resultado da validação assíncrona de um formulário (ex.: `projeto_id` existe e está publicado).
export type PrepareResult<T> =
  { ok: true; data: T } | { ok: false; fieldErrors: Record<string, string> };

export type FormDefinition<S extends z.ZodType = z.ZodType> = {
  // Valor do campo oculto `form_id` e do evento form_start (estrutura-e-copy.md, seção 9.2).
  id: string;
  schema: S;
  toLead: (data: z.output<S>) => LeadDraft;
  // Opcional: validação que depende do banco, antes de toLead (pode completar os dados).
  prepare?: (data: z.output<S>, ctx: Ctx) => Promise<PrepareResult<z.output<S>>>;
  // Opcional: efeito depois de gravar o lead (ex.: tarefa de agendamento); não roda em reenvio
  // deduplicado. Falhas vão ao log sem derrubar o envio.
  afterCreate?: (
    ctx: Ctx,
    info: { leadId: string; created: boolean; data: z.output<S>; draft: LeadDraft; now: Date },
  ) => Promise<void>;
};

export function defineForm<S extends z.ZodType>(def: FormDefinition<S>): FormDefinition<S> {
  return def;
}
