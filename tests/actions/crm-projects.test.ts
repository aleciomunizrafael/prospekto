// Server Actions de projetos e organizações com requireSession substituído por uma sessão de teste
// (PGlite em memória). Cobre criação e edição, "Mover para" com campos faltantes, publicação sem
// autorização e isolamento por tenant nas listagens novas.
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  createProjectAction,
  moveProjectStageAction,
  publishProjectAction,
  unpublishProjectAction,
  updateProjectAction,
} from "@/actions/projects";
import {
  createContactAction,
  createOrganizationAction,
  linkLeadToOrganizationAction,
  searchLeadsAction,
} from "@/actions/organizations";
import { idleState } from "@/lib/crm/form-state";
import type { Ctx } from "@/lib/repos/ctx";
import { createLead, getLead } from "@/lib/repos/leads";
import {
  createOrganization,
  listLeadsForOrganization,
  listOrganizationSummaries,
} from "@/lib/repos/organizations";
import {
  getProject,
  getProjectDetail,
  listProjectAlerts,
  listProjectSummaries,
  missingForProjectMove,
  getProjectBySlug,
} from "@/lib/repos/projects";
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
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

async function expectRedirect(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (error) {
    const m = error instanceof Error ? error.message : String(error);
    if (m.startsWith("REDIRECT:")) return m.slice("REDIRECT:".length);
    throw error;
  }
  throw new Error("esperava redirect");
}

let ctx: Ctx;
let other: Ctx;
let proponentId: string;

beforeAll(async () => {
  ctx = await makeTenant();
  other = await makeTenant();
  session.current = { tenantId: ctx.tenantId, userId: ctx.userId!, role: "owner" };
  const proponent = await createOrganization(ctx, { type: "proponente", name: "Produtora Teste" });
  proponentId = proponent.id;
  await createOrganization(other, { type: "proponente", name: "Produtora Alheia" });
});

describe("organizações (actions)", () => {
  it("cria organização com CNPJ validado e redireciona para o detalhe", async () => {
    const bad = await createOrganizationAction(
      idleState,
      fd({ type: "empresa", name: "Empresa X", cnpj: "11111111111111" }),
    );
    expect(bad.status).toBe("error");
    expect(bad.status === "error" && bad.fieldErrors?.cnpj).toMatch(/CNPJ/);

    const url = await expectRedirect(
      createOrganizationAction(
        idleState,
        fd({
          type: "empresa",
          name: "Empresa X",
          cnpj: "45.723.174/0001-10",
          estimatedIrpj: "1.500,50",
          icmsContributorRs: "sim",
        }),
      ),
    );
    expect(url).toMatch(/^\/app\/organizacoes\/[0-9a-f-]{36}$/);
    const [org] = await listOrganizationSummaries(ctx, { search: "Empresa X" });
    expect(org.cnpj).toBe("45723174000110");
    expect(org.estimatedIrpj).toBe(1500.5);
    expect(org.icmsContributorRs).toBe(true);
  });

  it("contato exige origem do dado; lead vinculado aparece na organização", async () => {
    const [org] = await listOrganizationSummaries(ctx, { search: "Empresa X" });
    const noSource = await createContactAction(idleState, fd({ orgId: org.id, name: "Maria" }));
    expect(noSource.status).toBe("error");
    const okContact = await createContactAction(
      idleState,
      fd({ orgId: org.id, name: "Maria", sourceDetail: "linkedin:busca", isDecisionMaker: "on" }),
    );
    expect(okContact.status).toBe("ok");

    const { lead } = await createLead(ctx, {
      segment: "PJ",
      interest: "rouanet",
      name: "Lead Vinculável",
      email: uniqueEmail("vinc"),
      source: "linkedin",
    });
    const found = await searchLeadsAction("Vinculável");
    expect(found.map((l) => l.id)).toContain(lead.id);
    const linked = await linkLeadToOrganizationAction(
      idleState,
      fd({ orgId: org.id, leadId: lead.id }),
    );
    expect(linked.status).toBe("ok");
    expect((await getLead(ctx, lead.id))?.orgId).toBe(org.id);
    expect((await listLeadsForOrganization(ctx, org.id)).map((l) => l.id)).toEqual([lead.id]);
    expect(await listLeadsForOrganization(other, org.id)).toEqual([]);
  });

  it("listagem de organizações isola por tenant", async () => {
    const mine = await listOrganizationSummaries(ctx, {});
    expect(mine.map((o) => o.name)).not.toContain("Produtora Alheia");
    const theirs = await listOrganizationSummaries(other, {});
    expect(theirs.map((o) => o.name)).toEqual(["Produtora Alheia"]);
  });
});

describe("projetos (actions)", () => {
  let projectId: string;

  it("cria o projeto em prospeccao com slug gerado do nome", async () => {
    const url = await expectRedirect(
      createProjectAction(
        idleState,
        fd({
          proponentOrgId: proponentId,
          name: "Festival de Inverno 2027",
          mechanism: "rouanet_art18",
        }),
      ),
    );
    projectId = url.split("/").pop()!;
    const project = await getProjectBySlug(ctx, "festival-de-inverno-2027");
    expect(project?.id).toBe(projectId);
    expect(project?.stage).toBe("prospeccao");
  });

  it("recusa comissão contratada acima de 10% no Rouanet e aceita a edição válida", async () => {
    const bad = await updateProjectAction(
      idleState,
      fd({
        projectId,
        proponentOrgId: proponentId,
        name: "Festival",
        mechanism: "rouanet_art18",
        commissionPct: "12",
      }),
    );
    expect(bad.status).toBe("error");
    expect(bad.status === "error" && bad.message).toMatch(/10%/);

    const good = await updateProjectAction(
      idleState,
      fd({
        projectId,
        proponentOrgId: proponentId,
        name: "Festival de Inverno 2027",
        mechanism: "rouanet_art18",
        commissionPct: "10",
        approvedAmount: "1.200.000,00",
        city: "Gramado",
        uf: "RS",
        summary: "Resumo público.",
      }),
    );
    expect(good.status).toBe("ok");
    const project = await getProject(ctx, projectId);
    expect(project?.approvedAmount).toBe(1_200_000);
    expect(project?.commissionPct).toBe(10);
    expect(project?.balance).toBe(1_200_000);
  });

  it("mover para autorizado lista o que falta e grava os campos enviados no mesmo diálogo", async () => {
    // prospeccao -> avaliacao exige responsável (R-3).
    const noOwner = await moveProjectStageAction(idleState, fd({ projectId, to: "avaliacao" }));
    expect(noOwner.status).toBe("error");
    expect(noOwner.status === "error" && noOwner.missing).toContain("responsável pelo projeto");
    expect(missingForProjectMove((await getProject(ctx, projectId))!, "avaliacao")).toContain(
      "responsável pelo projeto",
    );

    expect(
      (
        await moveProjectStageAction(
          idleState,
          fd({ projectId, to: "avaliacao", ownerUserId: ctx.userId! }),
        )
      ).status,
    ).toBe("ok");
    expect(
      (await moveProjectStageAction(idleState, fd({ projectId, to: "elaboracao" }))).status,
    ).toBe("ok");
    expect(
      (await moveProjectStageAction(idleState, fd({ projectId, to: "inscrito" }))).status,
    ).toBe("ok");

    const missing = await moveProjectStageAction(idleState, fd({ projectId, to: "autorizado" }));
    expect(missing.status).toBe("error");
    expect(missing.status === "error" && missing.missing).toEqual(
      expect.arrayContaining(["número do processo", "prazo de captação", "rubrica de captação"]),
    );
    expect((await getProject(ctx, projectId))?.stage).toBe("inscrito");

    const moved = await moveProjectStageAction(
      idleState,
      fd({
        projectId,
        to: "autorizado",
        processNumber: "PRONAC 27-1234",
        fundraisingDeadline: "2027-12-31",
        fundraisingFeeAmount: "120.000,00",
      }),
    );
    expect(moved.status).toBe("ok");
    const project = await getProject(ctx, projectId);
    expect(project?.stage).toBe("autorizado");
    expect(project?.processNumber).toBe("PRONAC 27-1234");
    expect(project?.fundraisingFeeAmount).toBe(120_000);
  });

  it("publicar fora de captando ou sem autorização é rejeitado (R-11)", async () => {
    const notCaptando = await publishProjectAction(
      idleState,
      fd({
        projectId,
        publishAuthorizedBy: "Fulana, produtora",
        publishAuthorizedAt: "2026-10-01",
      }),
    );
    expect(notCaptando.status).toBe("error");
    expect(notCaptando.status === "error" && notCaptando.message).toMatch(/captando/);

    expect(
      (await moveProjectStageAction(idleState, fd({ projectId, to: "captando" }))).status,
    ).toBe("ok");
    const noAuth = await publishProjectAction(idleState, fd({ projectId }));
    expect(noAuth.status).toBe("error");
    expect(noAuth.status === "error" && noAuth.fieldErrors?.publishAuthorizedBy).toBeTruthy();
    expect((await getProject(ctx, projectId))?.publishedOnSite).toBe(false);

    const published = await publishProjectAction(
      idleState,
      fd({
        projectId,
        publishAuthorizedBy: "Fulana, produtora",
        publishAuthorizedAt: "2026-10-01",
      }),
    );
    expect(published.status).toBe("ok");
    const project = await getProject(ctx, projectId);
    expect(project?.publishedOnSite).toBe(true);
    expect(project?.publishAuthorizedBy).toBe("Fulana, produtora");

    expect((await unpublishProjectAction(idleState, fd({ projectId }))).status).toBe("ok");
    expect((await getProject(ctx, projectId))?.publishedOnSite).toBe(false);
  });

  it("arquivar exige motivo; outro exige detalhe", async () => {
    const noReason = await moveProjectStageAction(idleState, fd({ projectId, to: "arquivado" }));
    expect(noReason.status).toBe("error");
    const outro = await moveProjectStageAction(
      idleState,
      fd({ projectId, to: "arquivado", lostReason: "outro" }),
    );
    expect(outro.status).toBe("error");
    expect(outro.status === "error" && outro.missing).toContain("detalhe do motivo (outro)");
    expect((await getProject(ctx, projectId))?.stage).toBe("captando");
  });

  it("listagem traz saldo, dias restantes e alertas R-13 e isola por tenant", async () => {
    const now = new Date("2027-09-01T12:00:00Z");
    const rows = await listProjectSummaries(ctx, {}, now);
    const row = rows.find((r) => r.id === projectId)!;
    expect(row.balance).toBe(1_200_000);
    expect(row.raisedPercent).toBe(0);
    expect(row.daysRemaining).toBe(121);
    // Captando, prazo a menos de 6 meses e 0% captado: os dois alertas.
    expect(row.alerts).toEqual(["prazo", "captacao"]);
    expect((await listProjectAlerts(ctx, now)).map((p) => p.id)).toContain(projectId);
    expect(
      (await listProjectAlerts(ctx, new Date("2026-10-04T12:00:00Z"))).find(
        (p) => p.id === projectId,
      )?.alerts,
    ).toEqual(["captacao"]);
    expect(await listProjectSummaries(other, {}, now)).toEqual([]);
    expect(await getProjectDetail(other, projectId)).toBeNull();
    const detail = await getProjectDetail(ctx, projectId, now);
    expect(detail?.proponentName).toBe("Produtora Teste");
    expect(detail?.commissionTotal).toBe(0);
    expect(detail?.ownerName).toBeTruthy();
  });

  it("outro tenant não consegue mover nem publicar o projeto", async () => {
    session.current = { tenantId: other.tenantId, userId: other.userId!, role: "owner" };
    const moved = await moveProjectStageAction(idleState, fd({ projectId, to: "execucao" }));
    expect(moved.status).toBe("error");
    const published = await publishProjectAction(
      idleState,
      fd({ projectId, publishAuthorizedBy: "X", publishAuthorizedAt: "2026-10-01" }),
    );
    expect(published.status).toBe("error");
    session.current = { tenantId: ctx.tenantId, userId: ctx.userId!, role: "owner" };
    expect((await getProject(ctx, projectId))?.stage).toBe("captando");
  });
});
