// Cálculo puro da faixa de prazo (estrutura-e-copy.md, seção 7.4 "Faixa de prazo"; campanhas.md,
// seção 3.1): dias úteis bancários restantes até o último dia útil bancário de dezembro. Sem Date
// com fuso: trabalha com "YYYY-MM-DD" no horário de Brasília. Configuração em src/config/site.ts.
export type DeadlineConfig = {
  lastBankingDayOfDecember: number;
  nonBankingDays: readonly string[]; // "MM-DD"
};

export type DeadlineInfo = {
  // Data (YYYY-MM-DD) do último dia útil bancário de dezembro do ano informado.
  deadline: string;
  // Dias úteis bancários depois de hoje até a data limite, inclusive. 0 quando hoje é o último dia.
  businessDaysLeft: number;
  isLastDay: boolean;
};

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Data civil de hoje em Brasília, como "YYYY-MM-DD" (a página é estática; o cálculo é no cliente).
export function todayInBrazil(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function parseIso(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatUtc(date: Date): string {
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function isBankingDay(date: string, config: DeadlineConfig): boolean {
  const d = parseIso(date);
  const weekday = d.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !config.nonBankingDays.includes(date.slice(5));
}

// Último dia útil bancário de dezembro: parte do dia configurado e recua até um dia bancário.
export function lastBankingDayOfYear(year: number, config: DeadlineConfig): string {
  let d = parseIso(toIsoDate(year, 12, config.lastBankingDayOfDecember));
  while (!isBankingDay(formatUtc(d), config)) d = new Date(d.getTime() - 86_400_000);
  return formatUtc(d);
}

// Dias bancários em (from, to], isto é, depois de `from` até `to` inclusive. Negativo nunca: 0.
export function bankingDaysBetween(from: string, to: string, config: DeadlineConfig): number {
  let cursor = parseIso(from);
  const end = parseIso(to);
  let count = 0;
  while (cursor.getTime() < end.getTime()) {
    cursor = new Date(cursor.getTime() + 86_400_000);
    if (isBankingDay(formatUtc(cursor), config)) count += 1;
  }
  return count;
}

// A faixa aparece só em novembro e dezembro e até a data limite (inclusive).
export function deadlineInfo(today: string, config: DeadlineConfig): DeadlineInfo | null {
  const month = Number(today.slice(5, 7));
  if (month !== 11 && month !== 12) return null;
  const year = Number(today.slice(0, 4));
  const deadline = lastBankingDayOfYear(year, config);
  if (today > deadline) return null;
  const businessDaysLeft = bankingDaysBetween(today, deadline, config);
  return { deadline, businessDaysLeft, isLastDay: today === deadline };
}

// Faixa do evento deadline_banner_view (`days_left_band`), sem o número exato.
export function daysLeftBand(days: number): string {
  if (days <= 5) return "0-5";
  if (days <= 10) return "6-10";
  if (days <= 20) return "11-20";
  return "21+";
}

export function formatDateBr(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}
