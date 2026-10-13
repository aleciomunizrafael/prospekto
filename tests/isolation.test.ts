// Regra R-15 (ADR-001): dois tenants, um lead em cada; nenhuma função de listagem devolve dado do outro.
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import type { Ctx } from "@/lib/repos/ctx";
import {
  createActivity,
  listActivities,
  listOpenTasks,
  listOpenTasksWithLead,
  listRecentActivities,
} from "@/lib/repos/activities";
import { countAiRunsToday, getLatestAiRun, insertAiRun } from "@/lib/repos/ai-runs";
import { getCurrentConsent, listConsents } from "@/lib/repos/consents";
import { createContact, getContact, listContacts } from "@/lib/repos/contacts";
import { createContribution, getContribution, listContributions } from "@/lib/repos/contributions";
import { loadAssignedTasks } from "@/lib/repos/digest";
import { createLead, getLead, listLeads, type Lead } from "@/lib/repos/leads";
import { createOrganization, getOrganization, listOrganizations } from "@/lib/repos/organizations";
import { createProject, getProject, listProjects } from "@/lib/repos/projects";
import {
  addItems,
  createList,
  getItem,
  getList,
  listItems,
  listLists,
  searchProspectingItems,
} from "@/lib/repos/prospecting";
import {
  createSimulation,
  getSimulationByTokenHash,
  listSimulations,
} from "@/lib/repos/simulations";
import {
  createTask,
  getTask,
  listOpenTasksForOwner,
  listTasksBoard,
  searchTasks,
} from "@/lib/repos/tasks";
import { getTenant } from "@/lib/repos/tenants";
import { consentContato, makeTenant } from "./helpers";

let a: Ctx;
let b: Ctx;
let leadA: Lead;
let leadB: Lead;

async function seedTenant(ctx: Ctx, label: string) {
  const { lead } = await createLead(ctx, {
    segment: "PJ",
    interest: "rouanet",
    name: `Lead ${label}`,
    email: `lead-${label}@example.test`,
    source: "site",
    consents: [consentContato],
    attributes: { empresa: `Empresa ${label}` },
  });
  const proponent = await createOrganization(ctx, {
    type: "proponente",
    name: `Proponente ${label}`,
  });
  const contact = await createContact(ctx, {
    orgId: proponent.id,
    name: `Contato ${label}`,
    sourceDetail: "teste",
  });
  const project = await createProject(ctx, {
    proponentOrgId: proponent.id,
    name: `Projeto ${label}`,
    slug: `projeto-${label}`,
    mechanism: "rouanet_art18",
    approvedAmount: 100000,
  });
  const contribution = await createContribution(ctx, {
    projectId: project.id,
    leadId: lead.id,
    type: "patrocinio",
    mechanism: "rouanet_art18",
    proposedAmount: 10000,
  });
  await createActivity(ctx, {
    type: "tarefa",
    subject: `Tarefa ${label}`,
    leadId: lead.id,
    dueAt: new Date(),
  });
  // Tarefa solta (sem vínculo; só `tarefa` pode) e lista de prospecção com um item (ADR-004).
  const looseTask = await createTask(ctx, { subject: `Tarefa solta ${label}` });
  const list = await createList(ctx, {
    name: `Lista ${label}`,
    sourceDetail: "busca pública (teste)",
  });
  const {
    items: [item],
  } = await addItems(ctx, {
    listId: list.id,
    items: [{ name: `Empresa prospectada ${label}`, phone: "(54) 90000-0001" }],
  });
  await createActivity(ctx, {
    type: "ligacao",
    subject: `Ligação ${label}`,
    prospectingItemId: item.id,
  });
  await insertAiRun(ctx, {
    kind: "brief",
    leadId: lead.id,
    model: "claude-opus-5-5",
    status: "ok",
    output: { resumo: `Briefing ${label}` },
  });
  const simulation = await createSimulation(ctx, {
    leadId: lead.id,
    kind: "pj",
    inputs: { tax_due: 500000 },
    outputs: { cesta: 20000 },
    parametersVersion: "2026-10-03",
    applyLc224: true,
    resultTokenHash: `${label}`.padEnd(64, "0"),
  });
  return { lead, proponent, contact, project, contribution, simulation, looseTask, list, item };
}

let dataA: Awaited<ReturnType<typeof seedTenant>>;
let dataB: Awaited<ReturnType<typeof seedTenant>>;

beforeAll(async () => {
  a = await makeTenant("tenant-a");
  b = await makeTenant("tenant-b");
  dataA = await seedTenant(a, "a");
  dataB = await seedTenant(b, "b");
  leadA = dataA.lead;
  leadB = dataB.lead;
});

describe("isolamento entre tenants", () => {
  it("listLeads devolve só o lead do próprio tenant", async () => {
    const listA = await listLeads(a);
    const listB = await listLeads(b);
    expect(listA).toHaveLength(1);
    expect(listA[0].id).toBe(leadA.id);
    expect(listB).toHaveLength(1);
    expect(listB[0].id).toBe(leadB.id);
  });

  it("getLead não enxerga o lead do outro tenant", async () => {
    expect(await getLead(a, leadB.id)).toBeNull();
    expect(await getLead(b, leadA.id)).toBeNull();
  });

  it("organizações, contatos, projetos e aportes ficam no próprio tenant", async () => {
    expect((await listOrganizations(a)).map((o) => o.id)).toEqual([dataA.proponent.id]);
    expect(await getOrganization(a, dataB.proponent.id)).toBeNull();
    expect((await listContacts(a)).map((c) => c.id)).toEqual([dataA.contact.id]);
    expect(await getContact(b, dataA.contact.id)).toBeNull();
    expect((await listProjects(a)).map((p) => p.id)).toEqual([dataA.project.id]);
    expect(await getProject(b, dataA.project.id)).toBeNull();
    expect((await listContributions(b)).map((c) => c.id)).toEqual([dataB.contribution.id]);
    expect(await getContribution(a, dataB.contribution.id)).toBeNull();
  });

  it("consentimentos, atividades e simulações ficam no próprio tenant", async () => {
    expect(await listConsents(a, leadB.id)).toHaveLength(0);
    expect(await getCurrentConsent(b, leadA.id, "contato_comercial")).toBeNull();
    expect((await listActivities(a)).every((x) => x.tenantId === a.tenantId)).toBe(true);
    expect(await listActivities(a, { leadId: leadB.id })).toHaveLength(0);
    // due_at asc com nulos por último: a tarefa com prazo vem antes da solta.
    expect((await listOpenTasks(b)).map((t) => t.subject)).toEqual(["Tarefa b", "Tarefa solta b"]);
    expect((await listSimulations(a)).map((s) => s.id)).toEqual([dataA.simulation.id]);
    expect(await getSimulationByTokenHash(a, dataB.simulation.resultTokenHash!)).toBeNull();
  });

  it("execuções de IA (ai_runs) ficam no próprio tenant", async () => {
    expect((await getLatestAiRun(a, { leadId: leadA.id, kind: "brief" }))?.output).toEqual({
      resumo: "Briefing a",
    });
    expect(await getLatestAiRun(a, { leadId: leadB.id, kind: "brief" })).toBeNull();
    expect(await getLatestAiRun(b, { leadId: leadA.id, kind: "brief" })).toBeNull();
    expect(await countAiRunsToday(a)).toBe(1);
    expect(await countAiRunsToday(b)).toBe(1);
  });

  it("prospecção: listas, itens e busca ficam no próprio tenant", async () => {
    expect((await listLists(a)).map((l) => l.id)).toEqual([dataA.list.id]);
    expect(await getList(a, dataB.list.id)).toBeNull();
    expect((await getList(b, dataB.list.id))?.total).toBe(1);
    expect((await listItems(a, { listId: dataB.list.id })).length).toBe(0);
    expect((await listItems(b, { listId: dataB.list.id })).map((i) => i.id)).toEqual([
      dataB.item.id,
    ]);
    expect(await getItem(a, dataB.item.id)).toBeNull();
    expect(
      (await searchProspectingItems(a, { search: "Empresa prospectada" })).map((i) => i.id),
    ).toEqual([dataA.item.id]);
    expect(await listActivities(a, { prospectingItemId: dataB.item.id })).toHaveLength(0);
  });

  it("tarefas: quadro, detalhe, minhas tarefas e busca ficam no próprio tenant", async () => {
    const now = new Date();
    const boardA = await listTasksBoard(a, { now });
    expect(boardA.a_fazer.rows.map((t) => t.subject).sort()).toEqual([
      "Tarefa a",
      "Tarefa solta a",
    ]);
    expect(boardA.a_fazer.total).toBe(2);
    expect(await getTask(b, dataA.looseTask.id)).toBeNull();
    expect((await getTask(a, dataA.looseTask.id))?.subject).toBe("Tarefa solta a");
    expect(
      (await listOpenTasksForOwner(b, { ownerUserId: b.userId!, now }))
        .map((t) => t.subject)
        .sort(),
    ).toEqual(["Tarefa b", "Tarefa solta b"]);
    expect((await listOpenTasksForOwner(a, { ownerUserId: b.userId!, now })).length).toBe(0);
    expect(
      (await searchTasks(a, { search: "Tarefa" })).every((t) => t.tenantId === a.tenantId),
    ).toBe(true);
    expect((await searchTasks(a, { search: "solta b" })).length).toBe(0);
  });

  it("últimas atividades ficam no próprio tenant", async () => {
    const recent = await listRecentActivities(a, { limit: 8 });
    expect(recent.length).toBeGreaterThan(0);
    expect(recent.every((x) => x.tenantId === a.tenantId)).toBe(true);
    expect(recent.some((x) => x.type === "sistema" || x.type === "formulario")).toBe(false);
    expect(recent.find((x) => x.subject === "Ligação a")?.prospectingItemName).toBe(
      "Empresa prospectada a",
    );
  });

  // Regra 11 do plano: todo leftJoin restringe o tenant na condição. Uma tarefa do tenant A cujo
  // lead_id aponta para o lead do tenant B (inserida direto pelo db do teste) não devolve o nome.
  it("lead_id de outro tenant não devolve o nome do lead pelo join", async () => {
    const [cross] = await db
      .insert(activities)
      .values({
        tenantId: a.tenantId,
        type: "tarefa",
        subject: "Tarefa cruzada",
        leadId: leadB.id,
        dueAt: new Date(),
        priority: "media",
      })
      .returning();
    const now = new Date();
    const board = await listTasksBoard(a, { now });
    const inBoard = board.a_fazer.rows.find((t) => t.id === cross.id);
    expect(inBoard).toBeDefined();
    expect(inBoard?.leadName).toBeNull();
    const withLead = await listOpenTasksWithLead(a, { dueTo: new Date(now.getTime() + 60_000) });
    expect(withLead.find((t) => t.id === cross.id)?.leadName).toBeNull();
    expect((await getTask(a, cross.id))?.leadName).toBeNull();
  });

  // Regra 11 no e-mail diário: `loadAssignedTasks` lê o rótulo do vínculo por subconsulta sem join,
  // e a restrição de tenant precisa valer para lead, organização e projeto de outro tenant.
  it("e-mail diário não devolve o nome de lead, organização ou projeto de outro tenant", async () => {
    const now = new Date();
    const [task] = await db
      .insert(activities)
      .values({
        tenantId: a.tenantId,
        type: "tarefa",
        subject: "Tarefa cruzada do e-mail",
        ownerUserId: a.userId,
        leadId: leadA.id,
        dueAt: now,
        priority: "media",
      })
      .returning();
    const labelOf = async () =>
      (await loadAssignedTasks(a, a.userId!, now)).find((t) => t.id === task.id)?.linkLabel;
    // Controle: o vínculo do próprio tenant devolve o nome.
    expect(await labelOf()).toBe("Lead a");
    await db.update(activities).set({ leadId: leadB.id }).where(eq(activities.id, task.id));
    expect(await labelOf()).toBeNull();
    await db
      .update(activities)
      .set({ leadId: null, orgId: dataB.proponent.id })
      .where(eq(activities.id, task.id));
    expect(await labelOf()).toBeNull();
    await db
      .update(activities)
      .set({ orgId: null, projectId: dataB.project.id })
      .where(eq(activities.id, task.id));
    expect(await labelOf()).toBeNull();
  });

  it("getTenant devolve o tenant do contexto", async () => {
    expect((await getTenant(a))?.id).toBe(a.tenantId);
    expect((await getTenant(b))?.id).toBe(b.tenantId);
  });
});
