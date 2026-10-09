// Redação do contexto que vai ao modelo (ADR-003, seção 5): lista fechada de campos montada a
// partir dos DTOs que a página do lead já carrega. O que não está aqui não existe para o modelo.
// Módulo puro: sem SDK, sem banco, sem Next. Testado em tests/lib/ai-redact.test.ts.
import { ATTRIBUTE_FIELDS } from "@/lib/crm/attributes";
import { formActivitySubject } from "@/lib/crm/activity-text";
import { CONTRIBUTION_STATUS_LABELS } from "@/lib/crm/enum-labels";
import { formatCalendarDate, formatDate, formatDateTime } from "@/lib/crm/format";
import {
  ACTIVITY_TYPE_LABELS,
  CONSENT_CHANNEL_LABELS,
  CONSENT_PURPOSE_LABELS,
  INTEREST_LABELS,
  SEGMENT_LABELS,
  SOURCE_LABELS,
  TEMPERATURE_LABELS,
  enumLabel,
  pipelineLabel,
  stageLabel,
  tagLabel,
} from "@/lib/crm/labels";
import { leadCompany, stageInfo } from "@/lib/crm/lead-view";
import { CONSENT_PURPOSES, type ConsentPurpose } from "@/lib/domain/enums";
import type { Activity } from "@/lib/repos/activities";
import type { Consent } from "@/lib/repos/consents";
import type { ContributionSummary } from "@/lib/repos/contributions";
import type { LeadDetail } from "@/lib/repos/leads";
import type { Simulation } from "@/lib/repos/simulations";

export const SCRUB_MAX_CHARS = 8_000;
const ACTIVITY_BODY_MAX = 600;
const ACTIVITY_MAX = 20;
const ACTIVITY_WINDOW_DAYS = 180;
const NOT_INFORMED = "não informado";

// Padrões de mascaramento (as regex de validação em src/lib/validation/common.ts aceitam; estas
// escondem). Ordem: e-mail, CNPJ (14 dígitos), telefone, CPF (11), para o maior ganhar.
// O último rótulo do domínio é só letras, números e hífen: o ponto final da frase fica de fora.
const EMAIL_RE = /[^\s<>@"'`(),;:]+@(?:[^\s<>@"'`(),;:.]+\.)+[\p{L}\p{N}-]{2,}/gu;
const CNPJ_RE = /\b\d{2}\.?\d{3}\.?\d{3}\/\d{4}-?\d{2}\b|\b\d{14}\b/g;
const CPF_RE = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{3}\.?\d{3}\.?\d{3}-\d{2}\b|\b\d{11}\b/g;
// Telefone brasileiro: +55 opcional (colado ou separado), DDD com ou sem parênteses, 8 ou 9 dígitos
// com separador opcional ("(54) 98403-2180", "54 98403-2180", "+55 54 98403 2180", "54984032180"
// e "+5554984032180", o E.164 gravado no CRM). Nunca começa nem termina no meio de um número.
const PHONE_RE = /(?<!\d)(?:\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?(?:9\s?\d{4}|\d{4})[\s.-]?\d{4}(?!\d)/g;

export function scrubText(text: string, options: { keepCnpj?: boolean } = {}): string {
  let out = text.slice(0, SCRUB_MAX_CHARS);
  out = out.replace(EMAIL_RE, "[e-mail]");
  if (!options.keepCnpj) out = out.replace(CNPJ_RE, "[CNPJ]");
  // Telefone antes de CPF: 11 dígitos soltos com o 9 do celular viram [telefone]; o que sobrar
  // com cara de CPF (formatado ou 11 dígitos) vira [CPF]. Nos dois casos o número some.
  out = out.replace(PHONE_RE, "[telefone]");
  out = out.replace(CPF_RE, "[CPF]");
  return out;
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

// "sexta-feira, 09/10/2026" em America/Sao_Paulo (decisão P4: só na mensagem de usuário).
export function formatTodayLine(now: Date): string {
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "America/Sao_Paulo",
  }).format(now);
  return `Hoje é ${weekday}, ${formatDate(now)}.`;
}

export type LeadContextInput = {
  lead: LeadDetail;
  activities: Activity[];
  consents: Consent[];
  simulations: Simulation[];
  contributions: ContributionSummary[];
  ownerName: string | null;
  projectNames: Map<string, string>;
  now: Date;
};

export type LeadContextActivity = {
  data: string; // dd/mm/aaaa hh:mm
  tipo: string; // rótulo em português
  assunto: string;
  texto: string | null; // body mascarado, até 600 caracteres; null no formulário
};

// Chaves fixas (ADR-003, 5.1). Sem e-mail, telefone, CPF, CNPJ, ids, inputs da simulação.
export type LeadContext = {
  nome: string;
  primeiroNome: string;
  empresa: string | null;
  cidade: string | null;
  segmento: string;
  pipeline: string;
  estagio: string;
  diasNoEstagio: number;
  prazoEstagio: string;
  interesse: string;
  origem: string;
  temperatura: string;
  score: number;
  tags: string[];
  campos: { rotulo: string; valor: string }[];
  mensagem: string | null;
  atividades: LeadContextActivity[];
  eventosSistema: number;
  downloads: number;
  simulacao: { mecanismo: string; valorEstimado: string } | null;
  consentimentos: string[];
  aportes: { projeto: string; status: string; valor: string }[];
  responsavel: string | null;
  proximaAcao: string | null;
  ultimoContato: string | null;
};

// Campos do segmento que nunca vão (ADR-003, 5.2); o resto de ATTRIBUTE_FIELDS vai traduzido.
const HIDDEN_ATTRIBUTES = new Set(["cnpj", "vinculo_art27_checado_por"]);

function attributeText(field: { type: string }, raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "boolean") return raw ? "sim" : "não";
  if (field.type === "date" && typeof raw === "string") return formatCalendarDate(raw);
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "string") return scrubText(field.type === "select" ? enumLabel(raw) : raw);
  return null;
}

// "cerca de R$ 12 mil" a partir de um valor em reais (nunca o valor exato da simulação).
export function roughBRL(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return NOT_INFORMED;
  if (value >= 1_000_000) {
    const millions = Math.round(value / 100_000) / 10;
    return `cerca de R$ ${millions.toLocaleString("pt-BR")} ${millions === 1 ? "milhão" : "milhões"}`;
  }
  if (value >= 1_000) return `cerca de R$ ${Math.round(value / 1_000)} mil`;
  return `menos de R$ 1 mil`;
}

function summarizeSimulation(simulation: Simulation | undefined): LeadContext["simulacao"] {
  if (!simulation) return null;
  const out = simulation.outputs as Record<string, unknown>;
  const limits = out.limits as { cultural_basket?: { min?: number; max?: number | null } } | null;
  const comparison = out.comparison as { mechanism_name?: string } | null;
  const mechanisms = (
    out.limits as { mechanisms?: { name: string; highlighted: boolean }[] } | null
  )?.mechanisms;
  const mecanismo =
    comparison?.mechanism_name ??
    mechanisms?.find((m) => m.highlighted)?.name ??
    (typeof out.featured_mechanism === "string" ? out.featured_mechanism : null);
  const basket = limits?.cultural_basket;
  const amount = basket ? (basket.max ?? basket.min ?? 0) : 0;
  if (!mecanismo && !amount) {
    return { mecanismo: NOT_INFORMED, valorEstimado: NOT_INFORMED };
  }
  return { mecanismo: mecanismo ?? NOT_INFORMED, valorEstimado: roughBRL(amount) };
}

function describeConsent(purpose: ConsentPurpose, consents: Consent[]): string {
  const label = CONSENT_PURPOSE_LABELS[purpose].toLowerCase();
  const current = consents.find((c) => c.purpose === purpose); // lista vem em ordem decrescente
  if (!current) return `${label}: nunca registrado`;
  const when = formatDate(current.createdAt);
  if (!current.granted) return `${label}: revogado em ${when}`;
  const channels = current.channels.map((c) => CONSENT_CHANNEL_LABELS[c] ?? c).join(", ");
  return `${label}: autorizado em ${when}${channels ? ` por ${channels}` : ""}`;
}

const CONTACT_ACTIVITY_TYPES = new Set([
  "ligacao",
  "reuniao",
  "email",
  "whatsapp",
  "visita",
  "nota",
  "tarefa",
]);

function describeActivities(activities: Activity[], now: Date) {
  const since = now.getTime() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60_000;
  const recent = activities.filter((a) => a.occurredAt.getTime() >= since);
  const eventosSistema = recent.filter((a) => a.type === "sistema").length;
  const downloads = recent.filter((a) => a.type === "download").length;
  const atividades: LeadContextActivity[] = [];
  for (const a of recent) {
    if (atividades.length >= ACTIVITY_MAX) break;
    if (a.type === "formulario") {
      atividades.push({
        data: formatDateTime(a.occurredAt),
        tipo: ACTIVITY_TYPE_LABELS.formulario,
        assunto: `preencheu o formulário (${formActivitySubject(a.subject)}) em ${formatDate(a.occurredAt)}`,
        texto: null,
      });
      continue;
    }
    if (!CONTACT_ACTIVITY_TYPES.has(a.type)) continue;
    let assunto = scrubText(a.subject);
    if (a.type === "tarefa") {
      const due = a.dueAt ? ` (vence ${formatDate(a.dueAt)})` : "";
      assunto = `${assunto}${a.doneAt ? " (concluída)" : ` (aberta${due})`}`;
    }
    const body = a.body ? scrubText(a.body).slice(0, ACTIVITY_BODY_MAX) : null;
    atividades.push({
      data: formatDateTime(a.occurredAt),
      tipo: ACTIVITY_TYPE_LABELS[a.type],
      assunto,
      texto: body && body.trim() ? body.trim() : null,
    });
  }
  return { atividades, eventosSistema, downloads };
}

export function buildLeadContext(input: LeadContextInput): LeadContext {
  const { lead, now } = input;
  const info = stageInfo(lead, now);
  const fields = ATTRIBUTE_FIELDS[lead.segment];
  const campos: LeadContext["campos"] = [];
  for (const field of fields) {
    if (HIDDEN_ATTRIBUTES.has(field.key)) continue;
    const valor = attributeText(field, lead.attributes[field.key]);
    if (valor) campos.push({ rotulo: field.label, valor });
  }
  const sourceDetail =
    lead.sourceDetail && !lead.sourceDetail.includes("?") ? scrubText(lead.sourceDetail) : null;
  const { atividades, eventosSistema, downloads } = describeActivities(input.activities, now);
  const cidade = [lead.city, lead.uf].filter(Boolean).join("/") || null;
  return {
    nome: lead.name,
    primeiroNome: firstNameOf(lead.name),
    empresa: leadCompany(lead),
    cidade,
    segmento: SEGMENT_LABELS[lead.segment],
    pipeline: pipelineLabel(lead.pipeline),
    estagio: stageLabel(lead.stage),
    diasNoEstagio: info.daysInStage,
    prazoEstagio: info.slaText,
    interesse: INTEREST_LABELS[lead.interest],
    origem: `${SOURCE_LABELS[lead.source]}${sourceDetail ? ` · ${sourceDetail}` : ""}`,
    temperatura: TEMPERATURE_LABELS[lead.temperature],
    score: lead.score,
    tags: lead.tags.map((t) => tagLabel(t)),
    campos,
    mensagem: lead.message?.trim() ? scrubText(lead.message) : null,
    atividades,
    eventosSistema,
    downloads,
    simulacao: summarizeSimulation(input.simulations[0]),
    consentimentos: CONSENT_PURPOSES.map((p) => describeConsent(p, input.consents)),
    aportes: input.contributions
      .filter((c) => c.status !== "cancelado")
      .map((c) => ({
        projeto: c.projectName || input.projectNames.get(c.projectId) || NOT_INFORMED,
        status: CONTRIBUTION_STATUS_LABELS[c.status] ?? c.status,
        valor: roughBRL(c.proposedAmount),
      })),
    responsavel: input.ownerName ? firstNameOf(input.ownerName) : null,
    proximaAcao: lead.nextActionAt ? formatDateTime(lead.nextActionAt) : null,
    ultimoContato: lead.lastContactAt ? formatDateTime(lead.lastContactAt) : null,
  };
}

export type LeadContextMode = "brief" | "notes" | "reply";

const line = (label: string, value: string | number | null | undefined) =>
  `${label}: ${value === null || value === undefined || value === "" ? NOT_INFORMED : value}`;

function renderActivities(items: LeadContextActivity[], withBody: boolean): string[] {
  if (!items.length) return ["nenhuma atividade registrada"];
  return items.map((a) => {
    const head = `- ${a.data} · ${a.tipo}: ${a.assunto}`;
    return withBody && a.texto ? `${head}\n  ${a.texto.replace(/\n+/g, "\n  ")}` : head;
  });
}

// Texto em blocos rotulados, uma linha por campo (ADR-003, 5.1, coluna por recurso).
export function renderLeadContext(ctx: LeadContext, mode: LeadContextMode): string {
  const blocks: string[] = [];
  const identity = [
    line("Nome", mode === "notes" ? ctx.primeiroNome : ctx.nome),
    line("Empresa ou organização", ctx.empresa),
  ];
  if (mode !== "notes") identity.push(line("Cidade", ctx.cidade));
  identity.push(
    line("Segmento", ctx.segmento),
    line("Pipeline", ctx.pipeline),
    line("Estágio", `${ctx.estagio} (há ${ctx.diasNoEstagio} dias; prazo: ${ctx.prazoEstagio})`),
  );
  if (mode !== "notes") {
    identity.push(
      line("Interesse", ctx.interesse),
      line("Origem", ctx.origem),
      line("Temperatura e score", `${ctx.temperatura}, score ${ctx.score}`),
      line("Tags", ctx.tags.length ? ctx.tags.join(", ") : "nenhuma"),
      line("Próxima ação marcada", ctx.proximaAcao),
      line("Último contato", ctx.ultimoContato),
    );
  }
  if (mode === "brief") identity.push(line("Responsável", ctx.responsavel));
  blocks.push(`LEAD\n${identity.join("\n")}`);

  const campos = ctx.campos.length
    ? ctx.campos.map((c) => `${c.rotulo}: ${c.valor}`).join("\n")
    : "nenhum campo preenchido";
  blocks.push(`${mode === "notes" ? "CAMPOS JÁ PREENCHIDOS" : "CAMPOS DO SEGMENTO"}\n${campos}`);

  if (mode !== "notes") {
    blocks.push(`MENSAGEM DO FORMULÁRIO\n${ctx.mensagem ?? NOT_INFORMED}`);
  }

  const activities = mode === "brief" ? ctx.atividades : ctx.atividades.slice(0, 5);
  const extra =
    mode === "brief" && (ctx.eventosSistema || ctx.downloads)
      ? `\n(mais ${ctx.eventosSistema} eventos automáticos e ${ctx.downloads} downloads)`
      : "";
  blocks.push(
    `${mode === "brief" ? "HISTÓRICO (mais recente primeiro)" : "ÚLTIMAS ATIVIDADES"}\n${renderActivities(activities, mode === "brief").join("\n")}${extra}`,
  );

  if (mode !== "notes") {
    blocks.push(
      `SIMULAÇÃO MAIS RECENTE\n${
        ctx.simulacao
          ? `mecanismo em destaque: ${ctx.simulacao.mecanismo}; valor estimado: ${ctx.simulacao.valorEstimado}`
          : "nenhuma simulação"
      }`,
    );
    blocks.push(`CONSENTIMENTOS\n${ctx.consentimentos.join("\n")}`);
  }

  if (mode === "brief") {
    blocks.push(
      `APORTES EM ABERTO\n${
        ctx.aportes.length
          ? ctx.aportes.map((a) => `- ${a.projeto}: ${a.status}, ${a.valor}`).join("\n")
          : "nenhum"
      }`,
    );
  }

  return blocks.join("\n\n");
}
