import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  notInArray,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activities,
  contributions,
  culturalProjects,
  leads,
  organizations,
  simulations,
  tenants,
  users,
} from "@/lib/db/schema";
import type { DigestData } from "@/lib/crm/digest";
import { addCalendarDays, calendarDateInSaoPaulo } from "@/lib/crm/format";
import { TERMINAL_STAGES } from "@/lib/domain/pipelines";
import type { Ctx } from "./ctx";
import { listProjectAlerts } from "./projects";

// Consultas do e-mail diário e da tela "Hoje" (regra R-13; proposta-c-simplicidade.md, 9.3).
// Mesmas regras da tela "Hoje"; cada bloco limitado a `limit` linhas com a contagem total.

const NON_TERMINAL = [...new Set(Object.values(TERMINAL_STAGES))];
const INITIAL = ["novo", "lista_espera", "prospeccao"];
const DAY = 86_400_000;

export async function loadDigestData(
  ctx: Ctx,
  now: Date = new Date(),
  limit = 10,
): Promise<DigestData> {
  const tenant = eq(leads.tenantId, ctx.tenantId);
  const owner = sql<
    string | null
  >`(select ${users.name} from ${users} where ${users.id} = ${leads.ownerUserId})`;
  const organization = sql<
    string | null
  >`coalesce((select ${organizations.name} from ${organizations} where ${organizations.id} = ${leads.orgId}), ${leads.attributes} ->> 'empresa', ${leads.attributes} ->> 'escritorio', ${leads.attributes} ->> 'municipio', ${leads.attributes} ->> 'proponente')`;

  const overdueWhere = and(
    tenant,
    lt(leads.nextActionAt, now),
    notInArray(leads.stage, NON_TERMINAL),
  );
  const overdueLeads = await db
    .select({
      id: leads.id,
      name: leads.name,
      organization,
      pipeline: leads.pipeline,
      stage: leads.stage,
      nextActionAt: leads.nextActionAt,
      ownerName: owner,
    })
    .from(leads)
    .where(overdueWhere)
    .orderBy(asc(leads.nextActionAt))
    .limit(limit);
  const [{ overdueLeadsTotal }] = await db
    .select({ overdueLeadsTotal: sql<number>`count(*)::int` })
    .from(leads)
    .where(overdueWhere);

  const taskOwner = sql<
    string | null
  >`(select ${users.name} from ${users} where ${users.id} = ${activities.ownerUserId})`;
  const tasksWhere = and(
    eq(activities.tenantId, ctx.tenantId),
    eq(activities.type, "tarefa"),
    isNull(activities.doneAt),
    lt(activities.dueAt, now),
  );
  const tasks = await db
    .select({
      id: activities.id,
      subject: activities.subject,
      dueAt: activities.dueAt,
      leadId: activities.leadId,
      projectId: activities.projectId,
      ownerName: taskOwner,
    })
    .from(activities)
    .where(tasksWhere)
    .orderBy(asc(activities.dueAt))
    .limit(limit);
  const [{ tasksTotal }] = await db
    .select({ tasksTotal: sql<number>`count(*)::int` })
    .from(activities)
    .where(tasksWhere);

  const newWhere = and(tenant, inArray(leads.stage, INITIAL), isNull(leads.ownerUserId));
  const newLeads = await db
    .select({
      id: leads.id,
      name: leads.name,
      segment: leads.segment,
      source: leads.source,
      sourceDetail: leads.sourceDetail,
      city: leads.city,
      uf: leads.uf,
      temperature: leads.temperature,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(newWhere)
    .orderBy(desc(leads.createdAt))
    .limit(limit);
  const [{ newLeadsTotal }] = await db
    .select({ newLeadsTotal: sql<number>`count(*)::int` })
    .from(leads)
    .where(newWhere);

  const today = calendarDateInSaoPaulo(now);
  const in15 = addCalendarDays(today, 15);
  const contribWhere = and(
    eq(contributions.tenantId, ctx.tenantId),
    inArray(contributions.status, ["proposta", "termo_assinado"]),
    gte(contributions.expectedCloseAt, today),
    sql`${contributions.expectedCloseAt} <= ${in15}`,
  );
  const contribRows = await db
    .select({
      id: contributions.id,
      leadId: contributions.leadId,
      leadName: leads.name,
      projectName: culturalProjects.name,
      proposedAmount: contributions.proposedAmount,
      expectedCloseAt: contributions.expectedCloseAt,
      status: contributions.status,
    })
    .from(contributions)
    .innerJoin(leads, eq(leads.id, contributions.leadId))
    .innerJoin(culturalProjects, eq(culturalProjects.id, contributions.projectId))
    .where(contribWhere)
    .orderBy(asc(contributions.expectedCloseAt))
    .limit(limit);
  const [{ contributionsTotal }] = await db
    .select({ contributionsTotal: sql<number>`count(*)::int` })
    .from(contributions)
    .where(contribWhere);

  const projectAlerts = await listProjectAlerts(ctx, now);

  const since7 = new Date(now.getTime() - 7 * DAY);
  const since30 = new Date(now.getTime() - 30 * DAY);
  const since1 = new Date(now.getTime() - DAY);
  const bySource = await db
    .select({ source: leads.source, count: sql<number>`count(*)::int` })
    .from(leads)
    .where(and(tenant, gte(leads.createdAt, since7)))
    .groupBy(leads.source)
    .orderBy(desc(sql`count(*)`));
  const byCampaign = await db
    .select({ campaign: leads.utmCampaign, count: sql<number>`count(*)::int` })
    .from(leads)
    .where(and(tenant, gte(leads.createdAt, since7), isNotNull(leads.utmCampaign)))
    .groupBy(leads.utmCampaign)
    .orderBy(desc(sql`count(*)`));
  const [{ leadsLast24h }] = await db
    .select({ leadsLast24h: sql<number>`count(*)::int` })
    .from(leads)
    .where(and(tenant, gte(leads.createdAt, since1)));
  const [{ campaignLeads30d }] = await db
    .select({ campaignLeads30d: sql<number>`count(*)::int` })
    .from(leads)
    .where(and(tenant, gte(leads.createdAt, since30), isNotNull(leads.utmCampaign)));
  const [{ simulationsCount }] = await db
    .select({ simulationsCount: sql<number>`count(*)::int` })
    .from(simulations)
    .where(and(eq(simulations.tenantId, ctx.tenantId), gte(simulations.createdAt, since7)));
  const [{ guideDownloads }] = await db
    .select({ guideDownloads: sql<number>`count(*)::int` })
    .from(activities)
    .where(
      and(
        eq(activities.tenantId, ctx.tenantId),
        eq(activities.type, "download"),
        gte(activities.occurredAt, since7),
      ),
    );

  return {
    overdueLeads: overdueLeads.map((l) => ({ ...l, nextActionAt: l.nextActionAt as Date })),
    overdueLeadsTotal,
    tasks: tasks.map((t) => ({ ...t, dueAt: t.dueAt as Date })),
    tasksTotal,
    newLeads,
    newLeadsTotal,
    contributions: contribRows.map((c) => ({ ...c, proposedAmount: Number(c.proposedAmount) })),
    contributionsTotal,
    projects: projectAlerts.slice(0, limit).map((p) => ({
      id: p.id,
      name: p.name,
      proponentName: p.proponentName,
      fundraisingDeadline: p.fundraisingDeadline,
      approvedAmount: p.approvedAmount,
      raisedAmount: p.raisedAmount,
      balance: p.balance,
      raisedPercent: p.raisedPercent,
      reasons: p.alerts,
    })),
    projectsTotal: projectAlerts.length,
    week: {
      leadsTotal: bySource.reduce((acc, s) => acc + s.count, 0),
      bySource,
      byCampaign: byCampaign.map((c) => ({ campaign: c.campaign ?? "", count: c.count })),
      simulations: simulationsCount,
      guideDownloads,
      campaignActive: campaignLeads30d > 0,
      leadsLast24h,
    },
  };
}

// Idempotência do e-mail diário: `tenants.settings.daily_email_sent_on` (seção 9.3).
export async function getDigestSentOn(ctx: Ctx): Promise<string | null> {
  const [row] = await db
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId));
  const value = row?.settings?.daily_email_sent_on;
  return typeof value === "string" ? value : null;
}

export async function markDigestSent(ctx: Ctx, date: string): Promise<void> {
  await db
    .update(tenants)
    .set({
      settings: sql`${tenants.settings} || ${JSON.stringify({ daily_email_sent_on: date })}::jsonb`,
    })
    .where(eq(tenants.id, ctx.tenantId));
}
