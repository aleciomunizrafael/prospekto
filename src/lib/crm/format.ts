// Formatação para as telas e e-mails do CRM (proposta-c-simplicidade.md, seção 9): datas em
// America/Sao_Paulo no formato dd/mm/aaaa [hh:mm]; dinheiro em R$ 1.234,56; telefone E.164 em
// (DD) 9XXXX-XXXX. Único módulo de formatação do CRM e do e-mail (src/lib/crm/dates.ts fica só com
// aritmética e descrições); o site estático tem formatadores próprios, com saídas distintas de
// propósito (src/lib/simulator/format.ts normaliza NBSP; site/project-mechanism.ts sem centavos).
// Funções puras; testadas em tests/lib/crm-format.test.ts.

export const CRM_TIME_ZONE = "America/Sao_Paulo";
const TZ = CRM_TIME_ZONE;

export function formatBRL(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(value)}%`;
}

// Data de calendário (YYYY-MM-DD, como o Postgres `date`) -> dd/mm/aaaa, sem fuso.
export function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: TZ,
  }).format(date);
}

// Datas de calendário do Postgres (`date`) chegam como "AAAA-MM-DD" e são formatadas sem fuso:
// new Date("2025-03-10") seria meia-noite UTC, dia anterior em São Paulo.
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatCalendarDate(value);
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: TZ }).format(date);
}

// Telefone E.164 (+5554999990000) -> (54) 99999-0000 / (54) 3333-0000; outros formatos ficam como
// estão (números fora do Brasil ou valores antigos).
export function formatPhoneBR(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^\+55(\d{2})(\d{8,9})$/.exec(value);
  if (!m) return value;
  const [, ddd, local] = m;
  const split = local.length === 9 ? 5 : 4;
  return `(${ddd}) ${local.slice(0, split)}-${local.slice(split)}`;
}

// Dia de calendário em São Paulo (YYYY-MM-DD) para um instante.
export function calendarDateInSaoPaulo(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA produz YYYY-MM-DD
}

// Valor para <input type="datetime-local"> no fuso do CRM (sem segundos).
export function toDateTimeLocal(value: Date | null | undefined): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(value);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

// Deslocamento (minutos) de America/Sao_Paulo em relação ao UTC numa data.
function spOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "longOffset",
  }).formatToParts(at);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-03:00";
  const m = name.match(/([+-])(\d{2}):?(\d{2})?/);
  if (!m) return -180;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

// Converte "AAAA-MM-DDTHH:MM" (datetime-local, fuso do CRM) em Date UTC.
export function fromDateTimeLocal(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const offset = spOffsetMinutes(new Date(guess));
  return new Date(guess - offset * 60_000);
}

// Início e fim do dia de hoje em America/Sao_Paulo.
export function dayBounds(now: Date = new Date()): { start: Date; end: Date } {
  const start = fromDateTimeLocal(`${calendarDateInSaoPaulo(now)}T00:00`) ?? now;
  const end = new Date(start.getTime() + 24 * 60 * 60_000 - 1);
  return { start, end };
}

export function addCalendarDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

// Dias de diferença entre duas datas de calendário (b - a).
export function diffCalendarDays(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

export function daysOverdue(nextActionAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - nextActionAt.getTime()) / 86_400_000));
}

// Slug a partir do nome do projeto: minúsculas, sem acentos, hífens (slugSchema de validation/common).
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

// Número digitado em português ("1.500.000,00") ou no padrão técnico ("1500000.00").
export function parseDecimalBr(raw: string): number | null {
  const s = raw.trim().replace(/\s|R\$/g, "");
  if (!s) return null;
  let normalized: string;
  if (s.includes(",")) normalized = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) normalized = s.replace(/\./g, "");
  else normalized = s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function formatCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return "";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
