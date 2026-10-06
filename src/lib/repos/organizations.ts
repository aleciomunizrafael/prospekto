import "server-only";
import { and, asc, desc, eq, getTableColumns, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, type Db } from "@/lib/db";
import { contacts, leads, organizations } from "@/lib/db/schema";
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

// `dbx`: dentro de uma transação, passe o `tx`. Com PGlite (uma conexão só), uma consulta em `db`
// enquanto a transação está aberta espera para sempre (visto em 06/10/2026 em createContribution).
export async function getOrganization(
  ctx: Ctx,
  orgId: string,
  dbx: Db = db,
): Promise<Organization | null> {
  const [row] = await dbx
    .select()
    .from(organizations)
    .where(and(eq(organizations.tenantId, ctx.tenantId), eq(organizations.id, orgId)));
  return row ?? null;
}

export async function requireOrganization(
  ctx: Ctx,
  orgId: string,
  dbx: Db = db,
): Promise<Organization> {
  const row = await getOrganization(ctx, orgId, dbx);
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

// ---------------------------------------------------------------------------------------------
// Telas do CRM (/app/organizacoes). Contagens no banco; leads por organização; vínculo de lead.

export type OrganizationSummary = Organization & {
  contactsCount: number;
  leadsCount: number;
  accountantName: string | null;
};

export async function listOrganizationSummaries(
  ctx: Ctx,
  input: ListOrganizationsInput = {},
): Promise<OrganizationSummary[]> {
  const f = listOrganizationsSchema.parse(input);
  const where: SQL[] = [eq(organizations.tenantId, ctx.tenantId)];
  if (f.type) where.push(eq(organizations.type, f.type));
  if (f.search) {
    const term = `%${f.search}%`;
    const digits = f.search.replace(/\D/g, "");
    where.push(
      or(
        ilike(organizations.name, term),
        ilike(organizations.tradeName, term),
        digits.length >= 4 ? ilike(organizations.cnpj, `%${digits}%`) : sql`false`,
      )!,
    );
  }
  const rows = await db
    .select({
      ...getTableColumns(organizations),
      contactsCount: sql<number>`(select count(*)::int from ${contacts} where ${contacts.orgId} = ${organizations.id})`,
      leadsCount: sql<number>`(select count(*)::int from ${leads} where ${leads.orgId} = ${organizations.id})`,
      accountantName: sql<
        string | null
      >`(select o2.name from organizations o2 where o2.id = ${organizations.accountantOrgId})`,
    })
    .from(organizations)
    .where(and(...where))
    .orderBy(asc(organizations.name))
    .limit(f.limit)
    .offset(f.offset);
  return rows;
}

export async function getOrganizationSummary(
  ctx: Ctx,
  orgId: string,
): Promise<OrganizationSummary | null> {
  const [row] = await db
    .select({
      ...getTableColumns(organizations),
      contactsCount: sql<number>`(select count(*)::int from ${contacts} where ${contacts.orgId} = ${organizations.id})`,
      leadsCount: sql<number>`(select count(*)::int from ${leads} where ${leads.orgId} = ${organizations.id})`,
      accountantName: sql<
        string | null
      >`(select o2.name from organizations o2 where o2.id = ${organizations.accountantOrgId})`,
    })
    .from(organizations)
    .where(and(eq(organizations.tenantId, ctx.tenantId), eq(organizations.id, orgId)));
  return row ?? null;
}

export type OrganizationLead = {
  id: string;
  name: string;
  email: string;
  segment: string;
  pipeline: string;
  stage: string;
  nextActionAt: Date | null;
  contactId: string | null;
  createdAt: Date;
};

export async function listLeadsForOrganization(
  ctx: Ctx,
  orgId: string,
): Promise<OrganizationLead[]> {
  return db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      segment: leads.segment,
      pipeline: leads.pipeline,
      stage: leads.stage,
      nextActionAt: leads.nextActionAt,
      contactId: leads.contactId,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.orgId, orgId)))
    .orderBy(desc(leads.createdAt))
    .limit(200);
}

export type LeadOption = {
  id: string;
  name: string;
  email: string;
  segment: string;
  stage: string;
  orgId: string | null;
};

// Busca por nome ou e-mail entre todos os leads do tenant (vincular lead a organização).
export async function searchLeads(ctx: Ctx, query: string, limit = 10): Promise<LeadOption[]> {
  const term = `%${query.trim()}%`;
  return db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      segment: leads.segment,
      stage: leads.stage,
      orgId: leads.orgId,
    })
    .from(leads)
    .where(
      and(
        eq(leads.tenantId, ctx.tenantId),
        sql`(${leads.name} ilike ${term} or ${leads.email} ilike ${term})`,
      ),
    )
    .orderBy(asc(leads.name))
    .limit(limit);
}
