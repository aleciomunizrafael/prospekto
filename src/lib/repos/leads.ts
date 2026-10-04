import "server-only";
import {
  aliasedTable,
  and,
  type AnyColumn,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  isNull,
  lt,
  lte,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db, type Db } from "@/lib/db";
import {
  activities,
  contacts,
  contributions,
  culturalProjects,
  leads,
  organizations,
  users,
} from "@/lib/db/schema";
import {
  INITIAL_STAGES,
  PIPELINES,
  TERMINAL_STAGES,
  isPipeline,
  isStageOf,
  pipelineForSegment,
  requirementsForMove,
  stageIndex,
  stageMoveKind,
  type Pipeline,
} from "@/lib/domain/pipelines";
import { scoreLead } from "@/lib/domain/scoring";
import { MissingFieldsError, NotFoundError, ValidationError } from "@/lib/errors";
import { createActivitySchema, type CreateActivityInput } from "@/lib/validation/activities";
import { parseAttributes } from "@/lib/validation/lead-attributes";
import {
  createLeadSchema,
  listLeadsSchema,
  moveLeadStageSchema,
  updateLeadSchema,
  type CreateLeadInput,
  type ListLeadsInput,
  type MoveLeadStageInput,
  type UpdateLeadInput,
} from "@/lib/validation/leads";
import { insertSystemActivity, type Activity } from "./activities";
import { insertConsent } from "./consents";
import { getOpenContributionForLead, recalcRaisedAmount } from "./contributions";
import type { Ctx } from "./ctx";
import { collectProjectMissing, getProjectWithBalance } from "./projects";

export type Lead = typeof leads.$inferSelect;

// Regra R-2: reenvio do mesmo e-mail e segmento em 10 minutos responde sucesso sem gravar.
export const DEDUP_WINDOW_MS = 10 * 60 * 1000;

export type CreateLeadResult = { lead: Lead; created: boolean; deduplicated: boolean };

async function requireLead(tx: Db, ctx: Ctx, leadId: string): Promise<Lead> {
  const [row] = await tx
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.id, leadId)));
  if (!row) throw new NotFoundError("Lead", leadId);
  return row;
}

// Filtro padrão de toda escrita: tenant e id (ADR-001, "toda consulta filtra por tenant_id").
function leadScope(ctx: Ctx, leadId: string) {
  return and(eq(leads.tenantId, ctx.tenantId), eq(leads.id, leadId));
}

function contributionScope(ctx: Ctx, contributionId: string) {
  return and(eq(contributions.tenantId, ctx.tenantId), eq(contributions.id, contributionId));
}

// Junções das listas e do detalhe sempre restritas ao tenant (ADR-001): um org_id, owner_user_id
// ou project_interest_id apontando para outro tenant nunca devolve nome, CNPJ ou projeto alheio.
function orgJoin(ctx: Ctx, table: typeof organizations, column: AnyColumn) {
  return and(eq(table.id, column), eq(table.tenantId, ctx.tenantId));
}
function ownerJoin(ctx: Ctx) {
  return and(eq(users.id, leads.ownerUserId), eq(users.tenantId, ctx.tenantId));
}

// Referências gravadas em leads (org_id, contact_id, owner_user_id) precisam pertencer ao tenant;
// contact_id também precisa ser contato da organização do lead.
async function assertLeadReferences(
  tx: Db,
  ctx: Ctx,
  current: Lead,
  data: { orgId?: string | null; contactId?: string | null; ownerUserId?: string | null },
): Promise<void> {
  if (data.orgId) {
    const [org] = await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(eq(organizations.tenantId, ctx.tenantId), eq(organizations.id, data.orgId)));
    if (!org) throw new NotFoundError("Organização", data.orgId);
  }
  if (data.contactId) {
    const [contact] = await tx
      .select({ orgId: contacts.orgId })
      .from(contacts)
      .where(and(eq(contacts.tenantId, ctx.tenantId), eq(contacts.id, data.contactId)));
    if (!contact) throw new NotFoundError("Contato", data.contactId);
    const orgId = data.orgId === undefined ? current.orgId : data.orgId;
    if (!orgId || contact.orgId !== orgId) {
      throw new ValidationError("O contato não pertence à organização do lead.");
    }
  }
  if (data.ownerUserId) {
    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, ctx.tenantId), eq(users.id, data.ownerUserId)));
    if (!user) throw new ValidationError("O responsável informado não é usuário deste tenant.");
  }
}

export async function getLead(ctx: Ctx, leadId: string): Promise<Lead | null> {
  const [row] = await db.select().from(leads).where(leadScope(ctx, leadId));
  return row ?? null;
}

export async function getLeadByEmail(
  ctx: Ctx,
  email: string,
  segment: Lead["segment"],
): Promise<Lead | null> {
  const [row] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.tenantId, ctx.tenantId),
        eq(leads.email, email.trim().toLowerCase()),
        eq(leads.segment, segment),
      ),
    );
  return row ?? null;
}

// Momento do último formulário recebido do lead (activities.formulario); null se nunca houve.
async function lastFormSubmittedAt(tx: Db, ctx: Ctx, leadId: string): Promise<Date | null> {
  const [row] = await tx
    .select({ occurredAt: activities.occurredAt })
    .from(activities)
    .where(
      and(
        eq(activities.tenantId, ctx.tenantId),
        eq(activities.leadId, leadId),
        eq(activities.type, "formulario"),
      ),
    )
    .orderBy(desc(activities.occurredAt))
    .limit(1);
  return row?.occurredAt ?? null;
}

// Regra R-1 (lead + consentimentos + activities.formulario na mesma transação) e R-2 (dedup).
export async function createLead(
  ctx: Ctx,
  input: CreateLeadInput,
  now: Date = new Date(),
): Promise<CreateLeadResult> {
  const data = createLeadSchema.parse(input);
  const attributes = parseAttributes(data.segment, data.attributes);
  const pipeline = pipelineForSegment(data.segment);
  const { consents: consentInputs, formData, ...fields } = data;

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, ctx.tenantId),
          eq(leads.email, data.email),
          eq(leads.segment, data.segment),
        ),
      );

    if (existing) {
      // A janela de 10 minutos é medida pelo último formulário recebido, não por updated_at
      // (que avança em qualquer edição no CRM).
      const lastForm = (await lastFormSubmittedAt(tx, ctx, existing.id)) ?? existing.createdAt;
      if (now.getTime() - lastForm.getTime() < DEDUP_WINDOW_MS) {
        return { lead: existing, created: false, deduplicated: true };
      }
      const mergedAttributes = { ...existing.attributes, ...attributes };
      const mergedTags = [...new Set([...existing.tags, ...fields.tags])];
      const scored = scoreLead(existing.segment, existing.source, mergedAttributes, now);
      const [updated] = await tx
        .update(leads)
        .set({
          name: fields.name,
          phone: fields.phone || existing.phone,
          city: fields.city ?? existing.city,
          uf: fields.uf ?? existing.uf,
          message: fields.message ?? existing.message,
          interest: fields.interest,
          sourceDetail: fields.sourceDetail ?? existing.sourceDetail,
          utmSource: fields.utmSource ?? existing.utmSource,
          utmMedium: fields.utmMedium ?? existing.utmMedium,
          utmCampaign: fields.utmCampaign ?? existing.utmCampaign,
          referrer: fields.referrer ?? existing.referrer,
          landingPath: fields.landingPath ?? existing.landingPath,
          guideVersion: fields.guideVersion ?? existing.guideVersion,
          projectInterestId: fields.projectInterestId ?? existing.projectInterestId,
          tags: mergedTags,
          attributes: mergedAttributes,
          score: scored.score,
          temperature: scored.temperature,
          // stage nunca é rebaixado por formulário (regra R-2).
        })
        .where(leadScope(ctx, existing.id))
        .returning();
      for (const c of consentInputs) await insertConsent(tx, ctx, updated.id, c);
      await insertSystemActivity(tx, ctx, {
        type: "formulario",
        subject: `Formulário reenviado (${data.source})`,
        data: formData ?? { source: data.source, sourceDetail: data.sourceDetail ?? null },
        leadId: updated.id,
        occurredAt: now,
      });
      if (scored.score !== existing.score) {
        await insertSystemActivity(tx, ctx, {
          subject: "Score recalculado",
          data: {
            from: existing.score,
            to: scored.score,
            reason: "score",
            breakdown: scored.breakdown,
          },
          leadId: updated.id,
        });
      }
      return { lead: updated, created: false, deduplicated: false };
    }

    const scored = scoreLead(data.segment, data.source, attributes, now);
    const [created] = await tx
      .insert(leads)
      .values({
        ...fields,
        phone: fields.phone || null,
        tenantId: ctx.tenantId,
        pipeline,
        stage: INITIAL_STAGES[pipeline],
        stageEnteredAt: now,
        attributes,
        score: scored.score,
        temperature: scored.temperature,
      })
      .returning();
    for (const c of consentInputs) await insertConsent(tx, ctx, created.id, c);
    await insertSystemActivity(tx, ctx, {
      type: "formulario",
      subject: `Formulário recebido (${data.source})`,
      data: formData ?? { source: data.source, sourceDetail: data.sourceDetail ?? null },
      leadId: created.id,
      occurredAt: now,
    });
    return { lead: created, created: true, deduplicated: false };
  });
}

export async function listLeads(ctx: Ctx, input: ListLeadsInput = {}): Promise<Lead[]> {
  const f = listLeadsSchema.parse(input);
  const where: SQL[] = [eq(leads.tenantId, ctx.tenantId)];
  if (f.pipeline) where.push(eq(leads.pipeline, f.pipeline));
  if (f.stage) where.push(eq(leads.stage, f.stage));
  if (f.segment) where.push(eq(leads.segment, f.segment));
  if (f.ownerUserId) where.push(eq(leads.ownerUserId, f.ownerUserId));
  if (f.overdueAt) where.push(lt(leads.nextActionAt, f.overdueAt));
  return db
    .select()
    .from(leads)
    .where(and(...where))
    .orderBy(desc(leads.createdAt))
    .limit(f.limit)
    .offset(f.offset);
}

export async function updateLead(ctx: Ctx, input: UpdateLeadInput): Promise<Lead> {
  const { leadId, ...data } = updateLeadSchema.parse(input);
  return db.transaction(async (tx) => {
    const current = await requireLead(tx, ctx, leadId);
    await assertLeadReferences(tx, ctx, current, data);
    const attributes = data.attributes
      ? parseAttributes(current.segment, { ...current.attributes, ...data.attributes })
      : current.attributes;
    const scored = scoreLead(current.segment, current.source, attributes, new Date());
    const [row] = await tx
      .update(leads)
      .set({
        ...data,
        phone: data.phone === "" ? null : data.phone,
        attributes,
        score: scored.score,
        temperature: scored.temperature,
      })
      .where(leadScope(ctx, current.id))
      .returning();
    if (data.ownerUserId !== undefined && data.ownerUserId !== current.ownerUserId) {
      await insertSystemActivity(tx, ctx, {
        subject: "Responsável alterado",
        data: { from: current.ownerUserId, to: data.ownerUserId, reason: "owner" },
        leadId: row.id,
      });
    }
    if (scored.score !== current.score) {
      await insertSystemActivity(tx, ctx, {
        subject: "Score recalculado",
        data: {
          from: current.score,
          to: scored.score,
          reason: "score",
          breakdown: scored.breakdown,
        },
        leadId: row.id,
      });
    }
    return row;
  });
}

async function getOrgCnpj(tx: Db, ctx: Ctx, orgId: string | null): Promise<string | null> {
  if (!orgId) return null;
  const [org] = await tx
    .select({ cnpj: organizations.cnpj })
    .from(organizations)
    .where(and(eq(organizations.tenantId, ctx.tenantId), eq(organizations.id, orgId)));
  return org?.cnpj ?? null;
}

// Regras R-3, R-4, R-6, R-7 e R-10 e campos obrigatórios de pipelines.ts (modelo-de-dados.md, 4.2).
export async function moveLeadStage(ctx: Ctx, input: MoveLeadStageInput): Promise<Lead> {
  const data = moveLeadStageSchema.parse(input);
  return db.transaction(async (tx) => {
    const lead = await requireLead(tx, ctx, data.leadId);
    const pipeline = lead.pipeline as Pipeline;
    if (!isStageOf(pipeline, data.to)) {
      throw new ValidationError(`O estágio ${data.to} não existe no pipeline ${pipeline}.`);
    }
    if (lead.stage === data.to) throw new ValidationError(`O lead já está em ${data.to}.`);
    // Só os destinos de allowedStageMoves: próximo, retorno do playbook, voltar um estágio (com
    // motivo), perdido de qualquer estágio e reativar. Sem saltos (novo -> aporte).
    const kind = stageMoveKind(pipeline, lead.stage, data.to);
    if (!kind) {
      throw new ValidationError(
        `Não é possível mover de ${lead.stage} para ${data.to}: avance um estágio por vez ou marque como perdido.`,
      );
    }
    if (kind === "back" && !data.reason) {
      throw new ValidationError("Voltar um estágio exige o motivo da correção.");
    }
    await assertLeadReferences(tx, ctx, lead, { ownerUserId: data.ownerUserId });

    const fields = new Set(
      requirementsForMove(pipeline, lead.stage, data.to).flatMap((r) => r.fields),
    );
    const missing: string[] = [];
    const ownerUserId = data.ownerUserId ?? lead.ownerUserId;
    const nextActionAt = data.nextActionAt ?? lead.nextActionAt;

    if (fields.has("owner_user_id") && !ownerUserId) missing.push("responsável pelo lead");
    if (fields.has("next_action_at") && !nextActionAt) missing.push("data da próxima ação");
    if (fields.has("lost_reason")) {
      if (!data.lostReason) missing.push("motivo de perda");
      else if (data.lostReason === "outro" && !data.lostReasonDetail)
        missing.push("detalhe do motivo (outro)");
    }
    // Regra R-10: checagem do art. 27 com data e quem checou.
    if (fields.has("lead.attributes.vinculo_art27_checado")) {
      const a = lead.attributes;
      if (a.vinculo_art27_checado !== true) {
        missing.push("checagem de vínculo do art. 27 (vinculo_art27_checado)");
      } else {
        const em = typeof a.vinculo_art27_checado_em === "string" ? a.vinculo_art27_checado_em : "";
        if (!em || Number.isNaN(Date.parse(em)))
          missing.push("data da checagem do art. 27 (vinculo_art27_checado_em)");
        if (!a.vinculo_art27_checado_por)
          missing.push("quem checou o art. 27 (vinculo_art27_checado_por)");
      }
    }
    if (fields.has("organization.cnpj_when_pj") && lead.segment === "PJ") {
      if (!(await getOrgCnpj(tx, ctx, lead.orgId))) missing.push("CNPJ da empresa patrocinadora");
    }

    // Lead PROP no pipeline projetos: os campos `project.*` são lidos do projeto do lead.
    const needsProject = [...fields].some((f) => f.startsWith("project."));
    if (needsProject) {
      const project = lead.projectId ? await getProjectWithBalance(tx, ctx, lead.projectId) : null;
      if (!project) missing.push("projeto cadastrado para o lead (crie o projeto na avaliação)");
      else missing.push(...collectProjectMissing(project, fields));
    }

    const needsContribution = [...fields].some((f) => f.startsWith("contribution."));
    const contribution = needsContribution
      ? await getOpenContributionForLead(tx, ctx, lead.id)
      : null;
    let contributionOrgId: string | null = contribution?.orgId ?? null;
    if (needsContribution) {
      if (!contribution) {
        missing.push("proposta de aporte (projeto e valor)");
      } else {
        if (
          (fields.has("contribution.project_id") || fields.has("contribution.proposed_amount")) &&
          !(contribution.status === "proposta" && contribution.proposedAmount > 0)
        ) {
          missing.push("proposta de aporte em aberto com projeto e valor");
        }
        if (fields.has("contribution.new_proposal") && contribution.status !== "proposta") {
          missing.push("nova proposta de aporte para o período seguinte");
        }
        if (fields.has("contribution.term_signed_at") && !contribution.termSignedAt)
          missing.push("data de assinatura do termo");
        if (fields.has("contribution.bank_details_sent_at") && !contribution.bankDetailsSentAt) {
          missing.push("data de envio dos dados bancários");
        }
        // modelo-de-dados.md, 3.9: org_id obrigatório para PJ em termo_assinado (com CNPJ).
        if (fields.has("contribution.org_id_when_pj") && lead.segment === "PJ") {
          contributionOrgId = contribution.orgId ?? lead.orgId;
          if (!contributionOrgId) missing.push("empresa patrocinadora do aporte");
          else if (!(await getOrgCnpj(tx, ctx, contributionOrgId)))
            missing.push("CNPJ da empresa patrocinadora do aporte");
        }
        if (fields.has("contribution.deposited_at") && !contribution.depositedAt)
          missing.push("data do depósito");
        if (
          fields.has("contribution.deposited_amount") &&
          !(contribution.depositedAmount && contribution.depositedAmount > 0)
        ) {
          missing.push("valor depositado maior que zero");
        }
        if (fields.has("contribution.receipt_number") && !contribution.receiptNumber)
          missing.push("número do recibo");
        if (fields.has("contribution.receipt_issued_at") && !contribution.receiptIssuedAt)
          missing.push("data do recibo");
        if (
          fields.has("contribution.receipt_sent_to_accountant_at") &&
          !contribution.receiptSentToAccountantAt
        ) {
          missing.push("data de envio do recibo ao contador");
        }
      }
    }
    if (missing.length)
      throw new MissingFieldsError(missing, `mover o lead de ${lead.stage} para ${data.to}`);

    // Efeitos no aporte ao sair de termo, aporte e recibo (modelo-de-dados.md, 4.2).
    if (contribution) {
      if (fields.has("contribution.term_signed_at") && contribution.status === "proposta") {
        await tx
          .update(contributions)
          .set({ status: "termo_assinado", orgId: contributionOrgId })
          .where(contributionScope(ctx, contribution.id));
      }
      if (
        fields.has("contribution.deposited_at") &&
        contribution.status !== "depositado" &&
        contribution.status !== "recibo_emitido"
      ) {
        await tx
          .update(contributions)
          .set({ status: "depositado" })
          .where(contributionScope(ctx, contribution.id));
        await recalcRaisedAmount(tx, ctx, contribution.projectId);
      }
      if (fields.has("contribution.receipt_number") && contribution.status !== "recibo_emitido") {
        await tx
          .update(contributions)
          .set({ status: "recibo_emitido" })
          .where(contributionScope(ctx, contribution.id));
      }
    }

    const terminal = fields.has("lost_reason");
    const now = new Date();
    const [row] = await tx
      .update(leads)
      .set({
        stage: data.to,
        stageEnteredAt: now,
        ownerUserId,
        nextActionAt: terminal ? null : nextActionAt,
        lostReason: terminal ? data.lostReason : null,
        lostReasonDetail: terminal ? (data.lostReasonDetail ?? null) : null,
        lastContactAt: now,
      })
      .where(leadScope(ctx, lead.id))
      .returning();
    await insertSystemActivity(tx, ctx, {
      subject: `Estágio alterado de ${lead.stage} para ${data.to}`,
      data: {
        from: lead.stage,
        to: data.to,
        reason: data.lostReason ?? data.reason ?? null,
        direction:
          stageIndex(pipeline, data.to) > stageIndex(pipeline, lead.stage) ? "avanco" : "retorno",
      },
      leadId: row.id,
    });
    if (ownerUserId !== lead.ownerUserId) {
      await insertSystemActivity(tx, ctx, {
        subject: "Responsável definido",
        data: { from: lead.ownerUserId, to: ownerUserId, reason: "owner" },
        leadId: row.id,
      });
    }
    return row;
  });
}

// ---------------------------------------------------------------------------------------------
// Consultas das telas do CRM (tela "Hoje", lista e detalhe; proposta-c-simplicidade.md, seção 9).
// ---------------------------------------------------------------------------------------------

const NON_TERMINAL_STAGES_EXCLUDED = [...new Set(Object.values(TERMINAL_STAGES))];

export type LeadListRow = Lead & { orgName: string | null; ownerName: string | null };

const leadListColumns = {
  ...getTableColumns(leads),
  orgName: organizations.name,
  ownerName: users.name,
};

export type SearchLeadsInput = {
  pipeline?: Pipeline;
  stage?: string;
  segment?: Lead["segment"];
  temperature?: Lead["temperature"];
  source?: Lead["source"];
  ownerUserId?: string;
  search?: string;
  includeLost?: boolean;
  sort?: "next_action" | "created";
  page?: number;
  pageSize?: number;
};

// Lista paginada com filtros e busca por nome, e-mail, empresa (attributes) ou organização.
export async function searchLeads(
  ctx: Ctx,
  input: SearchLeadsInput = {},
): Promise<{ rows: LeadListRow[]; total: number }> {
  const pageSize = Math.min(Math.max(input.pageSize ?? 25, 1), 100);
  const page = Math.max(input.page ?? 1, 1);
  const where: SQL[] = [eq(leads.tenantId, ctx.tenantId)];
  if (input.pipeline) where.push(eq(leads.pipeline, input.pipeline));
  if (input.stage) where.push(eq(leads.stage, input.stage));
  if (input.segment) where.push(eq(leads.segment, input.segment));
  if (input.temperature) where.push(eq(leads.temperature, input.temperature));
  if (input.source) where.push(eq(leads.source, input.source));
  if (input.ownerUserId) where.push(eq(leads.ownerUserId, input.ownerUserId));
  if (!input.includeLost && !input.stage) {
    where.push(notInArray(leads.stage, NON_TERMINAL_STAGES_EXCLUDED));
  }
  if (input.search) {
    const term = `%${input.search.replace(/[%_]/g, "")}%`;
    where.push(
      or(
        ilike(leads.name, term),
        ilike(leads.email, term),
        ilike(organizations.name, term),
        sql`coalesce(${leads.attributes}->>'empresa', ${leads.attributes}->>'escritorio', ${leads.attributes}->>'municipio', ${leads.attributes}->>'proponente', '') ilike ${term}`,
      )!,
    );
  }
  const orderBy =
    input.sort === "created"
      ? [desc(leads.createdAt)]
      : [sql`${leads.nextActionAt} asc nulls last`, desc(leads.createdAt)];
  const [rows, [{ total }]] = await Promise.all([
    db
      .select(leadListColumns)
      .from(leads)
      .leftJoin(organizations, orgJoin(ctx, organizations, leads.orgId))
      .leftJoin(users, ownerJoin(ctx))
      .where(and(...where))
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(leads)
      .leftJoin(organizations, orgJoin(ctx, organizations, leads.orgId))
      .where(and(...where)),
  ]);
  return { rows, total: Number(total) };
}

// Contagem de leads não terminais por pipeline (abas de /app/leads).
export async function countLeadsByPipeline(ctx: Ctx): Promise<Record<Pipeline, number>> {
  const rows = await db
    .select({ pipeline: leads.pipeline, total: count() })
    .from(leads)
    .where(
      and(eq(leads.tenantId, ctx.tenantId), notInArray(leads.stage, NON_TERMINAL_STAGES_EXCLUDED)),
    )
    .groupBy(leads.pipeline);
  const out = Object.fromEntries(PIPELINES.map((p) => [p, 0])) as Record<Pipeline, number>;
  for (const r of rows) if (isPipeline(r.pipeline)) out[r.pipeline] = Number(r.total);
  return out;
}

function initialStageCondition(): SQL {
  return or(
    ...PIPELINES.map((p) => and(eq(leads.pipeline, p), eq(leads.stage, INITIAL_STAGES[p]))!),
  )!;
}

// Leads no estágio inicial ainda sem contato registrado (tela "Hoje", bloco 1; regra R-13).
export async function listNewLeadsWithoutContact(ctx: Ctx, limit = 20): Promise<LeadListRow[]> {
  return db
    .select(leadListColumns)
    .from(leads)
    .leftJoin(organizations, orgJoin(ctx, organizations, leads.orgId))
    .leftJoin(users, ownerJoin(ctx))
    .where(
      and(eq(leads.tenantId, ctx.tenantId), initialStageCondition(), isNull(leads.lastContactAt)),
    )
    .orderBy(leads.stageEnteredAt)
    .limit(limit);
}

// Próximas ações vencidas em estágios não terminais, da mais atrasada à menos (regra R-13).
export async function listOverdueLeads(ctx: Ctx, now: Date, limit = 20): Promise<LeadListRow[]> {
  return db
    .select(leadListColumns)
    .from(leads)
    .leftJoin(organizations, orgJoin(ctx, organizations, leads.orgId))
    .leftJoin(users, ownerJoin(ctx))
    .where(
      and(
        eq(leads.tenantId, ctx.tenantId),
        lt(leads.nextActionAt, now),
        notInArray(leads.stage, NON_TERMINAL_STAGES_EXCLUDED),
      ),
    )
    .orderBy(leads.nextActionAt)
    .limit(limit);
}

// Próximas ações num intervalo (próximos 7 dias; leads em `aporte` nos próximos 15 dias).
export async function listLeadsWithNextActionBetween(
  ctx: Ctx,
  from: Date,
  to: Date,
  filter: { stage?: string; limit?: number } = {},
): Promise<LeadListRow[]> {
  const where: SQL[] = [
    eq(leads.tenantId, ctx.tenantId),
    gte(leads.nextActionAt, from),
    lte(leads.nextActionAt, to),
    notInArray(leads.stage, NON_TERMINAL_STAGES_EXCLUDED),
  ];
  if (filter.stage) where.push(eq(leads.stage, filter.stage));
  return db
    .select(leadListColumns)
    .from(leads)
    .leftJoin(organizations, orgJoin(ctx, organizations, leads.orgId))
    .leftJoin(users, ownerJoin(ctx))
    .where(and(...where))
    .orderBy(leads.nextActionAt)
    .limit(filter.limit ?? 20);
}

export type LeadDetail = LeadListRow & {
  orgCnpj: string | null;
  referredByOrgName: string | null;
  projectInterestName: string | null;
};

export async function getLeadDetail(ctx: Ctx, leadId: string): Promise<LeadDetail | null> {
  const referredBy = aliasedTable(organizations, "referred_by");
  const [row] = await db
    .select({
      ...leadListColumns,
      orgCnpj: organizations.cnpj,
      referredByOrgName: referredBy.name,
      projectInterestName: culturalProjects.name,
    })
    .from(leads)
    .leftJoin(organizations, orgJoin(ctx, organizations, leads.orgId))
    .leftJoin(users, ownerJoin(ctx))
    .leftJoin(referredBy, orgJoin(ctx, referredBy, leads.referredByOrgId))
    .leftJoin(
      culturalProjects,
      and(
        eq(culturalProjects.id, leads.projectInterestId),
        eq(culturalProjects.tenantId, ctx.tenantId),
      ),
    )
    .where(leadScope(ctx, leadId));
  return row ?? null;
}

// "Registrar atividade": grava a atividade e, na mesma transação, last_contact_at (contatos) e
// next_action_at do lead (proposta-c, seção 9.1).
export async function recordLeadActivity(
  ctx: Ctx,
  input: {
    leadId: string;
    activity: Omit<CreateActivityInput, "leadId">;
    nextActionAt?: Date | null;
    touchLastContact?: boolean;
  },
): Promise<{ activity: Activity; lead: Lead }> {
  const activityInput = createActivitySchema.parse({ ...input.activity, leadId: input.leadId });
  return db.transaction(async (tx) => {
    const current = await requireLead(tx, ctx, input.leadId);
    const [activity] = await tx
      .insert(activities)
      .values({
        tenantId: ctx.tenantId,
        type: activityInput.type,
        subject: activityInput.subject,
        body: activityInput.body ?? null,
        data: activityInput.data ?? null,
        occurredAt: activityInput.occurredAt ?? new Date(),
        dueAt: activityInput.dueAt ?? null,
        doneAt: activityInput.doneAt ?? null,
        leadId: current.id,
        ownerUserId: activityInput.ownerUserId ?? ctx.userId ?? null,
        createdByUserId: ctx.userId ?? null,
      })
      .returning();
    const patch: Partial<typeof leads.$inferInsert> = {};
    if (input.touchLastContact) patch.lastContactAt = activityInput.occurredAt ?? new Date();
    if (input.nextActionAt !== undefined) patch.nextActionAt = input.nextActionAt;
    let lead = current;
    if (Object.keys(patch).length) {
      [lead] = await tx.update(leads).set(patch).where(leadScope(ctx, current.id)).returning();
    }
    return { activity, lead };
  });
}
