"use server";
// Server Actions de projetos culturais (modelo-de-dados.md, 3.8; regras R-3, R-4, R-5, R-11).
// Toda action começa com requireSession(). Depois de escrever, revalida as telas do CRM e, quando
// a carteira pública muda (publicar, despublicar, editar), a tag `projects` do site.
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { failFrom, num, ok, str, type ActionState } from "@/lib/crm/form-state";
import { slugify } from "@/lib/crm/format";
import { isRouanetMechanism } from "@/lib/domain/commission";
import { ValidationError } from "@/lib/errors";
import { log } from "@/lib/log";
import {
  createProject,
  getProject,
  moveProjectStage,
  publishProject,
  unpublishProject,
  updateProject,
} from "@/lib/repos/projects";
import { requireSession } from "@/lib/session";
import { PROJECTS_CACHE_TAG } from "@/lib/site/public-projects";
import type { CreateProjectInput } from "@/lib/validation/projects";

function projectInput(fd: FormData): Omit<CreateProjectInput, "stage"> {
  const name = str(fd, "name") ?? "";
  const slug = str(fd, "slug") ?? slugify(name);
  return {
    proponentOrgId: str(fd, "proponentOrgId") ?? "",
    leadId: str(fd, "leadId"),
    name,
    slug,
    mechanism: str(fd, "mechanism") as CreateProjectInput["mechanism"],
    processNumber: str(fd, "processNumber"),
    approvedAmount: num(fd, "approvedAmount"),
    fundraisingDeadline: str(fd, "fundraisingDeadline"),
    fundraisingFeeAmount: num(fd, "fundraisingFeeAmount"),
    commissionPct: num(fd, "commissionPct"),
    city: str(fd, "city"),
    uf: str(fd, "uf") as CreateProjectInput["uf"],
    culturalSegment: str(fd, "culturalSegment"),
    summary: str(fd, "summary"),
    counterparts: str(fd, "counterparts"),
    deckUrl: str(fd, "deckUrl"),
    salicUrl: str(fd, "salicUrl"),
    reportDueAt: str(fd, "reportDueAt"),
    ownerUserId: str(fd, "ownerUserId"),
  };
}

// Percentual contratado: no Rouanet, no máximo 10% (IN MinC 29/2026, art. 19; modelo 3.8).
function assertCommissionPct(mechanism: string | undefined, pct: number | undefined) {
  if (pct == null || !mechanism) return;
  if (isRouanetMechanism(mechanism as Parameters<typeof isRouanetMechanism>[0]) && pct > 10) {
    throw new ValidationError(
      "No Rouanet o percentual de comissão contratado não pode passar de 10% (IN MinC 29/2026, art. 19).",
    );
  }
}

function revalidateProject(projectId: string) {
  revalidatePath("/app/projetos");
  revalidatePath(`/app/projetos/${projectId}`);
  revalidatePath("/app/aportes");
  revalidatePath("/app");
}

export async function createProjectAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireSession();
  let projectId: string;
  try {
    const input = projectInput(fd);
    assertCommissionPct(input.mechanism, input.commissionPct);
    const project = await createProject(ctx, { ...input, stage: "prospeccao" });
    projectId = project.id;
  } catch (error) {
    log("warn", "falha ao criar projeto", { tenantId: ctx.tenantId, error });
    return failFrom(error);
  }
  revalidateProject(projectId);
  redirect(`/app/projetos/${projectId}`);
}

export async function updateProjectAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireSession();
  const projectId = str(fd, "projectId") ?? "";
  try {
    const input = projectInput(fd);
    assertCommissionPct(input.mechanism, input.commissionPct);
    const rest = { ...input, leadId: undefined };
    await updateProject(ctx, {
      projectId,
      ...rest,
      processNumber: rest.processNumber ?? null,
      approvedAmount: rest.approvedAmount ?? null,
      fundraisingDeadline: rest.fundraisingDeadline ?? null,
      fundraisingFeeAmount: rest.fundraisingFeeAmount ?? null,
      commissionPct: rest.commissionPct ?? null,
      city: rest.city ?? null,
      uf: rest.uf ?? null,
      culturalSegment: rest.culturalSegment ?? null,
      summary: rest.summary ?? null,
      counterparts: rest.counterparts ?? null,
      deckUrl: rest.deckUrl ?? null,
      salicUrl: rest.salicUrl ?? null,
      reportDueAt: rest.reportDueAt ?? null,
      ownerUserId: rest.ownerUserId ?? null,
    } as Parameters<typeof updateProject>[1]);
  } catch (error) {
    log("warn", "falha ao atualizar projeto", { tenantId: ctx.tenantId, projectId, error });
    return failFrom(error);
  }
  revalidateProject(projectId);
  // O texto público (resumo, contrapartidas, prazo) pode ter mudado.
  updateTag(PROJECTS_CACHE_TAG);
  return ok("Projeto salvo.");
}

// "Mover para": aceita, junto do destino, os campos exigidos pelo estágio de destino que a tela
// mostra "ali mesmo" (seção 9.2, item 3). Primeiro grava os campos, depois move; se faltar algo,
// o movimento não acontece e a mensagem lista o que falta.
export async function moveProjectStageAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  const projectId = str(fd, "projectId") ?? "";
  const to = str(fd, "to") ?? "";
  try {
    const patch: Record<string, unknown> = {};
    const mechanism = str(fd, "mechanism");
    const processNumber = str(fd, "processNumber");
    const approvedAmount = num(fd, "approvedAmount");
    const fundraisingDeadline = str(fd, "fundraisingDeadline");
    const fundraisingFeeAmount = num(fd, "fundraisingFeeAmount");
    const reportDueAt = str(fd, "reportDueAt");
    if (mechanism) patch.mechanism = mechanism;
    if (processNumber) patch.processNumber = processNumber;
    if (approvedAmount !== undefined) patch.approvedAmount = approvedAmount;
    if (fundraisingDeadline) patch.fundraisingDeadline = fundraisingDeadline;
    if (fundraisingFeeAmount !== undefined) patch.fundraisingFeeAmount = fundraisingFeeAmount;
    if (reportDueAt) patch.reportDueAt = reportDueAt;
    if (Object.keys(patch).length) {
      await updateProject(ctx, { projectId, ...patch } as Parameters<typeof updateProject>[1]);
    }
    await moveProjectStage(ctx, {
      projectId,
      to: to as Parameters<typeof moveProjectStage>[1]["to"],
      ownerUserId: str(fd, "ownerUserId"),
      lostReason: str(fd, "lostReason") as Parameters<typeof moveProjectStage>[1]["lostReason"],
      lostReasonDetail: str(fd, "lostReasonDetail"),
      reason: str(fd, "reason"),
    });
  } catch (error) {
    log("warn", "falha ao mover projeto", { tenantId: ctx.tenantId, projectId, to, error });
    return failFrom(error);
  }
  revalidateProject(projectId);
  // Sair de `captando` (ou arquivar) tira o projeto da carteira pública.
  updateTag(PROJECTS_CACHE_TAG);
  return ok("Projeto movido.");
}

// Regra R-11: só em `captando`, com quem autorizou e a data da autorização por escrito.
export async function publishProjectAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireSession();
  const projectId = str(fd, "projectId") ?? "";
  try {
    const project = await getProject(ctx, projectId);
    if (!project) return { status: "error", message: "Projeto não encontrado." };
    const by = str(fd, "publishAuthorizedBy");
    const at = str(fd, "publishAuthorizedAt");
    const fieldErrors: Record<string, string> = {};
    if (!by) fieldErrors.publishAuthorizedBy = "Informe quem autorizou a publicação por escrito.";
    if (!at) fieldErrors.publishAuthorizedAt = "Informe a data da autorização.";
    if (Object.keys(fieldErrors).length) {
      return { status: "error", message: "Confira os campos destacados.", fieldErrors };
    }
    await publishProject(ctx, {
      projectId,
      publishAuthorizedBy: by!,
      publishAuthorizedAt: `${at}T12:00:00-03:00`,
    });
  } catch (error) {
    log("warn", "falha ao publicar projeto", { tenantId: ctx.tenantId, projectId, error });
    return failFrom(error);
  }
  revalidateProject(projectId);
  updateTag(PROJECTS_CACHE_TAG);
  return ok("Projeto publicado no site.");
}

export async function unpublishProjectAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  const projectId = str(fd, "projectId") ?? "";
  try {
    await unpublishProject(ctx, projectId);
  } catch (error) {
    log("warn", "falha ao despublicar projeto", { tenantId: ctx.tenantId, projectId, error });
    return failFrom(error);
  }
  revalidateProject(projectId);
  updateTag(PROJECTS_CACHE_TAG);
  return ok("Projeto retirado do site.");
}
