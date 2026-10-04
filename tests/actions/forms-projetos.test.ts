// Carteira pública (modelo-de-dados.md, 3.8 e regra R-11): listPublishedProjects e
// getPublishedProjectBySlug só devolvem projetos em captando, publicados e com autorização, do
// tenant informado, com o saldo calculado no banco (R-5) e sem campos internos.
import { beforeAll, describe, expect, it } from "vitest";
import type { Ctx } from "@/lib/repos/ctx";
import { createOrganization } from "@/lib/repos/organizations";
import {
  createProject,
  getPublishedProjectByRef,
  getPublishedProjectBySlug,
  listPublishedProjects,
  moveProjectStage,
  publishProject,
  unpublishProject,
} from "@/lib/repos/projects";
import { makeTenant } from "../helpers";

let ctx: Ctx;
let other: Ctx;
let proponentId: string;

async function project(ctx: Ctx, slug: string, stage: "captando" | "autorizado" = "captando") {
  return createProject(ctx, {
    proponentOrgId: proponentId,
    name: `Projeto ${slug}`,
    slug,
    mechanism: "rouanet_art18",
    stage,
    approvedAmount: 1_000_000,
    fundraisingFeeAmount: 100_000,
    fundraisingDeadline: "2026-12-30",
    city: "Caxias do Sul",
    uf: "RS",
    summary: "Resumo público.",
    counterparts: "Marca no material.",
  });
}

beforeAll(async () => {
  ctx = await makeTenant();
  other = await makeTenant();
  proponentId = (await createOrganization(ctx, { type: "proponente", name: "Proponente" })).id;
});

describe("listPublishedProjects (R-11)", () => {
  it("devolve só captando + publicado + autorizado, do tenant, com saldo e nome do proponente", async () => {
    const pub = await project(ctx, "publicado");
    await publishProject(ctx, {
      projectId: pub.id,
      publishAuthorizedBy: "Proponente, e-mail de 01/10/2026",
      publishAuthorizedAt: new Date("2026-10-01T10:00:00Z"),
    });
    await project(ctx, "captando-sem-autorizacao");
    await project(ctx, "autorizado-nao-captando", "autorizado");

    const list = await listPublishedProjects(ctx);
    expect(list.map((p) => p.slug)).toEqual(["publicado"]);
    const [p] = list;
    expect(p.balance).toBe(1_000_000);
    expect(p.proponentName).toBe("Proponente");
    expect(p.fundraisingDeadline).toBe("2026-12-30");
    expect(p.publishedAt).toBe("2026-10-01T10:00:00.000Z");
    expect(p).not.toHaveProperty("commissionPct");
    expect(p).not.toHaveProperty("fundraisingFeeAmount");
    expect(p).not.toHaveProperty("ownerUserId");
    expect(p).not.toHaveProperty("proponentOrgId");

    // Outro tenant não vê nada.
    expect(await listPublishedProjects(other)).toEqual([]);
    expect(await getPublishedProjectBySlug(other, "publicado")).toBeNull();
  });

  it("despublicar ou arquivar tira o projeto da carteira", async () => {
    const a = await project(ctx, "despublicado");
    await publishProject(ctx, {
      projectId: a.id,
      publishAuthorizedBy: "Proponente",
      publishAuthorizedAt: new Date(),
    });
    expect(await getPublishedProjectBySlug(ctx, "despublicado")).not.toBeNull();
    await unpublishProject(ctx, a.id);
    expect(await getPublishedProjectBySlug(ctx, "despublicado")).toBeNull();

    const b = await project(ctx, "arquivado");
    await publishProject(ctx, {
      projectId: b.id,
      publishAuthorizedBy: "Proponente",
      publishAuthorizedAt: new Date(),
    });
    await moveProjectStage(ctx, { projectId: b.id, to: "arquivado", lostReason: "sem_interesse" });
    expect(await getPublishedProjectBySlug(ctx, "arquivado")).toBeNull();
  });

  it("getPublishedProjectByRef aceita id ou slug e recusa o que não está publicado", async () => {
    const pub = await getPublishedProjectBySlug(ctx, "publicado");
    expect(pub).not.toBeNull();
    expect((await getPublishedProjectByRef(ctx, pub!.id))?.slug).toBe("publicado");
    expect((await getPublishedProjectByRef(ctx, " Publicado "))?.id).toBe(pub!.id);
    expect(await getPublishedProjectByRef(ctx, "captando-sem-autorizacao")).toBeNull();
    expect(await getPublishedProjectByRef(ctx, "")).toBeNull();
    expect(await getPublishedProjectByRef(other, pub!.id)).toBeNull();
  });
});
