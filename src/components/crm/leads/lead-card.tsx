import { ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import type { DragEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClaimButton } from "@/components/crm/forms/claim-button";
import { SlaIndicator } from "@/components/crm/ui/sla-indicator";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { formatBRL } from "@/lib/crm/format";
import { SEGMENT_LABELS, stageLabel } from "@/lib/crm/labels";
import { leadCompany, stageInfo } from "@/lib/crm/lead-view";
import { isTerminal, stageTargets, terminalStageOf } from "@/lib/crm/stage-moves";
import type { Pipeline } from "@/lib/domain/pipelines";
import type { LeadBoardRow } from "@/lib/repos/leads";
import { cn } from "@/lib/utils";

// Cartão do quadro de leads (ADR-004, 6.3; plano, frente A). Puro: o estado do arrasto e os
// manipuladores vêm do LeadBoard. Nome como link real para o detalhe (decisão D10), empresa ·
// segmento, prazo em frase (SlaIndicator), dono ou "Assumir", valor do aporte aberto e o botão
// "Mover para" (menu com os destinos permitidos e "Marcar perdido"), que é o caminho por teclado:
// o arrasto nativo não é acessível e nunca grava nada, só abre o mesmo diálogo.
//
// `draggable` nasce falso no HTML e só vira verdadeiro depois da montagem com ponteiro fino; os
// links e botões dentro do cartão levam `draggable={false}` (senão Firefox e Safari arrastam o
// link quando o arrasto começa sobre o nome) e `onDragStart` grava um dado em `dataTransfer` (o
// Firefox não inicia o arrasto sem ele).

const KIND_SUFFIX = {
  next: "próximo",
  back: "voltar",
  return: "retorno",
  reactivate: "reativar",
} as const;

export type LeadCardProps = {
  lead: LeadBoardRow;
  pipeline: Pipeline;
  now: Date;
  canDrag: boolean;
  dragging: boolean;
  onMove: (lead: LeadBoardRow, target: string) => void;
  onDragStart: (lead: LeadBoardRow, event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
};

export function LeadCard({
  lead,
  pipeline,
  now,
  canDrag,
  dragging,
  onMove,
  onDragStart,
  onDragEnd,
}: LeadCardProps) {
  const company = leadCompany(lead);
  const terminal = isTerminal(pipeline, lead.stage);
  const terminalStage = terminalStageOf(pipeline);
  const targets = stageTargets(pipeline, lead.stage);
  const amount = lead.openContributionAmount;
  return (
    <article
      data-lead-id={lead.id}
      draggable={canDrag}
      onDragStart={(event) => onDragStart(lead, event)}
      onDragEnd={onDragEnd}
      aria-label={lead.name}
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3 shadow-xs",
        canDrag && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-50",
        // Perdidos em cinza (texto em muted), nunca com opacidade no cartão inteiro (WCAG 1.4.3).
        terminal && "text-muted-foreground",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/app/leads/${lead.id}`}
            draggable={false}
            className="min-w-0 text-sm font-medium break-words underline-offset-2 hover:underline"
          >
            {lead.name}
          </Link>
          <StatusBadge kind="temperature" value={lead.temperature} size="sm" />
        </span>
      </div>
      <span className="crm-meta min-w-0 truncate">
        {company ? `${company} · ` : ""}
        {SEGMENT_LABELS[lead.segment]}
      </span>
      <SlaIndicator
        info={stageInfo(lead, now)}
        nextActionAt={lead.nextActionAt}
        now={now}
        stage={lead}
      />
      <div className="flex items-center gap-2 pt-0.5">
        {lead.ownerName ? (
          <Avatar name={lead.ownerName} size="sm" />
        ) : (
          <ClaimButton leadId={lead.id} size="sm" />
        )}
        {amount != null ? (
          <span className="min-w-0 flex-1 truncate text-sm tabular-nums" title="Aporte em aberto">
            {formatBRL(amount)}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                draggable={false}
                aria-label={`Mover ${lead.name} para`}
                className="relative z-10 shrink-0 text-muted-foreground hover:text-foreground"
              />
            }
          >
            <ArrowRightLeft aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {targets.map((target) => (
              <DropdownMenuItem key={target.stage} onClick={() => onMove(lead, target.stage)}>
                {target.label} · {KIND_SUFFIX[target.kind]}
              </DropdownMenuItem>
            ))}
            {terminal ? null : (
              <>
                {targets.length > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem variant="destructive" onClick={() => onMove(lead, terminalStage)}>
                  Marcar {stageLabel(terminalStage).toLowerCase()}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
