import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, type Db } from "@/lib/db";
import { consents, leads } from "@/lib/db/schema";
import type { ConsentChannel, ConsentPurpose } from "@/lib/domain/enums";
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

// Consentimento vigente e, quando informado, canal dentro dos "canais autorizados" registrados.
// Lista de canais vazia não restringe: só surge do formulário do CRM com todas as caixas
// desmarcadas, e os registros antigos continuam valendo como antes.
export function consentAllows(consent: Consent | null, channel?: ConsentChannel): boolean {
  if (consent?.granted !== true) return false;
  return !channel || consent.channels.length === 0 || consent.channels.includes(channel);
}

export async function hasConsent(
  ctx: Ctx,
  leadId: string,
  purpose: ConsentPurpose,
  channel?: ConsentChannel,
): Promise<boolean> {
  return consentAllows(await getCurrentConsent(ctx, leadId, purpose), channel);
}

export async function listConsents(ctx: Ctx, leadId: string): Promise<Consent[]> {
  return db
    .select()
    .from(consents)
    .where(and(eq(consents.tenantId, ctx.tenantId), eq(consents.leadId, leadId)))
    .orderBy(desc(consents.createdAt));
}

// Webhook do Resend (regra R-14; proposta-c, 4.6): bounce e reclamação atualizam
// `leads.email_status` de todo lead com aquele e-mail no tenant; descadastro e reclamação inserem
// a revogação de `marketing` (append-only, source_page "webhook"). Devolve só contagens (R-16).
export type EmailEventKind = "bounced" | "complained" | "unsubscribed";

export async function applyEmailEvent(
  ctx: Ctx,
  input: { email: string; kind: EmailEventKind; policyVersion: string; occurredAt?: Date },
): Promise<{ leadsMatched: number; emailStatusUpdated: number; consentsRevoked: number }> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { leadsMatched: 0, emailStatusUpdated: 0, consentsRevoked: 0 };
  return db.transaction(async (tx) => {
    const matched = await tx
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.email, email)));
    let emailStatusUpdated = 0;
    if (input.kind === "bounced" || input.kind === "complained") {
      const updated = await tx
        .update(leads)
        .set({ emailStatus: input.kind })
        .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.email, email)))
        .returning({ id: leads.id });
      emailStatusUpdated = updated.length;
    }
    let consentsRevoked = 0;
    if (input.kind === "unsubscribed" || input.kind === "complained") {
      for (const lead of matched) {
        await insertConsent(tx, ctx, lead.id, {
          purpose: "marketing",
          granted: false,
          policyVersion: input.policyVersion,
          consentText:
            input.kind === "complained"
              ? "Revogação registrada por reclamação de spam recebida pelo webhook do provedor de e-mail."
              : "Revogação registrada por descadastro recebido pelo webhook do provedor de e-mail.",
          channels: [],
          sourcePage: "webhook",
        });
        consentsRevoked += 1;
      }
    }
    return { leadsMatched: matched.length, emailStatusUpdated, consentsRevoked };
  });
}
