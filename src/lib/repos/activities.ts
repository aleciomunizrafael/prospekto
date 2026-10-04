import "server-only";
import { and, desc, eq, getTableColumns, gte, isNull, lte, type SQL } from "drizzle-orm";
import { db, type Db } from "@/lib/db";
import { activities, leads } from "@/lib/db/schema";
import type { ActivityType } from "@/lib/domain/enums";
import { NotFoundError } from "@/lib/errors";
import { createActivitySchema, type CreateActivityInput } from "@/lib/validation/activities";
import type { Ctx } from "./ctx";

export type Activity = typeof activities.$inferSelect;

// Usada pelos outros repositórios dentro da mesma transação (mudança de estágio, dono, score).
export async function insertSystemActivity(
  tx: Db,
  ctx: Ctx,
  input: {
    subject: string;
    data: Record<string, unknown>;
    leadId?: string | null;
    orgId?: string | null;
    projectId?: string | null;
    contributionId?: string | null;
    type?: ActivityType;
    occurredAt?: Date;
  },
): Promise<Activity> {
  const [row] = await tx
    .insert(activities)
    .values({
      tenantId: ctx.tenantId,
      type: input.type ?? "sistema",
      subject: input.subject,
      data: input.data,
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      leadId: input.leadId ?? null,
      orgId: input.orgId ?? null,
      projectId: input.projectId ?? null,
      contributionId: input.contributionId ?? null,
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
      leadId: data.leadId ?? null,
      orgId: data.orgId ?? null,
      contactId: data.contactId ?? null,
      projectId: data.projectId ?? null,
      contributionId: data.contributionId ?? null,
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
    type?: ActivityType;
    limit?: number;
  } = {},
): Promise<Activity[]> {
  const where: SQL[] = [eq(activities.tenantId, ctx.tenantId)];
  if (filter.leadId) where.push(eq(activities.leadId, filter.leadId));
  if (filter.orgId) where.push(eq(activities.orgId, filter.orgId));
  if (filter.projectId) where.push(eq(activities.projectId, filter.projectId));
  if (filter.contributionId) where.push(eq(activities.contributionId, filter.contributionId));
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
    .orderBy(activities.dueAt);
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
  return db
    .select({ ...getTableColumns(activities), leadName: leads.name })
    .from(activities)
    .leftJoin(leads, eq(leads.id, activities.leadId))
    .where(and(...where))
    .orderBy(activities.dueAt)
    .limit(filter.limit ?? 50);
}

export async function getActivity(ctx: Ctx, activityId: string): Promise<Activity | null> {
  const [row] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, ctx.tenantId), eq(activities.id, activityId)));
  return row ?? null;
}
