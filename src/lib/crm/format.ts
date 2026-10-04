// Formatação para as telas e e-mails do CRM (proposta-c-simplicidade.md, seção 9): datas em
// America/Sao_Paulo no formato dd/mm/aaaa [hh:mm]; dinheiro em R$ 1.234,56. Funções puras.

const TZ = "America/Sao_Paulo";

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

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: TZ }).format(date);
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
