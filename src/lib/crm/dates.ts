// Datas e horas em America/Sao_Paulo, formato dd/mm/aaaa hh:mm (proposta-c, seção 9).
export const CRM_TIME_ZONE = "America/Sao_Paulo";

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: CRM_TIME_ZONE,
});
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: CRM_TIME_ZONE });

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "" : dateTimeFmt.format(d);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  // Datas de calendário do Postgres chegam como "AAAA-MM-DD": formata sem fuso.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// Valor para <input type="datetime-local"> no fuso do CRM (sem segundos).
export function toDateTimeLocal(value: Date | null | undefined): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CRM_TIME_ZONE,
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
    timeZone: CRM_TIME_ZONE,
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
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: CRM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const start = fromDateTimeLocal(`${ymd}T00:00`) ?? now;
  const end = new Date(start.getTime() + 24 * 60 * 60_000 - 1);
  return { start, end };
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60_000);
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

// Dias inteiros de diferença (positivo quando `to` é depois de `from`).
export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60_000));
}

export function hoursBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (60 * 60_000));
}

export function describeDaysAgo(days: number): string {
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

export function describeOverdue(nextActionAt: Date | null, now: Date): string {
  if (!nextActionAt) return "sem data";
  const days = daysBetween(nextActionAt, now);
  if (nextActionAt.getTime() < now.getTime()) {
    return days <= 0 ? "vence hoje" : `atrasada há ${days} dia${days === 1 ? "" : "s"}`;
  }
  return formatDateTime(nextActionAt);
}

export function describeRemainingHours(deadline: Date | null, now: Date): string {
  if (!deadline) return "sem SLA em dias";
  const hours = hoursBetween(now, deadline);
  if (hours < 0) return `SLA estourado há ${Math.abs(hours)} h`;
  if (hours < 48) return `${hours} h restantes`;
  return `${Math.floor(hours / 24)} dias restantes`;
}
