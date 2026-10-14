// E-mail diário interno (proposta-c-simplicidade.md, 9.3). Fora do registro EMAIL_TEMPLATES, que é
// das respostas automáticas a leads: este vai para os usuários do tenant, sem moldura de descadastro
// e sem assinatura comercial. Só ganha o cabeçalho com o logo, que renderDigest (src/lib/crm/digest.ts,
// função pura, sem acesso à URL pública) escreve no lugar do rótulo "Prospekto CRM".
import { buildDigest, renderDigest, type DigestData } from "@/lib/crm/digest";
import { emailHeaderHtml, type RenderedEmail } from "./layout";

export function digestHeaderHtml(base: string): string {
  return `${emailHeaderHtml(base)}
<p style="margin:20px 0 12px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#5B6670;font-weight:600">CRM · Resumo diário</p>`;
}

export function renderDigestEmail(
  data: DigestData,
  opts: { appUrl: string; now: Date; recipientName: string },
): RenderedEmail & { counts: ReturnType<typeof buildDigest>["counts"]; alerts: string[] } {
  const digest = buildDigest(data, { appUrl: opts.appUrl, now: opts.now });
  const rendered = renderDigest(digest, {
    recipientName: opts.recipientName,
    now: opts.now,
    headerHtml: digestHeaderHtml(opts.appUrl),
  });
  return { ...rendered, counts: digest.counts, alerts: digest.alerts };
}
