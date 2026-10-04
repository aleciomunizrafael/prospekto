// Diagnóstico gratuito (estrutura-e-copy.md, seção 5.4; modelo-de-dados.md, seção 7).
// `tipo_pessoa` alterna os campos PJ e PF. Lead em patrocinadores, estágio novo, origem
// diagnostico; interesse lic_rs quando o regime é presumido ou Simples; `projeto_id` (id ou slug)
// precisa ser um projeto publicado (R-11) e vira project_interest_id mais a tag projeto:[slug];
// depois de gravar, tarefa de agendamento com SLA de 1 dia útil (personas-e-funis.md, 8.1).
import { z } from "zod";
import { slaDeadline } from "@/lib/domain/sla";
import { createActivity } from "@/lib/repos/activities";
import type { Ctx } from "@/lib/repos/ctx";
import { getPublishedProjectByRef } from "@/lib/repos/projects";
import {
  cityField,
  cnpjField,
  checkboxField,
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
import {
  APURACAO_OPTIONS,
  AVAILABILITY_OPTIONS,
  DECLARATION_MODELS,
  DIAGNOSTIC_FORMATS,
  DIAGNOSTIC_ROLES,
  IR_BANDS,
  IRPJ_BANDS,
  TAX_REGIME_OPTIONS,
  type DiagnosticFormat,
} from "./diagnostico-options";

export * from "./diagnostico-options";

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T, label: string) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.enum(values, { error: `Escolha uma opção em ${label}.` }).optional(),
  );

const commonFields = {
  ...hiddenFields,
  nome: nameField,
  email: emailField,
  telefone: requiredPhoneField,
  cidade: cityField,
  uf: ufField,
  // Oculto: id ou slug de um projeto publicado (validado em `prepare`); resolvido para o id.
  projeto_id: z.string().trim().max(120).optional().default(""),
  // Preenchido por `prepare` quando o projeto existe (tag projeto:[slug]).
  projeto_slug: z.string().trim().max(80).optional().default(""),
  // Oculto: simulação que originou o pedido (só registro no formulário recebido).
  simulation_id: z.string().trim().max(60).optional().default(""),
  disponibilidade: optionalEnum(AVAILABILITY_OPTIONS, "disponibilidade"),
  mensagem: messageField.optional().default(""),
  ...consentFields,
};

const pjSchema = z
  .object({
    tipo_pessoa: z.literal("PJ"),
    ...commonFields,
    empresa: z
      .string({ error: "Informe o nome da empresa." })
      .trim()
      .min(2, { error: "Informe o nome da empresa (pelo menos 2 letras)." })
      .max(120, { error: "O nome da empresa pode ter até 120 caracteres." }),
    cnpj: cnpjField,
    cargo: z.enum(DIAGNOSTIC_ROLES, { error: "Escolha o seu papel na empresa." }),
    regime_tributario: z.enum(TAX_REGIME_OPTIONS, {
      error: "Escolha o regime tributário da empresa.",
    }),
    irpj_faixa: z.enum(IRPJ_BANDS, { error: "Escolha a faixa de IRPJ devido no ano." }),
    apuracao: optionalEnum(APURACAO_OPTIONS, "apuração"),
    contador_escritorio: optionalText(2, 120, "O nome do escritório contábil"),
    formato: z.preprocess(
      (v) => (v === "" || v === undefined ? "diagnostico" : v),
      z.enum(DIAGNOSTIC_FORMATS, { error: "Escolha o formato da conversa." }),
    ),
    contador_participa: checkboxField,
  })
  .superRefine((d, ctx) => {
    if (d.formato === "diagnostico" && !d.contador_participa) {
      ctx.addIssue({
        code: "custom",
        path: ["contador_participa"],
        message:
          "O diagnóstico é com o seu contador presente. Marque a caixa ou escolha a simulação de 20 minutos, sem o contador.",
      });
    }
  });

const pfSchema = z.object({
  tipo_pessoa: z.literal("PF"),
  ...commonFields,
  modelo_declaracao: z.enum(DECLARATION_MODELS, {
    error: "Escolha o modelo da sua declaração.",
  }),
  ir_devido_faixa: z.enum(IR_BANDS, { error: "Escolha a faixa de imposto devido." }),
});

export const diagnosticoFormSchema = z.discriminatedUnion("tipo_pessoa", [pjSchema, pfSchema], {
  error: "Escolha pessoa jurídica ou física.",
});
export type DiagnosticoFormInput = z.input<typeof diagnosticoFormSchema>;
export type DiagnosticoFormOutput = z.output<typeof diagnosticoFormSchema>;

export const PROJECT_NOT_AVAILABLE_MESSAGE =
  "Este projeto não está mais em captação no site. Envie sem projeto ou escolha outro em Projetos em captação.";

export function isLicRsRegime(regime: (typeof TAX_REGIME_OPTIONS)[number]): boolean {
  return regime === "lucro_presumido" || regime === "simples";
}

export const diagnosticoForm = defineForm({
  id: "diagnostic",
  schema: diagnosticoFormSchema,
  // Projeto de interesse: existe e está publicado (captando + autorização, R-11).
  prepare: async (d, ctx: Ctx) => {
    if (!d.projeto_id) return { ok: true, data: { ...d, projeto_slug: "" } };
    const project = await getPublishedProjectByRef(ctx, d.projeto_id);
    if (!project) return { ok: false, fieldErrors: { projeto_id: PROJECT_NOT_AVAILABLE_MESSAGE } };
    return { ok: true, data: { ...d, projeto_id: project.id, projeto_slug: project.slug } };
  },
  toLead: (d): LeadDraft => {
    const tags: string[] = [];
    if (d.projeto_slug) tags.push(`projeto:${d.projeto_slug}`);
    const attributes: Record<string, unknown> = {};
    let interest: LeadDraft["interest"] = "rouanet";
    if (d.tipo_pessoa === "PJ") {
      attributes.empresa = d.empresa;
      if (d.cnpj) attributes.cnpj = d.cnpj;
      attributes.cargo = d.cargo;
      attributes.regime_tributario = d.regime_tributario;
      attributes.regime_confirmado_por = "declarado";
      attributes.irpj_faixa = d.irpj_faixa;
      if (d.apuracao) attributes.apuracao = d.apuracao;
      if (d.contador_escritorio) attributes.contador_escritorio = d.contador_escritorio;
      attributes.contador_participa = d.contador_participa;
      if (d.formato === "simulacao") tags.push("simulacao_primeiro");
      if (d.contador_participa) tags.push("contador_na_reuniao");
      if (isLicRsRegime(d.regime_tributario)) interest = "lic_rs";
    } else {
      attributes.modelo_declaracao = d.modelo_declaracao;
      attributes.ir_devido_faixa = d.ir_devido_faixa;
    }
    if (d.disponibilidade) attributes.disponibilidade = d.disponibilidade;
    const formato: DiagnosticFormat = d.tipo_pessoa === "PJ" ? d.formato : "diagnostico";
    const formData: Record<string, unknown> = {
      tipo_pessoa: d.tipo_pessoa,
      nome: d.nome,
      email: d.email,
      telefone: d.telefone,
      cidade: d.cidade,
      uf: d.uf,
      formato,
      disponibilidade: d.disponibilidade ?? null,
      mensagem: d.mensagem || null,
      projeto_id: d.projeto_id || null,
      projeto_slug: d.projeto_slug || null,
      simulation_id: d.simulation_id || null,
      consent_lgpd: d.consent_lgpd,
      consent_marketing: d.consent_marketing,
    };
    if (d.tipo_pessoa === "PJ") {
      Object.assign(formData, {
        empresa: d.empresa,
        cnpj: d.cnpj ?? null,
        cargo: d.cargo,
        regime_tributario: d.regime_tributario,
        irpj_faixa: d.irpj_faixa,
        apuracao: d.apuracao ?? null,
        contador_escritorio: d.contador_escritorio ?? null,
        contador_participa: d.contador_participa,
      });
    } else {
      Object.assign(formData, {
        modelo_declaracao: d.modelo_declaracao,
        ir_devido_faixa: d.ir_devido_faixa,
      });
    }
    return {
      segment: d.tipo_pessoa,
      interest,
      source: "diagnostico",
      sourceDetail: d.source_page || "/diagnostico",
      name: d.nome,
      email: d.email,
      phone: d.telefone,
      city: d.cidade,
      uf: d.uf,
      message: d.mensagem || undefined,
      tags,
      attributes,
      projectInterestId: d.projeto_id || undefined,
      consentMarketing: d.consent_marketing,
      formData,
      thanksType: "diagnostico",
      actionLabel:
        formato === "simulacao"
          ? "pediu a simulação de 20 minutos"
          : d.tipo_pessoa === "PJ"
            ? "pediu o diagnóstico gratuito de 30 minutos com o contador"
            : "pediu o diagnóstico gratuito por ligação",
      emailTemplate: { id: "diagnostico", data: { formato, tipoPessoa: d.tipo_pessoa } },
    };
  },
  // Tarefa de agendamento (activities.tarefa) com prazo de 1 dia útil, o SLA de `novo` em
  // patrocinadores; sem responsável até a Daniela assumir no CRM.
  afterCreate: async (ctx, { leadId, data, now }) => {
    const formato = data.tipo_pessoa === "PJ" ? data.formato : "diagnostico";
    const meeting =
      formato === "simulacao"
        ? "simulação de 20 minutos"
        : data.tipo_pessoa === "PJ"
          ? "diagnóstico de 30 minutos com o contador"
          : "diagnóstico por ligação de 15 minutos";
    await createActivity(ctx, {
      type: "tarefa",
      subject: `Marcar ${meeting}`,
      dueAt: slaDeadline("patrocinadores", "novo", now) ?? now,
      leadId,
      projectId: data.projeto_id || undefined,
      data: {
        reason: "agendamento",
        formato,
        tipo_pessoa: data.tipo_pessoa,
        disponibilidade: data.disponibilidade ?? null,
        projeto_slug: data.projeto_slug || null,
      },
      occurredAt: now,
    });
  },
});
