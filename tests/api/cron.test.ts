// Cron diário contra PGlite: autenticação, resumo R-13 (contagens), idempotência por dia, limpeza.
// Sem RESEND_API_KEY o envio fica em modo log (sendEmail), o que conta como enviado.
import { beforeAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/daily/route";
import { env } from "@/env";
import { buildDigest, renderDigest, type DigestData } from "@/lib/crm/digest";
import { isCronAuthorized } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createActivity } from "@/lib/repos/activities";
import { createContribution } from "@/lib/repos/contributions";
import type { Ctx } from "@/lib/repos/ctx";
import { getDigestSentOn, loadDigestData } from "@/lib/repos/digest";
import { createLead, updateLead } from "@/lib/repos/leads";
import { createOrganization } from "@/lib/repos/organizations";
import { createProject } from "@/lib/repos/projects";
import { createSimulation, listSimulations } from "@/lib/repos/simulations";
import { ensureTenant } from "@/lib/repos/tenants";
import { consentContato, uniqueEmail } from "../helpers";

function request(authorization?: string, query = "") {
  return new Request(`http://localhost:3000/api/cron/daily${query}`, {
    headers: authorization ? { authorization } : {},
  });
}

const ctx: Ctx = { tenantId: env.DEFAULT_TENANT_ID, userId: null };
const DAY = 86_400_000;
// Um só instante de referência para os registros e para loadDigestData: as contagens (vencidos,
// semana, prazo em dias-calendário de São Paulo) não dependem da hora em que a CI roda.
const now = new Date();

beforeAll(async () => {
  await ensureTenant({ id: ctx.tenantId, name: "Prospekto" });
  await db.insert(users).values({
    id: "cron-user-1",
    name: "Daniela",
    email: "cron-user-1@example.test",
    tenantId: ctx.tenantId,
    role: "owner",
  });
  // Lead com follow-up vencido e sem dono (novo): entra nos dois primeiros blocos.
  const { lead } = await createLead(ctx, {
    segment: "PJ",
    interest: "rouanet",
    name: "Lead Vencido",
    email: uniqueEmail("cron"),
    source: "site",
    utmCampaign: "campanha-teste",
    attributes: { empresa: "Empresa Vencida" },
    consents: [consentContato],
  });
  await updateLead(ctx, { leadId: lead.id, nextActionAt: new Date(now.getTime() - 3 * DAY) });
  await createActivity(ctx, {
    type: "tarefa",
    subject: "Ligar de volta",
    leadId: lead.id,
    dueAt: new Date(now.getTime() - DAY),
  });
  const proponent = await createOrganization(ctx, { type: "proponente", name: "Produtora Cron" });
  const soon = new Date(now.getTime() + 90 * DAY).toISOString().slice(0, 10);
  const project = await createProject(ctx, {
    proponentOrgId: proponent.id,
    name: "Projeto em alerta",
    slug: "projeto-em-alerta",
    mechanism: "rouanet_art18",
    stage: "captando",
    approvedAmount: 500_000,
    fundraisingDeadline: soon,
  });
  await createContribution(ctx, {
    projectId: project.id,
    leadId: lead.id,
    type: "patrocinio",
    mechanism: "rouanet_art18",
    proposedAmount: 20_000,
    expectedCloseAt: new Date(now.getTime() + 5 * DAY).toISOString().slice(0, 10),
  });
  // Simulação órfã antiga (apagada) e recente (mantida).
  const old = await createSimulation(ctx, {
    kind: "pj",
    inputs: {},
    outputs: {},
    parametersVersion: "v1",
    applyLc224: false,
  });
  await db.execute(
    `update simulations set created_at = now() - interval '45 days' where id = '${old.id}'`,
  );
  await createSimulation(ctx, {
    kind: "pj",
    inputs: {},
    outputs: {},
    parametersVersion: "v1",
    applyLc224: false,
  });
});

describe("/api/cron/daily", () => {
  it("responde 401 sem cabeçalho, com segredo errado ou com segredo não configurado", async () => {
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request("Bearer errado"))).status).toBe(401);
    expect((await GET(request(`Bearer ${env.CRON_SECRET}x`))).status).toBe(401);
    expect(isCronAuthorized(request("Bearer qualquer"), undefined)).toBe(false);
    expect(isCronAuthorized(request("Bearer qualquer"), "")).toBe(false);
  });

  it("monta o resumo R-13, envia aos usuários, limpa simulações órfãs e responde só contagens", async () => {
    const data = await loadDigestData(ctx, now);
    expect(data.overdueLeadsTotal).toBe(1);
    expect(data.overdueLeads[0].organization).toBe("Empresa Vencida");
    expect(data.tasksTotal).toBe(1);
    expect(data.newLeadsTotal).toBe(1);
    expect(data.contributionsTotal).toBe(1);
    expect(data.projectsTotal).toBe(1);
    expect(data.projects[0].reasons).toEqual(["prazo", "captacao"]);
    expect(data.week.leadsTotal).toBe(1);
    expect(data.week.byCampaign).toEqual([{ campaign: "campanha-teste", count: 1 }]);
    expect(data.week.campaignActive).toBe(true);

    const res = await GET(request(`Bearer ${env.CRON_SECRET}`));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      digest: {
        sent: number;
        failed: number;
        skipped: boolean;
        recipients: number;
        counts: Record<string, number>;
      };
      cleanup: { orphanSimulations: number; formAttempts: string };
    };
    expect(json.digest.recipients).toBe(1);
    expect(json.digest.sent).toBe(1);
    expect(json.digest.failed).toBe(0);
    expect(json.digest.skipped).toBe(false);
    expect(json.digest.counts).toMatchObject({
      overdue: 1,
      tasks: 1,
      newLeads: 1,
      contributions: 1,
      projects: 1,
    });
    expect(json.cleanup.orphanSimulations).toBe(1);
    expect(json.cleanup.formAttempts).toBe("ok");
    expect(JSON.stringify(json)).not.toMatch(/@example\.test|Lead Vencido/);
    expect(await listSimulations(ctx)).toHaveLength(1);
    expect(await getDigestSentOn(ctx)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("não reenvia no mesmo dia, salvo com ?force=1", async () => {
    const again = (await (await GET(request(`Bearer ${env.CRON_SECRET}`))).json()) as {
      digest: { skipped: boolean; sent: number };
    };
    expect(again.digest.skipped).toBe(true);
    expect(again.digest.sent).toBe(0);
    const forced = (await (await GET(request(`Bearer ${env.CRON_SECRET}`, "?force=1"))).json()) as {
      digest: { skipped: boolean; sent: number };
    };
    expect(forced.digest.skipped).toBe(false);
    expect(forced.digest.sent).toBe(1);
  });
});

describe("digest (função pura)", () => {
  const empty: DigestData = {
    overdueLeads: [],
    overdueLeadsTotal: 0,
    tasks: [],
    tasksTotal: 0,
    newLeads: [],
    newLeadsTotal: 0,
    contributions: [],
    contributionsTotal: 0,
    projects: [],
    projectsTotal: 0,
    week: {
      leadsTotal: 0,
      bySource: [],
      byCampaign: [],
      simulations: 0,
      guideDownloads: 0,
      campaignActive: false,
      leadsLast24h: 0,
    },
  };
  const now = new Date("2026-10-05T10:00:00Z"); // segunda-feira em São Paulo

  it("assunto no formato da seção 9.3 e alerta de zero leads", () => {
    const digest = buildDigest(empty, { appUrl: "https://prospekto.com.br/", now });
    expect(digest.subject).toBe("Prospekto CRM, segunda 05/10: 0 vencidos, 0 novos, 0 aportes");
    expect(digest.alerts).toEqual([
      "Nenhum lead nos últimos 7 dias: verifique formulários e campanhas.",
    ]);
    const rendered = renderDigest(digest, { recipientName: "Daniela", now });
    expect(rendered.text).toContain("FOLLOW-UPS VENCIDOS (0)");
    expect(rendered.text).toContain("Nada pendente hoje.");
    expect(rendered.html).toContain("https://prospekto.com.br/app/leads?vencidos=1");
  });

  it("alerta de 24 h só com campanha ativa; linhas com link para o lead", () => {
    const data: DigestData = {
      ...empty,
      overdueLeadsTotal: 1,
      overdueLeads: [
        {
          id: "l1",
          name: "Ana",
          organization: "ACME",
          pipeline: "patrocinadores",
          stage: "qualificado",
          nextActionAt: new Date(now.getTime() - 2 * DAY),
          ownerName: "Daniela",
        },
      ],
      week: { ...empty.week, leadsTotal: 3, campaignActive: true, leadsLast24h: 0 },
    };
    const digest = buildDigest(data, { appUrl: "https://prospekto.com.br", now });
    expect(digest.subject).toMatch(/1 vencidos/);
    expect(digest.alerts[0]).toMatch(/últimas 24 horas/);
    expect(digest.sections[0].lines[0]).toEqual({
      text: "Ana, ACME, patrocinadores/Qualificado, atrasado há 2 dias, Daniela",
      href: "https://prospekto.com.br/app/leads/l1",
    });
    const quiet = buildDigest(
      { ...data, week: { ...data.week, campaignActive: false } },
      { appUrl: "x", now },
    );
    expect(quiet.alerts).toEqual([]);
  });
});
