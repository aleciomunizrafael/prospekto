"use server";
// Server Actions de organizações e contatos (modelo-de-dados.md, 3.3 e 3.4). Toda action começa
// com requireSession() (AGENTS.md); entrada validada pelos schemas Zod dos repositórios.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { failFrom, num, ok, str, triBool, type ActionState } from "@/lib/crm/form-state";
import { log } from "@/lib/log";
import { createContact, updateContact } from "@/lib/repos/contacts";
import { getLead, updateLead } from "@/lib/repos/leads";
import {
  createOrganization,
  searchLeads,
  updateOrganization,
  type LeadOption,
} from "@/lib/repos/organizations";
import { requireSession } from "@/lib/session";
import type { CreateOrganizationInput } from "@/lib/validation/organizations";

function organizationInput(fd: FormData): CreateOrganizationInput {
  return {
    type: str(fd, "type") as CreateOrganizationInput["type"],
    name: str(fd, "name") ?? "",
    tradeName: str(fd, "tradeName"),
    cnpj: str(fd, "cnpj"),
    city: str(fd, "city"),
    uf: str(fd, "uf") as CreateOrganizationInput["uf"],
    sector: str(fd, "sector"),
    taxRegime: str(fd, "taxRegime") as CreateOrganizationInput["taxRegime"],
    taxRegimeConfirmedBy: str(
      fd,
      "taxRegimeConfirmedBy",
    ) as CreateOrganizationInput["taxRegimeConfirmedBy"],
    estimatedIrpj: num(fd, "estimatedIrpj"),
    icmsContributorRs: triBool(fd, "icmsContributorRs"),
    accountantOrgId: str(fd, "accountantOrgId"),
    ownerUserId: str(fd, "ownerUserId"),
    notes: str(fd, "notes"),
  };
}

export async function createOrganizationAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  let orgId: string;
  try {
    const org = await createOrganization(ctx, organizationInput(fd));
    orgId = org.id;
  } catch (error) {
    log("warn", "falha ao criar organização", { tenantId: ctx.tenantId, error });
    return failFrom(error);
  }
  revalidatePath("/app/organizacoes");
  redirect(`/app/organizacoes/${orgId}`);
}

export async function updateOrganizationAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  const orgId = str(fd, "orgId") ?? "";
  try {
    const input = organizationInput(fd);
    await updateOrganization(ctx, {
      orgId,
      ...input,
      // Campos opcionais limpos no formulário voltam a nulo.
      tradeName: input.tradeName ?? null,
      cnpj: input.cnpj ?? null,
      city: input.city ?? null,
      uf: input.uf ?? null,
      sector: input.sector ?? null,
      taxRegime: input.taxRegime ?? null,
      taxRegimeConfirmedBy: input.taxRegimeConfirmedBy ?? null,
      estimatedIrpj: input.estimatedIrpj ?? null,
      icmsContributorRs: input.icmsContributorRs ?? null,
      accountantOrgId: input.accountantOrgId ?? null,
      ownerUserId: input.ownerUserId ?? null,
      notes: input.notes ?? null,
    } as Parameters<typeof updateOrganization>[1]);
  } catch (error) {
    log("warn", "falha ao atualizar organização", { tenantId: ctx.tenantId, orgId, error });
    return failFrom(error);
  }
  revalidatePath("/app/organizacoes");
  revalidatePath(`/app/organizacoes/${orgId}`);
  return ok("Organização salva.");
}

function contactInput(fd: FormData) {
  return {
    name: str(fd, "name") ?? "",
    title: str(fd, "title"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    linkedinUrl: str(fd, "linkedinUrl"),
    isDecisionMaker: fd.get("isDecisionMaker") === "on",
    sourceDetail: str(fd, "sourceDetail") ?? "",
  };
}

export async function createContactAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireSession();
  const orgId = str(fd, "orgId") ?? "";
  try {
    await createContact(ctx, { orgId, ...contactInput(fd) });
  } catch (error) {
    log("warn", "falha ao criar contato", { tenantId: ctx.tenantId, orgId, error });
    return failFrom(error);
  }
  revalidatePath(`/app/organizacoes/${orgId}`);
  return ok("Contato salvo.");
}

export async function updateContactAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireSession();
  const orgId = str(fd, "orgId") ?? "";
  const contactId = str(fd, "contactId") ?? "";
  try {
    const input = contactInput(fd);
    await updateContact(ctx, {
      contactId,
      ...input,
      title: input.title ?? null,
      email: input.email ?? null,
      phone: input.phone ?? "",
      linkedinUrl: input.linkedinUrl ?? null,
    } as Parameters<typeof updateContact>[1]);
  } catch (error) {
    log("warn", "falha ao atualizar contato", { tenantId: ctx.tenantId, contactId, error });
    return failFrom(error);
  }
  revalidatePath(`/app/organizacoes/${orgId}`);
  return ok("Contato salvo.");
}

// Vincula um lead à organização (leads.org_id) e, opcionalmente, a um contato dela
// (leads.contact_id). O recálculo de score e a atividade de dono ficam em updateLead.
export async function linkLeadToOrganizationAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  const orgId = str(fd, "orgId") ?? "";
  const leadId = str(fd, "leadId") ?? "";
  const contactId = str(fd, "contactId");
  try {
    if (!leadId) return { status: "error", message: "Escolha um lead na busca." };
    const lead = await getLead(ctx, leadId);
    if (!lead) return { status: "error", message: "Lead não encontrado." };
    await updateLead(ctx, { leadId, orgId, contactId: contactId ?? null });
  } catch (error) {
    log("warn", "falha ao vincular lead à organização", {
      tenantId: ctx.tenantId,
      orgId,
      leadId,
      error,
    });
    return failFrom(error);
  }
  revalidatePath(`/app/organizacoes/${orgId}`);
  revalidatePath(`/app/leads/${leadId}`);
  return ok("Lead vinculado.");
}

export async function unlinkLeadFromOrganizationAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  const orgId = str(fd, "orgId") ?? "";
  const leadId = str(fd, "leadId") ?? "";
  try {
    await updateLead(ctx, { leadId, orgId: null, contactId: null });
  } catch (error) {
    log("warn", "falha ao desvincular lead", { tenantId: ctx.tenantId, orgId, leadId, error });
    return failFrom(error);
  }
  revalidatePath(`/app/organizacoes/${orgId}`);
  revalidatePath(`/app/leads/${leadId}`);
  return ok("Lead desvinculado.");
}

// Busca de leads para o seletor (nome ou e-mail). DTO sem atributos.
export async function searchLeadsAction(query: string): Promise<LeadOption[]> {
  const ctx = await requireSession();
  const q = query.trim();
  if (q.length < 2) return [];
  return searchLeads(ctx, q.slice(0, 80));
}
