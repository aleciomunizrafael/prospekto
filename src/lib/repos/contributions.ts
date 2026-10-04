import "server-only";
import { and, desc, eq, getTableColumns, inArray, ne, sql, type SQL } from "drizzle-orm";
import { db, type Db } from "@/lib/db";
import { contributions, culturalProjects, leads, organizations } from "@/lib/db/schema";
import { assertCommissionWithinLimits, type CommissionWarning } from "@/lib/domain/commission";
import type { ContributionStatus } from "@/lib/domain/enums";
import { checkContributionMechanism } from "@/lib/domain/mechanisms";
import { DomainError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  cancelContributionSchema,
  confirmDepositSchema,
  createContributionSchema,
  issueReceiptSchema,
  recordCommissionSchema,
  signTermSchema,
  type CancelContributionInput,
  type ConfirmDepositInput,
  type CreateContributionInput,
  type IssueReceiptInput,
  type RecordCommissionInput,
  type SignTermInput,
} from "@/lib/validation/contributions";
import { insertSystemActivity } from "./activities";
import type { Ctx } from "./ctx";
import { requireOrganization } from "./organizations";

export type Contribution = typeof contributions.$inferSelect;

// Status que contam como captado (regra R-6).
const RAISED_STATUSES: ContributionStatus[] = ["depositado", "recibo_emitido"];

export async function requireContribution(
  tx: Db,
  ctx: Ctx,
  contributionId: string,
): Promise<Contribution> {
  const [row] = await tx
    .select()
    .from(contributions)
    .where(and(eq(contributions.tenantId, ctx.tenantId), eq(contributions.id, contributionId)));
  if (!row) throw new NotFoundError("Aporte", contributionId);
  return row;
}

async function requireLeadForContribution(tx: Db, ctx: Ctx, leadId: string) {
  const [lead] = await tx
    .select({ id: leads.id, segment: leads.segment, orgId: leads.orgId })
    .from(leads)
    .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.id, leadId)));
  if (!lead) throw new NotFoundError("Lead", leadId);
  return lead;
}

// modelo-de-dados.md, 3.9: `org_id` é obrigatório para PJ em `termo_assinado`, e a organização
// precisa ter CNPJ (3.3). Devolve o org_id a gravar no aporte (o do aporte ou, na falta, o do lead).
export async function requireSponsorOrgForTerm(
  tx: Db,
  ctx: Ctx,
  contribution: Pick<Contribution, "orgId">,
  lead: { segment: string; orgId: string | null },
): Promise<string | null> {
  const orgId = contribution.orgId ?? lead.orgId;
  if (lead.segment !== "PJ") return orgId;
  if (!orgId) {
    throw new ValidationError(
      "Para assinar o termo de um patrocinador PJ, informe a empresa patrocinadora (organização) no lead ou no aporte.",
    );
  }
  const [org] = await tx
    .select({ cnpj: organizations.cnpj })
    .from(organizations)
    .where(and(eq(organizations.tenantId, ctx.tenantId), eq(organizations.id, orgId)));
  if (!org) throw new NotFoundError("Organização", orgId);
  if (!org.cnpj) {
    throw new ValidationError("A empresa patrocinadora precisa ter CNPJ antes do termo assinado.");
  }
  return orgId;
}

// Regra R-6: raised_amount é recalculado no banco com sum(deposited_amount) dos aportes captados.
export async function recalcRaisedAmount(tx: Db, ctx: Ctx, projectId: string): Promise<void> {
  await tx
    .update(culturalProjects)
    .set({
      raisedAmount: sql`(select coalesce(sum(${contributions.depositedAmount}), 0) from ${contributions} where ${contributions.tenantId} = ${ctx.tenantId} and ${contributions.projectId} = ${projectId} and ${contributions.status} in ('depositado', 'recibo_emitido'))`,
    })
    .where(and(eq(culturalProjects.tenantId, ctx.tenantId), eq(culturalProjects.id, projectId)));
}

// Aporte aberto do lead: o mais recente com status <> cancelado (modelo-de-dados.md, 4.2).
export async function getOpenContributionForLead(
  tx: Db,
  ctx: Ctx,
  leadId: string,
): Promise<Contribution | null> {
  const [row] = await tx
    .select()
    .from(contributions)
    .where(
      and(
        eq(contributions.tenantId, ctx.tenantId),
        eq(contributions.leadId, leadId),
        ne(contributions.status, "cancelado"),
      ),
    )
    .orderBy(desc(contributions.createdAt), desc(contributions.id))
    .limit(1);
  return row ?? null;
}

export async function createContribution(
  ctx: Ctx,
  input: CreateContributionInput,
): Promise<Contribution> {
  const data = createContributionSchema.parse(input);
  return db.transaction(async (tx) => {
    const [project] = await tx
      .select({ id: culturalProjects.id, mechanism: culturalProjects.mechanism })
      .from(culturalProjects)
      .where(
        and(eq(culturalProjects.tenantId, ctx.tenantId), eq(culturalProjects.id, data.projectId)),
      );
    if (!project) throw new NotFoundError("Projeto", data.projectId);
    const lead = await requireLeadForContribution(tx, ctx, data.leadId);
    if (lead.segment !== "PJ" && lead.segment !== "PF") {
      throw new ValidationError("Só leads PJ ou PF podem ter aporte.");
    }
    if (data.orgId) await requireOrganization(ctx, data.orgId);
    // Regra R-9
    const check = checkContributionMechanism(project.mechanism, data.mechanism, data.type);
    if (!check.ok) throw new DomainError("mechanism_incompatible", check.reason);

    const [row] = await tx
      .insert(contributions)
      .values({
        ...data,
        // Empresa patrocinadora: a informada ou a do lead (modelo-de-dados.md, 3.9).
        orgId: data.orgId ?? lead.orgId ?? null,
        tenantId: ctx.tenantId,
        status: "proposta",
      })
      .returning();
    await insertSystemActivity(tx, ctx, {
      subject: "Proposta de aporte criada",
      data: {
        contributionId: row.id,
        proposedAmount: row.proposedAmount,
        mechanism: row.mechanism,
      },
      leadId: row.leadId,
      projectId: row.projectId,
      contributionId: row.id,
    });
    return row;
  });
}

export async function signTerm(ctx: Ctx, input: SignTermInput): Promise<Contribution> {
  const data = signTermSchema.parse(input);
  return db.transaction(async (tx) => {
    const current = await requireContribution(tx, ctx, data.contributionId);
    if (current.status !== "proposta" && current.status !== "termo_assinado") {
      throw new ValidationError(`Não é possível assinar termo de um aporte em ${current.status}.`);
    }
    const lead = await requireLeadForContribution(tx, ctx, current.leadId);
    const orgId = await requireSponsorOrgForTerm(tx, ctx, current, lead);
    const [row] = await tx
      .update(contributions)
      .set({
        status: "termo_assinado",
        orgId,
        termSignedAt: data.termSignedAt,
        bankDetailsSentAt: data.bankDetailsSentAt ?? current.bankDetailsSentAt,
      })
      .where(and(eq(contributions.tenantId, ctx.tenantId), eq(contributions.id, current.id)))
      .returning();
    await insertSystemActivity(tx, ctx, {
      subject: "Termo assinado",
      data: { from: current.status, to: "termo_assinado", termSignedAt: data.termSignedAt },
      leadId: row.leadId,
      projectId: row.projectId,
      contributionId: row.id,
    });
    return row;
  });
}

// Regra R-6: confirma o depósito e recalcula raised_amount do projeto no banco. Exige o termo
// assinado (seção 4.2): `term_signed_at` é a data real da assinatura e nunca é inventada aqui.
export async function confirmDeposit(ctx: Ctx, input: ConfirmDepositInput): Promise<Contribution> {
  const data = confirmDepositSchema.parse(input);
  return db.transaction(async (tx) => {
    const current = await requireContribution(tx, ctx, data.contributionId);
    if (current.status !== "termo_assinado" && current.status !== "depositado") {
      throw new ValidationError(
        current.status === "proposta"
          ? "Registre a assinatura do termo (signTerm) antes de confirmar o depósito."
          : `Não é possível confirmar depósito de um aporte em ${current.status}.`,
      );
    }
    const [row] = await tx
      .update(contributions)
      .set({
        status: "depositado",
        depositedAmount: data.depositedAmount,
        depositedAt: data.depositedAt,
      })
      .where(and(eq(contributions.tenantId, ctx.tenantId), eq(contributions.id, current.id)))
      .returning();
    await recalcRaisedAmount(tx, ctx, row.projectId);
    await insertSystemActivity(tx, ctx, {
      subject: "Depósito confirmado",
      data: {
        from: current.status,
        to: "depositado",
        depositedAmount: data.depositedAmount,
        depositedAt: data.depositedAt,
      },
      leadId: row.leadId,
      projectId: row.projectId,
      contributionId: row.id,
    });
    return row;
  });
}

// Regra R-7: um aporte gera exatamente um recibo; número único por projeto (UNIQUE parcial).
export async function issueReceipt(ctx: Ctx, input: IssueReceiptInput): Promise<Contribution> {
  const data = issueReceiptSchema.parse(input);
  return db.transaction(async (tx) => {
    const current = await requireContribution(tx, ctx, data.contributionId);
    if (current.status === "recibo_emitido" || current.receiptNumber) {
      throw new DomainError("receipt_already_issued", "Este aporte já tem recibo emitido.");
    }
    if (current.status !== "depositado") {
      throw new ValidationError("O recibo só pode ser emitido depois do depósito confirmado.");
    }
    const [duplicate] = await tx
      .select({ id: contributions.id })
      .from(contributions)
      .where(
        and(
          eq(contributions.tenantId, ctx.tenantId),
          eq(contributions.projectId, current.projectId),
          eq(contributions.receiptNumber, data.receiptNumber),
        ),
      );
    if (duplicate) {
      throw new DomainError(
        "receipt_number_taken",
        `O recibo ${data.receiptNumber} já foi usado neste projeto.`,
      );
    }
    const [row] = await tx
      .update(contributions)
      .set({
        status: "recibo_emitido",
        receiptNumber: data.receiptNumber,
        receiptIssuedAt: data.receiptIssuedAt,
        receiptSentToAccountantAt: data.receiptSentToAccountantAt ?? null,
      })
      .where(and(eq(contributions.tenantId, ctx.tenantId), eq(contributions.id, current.id)))
      .returning();
    await insertSystemActivity(tx, ctx, {
      subject: "Recibo emitido",
      data: { from: "depositado", to: "recibo_emitido", receiptNumber: data.receiptNumber },
      leadId: row.leadId,
      projectId: row.projectId,
      contributionId: row.id,
    });
    return row;
  });
}

export async function markReceiptSentToAccountant(
  ctx: Ctx,
  contributionId: string,
  sentAt: string,
): Promise<Contribution> {
  const current = await requireContribution(db, ctx, contributionId);
  if (current.status !== "recibo_emitido") {
    throw new ValidationError("Só é possível registrar o envio ao contador com o recibo emitido.");
  }
  const [row] = await db
    .update(contributions)
    .set({ receiptSentToAccountantAt: sentAt })
    .where(and(eq(contributions.tenantId, ctx.tenantId), eq(contributions.id, contributionId)))
    .returning();
  return row;
}

export type RecordCommissionResult = {
  contribution: Contribution;
  // Avisos não bloqueantes (teto de R$ 150 mil por projeto e ano; limites não verificados).
  warnings: CommissionWarning[];
};

// Regra R-8: comissão limitada a 10% do depositado e à rubrica do projeto (bloqueantes); aviso
// quando a soma por projeto no ano passa de R$ 150 mil; só pode ser marcada paga com depósito
// confirmado (CHECK no banco). Os limites dependem do mecanismo do projeto (Rouanet; LIC-RS a
// verificar). A soma por ano usa o ano de `deposited_at` (teto por ano em planos plurianuais).
export async function recordCommission(
  ctx: Ctx,
  input: RecordCommissionInput,
): Promise<RecordCommissionResult> {
  const data = recordCommissionSchema.parse(input);
  return db.transaction(async (tx) => {
    const current = await requireContribution(tx, ctx, data.contributionId);
    if (!current.depositedAt || !current.depositedAmount) {
      throw new ValidationError("A comissão só pode ser registrada depois do depósito confirmado.");
    }
    const [project] = await tx
      .select({
        mechanism: culturalProjects.mechanism,
        fundraisingFeeAmount: culturalProjects.fundraisingFeeAmount,
        commissionPct: culturalProjects.commissionPct,
      })
      .from(culturalProjects)
      .where(
        and(
          eq(culturalProjects.tenantId, ctx.tenantId),
          eq(culturalProjects.id, current.projectId),
        ),
      );
    if (!project) throw new NotFoundError("Projeto", current.projectId);
    const depositYear = Number(current.depositedAt.slice(0, 4));
    const [sums] = await tx
      .select({
        project: sql<number>`coalesce(sum(${contributions.commissionDue}), 0)::float8`,
        period: sql<number>`coalesce(sum(case when extract(year from ${contributions.depositedAt}) = ${depositYear} then ${contributions.commissionDue} else 0 end), 0)::float8`,
      })
      .from(contributions)
      .where(
        and(
          eq(contributions.tenantId, ctx.tenantId),
          eq(contributions.projectId, current.projectId),
          ne(contributions.id, current.id),
          ne(contributions.status, "cancelado"),
        ),
      );
    const check = assertCommissionWithinLimits({
      mechanism: project.mechanism,
      depositedAmount: current.depositedAmount,
      commissionDue: data.commissionDue,
      projectCommissionSoFar: Number(sums?.project ?? 0),
      periodCommissionSoFar: Number(sums?.period ?? 0),
      fundraisingFeeAmount: project.fundraisingFeeAmount ?? null,
      contractedPercent: project.commissionPct ?? null,
    });
    const [row] = await tx
      .update(contributions)
      .set({
        commissionDue: data.commissionDue,
        commissionPaidAt: data.commissionPaidAt ?? current.commissionPaidAt,
      })
      .where(and(eq(contributions.tenantId, ctx.tenantId), eq(contributions.id, current.id)))
      .returning();
    await insertSystemActivity(tx, ctx, {
      subject: "Comissão registrada",
      data: {
        commissionDue: data.commissionDue,
        commissionPaidAt: data.commissionPaidAt ?? null,
        projectCommissionTotal: check.projectCommissionTotal,
        periodCommissionTotal: check.periodCommissionTotal,
        depositYear,
        warnings: check.warnings.map((w) => w.code),
      },
      leadId: row.leadId,
      projectId: row.projectId,
      contributionId: row.id,
    });
    return { contribution: row, warnings: check.warnings };
  });
}

export async function cancelContribution(
  ctx: Ctx,
  input: CancelContributionInput,
): Promise<Contribution> {
  const data = cancelContributionSchema.parse(input);
  return db.transaction(async (tx) => {
    const current = await requireContribution(tx, ctx, data.contributionId);
    if (current.status === "cancelado") return current;
    const wasRaised = RAISED_STATUSES.includes(current.status);
    if (wasRaised && !data.notes) {
      throw new ValidationError(
        "Cancelar um aporte já depositado exige uma nota explicando o motivo.",
      );
    }
    const [row] = await tx
      .update(contributions)
      .set({ status: "cancelado", lostReason: data.lostReason, notes: data.notes ?? current.notes })
      .where(and(eq(contributions.tenantId, ctx.tenantId), eq(contributions.id, current.id)))
      .returning();
    if (wasRaised) await recalcRaisedAmount(tx, ctx, row.projectId);
    await insertSystemActivity(tx, ctx, {
      subject: "Aporte cancelado",
      data: { from: current.status, to: "cancelado", reason: data.lostReason },
      leadId: row.leadId,
      projectId: row.projectId,
      contributionId: row.id,
    });
    return row;
  });
}

export async function getContribution(
  ctx: Ctx,
  contributionId: string,
): Promise<Contribution | null> {
  const [row] = await db
    .select()
    .from(contributions)
    .where(and(eq(contributions.tenantId, ctx.tenantId), eq(contributions.id, contributionId)));
  return row ?? null;
}

export async function listContributions(
  ctx: Ctx,
  filter: {
    projectId?: string;
    leadId?: string;
    status?: ContributionStatus[];
    limit?: number;
  } = {},
): Promise<Contribution[]> {
  const where: SQL[] = [eq(contributions.tenantId, ctx.tenantId)];
  if (filter.projectId) where.push(eq(contributions.projectId, filter.projectId));
  if (filter.leadId) where.push(eq(contributions.leadId, filter.leadId));
  if (filter.status?.length) where.push(inArray(contributions.status, filter.status));
  return db
    .select()
    .from(contributions)
    .where(and(...where))
    .orderBy(desc(contributions.createdAt))
    .limit(filter.limit ?? 200);
}

// ---------------------------------------------------------------------------------------------
// Telas do CRM (/app/aportes e bloco "Aportes do projeto"; proposta-c-simplicidade.md, 9.1).

export type ContributionSummary = Contribution & {
  leadName: string;
  leadSegment: string;
  projectName: string;
  projectMechanism: Contribution["mechanism"];
  orgName: string | null;
};

const summaryColumns = {
  ...getTableColumns(contributions),
  leadName: leads.name,
  leadSegment: leads.segment,
  projectName: culturalProjects.name,
  projectMechanism: culturalProjects.mechanism,
  orgName: organizations.name,
};

export async function listContributionSummaries(
  ctx: Ctx,
  filter: {
    projectId?: string;
    leadId?: string;
    status?: ContributionStatus[];
    // Previsão de fechamento entre as duas datas (YYYY-MM-DD), só proposta e termo_assinado.
    expectedBetween?: { from: string; to: string };
    limit?: number;
  } = {},
): Promise<ContributionSummary[]> {
  const where: SQL[] = [eq(contributions.tenantId, ctx.tenantId)];
  if (filter.projectId) where.push(eq(contributions.projectId, filter.projectId));
  if (filter.leadId) where.push(eq(contributions.leadId, filter.leadId));
  if (filter.status?.length) where.push(inArray(contributions.status, filter.status));
  if (filter.expectedBetween) {
    where.push(
      inArray(contributions.status, ["proposta", "termo_assinado"]),
      sql`${contributions.expectedCloseAt} between ${filter.expectedBetween.from} and ${filter.expectedBetween.to}`,
    );
  }
  const rows = await db
    .select(summaryColumns)
    .from(contributions)
    .innerJoin(leads, eq(leads.id, contributions.leadId))
    .innerJoin(culturalProjects, eq(culturalProjects.id, contributions.projectId))
    .leftJoin(organizations, eq(organizations.id, contributions.orgId))
    .where(and(...where))
    .orderBy(
      filter.expectedBetween
        ? sql`${contributions.expectedCloseAt} asc nulls last`
        : desc(contributions.createdAt),
    )
    .limit(filter.limit ?? 200);
  return rows.map((r) => ({ ...r, orgName: r.orgName ?? null }));
}

export async function getContributionSummary(
  ctx: Ctx,
  contributionId: string,
): Promise<ContributionSummary | null> {
  const [row] = await db
    .select(summaryColumns)
    .from(contributions)
    .innerJoin(leads, eq(leads.id, contributions.leadId))
    .innerJoin(culturalProjects, eq(culturalProjects.id, contributions.projectId))
    .leftJoin(organizations, eq(organizations.id, contributions.orgId))
    .where(and(eq(contributions.tenantId, ctx.tenantId), eq(contributions.id, contributionId)));
  return row ? { ...row, orgName: row.orgName ?? null } : null;
}

export type ContributionProjectTotals = {
  projectId: string;
  projectName: string;
  open: number; // proposta + termo_assinado (valor proposto)
  deposited: number; // depositado + recibo_emitido (valor depositado)
  commissionDue: number;
  count: number;
};

// Totais por projeto, somados no banco (R-5/R-6: nunca em JavaScript).
export async function contributionTotalsByProject(ctx: Ctx): Promise<ContributionProjectTotals[]> {
  const rows = await db
    .select({
      projectId: contributions.projectId,
      projectName: culturalProjects.name,
      open: sql<number>`coalesce(sum(case when ${contributions.status} in ('proposta', 'termo_assinado') then ${contributions.proposedAmount} else 0 end), 0)::float8`,
      deposited: sql<number>`coalesce(sum(case when ${contributions.status} in ('depositado', 'recibo_emitido') then ${contributions.depositedAmount} else 0 end), 0)::float8`,
      commissionDue: sql<number>`coalesce(sum(case when ${contributions.status} <> 'cancelado' then ${contributions.commissionDue} else 0 end), 0)::float8`,
      count: sql<number>`count(*) filter (where ${contributions.status} <> 'cancelado')::int`,
    })
    .from(contributions)
    .innerJoin(culturalProjects, eq(culturalProjects.id, contributions.projectId))
    .where(eq(contributions.tenantId, ctx.tenantId))
    .groupBy(contributions.projectId, culturalProjects.name)
    .orderBy(culturalProjects.name);
  return rows.map((r) => ({
    ...r,
    open: Number(r.open),
    deposited: Number(r.deposited),
    commissionDue: Number(r.commissionDue),
  }));
}

export type SponsorLeadOption = {
  id: string;
  name: string;
  email: string;
  segment: string;
  orgId: string | null;
  orgName: string | null;
  stage: string;
};

// Busca por nome ou e-mail entre leads PJ e PF do tenant (criação de aporte).
export async function searchSponsorLeads(
  ctx: Ctx,
  query: string,
  limit = 10,
): Promise<SponsorLeadOption[]> {
  const term = `%${query.trim()}%`;
  const rows = await db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      segment: leads.segment,
      orgId: leads.orgId,
      orgName: organizations.name,
      stage: leads.stage,
    })
    .from(leads)
    .leftJoin(organizations, eq(organizations.id, leads.orgId))
    .where(
      and(
        eq(leads.tenantId, ctx.tenantId),
        inArray(leads.segment, ["PJ", "PF"]),
        sql`(${leads.name} ilike ${term} or ${leads.email} ilike ${term})`,
      ),
    )
    .orderBy(leads.name)
    .limit(limit);
  return rows.map((r) => ({ ...r, orgName: r.orgName ?? null }));
}

// Empresa patrocinadora do aporte (modelo-de-dados.md, 3.9); obrigatória para PJ antes do termo.
export async function setContributionSponsorOrg(
  ctx: Ctx,
  contributionId: string,
  orgId: string,
): Promise<Contribution> {
  const current = await requireContribution(db, ctx, contributionId);
  if (current.status === "cancelado") {
    throw new ValidationError("Não é possível alterar um aporte cancelado.");
  }
  await requireOrganization(ctx, orgId);
  const [row] = await db
    .update(contributions)
    .set({ orgId })
    .where(and(eq(contributions.tenantId, ctx.tenantId), eq(contributions.id, current.id)))
    .returning();
  return row;
}

// Pré-requisitos de cada passo do fluxo, em português, para o botão explicar o que falta.
export type ContributionStep =
  | "assinar_termo"
  | "confirmar_deposito"
  | "emitir_recibo"
  | "enviar_contador"
  | "registrar_comissao"
  | "cancelar";

export async function contributionStepBlockers(
  ctx: Ctx,
  contribution: ContributionSummary,
): Promise<Record<ContributionStep, string[]>> {
  const blockers: Record<ContributionStep, string[]> = {
    assinar_termo: [],
    confirmar_deposito: [],
    emitir_recibo: [],
    enviar_contador: [],
    registrar_comissao: [],
    cancelar: [],
  };
  const s = contribution.status;
  if (s === "cancelado") {
    for (const key of Object.keys(blockers) as ContributionStep[])
      blockers[key].push("aporte cancelado");
    return blockers;
  }
  if (s !== "proposta") blockers.assinar_termo.push("o termo já foi registrado");
  if (contribution.leadSegment === "PJ") {
    const orgId = contribution.orgId;
    let cnpj: string | null = null;
    if (orgId) {
      const [org] = await db
        .select({ cnpj: organizations.cnpj })
        .from(organizations)
        .where(and(eq(organizations.tenantId, ctx.tenantId), eq(organizations.id, orgId)));
      cnpj = org?.cnpj ?? null;
    }
    if (!orgId) blockers.assinar_termo.push("empresa patrocinadora (organização) no aporte");
    else if (!cnpj) blockers.assinar_termo.push("CNPJ da empresa patrocinadora");
  }
  if (s === "proposta") blockers.confirmar_deposito.push("termo assinado (data da assinatura)");
  if (s === "depositado" || s === "recibo_emitido")
    blockers.confirmar_deposito.push("depósito já confirmado");
  if (s !== "depositado") {
    blockers.emitir_recibo.push(
      s === "recibo_emitido" ? "recibo já emitido" : "depósito confirmado (data e valor)",
    );
  }
  if (s !== "recibo_emitido") blockers.enviar_contador.push("recibo emitido (número e data)");
  else if (contribution.receiptSentToAccountantAt)
    blockers.enviar_contador.push("envio já registrado");
  if (!contribution.depositedAt || !contribution.depositedAmount) {
    blockers.registrar_comissao.push("depósito confirmado (regra R-8)");
  }
  return blockers;
}
