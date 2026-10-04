// Server Action pública do gate do simulador contra PGlite (simulador-spec.md, seções 5.3, 6 e 8;
// modelo-de-dados.md, R-1, R-2, R-18). next/headers é substituído: o IP vem de uma variável
// controlada pelo teste e os cookies ficam em um pote em memória.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { recordReturningSimulation, submitSimulatorLead } from "@/actions/simulator";
import { initialSimulatorGateState, type SimulatorGateState } from "@/components/simulator/state";
import { env } from "@/env";
import { listActivities } from "@/lib/repos/activities";
import { listConsents } from "@/lib/repos/consents";
import type { Ctx } from "@/lib/repos/ctx";
import { getLeadByEmail } from "@/lib/repos/leads";
import { getSimulationByTokenHash, listSimulations } from "@/lib/repos/simulations";
import { ensureTenant } from "@/lib/repos/tenants";
import { issueFormTimestamp } from "@/lib/signing";
import {
  SIMULATOR_GATE_COOKIE,
  hashSimulationToken,
  verifyGateCookie,
  verifySimulationToken,
} from "@/lib/simulation-token";
import { uniqueEmail } from "../helpers";

const request = vi.hoisted(() => ({ ip: "203.0.113.1", jar: new Map<string, string>() }));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ "x-forwarded-for": `${request.ip}, 10.0.0.1`, "user-agent": "vitest" }),
  cookies: async () => ({
    set: (nameOrCookie: string | { name: string; value: string }, value?: string) => {
      if (typeof nameOrCookie === "string") request.jar.set(nameOrCookie, value ?? "");
      else request.jar.set(nameOrCookie.name, nameOrCookie.value);
    },
    get: (name: string) =>
      request.jar.has(name) ? { name, value: request.jar.get(name) } : undefined,
  }),
}));

const ctx: Ctx = { tenantId: env.DEFAULT_TENANT_ID, userId: null };

beforeAll(async () => {
  await ensureTenant({ id: ctx.tenantId, name: "Prospekto" });
});

let ipSeq = 0;
function freshIp(): string {
  ipSeq += 1;
  return `198.51.100.${ipSeq}`;
}

const validToken = () => issueFormTimestamp(new Date(Date.now() - 5_000));

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

async function submit(fields: Record<string, string>): Promise<SimulatorGateState> {
  return submitSimulatorLead(initialSimulatorGateState, formData(fields));
}

const PJ_INPUT = {
  taxpayer_type: "pj",
  regime: "lucro_real",
  input_mode: "tax_due",
  tax_due: 500000,
};

function pjFields(email: string, input: unknown = PJ_INPUT, extra: Record<string, string> = {}) {
  return {
    form_id: "simulator_pj",
    simulator_input: JSON.stringify(input),
    nome: "Maria Teste",
    email,
    empresa: "Vinícola Teste",
    cargo: "financeiro",
    cidade: "Bento Gonçalves",
    uf: "RS",
    telefone: "(54) 98403-2180",
    contador_escritorio: "Escritório Teste",
    consent_lgpd: "on",
    form_ts: validToken(),
    source_page: "/simulador",
    utm_source: "linkedin",
    ...extra,
  };
}

function pfFields(email: string, input: unknown, extra: Record<string, string> = {}) {
  return {
    form_id: "simulator_pf",
    simulator_input: JSON.stringify(input),
    nome: "João Teste",
    email,
    cidade: "Caxias do Sul",
    uf: "RS",
    contador_escritorio: "Contadora da família",
    consent_lgpd: "on",
    consent_marketing: "on",
    form_ts: validToken(),
    source_page: "/simulador",
    ...extra,
  };
}

function tokenFromUrl(url: string | null): string {
  expect(url).toMatch(/\/simulador\/resultado\//);
  return decodeURIComponent((url ?? "").split("/simulador/resultado/")[1] ?? "");
}

describe("submitSimulatorLead: PJ no lucro real", () => {
  it("cria lead, consentimento, activity e simulação; faixa no lead e valor exato só na simulação", async () => {
    request.ip = freshIp();
    request.jar.clear();
    const email = uniqueEmail("sim-pj");
    const state = await submit(pjFields(email));
    expect(state.status).toBe("success");
    if (state.status !== "success") return;
    expect(state.outcome).toBe("saved");
    expect(state.emailTo).toBe(email);
    expect(state.detail.result.status).toBe("ok");
    expect(state.detail.subject).toBe("Vinícola Teste");
    expect(state.detail.gate?.email).toBe(email);

    const lead = await getLeadByEmail(ctx, email, "PJ");
    expect(lead).not.toBeNull();
    expect(lead?.pipeline).toBe("patrocinadores");
    expect(lead?.stage).toBe("novo");
    expect(lead?.source).toBe("simulador");
    expect(lead?.interest).toBe("rouanet");
    expect(lead?.utmSource).toBe("linkedin");
    expect(lead?.phone).toBe("+5554984032180");
    expect(lead?.attributes).toMatchObject({
      empresa: "Vinícola Teste",
      cargo: "financeiro",
      regime_tributario: "lucro_real",
      irpj_faixa: "100k_500k",
      apuracao: "nao_sei",
      contador_escritorio: "Escritório Teste",
    });
    // O valor exato nunca entra nos atributos nem na activity.
    expect(JSON.stringify(lead?.attributes)).not.toContain("500000");
    expect(lead?.tags).toEqual([]);

    const consents = await listConsents(ctx, lead!.id);
    expect(consents.map((c) => c.purpose)).toEqual(["contato_comercial"]);
    expect(consents[0].channels).toEqual(["email", "telefone"]);

    const activities = await listActivities(ctx, { leadId: lead!.id, type: "formulario" });
    expect(activities).toHaveLength(1);
    const activityJson = JSON.stringify(activities[0].data);
    expect(activityJson).toContain("simulator_pj");
    expect(activityJson).toContain("100k_500k");
    expect(activityJson).not.toContain("500000");

    const simulations = await listSimulations(ctx, { leadId: lead!.id });
    expect(simulations).toHaveLength(1);
    const simulation = simulations[0];
    expect(simulation.kind).toBe("pj");
    expect(simulation.inputs).toMatchObject({ tax_due: 500000, regime: "lucro_real" });
    expect(simulation.applyLc224).toBe(true);
    expect(simulation.parametersVersion).toBe(state.detail.result.parameters_version);
    expect(simulation.resultTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(simulation.ipHash).toBeTruthy();
    expect(state.detail.simulationId).toBe(simulation.id);

    // Token do link: válido por 30 dias, localiza a simulação pelo hash; expirado e adulterado falham.
    const token = tokenFromUrl(state.detail.resultUrl);
    const check = verifySimulationToken(token);
    expect(check.status).toBe("ok");
    if (check.status !== "ok") return;
    expect(check.hash).toBe(simulation.resultTokenHash);
    expect(hashSimulationToken(token)).toBe(simulation.resultTokenHash);
    expect((await getSimulationByTokenHash(ctx, check.hash))?.id).toBe(simulation.id);
    const in31Days = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(verifySimulationToken(token, in31Days).status).toBe("expired");
    expect(verifySimulationToken(`${token}x`).status).toBe("invalid");
    expect(verifySimulationToken("abc.def").status).toBe("invalid");
    // Sem dados sensíveis na URL.
    expect(state.detail.resultUrl).not.toContain(email);

    // Cookie do gate assinado, com o lead.
    const cookie = verifyGateCookie(request.jar.get(SIMULATOR_GATE_COOKIE));
    expect(cookie).toEqual({ leadId: lead!.id, segment: "PJ", tenantId: ctx.tenantId });
  });

  it("visitante com o cookie do gate grava a nova simulação ligada ao lead e vê o detalhe direto", async () => {
    request.ip = freshIp();
    request.jar.clear();
    const email = uniqueEmail("sim-cookie");
    const first = await submit(pjFields(email));
    expect(first.status).toBe("success");
    const lead = await getLeadByEmail(ctx, email, "PJ");

    const again = await recordReturningSimulation(
      JSON.stringify({ ...PJ_INPUT, tax_due: 2000000 }),
      "/simulador",
    );
    expect(again.status).toBe("success");
    if (again.status !== "success") return;
    expect(again.outcome).toBe("saved");
    expect(again.emailTo).toBeNull();
    expect(again.detail.gate?.email).toBe(email);
    expect(again.detail.subject).toBe("Vinícola Teste");

    const simulations = await listSimulations(ctx, { leadId: lead!.id });
    expect(simulations).toHaveLength(2);
    const updated = await getLeadByEmail(ctx, email, "PJ");
    expect(updated?.attributes).toMatchObject({ irpj_faixa: "500k_2500k" });
    const activities = await listActivities(ctx, { leadId: lead!.id, type: "formulario" });
    expect(activities).toHaveLength(2);

    // Sem cookie, a mesma chamada manda de volta ao gate.
    request.jar.clear();
    const without = await recordReturningSimulation(JSON.stringify(PJ_INPUT), "/simulador");
    expect(without).toMatchObject({ status: "error", errorCode: "token" });
  });

  it("regime presumido com ICMS no RS recebe a tag desqualificado_rouanet e interesse lic_rs", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("sim-presumido");
    const state = await submit(
      pjFields(email, {
        taxpayer_type: "pj",
        regime: "lucro_presumido",
        input_mode: "tax_due",
        icms_contributor_rs: "sim",
        icms_prior_year: 300000,
        lic_rs_segment: "demais_editais",
      }),
    );
    expect(state.status).toBe("success");
    if (state.status !== "success") return;
    expect(state.detail.result.status).toBe("disqualified");
    expect(state.detail.result.lic_rs?.status).toBe("ok");
    const lead = await getLeadByEmail(ctx, email, "PJ");
    expect(lead?.tags).toContain("desqualificado_rouanet");
    expect(lead?.interest).toBe("lic_rs");
    expect(lead?.stage).toBe("novo");
    expect(lead?.attributes).toMatchObject({
      regime_tributario: "lucro_presumido",
      irpj_faixa: "nao_sei",
      contribuinte_icms_rs: true,
    });
    expect(JSON.stringify(lead?.attributes)).not.toContain("300000");
  });

  it("imposto zero recebe a tag sem_irpj", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("sim-zero");
    const state = await submit(pjFields(email, { ...PJ_INPUT, tax_due: 0 }));
    expect(state.status).toBe("success");
    if (state.status !== "success") return;
    expect(state.detail.result.status).toBe("no_tax");
    const lead = await getLeadByEmail(ctx, email, "PJ");
    expect(lead?.tags).toContain("sem_irpj");
    expect(lead?.attributes).toMatchObject({ irpj_faixa: "nao_sei" });
  });
});

describe("submitSimulatorLead: PF", () => {
  it("cria lead PF com modelo, faixa derivada e contador da declaração", async () => {
    request.ip = freshIp();
    request.jar.clear();
    const email = uniqueEmail("sim-pf");
    const state = await submit(
      pfFields(email, {
        taxpayer_type: "pf",
        declaration_model: "completa",
        input_mode: "tax_due",
        tax_due: 20000,
        includes_sport: true,
      }),
    );
    expect(state.status).toBe("success");
    if (state.status !== "success") return;
    expect(state.detail.subject).toBe("João Teste");
    const lead = await getLeadByEmail(ctx, email, "PF");
    expect(lead?.segment).toBe("PF");
    expect(lead?.pipeline).toBe("patrocinadores");
    expect(lead?.interest).toBe("rouanet");
    expect(lead?.attributes).toMatchObject({
      modelo_declaracao: "completa",
      ir_devido_faixa: "ate_20k",
      contador_declaracao: "Contadora da família",
    });
    expect(lead?.attributes).not.toHaveProperty("empresa");
    const consents = await listConsents(ctx, lead!.id);
    expect(consents.map((c) => c.purpose).sort()).toEqual(["contato_comercial", "marketing"]);
    expect(verifyGateCookie(request.jar.get(SIMULATOR_GATE_COOKIE))?.segment).toBe("PF");
    const simulations = await listSimulations(ctx, { leadId: lead!.id });
    expect(simulations[0].kind).toBe("pf");
    expect(simulations[0].applyLc224).toBe(false);
  });

  it("PF simplificada é desqualificada sem a tag de regime", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("sim-pf-simplificada");
    const state = await submit(
      pfFields(email, {
        taxpayer_type: "pf",
        declaration_model: "simplificada",
        input_mode: "tax_band",
        tax_band: "20k_80k",
      }),
    );
    expect(state.status).toBe("success");
    if (state.status !== "success") return;
    expect(state.detail.result.disqualified?.reason).toBe("modelo_simplificado");
    const lead = await getLeadByEmail(ctx, email, "PF");
    expect(lead?.tags).toEqual([]);
    expect(lead?.attributes).toMatchObject({ ir_devido_faixa: "20k_80k" });
  });
});

describe("submitSimulatorLead: validação e antispam", () => {
  it("campos do gate inválidos voltam com erro por campo e sem gravar", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("sim-invalido");
    const state = await submit(
      pjFields(email, PJ_INPUT, { consent_lgpd: "", cargo: "", nome: "A" }),
    );
    expect(state.status).toBe("error");
    if (state.status !== "error") return;
    expect(state.errorCode).toBe("validation");
    expect(Object.keys(state.fieldErrors ?? {}).sort()).toEqual(["cargo", "consent_lgpd", "nome"]);
    expect(state.values?.email).toBe(email);
    expect(state.values).not.toHaveProperty("form_ts");
    expect(await getLeadByEmail(ctx, email, "PJ")).toBeNull();
  });

  it("entrada do simulador inválida ou de outro tipo é recusada com mensagem em português", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("sim-entrada");
    const broken = await submit(
      pjFields(email, { taxpayer_type: "pj", regime: "lucro_real", input_mode: "tax_due" }),
    );
    expect(broken).toMatchObject({
      status: "error",
      errorCode: "validation",
      fieldErrors: { simulator_input: "Informe o IRPJ devido no período." },
    });
    const garbage = await submit(pjFields(email, PJ_INPUT, { simulator_input: "{nao-e-json" }));
    expect(garbage).toMatchObject({ status: "error", errorCode: "validation" });
    expect(await getLeadByEmail(ctx, email, "PJ")).toBeNull();
  });

  it("honeypot preenchido devolve o detalhe sem gravar nada (R-18)", async () => {
    request.ip = freshIp();
    request.jar.clear();
    const email = uniqueEmail("sim-bot");
    const state = await submit(pjFields(email, PJ_INPUT, { website: "http://spam.example" }));
    expect(state.status).toBe("success");
    if (state.status !== "success") return;
    expect(state.outcome).toBe("discarded");
    expect(state.emailTo).toBeNull();
    expect(state.detail.resultUrl).toBeNull();
    expect(await getLeadByEmail(ctx, email, "PJ")).toBeNull();
    expect(request.jar.has(SIMULATOR_GATE_COOKIE)).toBe(false);
  });

  it("envio em menos de 3 segundos é descartado; carimbo inválido pede recarga", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("sim-rapido");
    const fast = await submit(pjFields(email, PJ_INPUT, { form_ts: issueFormTimestamp() }));
    expect(fast).toMatchObject({ status: "success", outcome: "discarded" });
    const invalid = await submit(pjFields(email, PJ_INPUT, { form_ts: "xx.yy" }));
    expect(invalid).toMatchObject({ status: "error", errorCode: "token" });
    expect(await getLeadByEmail(ctx, email, "PJ")).toBeNull();
  });

  it("limite de 5 envios por IP por hora", async () => {
    request.ip = freshIp();
    for (let i = 0; i < 5; i += 1) {
      const state = await submit(pjFields(uniqueEmail("sim-ip")));
      expect(state.status).toBe("success");
    }
    const email = uniqueEmail("sim-ip-6");
    const sixth = await submit(pjFields(email));
    expect(sixth).toMatchObject({ status: "error", errorCode: "rate_limited" });
    if (sixth.status === "error") expect(sixth.message).not.toContain(email);
    expect(await getLeadByEmail(ctx, email, "PJ")).toBeNull();
  });

  it("reenvio em 10 minutos responde deduplicado, grava a simulação e não reenvia e-mail (R-2)", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("sim-dedup");
    const first = await submit(pjFields(email));
    expect(first).toMatchObject({ status: "success", outcome: "saved", emailTo: email });
    request.ip = freshIp();
    const second = await submit(pjFields(email, { ...PJ_INPUT, tax_due: 80000 }));
    expect(second).toMatchObject({ status: "success", outcome: "deduplicated", emailTo: null });
    if (second.status !== "success") return;
    expect(second.detail.resultUrl).toMatch(/\/simulador\/resultado\//);
    const lead = await getLeadByEmail(ctx, email, "PJ");
    expect(await listSimulations(ctx, { leadId: lead!.id })).toHaveLength(2);
    expect(await listActivities(ctx, { leadId: lead!.id, type: "formulario" })).toHaveLength(1);
    // A faixa gravada é a do primeiro envio (o reenvio não altera o lead).
    expect(lead?.attributes).toMatchObject({ irpj_faixa: "100k_500k" });
  });
});
