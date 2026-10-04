import { readFile } from "node:fs/promises";
import path from "node:path";
import { site } from "@/config/site";
import { log } from "@/lib/log";
import { createActivity } from "@/lib/repos/activities";
import { getLead } from "@/lib/repos/leads";
import { verifyGuideToken } from "@/lib/signing";

// Download do guia (estrutura-e-copy.md, seção 10.3; ADR-001): valida o token assinado (lead e
// 72 h), registra activities.download com guide_version e responde com o PDF de src/assets/
// (fora de public/) com Content-Disposition attachment. Sem o arquivo (edição revisada ainda não
// aprovada), responde 404 em português. A edição antiga nunca é distribuída.
export const dynamic = "force-dynamic";

const SOURCES = new Set(["thanks_page", "email"]);

function text(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const check = verifyGuideToken(url.searchParams.get("token"));
  if (check.status === "expired") {
    return text(
      410,
      "Este link de download expirou (vale por 72 horas). Peça o guia de novo no site.",
    );
  }
  if (check.status !== "ok") {
    return text(403, "Link de download inválido. Peça o guia de novo no site.");
  }
  const { leadId, guideVersion, tenantId } = check.payload;
  const ctx = { tenantId, userId: null };
  const lead = await getLead(ctx, leadId);
  if (!lead) return text(403, "Link de download inválido. Peça o guia de novo no site.");

  if (!site.guide.available) {
    return text(
      404,
      "A edição revisada do guia ainda não está disponível. Você será avisado por e-mail.",
    );
  }
  let file: Buffer;
  try {
    // Caminho literal (não site.guide.assetPath) para o tracing do build incluir só src/assets.
    file = await readFile(
      path.join(process.cwd(), "src", "assets", "contabilizando-cultura-guia.pdf"),
    );
  } catch {
    log("error", "guia não encontrado em src/assets", { tenantId, guideVersion });
    return text(404, "O arquivo do guia não está disponível no momento. Tente de novo mais tarde.");
  }

  const sourceParam = url.searchParams.get("s") ?? "";
  const source = SOURCES.has(sourceParam) ? sourceParam : "link";
  try {
    await createActivity(ctx, {
      type: "download",
      subject: "Guia Contabilizando Cultura baixado",
      data: { guide_version: guideVersion, source, lead_segment: lead.segment },
      leadId,
    });
  } catch (error) {
    // O download não falha por causa do registro; fica no log para conferência.
    log("error", "falha ao registrar download do guia", { tenantId, leadId, error });
  }
  // Evento guide_download (seção 9.2) é de servidor: fica no log estruturado, sem dados pessoais.
  log("info", "guide_download", { tenantId, leadId, lead_segment: lead.segment, source });

  return new Response(new Uint8Array(file), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-length": String(file.byteLength),
      "content-disposition": `attachment; filename="${site.guide.fileName}"`,
      "cache-control": "private, no-store",
      "x-guide-version": guideVersion,
    },
  });
}
