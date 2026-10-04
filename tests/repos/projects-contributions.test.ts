import { beforeAll, describe, expect, it } from "vitest";
import { CommissionLimitError } from "@/lib/domain/commission";
import { DomainError, MissingFieldsError, ValidationError } from "@/lib/errors";
import type { Ctx } from "@/lib/repos/ctx";
import { listActivities } from "@/lib/repos/activities";
import {
  cancelContribution,
  confirmDeposit,
  createContribution,
  getContribution,
  issueReceipt,
  markReceiptSentToAccountant,
  recordCommission,
  signTerm,
} from "@/lib/repos/contributions";
import { createLead, moveLeadStage, updateLead, type Lead } from "@/lib/repos/leads";
import { createOrganization, type Organization } from "@/lib/repos/organizations";
import {
  createProject,
  getProject,
  listProjects,
  moveProjectStage,
  publishProject,
  type CulturalProjectWithBalance,
} from "@/lib/repos/projects";
import { makeTenant, makeUser, uniqueEmail } from "../helpers";

let ctx: Ctx;
let proponent: Organization;
let project: CulturalProjectWithBalance;
let owner: string;
let n = 0;

async function newProject(overrides: Partial<Parameters<typeof createProject>[1]> = {}) {
  n += 1;
  return createProject(ctx, {
    proponentOrgId: proponent.id,
    name: `Projeto ${n}`,
    slug: `projeto-${n}`,
    mechanism: "rouanet_art18",
    stage: "captando",
    approvedAmount: 1_500_000,
    fundraisingFeeAmount: 150_000,
    ...overrides,
  });
}

async function newPjLead(): Promise<Lead> {
  const { lead } = await createLead(ctx, {
    segment: "PJ",
    interest: "rouanet",
    name: "Patrocinador",
    email: uniqueEmail("pj"),
    source: "indicacao_contador",
  });
  return lead;
}

// Pessoa física: não exige organização com CNPJ no termo, o que simplifica os testes de depósito.
async function newPfLead(): Promise<Lead> {
  const { lead } = await createLead(ctx, {
    segment: "PF",
    interest: "rouanet",
    name: "Doador",
    email: uniqueEmail("pf"),
    source: "indicacao_cliente",
  });
  return lead;
}

// Aporte já com termo assinado (pré-condição de confirmDeposit).
async function signedContribution(
  projectId: string,
  leadId: string,
  proposedAmount: number,
  mechanism: "rouanet_art18" | "lic_rs" = "rouanet_art18",
) {
  const c = await createContribution(ctx, {
    projectId,
    leadId,
    type: "patrocinio",
    mechanism,
    proposedAmount,
  });
  return signTerm(ctx, { contributionId: c.id, termSignedAt: "2026-11-01" });
}

beforeAll(async () => {
  ctx = await makeTenant();
  owner = await makeUser(ctx);
  proponent = await createOrganization(ctx, { type: "proponente", name: "Produtora" });
  project = await newProject();
});

describe("projects (R-3, R-5, R-11)", () => {
  it("exige organização do tipo proponente", async () => {
    const empresa = await createOrganization(ctx, { type: "empresa", name: "Empresa" });
    await expect(
      createProject(ctx, {
        proponentOrgId: empresa.id,
        name: "Projeto errado",
        slug: "errado",
        mechanism: "rouanet_art18",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("saldo a captar é calculado no banco e nunca armazenado", async () => {
    expect(project.balance).toBe(1_500_000);
    const listed = await listProjects(ctx);
    expect(listed.find((p) => p.id === project.id)?.balance).toBe(1_500_000);
    const none = await newProject({ approvedAmount: undefined, stage: "prospeccao" });
    expect(none.balance).toBeNull();
    expect(Object.keys(project)).not.toContain("saldo_a_captar");
  });

  it("sair de prospeccao exige responsável pelo projeto (R-3)", async () => {
    const p = await newProject({ stage: "prospeccao" });
    await expect(moveProjectStage(ctx, { projectId: p.id, to: "avaliacao" })).rejects.toThrow(
      /responsável/,
    );
    const moved = await moveProjectStage(ctx, {
      projectId: p.id,
      to: "avaliacao",
      ownerUserId: owner,
    });
    expect(moved.stage).toBe("avaliacao");
    expect(moved.ownerUserId).toBe(owner);
  });

  it("autorizado exige os campos obrigatórios; captando exige saldo positivo", async () => {
    const p = await newProject({
      stage: "inscrito",
      approvedAmount: undefined,
      fundraisingFeeAmount: undefined,
    });
    await expect(moveProjectStage(ctx, { projectId: p.id, to: "autorizado" })).rejects.toThrow(
      MissingFieldsError,
    );
    await expect(moveProjectStage(ctx, { projectId: p.id, to: "captando" })).rejects.toThrow(
      /saldo/,
    );
    await expect(moveProjectStage(ctx, { projectId: p.id, to: "arquivado" })).rejects.toThrow(
      /motivo/,
    );
    const arquivado = await moveProjectStage(ctx, {
      projectId: p.id,
      to: "arquivado",
      lostReason: "prazo_perdido",
    });
    expect(arquivado.stage).toBe("arquivado");
  });

  it("publicação só em captando com autorização; carteira pública filtra", async () => {
    const p = await newProject({ stage: "autorizado" });
    await expect(
      publishProject(ctx, {
        projectId: p.id,
        publishAuthorizedBy: "Produtora",
        publishAuthorizedAt: new Date(),
      }),
    ).rejects.toThrow(/captando/);
    await moveProjectStage(ctx, { projectId: p.id, to: "captando" });
    const published = await publishProject(ctx, {
      projectId: p.id,
      publishAuthorizedBy: "Produtora",
      publishAuthorizedAt: new Date(),
    });
    expect(published.publishedOnSite).toBe(true);
    expect((await listProjects(ctx, { publishedOnly: true })).map((x) => x.id)).toEqual([p.id]);
  });
});

describe("contributions (R-6, R-7, R-8, R-9)", () => {
  it("R-9: mecanismo incompatível ou fomento direto é rejeitado", async () => {
    const lead = await newPjLead();
    await expect(
      createContribution(ctx, {
        projectId: project.id,
        leadId: lead.id,
        type: "doacao",
        mechanism: "rouanet_art26_doacao",
        proposedAmount: 1000,
      }),
    ).rejects.toThrow(DomainError);
    const pnab = await newProject({ mechanism: "pnab" });
    await expect(
      createContribution(ctx, {
        projectId: pnab.id,
        leadId: lead.id,
        type: "patrocinio",
        mechanism: "pnab",
        proposedAmount: 1000,
      }),
    ).rejects.toThrow(/fomento direto/);
    const art26 = await newProject({ mechanism: "rouanet_art26_patrocinio" });
    await expect(
      createContribution(ctx, {
        projectId: art26.id,
        leadId: lead.id,
        type: "patrocinio",
        mechanism: "rouanet_art26_doacao",
        proposedAmount: 1000,
      }),
    ).rejects.toThrow(/tipo doacao/);
    const ok = await createContribution(ctx, {
      projectId: art26.id,
      leadId: lead.id,
      type: "doacao",
      mechanism: "rouanet_art26_doacao",
      proposedAmount: 1000,
    });
    expect(ok.status).toBe("proposta");
  });

  it("termo de PJ exige empresa patrocinadora com CNPJ; org_id vem do lead quando o aporte não tem", async () => {
    const lead = await newPjLead();
    const c = await createContribution(ctx, {
      projectId: project.id,
      leadId: lead.id,
      type: "patrocinio",
      mechanism: "rouanet_art18",
      proposedAmount: 10_000,
    });
    expect(c.orgId).toBeNull();
    await expect(
      signTerm(ctx, { contributionId: c.id, termSignedAt: "2026-11-01" }),
    ).rejects.toThrow(/empresa patrocinadora/);
    const semCnpj = await createOrganization(ctx, { type: "empresa", name: "Sem CNPJ" });
    await updateLead(ctx, { leadId: lead.id, orgId: semCnpj.id });
    await expect(
      signTerm(ctx, { contributionId: c.id, termSignedAt: "2026-11-01" }),
    ).rejects.toThrow(/CNPJ/);
    const empresa = await createOrganization(ctx, {
      type: "empresa",
      name: "Vinícola",
      cnpj: "45.723.174/0001-10",
    });
    await updateLead(ctx, { leadId: lead.id, orgId: empresa.id });
    const signed = await signTerm(ctx, { contributionId: c.id, termSignedAt: "2026-11-01" });
    expect(signed.status).toBe("termo_assinado");
    expect(signed.orgId).toBe(empresa.id);
    // Um novo aporte do mesmo lead já nasce com a empresa.
    const c2 = await createContribution(ctx, {
      projectId: project.id,
      leadId: lead.id,
      type: "patrocinio",
      mechanism: "rouanet_art18",
      proposedAmount: 5_000,
    });
    expect(c2.orgId).toBe(empresa.id);
  });

  it("confirmDeposit exige termo assinado e nunca inventa term_signed_at", async () => {
    const own = await newProject();
    const lead = await newPfLead();
    const c = await createContribution(ctx, {
      projectId: own.id,
      leadId: lead.id,
      type: "patrocinio",
      mechanism: "rouanet_art18",
      proposedAmount: 10_000,
    });
    await expect(
      confirmDeposit(ctx, {
        contributionId: c.id,
        depositedAmount: 10_000,
        depositedAt: "2026-11-20",
      }),
    ).rejects.toThrow(/assinatura do termo/);
    expect((await getContribution(ctx, c.id))!.termSignedAt).toBeNull();
    await signTerm(ctx, { contributionId: c.id, termSignedAt: "2026-11-05" });
    const deposited = await confirmDeposit(ctx, {
      contributionId: c.id,
      depositedAmount: 10_000,
      depositedAt: "2026-11-20",
    });
    expect(deposited.termSignedAt).toBe("2026-11-05");
  });

  it("R-6: confirmDeposit recalcula raised_amount e o saldo", async () => {
    const p = await newProject({ approvedAmount: 100_000 });
    const lead1 = await newPfLead();
    const lead2 = await newPfLead();
    const c1 = await signedContribution(p.id, lead1.id, 30_000);
    const c2 = await signedContribution(p.id, lead2.id, 20_000);
    await confirmDeposit(ctx, {
      contributionId: c1.id,
      depositedAmount: 30_000,
      depositedAt: "2026-11-20",
    });
    expect((await getProject(ctx, p.id))!.raisedAmount).toBe(30_000);
    await confirmDeposit(ctx, {
      contributionId: c2.id,
      depositedAmount: 25_000.5,
      depositedAt: "2026-11-21",
    });
    const after = (await getProject(ctx, p.id))!;
    expect(after.raisedAmount).toBe(55_000.5);
    expect(after.balance).toBe(44_999.5);
    await cancelContribution(ctx, {
      contributionId: c2.id,
      lostReason: "outro",
      notes: "Depósito devolvido",
    });
    expect((await getProject(ctx, p.id))!.raisedAmount).toBe(30_000);
  });

  it("R-7: issueReceipt só após depósito, uma vez por aporte e número único por projeto", async () => {
    const p = await newProject();
    const lead1 = await newPfLead();
    const lead2 = await newPfLead();
    const c1 = await signedContribution(p.id, lead1.id, 10_000);
    await expect(
      issueReceipt(ctx, {
        contributionId: c1.id,
        receiptNumber: "R-1",
        receiptIssuedAt: "2026-12-01",
      }),
    ).rejects.toThrow(/depósito/);
    await confirmDeposit(ctx, {
      contributionId: c1.id,
      depositedAmount: 10_000,
      depositedAt: "2026-11-30",
    });
    const issued = await issueReceipt(ctx, {
      contributionId: c1.id,
      receiptNumber: "R-1",
      receiptIssuedAt: "2026-12-01",
    });
    expect(issued.status).toBe("recibo_emitido");
    await expect(
      issueReceipt(ctx, {
        contributionId: c1.id,
        receiptNumber: "R-2",
        receiptIssuedAt: "2026-12-02",
      }),
    ).rejects.toThrow(/já tem recibo/);
    const c2 = await signedContribution(p.id, lead2.id, 5_000);
    await confirmDeposit(ctx, {
      contributionId: c2.id,
      depositedAmount: 5_000,
      depositedAt: "2026-12-01",
    });
    await expect(
      issueReceipt(ctx, {
        contributionId: c2.id,
        receiptNumber: "R-1",
        receiptIssuedAt: "2026-12-02",
      }),
    ).rejects.toThrow(/já foi usado/);
  });

  it("R-8: comissão acima de 10% ou da rubrica é rejeitada; teto de R$ 150 mil é aviso por ano", async () => {
    const p = await newProject({ fundraisingFeeAmount: 12_000 });
    const lead = await newPfLead();
    const c = await createContribution(ctx, {
      projectId: p.id,
      leadId: lead.id,
      type: "patrocinio",
      mechanism: "rouanet_art18",
      proposedAmount: 100_000,
    });
    await expect(
      recordCommission(ctx, { contributionId: c.id, commissionDue: 1000 }),
    ).rejects.toThrow(/depósito/);
    await signTerm(ctx, { contributionId: c.id, termSignedAt: "2026-11-01" });
    await confirmDeposit(ctx, {
      contributionId: c.id,
      depositedAmount: 100_000,
      depositedAt: "2026-11-10",
    });
    await expect(
      recordCommission(ctx, { contributionId: c.id, commissionDue: 10_000.01 }),
    ).rejects.toThrow(CommissionLimitError);
    const ok = await recordCommission(ctx, {
      contributionId: c.id,
      commissionDue: 10_000,
      commissionPaidAt: "2026-11-15",
    });
    expect(ok.contribution.commissionDue).toBe(10_000);
    expect(ok.warnings).toEqual([]);
    const lead2 = await newPfLead();
    const c2 = await signedContribution(p.id, lead2.id, 50_000);
    await confirmDeposit(ctx, {
      contributionId: c2.id,
      depositedAmount: 50_000,
      depositedAt: "2026-11-12",
    });
    await expect(
      recordCommission(ctx, { contributionId: c2.id, commissionDue: 3_000 }),
    ).rejects.toThrow(/rubrica/);

    // Teto: aviso, não erro; medido no ano do depósito.
    const big = await newProject({ approvedAmount: 5_000_000, fundraisingFeeAmount: 500_000 });
    const lead3 = await newPfLead();
    const c3 = await signedContribution(big.id, lead3.id, 2_000_000);
    await confirmDeposit(ctx, {
      contributionId: c3.id,
      depositedAmount: 2_000_000,
      depositedAt: "2026-11-12",
    });
    const over = await recordCommission(ctx, { contributionId: c3.id, commissionDue: 160_000 });
    expect(over.contribution.commissionDue).toBe(160_000);
    expect(over.warnings.map((w) => w.code)).toEqual(["cap"]);
    const sys = await listActivities(ctx, { contributionId: c3.id, type: "sistema" });
    expect(sys.map((a) => a.data)).toEqual(
      expect.arrayContaining([expect.objectContaining({ warnings: ["cap"], depositYear: 2026 })]),
    );
    // Outro ano no mesmo projeto: a soma do ano recomeça, sem aviso.
    const lead4 = await newPfLead();
    const c4 = await signedContribution(big.id, lead4.id, 1_000_000);
    await confirmDeposit(ctx, {
      contributionId: c4.id,
      depositedAmount: 1_000_000,
      depositedAt: "2027-03-01",
    });
    const nextYear = await recordCommission(ctx, { contributionId: c4.id, commissionDue: 100_000 });
    expect(nextYear.warnings).toEqual([]);
    // Mesmo ano: avisa de novo.
    const lead5 = await newPfLead();
    const c5 = await signedContribution(big.id, lead5.id, 1_000_000);
    await confirmDeposit(ctx, {
      contributionId: c5.id,
      depositedAmount: 1_000_000,
      depositedAt: "2026-12-01",
    });
    const sameYear = await recordCommission(ctx, { contributionId: c5.id, commissionDue: 1_000 });
    expect(sameYear.warnings.map((w) => w.code)).toEqual(["cap"]);
  });

  it("R-8: projeto LIC-RS não aplica os limites da Rouanet (a verificar) e só avisa", async () => {
    const lic = await newProject({ mechanism: "lic_rs", fundraisingFeeAmount: 100_000 });
    const lead = await newPfLead();
    const c = await signedContribution(lic.id, lead.id, 100_000, "lic_rs");
    await confirmDeposit(ctx, {
      contributionId: c.id,
      depositedAmount: 100_000,
      depositedAt: "2026-11-12",
    });
    const r = await recordCommission(ctx, { contributionId: c.id, commissionDue: 15_000 });
    expect(r.contribution.commissionDue).toBe(15_000);
    expect(r.warnings.map((w) => w.code)).toEqual(["unverified_limits"]);
  });

  it("pipeline patrocinadores: proposta, termo, aporte, recibo e renovacao exigem o aporte certo", async () => {
    const lead = await newPjLead();
    const base = { leadId: lead.id, ownerUserId: owner, nextActionAt: new Date() };
    await moveLeadStage(ctx, { ...base, to: "qualificado" });
    await moveLeadStage(ctx, { ...base, to: "diagnostico" });
    await expect(moveLeadStage(ctx, { ...base, to: "proposta" })).rejects.toThrow(
      /proposta de aporte/,
    );
    const c = await createContribution(ctx, {
      projectId: project.id,
      leadId: lead.id,
      type: "patrocinio",
      mechanism: "rouanet_art18",
      proposedAmount: 20_000,
    });
    await moveLeadStage(ctx, { ...base, to: "proposta" });

    // termo: CNPJ da empresa e checagem do art. 27 com data e responsável (R-10)
    await expect(moveLeadStage(ctx, { ...base, to: "termo" })).rejects.toThrow(/CNPJ/);
    const empresa = await createOrganization(ctx, {
      type: "empresa",
      name: "Metalúrgica",
      cnpj: "11.222.333/0001-81",
    });
    await updateLead(ctx, { leadId: lead.id, orgId: empresa.id });
    await expect(moveLeadStage(ctx, { ...base, to: "termo" })).rejects.toThrow(/art\. 27/);
    await updateLead(ctx, {
      leadId: lead.id,
      attributes: {
        vinculo_art27_checado: true,
        vinculo_art27_checado_em: "2026-10-20",
        vinculo_art27_checado_por: "Daniela",
      },
    });
    await moveLeadStage(ctx, { ...base, to: "termo" });

    // aporte: termo assinado e dados bancários enviados; o aporte passa a termo_assinado com a empresa
    await expect(moveLeadStage(ctx, { ...base, to: "aporte" })).rejects.toThrow(
      /assinatura do termo/,
    );
    const signed = await signTerm(ctx, {
      contributionId: c.id,
      termSignedAt: "2026-11-01",
      bankDetailsSentAt: "2026-11-02",
    });
    expect(signed.orgId).toBe(empresa.id);
    await moveLeadStage(ctx, { ...base, to: "aporte" });

    // recibo: depósito confirmado
    await expect(moveLeadStage(ctx, { ...base, to: "recibo" })).rejects.toThrow(/depósito/);
    await confirmDeposit(ctx, {
      contributionId: c.id,
      depositedAmount: 20_000,
      depositedAt: "2026-11-20",
    });
    await moveLeadStage(ctx, { ...base, to: "recibo" });
    expect((await getProject(ctx, project.id))!.raisedAmount).toBe(20_000);

    // renovacao: recibo emitido e enviado ao contador
    await expect(moveLeadStage(ctx, { ...base, to: "renovacao" })).rejects.toThrow(/recibo/);
    await issueReceipt(ctx, {
      contributionId: c.id,
      receiptNumber: "SALIC-001",
      receiptIssuedAt: "2026-11-25",
    });
    await expect(moveLeadStage(ctx, { ...base, to: "renovacao" })).rejects.toThrow(/contador/);
    await markReceiptSentToAccountant(ctx, c.id, "2026-11-26");
    const renov = await moveLeadStage(ctx, { ...base, to: "renovacao" });
    expect(renov.stage).toBe("renovacao");

    // voltar a proposta exige nova proposta
    await expect(moveLeadStage(ctx, { ...base, to: "proposta" })).rejects.toThrow(/nova proposta/);
    await createContribution(ctx, {
      projectId: project.id,
      leadId: lead.id,
      type: "patrocinio",
      mechanism: "rouanet_art18",
      proposedAmount: 25_000,
    });
    expect((await moveLeadStage(ctx, { ...base, to: "proposta" })).stage).toBe("proposta");
  });
});
