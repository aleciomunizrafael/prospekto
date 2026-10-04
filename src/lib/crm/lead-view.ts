// View model de lead para lista, detalhe e tela "Hoje": empresa, tempo no estágio, SLA.
import { slaDeadline } from "@/lib/domain/sla";
import { stageSla, type Pipeline } from "@/lib/domain/pipelines";
import type { LeadSegment } from "@/lib/domain/enums";
import { companyFromAttributes } from "./attributes";
import { daysBetween, describeRemainingHours } from "./dates";

export type LeadLike = {
  segment: LeadSegment;
  pipeline: string;
  stage: string;
  stageEnteredAt: Date;
  nextActionAt: Date | null;
  attributes: Record<string, unknown>;
  orgName?: string | null;
};

export function leadCompany(lead: LeadLike): string | null {
  return lead.orgName ?? companyFromAttributes(lead.segment, lead.attributes);
}

export type StageInfo = {
  daysInStage: number;
  slaDeadline: Date | null;
  slaText: string;
  slaOverdue: boolean;
  nextActionOverdue: boolean;
};

export function stageInfo(lead: LeadLike, now: Date): StageInfo {
  const pipeline = lead.pipeline as Pipeline;
  const deadline = slaDeadline(pipeline, lead.stage, lead.stageEnteredAt);
  const sla = stageSla(pipeline, lead.stage);
  const slaText = deadline
    ? describeRemainingHours(deadline, now)
    : sla?.note
      ? sla.note
      : "sem prazo";
  return {
    daysInStage: Math.max(0, daysBetween(lead.stageEnteredAt, now)),
    slaDeadline: deadline,
    slaText,
    slaOverdue: !!deadline && deadline.getTime() < now.getTime(),
    nextActionOverdue: !!lead.nextActionAt && lead.nextActionAt.getTime() < now.getTime(),
  };
}
