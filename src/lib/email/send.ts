import "server-only";
import { env } from "@/env";
import { site } from "@/config/site";
import { log } from "@/lib/log";

// Única porta de saída de e-mail (ADR-001: Resend atrás de sendEmail(); trocar de provedor é
// reescrever esta função). Sem RESEND_API_KEY (local, CI, preview sem segredo) nada é enviado:
// registra em log só o template e o id do lead, nunca o destinatário nem o assunto (o assunto do
// simulador traz o valor estimado, dado financeiro que fica só no CRM; regra R-16).
export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  // Identificação para log e para o cabeçalho List-Unsubscribe (só em e-mails com marketing).
  templateId: string;
  leadId?: string | null;
  unsubscribeUrl?: string;
};

export type SendEmailResult =
  | { delivered: true; mode: "resend"; id: string | null }
  | { delivered: false; mode: "log" }
  | { delivered: false; mode: "error"; error: string };

export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  const fields = { templateId: message.templateId, leadId: message.leadId ?? null };
  if (!env.RESEND_API_KEY) {
    log("info", "e-mail não enviado: sem RESEND_API_KEY (modo log)", fields);
    return { delivered: false, mode: "log" };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo,
      // RFC 8058: o provedor faz POST em unsubscribeUrl (/api/descadastro, que grava a revogação);
      // o mailto cobre clientes sem um clique.
      headers: message.unsubscribeUrl
        ? {
            "List-Unsubscribe": `<mailto:${site.email}?subject=descadastro>, <${message.unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          }
        : undefined,
    });
    if (error) {
      log("error", "falha ao enviar e-mail", { ...fields, error: error.message });
      return { delivered: false, mode: "error", error: error.message };
    }
    log("info", "e-mail enviado", { ...fields, messageId: data?.id ?? null });
    return { delivered: true, mode: "resend", id: data?.id ?? null };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "erro desconhecido";
    log("error", "falha ao enviar e-mail", { ...fields, error: msg });
    return { delivered: false, mode: "error", error: msg };
  }
}
