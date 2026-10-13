// Repositório de organizações: o histórico da ficha (ADR-004, 6.9), o telefone da empresa (P18),
// as notas com autosave e os leads vinculados com prazo e aporte aberto. Contra PGlite.
import { beforeAll, describe, expect, it } from "vitest";
import { NotFoundError } from "@/lib/errors";
import { createActivity } from "@/lib/repos/activities";
import { createContribution } from "@/lib/repos/contributions";
import type { Ctx } from "@/lib/repos/ctx";
import { createLead, type Lead } from "@/lib/repos/leads";
import {
  createOrganization,
  getOrganization,
  listLeadsForOrganization,
  listOrganizationActivities,
  updateOrganization,
  updateOrganizationNotes,
  type Organization,
} from "@/lib/repos/organizations";
import { createProject } from "@/lib/repos/projects";
import { makeTenant, uniqueEmail } from "../helpers";

let ctx: Ctx;
let other: Ctx;
let org: Organization;
let otherOrg: Organization;
let leadOfOrg: Lead;

async function newLead(c: Ctx, orgId: string | undefined, name: string): Promise<Lead> {
  const { lead } = await createLead(c, {
    segment: "PJ",
    interest: "rouanet",
    name,
    email: uniqueEmail("org"),
    source: "linkedin",
    orgId,
    attributes: { empresa: "Empresa Teste" },
  });
  return lead;
}

beforeAll(async () => {
  ctx = await makeTenant();
  other = await makeTenant();
  org = await createOrganization(ctx, { type: "empresa", name: "Vinícola Teste" });
  otherOrg = await createOrganization(ctx, { type: "empresa", name: "Outra Empresa" });
  leadOfOrg = await newLead(ctx, org.id, "Rodrigo da Vinícola");
  const leadElsewhere = await newLead(ctx, otherOrg.id, "Lead de Outra");

  await createActivity(ctx, { type: "nota", subject: "Nota na organização", orgId: org.id });
  await createActivity(ctx, { type: "ligacao", subject: "Ligação no lead", leadId: leadOfOrg.id });
  await createActivity(ctx, {
    type: "ligacao",
    subject: "Ligação em lead de outra organização",
    leadId: leadElsewhere.id,
  });

  // Outro tenant com uma organização e um lead próprios.
  const foreignOrg = await createOrganization(other, { type: "empresa", name: "Empresa Alheia" });
  const foreignLead = await newLead(other, foreignOrg.id, "Lead Alheio");
  await createActivity(other, { type: "nota", subject: "Nota alheia", orgId: foreignOrg.id });
  await createActivity(other, {
    type: "ligacao",
    subject: "Ligação alheia",
    leadId: foreignLead.id,
  });
});

describe("listOrganizationActivities", () => {
  it("devolve a atividade da organização e a do lead dela (com leadName), nada de fora", async () => {
    const rows = await listOrganizationActivities(ctx, org.id, { limit: 300 });
    const subjects = rows.map((r) => r.subject);
    expect(subjects).toContain("Nota na organização");
    expect(subjects).toContain("Ligação no lead");
    expect(subjects).not.toContain("Ligação em lead de outra organização");
    expect(subjects).not.toContain("Nota alheia");
    expect(subjects).not.toContain("Ligação alheia");
    expect(rows.find((r) => r.subject === "Ligação no lead")?.leadName).toBe("Rodrigo da Vinícola");
    expect(rows.find((r) => r.subject === "Nota na organização")?.leadName).toBeNull();
  });

  it("do outro tenant, a organização não devolve nada", async () => {
    expect(await listOrganizationActivities(other, org.id)).toEqual([]);
  });
});

describe("updateOrganization: telefone da empresa (P18)", () => {
  it("grava E.164 e limpa com null", async () => {
    const saved = await updateOrganization(ctx, { orgId: org.id, phone: "(54) 3000-0000" });
    expect(saved.phone).toBe("+555430000000");
    const cleared = await updateOrganization(ctx, { orgId: org.id, phone: null });
    expect(cleared.phone).toBeNull();
  });

  it("recusa telefone inválido", async () => {
    await expect(updateOrganization(ctx, { orgId: org.id, phone: "123" })).rejects.toThrow();
    expect((await getOrganization(ctx, org.id))?.phone).toBeNull();
  });
});

describe("updateOrganizationNotes", () => {
  it("grava, apara e limpa (vazio vira nulo)", async () => {
    const saved = await updateOrganizationNotes(ctx, {
      orgId: org.id,
      notes: "  Decide em comitê. ",
    });
    expect(saved.notes).toBe("Decide em comitê.");
    const cleared = await updateOrganizationNotes(ctx, { orgId: org.id, notes: "   " });
    expect(cleared.notes).toBeNull();
  });

  it("organização de outro tenant não é encontrada", async () => {
    await expect(updateOrganizationNotes(other, { orgId: org.id, notes: "x" })).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe("listLeadsForOrganization", () => {
  it("traz stageEnteredAt e o valor do aporte aberto quando existe", async () => {
    const before = await listLeadsForOrganization(ctx, org.id);
    expect(before.map((l) => l.id)).toEqual([leadOfOrg.id]);
    expect(before[0].stageEnteredAt).toBeInstanceOf(Date);
    expect(before[0].openContributionAmount).toBeNull();

    const proponent = await createOrganization(ctx, { type: "proponente", name: "Proponente" });
    const project = await createProject(ctx, {
      proponentOrgId: proponent.id,
      name: "Projeto Teste",
      slug: "projeto-teste-org",
      mechanism: "rouanet_art18",
      stage: "captando",
      approvedAmount: 500_000,
    });
    await createContribution(ctx, {
      projectId: project.id,
      leadId: leadOfOrg.id,
      type: "patrocinio",
      mechanism: "rouanet_art18",
      proposedAmount: 150_000,
    });
    const after = await listLeadsForOrganization(ctx, org.id);
    expect(after[0].openContributionAmount).toBe(150_000);
  });
});
