// Fluxo completo de aporte pelas Server Actions (proposta -> termo -> depósito -> recibo -> contador
// -> comissão) com requireSession substituído; regras R-6, R-7, R-8 e R-9; listagens novas.
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  cancelContributionAction,
  confirmDepositAction,
  createContributionAction,
  issueReceiptAction,
  recordCommissionAction,
  searchSponsorLeadsAction,
  sendReceiptToAccountantAction,
  signTermAction,
} from "@/actions/contributions";
import { idleState } from "@/lib/crm/form-state";
import type { Ctx } from "@/lib/repos/ctx";
import {
  contributionStepBlockers,
  contributionTotalsByProject,
  getContributionSummary,
  listContributionSummaries,
} from "@/lib/repos/contributions";
import { createLead } from "@/lib/repos/leads";
import { createOrganization } from "@/lib/repos/organizations";
import { createProject, getProject } from "@/lib/repos/projects";
import { makeTenant, uniqueEmail } from "../helpers";

const session = vi.hoisted(() => ({
  current: { tenantId: "", userId: "", role: "owner" as const },
}));
vi.mock("@/lib/session", () => ({ requireSession: async () => session.current }));
vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  revalidatePath: () => {},
  updateTag: () => {},
  revalidateTag: () => {},
}));

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

let ctx: Ctx;
let other: Ctx;
let projectId: string;
let directProjectId: string;
let pjLeadId: string;
let pfLeadId: string;
let sponsorOrgId: string;

beforeAll(async () => {
  ctx = await makeTenant();
  other = await makeTenant();
  session.current = { tenantId: ctx.tenantId, userId: ctx.userId!, role: "owner" };
  const proponent = await createOrganization(ctx, { type: "proponente", name: "Produtora" });
  const project = await createProject(ctx, {
    proponentOrgId: proponent.id,
    name: "Projeto Captando",
    slug: "projeto-captando",
    mechanism: "rouanet_art18",
    stage: "captando",
    approvedAmount: 1_000_000,
    fundraisingFeeAmount: 100_000,
    commissionPct: 10,
  });
  projectId = project.id;
  const direct = await createProject(ctx, {
    proponentOrgId: proponent.id,
    name: "Projeto PNAB",
    slug: "projeto-pnab",
    mechanism: "pnab",
  });
  directProjectId = direct.id;
  const sponsor = await createOrganization(ctx, {
    type: "empresa",
    name: "Patrocinadora SA",
    cnpj: "45723174000110",
  });
  sponsorOrgId = sponsor.id;
  pjLeadId = (
    await createLead(ctx, {
      segment: "PJ",
      interest: "rouanet",
      name: "Empresa Patrocinadora",
      email: uniqueEmail("pj"),
      source: "indicacao_contador",
    })
  ).lead.id;
  pfLeadId = (
    await createLead(ctx, {
      segment: "PF",
      interest: "rouanet",
      name: "Doadora Física",
      email: uniqueEmail("pf"),
      source: "indicacao_cliente",
    })
  ).lead.id;
});

describe("aportes (actions)", () => {
  let contributionId: string;

  it("busca patrocinadores só entre PJ/PF e cria a proposta; R-9 bloqueia fomento direto", async () => {
    const found = await searchSponsorLeadsAction("Patrocinadora");
    expect(found.map((l) => l.id)).toEqual([pjLeadId]);

    const noLead = await createContributionAction(
      idleState,
      fd({
        projectId,
        type: "patrocinio",
        mechanism: "rouanet_art18",
        proposedAmount: "50.000,00",
      }),
    );
    expect(noLead.status).toBe("error");

    const direct = await createContributionAction(
      idleState,
      fd({
        projectId: directProjectId,
        leadId: pjLeadId,
        type: "patrocinio",
        mechanism: "pnab",
        proposedAmount: "10.000,00",
      }),
    );
    expect(direct.status).toBe("error");
    expect(direct.status === "error" && direct.message).toMatch(/fomento direto/);

    const incompatible = await createContributionAction(
      idleState,
      fd({
        projectId,
        leadId: pjLeadId,
        type: "patrocinio",
        mechanism: "lic_rs",
        proposedAmount: "10.000,00",
      }),
    );
    expect(incompatible.status).toBe("error");

    const created = await createContributionAction(
      idleState,
      fd({
        projectId,
        leadId: pjLeadId,
        type: "patrocinio",
        mechanism: "rouanet_art18",
        proposedAmount: "50.000,00",
        expectedCloseAt: "2026-11-20",
      }),
    );
    expect(created.status).toBe("ok");
    const [row] = await listContributionSummaries(ctx, { projectId });
    contributionId = row.id;
    expect(row.status).toBe("proposta");
    expect(row.leadName).toBe("Empresa Patrocinadora");
    expect(row.projectName).toBe("Projeto Captando");
  });

  it("assinar termo de PJ exige empresa com CNPJ; o diálogo pode informá-la", async () => {
    const summary = (await getContributionSummary(ctx, contributionId))!;
    const blockers = await contributionStepBlockers(ctx, summary);
    expect(blockers.assinar_termo).toEqual(["empresa patrocinadora (organização) no aporte"]);
    expect(blockers.confirmar_deposito).toEqual(["termo assinado (data da assinatura)"]);

    const noOrg = await signTermAction(
      idleState,
      fd({ contributionId, termSignedAt: "2026-11-05" }),
    );
    expect(noOrg.status).toBe("error");

    const signed = await signTermAction(
      idleState,
      fd({
        contributionId,
        orgId: sponsorOrgId,
        termSignedAt: "2026-11-05",
        bankDetailsSentAt: "2026-11-06",
      }),
    );
    expect(signed.status).toBe("ok");
    const after = (await getContributionSummary(ctx, contributionId))!;
    expect(after.status).toBe("termo_assinado");
    expect(after.orgName).toBe("Patrocinadora SA");
    expect(after.bankDetailsSentAt).toBe("2026-11-06");
  });

  it("depósito recalcula o captado (R-6); recibo é único por projeto (R-7)", async () => {
    const tooEarlyReceipt = await issueReceiptAction(
      idleState,
      fd({ contributionId, receiptNumber: "REC-1", receiptIssuedAt: "2026-11-30" }),
    );
    expect(tooEarlyReceipt.status).toBe("error");

    const deposited = await confirmDepositAction(
      idleState,
      fd({ contributionId, depositedAmount: "50.000,00", depositedAt: "2026-11-25" }),
    );
    expect(deposited.status).toBe("ok");
    expect((await getProject(ctx, projectId))?.raisedAmount).toBe(50_000);
    expect((await getProject(ctx, projectId))?.balance).toBe(950_000);

    const receipt = await issueReceiptAction(
      idleState,
      fd({ contributionId, receiptNumber: "REC-1", receiptIssuedAt: "2026-11-30" }),
    );
    expect(receipt.status).toBe("ok");
    expect((await getContributionSummary(ctx, contributionId))?.status).toBe("recibo_emitido");

    // Segundo aporte no mesmo projeto não pode reutilizar REC-1.
    const second = await createContributionAction(
      idleState,
      fd({
        projectId,
        leadId: pfLeadId,
        type: "doacao",
        mechanism: "rouanet_art18",
        proposedAmount: "5.000,00",
      }),
    );
    expect(second.status).toBe("ok");
    const secondId = (await listContributionSummaries(ctx, { leadId: pfLeadId }))[0].id;
    expect(
      (
        await signTermAction(
          idleState,
          fd({ contributionId: secondId, termSignedAt: "2026-12-01" }),
        )
      ).status,
    ).toBe("ok");
    expect(
      (
        await confirmDepositAction(
          idleState,
          fd({ contributionId: secondId, depositedAmount: "5.000,00", depositedAt: "2026-12-02" }),
        )
      ).status,
    ).toBe("ok");
    const dup = await issueReceiptAction(
      idleState,
      fd({ contributionId: secondId, receiptNumber: "REC-1", receiptIssuedAt: "2026-12-03" }),
    );
    expect(dup.status).toBe("error");
    expect(dup.status === "error" && dup.message).toMatch(/REC-1/);
    expect((await getProject(ctx, projectId))?.raisedAmount).toBe(55_000);
  });

  it("envio ao contador e comissão com limites (R-8)", async () => {
    const noDate = await sendReceiptToAccountantAction(idleState, fd({ contributionId }));
    expect(noDate.status).toBe("error");
    expect(
      (
        await sendReceiptToAccountantAction(
          idleState,
          fd({ contributionId, receiptSentToAccountantAt: "2026-12-05" }),
        )
      ).status,
    ).toBe("ok");

    const over = await recordCommissionAction(
      idleState,
      fd({ contributionId, commissionDue: "6.000,00" }),
    );
    expect(over.status).toBe("error");
    expect(over.status === "error" && over.message).toMatch(/10%/);

    const paidWithoutDeposit = await recordCommissionAction(
      idleState,
      fd({ contributionId: "00000000-0000-0000-0000-000000000000", commissionDue: "1,00" }),
    );
    expect(paidWithoutDeposit.status).toBe("error");

    const okCommission = await recordCommissionAction(
      idleState,
      fd({ contributionId, commissionDue: "5.000,00", commissionPaidAt: "2026-12-10" }),
    );
    expect(okCommission.status).toBe("ok");
    const c = (await getContributionSummary(ctx, contributionId))!;
    expect(c.commissionDue).toBe(5000);
    expect(c.commissionPaidAt).toBe("2026-12-10");

    const totals = await contributionTotalsByProject(ctx);
    const t = totals.find((x) => x.projectId === projectId)!;
    expect(t.deposited).toBe(55_000);
    expect(t.commissionDue).toBe(5000);
    expect(t.count).toBe(2);
  });

  it("cancelar aporte depositado exige nota e recalcula; isolamento por tenant", async () => {
    const secondId = (await listContributionSummaries(ctx, { leadId: pfLeadId }))[0].id;
    const noNote = await cancelContributionAction(
      idleState,
      fd({ contributionId: secondId, lostReason: "sem_interesse" }),
    );
    expect(noNote.status).toBe("error");
    const cancelled = await cancelContributionAction(
      idleState,
      fd({ contributionId: secondId, lostReason: "sem_interesse", notes: "Devolvido a pedido." }),
    );
    expect(cancelled.status).toBe("ok");
    expect((await getProject(ctx, projectId))?.raisedAmount).toBe(50_000);

    expect(await listContributionSummaries(other, {})).toEqual([]);
    expect(await contributionTotalsByProject(other)).toEqual([]);
    expect(await getContributionSummary(other, contributionId)).toBeNull();
    session.current = { tenantId: other.tenantId, userId: other.userId!, role: "owner" };
    expect(await searchSponsorLeadsAction("Patrocinadora")).toEqual([]);
    const foreign = await confirmDepositAction(
      idleState,
      fd({ contributionId, depositedAmount: "1,00", depositedAt: "2026-12-01" }),
    );
    expect(foreign.status).toBe("error");
    session.current = { tenantId: ctx.tenantId, userId: ctx.userId!, role: "owner" };
  });

  it("previsões dos próximos 15 dias", async () => {
    const third = await createContributionAction(
      idleState,
      fd({
        projectId,
        leadId: pfLeadId,
        type: "doacao",
        mechanism: "rouanet_art18",
        proposedAmount: "2.000,00",
        expectedCloseAt: "2026-10-10",
      }),
    );
    expect(third.status).toBe("ok");
    const upcoming = await listContributionSummaries(ctx, {
      expectedBetween: { from: "2026-10-04", to: "2026-10-19" },
    });
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].proposedAmount).toBe(2000);
  });
});
