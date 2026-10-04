// Dias úteis simples (segunda a sexta, sem feriados) e regras sazonais dos SLAs
// (personas-e-funis.md, seção 8.1: `proposta` cai para 2 dias úteis em novembro e dezembro;
// `aporte` passa a diário a partir de 10 de dezembro). Sem dependências.
import { stageSla, type Pipeline } from "./pipelines";

export function isBusinessDay(date: Date): boolean {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Soma `days` dias úteis a `from` (mantém a hora). 0 devolve a própria data.
export function addBusinessDays(from: Date, days: number): Date {
  if (!Number.isInteger(days) || days < 0) {
    throw new RangeError("Quantidade de dias úteis deve ser um inteiro maior ou igual a zero.");
  }
  const result = new Date(from.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (isBusinessDay(result)) remaining -= 1;
  }
  return result;
}

// Dias úteis inteiros entre duas datas (exclusivo em `from`, inclusivo em `to`); negativo quando `to` < `from`.
export function businessDaysBetween(from: Date, to: Date): number {
  const a = startOfUtcDay(from);
  const b = startOfUtcDay(to);
  if (b < a) return -businessDaysBetween(to, from);
  let count = 0;
  const cursor = new Date(a.getTime());
  while (cursor < b) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (isBusinessDay(cursor)) count += 1;
  }
  return count;
}

export function isNovemberOrDecember(date: Date): boolean {
  const month = date.getUTCMonth();
  return month === 10 || month === 11;
}

export function isFromDecember10(date: Date): boolean {
  return date.getUTCMonth() === 11 && date.getUTCDate() >= 10;
}

// Prazo em dias úteis do estágio na data informada, já com a regra de novembro e dezembro.
// `null` quando o estágio não tem SLA em dias (revisão mensal, trimestral etc.).
export function slaBusinessDays(pipeline: Pipeline, stage: string, at: Date): number | null {
  const sla = stageSla(pipeline, stage);
  if (!sla) return null;
  if (sla.dailyFromDec10 && isFromDecember10(at)) return 1;
  if (sla.novDec !== undefined && isNovemberOrDecember(at)) return sla.novDec;
  return sla.businessDays;
}

// Soma `days` dias corridos a `from` (mantém a hora).
export function addCalendarDays(from: Date, days: number): Date {
  if (!Number.isInteger(days) || days < 0) {
    throw new RangeError("Quantidade de dias deve ser um inteiro maior ou igual a zero.");
  }
  const result = new Date(from.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Data limite da próxima ação ao entrar no estágio em `enteredAt`; `null` sem SLA em dias.
// SLAs em dias corridos (`calendarDays`) somam dias de calendário; os demais, dias úteis.
export function slaDeadline(pipeline: Pipeline, stage: string, enteredAt: Date): Date | null {
  const sla = stageSla(pipeline, stage);
  if (sla?.calendarDays != null) return addCalendarDays(enteredAt, sla.calendarDays);
  const days = slaBusinessDays(pipeline, stage, enteredAt);
  if (days === null) return null;
  return addBusinessDays(enteredAt, days);
}

export function isOverdue(nextActionAt: Date | null | undefined, now: Date): boolean {
  return !!nextActionAt && nextActionAt.getTime() < now.getTime();
}
