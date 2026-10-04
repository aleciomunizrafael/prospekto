// Rótulos compartilhados entre as telas de leads (labels.ts) e as de organizações, projetos e
// aportes (enum-labels.ts): uma única fonte, para o mesmo enum não ter dois textos.
import { describe, expect, it } from "vitest";
import * as enumLabels from "@/lib/crm/enum-labels";
import * as labels from "@/lib/crm/labels";

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
});
