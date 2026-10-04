// Formulário de diagnóstico (estrutura-e-copy.md, seção 5.4) pela Server Action pública, contra
// PGlite: pipeline e estágio, attributes, interesse lic_rs, tarefa de agendamento com SLA de 1 dia
// útil, projeto de interesse validado (R-11) e tags.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createLeadFromForm } from "@/actions/leads";
import { env } from "@/env";
import { addBusinessDays } from "@/lib/domain/sla";
import { listActivities } from "@/lib/repos/activities";
import type { Ctx } from "@/lib/repos/ctx";
import { getLeadByEmail } from "@/lib/repos/leads";
import { createOrganization } from "@/lib/repos/organizations";
import { createProject, publishProject } from "@/lib/repos/projects";
import { ensureTenant } from "@/lib/repos/tenants";
import { issueFormTimestamp } from "@/lib/signing";
import { initialLeadFormState, type LeadFormState } from "@/lib/validation/forms/state";
import { uniqueEmail } from "../helpers";

const request = vi.hoisted(() => ({ ip: "203.0.113.1" }));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": request.ip, "user-agent": "vitest" }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const ctx: Ctx = { tenantId: env.DEFAULT_TENANT_ID, userId: null };

let ipSeq = 0;
function freshIp(): string {
  ipSeq += 1;
  return `198.51.100.${ipSeq}`;
}

const validToken = () => issueFormTimestamp(new Date(Date.now() - 5_000));

type Outcome = { redirect: string } | { state: LeadFormState };

async function submit(fields: Record<string, string>): Promise<Outcome> {
  request.ip = freshIp();
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  try {
    const state = await createLeadFromForm(initialLeadFormState, fd);
    return { state };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("REDIRECT:")) return { redirect: message.slice("REDIRECT:".length) };
    throw error;
  }
}

function pjFields(email: string, extra: Record<string, string> = {}) {
  return {
    form_id: "diagnostic",
    tipo_pessoa: "PJ",
    nome: "Carlos Diretor",
    email,
    telefone: "(54) 98403-2180",
    empresa: "Metalúrgica Teste",
    cargo: "financeiro",
    regime_tributario: "lucro_real",
    irpj_faixa: "500k_2500k",
    apuracao: "anual",
    contador_escritorio: "Escritório Contábil Teste",
    formato: "diagnostico",
    contador_participa: "on",
    cidade: "Caxias do Sul",
    uf: "RS",
    disponibilidade: "manha",
    consent_lgpd: "on",
    form_ts: validToken(),
    source_page: "/diagnostico",
    ...extra,
  };
}

function pfFields(email: string, extra: Record<string, string> = {}) {
  return {
    form_id: "diagnostic",
    tipo_pessoa: "PF",
    nome: "Ana Médica",
    email,
    telefone: "54984032180",
    modelo_declaracao: "completa",
    ir_devido_faixa: "20k_80k",
    cidade: "Bento Gonçalves",
    uf: "RS",
    consent_lgpd: "on",
    form_ts: validToken(),
    source_page: "/diagnostico",
    ...extra,
  };
}

let publishedSlug: string;
let publishedId: string;
let unpublishedSlug: string;

beforeAll(async () => {
  await ensureTenant({ id: ctx.tenantId, name: "Prospekto" });
  const proponent = await createOrganization(ctx, { type: "proponente", name: "Ocotea Teste" });
  const published = await createProject(ctx, {
    proponentOrgId: proponent.id,
    name: "Projeto Publicado",
    slug: "projeto-publicado",
    mechanism: "audiovisual_art1A",
    stage: "captando",
    approvedAmount: 2_400_000,
    fundraisingFeeAmount: 150_000,
  });
  await publishProject(ctx, {
    projectId: published.id,
    publishAuthorizedBy: "Ocotea (e-mail de 01/10/2026)",
    publishAuthorizedAt: new Date("2026-10-01T12:00:00Z"),
  });
  publishedSlug = published.slug;
  publishedId = published.id;
  const unpublished = await createProject(ctx, {
    proponentOrgId: proponent.id,
    name: "Projeto Em Captação Sem Autorização",
    slug: "projeto-sem-autorizacao",
    mechanism: "rouanet_art18",
    stage: "captando",
    approvedAmount: 500_000,
  });
  unpublishedSlug = unpublished.slug;
});

describe("diagnóstico PJ", () => {
  it("cria lead PJ em patrocinadores/novo com origem diagnostico, attributes da 9.3 e tarefa com SLA de 1 dia útil", async () => {
    const email = uniqueEmail("diag-pj");
    const before = new Date();
    const out = await submit(pjFields(email));
    expect(out).toMatchObject({ redirect: expect.stringMatching(/^\/obrigado\/diagnostico\?/) });
    const params = new URLSearchParams((out as { redirect: string }).redirect.split("?")[1]);
    expect(params.get("f")).toBe("diagnostic");
    expect(params.get("s")).toBe("PJ");
    expect(params.get("o")).toBe("diagnostico");

    const lead = await getLeadByEmail(ctx, email, "PJ");
    expect(lead).not.toBeNull();
    expect(lead!.pipeline).toBe("patrocinadores");
    expect(lead!.stage).toBe("novo");
    expect(lead!.source).toBe("diagnostico");
    expect(lead!.interest).toBe("rouanet");
    expect(lead!.phone).toBe("+5554984032180");
    expect(lead!.attributes).toEqual({
      empresa: "Metalúrgica Teste",
      cargo: "financeiro",
      regime_tributario: "lucro_real",
      regime_confirmado_por: "declarado",
      irpj_faixa: "500k_2500k",
      apuracao: "anual",
      contador_escritorio: "Escritório Contábil Teste",
      contador_participa: true,
      disponibilidade: "manha",
    });
    expect(lead!.tags).toEqual(["contador_na_reuniao"]);
    expect(lead!.projectInterestId).toBeNull();

    const tasks = await listActivities(ctx, { leadId: lead!.id, type: "tarefa" });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].subject).toMatch(/diagnóstico de 30 minutos com o contador/);
    expect(tasks[0].doneAt).toBeNull();
    expect(tasks[0].data).toMatchObject({ formato: "diagnostico", disponibilidade: "manha" });
    const due = tasks[0].dueAt!;
    const expected = addBusinessDays(before, 1);
    expect(Math.abs(due.getTime() - expected.getTime())).toBeLessThan(60_000);

    const forms = await listActivities(ctx, { leadId: lead!.id, type: "formulario" });
    expect(forms).toHaveLength(1);
    expect(forms[0].data).toMatchObject({ form_id: "diagnostic", tipo_pessoa: "PJ" });
    // O carimbo e o honeypot nunca são gravados.
    expect(forms[0].data).not.toHaveProperty("form_ts");
    expect(forms[0].data).not.toHaveProperty("website");
  });

  it("regime presumido ou Simples recebe interesse lic_rs; simulação cria a tag simulacao_primeiro", async () => {
    const email = uniqueEmail("diag-presumido");
    const out = await submit(
      pjFields(email, {
        regime_tributario: "simples",
        formato: "simulacao",
        contador_participa: "",
      }),
    );
    expect(out).toHaveProperty("redirect");
    const lead = await getLeadByEmail(ctx, email, "PJ");
    expect(lead!.interest).toBe("lic_rs");
    expect(lead!.attributes).toMatchObject({ regime_tributario: "simples_nacional" });
    expect(lead!.tags).toEqual(["simulacao_primeiro"]);
    const tasks = await listActivities(ctx, { leadId: lead!.id, type: "tarefa" });
    expect(tasks[0].subject).toMatch(/simulação de 20 minutos/);
  });

  it("diagnóstico sem o contador marcado é recusado com erro no campo", async () => {
    const out = await submit(pjFields(uniqueEmail("diag-sem"), { contador_participa: "" }));
    expect(out).toMatchObject({
      state: { status: "error", errorCode: "validation" },
    });
    const state = (out as { state: LeadFormState }).state;
    expect(state.fieldErrors).toHaveProperty("contador_participa");
    expect(state.values).not.toHaveProperty("form_ts");
  });

  it("telefone é obrigatório", async () => {
    const out = await submit(pjFields(uniqueEmail("diag-tel"), { telefone: "" }));
    const state = (out as { state: LeadFormState }).state;
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.telefone).toMatch(/DDD/);
  });

  it("sem tipo_pessoa devolve erro no campo tipo_pessoa", async () => {
    const out = await submit(pjFields(uniqueEmail("diag-tipo"), { tipo_pessoa: "" }));
    const state = (out as { state: LeadFormState }).state;
    expect(state.status).toBe("error");
    expect(state.fieldErrors).toHaveProperty("tipo_pessoa");
  });
});

describe("diagnóstico PF", () => {
  it("cria lead PF em patrocinadores/novo com modelo e faixa e tarefa de ligação", async () => {
    const email = uniqueEmail("diag-pf");
    const out = await submit(pfFields(email, { simulation_id: "sim-123" }));
    expect(out).toMatchObject({
      redirect: expect.stringMatching(/^\/obrigado\/diagnostico\?.*s=PF/),
    });
    const lead = await getLeadByEmail(ctx, email, "PF");
    expect(lead!.pipeline).toBe("patrocinadores");
    expect(lead!.stage).toBe("novo");
    expect(lead!.source).toBe("diagnostico");
    expect(lead!.attributes).toEqual({ modelo_declaracao: "completa", ir_devido_faixa: "20k_80k" });
    const tasks = await listActivities(ctx, { leadId: lead!.id, type: "tarefa" });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].subject).toMatch(/ligação de 15 minutos/);
    const forms = await listActivities(ctx, { leadId: lead!.id, type: "formulario" });
    expect(forms[0].data).toMatchObject({ simulation_id: "sim-123" });
  });

  it("campos PJ ausentes não bloqueiam a PF; campos PF ausentes bloqueiam", async () => {
    const out = await submit(pfFields(uniqueEmail("diag-pf-erro"), { ir_devido_faixa: "" }));
    const state = (out as { state: LeadFormState }).state;
    expect(state.status).toBe("error");
    expect(state.fieldErrors).toHaveProperty("ir_devido_faixa");
    expect(state.fieldErrors).not.toHaveProperty("empresa");
  });
});

describe("projeto de interesse (R-11)", () => {
  it("projeto publicado pelo slug vira project_interest_id, tag projeto:[slug] e tarefa ligada ao projeto", async () => {
    const email = uniqueEmail("diag-proj");
    const out = await submit(pjFields(email, { projeto_id: publishedSlug }));
    expect(out).toHaveProperty("redirect");
    const lead = await getLeadByEmail(ctx, email, "PJ");
    expect(lead!.projectInterestId).toBe(publishedId);
    expect(lead!.tags).toEqual(expect.arrayContaining([`projeto:${publishedSlug}`]));
    const tasks = await listActivities(ctx, { leadId: lead!.id, type: "tarefa" });
    expect(tasks[0].projectId).toBe(publishedId);
  });

  it("projeto publicado pelo id também é aceito", async () => {
    const email = uniqueEmail("diag-proj-id");
    const out = await submit(pfFields(email, { projeto_id: publishedId.toUpperCase() }));
    expect(out).toHaveProperty("redirect");
    const lead = await getLeadByEmail(ctx, email, "PF");
    expect(lead!.projectInterestId).toBe(publishedId);
  });

  it("projeto em captando sem autorização de publicação é recusado", async () => {
    const out = await submit(pjFields(uniqueEmail("diag-np"), { projeto_id: unpublishedSlug }));
    const state = (out as { state: LeadFormState }).state;
    expect(state.status).toBe("error");
    expect(state.errorCode).toBe("validation");
    expect(state.fieldErrors?.projeto_id).toMatch(/não está mais em captação/);
  });

  it("projeto inexistente é recusado", async () => {
    const out = await submit(pjFields(uniqueEmail("diag-404"), { projeto_id: "nao-existe" }));
    const state = (out as { state: LeadFormState }).state;
    expect(state.status).toBe("error");
    expect(state.fieldErrors).toHaveProperty("projeto_id");
  });
});
