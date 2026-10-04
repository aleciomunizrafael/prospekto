"use server";

// public-action: gate do simulador, formulário público do site; não exige sessão de propósito
// (tests/auth-guard.test.ts reconhece este marcador).
//
// Server Action pública do gate do simulador (simulador-spec.md, seções 5.3, 6 e 8). Usada com
// useActionState pelo componente SimulatorGateForm. Valida o gate e a entrada do simulador (Zod),
// aplica o mesmo antispam de createLeadFromForm (honeypot, carimbo de tempo, limite por IP), cria
// ou atualiza o lead (consentimentos e activities.formulario na mesma transação, dedup de 10 min),
// grava a simulação com o hash do token do link de resultado (30 dias), define o cookie do gate,
// envia o e-mail "Sua simulação" e o aviso interno, e DEVOLVE o resultado detalhado sem redirecionar.
// Erro ao gravar o lead ainda devolve o detalhe (estado lead_save_failed) e vai ao log sem dados
// pessoais (regra R-16).
import { cookies } from "next/headers";
import { env } from "@/env";
import type {
  SimulatorDetailData,
  SimulatorGateInfo,
  SimulatorGateState,
} from "@/components/simulator/state";
import { emailSummary } from "@/components/simulator/view-model";
import { sendEmail } from "@/lib/email/send";
import {
  RATE_LIMIT_ERROR,
  TOKEN_ERROR,
  VALIDATION_ERROR,
  appUrl,
  buildConsents,
  checkAntispam,
  checkRateLimit,
  publicValues,
  requestMeta,
  sendAutoReply,
  sendInternalNotification,
} from "@/lib/leads/submit";
import { log } from "@/lib/log";
import type { Ctx } from "@/lib/repos/ctx";
import { createActivity } from "@/lib/repos/activities";
import { createLead, getLead, updateLead } from "@/lib/repos/leads";
import { createSimulation } from "@/lib/repos/simulations";
import { hashIp } from "@/lib/signing";
import {
  SIMULATION_TOKEN_MAX_AGE_SECONDS,
  SIMULATOR_GATE_COOKIE,
  issueGateCookie,
  issueSimulationToken,
  verifyGateCookie,
} from "@/lib/simulation-token";
import {
  parseSimulatorInput,
  simulate,
  type SimulatorInput,
  type SimulatorResult,
} from "@/lib/simulator";
import { formDataToObject } from "@/lib/validation/forms/common";
import {
  SIMULATOR_FORM_IDS,
  buildSimulatorLeadDraft,
  gateSchemaFor,
  leadAttributes,
  leadTags,
  simulationSummaryForCrm,
  type SimulatorGate,
  type SimulatorGatePj,
} from "@/lib/validation/forms/simulator";

const INPUT_ERROR = "Refaça a simulação antes de pedir o resultado detalhado.";
// Caminho interno do site (currentPath() em summary.tsx); qualquer outra coisa vira /simulador.
const SOURCE_PAGE_PATTERN = /^\/[^\s]{0,199}$/;

function safeSourcePage(value: unknown): string {
  return typeof value === "string" && SOURCE_PAGE_PATTERN.test(value) ? value : "/simulador";
}
const GATE_EXPIRED_ERROR =
  "Seu acesso ao resultado detalhado expirou. Preencha o formulário de novo.";

function parseInputJson(text: string | undefined): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

type SavedSimulation = { id: string; resultUrl: string };

// Grava a simulação com o hash do token do link (spec, 5.3). Falha vai ao log; a tela segue.
async function saveSimulation(
  ctx: Ctx,
  input: SimulatorInput,
  result: SimulatorResult,
  leadId: string | null,
  ip: string | null,
): Promise<SavedSimulation | null> {
  try {
    const { token, hash } = issueSimulationToken();
    const simulation = await createSimulation(ctx, {
      leadId: leadId ?? undefined,
      kind: input.taxpayer_type,
      inputs: input as unknown as Record<string, unknown>,
      outputs: result as unknown as Record<string, unknown>,
      parametersVersion: result.parameters_version,
      applyLc224: result.lc224.applied,
      resultTokenHash: hash,
      ipHash: hashIp(ip),
    });
    return {
      id: simulation.id,
      resultUrl: `${appUrl()}/simulador/resultado/${encodeURIComponent(token)}`,
    };
  } catch (error) {
    log("error", "falha ao gravar simulação", { leadId, error });
    return null;
  }
}

async function setGateCookie(ctx: Ctx, leadId: string, segment: "PJ" | "PF"): Promise<void> {
  try {
    const store = await cookies();
    store.set({
      name: SIMULATOR_GATE_COOKIE,
      value: issueGateCookie({ leadId, segment, tenantId: ctx.tenantId }),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/simulador",
      maxAge: SIMULATION_TOKEN_MAX_AGE_SECONDS,
    });
  } catch (error) {
    // Fora de uma requisição (testes) ou depois do início da resposta: só o log.
    log("warn", "cookie do gate do simulador não definido", { leadId, error });
  }
}

function gateInfo(gate: SimulatorGate, input: SimulatorInput): SimulatorGateInfo {
  const pj = input.taxpayer_type === "pj" ? (gate as SimulatorGatePj) : null;
  return {
    nome: gate.nome,
    email: gate.email,
    empresa: pj?.empresa,
    cargo: pj?.cargo,
    cidade: gate.cidade,
    uf: gate.uf,
    telefone: gate.telefone,
    contador_escritorio: gate.contador_escritorio,
  };
}

function detailFor(
  input: SimulatorInput,
  result: SimulatorResult,
  info: SimulatorGateInfo,
  saved: SavedSimulation | null,
): SimulatorDetailData {
  return {
    input,
    result,
    createdAt: new Date().toISOString(),
    subject: info.empresa || info.nome,
    simulationId: saved?.id ?? null,
    resultUrl: saved?.resultUrl ?? null,
    gate: info,
  };
}

export async function submitSimulatorLead(
  _prev: SimulatorGateState,
  formData: FormData,
): Promise<SimulatorGateState> {
  const raw = formDataToObject(formData);
  const values = publicValues(raw);

  // 1. Entrada do simulador, validada de novo no servidor (as mensagens são as mesmas do cliente).
  const inputCheck = parseSimulatorInput(parseInputJson(raw.simulator_input));
  if (!inputCheck.ok) {
    return {
      status: "error",
      errorCode: "validation",
      message: INPUT_ERROR,
      fieldErrors: { simulator_input: inputCheck.issues[0]?.message ?? INPUT_ERROR },
      values,
    };
  }
  const input = inputCheck.input;
  const formId = SIMULATOR_FORM_IDS[input.taxpayer_type];

  // 2. Campos do gate por tipo (spec, seção 6).
  const parsed = gateSchemaFor(input.taxpayer_type).safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !(key in fieldErrors)) fieldErrors[key] = issue.message;
    }
    return {
      status: "error",
      errorCode: "validation",
      message: VALIDATION_ERROR,
      fieldErrors,
      values,
    };
  }
  const gate: SimulatorGate = parsed.data;
  const result = simulate(input);

  // 3. Antispam (R-18): honeypot ou envio rápido devolve o detalhe sem gravar nada.
  const antispam = checkAntispam(raw, formId);
  if (antispam === "honeypot" || antispam === "too_fast") {
    return {
      status: "success",
      detail: detailFor(input, result, gateInfo(gate, input), null),
      outcome: "discarded",
      emailTo: null,
    };
  }
  if (antispam === "token_invalid") {
    return { status: "error", errorCode: "token", message: TOKEN_ERROR, values };
  }

  const ctx: Ctx = { tenantId: env.DEFAULT_TENANT_ID, userId: null };
  const meta = await requestMeta();
  if (!(await checkRateLimit(ctx, meta.ip, formId))) {
    return { status: "error", errorCode: "rate_limited", message: RATE_LIMIT_ERROR, values };
  }

  // 4. Lead (R-1, R-2): segmento PJ ou PF, pipeline patrocinadores, estágio novo, origem simulador.
  const summary = emailSummary(result);
  const draft = buildSimulatorLeadDraft({
    gate,
    input,
    result,
    sourcePage: gate.source_page,
    email: { ...summary, resultUrl: null },
  });
  let leadId: string | null = null;
  let created = false;
  let deduplicated = false;
  let pipeline = "";
  let stage = "";
  try {
    const saved = await createLead(ctx, {
      segment: draft.segment,
      interest: draft.interest,
      name: draft.name,
      email: draft.email,
      phone: draft.phone,
      city: draft.city,
      uf: draft.uf,
      source: draft.source,
      sourceDetail: draft.sourceDetail,
      utmSource: gate.utm_source || undefined,
      utmMedium: gate.utm_medium || undefined,
      utmCampaign: gate.utm_campaign || undefined,
      referrer: gate.referrer || undefined,
      landingPath: gate.landing_path || undefined,
      tags: draft.tags,
      attributes: draft.attributes,
      consents: buildConsents(draft, gate.source_page, meta.userAgent),
      formData: draft.formData,
    });
    leadId = saved.lead.id;
    created = saved.created;
    deduplicated = saved.deduplicated;
    pipeline = saved.lead.pipeline;
    stage = saved.lead.stage;
    log(
      "info",
      deduplicated
        ? "simulador: formulário deduplicado"
        : created
          ? "lead criado"
          : "lead atualizado",
      { tenantId: ctx.tenantId, formId, leadId, segment: draft.segment, pipeline },
    );
  } catch (error) {
    log("error", "falha ao gravar lead do simulador", { formId, error });
  }

  // 5. Simulação (valores exatos só aqui) e token do link, mesmo sem lead.
  const simulation = await saveSimulation(ctx, input, result, leadId, meta.ip);
  const detail = detailFor(input, result, gateInfo(gate, input), simulation);

  if (!leadId) {
    // Estado lead_save_failed (spec, seção 8): o detalhe aparece e a equipe é avisada por e-mail.
    await notifyLeadSaveFailure(draft.formData, simulation);
    return { status: "success", detail, outcome: "lead_save_failed", emailTo: null };
  }

  await setGateCookie(ctx, leadId, draft.segment === "PJ" ? "PJ" : "PF");

  // 6. E-mails (seção 5.6): reenvio em 10 minutos não reenvia (R-2).
  if (deduplicated) {
    return { status: "success", detail, outcome: "deduplicated", emailTo: null };
  }
  await sendAutoReply(draft, {
    leadId,
    templateData: { ...summary, resultUrl: simulation?.resultUrl ?? null },
  });
  await sendInternalNotification(draft, { formId, leadId, pipeline, stage, created });
  return { status: "success", detail, outcome: "saved", emailTo: gate.email };
}

// Visitante que já passou pelo gate (cookie assinado de 30 dias): grava a nova simulação ligada
// ao lead, atualiza faixa e interesse e devolve o detalhe direto (spec, seção 6). Sem formulário
// não há honeypot nem carimbo; vale o mesmo limite por IP de 5 por hora (R-18), para o cookie não
// virar um laço de gravação em simulations e activities.
export async function recordReturningSimulation(
  inputJson: string,
  sourcePage: string,
): Promise<SimulatorGateState> {
  const inputCheck = parseSimulatorInput(parseInputJson(inputJson));
  if (!inputCheck.ok) {
    return { status: "error", errorCode: "validation", message: INPUT_ERROR };
  }
  const input = inputCheck.input;
  const result = simulate(input);
  const ctx: Ctx = { tenantId: env.DEFAULT_TENANT_ID, userId: null };

  let gatePayload: ReturnType<typeof verifyGateCookie> = null;
  try {
    const store = await cookies();
    gatePayload = verifyGateCookie(store.get(SIMULATOR_GATE_COOKIE)?.value);
  } catch {
    gatePayload = null;
  }
  const expectedSegment = input.taxpayer_type === "pj" ? "PJ" : "PF";
  if (!gatePayload || gatePayload.tenantId !== ctx.tenantId) {
    return { status: "error", errorCode: "token", message: GATE_EXPIRED_ERROR };
  }
  const lead = await getLead(ctx, gatePayload.leadId).catch(() => null);
  if (!lead || lead.segment !== expectedSegment) {
    // Lead apagado ou simulação de outro tipo (PJ após PF): volta ao gate.
    return { status: "error", errorCode: "token", message: GATE_EXPIRED_ERROR };
  }

  const meta = await requestMeta();
  if (!(await checkRateLimit(ctx, meta.ip, SIMULATOR_FORM_IDS[input.taxpayer_type]))) {
    return { status: "error", errorCode: "rate_limited", message: RATE_LIMIT_ERROR };
  }
  const simulation = await saveSimulation(ctx, input, result, lead.id, meta.ip);
  const attrs = lead.attributes as Record<string, unknown>;
  const str = (key: string) =>
    typeof attrs[key] === "string" ? (attrs[key] as string) : undefined;
  const info: SimulatorGateInfo = {
    nome: lead.name,
    email: lead.email,
    empresa: input.taxpayer_type === "pj" ? str("empresa") : undefined,
    cargo: input.taxpayer_type === "pj" ? str("cargo") : undefined,
    cidade: lead.city ?? "",
    uf: lead.uf ?? "",
    telefone: lead.phone ?? undefined,
    contador_escritorio:
      input.taxpayer_type === "pj" ? str("contador_escritorio") : str("contador_declaracao"),
  };

  try {
    const merged = { ...attrs, ...leadAttributes(info, input, result) };
    await updateLead(ctx, {
      leadId: lead.id,
      interest: result.interest,
      tags: [...new Set([...lead.tags, ...leadTags(result)])],
      attributes: merged,
    });
    await createActivity(ctx, {
      type: "formulario",
      subject: "Nova simulação (simulador)",
      data: {
        form_id: SIMULATOR_FORM_IDS[input.taxpayer_type],
        simulation_id: simulation?.id ?? null,
        source_page: safeSourcePage(sourcePage),
        simulacao: simulationSummaryForCrm(input, result),
      },
      leadId: lead.id,
    });
  } catch (error) {
    log("error", "falha ao atualizar lead com nova simulação", { leadId: lead.id, error });
  }

  return {
    status: "success",
    detail: detailFor(input, result, info, simulation),
    outcome: simulation ? "saved" : "lead_save_failed",
    emailTo: null,
  };
}

// Aviso à equipe quando o lead não pôde ser gravado (spec, seção 8, lead_save_failed). Vai por
// e-mail, não por log; por isso pode levar os dados do formulário.
async function notifyLeadSaveFailure(
  formData: Record<string, unknown>,
  simulation: SavedSimulation | null,
): Promise<void> {
  try {
    const lines = Object.entries(formData)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
    const text = [
      "Falha ao gravar lead do simulador. Dados do formulário para cadastro manual no CRM:",
      "",
      ...lines,
      "",
      simulation ? `Simulação gravada: ${simulation.id}` : "Simulação não gravada.",
    ].join("\n");
    await sendEmail({
      to: env.LEAD_NOTIFY_EMAIL,
      subject: "Falha ao gravar lead do simulador",
      text,
      html: `<pre style="font-family:Inter,Helvetica,Arial,sans-serif;white-space:pre-wrap">${text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</pre>`,
      templateId: "lead-save-failed",
      leadId: null,
    });
  } catch (error) {
    log("error", "falha no aviso de lead não gravado", { error });
  }
}
