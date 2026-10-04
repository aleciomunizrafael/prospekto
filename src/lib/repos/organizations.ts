import "server-only";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  createOrganizationSchema,
  listOrganizationsSchema,
  updateOrganizationSchema,
  type CreateOrganizationInput,
  type ListOrganizationsInput,
  type UpdateOrganizationInput,
} from "@/lib/validation/organizations";
import type { Ctx } from "./ctx";

export type Organization = typeof organizations.$inferSelect;

export async function getOrganization(ctx: Ctx, orgId: string): Promise<Organization | null> {
  const [row] = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.tenantId, ctx.tenantId), eq(organizations.id, orgId)));
  return row ?? null;
}

export async function requireOrganization(ctx: Ctx, orgId: string): Promise<Organization> {
  const row = await getOrganization(ctx, orgId);
  if (!row) throw new NotFoundError("Organização", orgId);
  return row;
}

export async function createOrganization(
  ctx: Ctx,
  input: CreateOrganizationInput,
): Promise<Organization> {
  const data = createOrganizationSchema.parse(input);
  if (data.accountantOrgId) {
    const accountant = await requireOrganization(ctx, data.accountantOrgId);
    if (accountant.type !== "contabilidade") {
      throw new ValidationError("O escritório contábil informado não é do tipo contabilidade.");
    }
  }
  const [row] = await db
    .insert(organizations)
    .values({ ...data, tenantId: ctx.tenantId })
    .returning();
  return row;
}

export async function updateOrganization(
  ctx: Ctx,
  input: UpdateOrganizationInput,
): Promise<Organization> {
  const { orgId, ...data } = updateOrganizationSchema.parse(input);
  if (data.accountantOrgId) await requireOrganization(ctx, data.accountantOrgId);
  const [row] = await db
    .update(organizations)
    .set(data)
    .where(and(eq(organizations.tenantId, ctx.tenantId), eq(organizations.id, orgId)))
    .returning();
  if (!row) throw new NotFoundError("Organização", orgId);
  return row;
}

export async function listOrganizations(
  ctx: Ctx,
  input: ListOrganizationsInput = {},
): Promise<Organization[]> {
  const f = listOrganizationsSchema.parse(input);
  const where: SQL[] = [eq(organizations.tenantId, ctx.tenantId)];
  if (f.type) where.push(eq(organizations.type, f.type));
  if (f.search) {
    const term = `%${f.search}%`;
    where.push(or(ilike(organizations.name, term), ilike(organizations.tradeName, term))!);
  }
  return db
    .select()
    .from(organizations)
    .where(and(...where))
    .orderBy(desc(organizations.createdAt))
    .limit(f.limit)
    .offset(f.offset);
}
