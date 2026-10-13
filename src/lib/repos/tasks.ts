import "server-only";
import {
  aliasedTable,
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
import { db, type Db } from "@/lib/db";
import {
  activities,
  contributions,
  culturalProjects,
  leads,
  organizations,
  users,
} from "@/lib/db/schema";
import { dayBounds, formatBRL } from "@/lib/crm/format";
import { TASK_STATUSES, taskStatusOf, type TaskStatus } from "@/lib/crm/task-status";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  createTaskSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "@/lib/validation/tasks";
import { insertSystemActivity, nextTaskPositionSql, type Activity } from "./activities";
import type { Ctx } from "./ctx";

// Quadro de Tarefas (ADR-004, 6.5; plano, P2, P3, P16): tarefas são activities.type = 'tarefa';
// o estado é derivado de started_at e done_at (taskStatusOf), nunca gravado; a posição é
// fracionária e calculada dentro da transação. Toda consulta filtra por tenant e todo leftJoin
// restringe o tenant na própria condição (regra 11).

export type TaskRow = Activity & {
  leadName: string | null;
  orgName: string | null;
  projectName: string | null;
  contributionLabel: string | null;
  ownerName: string | null;
};

export type TaskBoard = Record<TaskStatus, { rows: TaskRow[]; total: number }>;

// Teto por coluna (plano, P13).
const OPEN_COLUMN_LIMIT = 100;
const DONE_COLUMN_LIMIT = 20;

// Renumeração quando a distância entre vizinhos cai abaixo disto (ADR-004, 6.4.3).
const MIN_GAP = 1e-6;

const contributionProject = aliasedTable(culturalProjects, "contribution_project");

const taskSelect = {
  ...getTableColumns(activities),
  leadName: leads.name,
  orgName: organizations.name,
  projectName: culturalProjects.name,
  contributionAmount: contributions.proposedAmount,
  contributionProjectName: contributionProject.name,
  ownerName: users.name,
};

type RawTaskRow = Omit<TaskRow, "contributionLabel"> & {
  contributionAmount: number | null;
  contributionProjectName: string | null;
};

function toTaskRow(r: RawTaskRow): TaskRow {
  const { contributionAmount, contributionProjectName, ...rest } = r;
  const contributionLabel =
    rest.contributionId && contributionProjectName
      ? `${formatBRL(contributionAmount ?? 0)} em ${contributionProjectName}`
      : null;
  return { ...rest, contributionLabel };
}

function taskQuery(dbx: Db) {
  return dbx
    .select(taskSelect)
    .from(activities)
    .leftJoin(leads, and(eq(leads.id, activities.leadId), eq(leads.tenantId, activities.tenantId)))
    .leftJoin(
      organizations,
      and(eq(organizations.id, activities.orgId), eq(organizations.tenantId, activities.tenantId)),
    )
    .leftJoin(
      culturalProjects,
      and(
        eq(culturalProjects.id, activities.projectId),
        eq(culturalProjects.tenantId, activities.tenantId),
      ),
    )
    .leftJoin(
      contributions,
      and(
        eq(contributions.id, activities.contributionId),
        eq(contributions.tenantId, activities.tenantId),
      ),
    )
    .leftJoin(
      contributionProject,
      and(
        eq(contributionProject.id, contributions.projectId),
        eq(contributionProject.tenantId, activities.tenantId),
      ),
    )
    .leftJoin(
      users,
      and(eq(users.id, activities.ownerUserId), eq(users.tenantId, activities.tenantId)),
    );
}

function taskScope(ctx: Ctx): SQL[] {
  return [eq(activities.tenantId, ctx.tenantId), eq(activities.type, "tarefa")];
}

// Condição SQL do estado derivado (a mesma regra de taskStatusOf).
function statusCondition(status: TaskStatus): SQL {
  switch (status) {
    case "a_fazer":
      return and(isNull(activities.doneAt), isNull(activities.startedAt))!;
    case "em_andamento":
      return and(isNull(activities.doneAt), isNotNull(activities.startedAt))!;
    case "concluida":
      return isNotNull(activities.doneAt);
  }
}

// Ordem de leitura das colunas abertas (plano, P3); a concluída mostra as mais recentes.
function columnOrder(status: TaskStatus): SQL[] {
  return status === "concluida"
    ? [desc(activities.doneAt), asc(activities.position), asc(activities.createdAt)]
    : [asc(activities.position), asc(activities.createdAt)];
}

export async function listTasksBoard(
  ctx: Ctx,
  input: { now: Date; ownerUserId?: string; overdueOnly?: boolean; dueToday?: boolean },
): Promise<TaskBoard> {
  const base = taskScope(ctx);
  if (input.ownerUserId) base.push(eq(activities.ownerUserId, input.ownerUserId));
  // Recortes de prazo só nas colunas abertas: `overdueOnly` é due_at < agora; `dueToday` é
  // due_at <= fim de hoje em São Paulo (o número do medidor "Tarefas hoje").
  const due: SQL[] = [];
  if (input.overdueOnly) due.push(lt(activities.dueAt, input.now));
  if (input.dueToday) due.push(lte(activities.dueAt, dayBounds(input.now).end));

  const column = async (status: TaskStatus) => {
    const open = status !== "concluida";
    const where = and(...base, statusCondition(status), ...(open ? due : []));
    const [rows, [{ total }]] = await Promise.all([
      taskQuery(db)
        .where(where)
        .orderBy(...columnOrder(status))
        .limit(open ? OPEN_COLUMN_LIMIT : DONE_COLUMN_LIMIT),
      db.select({ total: count() }).from(activities).where(where),
    ]);
    return { rows: rows.map(toTaskRow), total: Number(total) };
  };

  const [aFazer, emAndamento, concluida] = await Promise.all(TASK_STATUSES.map(column));
  return { a_fazer: aFazer, em_andamento: emAndamento, concluida };
}

// Contagem de atrasadas do cabeçalho do quadro: um único count sobre as abertas (done_at nulo =
// A fazer ∪ Em andamento) com due_at < agora, sem carregar as linhas (que param no teto, P13).
export async function countOverdueOpenTasks(
  ctx: Ctx,
  input: { now: Date; ownerUserId?: string },
): Promise<number> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(activities)
    .where(
      and(
        ...taskScope(ctx),
        isNull(activities.doneAt),
        lt(activities.dueAt, input.now),
        ...(input.ownerUserId ? [eq(activities.ownerUserId, input.ownerUserId)] : []),
      ),
    );
  return Number(total);
}

export async function getTask(ctx: Ctx, activityId: string): Promise<TaskRow | null> {
  const [row] = await taskQuery(db).where(and(...taskScope(ctx), eq(activities.id, activityId)));
  return row ? toTaskRow(row) : null;
}

// Vínculos de uma tarefa precisam pertencer ao tenant.
async function assertTaskReferences(
  tx: Db,
  ctx: Ctx,
  data: {
    leadId?: string | null;
    orgId?: string | null;
    projectId?: string | null;
    contributionId?: string | null;
    ownerUserId?: string | null;
  },
): Promise<void> {
  const checks: [string | null | undefined, () => Promise<unknown[]>, string][] = [
    [
      data.leadId,
      () =>
        tx
          .select({ id: leads.id })
          .from(leads)
          .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.id, data.leadId!))),
      "Lead",
    ],
    [
      data.orgId,
      () =>
        tx
          .select({ id: organizations.id })
          .from(organizations)
          .where(and(eq(organizations.tenantId, ctx.tenantId), eq(organizations.id, data.orgId!))),
      "Organização",
    ],
    [
      data.projectId,
      () =>
        tx
          .select({ id: culturalProjects.id })
          .from(culturalProjects)
          .where(
            and(
              eq(culturalProjects.tenantId, ctx.tenantId),
              eq(culturalProjects.id, data.projectId!),
            ),
          ),
      "Projeto",
    ],
    [
      data.contributionId,
      () =>
        tx
          .select({ id: contributions.id })
          .from(contributions)
          .where(
            and(
              eq(contributions.tenantId, ctx.tenantId),
              eq(contributions.id, data.contributionId!),
            ),
          ),
      "Aporte",
    ],
  ];
  for (const [id, query, entity] of checks) {
    if (!id) continue;
    const [row] = await query();
    if (!row) throw new NotFoundError(entity, id);
  }
  if (data.ownerUserId) {
    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, ctx.tenantId), eq(users.id, data.ownerUserId)));
    if (!user) throw new ValidationError("O responsável informado não é usuário deste tenant.");
  }
}

// Campos de estado para um status de destino (ADR-004, 6.5): A fazer limpa os dois; Em andamento
// grava started_at = coalesce(started_at, agora) e limpa done_at; Concluída grava
// done_at = coalesce(done_at, agora) e mantém started_at. O coalesce de done_at é o que preserva a
// data real de conclusão quando a tarefa já concluída é reposicionada na própria coluna (ela
// alimenta a ordem da coluna, "as 20 mais recentes" e a exportação); vindo de coluna aberta,
// done_at é nulo e recebe o agora.
function statusPatch(
  status: TaskStatus,
  current: { startedAt: Date | null; doneAt: Date | null },
  now: Date,
): { startedAt: Date | null; doneAt: Date | null } {
  switch (status) {
    case "a_fazer":
      return { startedAt: null, doneAt: null };
    case "em_andamento":
      return { startedAt: current.startedAt ?? now, doneAt: null };
    case "concluida":
      return { startedAt: current.startedAt, doneAt: current.doneAt ?? now };
  }
}

export async function createTask(ctx: Ctx, input: CreateTaskInput): Promise<Activity> {
  const data = createTaskSchema.parse(input);
  const now = new Date();
  return db.transaction(async (tx) => {
    await assertTaskReferences(tx, ctx, data);
    const [row] = await tx
      .insert(activities)
      .values({
        tenantId: ctx.tenantId,
        type: "tarefa",
        subject: data.subject,
        body: data.body || null,
        occurredAt: now,
        dueAt: data.dueAt ?? null,
        ...statusPatch(data.status as TaskStatus, { startedAt: null, doneAt: null }, now),
        priority: data.priority ?? "media",
        position: nextTaskPositionSql(ctx),
        leadId: data.leadId ?? null,
        orgId: data.orgId ?? null,
        projectId: data.projectId ?? null,
        contributionId: data.contributionId ?? null,
        // undefined = usuário da sessão; null = "Ninguém" (plano, P6).
        ownerUserId: data.ownerUserId === undefined ? (ctx.userId ?? null) : data.ownerUserId,
        createdByUserId: ctx.userId ?? null,
      })
      .returning();
    return row;
  });
}

async function requireTask(tx: Db, ctx: Ctx, activityId: string): Promise<Activity> {
  const [row] = await tx
    .select()
    .from(activities)
    .where(and(...taskScope(ctx), eq(activities.id, activityId)));
  if (!row) throw new NotFoundError("Tarefa", activityId);
  return row;
}

export async function updateTask(ctx: Ctx, input: UpdateTaskInput): Promise<Activity> {
  const { activityId, status, ...data } = updateTaskSchema.parse(input);
  return db.transaction(async (tx) => {
    const current = await requireTask(tx, ctx, activityId);
    await assertTaskReferences(tx, ctx, data);
    const patch: Partial<typeof activities.$inferInsert> = {};
    if (data.subject !== undefined) patch.subject = data.subject;
    if (data.body !== undefined) patch.body = data.body || null;
    if (data.ownerUserId !== undefined) patch.ownerUserId = data.ownerUserId;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.dueAt !== undefined) patch.dueAt = data.dueAt;
    // Trocar o vínculo: só um preenchido; os demais são limpos quando um novo é informado.
    const linkGiven =
      data.leadId || data.orgId || data.projectId || data.contributionId ? true : false;
    if (linkGiven) {
      patch.leadId = data.leadId ?? null;
      patch.orgId = data.orgId ?? null;
      patch.projectId = data.projectId ?? null;
      patch.contributionId = data.contributionId ?? null;
    } else {
      if (data.leadId === null) patch.leadId = null;
      if (data.orgId === null) patch.orgId = null;
      if (data.projectId === null) patch.projectId = null;
      if (data.contributionId === null) patch.contributionId = null;
    }
    if (status !== undefined && status !== taskStatusOf(current)) {
      Object.assign(patch, statusPatch(status as TaskStatus, current, new Date()));
    }
    if (Object.keys(patch).length === 0) return current;
    const [row] = await tx
      .update(activities)
      .set(patch)
      .where(and(...taskScope(ctx), eq(activities.id, current.id)))
      .returning();
    return row;
  });
}

// Índice na coluna inteira (já sem a tarefa movida) a partir das âncoras que o quadro manda:
// logo antes de `afterId`; senão logo depois de `beforeId`; senão o `index` (diálogo, ou âncora
// movida/excluída no meio-tempo). O quadro manda âncoras porque, com filtro ativo, o índice que
// ele vê é o de um recorte da coluna.
function anchoredIndex(
  neighbors: readonly { id: string }[],
  anchors: { beforeId?: string; afterId?: string },
  index: number,
): number {
  if (anchors.afterId) {
    const after = neighbors.findIndex((n) => n.id === anchors.afterId);
    if (after !== -1) return after;
  }
  if (anchors.beforeId) {
    const before = neighbors.findIndex((n) => n.id === anchors.beforeId);
    if (before !== -1) return before + 1;
  }
  return Math.min(index, neighbors.length);
}

// Move entre colunas e/ou reposiciona (plano, P3): relê a coluna de destino inteira sem a tarefa
// movida, escolhe o índice pelas âncoras (anchoredIndex), posição = média entre os vizinhos no
// índice (ou last + 1 / first - 1), renumera 1..n quando a distância cai abaixo de 1e-6. Tudo com
// `tx` (regra 12).
export async function moveTask(
  ctx: Ctx,
  input: {
    activityId: string;
    status: TaskStatus;
    index: number;
    beforeId?: string;
    afterId?: string;
    now?: Date;
  },
): Promise<Activity> {
  if (!TASK_STATUSES.includes(input.status)) throw new ValidationError("Status inválido.");
  const index = Math.max(0, Math.floor(input.index));
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    const current = await requireTask(tx, ctx, input.activityId);
    const neighbors = await tx
      .select({ id: activities.id, position: activities.position })
      .from(activities)
      .where(and(...taskScope(ctx), statusCondition(input.status), ne(activities.id, current.id)))
      .orderBy(asc(activities.position), asc(activities.createdAt));

    const at = anchoredIndex(neighbors, input, index);
    const before = at > 0 ? neighbors[at - 1].position : null;
    const after = at < neighbors.length ? neighbors[at].position : null;
    let position: number;
    if (before === null && after === null) position = 1;
    else if (before === null) position = (after as number) - 1;
    else if (after === null) position = before + 1;
    else position = (before + after) / 2;

    const tooClose =
      (before !== null && Math.abs(position - before) < MIN_GAP) ||
      (after !== null && Math.abs(after - position) < MIN_GAP);
    if (tooClose) {
      // Renumera a coluna inteira 1..n com a tarefa movida no índice pedido.
      const ordered = [...neighbors.slice(0, at), { id: current.id }, ...neighbors.slice(at)];
      for (const [i, row] of ordered.entries()) {
        if (row.id === current.id) continue;
        await tx
          .update(activities)
          .set({ position: i + 1 })
          .where(and(...taskScope(ctx), eq(activities.id, row.id)));
      }
      position = at + 1;
    }

    const [row] = await tx
      .update(activities)
      .set({ position, ...statusPatch(input.status, current, now) })
      .where(and(...taskScope(ctx), eq(activities.id, current.id)))
      .returning();
    return row;
  });
}

// Só `type = tarefa` do tenant. Quando a tarefa tem vínculo, grava antes uma activities.sistema
// "Tarefa excluída: {assunto}" no mesmo registro (auditoria mínima; ADR-004, 6.5).
export async function deleteTask(ctx: Ctx, activityId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const task = await requireTask(tx, ctx, activityId);
    if (task.leadId || task.orgId || task.projectId || task.contributionId) {
      await insertSystemActivity(tx, ctx, {
        subject: `Tarefa excluída: ${task.subject}`,
        data: { reason: "task_deleted", activityId: task.id, dueAt: task.dueAt ?? null },
        leadId: task.leadId,
        orgId: task.orgId,
        projectId: task.projectId,
        contributionId: task.contributionId,
      });
    }
    await tx.delete(activities).where(and(...taskScope(ctx), eq(activities.id, task.id)));
  });
}

// "Minhas tarefas" do Painel (ADR-004, 6.8): abertas do dono, por vencimento, nulos por último.
export async function listOpenTasksForOwner(
  ctx: Ctx,
  input: { ownerUserId: string; now: Date; limit?: number },
): Promise<TaskRow[]> {
  const rows = await taskQuery(db)
    .where(
      and(
        ...taskScope(ctx),
        isNull(activities.doneAt),
        eq(activities.ownerUserId, input.ownerUserId),
      ),
    )
    .orderBy(sql`${activities.dueAt} asc nulls last`, asc(activities.position))
    .limit(Math.min(Math.max(input.limit ?? 8, 1), 50));
  return rows.map(toTaskRow);
}

// Paleta Ctrl+K: assunto por ilike, abertas primeiro (plano, P11).
export async function searchTasks(
  ctx: Ctx,
  input: { search: string; limit?: number },
): Promise<TaskRow[]> {
  const term = `%${input.search.replace(/[%_]/g, "")}%`;
  const rows = await taskQuery(db)
    .where(and(...taskScope(ctx), ilike(activities.subject, term)))
    .orderBy(
      sql`case when ${activities.doneAt} is null then 0 else 1 end`,
      sql`${activities.dueAt} asc nulls last`,
      desc(activities.createdAt),
    )
    .limit(Math.min(Math.max(input.limit ?? 5, 1), 50));
  return rows.map(toTaskRow);
}
