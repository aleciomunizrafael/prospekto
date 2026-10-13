// Rótulos compartilhados entre as telas de leads (labels.ts) e as de organizações, projetos e
// aportes (enum-labels.ts): uma única fonte, para o mesmo enum não ter dois textos.
import { describe, expect, it } from "vitest";
import * as enumLabels from "@/lib/crm/enum-labels";
import * as labels from "@/lib/crm/labels";
import { TASK_STATUSES } from "@/lib/crm/task-status";
import {
  DISCARD_REASONS,
  LEAD_SOURCES,
  PROSPECTING_STATUSES,
  TASK_PRIORITIES,
} from "@/lib/domain/enums";

describe("rótulos do CRM", () => {
  it("enum-labels reexporta os mapas de labels (mesma referência)", () => {
    expect(Object.is(enumLabels.SEGMENT_LABELS, labels.SEGMENT_LABELS)).toBe(true);
    expect(Object.is(enumLabels.LOST_REASON_LABELS, labels.LOST_REASON_LABELS)).toBe(true);
    expect(Object.is(enumLabels.PIPELINE_LABELS, labels.PIPELINE_LABELS)).toBe(true);
    expect(Object.is(enumLabels.STAGE_LABELS, labels.STAGE_LABELS)).toBe(true);
    expect(enumLabels.stageLabel).toBe(labels.stageLabel);
    expect(labels.SEGMENT_LABELS.PF).toBe("Pessoa física");
    expect(labels.LOST_REASON_LABELS.outro).toBe("Outro");
  });

  it("origem, prospecção, prioridade e status de tarefa cobrem todos os valores dos enums", () => {
    for (const source of LEAD_SOURCES) expect(labels.SOURCE_LABELS[source]).toBeTruthy();
    expect(labels.SOURCE_LABELS.prospeccao).toBe("Prospecção");
    for (const status of PROSPECTING_STATUSES) {
      expect(labels.PROSPECTING_STATUS_LABELS[status]).toBeTruthy();
    }
    expect(labels.PROSPECTING_STATUS_LABELS.reuniao_marcada).toBe("Reunião marcada");
    for (const reason of DISCARD_REASONS) expect(labels.DISCARD_REASON_LABELS[reason]).toBeTruthy();
    for (const priority of TASK_PRIORITIES) {
      expect(labels.TASK_PRIORITY_LABELS[priority]).toBeTruthy();
    }
    expect(labels.TASK_PRIORITY_LABELS.media).toBe("Média");
    for (const status of TASK_STATUSES) expect(labels.TASK_STATUS_LABELS[status]).toBeTruthy();
    expect(labels.TASK_STATUS_LABELS.em_andamento).toBe("Em andamento");
  });
});
