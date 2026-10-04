import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import {
  createContactSchema,
  updateContactSchema,
  type CreateContactInput,
  type UpdateContactInput,
} from "@/lib/validation/contacts";
import type { Ctx } from "./ctx";
import { requireOrganization } from "./organizations";

export type Contact = typeof contacts.$inferSelect;

export async function createContact(ctx: Ctx, input: CreateContactInput): Promise<Contact> {
  const data = createContactSchema.parse(input);
  await requireOrganization(ctx, data.orgId);
  const [row] = await db
    .insert(contacts)
    .values({ ...data, phone: data.phone || null, tenantId: ctx.tenantId })
    .returning();
  return row;
}

export async function getContact(ctx: Ctx, contactId: string): Promise<Contact | null> {
  const [row] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, ctx.tenantId), eq(contacts.id, contactId)));
  return row ?? null;
}

export async function updateContact(ctx: Ctx, input: UpdateContactInput): Promise<Contact> {
  const { contactId, ...data } = updateContactSchema.parse(input);
  if (data.orgId) await requireOrganization(ctx, data.orgId);
  const [row] = await db
    .update(contacts)
    .set({ ...data, phone: data.phone === "" ? null : data.phone })
    .where(and(eq(contacts.tenantId, ctx.tenantId), eq(contacts.id, contactId)))
    .returning();
  if (!row) throw new NotFoundError("Contato", contactId);
  return row;
}

export async function listContacts(
  ctx: Ctx,
  filter: { orgId?: string; limit?: number } = {},
): Promise<Contact[]> {
  const where = [eq(contacts.tenantId, ctx.tenantId)];
  if (filter.orgId) where.push(eq(contacts.orgId, filter.orgId));
  return db
    .select()
    .from(contacts)
    .where(and(...where))
    .orderBy(desc(contacts.createdAt))
    .limit(filter.limit ?? 200);
}
