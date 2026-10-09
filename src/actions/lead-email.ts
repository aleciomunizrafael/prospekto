"use server";

// Envio da primeira resposta por e-mail a partir do CRM (ADR-003, frente 3; ia-plano.md, Frente C).
// Toda função começa com requireSession() (AGENTS.md; tests/auth-guard.test.ts). Nada sai sem um
// clique da pessoa: o assunto e o corpo chegam revisados do cartão. Exige consentimento de contato
// comercial vigente que inclua o canal e-mail e e-mail com status ok (decisão P6); nunca é
// marketing (sem List-Unsubscribe).
// O envio vai por sendEmail (única porta de saída de e-mail) com reply-to no endereço da Prospekto
// e fica registrado na linha do tempo pelo repositório, que também atualiza o último contato.
import { refresh } from "next/cache";
import { z } from "zod";
import { site } from "@/config/site";
import { EMAIL_BLOCK_MESSAGES } from "@/lib/ai/types";
import { formDataToStrings, type CrmActionState } from "@/lib/crm/action-state";
import { sendEmail } from "@/lib/email/send";
import { renderLeadReply } from "@/lib/email/templates/lead-reply";
import { log } from "@/lib/log";
import { consentAllows, getCurrentConsent } from "@/lib/repos/consents";
import { getLeadDetail, recordLeadActivity } from "@/lib/repos/leads";
import { requireSession } from "@/lib/session";
import { uuidSchema } from "@/lib/validation/common";

// Módulo "use server" só exporta funções assíncronas; o id do template fica interno.
const LEAD_REPLY_TEMPLATE_ID = "lead-reply";

const optionalInstant = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Horário da próxima ação inválido." });
      return z.NEVER;
    }
    return d;
  });

const sendSchema = z.object({
  leadId: uuidSchema,
  subject: z
    .string()
    .trim()
    .min(1, { error: "Informe o assunto do e-mail." })
    .max(150, { error: "O assunto passa de 150 caracteres." }),
  text: z
    .string()
    .trim()
    .min(20, { error: "A mensagem precisa ter pelo menos 20 caracteres." })
    .max(8000, { error: "A mensagem passa de 8.000 caracteres." }),
  slotIso: optionalInstant,
  runId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(uuidSchema.optional()),
});

function fail(message: string): CrmActionState {
  return { status: "error", message };
}

export async function sendLeadReplyAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const ctx = await requireSession();
  const parsed = sendSchema.safeParse(formDataToStrings(formData));
  // Os campos vêm ocultos no diálogo de confirmação: a mensagem geral já diz o que corrigir.
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Confira os campos.");
  const d = parsed.data;

  const lead = await getLeadDetail(ctx, d.leadId);
  if (!lead) return fail("Lead não encontrado.");
  const consent = await getCurrentConsent(ctx, lead.id, "contato_comercial");
  if (!consentAllows(consent)) return fail(EMAIL_BLOCK_MESSAGES.no_consent);
  if (!consentAllows(consent, "email")) return fail(EMAIL_BLOCK_MESSAGES.no_email_channel);
  if (lead.emailStatus === "bounced") return fail(EMAIL_BLOCK_MESSAGES.email_bounced);
  if (lead.emailStatus === "complained") return fail(EMAIL_BLOCK_MESSAGES.email_complained);

  const rendered = renderLeadReply({ subject: d.subject, body: d.text });
  // sendEmail registra só templateId e leadId no log, nunca o endereço nem o assunto (R-16).
  const sent = await sendEmail({
    to: lead.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    replyTo: site.email,
    templateId: LEAD_REPLY_TEMPLATE_ID,
    leadId: lead.id,
  });
  if (sent.mode === "error") {
    return fail("Não foi possível enviar o e-mail. Tente de novo em instantes.");
  }
  // Modo "log" (sem RESEND_API_KEY: local, CI): nada foi enviado, mas a atividade entra com
  // data.mode = "log" para o fluxo ser conferido de ponta a ponta.
  try {
    await recordLeadActivity(ctx, {
      leadId: lead.id,
      activity: {
        type: "email",
        subject: d.subject,
        body: d.text,
        data: { ai: !!d.runId, runId: d.runId ?? null, mode: sent.mode },
      },
      touchLastContact: true,
      nextActionAt: d.slotIso,
    });
  } catch (error) {
    log("error", "e-mail enviado mas não registrado na linha do tempo", {
      tenantId: ctx.tenantId,
      leadId: lead.id,
      mode: sent.mode,
      error,
    });
    return fail(
      sent.delivered
        ? "O e-mail foi enviado, mas não ficou registrado na linha do tempo. Registre a atividade manualmente."
        : "Não foi possível registrar o e-mail. Tente de novo em instantes.",
    );
  }
  log("info", "resposta enviada ao lead por e-mail", {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    leadId: lead.id,
    mode: sent.mode,
    ai: !!d.runId,
  });
  refresh();
  return { status: "ok", message: "E-mail enviado e registrado." };
}
