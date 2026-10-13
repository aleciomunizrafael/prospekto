"use client";

import { useCallback, useMemo, useState, useSyncExternalStore, type DragEvent } from "react";
import { toast } from "sonner";
import type { LeadFilters } from "@/lib/crm/filters";
import { stageLabel } from "@/lib/crm/labels";
import { allowedStageMoves, isTerminalStage, type Pipeline } from "@/lib/domain/pipelines";
import type { LeadBoardColumn, LeadBoardRow } from "@/lib/repos/leads";
import { allowedTargets, LeadBoardColumns, type DragState } from "./lead-board-columns";
import { LeadBoardDialogs, type MoveRequest } from "./lead-board-dialogs";

// Quadro de leads (ADR-004, 6.3; plano, frente A): o único estado é o do arrasto, a coluna sob o
// ponteiro e o pedido de movimento aberto no diálogo. Arrastar e soltar HTML5 nativo, sem
// biblioteca (ADR-004, 6.11), que **nunca grava**: soltar numa coluna permitida abre o "Mover
// para" já no destino; numa bloqueada mostra um toast; fora do quadro, nada. O caminho por
// teclado e leitor de tela é o menu "Mover para" de cada cartão, que abre o mesmo diálogo. O
// arrasto é anunciado num `role="status"` e só é ligado depois da montagem com ponteiro fino (no
// celular, `draggable` fica falso e o menu é o caminho).

type User = { id: string; name: string };

// Ponteiro fino (mouse, trackpad) liga o arrasto. Antes de hidratar vale `false`: o HTML do
// servidor nasce com `draggable="false"` e a hidratação não diverge (mesmo padrão do CrmToaster).
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function LeadBoard({
  pipeline,
  columns,
  users,
  now,
  filters,
}: {
  pipeline: Pipeline;
  columns: LeadBoardColumn[];
  users: User[];
  // ISO do servidor: os planos de movimento e os prazos usam o mesmo instante na hidratação.
  now: string;
  filters: LeadFilters;
}) {
  const nowDate = useMemo(() => new Date(now), [now]);
  const canDrag = useMediaQuery("(pointer: fine)");
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [request, setRequest] = useState<MoveRequest | null>(null);

  const leadsById = useMemo(() => {
    const map = new Map<string, LeadBoardRow>();
    for (const column of columns) for (const lead of column.rows) map.set(lead.id, lead);
    return map;
  }, [columns]);

  const announcement = dragging
    ? `Arrastando ${dragging.name}. Solte em: ${allowedStageMoves(pipeline, dragging.stage)
        .map((m) => stageLabel(m.stage))
        .join(", ")}.`
    : "";

  function onMove(lead: LeadBoardRow, target: string) {
    setRequest({ lead, target });
  }

  function onDragStart(lead: LeadBoardRow, event: DragEvent<HTMLElement>) {
    // O Firefox não inicia o arrasto sem dado; o id não é dado pessoal.
    event.dataTransfer.setData("text/plain", lead.id);
    event.dataTransfer.effectAllowed = "move";
    setDragging({ leadId: lead.id, stage: lead.stage, name: lead.name });
  }

  function onDragEnd() {
    setDragging(null);
    setOverStage(null);
  }

  function onColumnDragOver(stage: string, event: DragEvent<HTMLElement>) {
    if (!dragging) return;
    // preventDefault em toda coluna (também nas bloqueadas) para o `drop` disparar e o toast
    // explicar o bloqueio.
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (overStage !== stage) setOverStage(stage);
  }

  function onColumnDragLeave(stage: string, event: DragEvent<HTMLElement>) {
    // Sair para um filho da própria coluna também dispara dragleave; só limpa ao sair de verdade.
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    if (overStage === stage) setOverStage(null);
  }

  function onColumnDrop(stage: string, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const current = dragging;
    setOverStage(null);
    setDragging(null);
    if (!current || stage === current.stage) return;
    const lead = leadsById.get(current.leadId);
    if (!lead) return;
    if (allowedTargets(pipeline, current)?.has(stage)) {
      setRequest({ lead, target: stage });
      return;
    }
    toast.info(
      `Não dá para mover direto para ${stageLabel(stage)}: ${
        isTerminalStage(pipeline, current.stage)
          ? "reative pelo Mover para"
          : "avance um estágio por vez"
      }.`,
    );
  }

  return (
    <>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
      <LeadBoardColumns
        pipeline={pipeline}
        columns={columns}
        now={nowDate}
        filters={filters}
        canDrag={canDrag}
        dragging={dragging}
        overStage={overStage}
        onMove={onMove}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onColumnDragOver={onColumnDragOver}
        onColumnDragLeave={onColumnDragLeave}
        onColumnDrop={onColumnDrop}
      />
      <LeadBoardDialogs
        request={request}
        onClose={() => setRequest(null)}
        pipeline={pipeline}
        users={users}
        now={now}
      />
    </>
  );
}
