// Aritmética e descrições de datas para as telas do CRM. A formatação (dd/mm/aaaa, R$, fuso,
// datetime-local) fica em src/lib/crm/format.ts.
import { formatDateTime } from "./format";

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
