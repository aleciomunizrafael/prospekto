// Helpers puros das telas de prospecção (ADR-004, 6.6 e 6.12): progresso, filtros da URL,
// agrupamento por segmento, frases dos toasts e dos assuntos, datas padrão dos diálogos e o
// resultado da conversão como a tela o descreve. Sem acesso a dados; roda no servidor e no cliente.
import { DISCARD_REASON_LABELS } from "./labels";
import {
  CRM_TIME_ZONE,
  addCalendarDays,
  calendarDateInSaoPaulo,
  diffCalendarDays,
  formatCalendarDate,
} from "./format";
import { plural } from "./text";
import {
  DISCARD_REASONS,
  PROSPECTING_STATUSES,
  type DiscardReason,
  type ProspectingStatus,
} from "@/lib/domain/enums";

// ---------------------------------------------------------------------------------------------
// Filtros da URL

export type ItemFilters = { status?: ProspectingStatus; q?: string };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseProspectingStatus(
  value: string | string[] | undefined,
): ProspectingStatus | undefined {
  const v = first(value);
  return v && (PROSPECTING_STATUSES as readonly string[]).includes(v)
    ? (v as ProspectingStatus)
    : undefined;
}

export function parseItemFilters(sp: Record<string, string | string[] | undefined>): ItemFilters {
  const q = first(sp.q)?.trim().slice(0, 120);
  return { status: parseProspectingStatus(sp.status), q: q || undefined };
}

export function itemFiltersHref(listId: string, filters: ItemFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  const query = params.toString();
  return `/app/prospeccao/${listId}${query ? `?${query}` : ""}`;
}

// ---------------------------------------------------------------------------------------------
// Progresso e agrupamento

export function shortProgressText(list: { contacted: number; total: number }): string {
  return `${list.contacted}/${list.total} contatadas`;
}

export function progressText(list: { contacted: number; total: number; meetings: number }): string {
  return `${shortProgressText(list)} · ${plural(list.meetings, "reunião marcada", "reuniões marcadas")}`;
}

export type SegmentGroup<T> = { segment: string | null; items: T[] };

// Itens sem segmento primeiro (sem cabeçalho), depois um grupo por segmento na ordem em que
// aparece na lista (posição).
export function groupBySegment<T extends { segment: string | null }>(
  items: T[],
): SegmentGroup<T>[] {
  const groups: SegmentGroup<T>[] = [];
  const byName = new Map<string, SegmentGroup<T>>();
  const none: SegmentGroup<T> = { segment: null, items: [] };
  for (const item of items) {
    const key = item.segment?.trim() || null;
    if (!key) {
      none.items.push(item);
      continue;
    }
    let group = byName.get(key);
    if (!group) {
      group = { segment: key, items: [] };
      byName.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return none.items.length ? [none, ...groups] : groups;
}

// ---------------------------------------------------------------------------------------------
// Datas

const SHORT_DATE_UTC = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const SHORT_DATE_SP = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: CRM_TIME_ZONE,
});
const TIME_SP = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: CRM_TIME_ZONE,
});

// "sex., 17 de out." para uma data de calendário (AAAA-MM-DD), sem fuso.
export function formatShortCalendarDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  return SHORT_DATE_UTC.format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
}

// "sex., 17 de out., 10h" / "10h30" para um instante, no fuso do CRM.
export function formatMeetingAt(value: Date): string {
  const [h, m] = TIME_SP.format(value).split(":");
  const hour = h === "24" ? "00" : h;
  return `${SHORT_DATE_SP.format(value)}, ${Number(hour)}h${m === "00" ? "" : m}`;
}

// "hoje", "há 1 d", "há 2 d" (última tentativa, WhatsApp aberto). Conta dias de calendário em
// São Paulo, como relativeDayTime no Painel: uma ligação de ontem à noite é "há 1 d" de manhã.
export function agoShort(date: Date, now: Date): string {
  const days = Math.max(
    0,
    diffCalendarDays(calendarDateInSaoPaulo(date), calendarDateInSaoPaulo(now)),
  );
  return days === 0 ? "hoje" : `há ${days} d`;
}

function weekdayUtc(calendar: string): number {
  const [y, m, d] = calendar.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// Soma dias úteis (segunda a sexta) a uma data de calendário.
export function addBusinessDays(calendar: string, days: number): string {
  let out = calendar;
  let left = days;
  while (left > 0) {
    out = addCalendarDays(out, 1);
    const wd = weekdayUtc(out);
    if (wd !== 0 && wd !== 6) left -= 1;
  }
  return out;
}

// "Retornar em" padrão: 2 dias úteis a partir de hoje (São Paulo).
export function defaultCallbackDate(now: Date): string {
  return addBusinessDays(calendarDateInSaoPaulo(now), 2);
}

// "Data e hora da reunião" padrão: próximo dia útil às 10:00 (valor de datetime-local).
export function defaultMeetingAt(now: Date): string {
  return `${addBusinessDays(calendarDateInSaoPaulo(now), 1)}T10:00`;
}

// ---------------------------------------------------------------------------------------------
// Frases

export const CALL_RESULT_STATUSES = ["a_ligar", "sem_resposta", "retornar", "descartado"] as const;
export type CallResultStatus = (typeof CALL_RESULT_STATUSES)[number];

// Assunto da activities.ligacao gravada por cada resultado (ADR-004, 6.6).
export function callResultSubject(
  status: CallResultStatus | "reuniao_marcada",
  extra: { callbackAt?: string | null; reason?: string | null } = {},
): string {
  switch (status) {
    case "sem_resposta":
      return "Ligação: sem resposta";
    case "retornar":
      return extra.callbackAt
        ? `Ligação: retornar em ${formatCalendarDate(extra.callbackAt).slice(0, 5)}`
        : "Ligação: retornar";
    case "descartado": {
      const reason = extra.reason as DiscardReason | undefined;
      const label =
        reason && (DISCARD_REASONS as readonly string[]).includes(reason)
          ? DISCARD_REASON_LABELS[reason].toLowerCase()
          : null;
      return label ? `Ligação: descartada (${label})` : "Ligação: descartada";
    }
    case "reuniao_marcada":
      return "Ligação: reunião marcada";
    case "a_ligar":
      return "De volta para a ligar";
  }
}

// Toast de cada resultado (ADR-004, 6.12).
export function callResultToast(status: CallResultStatus, callbackAt?: string | null): string {
  switch (status) {
    case "sem_resposta":
      return "Registrado: sem resposta.";
    case "retornar":
      if (!callbackAt) return "Retorno marcado.";
      // "sex., 16 de out." já termina com ponto.
      return `Retorno marcado para ${formatShortCalendarDate(callbackAt)}`.replace(/\.?$/, ".");
    case "descartado":
      return "Empresa descartada.";
    case "a_ligar":
      return "De volta para a ligar.";
  }
}

export function pasteResultToast(added: number, alreadyDiscarded: number): string {
  const base = `${plural(added, "empresa adicionada", "empresas adicionadas")}`;
  if (alreadyDiscarded === 0) return `${base}.`;
  return `${base}; ${alreadyDiscarded === 1 ? "1 já foi descartada" : `${alreadyDiscarded} já foram descartadas`} em outra lista (veja a anotação).`;
}

// Resultado da conversão como a action o devolve e a tela o descreve (ADR-004, 6.6 e 6.12).
export type ConversionResult = {
  leadId: string;
  orgId: string;
  contactId: string;
  created: boolean;
  reactivated: boolean;
  // A organização de mesmo nome já existia (a mesma empresa em outra lista ou um homônimo).
  orgReused: boolean;
  // Estágio real do lead ao fim; um lead reaproveitado em outro estágio fica onde estava.
  stage: string;
  // Um moveLeadStage falhou: a reunião ficou registrada e o lead não chegou a Qualificado.
  advanceFailed: boolean;
};

export function describeConversion(result: ConversionResult): string {
  if (result.advanceFailed) {
    return "Reunião registrada; não foi possível avançar o estágio: abra o lead e use Mover para.";
  }
  if (result.reactivated) return "Lead reativado em Qualificado.";
  if (!result.created) return "Já existe um lead com este e-mail; a reunião foi registrada nele.";
  if (result.orgReused) {
    return "Reunião marcada. Lead criado em Qualificado e vinculado à organização já cadastrada com este nome; confira a ficha.";
  }
  return "Reunião marcada. Lead criado em Qualificado.";
}

// Rótulo do botão WhatsApp e da meta da ficha ("WhatsApp aberto há 2 d"; nunca "enviado").
export function whatsappOpenedText(sentAt: Date | null, now: Date): string | null {
  return sentAt ? `WhatsApp aberto ${agoShort(sentAt, now)}` : null;
}
