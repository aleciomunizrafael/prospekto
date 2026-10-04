// "Mover para" (proposta-c, seção 9.2): destinos permitidos a partir do estágio atual, rótulos
// em português dos campos exigidos por STAGE_REQUIREMENTS e a data sugerida pela SLA.
import { slaDeadline } from "@/lib/domain/sla";
import {
  INITIAL_STAGES,
  STAGES,
  TERMINAL_STAGES,
  isInitialStage,
  isTerminalStage,
  requirementsForMove,
  stageIndex,
  type Pipeline,
} from "@/lib/domain/pipelines";
import { stageLabel } from "./labels";

// Retornos previstos em personas-e-funis.md, seção 8.
const RETURNS: Record<Pipeline, Record<string, string[]>> = {
  patrocinadores: { renovacao: ["proposta"] },
  contadores: { inativo: ["ativo"], ativo: ["inativo"] },
  municipios: { encerrado: ["proposta"] },
  projetos: { encerrado: ["elaboracao"] },
  alunos: {},
};

export type StageTarget = {
  stage: string;
  label: string;
  kind: "next" | "return" | "back" | "reactivate";
  description: string;
};

export function stageTargets(pipeline: Pipeline, current: string): StageTarget[] {
  const stages = STAGES[pipeline] as readonly string[];
  const idx = stageIndex(pipeline, current);
  const terminal = TERMINAL_STAGES[pipeline];
  const out: StageTarget[] = [];
  if (current === terminal) {
    out.push({
      stage: INITIAL_STAGES[pipeline],
      label: stageLabel(INITIAL_STAGES[pipeline]),
      kind: "reactivate",
      description: "Reativar: o lead volta ao início do pipeline.",
    });
    return out;
  }
  const next = stages[idx + 1];
  if (next && next !== terminal) {
    out.push({
      stage: next,
      label: stageLabel(next),
      kind: "next",
      description: "Próximo estágio na ordem do pipeline.",
    });
  }
  for (const r of RETURNS[pipeline][current] ?? []) {
    if (!out.some((t) => t.stage === r)) {
      out.push({
        stage: r,
        label: stageLabel(r),
        kind: "return",
        description: "Retorno previsto no playbook.",
      });
    }
  }
  const prev = stages[idx - 1];
  if (prev && !out.some((t) => t.stage === prev)) {
    out.push({
      stage: prev,
      label: stageLabel(prev),
      kind: "back",
      description: "Voltar um estágio: só para corrigir um registro errado (exige motivo).",
    });
  }
  return out;
}

// Campo de pipelines.ts -> como a tela trata. "form": editável no diálogo; "attributes": fica em
// "Editar" (campos do segmento); "contribution"/"project": registrado em /app/projetos; "org": em
// /app/organizacoes.
export type RequirementKind = "form" | "attributes" | "contribution" | "project" | "org";

export type RequirementLabel = { field: string; label: string; kind: RequirementKind };

const FIELD_LABELS: Record<string, { label: string; kind: RequirementKind }> = {
  owner_user_id: { label: "Responsável pelo lead", kind: "form" },
  next_action_at: { label: "Data da próxima ação", kind: "form" },
  lost_reason: { label: "Motivo de perda (detalhe quando 'outro')", kind: "form" },
  "lead.attributes.vinculo_art27_checado": {
    label: "Checagem de vínculo com o proponente (art. 27), com data e quem checou",
    kind: "attributes",
  },
  "organization.cnpj_when_pj": { label: "CNPJ da empresa patrocinadora (PJ)", kind: "org" },
  "contribution.project_id": { label: "Projeto da proposta de aporte", kind: "contribution" },
  "contribution.proposed_amount": { label: "Valor proposto do aporte", kind: "contribution" },
  "contribution.type": { label: "Tipo do aporte (patrocínio ou doação)", kind: "contribution" },
  "contribution.mechanism": { label: "Mecanismo do aporte", kind: "contribution" },
  "contribution.term_signed_at": { label: "Data de assinatura do termo", kind: "contribution" },
  "contribution.bank_details_sent_at": {
    label: "Data de envio dos dados bancários",
    kind: "contribution",
  },
  "contribution.org_id_when_pj": {
    label: "Empresa patrocinadora (com CNPJ) no aporte",
    kind: "contribution",
  },
  "contribution.deposited_at": { label: "Data do depósito", kind: "contribution" },
  "contribution.deposited_amount": { label: "Valor depositado", kind: "contribution" },
  "contribution.receipt_number": { label: "Número do recibo", kind: "contribution" },
  "contribution.receipt_issued_at": { label: "Data do recibo", kind: "contribution" },
  "contribution.receipt_sent_to_accountant_at": {
    label: "Data de envio do recibo ao contador",
    kind: "contribution",
  },
  "contribution.new_proposal": {
    label: "Nova proposta de aporte para o período seguinte",
    kind: "contribution",
  },
  "project.mechanism": { label: "Mecanismo do projeto", kind: "project" },
  "project.process_number": { label: "Número do processo", kind: "project" },
  "project.approved_amount": { label: "Valor aprovado", kind: "project" },
  "project.fundraising_deadline": { label: "Prazo de captação", kind: "project" },
  "project.fundraising_fee_amount": { label: "Rubrica de captação", kind: "project" },
  "project.balance_positive": { label: "Saldo a captar maior que zero", kind: "project" },
  "project.report_due_at": { label: "Data limite do relatório", kind: "project" },
};

export function requirementLabels(
  pipeline: Pipeline,
  from: string,
  to: string,
): RequirementLabel[] {
  const fields = [...new Set(requirementsForMove(pipeline, from, to).flatMap((r) => r.fields))];
  return fields.map((field) => ({
    field,
    label: FIELD_LABELS[field]?.label ?? field,
    kind: FIELD_LABELS[field]?.kind ?? "form",
  }));
}

export type StageMovePlan = {
  target: StageTarget;
  requirements: RequirementLabel[];
  needsOwnerAndNextAction: boolean;
  needsReason: boolean;
  // ISO da próxima ação sugerida (hoje + SLA do destino); null sem SLA em dias.
  suggestedNextActionAt: string | null;
  blockedBy: RequirementLabel[];
};

export function stageMovePlans(pipeline: Pipeline, current: string, now: Date): StageMovePlan[] {
  return stageTargets(pipeline, current).map((target) => {
    const requirements = requirementLabels(pipeline, current, target.stage);
    const suggested = slaDeadline(pipeline, target.stage, now);
    return {
      target,
      requirements,
      needsOwnerAndNextAction: isInitialStage(pipeline, current),
      needsReason: target.kind === "back",
      suggestedNextActionAt: suggested ? suggested.toISOString() : null,
      blockedBy: requirements.filter((r) => r.kind === "contribution" || r.kind === "project"),
    };
  });
}

export function terminalStageOf(pipeline: Pipeline): string {
  return TERMINAL_STAGES[pipeline];
}

export function isTerminal(pipeline: Pipeline, stage: string): boolean {
  return isTerminalStage(pipeline, stage);
}
