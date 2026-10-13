"use client";

import {
  MarkLostDialog,
  StageMoveDialog,
  type LeadStageProps,
} from "@/components/crm/forms/stage-move-dialog";
import { stageInfo } from "@/lib/crm/lead-view";
import { stageMovePlans, terminalStageOf } from "@/lib/crm/stage-moves";
import { isInitialStage, stageSla, type Pipeline } from "@/lib/domain/pipelines";
import { slaBusinessDays } from "@/lib/domain/sla";
import type { LeadBoardRow } from "@/lib/repos/leads";

// Diálogos do quadro de leads (ADR-004, 6.3; plano, P5): soltar um cartão ou escolher um destino
// no menu "Mover para" nunca grava direto; abre o StageMoveDialog existente já no destino (ou o
// MarkLostDialog quando o destino é o terminal), controlado e **sempre montado com `key`**
// (`${lead.id}:${target}`), porque os dois guardam o destino ou o motivo em `useState` só na
// montagem: reaproveitar a instância entre dois arrastos mostraria o destino anterior. O sucesso
// faz `router.refresh()` dentro do diálogo; nada de `useOptimistic`: o quadro só muda quando o
// servidor confirma.

export type MoveRequest = { lead: LeadBoardRow; target: string };

type User = { id: string; name: string };

// Mesma regra da página do lead: só estágios com prazo em dias (úteis ou corridos) sugerem uma
// próxima ação; um prazo zero devolveria o instante atual. Cópia das 8 linhas de
// leads/[id]/page.tsx; a Integração move as duas para stage-moves.ts.
function stageHasDeadline(pipeline: Pipeline, stage: string, now: Date): boolean {
  const sla = stageSla(pipeline, stage);
  if (!sla) return false;
  if (sla.calendarDays != null) return sla.calendarDays > 0;
  return (slaBusinessDays(pipeline, stage, now) ?? 0) > 0;
}

// LeadStageProps a partir da linha do quadro, com o `now` do servidor (ISO) para o plano não
// divergir entre servidor e cliente.
export function stagePropsFor(
  lead: LeadBoardRow,
  pipeline: Pipeline,
  users: User[],
  now: Date,
): LeadStageProps {
  const plans = stageMovePlans(pipeline, lead.stage, now).map((plan) =>
    stageHasDeadline(pipeline, plan.target.stage, now)
      ? plan
      : { ...plan, suggestedNextActionAt: null },
  );
  return {
    leadId: lead.id,
    leadName: lead.name,
    pipeline,
    currentStage: lead.stage,
    daysInStage: stageInfo(lead, now).daysInStage,
    isPj: lead.segment === "PJ",
    plans,
    terminalStage: terminalStageOf(pipeline),
    ownerUserId: lead.ownerUserId,
    users,
    currentIsInitial: isInitialStage(pipeline, lead.stage),
    art27Done: lead.attributes.vinculo_art27_checado === true,
    nextActionAt: lead.nextActionAt ? lead.nextActionAt.toISOString() : null,
    orgId: lead.orgId,
    orgCnpj: lead.orgCnpj,
    openContributionProjectId: lead.openContributionProjectId,
  };
}

export function LeadBoardDialogs({
  request,
  onClose,
  pipeline,
  users,
  now,
}: {
  request: MoveRequest | null;
  onClose: () => void;
  pipeline: Pipeline;
  users: User[];
  // ISO do servidor.
  now: string;
}) {
  if (!request) return null;
  const props = stagePropsFor(request.lead, pipeline, users, new Date(now));
  const key = `${request.lead.id}:${request.target}`;
  const onOpenChange = (open: boolean) => {
    if (!open) onClose();
  };
  if (request.target === props.terminalStage) {
    return (
      <MarkLostDialog
        key={key}
        {...props}
        trigger={null}
        open
        onOpenChange={onOpenChange}
        origin="board"
      />
    );
  }
  return (
    <StageMoveDialog
      key={key}
      {...props}
      defaultTarget={request.target}
      trigger={null}
      open
      onOpenChange={onOpenChange}
      origin="board"
    />
  );
}
