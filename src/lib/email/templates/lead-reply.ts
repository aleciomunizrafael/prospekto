// E-mail de primeira resposta escrito pela Daniela (com ou sem rascunho da IA) e enviado pelo CRM
// (ADR-003, frente 3; ia-plano.md, Frente C). Não usa renderEmail: não é resposta automática, por
// isso não tem "você recebe este e-mail porque" nem descadastro (não é marketing). O corpo chega
// como a pessoa revisou (já com saudação e assinatura curta); aqui entram o bloco de assinatura
// completo e a ressalva legal.
import { site } from "@/config/site";
import { escapeHtml, type RenderedEmail } from "./layout";

export type LeadReplyInput = { subject: string; body: string };

const signatureLines = () => [
  site.owner,
  site.name,
  `${site.email} · WhatsApp ${site.whatsappDisplay}`,
  site.city,
];

function paragraphHtml(paragraph: string): string {
  return `<p style="margin:0 0 16px">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`;
}

export function renderLeadReply(input: LeadReplyInput): RenderedEmail {
  const subject = input.subject.trim();
  const body = input.body.replace(/\r\n/g, "\n").trim();
  const signature = signatureLines().join("\n");
  const text = [body, "", signature, "", site.disclaimer].join("\n").replace(/\n{3,}/g, "\n\n");

  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim());
  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#F4F1EB;font-family:Inter,Helvetica,Arial,sans-serif;color:#1E2A32;font-size:16px;line-height:1.6">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="background:#ffffff;border-radius:8px;padding:28px 24px">
${paragraphs.map(paragraphHtml).join("\n")}
<p style="margin:24px 0 0">${escapeHtml(site.owner)}<br>${escapeHtml(site.name)}<br><a href="mailto:${site.email}" style="color:#163B5C">${site.email}</a> · WhatsApp ${escapeHtml(site.whatsappDisplay)}<br>${escapeHtml(site.city)}</p>
</div>
<p style="margin:16px 0 0;font-size:13px;color:#5B6670">${escapeHtml(site.disclaimer)}</p>
</div>
</body>
</html>`;

  return { subject, text, html };
}
