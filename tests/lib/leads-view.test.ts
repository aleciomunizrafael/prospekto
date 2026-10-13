// Alternância Lista/Quadro (ADR-004, 6.2; plano, P4): parâmetro válido vence; cookie válido vence;
// sem nenhum dos dois é a primeira visita ("ambas"); valores inválidos são ignorados.
import { describe, expect, it } from "vitest";
import { LEADS_VIEW_COOKIE, isLeadsView, resolveLeadsView } from "@/lib/crm/leads-view";

describe("resolveLeadsView", () => {
  it.each([
    ["quadro", "lista", "quadro"],
    ["lista", "quadro", "lista"],
    [undefined, "lista", "lista"],
    [undefined, "quadro", "quadro"],
    [undefined, undefined, "ambas"],
    ["tabela", undefined, "ambas"],
    ["", "", "ambas"],
    ["kanban", "lista", "lista"],
    ["quadro", "errado", "quadro"],
    ["QUADRO", undefined, "ambas"],
  ] as const)("param=%s cookie=%s → %s", (param, cookie, expected) => {
    expect(resolveLeadsView(param, cookie)).toBe(expected);
  });

  it("isLeadsView aceita só lista e quadro", () => {
    expect(isLeadsView("lista")).toBe(true);
    expect(isLeadsView("quadro")).toBe(true);
    expect(isLeadsView("ambas")).toBe(false);
    expect(isLeadsView(null)).toBe(false);
  });

  it("o nome do cookie é o do ADR", () => {
    expect(LEADS_VIEW_COOKIE).toBe("crm-leads-view");
  });
});
