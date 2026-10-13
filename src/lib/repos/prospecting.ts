import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
import { db, type Db } from "@/lib/db";
import { activities, prospectingItems, prospectingLists, users } from "@/lib/db/schema";
import { DISCARD_REASON_LABELS } from "@/lib/crm/labels";
import { PROSPECTING_STATUSES, type ProspectingStatus } from "@/lib/domain/enums";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  createListSchema,
  newItemSchema,
  updateItemSchema,
  updateListSchema,
  type CreateListInput,
  type NewItemInput,
  type UpdateItemInput,
  type UpdateListInput,
} from "@/lib/validation/prospecting";
import type { Ctx } from "./ctx";

// Módulo de Prospecção (ADR-004, 6.4.1, 6.4.2 e 6.6; plano, P6, P7, P15). Listas de empresas
// para ligar e itens (pré-lead). Toda consulta filtra por tenant; dentro de uma transação só
// existe `tx` (regra 12). A conversão "Reunião marcada" (convertProspectingItem) é da frente C.

export type ProspectingList = typeof prospectingLists.$inferSelect;
export type ProspectingItem = typeof prospectingItems.$inferSelect;
export type ProspectingListSummary = ProspectingList & {
  total: number;
  contacted: number;
  meetings: number;
  assigneeName: string | null;
};

function listScope(ctx: Ctx, listId: string) {
  return and(eq(prospectingLists.tenantId, ctx.tenantId), eq(prospectingLists.id, listId));
}

function itemScope(ctx: Ctx, itemId: string) {
  return and(eq(prospectingItems.tenantId, ctx.tenantId), eq(prospectingItems.id, itemId));
}

async function requireList(tx: Db, ctx: Ctx, listId: string): Promise<ProspectingList> {
  const [row] = await tx.select().from(prospectingLists).where(listScope(ctx, listId));
  if (!row) throw new NotFoundError("Lista de prospecção", listId);
  return row;
}

async function requireItem(tx: Db, ctx: Ctx, itemId: string): Promise<ProspectingItem> {
  const [row] = await tx.select().from(prospectingItems).where(itemScope(ctx, itemId));
  if (!row) throw new NotFoundError("Empresa de prospecção", itemId);
  return row;
}

// Quem liga tem de ser usuário deste tenant (mesma regra de assertTaskReferences em tasks.ts): a
// FK sozinha aceitaria um id de outro tenant e trocaria um id inexistente por erro de banco.
async function assertAssignee(tx: Db, ctx: Ctx, assigneeUserId: string): Promise<void> {
  const [user] = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tenantId, ctx.tenantId), eq(users.id, assigneeUserId)));
  if (!user) throw new ValidationError("O responsável informado não é usuário deste tenant.");
}

// ---------------------------------------------------------------------------------------------
// Listas

export async function createList(ctx: Ctx, input: CreateListInput): Promise<ProspectingList> {
  const data = createListSchema.parse(input);
  if (data.assigneeUserId) await assertAssignee(db, ctx, data.assigneeUserId);
  const [row] = await db
    .insert(prospectingLists)
    .values({
      tenantId: ctx.tenantId,
      name: data.name,
      region: data.region || null,
      notes: data.notes || null,
      sourceDetail: data.sourceDetail,
      assigneeUserId: data.assigneeUserId ?? null,
      createdByUserId: ctx.userId ?? null,
    })
    .returning();
  return row;
}

export async function updateList(ctx: Ctx, input: UpdateListInput): Promise<ProspectingList> {
  const { listId, ...data } = updateListSchema.parse(input);
  const patch: Partial<typeof prospectingLists.$inferInsert> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.region !== undefined) patch.region = data.region || null;
  if (data.notes !== undefined) patch.notes = data.notes || null;
  if (data.sourceDetail !== undefined) patch.sourceDetail = data.sourceDetail;
  if (data.assigneeUserId !== undefined) patch.assigneeUserId = data.assigneeUserId || null;
  if (patch.assigneeUserId) await assertAssignee(db, ctx, patch.assigneeUserId);
  const [row] = await db
    .update(prospectingLists)
    .set(patch)
    .where(listScope(ctx, listId))
    .returning();
  if (!row) throw new NotFoundError("Lista de prospecção", listId);
  return row;
}

// P15: a FK activities.prospecting_item_id não tem ON DELETE. Antes de apagar, as atividades dos
// itens sem lead morrem com o item (história pré-lead) e as que já têm lead_id só perdem a
// referência ao item (a história que viajou para o lead fica).
async function detachItemActivities(tx: Db, ctx: Ctx, itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return;
  await tx
    .delete(activities)
    .where(
      and(
        eq(activities.tenantId, ctx.tenantId),
        inArray(activities.prospectingItemId, itemIds),
        isNull(activities.leadId),
      ),
    );
  await tx
    .update(activities)
    .set({ prospectingItemId: null })
    .where(
      and(
        eq(activities.tenantId, ctx.tenantId),
        inArray(activities.prospectingItemId, itemIds),
        isNotNull(activities.leadId),
      ),
    );
}

export async function deleteList(ctx: Ctx, listId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const list = await requireList(tx, ctx, listId);
    const items = await tx
      .select({ id: prospectingItems.id })
      .from(prospectingItems)
      .where(
        and(eq(prospectingItems.tenantId, ctx.tenantId), eq(prospectingItems.listId, list.id)),
      );
    await detachItemActivities(
      tx,
      ctx,
      items.map((i) => i.id),
    );
    // ON DELETE CASCADE apaga os itens; leads e organizações criados ficam.
    await tx.delete(prospectingLists).where(listScope(ctx, list.id));
  });
}

const summaryColumns = {
  ...getTableColumns(prospectingLists),
  total: sql<number>`(select count(*)::int from ${prospectingItems} where ${prospectingItems.tenantId} = ${prospectingLists.tenantId} and ${prospectingItems.listId} = ${prospectingLists.id})`,
  contacted: sql<number>`(select count(*)::int from ${prospectingItems} where ${prospectingItems.tenantId} = ${prospectingLists.tenantId} and ${prospectingItems.listId} = ${prospectingLists.id} and ${prospectingItems.status} <> 'a_ligar')`,
  meetings: sql<number>`(select count(*)::int from ${prospectingItems} where ${prospectingItems.tenantId} = ${prospectingLists.tenantId} and ${prospectingItems.listId} = ${prospectingLists.id} and ${prospectingItems.status} = 'reuniao_marcada')`,
  assigneeName: users.name,
};

function assigneeJoin(ctx: Ctx) {
  return and(eq(users.id, prospectingLists.assigneeUserId), eq(users.tenantId, ctx.tenantId));
}

function toSummary(
  r: ProspectingList & {
    total: number;
    contacted: number;
    meetings: number;
    assigneeName: string | null;
  },
): ProspectingListSummary {
  return {
    ...r,
    total: Number(r.total),
    contacted: Number(r.contacted),
    meetings: Number(r.meetings),
    assigneeName: r.assigneeName ?? null,
  };
}

export async function getList(ctx: Ctx, listId: string): Promise<ProspectingListSummary | null> {
  const [row] = await db
    .select(summaryColumns)
    .from(prospectingLists)
    .leftJoin(users, assigneeJoin(ctx))
    .where(listScope(ctx, listId));
  return row ? toSummary(row) : null;
}

export async function listLists(ctx: Ctx): Promise<ProspectingListSummary[]> {
  const rows = await db
    .select(summaryColumns)
    .from(prospectingLists)
    .leftJoin(users, assigneeJoin(ctx))
    .where(eq(prospectingLists.tenantId, ctx.tenantId))
    .orderBy(desc(prospectingLists.createdAt))
    .limit(500);
  return rows.map(toSummary);
}

// ---------------------------------------------------------------------------------------------
// Itens

// Uma inserção com posição sequencial a partir de max(position); depois procura, no tenant,
// itens `descartado` de outras listas com o mesmo telefone E.164 e anota nos itens novos
// "Descartada em {lista} ({motivo})" (ADR-004, 6.6 e 8). Não é bloqueio: é aviso para quem liga.
export async function addItems(
  ctx: Ctx,
  input: { listId: string; items: NewItemInput[] },
): Promise<{ items: ProspectingItem[]; alreadyDiscarded: number }> {
  const parsed = input.items.map((i) => newItemSchema.parse(i));
  if (parsed.length === 0) {
    await requireList(db, ctx, input.listId);
    return { items: [], alreadyDiscarded: 0 };
  }
  return db.transaction(async (tx) => {
    const list = await requireList(tx, ctx, input.listId);
    const [{ max }] = await tx
      .select({ max: sql<number>`coalesce(max(${prospectingItems.position}), 0)::float8` })
      .from(prospectingItems)
      .where(
        and(eq(prospectingItems.tenantId, ctx.tenantId), eq(prospectingItems.listId, list.id)),
      );
    const start = Number(max);
    const inserted = await tx
      .insert(prospectingItems)
      .values(
        parsed.map((i, index) => ({
          tenantId: ctx.tenantId,
          listId: list.id,
          name: i.name,
          segment: i.segment || null,
          phone: i.phone || null,
          hook: i.hook || null,
          address: i.address || null,
          size: i.size || null,
          info: i.info || null,
          position: start + index + 1,
        })),
      )
      .returning();

    const phones = [...new Set(inserted.map((i) => i.phone).filter((p): p is string => !!p))];
    let alreadyDiscarded = 0;
    if (phones.length > 0) {
      const discarded = await tx
        .select({
          phone: prospectingItems.phone,
          listName: prospectingLists.name,
          reason: sql<
            string | null
          >`(select a.data->>'reason' from ${activities} a where a.tenant_id = ${ctx.tenantId} and a.prospecting_item_id = ${prospectingItems.id} and a.type = 'ligacao' order by a.occurred_at desc, a.created_at desc limit 1)`,
        })
        .from(prospectingItems)
        .innerJoin(
          prospectingLists,
          and(
            eq(prospectingLists.id, prospectingItems.listId),
            eq(prospectingLists.tenantId, ctx.tenantId),
          ),
        )
        .where(
          and(
            eq(prospectingItems.tenantId, ctx.tenantId),
            ne(prospectingItems.listId, list.id),
            eq(prospectingItems.status, "descartado"),
            inArray(prospectingItems.phone, phones),
          ),
        )
        .orderBy(desc(prospectingItems.updatedAt));
      const byPhone = new Map<string, { listName: string; reason: string | null }>();
      for (const d of discarded) {
        if (d.phone && !byPhone.has(d.phone))
          byPhone.set(d.phone, { listName: d.listName, reason: d.reason });
      }
      for (const item of inserted) {
        const hit = item.phone ? byPhone.get(item.phone) : undefined;
        if (!hit) continue;
        const reason = hit.reason
          ? ((DISCARD_REASON_LABELS as Record<string, string>)[hit.reason] ?? hit.reason)
          : "sem motivo registrado";
        const note = `Descartada em ${hit.listName} (${reason.toLowerCase()})`;
        const [updated] = await tx
          .update(prospectingItems)
          .set({ notes: note })
          .where(itemScope(ctx, item.id))
          .returning();
        item.notes = updated.notes;
        alreadyDiscarded += 1;
      }
    }
    return { items: inserted, alreadyDiscarded };
  });
}

export async function getItem(ctx: Ctx, itemId: string): Promise<ProspectingItem | null> {
  const [row] = await db.select().from(prospectingItems).where(itemScope(ctx, itemId));
  return row ?? null;
}

export async function listItems(
  ctx: Ctx,
  input: { listId: string; status?: ProspectingStatus; search?: string },
): Promise<ProspectingItem[]> {
  const where: SQL[] = [
    eq(prospectingItems.tenantId, ctx.tenantId),
    eq(prospectingItems.listId, input.listId),
  ];
  if (input.status) where.push(eq(prospectingItems.status, input.status));
  if (input.search?.trim()) {
    where.push(ilike(prospectingItems.name, `%${input.search.trim().replace(/[%_]/g, "")}%`));
  }
  return (
    db
      .select()
      .from(prospectingItems)
      .where(and(...where))
      .orderBy(asc(prospectingItems.position), asc(prospectingItems.createdAt))
      // Teto de leitura: uma lista com mais de 1000 empresas (várias colagens de 500, P13) é
      // truncada em silêncio; paginação ou aviso na tela ficam com a frente C.
      .limit(1000)
  );
}

export async function countItemsByStatus(
  ctx: Ctx,
  listId: string,
): Promise<Record<ProspectingStatus | "todos", number>> {
  const rows = await db
    .select({ status: prospectingItems.status, total: count() })
    .from(prospectingItems)
    .where(and(eq(prospectingItems.tenantId, ctx.tenantId), eq(prospectingItems.listId, listId)))
    .groupBy(prospectingItems.status);
  const out = Object.fromEntries([...PROSPECTING_STATUSES, "todos"].map((s) => [s, 0])) as Record<
    ProspectingStatus | "todos",
    number
  >;
  for (const r of rows) {
    const n = Number(r.total);
    if ((PROSPECTING_STATUSES as readonly string[]).includes(r.status)) {
      out[r.status as ProspectingStatus] = n;
    }
    out.todos += n;
  }
  return out;
}

export async function updateItem(ctx: Ctx, input: UpdateItemInput): Promise<ProspectingItem> {
  const { itemId, ...data } = updateItemSchema.parse(input);
  const patch: Partial<typeof prospectingItems.$inferInsert> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.segment !== undefined) patch.segment = data.segment || null;
  if (data.phone !== undefined) patch.phone = data.phone || null;
  if (data.hook !== undefined) patch.hook = data.hook || null;
  if (data.address !== undefined) patch.address = data.address || null;
  if (data.size !== undefined) patch.size = data.size || null;
  if (data.info !== undefined) patch.info = data.info || null;
  if (data.status !== undefined) patch.status = data.status;
  if (data.notes !== undefined) patch.notes = data.notes || null;
  if (data.callbackAt !== undefined) patch.callbackAt = data.callbackAt;
  const [row] = await db
    .update(prospectingItems)
    .set(patch)
    .where(itemScope(ctx, itemId))
    .returning();
  if (!row) throw new NotFoundError("Empresa de prospecção", itemId);
  return row;
}

export async function deleteItem(ctx: Ctx, itemId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const item = await requireItem(tx, ctx, itemId);
    await detachItemActivities(tx, ctx, [item.id]);
    await tx.delete(prospectingItems).where(itemScope(ctx, item.id));
  });
}

// Paleta Ctrl+K: só por nome da empresa, nunca por telefone (ADR-004, 6.7 e 8).
export async function searchProspectingItems(
  ctx: Ctx,
  input: { search: string; limit?: number },
): Promise<(ProspectingItem & { listName: string })[]> {
  const term = `%${input.search.replace(/[%_]/g, "")}%`;
  return db
    .select({ ...getTableColumns(prospectingItems), listName: prospectingLists.name })
    .from(prospectingItems)
    .innerJoin(
      prospectingLists,
      and(
        eq(prospectingLists.id, prospectingItems.listId),
        eq(prospectingLists.tenantId, ctx.tenantId),
      ),
    )
    .where(and(eq(prospectingItems.tenantId, ctx.tenantId), ilike(prospectingItems.name, term)))
    .orderBy(asc(prospectingItems.name))
    .limit(Math.min(Math.max(input.limit ?? 5, 1), 50));
}
