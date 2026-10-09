// Regra R-15 (ADR-001): dois tenants, um lead em cada; nenhuma função de listagem devolve dado do outro.
import { beforeAll, describe, expect, it } from "vitest";
import type { Ctx } from "@/lib/repos/ctx";
import { createActivity, listActivities, listOpenTasks } from "@/lib/repos/activities";
import { countAiRunsToday, getLatestAiRun, insertAiRun } from "@/lib/repos/ai-runs";
import { getCurrentConsent, listConsents } from "@/lib/repos/consents";
import { createContact, getContact, listContacts } from "@/lib/repos/contacts";
import { createContribution, getContribution, listContributions } from "@/lib/repos/contributions";
import { createLead, getLead, listLeads, type Lead } from "@/lib/repos/leads";
import { createOrganization, getOrganization, listOrganizations } from "@/lib/repos/organizations";
import { createProject, getProject, listProjects } from "@/lib/repos/projects";
import {
  createSimulation,
  getSimulationByTokenHash,
  listSimulations,
} from "@/lib/repos/simulations";
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
  return { lead, proponent, contact, project, contribution, simulation };
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
    expect((await listOpenTasks(b)).map((t) => t.subject)).toEqual(["Tarefa b"]);
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

  it("getTenant devolve o tenant do contexto", async () => {
    expect((await getTenant(a))?.id).toBe(a.tenantId);
    expect((await getTenant(b))?.id).toBe(b.tenantId);
  });
});
