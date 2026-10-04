// Barra de passos do aporte (servidor): calcula o que falta e monta os diálogos certos.
import { commissionLimitsFor, maxCommissionFor } from "@/lib/domain/commission";
import type { IncentiveMechanism } from "@/lib/domain/enums";
import type { Ctx } from "@/lib/repos/ctx";
import { listOrganizations } from "@/lib/repos/organizations";
import { getProject } from "@/lib/repos/projects";
import {
  contributionStepBlockers,
  listContributions,
  type ContributionSummary,
} from "@/lib/repos/contributions";
import {
  CancelContributionDialog,
  ConfirmDepositDialog,
  IssueReceiptDialog,
  RecordCommissionDialog,
  SendToAccountantDialog,
  SignTermDialog,
} from "./contribution-dialogs";

export async function ContributionSteps({
  ctx,
  contribution,
}: {
  ctx: Ctx;
  contribution: ContributionSummary;
}) {
  const blockers = await contributionStepBlockers(ctx, contribution);
  const status = contribution.status;
  if (status === "cancelado") return null;
  const [sponsorOrgs, project, siblings] = await Promise.all([
    status === "proposta" ? listOrganizations(ctx, { type: "empresa", limit: 300 }) : [],
    getProject(ctx, contribution.projectId),
    listContributions(ctx, { projectId: contribution.projectId, limit: 500 }),
  ]);
  const mechanism = (project?.mechanism ?? contribution.mechanism) as IncentiveMechanism;
  const projectCommissionSoFar = siblings
    .filter((s) => s.id !== contribution.id && s.status !== "cancelado")
    .reduce((acc, s) => acc + (s.commissionDue ?? 0), 0);
  return (
    <div className="flex flex-wrap gap-2">
      {status === "proposta" ? (
        <SignTermDialog
          contributionId={contribution.id}
          blockers={blockers.assinar_termo}
          sponsorOrgs={sponsorOrgs.map((o) => ({ value: o.id, label: o.name }))}
          needsOrg={contribution.leadSegment === "PJ" && !contribution.orgId}
        />
      ) : null}
      {status === "termo_assinado" ? (
        <ConfirmDepositDialog
          contributionId={contribution.id}
          blockers={blockers.confirmar_deposito}
          proposedAmount={contribution.proposedAmount}
        />
      ) : null}
      {status === "depositado" ? (
        <IssueReceiptDialog contributionId={contribution.id} blockers={blockers.emitir_recibo} />
      ) : null}
      {status === "recibo_emitido" && !contribution.receiptSentToAccountantAt ? (
        <SendToAccountantDialog
          contributionId={contribution.id}
          blockers={blockers.enviar_contador}
        />
      ) : null}
      {status === "depositado" || status === "recibo_emitido" ? (
        <RecordCommissionDialog
          contributionId={contribution.id}
          blockers={blockers.registrar_comissao}
          commission={{
            depositedAmount: contribution.depositedAmount,
            maxByPercent:
              contribution.depositedAmount == null
                ? null
                : maxCommissionFor(contribution.depositedAmount, mechanism),
            contractedPercent: project?.commissionPct ?? null,
            fundraisingFeeAmount: project?.fundraisingFeeAmount ?? null,
            projectCommissionSoFar,
            capPerProject: commissionLimitsFor(mechanism)?.capPerProject ?? null,
            currentDue: contribution.commissionDue,
            currentPaidAt: contribution.commissionPaidAt,
          }}
        />
      ) : null}
      <CancelContributionDialog
        contributionId={contribution.id}
        blockers={blockers.cancelar}
        wasDeposited={status === "depositado" || status === "recibo_emitido"}
      />
    </div>
  );
}
