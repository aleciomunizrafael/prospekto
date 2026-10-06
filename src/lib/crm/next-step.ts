// "O que eu faço agora?" (crm-design-system.md, seção 5.2 e decisão D2): o passo seguinte de um
// lead, de um projeto e de um aporte, calculado só com o que a página já carregou. Função de
// apresentação pura: nenhuma regra de negócio nova; `stageMovePlans`, `missingForProjectMove` e
// `contributionStepBlockers` continuam donos das exigências. Testado em tests/lib/next-step.test.ts.
import type { LeadSegment } from "@/lib/domain/enums";
import { slaBusinessDays } from "@/lib/domain/sla";
import { isInitialStage, isTerminalStage, stageSla, type Pipeline } from "@/lib/domain/pipelines";
import type { ContributionStep } from "@/lib/repos/contributions";
import { daysBetween } from "./dates";
import { describeSla, formatShortDay, type SlaTone } from "./describe-sla";
import { CONTRIBUTION_STATUS_LABELS } from "./enum-labels";
import { calendarDateInSaoPaulo, diffCalendarDays, formatBRL, formatDate } from "./format";
import { LOST_REASON_LABELS, stageLabel } from "./labels";
import { stageInfo } from "./lead-view";
import type { StageMovePlan } from "./stage-moves";

export type NextStepTone = "danger" | "warning" | "info";

export type NextStepChecklistItem = { label: string; done: boolean };

// `kind` diz à página qual botão renderizar ao lado do texto:
// complete_task -> TaskCompleteButton (taskId); register_contact / first_contact -> link #registrar;
// move_stage / move_project -> StageMoveDialog com defaultTarget; reactivate -> idem (reactivate);
// contribution_step -> o diálogo do passo (contributionId + step); new_contribution -> "Novo aporte";
// none -> sem botão.
export type NextStepKind =
  | "complete_task"
  | "register_contact"
  | "first_contact"
  | "move_stage"
  | "reactivate"
  | "move_project"
  | "contribution_step"
  | "new_contribution"
  | "none";

export type NextStep = {
  kind: NextStepKind;
  title: string;
  reason: string;
  tone: NextStepTone;
  checklist?: NextStepChecklistItem[];
  href?: string;
  taskId?: string;
  targetStage?: string;
  contributionId?: string;
  step?: ContributionStep;
};

export type NextStepLead = {
  segment: LeadSegment;
  pipeline: string;
  stage: string;
  stageEnteredAt: Date;
  nextActionAt: Date | null;
  lastContactAt: Date | null;
  ownerUserId: string | null;
  attributes: Record<string, unknown>;
  orgName?: string | null;
  orgCnpj?: string | null;
  lostReason?: string | null;
  lostReasonDetail?: string | null;
};

export type NextStepTask = {
  id: string;
  subject: string;
  dueAt: Date | null;
  doneAt: Date | null;
  type?: string;
};

function toneFromSla(tone: SlaTone): NextStepTone {
  return tone === "neutral" ? "info" : tone;
}

function describeLate(date: Date, now: Date): string {
  const days = daysBetween(date, now);
  if (days <= 0) return "Vence hoje";
  return days === 1 ? "Atrasada há 1 dia" : `Atrasada há ${days} dias`;
}

// "SLA de 5 dias úteis" do estágio de destino; sem prazo em dias, a nota do estágio.
function stageDeadlineReason(pipeline: Pipeline, stage: string, now: Date): string {
  const sla = stageSla(pipeline, stage);
  if (sla?.calendarDays != null) return `Prazo de ${sla.calendarDays} dias`;
  const days = slaBusinessDays(pipeline, stage, now);
  if (days === null || days === 0) return sla?.note ? `Ritmo: ${sla.note}` : "Sem prazo em dias";
  return days === 1 ? "SLA de 1 dia útil" : `SLA de ${days} dias úteis`;
}

// `done` = o que o lead já satisfaz sem abrir o diálogo; itens de aporte e projeto ficam abertos
// com a orientação de onde registrar.
function requirementChecklist(
  lead: NextStepLead,
  plan: StageMovePlan,
): NextStepChecklistItem[] | undefined {
  if (plan.requirements.length === 0) return undefined;
  return plan.requirements.map((r) => {
    switch (r.field) {
      case "owner_user_id":
        return { label: r.label, done: !!lead.ownerUserId };
      case "next_action_at":
        return { label: r.label, done: !!lead.nextActionAt };
      case "lead.attributes.vinculo_art27_checado":
        return { label: r.label, done: lead.attributes.vinculo_art27_checado === true };
      case "organization.cnpj_when_pj":
        return { label: r.label, done: lead.segment !== "PJ" || !!lead.orgCnpj };
      default:
        if (r.kind === "contribution" || r.kind === "project") {
          return { label: `${r.label} · registre no projeto`, done: false };
        }
        return { label: r.label, done: false };
    }
  });
}

export function nextStepForLead(
  lead: NextStepLead,
  tasks: NextStepTask[],
  plans: StageMovePlan[],
  now: Date,
): NextStep {
  const pipeline = lead.pipeline as Pipeline;

  // 1. Tarefa aberta vencida (a mais antiga primeiro).
  const overdueTask = tasks
    .filter(
      (t) =>
        (t.type === undefined || t.type === "tarefa") &&
        !t.doneAt &&
        !!t.dueAt &&
        t.dueAt.getTime() < now.getTime(),
    )
    .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())[0];
  if (overdueTask) {
    return {
      kind: "complete_task",
      title: `Concluir: ${overdueTask.subject}`,
      reason: describeLate(overdueTask.dueAt!, now),
      tone: "danger",
      taskId: overdueTask.id,
    };
  }

  // 2. Próxima ação vencida.
  if (lead.nextActionAt && lead.nextActionAt.getTime() < now.getTime()) {
    return {
      kind: "register_contact",
      title: "Fazer a próxima ação",
      reason: `${describeLate(lead.nextActionAt, now)} (${formatShortDay(lead.nextActionAt)})`,
      tone: "danger",
      href: "#registrar",
    };
  }

  // 3. Estágio inicial sem nenhum contato.
  if (isInitialStage(pipeline, lead.stage) && !lead.lastContactAt) {
    const sla = describeSla(stageInfo(lead, now), null, now, lead);
    return {
      kind: "first_contact",
      title: "Fazer o primeiro contato",
      reason: sla.text,
      tone: toneFromSla(sla.tone),
      href: "#registrar",
    };
  }

  // 5. Terminal: perdido, com o motivo; o botão é o movimento `reactivate`.
  if (isTerminalStage(pipeline, lead.stage)) {
    const reactivate = plans.find((p) => p.target.kind === "reactivate");
    const label = lead.lostReason
      ? ((LOST_REASON_LABELS as Record<string, string>)[lead.lostReason] ?? lead.lostReason)
      : null;
    const reason = label
      ? lead.lostReasonDetail
        ? `${label}: ${lead.lostReasonDetail}`
        : label
      : "Sem motivo registrado";
    return {
      kind: "reactivate",
      title: pipeline === "projetos" ? "Lead arquivado" : "Lead perdido",
      reason,
      tone: "info",
      targetStage: reactivate?.target.stage,
    };
  }

  // 4. Próximo estágio da ordem, com o que ele exige.
  const next = plans.find((p) => p.target.kind === "next");
  if (next) {
    return {
      kind: "move_stage",
      title: `Próximo estágio: ${next.target.label}`,
      reason: stageDeadlineReason(pipeline, next.target.stage, now),
      tone: "info",
      checklist: requirementChecklist(lead, next),
      targetStage: next.target.stage,
    };
  }

  // Último estágio sem próximo (renovação, alumni, encerrado): manter o ritmo do estágio.
  const note = stageSla(pipeline, lead.stage)?.note;
  return {
    kind: "none",
    title: "Manter o relacionamento",
    reason: note ? `Ritmo: ${note}` : `Em ${stageLabel(lead.stage)}, sem passo pendente`,
    tone: "info",
  };
}

// --- Aportes -----------------------------------------------------------------------------------

// Passo visível de um aporte pelo status (seção 5.2, ContributionTable): um botão só por linha.
// `null` quando cancelado ou quando o fluxo acabou (recibo enviado e comissão registrada).
export function nextStepFor(
  status: string,
  receiptSentToAccountantAt: string | Date | null | undefined,
  commissionDue?: number | null,
): ContributionStep | null {
  switch (status) {
    case "proposta":
      return "assinar_termo";
    case "termo_assinado":
      return "confirmar_deposito";
    case "depositado":
      return "emitir_recibo";
    case "recibo_emitido":
      if (!receiptSentToAccountantAt) return "enviar_contador";
      return commissionDue == null ? "registrar_comissao" : null;
    default:
      return null;
  }
}

export type NextStepContribution = {
  id: string;
  status: string;
  leadName: string;
  proposedAmount: number;
  expectedCloseAt?: string | Date | null;
  termSignedAt?: string | Date | null;
  depositedAt?: string | Date | null;
  depositedAmount?: number | null;
  receiptIssuedAt?: string | Date | null;
  receiptSentToAccountantAt?: string | Date | null;
  commissionDue?: number | null;
  lostReason?: string | null;
};

const STEP_VERBS: Record<ContributionStep, string> = {
  assinar_termo: "Assinar o termo",
  confirmar_deposito: "Confirmar o depósito",
  emitir_recibo: "Emitir o recibo",
  enviar_contador: "Enviar o recibo ao contador",
  registrar_comissao: "Registrar a comissão",
  cancelar: "Cancelar o aporte",
};

const STEP_TITLES_FOR_PROJECT: Record<ContributionStep, (name: string) => string> = {
  assinar_termo: (n) => `Assinar o termo de ${n}`,
  confirmar_deposito: (n) => `Confirmar o depósito de ${n}`,
  emitir_recibo: (n) => `Emitir o recibo de ${n}`,
  enviar_contador: (n) => `Enviar o recibo de ${n} ao contador`,
  registrar_comissao: (n) => `Registrar a comissão de ${n}`,
  cancelar: (n) => `Cancelar o aporte de ${n}`,
};

function expectedCloseText(c: NextStepContribution, now: Date): string | null {
  if (!c.expectedCloseAt) return null;
  const date = formatDate(c.expectedCloseAt);
  const iso = typeof c.expectedCloseAt === "string" ? c.expectedCloseAt : null;
  if (!iso) return `previsto para ${date}`;
  // Dias de calendário em São Paulo: "em 6 dias" conta de hoje até a data prevista.
  const days = diffCalendarDays(calendarDateInSaoPaulo(now), iso.slice(0, 10));
  if (days < 0) return `previsto para ${date} (há ${-days} ${-days === 1 ? "dia" : "dias"})`;
  if (days === 0) return `previsto para ${date} (hoje)`;
  return `previsto para ${date} (em ${days} ${days === 1 ? "dia" : "dias"})`;
}

function stepReason(step: ContributionStep, c: NextStepContribution, now: Date): string {
  switch (step) {
    case "assinar_termo": {
      const when = expectedCloseText(c, now);
      return `Proposta de ${formatBRL(c.proposedAmount)}${when ? `, ${when}` : ""}. Depois, confirmar o depósito.`;
    }
    case "confirmar_deposito": {
      const when = expectedCloseText(c, now);
      const signed = c.termSignedAt
        ? `Termo assinado em ${formatDate(c.termSignedAt)}`
        : "Termo assinado";
      return `${signed}${when ? `, depósito ${when}` : ""}.`;
    }
    case "emitir_recibo":
      return `${c.depositedAt ? `Depositado em ${formatDate(c.depositedAt)}` : "Depósito confirmado"}${
        c.depositedAmount != null ? ` (${formatBRL(c.depositedAmount)})` : ""
      }. Depois, registrar a comissão.`;
    case "enviar_contador":
      return `${c.receiptIssuedAt ? `Recibo emitido em ${formatDate(c.receiptIssuedAt)}` : "Recibo emitido"}. O contador precisa dele para a dedução.`;
    case "registrar_comissao":
      return "Recibo enviado ao contador. Falta só registrar a comissão deste aporte.";
    case "cancelar":
      return "";
  }
}

export function nextStepForContribution(
  c: NextStepContribution,
  blockers: Partial<Record<ContributionStep, string[]>>,
  now: Date = new Date(),
): NextStep {
  if (c.status === "cancelado") {
    const label = c.lostReason
      ? ((LOST_REASON_LABELS as Record<string, string>)[c.lostReason] ?? c.lostReason)
      : null;
    return {
      kind: "none",
      title: "Aporte cancelado",
      reason: label ? `Motivo: ${label}` : "Nada mais a fazer neste aporte.",
      tone: "info",
    };
  }
  const step = nextStepFor(c.status, c.receiptSentToAccountantAt, c.commissionDue);
  if (!step) {
    return {
      kind: "none",
      title: "Aporte concluído",
      reason: "Recibo enviado ao contador e comissão registrada.",
      tone: "info",
    };
  }
  const missing = blockers[step] ?? [];
  const checklist = missing.length ? missing.map((label) => ({ label, done: false })) : undefined;
  let title = STEP_VERBS[step];
  if (step === "confirmar_deposito") {
    const when = expectedCloseText(c, now);
    if (when) title = `Confirmar o depósito ${when}`;
  }
  return {
    kind: "contribution_step",
    title,
    reason: stepReason(step, c, now),
    tone: checklist ? "warning" : "info",
    checklist,
    contributionId: c.id,
    step,
  };
}

// --- Projetos ----------------------------------------------------------------------------------

export type NextStepProject = {
  stage: string;
  alerts: ("prazo" | "captacao")[];
  daysRemaining: number | null;
  raisedPercent: number | null;
};

export type NextStepDestination = {
  to: string;
  kind: "next" | "return" | "back";
  missing: string[];
};

function percentText(value: number | null): string {
  if (value == null) return "0 %";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value)} %`;
}

export function nextStepForProject(
  project: NextStepProject,
  contributions: NextStepContribution[],
  destinations: NextStepDestination[],
  now: Date = new Date(),
): NextStep {
  // 1. Aporte com passo pendente (o primeiro não cancelado que ainda não fechou o ciclo).
  for (const c of contributions) {
    if (c.status === "cancelado") continue;
    const step = nextStepFor(c.status, c.receiptSentToAccountantAt, c.commissionDue);
    if (!step || step === "registrar_comissao") continue;
    return {
      kind: "contribution_step",
      title: STEP_TITLES_FOR_PROJECT[step](c.leadName),
      reason: stepReason(step, c, now),
      tone: "info",
      contributionId: c.id,
      step,
    };
  }

  // 2. Alerta de prazo ou captação (regra R-13): captar mais.
  if (project.alerts.length > 0) {
    const pct = percentText(project.raisedPercent);
    const title =
      project.alerts.includes("prazo") && project.daysRemaining != null
        ? project.daysRemaining < 0
          ? `Prazo vencido há ${-project.daysRemaining} dias com ${pct} captado`
          : `Prazo em ${project.daysRemaining} dias com ${pct} captado`
        : `Só ${pct} captado`;
    return {
      kind: "new_contribution",
      title,
      reason: "Proponha o projeto a novos patrocinadores e registre cada aporte aqui.",
      tone: "warning",
    };
  }

  // 3. Próximo estágio com o que falta.
  const next = destinations.find((d) => d.kind === "next");
  if (next) {
    return {
      kind: "move_project",
      title: `Próximo estágio: ${stageLabel(next.to)}`,
      reason: stageDeadlineReason("projetos", next.to, now),
      tone: "info",
      checklist: next.missing.length
        ? next.missing.map((label) => ({ label, done: false }))
        : undefined,
      targetStage: next.to,
    };
  }

  const note = stageSla("projetos", project.stage)?.note;
  return {
    kind: "none",
    title: `Projeto em ${stageLabel(project.stage)}`,
    reason: note ? `Ritmo: ${note}` : "Sem passo pendente.",
    tone: "info",
  };
}

export function contributionStatusLabel(status: string): string {
  return (CONTRIBUTION_STATUS_LABELS as Record<string, string>)[status] ?? status;
}
