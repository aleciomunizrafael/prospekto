// Moldura comum das respostas automáticas (estrutura-e-copy.md, seção 5.6): motivo do envio
// ("você recebe este e-mail porque [ação] em [data]"), cidade no rodapé, link de descadastro
// quando houver consent_marketing e ressalva legal. Texto simples com versão HTML leve (seção 10.2).
// Cabeçalho com o logo oficial (public/brand/logo-email.png, servido do próprio domínio) e
// assinatura comercial com os dados da assinatura oficial (src/config/site.ts), compartilhados
// com lead-reply.ts e com o digest interno.
import { site } from "@/config/site";
import { appUrl } from "@/lib/app-url";
import { formatDateTime } from "@/lib/crm/format";

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
  return formatDateTime(date);
}

// Logo no topo dos e-mails HTML. O PNG é 2x (604x160) e aparece em 151x40 para ficar nítido em
// tela de alta densidade; a URL sai de NEXT_PUBLIC_APP_URL (nunca fixa) porque o cliente de
// e-mail busca a imagem no domínio público. Tabela com fundo branco e atributos de largura e
// altura por causa dos clientes de e-mail (Outlook ignora boa parte do CSS). Única imagem do
// e-mail: não há pixel de rastreamento.
export const EMAIL_LOGO_WIDTH = 151;
export const EMAIL_LOGO_HEIGHT = 40;

export function emailLogoUrl(base: string = appUrl()): string {
  return `${base.replace(/\/$/, "")}/brand/logo-email.png`;
}

export function emailHeaderHtml(base?: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#ffffff">
<tr><td style="padding:0 0 20px;border-bottom:1px solid #E6E1D8;background:#ffffff"><img src="${escapeHtml(emailLogoUrl(base))}" width="${EMAIL_LOGO_WIDTH}" height="${EMAIL_LOGO_HEIGHT}" alt="${escapeHtml(site.name)}" style="display:block;border:0;outline:none;text-decoration:none;width:${EMAIL_LOGO_WIDTH}px;height:${EMAIL_LOGO_HEIGHT}px"></td></tr>
</table>`;
}

// Assinatura comercial, uma informação por linha: nome, empresa, e-mail, WhatsApp, endereço e
// cidade, CNPJ. Endereço e CNPJ ficam de fora enquanto site.legal não estiver preenchido.
export function signatureLines(): string[] {
  const place = [site.legal.address, site.city].filter((v) => v && v.trim()).join(" · ");
  const cnpj = site.legal.cnpj?.trim();
  return [
    site.owner,
    site.name,
    site.email,
    `WhatsApp ${site.whatsappDisplay}`,
    ...(place ? [place] : []),
    ...(cnpj ? [`CNPJ ${cnpj}`] : []),
  ];
}

export function signatureText(): string {
  return signatureLines().join("\n");
}

export function signatureHtml(): string {
  const place = [site.legal.address, site.city].filter((v) => v && v.trim()).join(" · ");
  const cnpj = site.legal.cnpj?.trim();
  const legal = [place, cnpj ? `CNPJ ${cnpj}` : ""]
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join("<br>");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:28px">
<tr><td style="padding:16px 0 0;border-top:1px solid #E6E1D8;font-size:15px;line-height:1.5;color:#1E2A32">
<strong style="color:#363435">${escapeHtml(site.owner)}</strong><br>${escapeHtml(site.name)}<br><a href="mailto:${escapeHtml(site.email)}" style="color:#163B5C">${escapeHtml(site.email)}</a><br>WhatsApp ${escapeHtml(site.whatsappDisplay)}${legal ? `<br><span style="color:#5B6670">${legal}</span>` : ""}
</td></tr>
</table>`;
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
  const unsubscribe =
    ctx.marketing && ctx.unsubscribeUrl
      ? `Para não receber mais materiais da Prospekto, cancele aqui: ${ctx.unsubscribeUrl}`
      : null;
  const text = [
    greeting,
    "",
    ...blocks.map(blockToText),
    "",
    signatureText(),
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
<div style="background:#ffffff;border-radius:8px;padding:24px">
${emailHeaderHtml()}
<p style="margin:24px 0 16px">${escapeHtml(greeting)}</p>
${blocks.map(blockToHtml).join("\n")}
${signatureHtml()}
</div>
<p style="margin:16px 0 0;font-size:13px;color:#5B6670">${escapeHtml(reason)}</p>
${unsubscribe ? `<p style="margin:8px 0 0;font-size:13px;color:#5B6670"><a href="${escapeHtml(ctx.unsubscribeUrl ?? "")}" style="color:#5B6670">Cancelar o recebimento de materiais da Prospekto</a></p>` : ""}
<p style="margin:8px 0 0;font-size:13px;color:#5B6670">${escapeHtml(site.disclaimer)}</p>
</div>
</body>
</html>`;

  return { subject, text, html };
}
