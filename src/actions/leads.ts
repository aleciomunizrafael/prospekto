"use server";

// public-action: formulário público do site; não exige sessão de propósito
// (tests/auth-guard.test.ts reconhece este marcador). Toda outra Server Action exige sessão.
//
// Server Action pública de captura de leads (estrutura-e-copy.md, seção 5; modelo-de-dados.md,
// regras R-1, R-2 e R-18). Usada com useActionState pelo componente LeadForm. É o único ponto de
// escrita aberto ao público e, por isso, concentra o antispam (honeypot, carimbo de tempo assinado
// com mínimo de 3 s, limite de 5 envios por IP por hora) e a deduplicação.
// A resposta nunca revela se o e-mail já existia; erros de gravação não vazam detalhes.
// Como criar um formulário novo sobre esta infraestrutura: src/actions/README.md.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { site } from "@/config/site";
import { renderLeadNotification, renderTemplate } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { log } from "@/lib/log";
import type { Ctx } from "@/lib/repos/ctx";
import { hitFormAttempt } from "@/lib/repos/form-attempts";
import { createLead } from "@/lib/repos/leads";
import { hashIp, issueFormTimestamp, issueGuideToken, verifyFormTimestamp } from "@/lib/signing";
import type { ConsentInput } from "@/lib/validation/leads";
import { formDataToObject, getForm, type FormOutput, type LeadDraft } from "@/lib/validation/forms";
import type { LeadFormState } from "@/lib/validation/forms/state";

const STORAGE_ERROR =
  "Não conseguimos registrar seu pedido agora. Tente de novo em alguns minutos ou escreva para projetos@prospekto.com.br.";
const RATE_LIMIT_ERROR =
  "Recebemos muitos envios deste endereço em pouco tempo. Tente de novo em uma hora ou fale pelo WhatsApp.";
const TOKEN_ERROR = "Não foi possível validar o envio. Recarregue a página e tente de novo.";
const VALIDATION_ERROR = "Confira os campos destacados abaixo.";

// Carimbo de tempo assinado, pedido pelo LeadForm ao montar (as páginas são estáticas, então o
// carimbo não pode vir do HTML gerado no build).
export async function issueFormToken(): Promise<string> {
  return issueFormTimestamp();
}

export async function createLeadFromForm(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const raw = formDataToObject(formData);
  const values = publicValues(raw);
  const form = getForm(raw.form_id ?? "");
  if (!form) {
    log("warn", "formulário não reconhecido", { formId: raw.form_id ?? null });
    return {
      status: "error",
      errorCode: "unknown_form",
      message: "Formulário não reconhecido. Recarregue a página e tente de novo.",
      values,
    };
  }

  const parsed = form.schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !(key in fieldErrors)) fieldErrors[key] = issue.message;
    }
    return {
      status: "error",
      errorCode: "validation",
      message: VALIDATION_ERROR,
      fieldErrors,
      values,
    };
  }

  const ctx: Ctx = { tenantId: env.DEFAULT_TENANT_ID, userId: null };

  // Todo schema de formulário inclui hiddenFields (src/lib/validation/forms/common.ts).
  let data = parsed.data as FormOutput;
  // Validação que depende do banco (ex.: projeto_id publicado), antes do mapeamento para lead.
  if (form.prepare) {
    let prepared: Awaited<ReturnType<NonNullable<typeof form.prepare>>>;
    try {
      prepared = await form.prepare(data, ctx);
    } catch (error) {
      log("error", "falha na validação assíncrona do formulário", { formId: form.id, error });
      return { status: "error", errorCode: "storage", message: STORAGE_ERROR, values };
    }
    if (!prepared.ok) {
      return {
        status: "error",
        errorCode: "validation",
        message: VALIDATION_ERROR,
        fieldErrors: prepared.fieldErrors,
        values,
      };
    }
    data = prepared.data as FormOutput;
  }
  const draft = form.toLead(data);
  // Parâmetros da página de obrigado só para analytics (form_submit): id do formulário, segmento e
  // origem. Nenhum dado pessoal na URL.
  const thanks = new URLSearchParams({ f: form.id, s: draft.segment, o: draft.source });
  const thanksPath = `/obrigado/${draft.thanksType}?${thanks.toString()}`;

  // Regra R-18: honeypot preenchido ou envio em menos de 3 segundos responde sucesso sem gravar.
  if (raw.website) {
    log("info", "formulário descartado: honeypot", { formId: form.id });
    redirect(thanksPath);
  }
  const stamp = verifyFormTimestamp(raw.form_ts);
  if (stamp.status === "too_fast") {
    log("info", "formulário descartado: envio rápido", { formId: form.id });
    redirect(thanksPath);
  }
  if (stamp.status !== "ok") {
    return { status: "error", errorCode: "token", message: TOKEN_ERROR, values };
  }

  const meta = await requestMeta();

  // Limite de 5 envios por IP por hora (form_attempts). Falha do contador não bloqueia o envio.
  try {
    const attempt = await hitFormAttempt(ctx, hashIp(meta.ip));
    if (!attempt.allowed) {
      log("warn", "formulário bloqueado: limite por IP", { formId: form.id, count: attempt.count });
      return { status: "error", errorCode: "rate_limited", message: RATE_LIMIT_ERROR, values };
    }
  } catch (error) {
    log("error", "falha ao registrar tentativa de formulário", { formId: form.id, error });
  }

  let created: boolean;
  let leadId: string;
  let pipeline: string;
  let stage: string;
  let deduplicated: boolean;
  try {
    const result = await createLead(ctx, {
      segment: draft.segment,
      interest: draft.interest,
      name: draft.name,
      email: draft.email,
      phone: draft.phone,
      city: draft.city,
      uf: draft.uf,
      message: draft.message,
      source: draft.source,
      sourceDetail: draft.sourceDetail,
      utmSource: data.utm_source || undefined,
      utmMedium: data.utm_medium || undefined,
      utmCampaign: data.utm_campaign || undefined,
      referrer: data.referrer || undefined,
      landingPath: data.landing_path || undefined,
      tags: draft.tags,
      attributes: draft.attributes,
      guideVersion: draft.guideVersion,
      projectInterestId: draft.projectInterestId,
      consents: buildConsents(draft, data.source_page, meta.userAgent),
      formData: { form_id: form.id, ...draft.formData },
    });
    created = result.created;
    deduplicated = result.deduplicated;
    leadId = result.lead.id;
    pipeline = result.lead.pipeline;
    stage = result.lead.stage;
  } catch (error) {
    log("error", "falha ao gravar lead do formulário", { formId: form.id, error });
    return { status: "error", errorCode: "storage", message: STORAGE_ERROR, values };
  }

  log(
    "info",
    deduplicated ? "formulário deduplicado" : created ? "lead criado" : "lead atualizado",
    {
      tenantId: ctx.tenantId,
      formId: form.id,
      leadId,
      segment: draft.segment,
      pipeline,
    },
  );

  // Link assinado do guia (72 h) na página de obrigado e no e-mail (seção 10.3).
  const guideToken =
    draft.thanksType === "guia" && site.guide.available
      ? issueGuideToken({ leadId, guideVersion: site.guide.version, tenantId: ctx.tenantId })
      : null;

  // Reenvio em 10 minutos (R-2) não grava nem reenvia e-mails; a resposta é a mesma.
  if (!deduplicated) {
    if (form.afterCreate) {
      try {
        await form.afterCreate(ctx, { leadId, created, data, draft, now: new Date() });
      } catch (error) {
        log("error", "falha no efeito pós-gravação do formulário", { formId: form.id, error });
      }
    }
    await notify(draft, { formId: form.id, leadId, pipeline, stage, created, guideToken });
  }

  if (guideToken) thanks.set("t", guideToken);
  redirect(`/obrigado/${draft.thanksType}?${thanks.toString()}`);
}

function publicValues(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key !== "website" && key !== "form_ts") out[key] = value;
  }
  return out;
}

async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    return { ip, userAgent: h.get("user-agent") };
  } catch {
    // Fora de uma requisição (testes): sem IP nem user agent.
    return { ip: null, userAgent: null };
  }
}

// Regra R-1 e seção 5.1: caixa 1 obrigatória (contato_comercial), caixa 2 opcional (marketing);
// canais conforme a caixa e o telefone informado; texto integral e versão da política.
function buildConsents(
  draft: LeadDraft,
  sourcePage: string,
  userAgent: string | null,
): ConsentInput[] {
  const page = sourcePage || draft.sourceDetail || "/";
  const consents: ConsentInput[] = [
    {
      purpose: "contato_comercial",
      granted: true,
      policyVersion: site.policyVersion,
      consentText: site.consent.contact,
      channels: draft.phone ? ["email", "telefone"] : ["email"],
      sourcePage: page,
      userAgent: userAgent ?? undefined,
    },
  ];
  if (draft.consentMarketing) {
    consents.push({
      purpose: "marketing",
      granted: true,
      policyVersion: site.policyVersion,
      consentText: site.consent.marketing,
      channels: draft.phone ? ["email", "whatsapp"] : ["email"],
      sourcePage: page,
      userAgent: userAgent ?? undefined,
    });
  }
  return consents;
}

// E-mails: resposta automática ao lead (seção 5.6) e aviso interno. Falhas só vão ao log.
async function notify(
  draft: LeadDraft,
  info: {
    formId: string;
    leadId: string;
    pipeline: string;
    stage: string;
    created: boolean;
    guideToken: string | null;
  },
): Promise<void> {
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const now = new Date();
  // Descadastro de um clique entra com o webhook do Resend (próxima onda); até lá, o lead responde
  // ao e-mail ou escreve para projetos@. O link aponta para a seção de direitos da política.
  const unsubscribeUrl = draft.consentMarketing ? `${appUrl}/privacidade#direitos` : undefined;
  try {
    const template = draft.emailTemplate;
    const data =
      template.id === "guia"
        ? {
            ...template.data,
            downloadUrl: info.guideToken
              ? `${appUrl}/api/downloads/guia?token=${encodeURIComponent(info.guideToken)}&s=email`
              : null,
          }
        : template.data;
    const rendered = renderTemplate(
      template.id,
      {
        name: draft.name,
        actionLabel: draft.actionLabel,
        sentAt: now,
        marketing: draft.consentMarketing,
        unsubscribeUrl,
      },
      data as never,
    );
    await sendEmail({
      to: draft.email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      replyTo: site.email,
      templateId: template.id,
      leadId: info.leadId,
      unsubscribeUrl,
    });
  } catch (error) {
    log("error", "falha na resposta automática", { leadId: info.leadId, error });
  }
  try {
    const summary: Record<string, string> = {};
    for (const [key, value] of Object.entries(draft.formData)) {
      if (value === null || value === undefined || value === "") continue;
      summary[key] = typeof value === "string" ? value : JSON.stringify(value);
    }
    const rendered = renderLeadNotification({
      formId: info.formId,
      segment: draft.segment,
      pipeline: info.pipeline,
      stage: info.stage,
      created: info.created,
      leadId: info.leadId,
      summary,
    });
    await sendEmail({
      to: env.LEAD_NOTIFY_EMAIL,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      replyTo: draft.email,
      templateId: "lead-notification",
      leadId: info.leadId,
    });
  } catch (error) {
    log("error", "falha no aviso interno de lead", { leadId: info.leadId, error });
  }
}
