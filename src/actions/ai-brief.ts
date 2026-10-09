"use server";

// "Preparar ligação" (ADR-003, frente 1; ia-plano.md, Frente A). Toda função começa com
// requireSession() (AGENTS.md; tests/auth-guard.test.ts). A action só orquestra: recarrega os
// dados pelos repositórios (R-15), monta o contexto redigido (src/lib/ai/redact.ts), chama
// runStructured (única porta de saída para a Claude API) e devolve AiActionState<Brief> ao
// useActionState do cartão. Nada do briefing é gravado em activities; a execução fica em ai_runs
// pelo próprio runStructured. Sem refresh(): o cartão já tem o dado.
import {
  BRIEF_SYSTEM,
  briefSchema,
  briefUserMessage,
  normalizeBrief,
  type Brief,
} from "@/lib/ai/brief";
import { runStructured } from "@/lib/ai/client";
import { buildLeadContext } from "@/lib/ai/redact";
import { toActionState, type AiActionState } from "@/lib/ai/types";
import { log } from "@/lib/log";
import { listActivities } from "@/lib/repos/activities";
import { listConsents } from "@/lib/repos/consents";
import { listContributionSummaries } from "@/lib/repos/contributions";
import { getLeadDetail } from "@/lib/repos/leads";
import { listProjects } from "@/lib/repos/projects";
import { listSimulations } from "@/lib/repos/simulations";
import { requireSession } from "@/lib/session";
import { uuidSchema } from "@/lib/validation/common";

function fail(message: string): AiActionState<Brief> {
  return { status: "error", reason: "error", message };
}

export async function generateBriefAction(
  _prev: AiActionState<Brief>,
  formData: FormData,
): Promise<AiActionState<Brief>> {
  const ctx = await requireSession();
  const parsed = uuidSchema.safeParse(formData.get("leadId"));
  if (!parsed.success) return fail("Lead não encontrado.");
  const leadId = parsed.data;
  try {
    const lead = await getLeadDetail(ctx, leadId);
    if (!lead) return fail("Lead não encontrado.");
    const now = new Date();
    // Mesmos pedaços que a página do lead carrega; aportes e projetos só no pipeline de
    // patrocinadores, como lá.
    const sponsors = lead.pipeline === "patrocinadores";
    const [activities, consents, simulations, contributions, projects] = await Promise.all([
      listActivities(ctx, { leadId, limit: 300 }),
      listConsents(ctx, leadId),
      listSimulations(ctx, { leadId, limit: 10 }),
      sponsors ? listContributionSummaries(ctx, { leadId }) : Promise.resolve([]),
      sponsors ? listProjects(ctx, { limit: 500 }) : Promise.resolve([]),
    ]);
    const context = buildLeadContext({
      lead,
      activities,
      consents,
      simulations,
      contributions,
      ownerName: lead.ownerName,
      projectNames: new Map(projects.map((p) => [p.id, p.name])),
      now,
    });
    const result = await runStructured(ctx, {
      kind: "brief",
      leadId,
      system: BRIEF_SYSTEM,
      user: briefUserMessage(context, now),
      schema: briefSchema,
      effort: "medium",
    });
    if (!result.ok) return toActionState(result);
    return { status: "ok", data: normalizeBrief(result.data), runId: result.runId };
  } catch (error) {
    // Falha ao carregar os dados (a chamada ao modelo já trata as suas por dentro). Sem conteúdo
    // no log (R-16).
    log("error", "falha ao preparar o briefing", { tenantId: ctx.tenantId, leadId, error });
    return fail("Não foi possível preparar o briefing. Tente de novo em instantes.");
  }
}
