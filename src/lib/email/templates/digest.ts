// E-mail diário interno (proposta-c-simplicidade.md, 9.3). Fora do registro EMAIL_TEMPLATES, que é
// das respostas automáticas a leads: este vai para os usuários do tenant, sem moldura de descadastro.
import { buildDigest, renderDigest, type DigestData } from "@/lib/crm/digest";
import type { RenderedEmail } from "./layout";

export function renderDigestEmail(
  data: DigestData,
  opts: { appUrl: string; now: Date; recipientName: string },
): RenderedEmail & { counts: ReturnType<typeof buildDigest>["counts"]; alerts: string[] } {
  const digest = buildDigest(data, { appUrl: opts.appUrl, now: opts.now });
  const rendered = renderDigest(digest, { recipientName: opts.recipientName, now: opts.now });
  return { ...rendered, counts: digest.counts, alerts: digest.alerts };
}
