"use server";

// public-action: formulário público do site; não exige sessão de propósito
// (tests/auth-guard.test.ts reconhece este marcador). Toda outra Server Action exige sessão.
//
// Server Action pública de captura de leads (estrutura-e-copy.md, seção 5; modelo-de-dados.md,
// regras R-1, R-2 e R-18). Usada com useActionState pelo componente LeadForm. É o único ponto de
// escrita aberto ao público junto com o gate do simulador (src/actions/simulator.ts); por isso o
// antispam (honeypot, carimbo de tempo assinado com mínimo de 3 s, limite de 5 envios por IP por
// hora), os consentimentos e os e-mails ficam no núcleo compartilhado src/lib/leads/submit.ts.
// A resposta nunca revela se o e-mail já existia; erros de gravação não vazam detalhes.
// Como criar um formulário novo sobre esta infraestrutura: src/actions/README.md.
import { redirect } from "next/navigation";
import { env } from "@/env";
import { site } from "@/config/site";
import {
  RATE_LIMIT_ERROR,
  STORAGE_ERROR,
  TOKEN_ERROR,
  VALIDATION_ERROR,
  appUrl,
  buildConsents,
  checkAntispam,
  checkRateLimit,
  notifyLead,
  publicValues,
  requestMeta,
} from "@/lib/leads/submit";
import { log } from "@/lib/log";
import type { Ctx } from "@/lib/repos/ctx";
import { createLead } from "@/lib/repos/leads";
import { issueFormTimestamp, issueGuideToken } from "@/lib/signing";
import { formDataToObject, getForm, type FormOutput } from "@/lib/validation/forms";
import type { LeadFormState } from "@/lib/validation/forms/state";

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
  // origem; `v` escolhe a variante do texto (formato do diagnóstico). Nenhum dado pessoal na URL.
  const thanks = new URLSearchParams({ f: form.id, s: draft.segment, o: draft.source });
  if (draft.thanksVariant) thanks.set("v", draft.thanksVariant);
  const thanksPath = `/obrigado/${draft.thanksType}?${thanks.toString()}`;

  // Regra R-18: honeypot preenchido ou envio em menos de 3 segundos responde sucesso sem gravar.
  const antispam = checkAntispam(raw, form.id);
  if (antispam === "honeypot" || antispam === "too_fast") redirect(thanksPath);
  if (antispam === "token_invalid") {
    return { status: "error", errorCode: "token", message: TOKEN_ERROR, values };
  }

  const meta = await requestMeta();

  if (!(await checkRateLimit(ctx, meta.ip, form.id))) {
    return { status: "error", errorCode: "rate_limited", message: RATE_LIMIT_ERROR, values };
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
    const templateData =
      draft.emailTemplate.id === "guia"
        ? {
            ...draft.emailTemplate.data,
            downloadUrl: guideToken
              ? `${appUrl()}/api/downloads/guia?token=${encodeURIComponent(guideToken)}&s=email`
              : null,
          }
        : undefined;
    await notifyLead(draft, { formId: form.id, leadId, pipeline, stage, created, templateData });
  }

  if (guideToken) thanks.set("t", guideToken);
  redirect(`/obrigado/${draft.thanksType}?${thanks.toString()}`);
}
