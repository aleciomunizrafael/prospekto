import "server-only";
import {
  and,
  desc,
  eq,
  getTableColumns,
  gte,
  isNull,
  lte,
  notInArray,
  sql,
  type SQL,
} from "drizzle-orm";
import { db, type Db } from "@/lib/db";
import {
  activities,
  culturalProjects,
  leads,
  organizations,
  prospectingItems,
  users,
} from "@/lib/db/schema";
import type { ActivityType, TaskPriority } from "@/lib/domain/enums";
import { NotFoundError } from "@/lib/errors";
import { createActivitySchema, type CreateActivityInput } from "@/lib/validation/activities";
import type { Ctx } from "./ctx";

export type Activity = typeof activities.$inferSelect;

// Posição da próxima tarefa do tenant: max(position) + 1 das tarefas abertas, calculada no banco
// (plano da estrutura, P16). Toda inserção de `tarefa` passa por aqui (createActivity,
// insertSystemActivity, recordLeadActivity em leads.ts e createTask em tasks.ts), para a tarefa
// criada no lead entrar no fim de "A fazer", como a criada no quadro, e não empilhada em 0.
export function nextTaskPositionSql(ctx: Ctx): SQL<number> {
  return sql<number>`(select coalesce(max(${activities.position}), 0) + 1 from ${activities} where ${activities.tenantId} = ${ctx.tenantId} and ${activities.type} = 'tarefa' and ${activities.doneAt} is null)`;
}

// Prioridade e posição só existem em `tarefa`; ligações, notas e e-mails ficam nulas/0.
function taskColumns(
  ctx: Ctx,
  type: ActivityType,
  input: { priority?: TaskPriority | null; position?: number | null },
): { priority: TaskPriority | null; position: number | SQL<number> } {
  if (type !== "tarefa") return { priority: null, position: 0 };
  return {
    priority: input.priority ?? "media",
    position: input.position ?? nextTaskPositionSql(ctx),
  };
}

// Usada pelos outros repositórios dentro da mesma transação (mudança de estágio, dono, score).
export async function insertSystemActivity(
  tx: Db,
  ctx: Ctx,
  input: {
    subject: string;
    data: Record<string, unknown>;
    body?: string | null;
    leadId?: string | null;
    orgId?: string | null;
    projectId?: string | null;
    contributionId?: string | null;
    prospectingItemId?: string | null;
    type?: ActivityType;
    occurredAt?: Date;
    dueAt?: Date | null;
    startedAt?: Date | null;
    priority?: TaskPriority | null;
    position?: number | null;
    ownerUserId?: string | null;
  },
): Promise<Activity> {
  const type = input.type ?? "sistema";
  const [row] = await tx
    .insert(activities)
    .values({
      tenantId: ctx.tenantId,
      type,
      subject: input.subject,
      body: input.body ?? null,
      data: input.data,
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      dueAt: input.dueAt ?? null,
      startedAt: input.startedAt ?? null,
      ...taskColumns(ctx, type, input),
      leadId: input.leadId ?? null,
      orgId: input.orgId ?? null,
      projectId: input.projectId ?? null,
      contributionId: input.contributionId ?? null,
      prospectingItemId: input.prospectingItemId ?? null,
      ownerUserId: input.ownerUserId ?? null,
      createdByUserId: ctx.userId ?? null,
    })
    .returning();
  return row;
}

export async function createActivity(ctx: Ctx, input: CreateActivityInput): Promise<Activity> {
  const data = createActivitySchema.parse(input);
  const [row] = await db
    .insert(activities)
    .values({
      tenantId: ctx.tenantId,
      type: data.type,
      subject: data.subject,
      body: data.body ?? null,
      data: data.data ?? null,
      occurredAt: data.occurredAt ?? new Date(),
      dueAt: data.dueAt ?? null,
      doneAt: data.doneAt ?? null,
      startedAt: data.startedAt ?? null,
      ...taskColumns(ctx, data.type, data),
      leadId: data.leadId ?? null,
      orgId: data.orgId ?? null,
      contactId: data.contactId ?? null,
      projectId: data.projectId ?? null,
      contributionId: data.contributionId ?? null,
      prospectingItemId: data.prospectingItemId ?? null,
      ownerUserId: data.ownerUserId ?? ctx.userId ?? null,
      createdByUserId: ctx.userId ?? null,
    })
    .returning();
  return row;
}

export async function listActivities(
  ctx: Ctx,
  filter: {
    leadId?: string;
    orgId?: string;
    projectId?: string;
    contributionId?: string;
    prospectingItemId?: string;
    type?: ActivityType;
    limit?: number;
  } = {},
): Promise<Activity[]> {
  const where: SQL[] = [eq(activities.tenantId, ctx.tenantId)];
  if (filter.leadId) where.push(eq(activities.leadId, filter.leadId));
  if (filter.orgId) where.push(eq(activities.orgId, filter.orgId));
  if (filter.projectId) where.push(eq(activities.projectId, filter.projectId));
  if (filter.contributionId) where.push(eq(activities.contributionId, filter.contributionId));
  if (filter.prospectingItemId)
    where.push(eq(activities.prospectingItemId, filter.prospectingItemId));
  if (filter.type) where.push(eq(activities.type, filter.type));
  return db
    .select()
    .from(activities)
    .where(and(...where))
    .orderBy(desc(activities.occurredAt))
    .limit(filter.limit ?? 200);
}

// Tarefas abertas (tela "Hoje" e e-mail diário; regra R-13).
export async function listOpenTasks(
  ctx: Ctx,
  filter: { dueBefore?: Date; ownerUserId?: string } = {},
): Promise<Activity[]> {
  const where: SQL[] = [
    eq(activities.tenantId, ctx.tenantId),
    eq(activities.type, "tarefa"),
    isNull(activities.doneAt),
  ];
  if (filter.dueBefore) where.push(lte(activities.dueAt, filter.dueBefore));
  if (filter.ownerUserId) where.push(eq(activities.ownerUserId, filter.ownerUserId));
  return db
    .select()
    .from(activities)
    .where(and(...where))
    .orderBy(sql`${activities.dueAt} asc nulls last`, activities.createdAt);
}

export async function completeTask(
  ctx: Ctx,
  activityId: string,
  doneAt = new Date(),
): Promise<Activity> {
  const [row] = await db
    .update(activities)
    .set({ doneAt })
    .where(and(eq(activities.tenantId, ctx.tenantId), eq(activities.id, activityId)))
    .returning();
  if (!row) throw new NotFoundError("Atividade", activityId);
  return row;
}

// Tarefas abertas com o nome do lead, por período de vencimento (tela "Hoje": vencidas, de hoje
// e dos próximos 7 dias; regra R-13).
export type TaskRow = Activity & { leadName: string | null };

export async function listOpenTasksWithLead(
  ctx: Ctx,
  filter: { dueFrom?: Date; dueTo?: Date; limit?: number } = {},
): Promise<TaskRow[]> {
  const where: SQL[] = [
    eq(activities.tenantId, ctx.tenantId),
    eq(activities.type, "tarefa"),
    isNull(activities.doneAt),
  ];
  if (filter.dueFrom) where.push(gte(activities.dueAt, filter.dueFrom));
  if (filter.dueTo) where.push(lte(activities.dueAt, filter.dueTo));
  return (
    db
      .select({ ...getTableColumns(activities), leadName: leads.name })
      .from(activities)
      // Tenant na condição do join (plano, regra 11): um lead_id de outro tenant não devolve nome.
      .leftJoin(leads, and(eq(leads.id, activities.leadId), eq(leads.tenantId, ctx.tenantId)))
      .where(and(...where))
      .orderBy(activities.dueAt)
      .limit(filter.limit ?? 50)
  );
}

export async function getActivity(ctx: Ctx, activityId: string): Promise<Activity | null> {
  const [row] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, ctx.tenantId), eq(activities.id, activityId)));
  return row ?? null;
}

// "Últimas atividades" do Painel (ADR-004, 6.8): as mais recentes do tenant, exceto as de
// sistema, download e formulário, com autor e o registro a que se ligam. Todo join restrito ao
// tenant na condição (regra 11).
export type RecentActivity = Activity & {
  authorName: string | null;
  leadName: string | null;
  orgName: string | null;
  projectName: string | null;
  prospectingItemName: string | null;
  prospectingListId: string | null;
};

const RECENT_EXCLUDED: ActivityType[] = ["sistema", "download", "formulario"];

export async function listRecentActivities(
  ctx: Ctx,
  input: { limit?: number } = {},
): Promise<RecentActivity[]> {
  return db
    .select({
      ...getTableColumns(activities),
      authorName: users.name,
      leadName: leads.name,
      orgName: organizations.name,
      projectName: culturalProjects.name,
      prospectingItemName: prospectingItems.name,
      prospectingListId: prospectingItems.listId,
    })
    .from(activities)
    .leftJoin(
      users,
      and(eq(users.id, activities.createdByUserId), eq(users.tenantId, ctx.tenantId)),
    )
    .leftJoin(leads, and(eq(leads.id, activities.leadId), eq(leads.tenantId, ctx.tenantId)))
    .leftJoin(
      organizations,
      and(eq(organizations.id, activities.orgId), eq(organizations.tenantId, ctx.tenantId)),
    )
    .leftJoin(
      culturalProjects,
      and(
        eq(culturalProjects.id, activities.projectId),
        eq(culturalProjects.tenantId, ctx.tenantId),
      ),
    )
    .leftJoin(
      prospectingItems,
      and(
        eq(prospectingItems.id, activities.prospectingItemId),
        eq(prospectingItems.tenantId, ctx.tenantId),
      ),
    )
    .where(and(eq(activities.tenantId, ctx.tenantId), notInArray(activities.type, RECENT_EXCLUDED)))
    .orderBy(desc(activities.occurredAt), desc(activities.createdAt))
    .limit(Math.min(Math.max(input.limit ?? 8, 1), 50));
}
