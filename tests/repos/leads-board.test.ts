// Quadro de leads (ADR-004, 6.3; plano, frente A): colunas na ordem de STAGES sem o terminal,
// ordem por urgência dentro da coluna, contagem além do teto, soma dos aportes abertos só em
// patrocinadores, filtros compartilhados com a lista e isolamento entre tenants. PGlite real.
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { STAGES } from "@/lib/domain/pipelines";
import { cancelContribution, createContribution, signTerm } from "@/lib/repos/contributions";
import type { Ctx } from "@/lib/repos/ctx";
import { createLead, listLeadsBoard, moveLeadStage, type Lead } from "@/lib/repos/leads";
import { createOrganization } from "@/lib/repos/organizations";
import { createProject } from "@/lib/repos/projects";
import { makeTenant, makeUser, uniqueEmail } from "../helpers";

let ctx: Ctx;
let other: Ctx;
let owner: string;
let projectId: string;

const DAY = 24 * 60 * 60_000;
const now = new Date("2026-10-13T12:00:00Z");

async function newLead(
  c: Ctx,
  overrides: { name?: string; segment?: "PJ" | "PF" | "CONT"; source?: Lead["source"] } = {},
): Promise<Lead> {
  const { lead } = await createLead(c, {
    segment: overrides.segment ?? "PJ",
    interest: "rouanet",
    name: overrides.name ?? "Lead do quadro",
    email: uniqueEmail("board"),
    source: overrides.source ?? "indicacao_contador",
  });
  return lead;
}

async function setTiming(
  leadId: string,
  patch: { nextActionAt?: Date | null; stageEnteredAt?: Date },
): Promise<void> {
  await db.update(leads).set(patch).where(eq(leads.id, leadId));
}

async function advance(c: Ctx, lead: Lead, to: string): Promise<void> {
  await moveLeadStage(c, {
    leadId: lead.id,
    to,
    ownerUserId: owner,
    nextActionAt: new Date(now.getTime() + 3 * DAY),
  });
}

beforeAll(async () => {
  ctx = await makeTenant();
  other = await makeTenant();
  owner = await makeUser(ctx);
  const proponent = await createOrganization(ctx, { type: "proponente", name: "Produtora" });
  const project = await createProject(ctx, {
    proponentOrgId: proponent.id,
    name: "Festival de teste",
    slug: "festival-de-teste",
    mechanism: "rouanet_art18",
    stage: "captando",
    approvedAmount: 1_500_000,
    fundraisingFeeAmount: 150_000,
  });
  projectId = project.id;
});

describe("listLeadsBoard", () => {
  it("devolve uma coluna por estágio na ordem de STAGES, sem o terminal por padrão", async () => {
    const board = await listLeadsBoard(ctx, { pipeline: "patrocinadores" });
    expect(board.columns.map((c) => c.stage)).toEqual(
      STAGES.patrocinadores.filter((s) => s !== "perdido"),
    );
    const withLost = await listLeadsBoard(ctx, { pipeline: "patrocinadores", includeLost: true });
    expect(withLost.columns.map((c) => c.stage)).toEqual([...STAGES.patrocinadores]);
    const projects = await listLeadsBoard(ctx, { pipeline: "projetos" });
    expect(projects.columns.map((c) => c.stage)).toEqual(
      STAGES.projetos.filter((s) => s !== "arquivado"),
    );
    expect(projects.columns.every((c) => c.openAmount === null)).toBe(true);
  });

  it("ordena por next_action_at (nulos por último) e depois stage_entered_at; conta além do teto", async () => {
    const c = await makeTenant();
    const o = await makeUser(c);
    const late = await newLead(c, { name: "Ação vencida" });
    const soon = await newLead(c, { name: "Ação amanhã" });
    const none = await newLead(c, { name: "Sem ação, antigo" });
    const noneNew = await newLead(c, { name: "Sem ação, novo" });
    await setTiming(late.id, { nextActionAt: new Date(now.getTime() - DAY) });
    await setTiming(soon.id, { nextActionAt: new Date(now.getTime() + DAY) });
    await setTiming(none.id, {
      nextActionAt: null,
      stageEnteredAt: new Date(now.getTime() - 10 * DAY),
    });
    await setTiming(noneNew.id, { nextActionAt: null, stageEnteredAt: now });
    // Um lead noutro estágio não entra na coluna "novo".
    const moved = await newLead(c, { name: "Qualificado" });
    await moveLeadStage(c, {
      leadId: moved.id,
      to: "qualificado",
      ownerUserId: o,
      nextActionAt: now,
    });

    const board = await listLeadsBoard(c, { pipeline: "patrocinadores" });
    const novo = board.columns.find((col) => col.stage === "novo")!;
    expect(novo.rows.map((r) => r.name)).toEqual([
      "Ação vencida",
      "Ação amanhã",
      "Sem ação, antigo",
      "Sem ação, novo",
    ]);
    expect(novo.total).toBe(4);
    expect(
      board.columns.find((col) => col.stage === "qualificado")!.rows.map((r) => r.name),
    ).toEqual(["Qualificado"]);

    const capped = await listLeadsBoard(c, { pipeline: "patrocinadores", limitPerColumn: 1 });
    const cappedNovo = capped.columns.find((col) => col.stage === "novo")!;
    expect(cappedNovo.rows.map((r) => r.name)).toEqual(["Ação vencida"]);
    expect(cappedNovo.total).toBe(4);
  });

  it("openAmount soma só aportes em proposta ou termo assinado, e cada cartão traz o seu aporte aberto", async () => {
    const c = await makeTenant();
    const o = await makeUser(c);
    const proponent = await createOrganization(c, { type: "proponente", name: "Produtora 2" });
    const project = await createProject(c, {
      proponentOrgId: proponent.id,
      name: "Projeto do quadro",
      slug: "projeto-do-quadro",
      mechanism: "rouanet_art18",
      stage: "captando",
      approvedAmount: 1_500_000,
      fundraisingFeeAmount: 150_000,
    });
    const a = await newLead(c, { name: "Com proposta" });
    // Pessoa física: assinar o termo não exige organização com CNPJ.
    const b = await newLead(c, { name: "Com termo", segment: "PF", source: "indicacao_cliente" });
    const cancelled = await newLead(c, { name: "Aporte cancelado" });
    const none = await newLead(c, { name: "Sem aporte" });
    for (const lead of [a, b, cancelled, none]) {
      await moveLeadStage(c, {
        leadId: lead.id,
        to: "qualificado",
        ownerUserId: o,
        nextActionAt: now,
      });
    }
    await createContribution(c, {
      projectId: project.id,
      leadId: a.id,
      type: "patrocinio",
      mechanism: "rouanet_art18",
      proposedAmount: 100_000,
    });
    const termo = await createContribution(c, {
      projectId: project.id,
      leadId: b.id,
      type: "patrocinio",
      mechanism: "rouanet_art18",
      proposedAmount: 250_000,
    });
    await signTerm(c, { contributionId: termo.id, termSignedAt: "2026-10-01" });
    const dead = await createContribution(c, {
      projectId: project.id,
      leadId: cancelled.id,
      type: "patrocinio",
      mechanism: "rouanet_art18",
      proposedAmount: 999_999,
    });
    await cancelContribution(c, { contributionId: dead.id, lostReason: "sem_interesse" });

    const board = await listLeadsBoard(c, { pipeline: "patrocinadores" });
    const column = board.columns.find((col) => col.stage === "qualificado")!;
    expect(column.openAmount).toBe(350_000);
    expect(board.columns.find((col) => col.stage === "novo")!.openAmount).toBe(0);
    const byName = Object.fromEntries(column.rows.map((r) => [r.name, r]));
    expect(byName["Com proposta"].openContributionAmount).toBe(100_000);
    expect(byName["Com proposta"].openContributionProjectId).toBe(project.id);
    expect(byName["Com termo"].openContributionAmount).toBe(250_000);
    expect(byName["Aporte cancelado"].openContributionAmount).toBeNull();
    expect(byName["Aporte cancelado"].openContributionProjectId).toBeNull();
    expect(byName["Sem aporte"].openContributionAmount).toBeNull();
    expect(byName["Sem aporte"].orgCnpj).toBeNull();
  });

  it("filtros de dono e busca valem no quadro, nas linhas e na contagem", async () => {
    const c = await makeTenant();
    const o = await makeUser(c);
    const mine = await newLead(c, { name: "Vinícola Alfa" });
    await newLead(c, { name: "Metalúrgica Beta" });
    await moveLeadStage(c, {
      leadId: mine.id,
      to: "qualificado",
      ownerUserId: o,
      nextActionAt: now,
    });

    const byOwner = await listLeadsBoard(c, { pipeline: "patrocinadores", ownerUserId: o });
    const flat = (b: Awaited<ReturnType<typeof listLeadsBoard>>) =>
      b.columns.flatMap((col) => col.rows.map((r) => r.name));
    expect(flat(byOwner)).toEqual(["Vinícola Alfa"]);
    expect(byOwner.columns.find((col) => col.stage === "novo")!.total).toBe(0);

    const bySearch = await listLeadsBoard(c, { pipeline: "patrocinadores", search: "beta" });
    expect(flat(bySearch)).toEqual(["Metalúrgica Beta"]);
    expect(bySearch.columns.find((col) => col.stage === "novo")!.total).toBe(1);
    expect(bySearch.columns.find((col) => col.stage === "qualificado")!.total).toBe(0);
  });

  it("dois tenants não se veem", async () => {
    const a = await newLead(ctx, { name: "Só do tenant A" });
    await advance(ctx, a, "qualificado");
    await createContribution(ctx, {
      projectId,
      leadId: a.id,
      type: "patrocinio",
      mechanism: "rouanet_art18",
      proposedAmount: 42_000,
    });
    const otherBoard = await listLeadsBoard(other, { pipeline: "patrocinadores" });
    expect(otherBoard.columns.flatMap((col) => col.rows)).toEqual([]);
    expect(otherBoard.columns.every((col) => col.total === 0)).toBe(true);
    expect(otherBoard.columns.every((col) => col.openAmount === 0)).toBe(true);
    const mine = await listLeadsBoard(ctx, { pipeline: "patrocinadores" });
    const column = mine.columns.find((col) => col.stage === "qualificado")!;
    expect(column.rows.some((r) => r.name === "Só do tenant A")).toBe(true);
    expect(column.openAmount).toBe(42_000);
  });
});
