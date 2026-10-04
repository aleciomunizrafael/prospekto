// Moldura comum das respostas automáticas (estrutura-e-copy.md, seção 5.6): motivo do envio
// ("você recebe este e-mail porque [ação] em [data]"), cidade no rodapé, link de descadastro
// quando houver consent_marketing e ressalva legal. Texto simples com versão HTML leve (seção 10.2).
import { site } from "@/config/site";

export type RenderedEmail = { subject: string; text: string; html: string };

export type EmailContext = {
  name: string;
  // Ação no passado, para o motivo do envio: "baixou o guia Contabilizando Cultura".
  actionLabel: string;
  sentAt: Date;
  marketing: boolean;
  unsubscribeUrl?: string;
};

export type EmailBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "cta"; label: string; href: string };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDateTimeBr(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function blockToText(block: EmailBlock): string {
  switch (block.type) {
    case "paragraph":
      return block.text;
    case "list":
      return block.items.map((item, i) => `${i + 1}. ${item}`).join("\n");
    case "cta":
      return `${block.label}: ${block.href}`;
  }
}

function blockToHtml(block: EmailBlock): string {
  switch (block.type) {
    case "paragraph":
      return `<p style="margin:0 0 16px">${escapeHtml(block.text)}</p>`;
    case "list":
      return `<ol style="margin:0 0 16px;padding-left:20px">${block.items
        .map((item) => `<li style="margin:0 0 8px">${escapeHtml(item)}</li>`)
        .join("")}</ol>`;
    case "cta":
      return `<p style="margin:0 0 20px"><a href="${escapeHtml(block.href)}" style="display:inline-block;background:#163B5C;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">${escapeHtml(block.label)}</a></p>`;
  }
}

export function renderEmail(
  ctx: EmailContext,
  subject: string,
  blocks: EmailBlock[],
): RenderedEmail {
  const greeting = `Olá, ${ctx.name}.`;
  const reason = `Você recebe este e-mail porque ${ctx.actionLabel} em ${formatDateTimeBr(ctx.sentAt)}.`;
  const signature = `${site.owner}\n${site.name}\n${site.email} · WhatsApp ${site.whatsappDisplay}\n${site.city}`;
  const unsubscribe =
    ctx.marketing && ctx.unsubscribeUrl
      ? `Para não receber mais materiais da Prospekto, cancele aqui: ${ctx.unsubscribeUrl}`
      : null;
  const text = [
    greeting,
    "",
    ...blocks.map(blockToText),
    "",
    signature,
    "",
    reason,
    unsubscribe,
    site.disclaimer,
  ]
    .filter((line) => line !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#F4F1EB;font-family:Inter,Helvetica,Arial,sans-serif;color:#1E2A32;font-size:16px;line-height:1.6">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="background:#ffffff;border-radius:8px;padding:28px 24px">
<p style="margin:0 0 20px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#7A2230;font-weight:600">${escapeHtml(site.name)}</p>
<p style="margin:0 0 16px">${escapeHtml(greeting)}</p>
${blocks.map(blockToHtml).join("\n")}
<p style="margin:24px 0 0">${escapeHtml(site.owner)}<br>${escapeHtml(site.name)}<br><a href="mailto:${site.email}" style="color:#163B5C">${site.email}</a> · WhatsApp ${escapeHtml(site.whatsappDisplay)}<br>${escapeHtml(site.city)}</p>
</div>
<p style="margin:16px 0 0;font-size:13px;color:#5B6670">${escapeHtml(reason)}</p>
${unsubscribe ? `<p style="margin:8px 0 0;font-size:13px;color:#5B6670"><a href="${escapeHtml(ctx.unsubscribeUrl ?? "")}" style="color:#5B6670">Cancelar o recebimento de materiais da Prospekto</a></p>` : ""}
<p style="margin:8px 0 0;font-size:13px;color:#5B6670">${escapeHtml(site.disclaimer)}</p>
</div>
</body>
</html>`;

  return { subject, text, html };
}
