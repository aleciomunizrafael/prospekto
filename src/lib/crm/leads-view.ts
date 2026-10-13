// Alternância Lista/Quadro de /app/leads (ADR-004, 6.2; plano, P4). Precedência: `?view=` válido
// na URL vence; cookie válido vence; sem nenhum dos dois é a primeira visita ("ambas"): a página
// renderiza as duas visões por breakpoint e o cliente grava o cookie em silêncio. Puro; testado em
// tests/lib/leads-view.test.ts.
export const LEADS_VIEW_COOKIE = "crm-leads-view";

export type LeadsView = "lista" | "quadro";
// "ambas" = primeira visita (sem parâmetro e sem cookie).
export type LeadsViewResolution = LeadsView | "ambas";

export const LEADS_VIEWS: readonly LeadsView[] = ["lista", "quadro"];

export function isLeadsView(value: unknown): value is LeadsView {
  return value === "lista" || value === "quadro";
}

export function resolveLeadsView(
  param: string | undefined,
  cookie: string | undefined,
): LeadsViewResolution {
  if (isLeadsView(param)) return param;
  if (isLeadsView(cookie)) return cookie;
  return "ambas";
}
