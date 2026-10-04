import "server-only";
import { and, desc, eq, getTableColumns, sql, type SQL } from "drizzle-orm";
import { db, type Db } from "@/lib/db";
import { culturalProjects, leads } from "@/lib/db/schema";
import { isStageOf, isTerminalStage, requirementsForMove } from "@/lib/domain/pipelines";
import { MissingFieldsError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  createProjectSchema,
  listProjectsSchema,
  moveProjectStageSchema,
  publishProjectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type ListProjectsInput,
  type MoveProjectStageInput,
  type PublishProjectInput,
  type UpdateProjectInput,
} from "@/lib/validation/projects";
import { insertSystemActivity } from "./activities";
import type { Ctx } from "./ctx";
import { requireOrganization } from "./organizations";

export type CulturalProject = typeof culturalProjects.$inferSelect;
// Regra R-5: saldo a captar calculado na consulta, nunca armazenado.
export type CulturalProjectWithBalance = CulturalProject & { balance: number | null };

// Convenção da seção 1 do modelo: somas e saldos calculados no banco, nunca em JavaScript.
const balanceExpr = sql<
  number | null
>`(${culturalProjects.approvedAmount} - ${culturalProjects.raisedAmount})::float8`;

const projectWithBalanceColumns = { ...getTableColumns(culturalProjects), balance: balanceExpr };

function withBalance<T extends CulturalProject & { balance: unknown }>(
  row: T,
): CulturalProjectWithBalance {
  return { ...row, balance: row.balance == null ? null : Number(row.balance) };
}

async function requireProject(tx: Db, ctx: Ctx, projectId: string): Promise<CulturalProject> {
  const [row] = await tx
    .select()
    .from(culturalProjects)
    .where(and(eq(culturalProjects.tenantId, ctx.tenantId), eq(culturalProjects.id, projectId)));
  if (!row) throw new NotFoundError("Projeto", projectId);
  return row;
}

// Projeto com o saldo calculado no banco; usada dentro de transações (leads.ts também).
export async function getProjectWithBalance(
  tx: Db,
  ctx: Ctx,
  projectId: string,
): Promise<CulturalProjectWithBalance | null> {
  const [row] = await tx
    .select(projectWithBalanceColumns)
    .from(culturalProjects)
    .where(and(eq(culturalProjects.tenantId, ctx.tenantId), eq(culturalProjects.id, projectId)));
  return row ? withBalance(row) : null;
}

async function requireProjectWithBalance(
  tx: Db,
  ctx: Ctx,
  projectId: string,
): Promise<CulturalProjectWithBalance> {
  const row = await getProjectWithBalance(tx, ctx, projectId);
  if (!row) throw new NotFoundError("Projeto", projectId);
  return row;
}

// Campos `project.*` de pipelines.ts que faltam no projeto (modelo-de-dados.md, 4.2). Compartilhada
// entre moveProjectStage e moveLeadStage (lead PROP no pipeline projetos).
export function collectProjectMissing(
  project: CulturalProjectWithBalance,
  fields: ReadonlySet<string>,
): string[] {
  const missing: string[] = [];
  if (fields.has("project.mechanism") && !project.mechanism) missing.push("mecanismo");
  if (fields.has("project.process_number") && !project.processNumber)
    missing.push("número do processo");
  if (fields.has("project.approved_amount") && project.approvedAmount == null)
    missing.push("valor aprovado");
  if (fields.has("project.fundraising_deadline") && !project.fundraisingDeadline)
    missing.push("prazo de captação");
  if (fields.has("project.fundraising_fee_amount") && project.fundraisingFeeAmount == null) {
    missing.push("rubrica de captação");
  }
  if (fields.has("project.balance_positive") && !(project.balance != null && project.balance > 0)) {
    missing.push("saldo a captar maior que zero");
  }
  if (fields.has("project.report_due_at") && !project.reportDueAt)
    missing.push("data limite do relatório");
  return missing;
}

export async function createProject(
  ctx: Ctx,
  input: CreateProjectInput,
): Promise<CulturalProjectWithBalance> {
  const data = createProjectSchema.parse(input);
  const proponent = await requireOrganization(ctx, data.proponentOrgId);
  if (proponent.type !== "proponente") {
    throw new ValidationError("A organização proponente precisa ser do tipo proponente.");
  }
  return db.transaction(async (tx) => {
    if (data.leadId) {
      const [lead] = await tx
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.id, data.leadId)));
      if (!lead) throw new NotFoundError("Lead", data.leadId);
    }
    const [row] = await tx
      .insert(culturalProjects)
      .values({ ...data, tenantId: ctx.tenantId })
      .returning({ id: culturalProjects.id });
    if (data.leadId) {
      await tx
        .update(leads)
        .set({ projectId: row.id })
        .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.id, data.leadId)));
    }
    const project = await requireProjectWithBalance(tx, ctx, row.id);
    await insertSystemActivity(tx, ctx, {
      subject: "Projeto criado",
      data: { stage: project.stage, mechanism: project.mechanism },
      projectId: project.id,
      leadId: project.leadId,
    });
    return project;
  });
}

export async function updateProject(
  ctx: Ctx,
  input: UpdateProjectInput,
): Promise<CulturalProjectWithBalance> {
  const { projectId, ...data } = updateProjectSchema.parse(input);
  if (data.proponentOrgId) await requireOrganization(ctx, data.proponentOrgId);
  const [row] = await db
    .update(culturalProjects)
    .set(data)
    .where(and(eq(culturalProjects.tenantId, ctx.tenantId), eq(culturalProjects.id, projectId)))
    .returning({ id: culturalProjects.id });
  if (!row) throw new NotFoundError("Projeto", projectId);
  return requireProjectWithBalance(db, ctx, projectId);
}

export async function getProject(
  ctx: Ctx,
  projectId: string,
): Promise<CulturalProjectWithBalance | null> {
  return getProjectWithBalance(db, ctx, projectId);
}

export async function getProjectBySlug(
  ctx: Ctx,
  slug: string,
): Promise<CulturalProjectWithBalance | null> {
  const [row] = await db
    .select(projectWithBalanceColumns)
    .from(culturalProjects)
    .where(and(eq(culturalProjects.tenantId, ctx.tenantId), eq(culturalProjects.slug, slug)));
  return row ? withBalance(row) : null;
}

export async function listProjects(
  ctx: Ctx,
  input: ListProjectsInput = {},
): Promise<CulturalProjectWithBalance[]> {
  const f = listProjectsSchema.parse(input);
  const where: SQL[] = [eq(culturalProjects.tenantId, ctx.tenantId)];
  if (f.stage) where.push(eq(culturalProjects.stage, f.stage));
  // Regra R-11: carteira pública só com captando + autorização de publicação.
  if (f.publishedOnly) {
    where.push(eq(culturalProjects.publishedOnSite, true), eq(culturalProjects.stage, "captando"));
  }
  const rows = await db
    .select(projectWithBalanceColumns)
    .from(culturalProjects)
    .where(and(...where))
    .orderBy(desc(culturalProjects.createdAt))
    .limit(f.limit)
    .offset(f.offset);
  return rows.map(withBalance);
}

// Movimento de estágio do pipeline `projetos` com os campos obrigatórios de pipelines.ts.
export async function moveProjectStage(
  ctx: Ctx,
  input: MoveProjectStageInput,
): Promise<CulturalProjectWithBalance> {
  const data = moveProjectStageSchema.parse(input);
  return db.transaction(async (tx) => {
    const project = await requireProjectWithBalance(tx, ctx, data.projectId);
    if (!isStageOf("projetos", data.to))
      throw new ValidationError(`Estágio ${data.to} não existe no pipeline projetos.`);
    if (project.stage === data.to) throw new ValidationError(`O projeto já está em ${data.to}.`);
    const fields = new Set(
      requirementsForMove("projetos", project.stage, data.to).flatMap((r) => r.fields),
    );
    const missing = collectProjectMissing(project, fields);
    // Regra R-3 aplicada ao projeto: sair de `prospeccao` exige responsável. `next_action_at`
    // não existe em cultural_projects (fica no lead PROP, validado em moveLeadStage).
    const ownerUserId = data.ownerUserId ?? project.ownerUserId;
    if (fields.has("owner_user_id") && !ownerUserId) missing.push("responsável pelo projeto");
    if (fields.has("lost_reason")) {
      if (!data.lostReason) missing.push("motivo do arquivamento");
      else if (data.lostReason === "outro" && !data.lostReasonDetail)
        missing.push("detalhe do motivo (outro)");
    }
    if (missing.length)
      throw new MissingFieldsError(missing, `mover o projeto de ${project.stage} para ${data.to}`);

    await tx
      .update(culturalProjects)
      .set({
        stage: data.to,
        stageEnteredAt: new Date(),
        ownerUserId,
        // Projeto arquivado sai da carteira pública.
        ...(isTerminalStage("projetos", data.to) ? { publishedOnSite: false } : {}),
      })
      .where(and(eq(culturalProjects.tenantId, ctx.tenantId), eq(culturalProjects.id, project.id)));
    const moved = await requireProjectWithBalance(tx, ctx, project.id);
    await insertSystemActivity(tx, ctx, {
      subject: `Projeto movido de ${project.stage} para ${data.to}`,
      data: {
        from: project.stage,
        to: data.to,
        reason: data.lostReason ?? data.reason ?? null,
        lostReasonDetail: data.lostReasonDetail ?? null,
      },
      projectId: moved.id,
      leadId: moved.leadId,
    });
    if (ownerUserId !== project.ownerUserId) {
      await insertSystemActivity(tx, ctx, {
        subject: "Responsável do projeto definido",
        data: { from: project.ownerUserId, to: ownerUserId, reason: "owner" },
        projectId: moved.id,
      });
    }
    return moved;
  });
}

// Regra R-11
export async function publishProject(
  ctx: Ctx,
  input: PublishProjectInput,
): Promise<CulturalProjectWithBalance> {
  const data = publishProjectSchema.parse(input);
  const project = await requireProject(db, ctx, data.projectId);
  if (project.stage !== "captando") {
    throw new ValidationError("Só projetos em captando podem ser publicados no site.");
  }
  await db
    .update(culturalProjects)
    .set({
      publishedOnSite: true,
      publishAuthorizedBy: data.publishAuthorizedBy,
      publishAuthorizedAt: data.publishAuthorizedAt,
    })
    .where(and(eq(culturalProjects.tenantId, ctx.tenantId), eq(culturalProjects.id, project.id)));
  return requireProjectWithBalance(db, ctx, project.id);
}

export async function unpublishProject(
  ctx: Ctx,
  projectId: string,
): Promise<CulturalProjectWithBalance> {
  await requireProject(db, ctx, projectId);
  await db
    .update(culturalProjects)
    .set({ publishedOnSite: false })
    .where(and(eq(culturalProjects.tenantId, ctx.tenantId), eq(culturalProjects.id, projectId)));
  return requireProjectWithBalance(db, ctx, projectId);
}
