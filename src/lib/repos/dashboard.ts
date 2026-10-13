import "server-only";
import { and, count, countDistinct, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contributions, culturalProjects } from "@/lib/db/schema";
import { addMonths } from "@/lib/crm/dates";
import { calendarDateInSaoPaulo } from "@/lib/crm/format";
import type { Ctx } from "./ctx";

// Régua "Carteira" do Painel (ADR-004, 6.8): quatro agregados calculados no banco, nunca em
// JavaScript sobre linhas carregadas. Datas de aporte são `date` (YYYY-MM-DD), comparadas no dia
// de calendário de São Paulo; "no ano" é o ano civil corrente nesse fuso.
export type PortfolioTotals = {
  // Organizações com aporte depositado ou com recibo nos últimos 12 meses.
  activeOrganizations: number;
  // Soma de proposed_amount em proposta e termo_assinado, e quantos são.
  openContributionsAmount: number;
  openContributionsCount: number;
  // Soma de deposited_amount com deposited_at dentro do ano civil, e quantos são.
  depositedYearAmount: number;
  depositedYearCount: number;
  // Projetos em captando.
  projectsFundraising: number;
};

const DEPOSITED_STATUSES = ["depositado", "recibo_emitido"] as const;
const OPEN_STATUSES = ["proposta", "termo_assinado"] as const;

const money = (expr: unknown) => sql<number>`coalesce(sum(${expr}), 0)::float8`;

export async function getPortfolioTotals(ctx: Ctx, now: Date): Promise<PortfolioTotals> {
  const today = calendarDateInSaoPaulo(now);
  const twelveMonthsAgo = calendarDateInSaoPaulo(addMonths(now, -12));
  const year = today.slice(0, 4);
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [[active], [open], [deposited], [fundraising]] = await Promise.all([
    db
      .select({ value: countDistinct(contributions.orgId) })
      .from(contributions)
      .where(
        and(
          eq(contributions.tenantId, ctx.tenantId),
          inArray(contributions.status, [...DEPOSITED_STATUSES]),
          isNotNull(contributions.orgId),
          gte(contributions.depositedAt, twelveMonthsAgo),
        ),
      ),
    db
      .select({ amount: money(contributions.proposedAmount), total: count() })
      .from(contributions)
      .where(
        and(
          eq(contributions.tenantId, ctx.tenantId),
          inArray(contributions.status, [...OPEN_STATUSES]),
        ),
      ),
    db
      .select({ amount: money(contributions.depositedAmount), total: count() })
      .from(contributions)
      .where(
        and(
          eq(contributions.tenantId, ctx.tenantId),
          inArray(contributions.status, [...DEPOSITED_STATUSES]),
          gte(contributions.depositedAt, yearStart),
          lte(contributions.depositedAt, yearEnd),
        ),
      ),
    db
      .select({ value: count() })
      .from(culturalProjects)
      .where(
        and(eq(culturalProjects.tenantId, ctx.tenantId), eq(culturalProjects.stage, "captando")),
      ),
  ]);

  return {
    activeOrganizations: Number(active?.value ?? 0),
    openContributionsAmount: Number(open?.amount ?? 0),
    openContributionsCount: Number(open?.total ?? 0),
    depositedYearAmount: Number(deposited?.amount ?? 0),
    depositedYearCount: Number(deposited?.total ?? 0),
    projectsFundraising: Number(fundraising?.value ?? 0),
  };
}
