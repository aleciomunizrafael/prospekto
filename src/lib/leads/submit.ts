import "server-only";
// Núcleo compartilhado das Server Actions públicas de captura de lead (src/actions/leads.ts e
// src/actions/simulator.ts): leitura do IP e do user agent, antispam (honeypot e carimbo de tempo
// assinado, regra R-18), limite por IP (form_attempts), consentimentos (regra R-1) e e-mails
// (resposta automática e aviso interno). Não redireciona nem decide a resposta ao visitante; cada
// action traduz os resultados para o seu estado.
import { headers } from "next/headers";
import { env } from "@/env";
import { site } from "@/config/site";
import { renderLeadNotification, renderTemplate } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { log } from "@/lib/log";
import type { Ctx } from "@/lib/repos/ctx";
import { hitFormAttempt } from "@/lib/repos/form-attempts";
import { hashIp, verifyFormTimestamp } from "@/lib/signing";
import type { ConsentInput } from "@/lib/validation/leads";
import type { LeadDraft } from "@/lib/validation/forms/common";

export const STORAGE_ERROR =
  "Não conseguimos registrar seu pedido agora. Tente de novo em alguns minutos ou escreva para projetos@prospekto.com.br.";
export const RATE_LIMIT_ERROR =
  "Recebemos muitos envios deste endereço em pouco tempo. Tente de novo em uma hora ou fale pelo WhatsApp.";
export const TOKEN_ERROR = "Não foi possível validar o envio. Recarregue a página e tente de novo.";
export const VALIDATION_ERROR = "Confira os campos destacados abaixo.";

export type RequestMeta = { ip: string | null; userAgent: string | null };

export async function requestMeta(): Promise<RequestMeta> {
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

// Valores enviados, para repovoar os campos depois de um erro (sem honeypot nem carimbo).
export function publicValues(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key !== "website" && key !== "form_ts") out[key] = value;
  }
  return out;
}

export type AntispamCheck = "ok" | "honeypot" | "too_fast" | "token_invalid";

// Regra R-18: honeypot preenchido ou envio em menos de 3 segundos responde sucesso sem gravar
// (`honeypot`, `too_fast`); carimbo ausente, adulterado ou expirado pede recarga (`token_invalid`).
export function checkAntispam(
  raw: { website?: string; form_ts?: string },
  formId: string,
): AntispamCheck {
  if (raw.website) {
    log("info", "formulário descartado: honeypot", { formId });
    return "honeypot";
  }
  const stamp = verifyFormTimestamp(raw.form_ts);
  if (stamp.status === "too_fast") {
    log("info", "formulário descartado: envio rápido", { formId });
    return "too_fast";
  }
  if (stamp.status !== "ok") return "token_invalid";
  return "ok";
}

// Limite de 5 envios por IP por hora (form_attempts). Falha do contador não bloqueia o envio.
export async function checkRateLimit(
  ctx: Ctx,
  ip: string | null,
  formId: string,
): Promise<boolean> {
  try {
    const attempt = await hitFormAttempt(ctx, hashIp(ip));
    if (!attempt.allowed) {
      log("warn", "formulário bloqueado: limite por IP", { formId, count: attempt.count });
      return false;
    }
  } catch (error) {
    log("error", "falha ao registrar tentativa de formulário", { formId, error });
  }
  return true;
}

// Regra R-1 e seção 5.1: caixa 1 obrigatória (contato_comercial), caixa 2 opcional (marketing);
// canais conforme a caixa e o telefone informado; texto integral e versão da política.
export function buildConsents(
  draft: Pick<LeadDraft, "phone" | "consentMarketing" | "sourceDetail">,
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

export function appUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

export type NotifyInfo = {
  formId: string;
  leadId: string;
  pipeline: string;
  stage: string;
  created: boolean;
  // Dados do template já resolvidos (o guia acrescenta o link assinado de download).
  templateData?: LeadDraft["emailTemplate"]["data"];
};

// Resposta automática ao lead (estrutura-e-copy.md, seção 5.6). Falhas só vão ao log.
export async function sendAutoReply(
  draft: Pick<LeadDraft, "name" | "email" | "actionLabel" | "consentMarketing" | "emailTemplate">,
  info: Pick<NotifyInfo, "leadId" | "templateData">,
): Promise<void> {
  // Descadastro de um clique entra com o webhook do Resend (próxima onda); até lá, o lead responde
  // ao e-mail ou escreve para projetos@. O link aponta para a seção de direitos da política.
  const unsubscribeUrl = draft.consentMarketing ? `${appUrl()}/privacidade#direitos` : undefined;
  try {
    const template = draft.emailTemplate;
    const rendered = renderTemplate(
      template.id,
      {
        name: draft.name,
        actionLabel: draft.actionLabel,
        sentAt: new Date(),
        marketing: draft.consentMarketing,
        unsubscribeUrl,
      },
      (info.templateData ?? template.data) as never,
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
}

// Aviso interno para LEAD_NOTIFY_EMAIL com o resumo do formulário. Falhas só vão ao log.
export async function sendInternalNotification(
  draft: Pick<LeadDraft, "email" | "segment" | "formData">,
  info: Omit<NotifyInfo, "templateData">,
): Promise<void> {
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

// E-mails: resposta automática ao lead e aviso interno.
export async function notifyLead(draft: LeadDraft, info: NotifyInfo): Promise<void> {
  await sendAutoReply(draft, info);
  await sendInternalNotification(draft, info);
}
