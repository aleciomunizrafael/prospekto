"use server";
// Server Actions do fluxo de aporte (modelo-de-dados.md, 3.9; regras R-6, R-7, R-8, R-9).
// Cada passo valida no repositório; aqui só se lê o formulário, chama requireSession() e revalida.
import { revalidatePath, updateTag } from "next/cache";
import { failFrom, num, ok, str, type ActionState } from "@/lib/crm/form-state";
import { log } from "@/lib/log";
import {
  cancelContribution,
  confirmDeposit,
  createContribution,
  getContribution,
  issueReceipt,
  markReceiptSentToAccountant,
  recordCommission,
  searchSponsorLeads,
  setContributionSponsorOrg,
  signTerm,
  type SponsorLeadOption,
} from "@/lib/repos/contributions";
import { requireSession } from "@/lib/session";
import { PROJECTS_CACHE_TAG } from "@/lib/site/public-projects";
import type { CreateContributionInput } from "@/lib/validation/contributions";

function revalidateContribution(projectId: string | undefined, contributionId?: string) {
  revalidatePath("/app/aportes");
  if (contributionId) revalidatePath(`/app/aportes/${contributionId}`);
  if (projectId) revalidatePath(`/app/projetos/${projectId}`);
  revalidatePath("/app");
}

export async function createContributionAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  const projectId = str(fd, "projectId") ?? "";
  try {
    if (!str(fd, "leadId")) {
      return {
        status: "error",
        message: "Escolha o patrocinador na busca por nome ou e-mail.",
        fieldErrors: { leadId: "Escolha um lead PJ ou PF." },
      };
    }
    const input: CreateContributionInput = {
      projectId,
      leadId: str(fd, "leadId") ?? "",
      orgId: str(fd, "orgId"),
      type: str(fd, "type") as CreateContributionInput["type"],
      mechanism: str(fd, "mechanism") as CreateContributionInput["mechanism"],
      proposedAmount: num(fd, "proposedAmount") ?? Number.NaN,
      expectedCloseAt: str(fd, "expectedCloseAt"),
      notes: str(fd, "notes"),
    };
    await createContribution(ctx, input);
  } catch (error) {
    log("warn", "falha ao criar aporte", { tenantId: ctx.tenantId, projectId, error });
    return failFrom(error);
  }
  revalidateContribution(projectId);
  return ok("Proposta de aporte criada.");
}

async function projectOf(ctx: Awaited<ReturnType<typeof requireSession>>, contributionId: string) {
  const c = await getContribution(ctx, contributionId);
  return c?.projectId;
}

export async function signTermAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireSession();
  const contributionId = str(fd, "contributionId") ?? "";
  try {
    const orgId = str(fd, "orgId");
    if (orgId) await setContributionSponsorOrg(ctx, contributionId, orgId);
    await signTerm(ctx, {
      contributionId,
      termSignedAt: str(fd, "termSignedAt") ?? "",
      bankDetailsSentAt: str(fd, "bankDetailsSentAt"),
    });
  } catch (error) {
    log("warn", "falha ao assinar termo", { tenantId: ctx.tenantId, contributionId, error });
    return failFrom(error);
  }
  revalidateContribution(await projectOf(ctx, contributionId), contributionId);
  return ok("Termo registrado.");
}

export async function confirmDepositAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireSession();
  const contributionId = str(fd, "contributionId") ?? "";
  try {
    await confirmDeposit(ctx, {
      contributionId,
      depositedAmount: num(fd, "depositedAmount") ?? Number.NaN,
      depositedAt: str(fd, "depositedAt") ?? "",
    });
  } catch (error) {
    log("warn", "falha ao confirmar depósito", { tenantId: ctx.tenantId, contributionId, error });
    return failFrom(error);
  }
  revalidateContribution(await projectOf(ctx, contributionId), contributionId);
  // O saldo a captar da carteira pública mudou (R-5, R-6).
  updateTag(PROJECTS_CACHE_TAG);
  return ok("Depósito confirmado; captado do projeto recalculado.");
}

export async function issueReceiptAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireSession();
  const contributionId = str(fd, "contributionId") ?? "";
  try {
    await issueReceipt(ctx, {
      contributionId,
      receiptNumber: str(fd, "receiptNumber") ?? "",
      receiptIssuedAt: str(fd, "receiptIssuedAt") ?? "",
      receiptSentToAccountantAt: str(fd, "receiptSentToAccountantAt"),
    });
  } catch (error) {
    log("warn", "falha ao emitir recibo", { tenantId: ctx.tenantId, contributionId, error });
    return failFrom(error);
  }
  revalidateContribution(await projectOf(ctx, contributionId), contributionId);
  return ok("Recibo registrado.");
}

export async function sendReceiptToAccountantAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  const contributionId = str(fd, "contributionId") ?? "";
  try {
    const sentAt = str(fd, "receiptSentToAccountantAt");
    if (!sentAt) {
      return {
        status: "error",
        message: "Informe a data do envio.",
        fieldErrors: { receiptSentToAccountantAt: "Informe a data do envio ao contador." },
      };
    }
    await markReceiptSentToAccountant(ctx, contributionId, sentAt);
  } catch (error) {
    log("warn", "falha ao registrar envio ao contador", {
      tenantId: ctx.tenantId,
      contributionId,
      error,
    });
    return failFrom(error);
  }
  revalidateContribution(await projectOf(ctx, contributionId), contributionId);
  return ok("Envio ao contador registrado.");
}

export async function recordCommissionAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  const contributionId = str(fd, "contributionId") ?? "";
  let warnings: string[] = [];
  try {
    const result = await recordCommission(ctx, {
      contributionId,
      commissionDue: num(fd, "commissionDue") ?? Number.NaN,
      commissionPaidAt: str(fd, "commissionPaidAt"),
    });
    warnings = result.warnings.map((w) => w.message);
  } catch (error) {
    log("warn", "falha ao registrar comissão", { tenantId: ctx.tenantId, contributionId, error });
    return failFrom(error);
  }
  revalidateContribution(await projectOf(ctx, contributionId), contributionId);
  return ok("Comissão registrada.", warnings);
}

export async function cancelContributionAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  const contributionId = str(fd, "contributionId") ?? "";
  try {
    await cancelContribution(ctx, {
      contributionId,
      lostReason: str(fd, "lostReason") as Parameters<typeof cancelContribution>[1]["lostReason"],
      notes: str(fd, "notes"),
    });
  } catch (error) {
    log("warn", "falha ao cancelar aporte", { tenantId: ctx.tenantId, contributionId, error });
    return failFrom(error);
  }
  revalidateContribution(await projectOf(ctx, contributionId), contributionId);
  updateTag(PROJECTS_CACHE_TAG);
  return ok("Aporte cancelado.");
}

// Busca de patrocinadores (leads PJ/PF) por nome ou e-mail. DTO sem atributos.
export async function searchSponsorLeadsAction(query: string): Promise<SponsorLeadOption[]> {
  const ctx = await requireSession();
  const q = query.trim();
  if (q.length < 2) return [];
  return searchSponsorLeads(ctx, q.slice(0, 80));
}
