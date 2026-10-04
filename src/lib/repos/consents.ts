import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, type Db } from "@/lib/db";
import { consents, leads } from "@/lib/db/schema";
import type { ConsentPurpose } from "@/lib/domain/enums";
import { NotFoundError } from "@/lib/errors";
import { consentInputSchema, type ConsentInput } from "@/lib/validation/leads";
import type { Ctx } from "./ctx";

export type Consent = typeof consents.$inferSelect;

// Append-only (regra R-14): revogar é inserir granted = false. Nunca UPDATE nem DELETE.
export async function insertConsent(
  tx: Db,
  ctx: Ctx,
  leadId: string,
  input: ConsentInput & { contactId?: string | null },
): Promise<Consent> {
  const data = consentInputSchema.parse(input);
  const [row] = await tx
    .insert(consents)
    .values({
      tenantId: ctx.tenantId,
      leadId,
      contactId: input.contactId ?? null,
      purpose: data.purpose,
      granted: data.granted,
      policyVersion: data.policyVersion,
      consentText: data.consentText,
      channels: data.channels,
      sourcePage: data.sourcePage,
      ipHash: data.ipHash ?? null,
      userAgent: data.userAgent ?? null,
    })
    .returning();
  return row;
}

async function requireLead(ctx: Ctx, leadId: string) {
  const [lead] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.id, leadId)));
  if (!lead) throw new NotFoundError("Lead", leadId);
}

export async function recordConsent(
  ctx: Ctx,
  input: ConsentInput & { leadId: string; contactId?: string | null },
): Promise<Consent> {
  await requireLead(ctx, input.leadId);
  return insertConsent(db, ctx, input.leadId, input);
}

export async function revokeConsent(
  ctx: Ctx,
  input: {
    leadId: string;
    purpose: ConsentPurpose;
    policyVersion: string;
    sourcePage: string;
    consentText?: string;
  },
): Promise<Consent> {
  await requireLead(ctx, input.leadId);
  return insertConsent(db, ctx, input.leadId, {
    purpose: input.purpose,
    granted: false,
    policyVersion: input.policyVersion,
    consentText: input.consentText ?? "Revogação registrada.",
    channels: [],
    sourcePage: input.sourcePage,
  });
}

// Estado vigente: a linha mais recente por (lead_id, purpose); null quando nunca houve registro.
export async function getCurrentConsent(
  ctx: Ctx,
  leadId: string,
  purpose: ConsentPurpose,
): Promise<Consent | null> {
  const [row] = await db
    .select()
    .from(consents)
    .where(
      and(
        eq(consents.tenantId, ctx.tenantId),
        eq(consents.leadId, leadId),
        eq(consents.purpose, purpose),
      ),
    )
    .orderBy(desc(consents.createdAt), desc(consents.id))
    .limit(1);
  return row ?? null;
}

export async function hasConsent(
  ctx: Ctx,
  leadId: string,
  purpose: ConsentPurpose,
): Promise<boolean> {
  const current = await getCurrentConsent(ctx, leadId, purpose);
  return current?.granted === true;
}

export async function listConsents(ctx: Ctx, leadId: string): Promise<Consent[]> {
  return db
    .select()
    .from(consents)
    .where(and(eq(consents.tenantId, ctx.tenantId), eq(consents.leadId, leadId)))
    .orderBy(desc(consents.createdAt));
}
