import Link from "next/link";
import type { DragEvent } from "react";
import { leadFiltersToQuery, type LeadFilters } from "@/lib/crm/filters";
import { formatBRL } from "@/lib/crm/format";
import { PIPELINE_LABELS, stageLabel } from "@/lib/crm/labels";
import { stageTone, type StatusTone } from "@/lib/crm/status-tones";
import {
  allowedStageMoves,
  isTerminalStage,
  TERMINAL_STAGES,
  type Pipeline,
} from "@/lib/domain/pipelines";
import type { LeadBoardColumn, LeadBoardRow } from "@/lib/repos/leads";
import { cn } from "@/lib/utils";
import { LeadCard } from "./lead-card";

// Colunas do quadro de leads (ADR-004, 6.3; plano, frente A). Puro: recebe o estado do arrasto e
// os manipuladores do LeadBoard, e é o que tests/lead-board.test.ts renderiza com renderToString.
// Uma coluna por estágio na ordem do domínio; durante o arrasto as colunas fora de
// `allowedStageMoves` ficam esmaecidas com a frase no cabeçalho, e a coluna terminal (oculta por
// padrão) aparece como zona "Marcar perdido" fixa à direita do contêiner com rolagem horizontal.
// No celular as colunas têm 85 vw com `snap-center` e a página rola na vertical (sem `max-h`).

export type DragState = { leadId: string; stage: string; name: string };

export type LeadBoardColumnsProps = {
  pipeline: Pipeline;
  columns: LeadBoardColumn[];
  now: Date;
  filters: LeadFilters;
  canDrag: boolean;
  dragging: DragState | null;
  overStage: string | null;
  onMove: (lead: LeadBoardRow, target: string) => void;
  onDragStart: (lead: LeadBoardRow, event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onColumnDragOver: (stage: string, event: DragEvent<HTMLElement>) => void;
  onColumnDragLeave: (stage: string, event: DragEvent<HTMLElement>) => void;
  onColumnDrop: (stage: string, event: DragEvent<HTMLElement>) => void;
};

// Ponto de 8 px na cor da família do estágio (a mesma do StatusBadge).
const DOT_BY_TONE: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground/60",
  info: "bg-primary",
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  outline: "border border-border bg-transparent",
};

// Destinos permitidos a partir do estágio do cartão arrastado (null fora do arrasto).
export function allowedTargets(pipeline: Pipeline, dragging: DragState | null): Set<string> | null {
  if (!dragging) return null;
  return new Set(allowedStageMoves(pipeline, dragging.stage).map((m) => m.stage));
}

export function LeadBoardColumns({
  pipeline,
  columns,
  now,
  filters,
  canDrag,
  dragging,
  overStage,
  onMove,
  onDragStart,
  onDragEnd,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
}: LeadBoardColumnsProps) {
  const terminal = TERMINAL_STAGES[pipeline];
  const allowed = allowedTargets(pipeline, dragging);
  const draggingTerminal = !!dragging && isTerminalStage(pipeline, dragging.stage);
  const blockedHint = draggingTerminal ? "Reative pelo Mover para" : "Avance um estágio por vez";
  // A zona "Marcar perdido" aparece durante o arrasto de qualquer cartão não terminal.
  const showLostZone = !!dragging && !draggingTerminal;
  const lostZoneOver = overStage === terminal;

  return (
    <section
      aria-label={`Quadro de ${PIPELINE_LABELS[pipeline]}`}
      className="relative -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0"
    >
      {columns.map((column) => {
        const own = dragging?.stage === column.stage;
        const blocked = !!dragging && !own && !allowed?.has(column.stage);
        const over = !!dragging && !own && !blocked && overStage === column.stage;
        const label = stageLabel(column.stage);
        const tone = stageTone(pipeline, column.stage).tone;
        const listHref = `/app/leads${leadFiltersToQuery({
          ...filters,
          stage: column.stage,
          page: 1,
          view: "lista",
        })}`;
        return (
          <div
            key={column.stage}
            data-stage={column.stage}
            data-blocked={blocked ? "true" : undefined}
            onDragOver={(event) => onColumnDragOver(column.stage, event)}
            onDragLeave={(event) => onColumnDragLeave(column.stage, event)}
            onDrop={(event) => onColumnDrop(column.stage, event)}
            className={cn(
              // `relative`: o texto sr-only da contagem é absoluto e, sem um ancestral posicionado
              // dentro da rolagem, escaparia do clip e alargaria a página (rolagem horizontal).
              "relative flex w-[85vw] shrink-0 snap-center flex-col rounded-xl border border-border bg-surface-2 transition-opacity duration-120 md:w-64 md:snap-start",
              blocked && "opacity-50",
              over && "ring-2 ring-primary/40",
            )}
          >
            <header className="flex flex-col gap-0.5 px-3 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn("size-2 shrink-0 rounded-full", DOT_BY_TONE[tone])}
                />
                <h3 className="min-w-0 truncate text-sm font-semibold">{label}</h3>
                <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                  <span className="sr-only">
                    {column.total === 1 ? "1 lead" : `${column.total} leads`}
                  </span>
                  <span aria-hidden="true">{column.total}</span>
                </span>
              </div>
              {column.openAmount != null && column.openAmount > 0 ? (
                <p className="crm-meta tabular-nums">{formatBRL(column.openAmount)} em propostas</p>
              ) : null}
              {blocked ? <p className="crm-meta">{blockedHint}</p> : null}
            </header>
            <div className="flex flex-1 flex-col gap-2 p-2 pt-0 max-h-none md:max-h-[70vh] md:overflow-y-auto">
              {column.rows.length === 0 ? (
                <p className="crm-meta px-1 py-2">Nenhum lead em {label}.</p>
              ) : (
                column.rows.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    pipeline={pipeline}
                    now={now}
                    canDrag={canDrag}
                    dragging={dragging?.leadId === lead.id}
                    onMove={onMove}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                ))
              )}
              {column.total > column.rows.length ? (
                <Link
                  href={listHref}
                  className="px-1 py-1.5 text-sm text-primary underline-offset-2 hover:underline"
                >
                  ver todos os {column.total} em Lista ›
                </Link>
              ) : null}
            </div>
          </div>
        );
      })}

      {showLostZone ? (
        <div
          data-stage={terminal}
          data-drop-zone="terminal"
          onDragOver={(event) => onColumnDragOver(terminal, event)}
          onDragLeave={(event) => onColumnDragLeave(terminal, event)}
          onDrop={(event) => onColumnDrop(terminal, event)}
          className={cn(
            "sticky right-0 z-10 flex w-40 shrink-0 items-center justify-center self-stretch rounded-xl border-2 border-dashed border-border bg-surface-2 p-3 text-center text-sm font-medium text-destructive",
            lostZoneOver && "border-destructive ring-2 ring-destructive/30",
          )}
        >
          Marcar {stageLabel(terminal).toLowerCase()}
        </div>
      ) : null}
    </section>
  );
}
