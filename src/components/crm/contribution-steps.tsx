// Passos do aporte (servidor): calcula o que falta e monta os diálogos certos. `variant="row"`
// mostra só o botão do passo atual (nextStepFor) e um "⋯" com Registrar comissão e Cancelar
// aporte; `variant="flow"` é a StepFlow do detalhe, com o diálogo do passo sob o passo atual.
// Os dados (bloqueios, projeto, aportes irmãos, empresas) podem vir carregados em `data`: a tabela
// de aportes carrega uma vez por linha (desktop e cards usam o mesmo) e agrupa as consultas de
// projeto por projeto distinto; o detalhe reaproveita o que a página já buscou.
import { commissionLimitsFor, maxCommissionFor } from "@/lib/domain/commission";
import type { IncentiveMechanism } from "@/lib/domain/enums";
import { formatDate } from "@/lib/crm/format";
import { nextStepFor } from "@/lib/crm/next-step";
import type { Ctx } from "@/lib/repos/ctx";
import { listOrganizations } from "@/lib/repos/organizations";
import { getProject } from "@/lib/repos/projects";
import {
  contributionStepBlockers,
  listContributions,
  type ContributionStep,
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
import { ActionDialogMenu, type ActionMenuItem } from "./project-forms/action-dialog";
import { StepFlow, type Step } from "./ui/step-flow";

// Rótulos dos gatilhos em contribution-dialogs.tsx (o menu "⋯" identifica cada diálogo por eles).
const CANCEL_LABEL = "Cancelar aporte";
const COMMISSION_LABEL = (c: ContributionSummary) =>
  c.commissionDue == null ? "Registrar comissão" : "Alterar comissão";

// Cinco passos do fluxo (crm-design-system.md, seção 7.9) a partir das datas do aporte.
export function contributionFlowSteps(
  c: ContributionSummary,
  currentStep: ContributionStep | null,
  blocked: boolean,
): Step[] {
  const cancelled = c.status === "cancelado";
  const state = (done: boolean, isCurrent: boolean): Step["state"] =>
    cancelled
      ? "cancelled"
      : done
        ? "done"
        : isCurrent
          ? blocked
            ? "blocked"
            : "current"
          : "todo";
  return [
    {
      key: "proposta",
      label: "Proposta",
      state: cancelled ? "cancelled" : "done",
      date: formatDate(c.createdAt),
    },
    {
      key: "termo",
      label: "Termo assinado",
      state: state(!!c.termSignedAt, currentStep === "assinar_termo"),
      date: c.termSignedAt ? formatDate(c.termSignedAt) : undefined,
    },
    {
      key: "deposito",
      label: "Depositado",
      state: state(!!c.depositedAt, currentStep === "confirmar_deposito"),
      date: c.depositedAt ? formatDate(c.depositedAt) : undefined,
      detail:
        !c.depositedAt && c.expectedCloseAt
          ? `previsto ${formatDate(c.expectedCloseAt)}`
          : undefined,
    },
    {
      key: "recibo",
      label: "Recibo emitido",
      state: state(!!c.receiptIssuedAt, currentStep === "emitir_recibo"),
      date: c.receiptIssuedAt ? formatDate(c.receiptIssuedAt) : undefined,
      detail: c.receiptNumber ?? undefined,
    },
    {
      key: "contador",
      label: "Enviado ao contador",
      state: state(!!c.receiptSentToAccountantAt, currentStep === "enviar_contador"),
      date: c.receiptSentToAccountantAt ? formatDate(c.receiptSentToAccountantAt) : undefined,
    },
  ];
}

export type ContributionStepData = {
  blockers: Record<ContributionStep, string[]>;
  project: Awaited<ReturnType<typeof getProject>>;
  siblings: Awaited<ReturnType<typeof listContributions>>;
  // Empresas para escolher no "Assinar termo"; vazio quando o aporte já passou da proposta.
  sponsorOrgs: Awaited<ReturnType<typeof listOrganizations>>;
};

const SPONSOR_ORGS_LIMIT = 300;
const SIBLINGS_LIMIT = 500;

export async function loadContributionStepData(
  ctx: Ctx,
  contribution: ContributionSummary,
): Promise<ContributionStepData> {
  const [blockers, sponsorOrgs, project, siblings] = await Promise.all([
    contributionStepBlockers(ctx, contribution),
    contribution.status === "proposta"
      ? listOrganizations(ctx, { type: "empresa", limit: SPONSOR_ORGS_LIMIT })
      : [],
    getProject(ctx, contribution.projectId),
    listContributions(ctx, { projectId: contribution.projectId, limit: SIBLINGS_LIMIT }),
  ]);
  return { blockers, sponsorOrgs, project, siblings };
}

// Dados de várias linhas de uma vez: bloqueios por aporte (precisam do aporte), projeto e irmãos
// uma vez por projeto distinto, empresas uma vez para todas as propostas. Cancelados ficam fora
// (não têm passo).
export async function loadContributionStepDataForRows(
  ctx: Ctx,
  rows: ContributionSummary[],
): Promise<Map<string, ContributionStepData>> {
  const active = rows.filter((c) => c.status !== "cancelado");
  const projectIds = [...new Set(active.map((c) => c.projectId))];
  const [blockersList, sponsorOrgs, projects, siblingsList] = await Promise.all([
    Promise.all(active.map((c) => contributionStepBlockers(ctx, c))),
    active.some((c) => c.status === "proposta")
      ? listOrganizations(ctx, { type: "empresa", limit: SPONSOR_ORGS_LIMIT })
      : [],
    Promise.all(projectIds.map((id) => getProject(ctx, id))),
    Promise.all(
      projectIds.map((id) => listContributions(ctx, { projectId: id, limit: SIBLINGS_LIMIT })),
    ),
  ]);
  const byProject = new Map(
    projectIds.map((id, i) => [id, { project: projects[i], siblings: siblingsList[i] }]),
  );
  const out = new Map<string, ContributionStepData>();
  active.forEach((c, i) => {
    const p = byProject.get(c.projectId);
    out.set(c.id, {
      blockers: blockersList[i],
      sponsorOrgs: c.status === "proposta" ? sponsorOrgs : [],
      project: p?.project ?? null,
      siblings: p?.siblings ?? [],
    });
  });
  return out;
}

export async function ContributionSteps({
  ctx,
  contribution,
  data,
  variant = "row",
  size = "sm",
  compact = false,
  menu = true,
}: {
  ctx: Ctx;
  contribution: ContributionSummary;
  // Dados já carregados (loadContributionStepData); sem eles o componente consulta o banco.
  data?: ContributionStepData;
  variant?: "row" | "flow";
  // Tamanho dos botões na linha ("touch" nos cards do celular).
  size?: "sm" | "touch";
  // Botão do passo em `outline` (tabelas); sem `compact` o passo principal é o botão sólido.
  compact?: boolean;
  // `false` esconde o "⋯" (comissão e cancelar) quando a tela já os oferece em outro lugar.
  menu?: boolean;
}) {
  const status = contribution.status;
  if (status === "cancelado") {
    if (variant === "flow") {
      return <StepFlow steps={contributionFlowSteps(contribution, null, false)} />;
    }
    return null;
  }
  const { blockers, sponsorOrgs, project, siblings } =
    data ?? (await loadContributionStepData(ctx, contribution));
  const step = nextStepFor(
    status,
    contribution.receiptSentToAccountantAt,
    contribution.commissionDue,
  );
  const mechanism = (project?.mechanism ?? contribution.mechanism) as IncentiveMechanism;
  const projectCommissionSoFar = siblings
    .filter((s) => s.id !== contribution.id && s.status !== "cancelado")
    .reduce((acc, s) => acc + (s.commissionDue ?? 0), 0);

  const canCommission = status === "depositado" || status === "recibo_emitido";
  const commissionDialog = canCommission ? (
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
  ) : null;

  // Diálogo do passo atual (um botão visível por linha).
  let primary: React.ReactNode = null;
  switch (step) {
    case "assinar_termo":
      primary = (
        <SignTermDialog
          contributionId={contribution.id}
          blockers={blockers.assinar_termo}
          sponsorOrgs={sponsorOrgs.map((o) => ({ value: o.id, label: o.name }))}
          needsOrg={contribution.leadSegment === "PJ" && !contribution.orgId}
        />
      );
      break;
    case "confirmar_deposito":
      primary = (
        <ConfirmDepositDialog
          contributionId={contribution.id}
          blockers={blockers.confirmar_deposito}
          proposedAmount={contribution.proposedAmount}
        />
      );
      break;
    case "emitir_recibo":
      primary = (
        <IssueReceiptDialog contributionId={contribution.id} blockers={blockers.emitir_recibo} />
      );
      break;
    case "enviar_contador":
      primary = (
        <SendToAccountantDialog
          contributionId={contribution.id}
          blockers={blockers.enviar_contador}
        />
      );
      break;
    case "registrar_comissao":
      primary = commissionDialog;
      break;
    default:
      primary = null;
  }

  // O resto vai para o "⋯": comissão (quando não é o passo atual) e cancelar.
  const menuItems: ActionMenuItem[] = [];
  if (menu && commissionDialog && step !== "registrar_comissao") {
    menuItems.push({
      label: COMMISSION_LABEL(contribution),
      disabled: blockers.registrar_comissao.length > 0,
    });
  }
  if (menu) {
    menuItems.push({
      label: CANCEL_LABEL,
      variant: "destructive",
      disabled: blockers.cancelar.length > 0,
    });
  }

  const cancelDialog = (
    <CancelContributionDialog
      contributionId={contribution.id}
      blockers={blockers.cancelar}
      wasDeposited={status === "depositado" || status === "recibo_emitido"}
    />
  );

  const actions = (
    <ActionDialogMenu
      items={menuItems}
      size={size}
      className="flex-nowrap"
      primaryProps={
        compact
          ? { variant: "outline", size: size === "touch" ? "touch" : "sm" }
          : { size: size === "touch" ? "touch" : undefined }
      }
    >
      {primary}
      {menu && commissionDialog && step !== "registrar_comissao" ? commissionDialog : null}
      {menu ? cancelDialog : null}
    </ActionDialogMenu>
  );

  if (variant === "flow") {
    const stepBlockers = step ? (blockers[step] ?? []) : [];
    return (
      <StepFlow
        steps={contributionFlowSteps(contribution, step, stepBlockers.length > 0)}
        blockers={stepBlockers}
        action={actions}
      />
    );
  }
  return actions;
}
