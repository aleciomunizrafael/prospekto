// Régua "Carteira" do Painel (ADR-004, 6.8): getPortfolioTotals agrega no banco e só conta o
// próprio tenant. Contra PGlite, com um `now` fixo para as janelas de 12 meses e do ano civil.
import { beforeAll, describe, expect, it } from "vitest";
import type { Ctx } from "@/lib/repos/ctx";
import {
  cancelContribution,
  confirmDeposit,
  createContribution,
  signTerm,
} from "@/lib/repos/contributions";
import { getPortfolioTotals } from "@/lib/repos/dashboard";
import { createLead } from "@/lib/repos/leads";
import { createOrganization } from "@/lib/repos/organizations";
import { createProject } from "@/lib/repos/projects";
import { makeTenant, uniqueEmail } from "../helpers";

// 13/10/2026 ao meio-dia em São Paulo.
const NOW = new Date("2026-10-13T15:00:00.000Z");

let ctx: Ctx;
let other: Ctx;
let n = 0;

async function newProject(c: Ctx, stage: "captando" | "avaliacao") {
  n += 1;
  const proponent = await createOrganization(c, { type: "proponente", name: `Proponente ${n}` });
  return createProject(c, {
    proponentOrgId: proponent.id,
    name: `Projeto ${n}`,
    slug: `projeto-${n}`,
    mechanism: "rouanet_art18",
    stage,
    approvedAmount: 1_000_000,
  });
}

// Pessoa física: assina o termo sem exigir CNPJ da organização (o que importa aqui é o org_id).
async function newLead(c: Ctx) {
  const { lead } = await createLead(c, {
    segment: "PF",
    interest: "rouanet",
    name: "Doador Fictício",
    email: uniqueEmail("carteira"),
    source: "indicacao_cliente",
  });
  return lead;
}

async function deposited(
  c: Ctx,
  projectId: string,
  orgId: string,
  amount: number,
  depositedAt: string,
) {
  const lead = await newLead(c);
  const contribution = await createContribution(c, {
    projectId,
    leadId: lead.id,
    orgId,
    type: "patrocinio",
    mechanism: "rouanet_art18",
    proposedAmount: amount,
  });
  await signTerm(c, { contributionId: contribution.id, termSignedAt: depositedAt });
  return confirmDeposit(c, {
    contributionId: contribution.id,
    depositedAmount: amount,
    depositedAt,
  });
}

beforeAll(async () => {
  ctx = await makeTenant();
  other = await makeTenant();

  const project = await newProject(ctx, "captando");
  await newProject(ctx, "avaliacao");
  const orgActive = await createOrganization(ctx, { type: "empresa", name: "Empresa Ativa" });
  const orgOld = await createOrganization(ctx, { type: "empresa", name: "Empresa Antiga" });

  // Em aberto: uma proposta e um termo assinado.
  const open1 = await newLead(ctx);
  await createContribution(ctx, {
    projectId: project.id,
    leadId: open1.id,
    type: "patrocinio",
    mechanism: "rouanet_art18",
    proposedAmount: 100_000,
  });
  const open2 = await newLead(ctx);
  const signed = await createContribution(ctx, {
    projectId: project.id,
    leadId: open2.id,
    type: "patrocinio",
    mechanism: "rouanet_art18",
    proposedAmount: 200_000,
  });
  await signTerm(ctx, { contributionId: signed.id, termSignedAt: "2026-09-01" });

  // Cancelado: não entra em nada.
  const lost = await newLead(ctx);
  const cancelled = await createContribution(ctx, {
    projectId: project.id,
    leadId: lost.id,
    type: "patrocinio",
    mechanism: "rouanet_art18",
    proposedAmount: 999_000,
  });
  await cancelContribution(ctx, { contributionId: cancelled.id, lostReason: "sem_resposta" });

  // Depositado neste ano (organização ativa) e há 13 meses, no ano anterior (organização inativa).
  await deposited(ctx, project.id, orgActive.id, 50_000, "2026-03-10");
  await deposited(ctx, project.id, orgOld.id, 70_000, "2025-09-10");

  // Outro tenant: proposta e projeto captando que não podem aparecer.
  const otherProject = await newProject(other, "captando");
  const otherLead = await newLead(other);
  await createContribution(other, {
    projectId: otherProject.id,
    leadId: otherLead.id,
    type: "patrocinio",
    mechanism: "rouanet_art18",
    proposedAmount: 5_000,
  });
});

describe("getPortfolioTotals", () => {
  it("conta só o próprio tenant, com as janelas de 12 meses e do ano civil", async () => {
    const totals = await getPortfolioTotals(ctx, NOW);
    expect(totals).toEqual({
      activeOrganizations: 1,
      openContributionsAmount: 300_000,
      openContributionsCount: 2,
      depositedYearAmount: 50_000,
      depositedYearCount: 1,
      projectsFundraising: 1,
    });
  });

  it("o outro tenant vê só o que é dele", async () => {
    const totals = await getPortfolioTotals(other, NOW);
    expect(totals).toEqual({
      activeOrganizations: 0,
      openContributionsAmount: 5_000,
      openContributionsCount: 1,
      depositedYearAmount: 0,
      depositedYearCount: 0,
      projectsFundraising: 1,
    });
  });

  it("um ano depois, o depósito deste ano sai de 'no ano' mas a organização continua ativa por 12 meses", async () => {
    // 13/01/2027: o depósito de 10/03/2026 tem menos de 12 meses (ativa), mas é de outro ano civil.
    const totals = await getPortfolioTotals(ctx, new Date("2027-01-13T15:00:00.000Z"));
    expect(totals.activeOrganizations).toBe(1);
    expect(totals.depositedYearAmount).toBe(0);
    expect(totals.depositedYearCount).toBe(0);
  });

  it("tenant sem nada devolve zeros", async () => {
    const empty = await makeTenant();
    expect(await getPortfolioTotals(empty, NOW)).toEqual({
      activeOrganizations: 0,
      openContributionsAmount: 0,
      openContributionsCount: 0,
      depositedYearAmount: 0,
      depositedYearCount: 0,
      projectsFundraising: 0,
    });
  });
});
