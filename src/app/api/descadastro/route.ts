import { site } from "@/config/site";
import { log } from "@/lib/log";
import { createActivity } from "@/lib/repos/activities";
import { revokeConsent } from "@/lib/repos/consents";
import type { Ctx } from "@/lib/repos/ctx";
import { getLead } from "@/lib/repos/leads";
import { verifyUnsubscribeToken } from "@/lib/signing";

// Descadastro de um clique (estrutura-e-copy.md, seção 10.2; RFC 8058; LGPD, art. 18, IX). Rota
// pública, como /api/webhooks: o token assinado (`t`, src/lib/signing.ts) identifica lead e tenant
// sem dado pessoal na URL. GET mostra a confirmação com um botão; POST (do botão ou do provedor de
// e-mail, corpo `List-Unsubscribe=One-Click`) insere a revogação de `marketing` em consents
// (append-only, R-14) e registra activities.sistema. Idempotente: revogar de novo insere outra
// linha com granted = false, sem erro. Nunca registra o e-mail em log (R-16).
export const dynamic = "force-dynamic";

const UNSUBSCRIBE_SOURCE = "one-click";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function page(status: number, title: string, body: string, form?: { token: string }): Response {
  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>${escapeHtml(title)} · ${escapeHtml(site.name)}</title></head>
<body style="margin:0;padding:24px;background:#F4F1EB;font-family:Inter,Helvetica,Arial,sans-serif;color:#1E2A32;font-size:16px;line-height:1.6">
<main style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:28px 24px">
<p style="margin:0 0 20px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#7A2230;font-weight:600">${escapeHtml(site.name)}</p>
<h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(title)}</h1>
<p style="margin:0 0 16px">${escapeHtml(body)}</p>
${
  form
    ? `<form method="post" action="/api/descadastro?t=${encodeURIComponent(form.token)}"><input type="hidden" name="List-Unsubscribe" value="One-Click"><button type="submit" style="min-height:44px;padding:10px 20px;border:0;border-radius:8px;background:#7A2230;color:#ffffff;font-size:16px;cursor:pointer">Cancelar o recebimento</button></form>`
    : ""
}
<p style="margin:24px 0 0;font-size:13px;color:#5B6670">Dúvidas: <a href="mailto:${site.email}" style="color:#163B5C">${site.email}</a>.</p>
</main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

const INVALID_TITLE = "Link de descadastro inválido";
const INVALID_BODY = `Este link não é válido. Para não receber mais materiais da Prospekto, responda ao e-mail ou escreva para ${site.email}.`;
const EXPIRED_BODY = `Este link expirou. Para não receber mais materiais da Prospekto, responda ao e-mail ou escreva para ${site.email}.`;

type Resolved =
  { ok: true; ctx: Ctx; leadId: string; token: string } | { ok: false; response: Response };

async function resolve(request: Request): Promise<Resolved> {
  const token = new URL(request.url).searchParams.get("t");
  const check = verifyUnsubscribeToken(token);
  if (check.status === "expired") {
    return { ok: false, response: page(410, "Link de descadastro expirado", EXPIRED_BODY) };
  }
  if (check.status !== "ok" || !token) {
    return { ok: false, response: page(400, INVALID_TITLE, INVALID_BODY) };
  }
  const ctx: Ctx = { tenantId: check.payload.tenantId, userId: null };
  const lead = await getLead(ctx, check.payload.leadId);
  if (!lead) return { ok: false, response: page(400, INVALID_TITLE, INVALID_BODY) };
  return { ok: true, ctx, leadId: lead.id, token };
}

export async function GET(request: Request) {
  const resolved = await resolve(request);
  if (!resolved.ok) return resolved.response;
  return page(
    200,
    "Cancelar o recebimento de materiais",
    "Confirme abaixo para não receber mais materiais da Prospekto. As respostas a pedidos que você fizer no site continuam chegando.",
    { token: resolved.token },
  );
}

export async function POST(request: Request) {
  const resolved = await resolve(request);
  if (!resolved.ok) return resolved.response;
  const { ctx, leadId } = resolved;
  try {
    await revokeConsent(ctx, {
      leadId,
      purpose: "marketing",
      policyVersion: site.policyVersion,
      sourcePage: UNSUBSCRIBE_SOURCE,
      consentText: "Revogação por descadastro de um clique no e-mail.",
    });
    await createActivity(ctx, {
      type: "sistema",
      subject: "Descadastro de materiais pelo link do e-mail",
      data: { purpose: "marketing", source: UNSUBSCRIBE_SOURCE },
      leadId,
    });
  } catch (error) {
    log("error", "falha ao registrar descadastro", { tenantId: ctx.tenantId, leadId, error });
    return page(
      500,
      "Não foi possível concluir o descadastro",
      `Tente de novo em alguns minutos ou escreva para ${site.email}.`,
    );
  }
  log("info", "descadastro registrado", { tenantId: ctx.tenantId, leadId });
  return page(
    200,
    "Descadastro concluído",
    "Você não vai mais receber materiais da Prospekto. As respostas a pedidos que você fizer no site continuam chegando.",
  );
}
