// Frases humanas para as atividades `sistema` da Timeline (crm-design-system.md, seção 5.2):
// "Responsável: ninguém → Rafael Teste", "Novo → Qualificado · motivo: Sem resposta",
// "Proposta de R$ 30.000,00 em Cinema na Praça (Lei do Audiovisual, art. 1º-A)". Nunca um id na
// tela: ids viram nomes pelos mapas ou são descartados. `formActivityText` continua cuidando das
// atividades `formulario`. Testado em tests/lib/humanize-activity.test.ts.
import { CONTRIBUTION_STATUS_LABELS, mechanismLabel } from "./enum-labels";
import { formatBRL, formatDate } from "./format";
import { LOST_REASON_LABELS, stageLabel } from "./labels";

export type HumanizedActivity = {
  // Frase principal; null quando não há nada legível (a Timeline mostra só o assunto).
  text: string | null;
  // Pares restantes para o <details> "ver detalhes"; vazio na maioria dos casos.
  details: { label: string; value: string }[];
};

export type SystemActivityLike = {
  subject: string;
  data: Record<string, unknown> | null;
  contributionId?: string | null;
  projectId?: string | null;
};

const ID_RE = /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T.*)?$/;

function looksLikeId(value: unknown): boolean {
  return typeof value === "string" && ID_RE.test(value);
}

// Chaves que não acrescentam nada para quem lê (ou são ids).
const SILENT_KEYS = new Set([
  "direction",
  "warnings",
  "depositYear",
  "projectCommissionTotal",
  "periodCommissionTotal",
]);

// Complementos em minúsculas: entram depois de " · " na mesma frase.
const DETAIL_LABELS: Record<string, string> = {
  termSignedAt: "termo assinado em",
  depositedAt: "depositado em",
  depositedAmount: "valor depositado",
  receiptNumber: "recibo nº",
  receiptIssuedAt: "recibo emitido em",
  receiptSentToAccountantAt: "enviado ao contador em",
  commissionDue: "comissão de",
  commissionPaidAt: "comissão paga em",
  lostReasonDetail: "detalhe:",
  expectedCloseAt: "previsão",
  proposedAmount: "valor proposto",
  mechanism: "mecanismo",
  stage: "estágio",
  source: "origem",
  sourceDetail: "detalhe da origem:",
};

function formatValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (looksLikeId(value)) return null;
  if (typeof value === "boolean") return value ? "sim" : "não";
  if (typeof value === "number") {
    return /amount|commission/i.test(key) ? formatBRL(value) : String(value);
  }
  if (typeof value !== "string") return null;
  if (key === "mechanism") return mechanismLabel(value);
  if (key === "stage") return stageLabel(value);
  if (/At$/.test(key) && ISO_DATE_RE.test(value)) return formatDate(value);
  return value;
}

function personName(value: unknown, users: Map<string, string>): string {
  if (value === null || value === undefined || value === "") return "ninguém";
  if (typeof value !== "string") return "alguém";
  return users.get(value) ?? "outra pessoa";
}

function statusOrStageLabel(value: unknown, isContribution: boolean): string {
  const s = String(value);
  if (isContribution) {
    return (CONTRIBUTION_STATUS_LABELS as Record<string, string>)[s] ?? stageLabel(s);
  }
  return stageLabel(s);
}

function lostReasonLabel(reason: string): string {
  return (LOST_REASON_LABELS as Record<string, string>)[reason] ?? reason;
}

export function humanizeSystemActivity(
  activity: SystemActivityLike,
  users: Map<string, string>,
  projects?: Map<string, string>,
): HumanizedActivity {
  const data = activity.data;
  if (!data) return { text: null, details: [] };

  const used = new Set<string>();
  const parts: string[] = [];

  if (data.reason === "owner") {
    parts.push(`Responsável: ${personName(data.from, users)} → ${personName(data.to, users)}`);
    used.add("from").add("to").add("reason");
  } else if (data.reason === "score") {
    parts.push(`Score: ${String(data.from ?? 0)} → ${String(data.to ?? 0)}`);
    used.add("from").add("to").add("reason");
  } else if ("from" in data && "to" in data) {
    const isContribution =
      !!activity.contributionId ||
      String(data.to) in CONTRIBUTION_STATUS_LABELS ||
      String(data.from) in CONTRIBUTION_STATUS_LABELS;
    parts.push(
      `${statusOrStageLabel(data.from, isContribution)} → ${statusOrStageLabel(data.to, isContribution)}`,
    );
    used.add("from").add("to");
    if (typeof data.reason === "string" && data.reason) {
      parts.push(`motivo: ${lostReasonLabel(data.reason)}`);
    }
    used.add("reason");
  } else if ("proposedAmount" in data && typeof data.proposedAmount === "number") {
    const projectId =
      typeof data.projectId === "string" ? data.projectId : (activity.projectId ?? null);
    const projectName = projectId ? projects?.get(projectId) : undefined;
    let text = `Proposta de ${formatBRL(data.proposedAmount)}`;
    if (projectName) text += ` em ${projectName}`;
    if (typeof data.mechanism === "string" && data.mechanism) {
      text += ` (${mechanismLabel(data.mechanism)})`;
    }
    parts.push(text);
    used.add("proposedAmount").add("mechanism").add("projectId").add("contributionId");
  } else if ("stage" in data && typeof data.stage === "string") {
    let text = `Criado em ${stageLabel(data.stage)}`;
    if (typeof data.mechanism === "string" && data.mechanism) {
      text += ` (${mechanismLabel(data.mechanism)})`;
    }
    parts.push(text);
    used.add("stage").add("mechanism");
  }

  // Dados complementares conhecidos entram na frase; o resto vai para "ver detalhes".
  const details: { label: string; value: string }[] = [];
  for (const [key, raw] of Object.entries(data)) {
    if (used.has(key) || SILENT_KEYS.has(key)) continue;
    if (/Id$|_id$/i.test(key) || looksLikeId(raw)) continue;
    if (typeof raw === "object" && raw !== null) continue;
    const value = formatValue(key, raw);
    if (value === null) continue;
    const label = DETAIL_LABELS[key];
    if (label) {
      parts.push(`${label} ${value}`);
    } else {
      details.push({ label: key, value });
    }
  }

  return { text: parts.length ? parts.join(" · ") : null, details };
}
