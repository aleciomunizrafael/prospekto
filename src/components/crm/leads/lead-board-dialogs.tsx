"use client";

import {
  MarkLostDialog,
  StageMoveDialog,
  type LeadStageProps,
} from "@/components/crm/forms/stage-move-dialog";
import { stageInfo } from "@/lib/crm/lead-view";
import { stageMovePlansWithSuggestion, terminalStageOf } from "@/lib/crm/stage-moves";
import { isInitialStage, type Pipeline } from "@/lib/domain/pipelines";
import type { LeadBoardRow } from "@/lib/repos/leads";

// Diálogos do quadro de leads (ADR-004, 6.3; plano, P5): soltar um cartão ou escolher um destino
// no menu "Mover para" nunca grava direto; abre o StageMoveDialog existente já no destino (ou o
// MarkLostDialog quando o destino é o terminal), controlado e **sempre montado com `key`**
// (`${lead.id}:${target}`), porque os dois guardam o destino ou o motivo em `useState` só na
// montagem: reaproveitar a instância entre dois arrastos mostraria o destino anterior. O sucesso
// faz `router.refresh()` dentro do diálogo; nada de `useOptimistic`: o quadro só muda quando o
// servidor confirma. Sem `trigger`, o base-ui devolveria o foco ao elemento focado antes de abrir:
// na soltura é o `main` da página (o mousedown no cartão, não focável, cai nele), cujo primeiro
// tabbable é o "Novo lead" do cabeçalho; por isso `finalFocus` aponta para o "Mover … para" do
// mesmo cartão, como no caminho por menu (WCAG 2.4.3). Depois do sucesso o cartão remonta noutra
// coluna: se já estiver no DOM o foco vai para o botão dele, senão `null` mantém o padrão.

export type MoveRequest = { lead: LeadBoardRow; target: string };

type User = { id: string; name: string };

// LeadStageProps a partir da linha do quadro, com o `now` do servidor (ISO) para o plano não
// divergir entre servidor e cliente.
export function stagePropsFor(
  lead: LeadBoardRow,
  pipeline: Pipeline,
  users: User[],
  now: Date,
): LeadStageProps {
  // Mesma regra da página do lead (stage-moves.ts): sugestão só em destinos com prazo em dias.
  const plans = stageMovePlansWithSuggestion(pipeline, lead.stage, now);
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
  const finalFocus = () =>
    document.querySelector<HTMLElement>(
      `[data-lead-id="${request.lead.id}"] button[aria-label^="Mover "]`,
    );
  if (request.target === props.terminalStage) {
    return (
      <MarkLostDialog
        key={key}
        {...props}
        trigger={null}
        open
        onOpenChange={onOpenChange}
        finalFocus={finalFocus}
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
      finalFocus={finalFocus}
      origin="board"
    />
  );
}
