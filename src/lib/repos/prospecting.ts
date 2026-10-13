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
import {
  activities,
  contacts,
  leads,
  organizations,
  prospectingItems,
  prospectingLists,
  users,
} from "@/lib/db/schema";
import { formatDate, fromDateTimeLocal } from "@/lib/crm/format";
import { DISCARD_REASON_LABELS } from "@/lib/crm/labels";
import { callResultSubject, formatMeetingAt } from "@/lib/crm/prospecting-view";
import { PROSPECTING_STATUSES, type ProspectingStatus } from "@/lib/domain/enums";
import { TERMINAL_STAGES } from "@/lib/domain/pipelines";
import { scoreLead } from "@/lib/domain/scoring";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { log } from "@/lib/log";
import { parseAttributes } from "@/lib/validation/lead-attributes";
import {
  convertItemSchema,
  createListSchema,
  newItemSchema,
  recordCallResultSchema,
  recordWhatsappSentSchema,
  updateItemFieldSchema,
  updateItemSchema,
  updateListSchema,
  type ConvertItemInput,
  type CreateListInput,
  type NewItemInput,
  type RecordCallResultInput,
  type RecordWhatsappSentInput,
  type UpdateItemFieldInput,
  type UpdateItemInput,
  type UpdateListInput,
} from "@/lib/validation/prospecting";
import { insertSystemActivity } from "./activities";
import type { Ctx } from "./ctx";
import { moveLeadStage } from "./leads";

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

// ---------------------------------------------------------------------------------------------
// Frente C: resultado da ligação, WhatsApp, autosave e conversão (ADR-004, 6.6; plano, P7 e P10)

// Motivo do último descarte por item (data.reason da activities.ligacao mais recente), para o
// "Voltar para a ligar" pedir confirmação quando a empresa pediu para não ser contatada.
export async function listDiscardReasons(
  ctx: Ctx,
  input: { listId?: string; itemId?: string },
): Promise<Record<string, string>> {
  const where: SQL[] = [
    eq(activities.tenantId, ctx.tenantId),
    eq(activities.type, "ligacao"),
    eq(prospectingItems.status, "descartado"),
  ];
  if (input.listId) where.push(eq(prospectingItems.listId, input.listId));
  if (input.itemId) where.push(eq(prospectingItems.id, input.itemId));
  const rows = await db
    .select({
      itemId: prospectingItems.id,
      reason: sql<string | null>`${activities.data}->>'reason'`,
    })
    .from(activities)
    .innerJoin(
      prospectingItems,
      and(
        eq(prospectingItems.id, activities.prospectingItemId),
        eq(prospectingItems.tenantId, ctx.tenantId),
      ),
    )
    .where(and(...where))
    .orderBy(desc(activities.occurredAt), desc(activities.createdAt))
    .limit(2000);
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (r.reason && !(r.itemId in out)) out[r.itemId] = r.reason;
  }
  return out;
}

// Um botão de resultado: status, called_at (nulo ao voltar para a ligar), callback_at (só em
// retornar), a anotação quando vier, e uma activities.ligacao com o resultado (ADR-004, 6.6).
// Sem status, só a anotação (activities.nota). Se o item já virou lead e o resultado é retornar,
// leads.next_action_at passa para o dia do retorno às 9h de São Paulo.
export async function recordCallResult(
  ctx: Ctx,
  input: RecordCallResultInput,
): Promise<ProspectingItem> {
  const data = recordCallResultSchema.parse(input);
  return db.transaction(async (tx) => {
    const item = await requireItem(tx, ctx, data.itemId);
    const now = new Date();
    const patch: Partial<typeof prospectingItems.$inferInsert> = {};
    if (data.note !== undefined) patch.notes = data.note || null;
    if (data.status) {
      patch.status = data.status;
      patch.calledAt = data.status === "a_ligar" ? null : now;
      patch.callbackAt = data.status === "retornar" ? (data.callbackAt ?? null) : null;
    }
    const [updated] = await tx
      .update(prospectingItems)
      .set(patch)
      .where(itemScope(ctx, item.id))
      .returning();
    if (data.status) {
      await insertSystemActivity(tx, ctx, {
        // "De volta para a ligar" não é uma ligação: fica como nota na linha do tempo.
        type: data.status === "a_ligar" ? "nota" : "ligacao",
        subject: callResultSubject(data.status, {
          callbackAt: data.callbackAt,
          reason: data.reason,
        }),
        body: data.note || null,
        data: {
          result: data.status,
          callbackAt: data.status === "retornar" ? (data.callbackAt ?? null) : null,
          reason: data.reason ?? null,
        },
        occurredAt: now,
        prospectingItemId: item.id,
        leadId: item.leadId,
        ownerUserId: ctx.userId ?? null,
      });
      if (item.leadId && data.status === "retornar" && data.callbackAt) {
        const nextActionAt = fromDateTimeLocal(`${data.callbackAt}T09:00`);
        if (nextActionAt) {
          await tx
            .update(leads)
            .set({ nextActionAt })
            .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.id, item.leadId)));
        }
      }
    } else {
      await insertSystemActivity(tx, ctx, {
        type: "nota",
        subject: "Anotação",
        body: data.note ?? null,
        data: { result: null },
        occurredAt: now,
        prospectingItemId: item.id,
        leadId: item.leadId,
        ownerUserId: ctx.userId ?? null,
      });
    }
    return updated;
  });
}

// "Abrir no WhatsApp": o CRM só sabe que abriu com este texto (ADR-004, 6.6): whatsapp_sent_at e
// uma activities.whatsapp com o texto editado em body.
export async function recordWhatsappSent(
  ctx: Ctx,
  input: RecordWhatsappSentInput,
): Promise<ProspectingItem> {
  const data = recordWhatsappSentSchema.parse(input);
  return db.transaction(async (tx) => {
    const item = await requireItem(tx, ctx, data.itemId);
    const now = new Date();
    const [updated] = await tx
      .update(prospectingItems)
      .set({ whatsappSentAt: now })
      .where(itemScope(ctx, item.id))
      .returning();
    await insertSystemActivity(tx, ctx, {
      type: "whatsapp",
      subject: "WhatsApp aberto pela prospecção",
      body: data.text,
      data: { channel: "whatsapp" },
      occurredAt: now,
      prospectingItemId: item.id,
      leadId: item.leadId,
      ownerUserId: ctx.userId ?? null,
    });
    return updated;
  });
}

// Autosave da ficha (abertura, localização, porte, informações, anotação): um campo por vez.
export async function updateItemField(
  ctx: Ctx,
  input: UpdateItemFieldInput,
): Promise<ProspectingItem> {
  const data = updateItemFieldSchema.parse(input);
  const value = data.value.trim() || null;
  const [row] = await db
    .update(prospectingItems)
    .set({ [data.field]: value })
    .where(itemScope(ctx, data.itemId))
    .returning();
  if (!row) throw new NotFoundError("Empresa de prospecção", data.itemId);
  return row;
}

export type ConvertProspectingItemResult = {
  leadId: string;
  orgId: string;
  contactId: string;
  created: boolean;
  reactivated: boolean;
  stage: string;
  advanceFailed: boolean;
};

// Nome igual, sem curingas: `%` e `_` do próprio nome são escapados para o ilike ser exato.
function exactIlike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

async function fillOrganizationPhone(
  tx: Db,
  ctx: Ctx,
  org: { id: string; phone: string | null },
  phone: string | null,
): Promise<void> {
  if (org.phone || !phone) return;
  await tx
    .update(organizations)
    .set({ phone })
    .where(and(eq(organizations.tenantId, ctx.tenantId), eq(organizations.id, org.id)));
}

// "Reunião marcada" (ADR-004, 6.6; plano, P10): numa transação só com `tx`, a empresa vira
// organização (com o telefone da empresa), a pessoa vira contato e lead em `novo` (ou o lead com o
// mesmo e-mail é reaproveitado), a reunião entra como activities.reuniao na data marcada e o item
// fica em reuniao_marcada com a história ligada ao lead. Depois da transação, moveLeadStage leva o
// lead a `qualificado` (novo → qualificado; perdido → novo → qualificado); se um movimento falhar,
// o lead fica onde está, a função devolve o estágio real e o aviso vai para o log sem dado pessoal.
export async function convertProspectingItem(
  ctx: Ctx,
  input: ConvertItemInput,
): Promise<ConvertProspectingItemResult> {
  const data = convertItemSchema.parse(input);
  const now = new Date();
  const kindLabel = data.meetingKind === "simulacao" ? "simulação" : "diagnóstico";

  const saved = await db.transaction(async (tx) => {
    const item = await requireItem(tx, ctx, data.itemId);
    if (item.status === "reuniao_marcada" || item.leadId) {
      throw new ValidationError(
        "Esta empresa já foi convertida: a reunião fica registrada no lead.",
      );
    }
    const list = await requireList(tx, ctx, item.listId);
    const ownerUserId = data.ownerUserId ?? list.assigneeUserId ?? ctx.userId ?? null;
    if (ownerUserId) await assertAssignee(tx, ctx, ownerUserId);

    // 1. Organização: a do item, a de mesmo nome (empresa) ou uma nova, com o telefone da empresa.
    let orgId: string | null = null;
    if (item.orgId) {
      const [own] = await tx
        .select({ id: organizations.id, phone: organizations.phone })
        .from(organizations)
        .where(and(eq(organizations.tenantId, ctx.tenantId), eq(organizations.id, item.orgId)));
      if (own) {
        orgId = own.id;
        await fillOrganizationPhone(tx, ctx, own, item.phone);
      }
    }
    if (!orgId) {
      const [same] = await tx
        .select({ id: organizations.id, phone: organizations.phone })
        .from(organizations)
        .where(
          and(
            eq(organizations.tenantId, ctx.tenantId),
            eq(organizations.type, "empresa"),
            ilike(organizations.name, exactIlike(item.name)),
          ),
        )
        .orderBy(asc(organizations.createdAt))
        .limit(1);
      if (same) {
        orgId = same.id;
        await fillOrganizationPhone(tx, ctx, same, item.phone);
      }
    }
    if (!orgId) {
      const notes = [
        `Origem: prospecção, lista ${list.name}`,
        item.address ? `Localização: ${item.address}` : null,
        item.size ? `Porte: ${item.size}` : null,
        item.info ? `Informações: ${item.info}` : null,
        item.hook ? `Abertura usada: ${item.hook}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      const [org] = await tx
        .insert(organizations)
        .values({
          tenantId: ctx.tenantId,
          type: "empresa",
          name: item.name,
          sector: item.segment,
          phone: item.phone,
          notes,
        })
        .returning({ id: organizations.id });
      orgId = org.id;
    }

    // 2. Contato: a pessoa que vai à reunião, com o telefone dela (nunca o da empresa).
    const [contact] = await tx
      .insert(contacts)
      .values({
        tenantId: ctx.tenantId,
        orgId,
        name: data.contactName,
        title: data.title || null,
        email: data.email,
        phone: data.contactPhone || null,
        isDecisionMaker: false,
        sourceDetail: `Prospecção: lista ${list.name} (ligação em ${formatDate(now)})`,
      })
      .returning({ id: contacts.id });

    // 3. Lead: reaproveita o PJ com o mesmo e-mail; senão nasce em `novo` com origem prospeccao.
    const [existing] = await tx
      .select({
        id: leads.id,
        stage: leads.stage,
        orgId: leads.orgId,
        contactId: leads.contactId,
      })
      .from(leads)
      .where(
        and(eq(leads.tenantId, ctx.tenantId), eq(leads.email, data.email), eq(leads.segment, "PJ")),
      );
    let leadId: string;
    let created: boolean;
    let stageBefore: string;
    if (existing) {
      leadId = existing.id;
      created = false;
      stageBefore = existing.stage;
      await tx
        .update(leads)
        .set({
          orgId: existing.orgId ?? orgId,
          contactId: existing.contactId ?? contact.id,
          lastContactAt: now,
        })
        .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.id, existing.id)));
    } else {
      const attributes = parseAttributes("PJ", {
        empresa: item.name,
        ...(data.taxRegime ? { regime_tributario: data.taxRegime } : {}),
      });
      const scored = scoreLead("PJ", "prospeccao", attributes, now);
      const [lead] = await tx
        .insert(leads)
        .values({
          tenantId: ctx.tenantId,
          segment: "PJ",
          pipeline: "patrocinadores",
          stage: "novo",
          stageEnteredAt: now,
          interest: data.interest,
          name: data.contactName,
          email: data.email,
          phone: data.contactPhone || null,
          source: "prospeccao",
          sourceDetail: list.name,
          orgId,
          contactId: contact.id,
          ownerUserId,
          attributes,
          score: scored.score,
          temperature: scored.temperature,
          lastContactAt: now,
          // A próxima ação já é a reunião: se o movimento a `qualificado` falhar, o lead fica em
          // `novo` com a data certa (ADR-004, 6.6).
          nextActionAt: data.meetingAt,
        })
        .returning({ id: leads.id });
      leadId = lead.id;
      created = true;
      stageBefore = "novo";
      await insertSystemActivity(tx, ctx, {
        subject: `Lead criado pela prospecção (lista ${list.name})`,
        data: { listId: list.id, prospectingItemId: item.id },
        leadId,
        occurredAt: now,
      });
    }

    // 4. A ligação de hoje e a reunião na data marcada, ligadas ao lead e ao item.
    await insertSystemActivity(tx, ctx, {
      type: "ligacao",
      subject: callResultSubject("reuniao_marcada"),
      data: { result: "reuniao_marcada", callbackAt: null, reason: null },
      occurredAt: now,
      leadId,
      prospectingItemId: item.id,
      ownerUserId,
    });
    await insertSystemActivity(tx, ctx, {
      type: "reuniao",
      subject: `Reunião de ${kindLabel} marcada para ${formatMeetingAt(data.meetingAt)} (via prospecção, lista ${list.name})`,
      data: {
        meetingKind: data.meetingKind,
        channel: "ligacao",
        meetingAt: data.meetingAt.toISOString(),
      },
      occurredAt: data.meetingAt,
      leadId,
      prospectingItemId: item.id,
      ownerUserId,
    });

    // 5. Item convertido; a história anterior viaja com o lead.
    await tx
      .update(prospectingItems)
      .set({ status: "reuniao_marcada", calledAt: now, callbackAt: null, leadId, orgId })
      .where(itemScope(ctx, item.id));
    await tx
      .update(activities)
      .set({ leadId })
      .where(
        and(
          eq(activities.tenantId, ctx.tenantId),
          eq(activities.prospectingItemId, item.id),
          isNull(activities.leadId),
        ),
      );

    return { leadId, orgId, contactId: contact.id, created, stageBefore, ownerUserId };
  });

  // Fora da transação: moveLeadStage continua o único lugar que grava `stage` (R-3).
  let reactivated = false;
  let advanceFailed = false;
  let stage = saved.stageBefore;
  const move = (to: string) =>
    moveLeadStage(ctx, {
      leadId: saved.leadId,
      to,
      ownerUserId: saved.ownerUserId ?? undefined,
      nextActionAt: data.meetingAt,
    });
  try {
    if (stage === "novo") {
      stage = (await move("qualificado")).stage;
    } else if (stage === TERMINAL_STAGES.patrocinadores) {
      stage = (await move("novo")).stage;
      reactivated = true;
      stage = (await move("qualificado")).stage;
    }
    // Lead reaproveitado em outro estágio: nenhum movimento (ADR-004, 6.6).
  } catch (error) {
    advanceFailed = true;
    log("warn", "conversão: estágio não avançado", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      leadId: saved.leadId,
      stage,
      error,
    });
  }
  const [final] = await db
    .select({ stage: leads.stage })
    .from(leads)
    .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.id, saved.leadId)));
  return {
    leadId: saved.leadId,
    orgId: saved.orgId,
    contactId: saved.contactId,
    created: saved.created,
    reactivated,
    stage: final?.stage ?? stage,
    advanceFailed,
  };
}
