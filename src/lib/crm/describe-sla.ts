// Frases humanas de prazo para SlaIndicator e NextStepCard (crm-design-system.md, seção 5.2,
// decisão D3). Nunca "SLA estourado há 151 h": a Daniela lê "Sem contato há 6 dias (prazo: 1 dia
// útil)". `stageInfo`, `describeOverdue` e dates.ts não mudam; esta função só lê o StageInfo.
// Testado em tests/lib/describe-sla.test.ts.
import { slaBusinessDays } from "@/lib/domain/sla";
import { isInitialStage, stageSla, type Pipeline } from "@/lib/domain/pipelines";
import { daysBetween, hoursBetween } from "./dates";
import { CRM_TIME_ZONE } from "./format";
import type { StageInfo } from "./lead-view";

export type SlaTone = "danger" | "warning" | "neutral";
export type SlaKind = "next_action" | "sla" | "none";

export type SlaDescription = { text: string; tone: SlaTone; kind: SlaKind };

// Pipeline e estágio do lead: dizem se o prazo é o do primeiro contato (estágio inicial) e quantos
// dias úteis ele tem. Sem eles a frase fica genérica ("Prazo do estágio…", sem o "(prazo: …)").
export type SlaStage = { pipeline: string; stage: string };

const DAY_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: CRM_TIME_ZONE,
});

// "sex., 9 de out."
export function formatShortDay(date: Date): string {
  return DAY_FORMAT.format(date);
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

// "1 dia útil", "5 dias úteis", "30 dias" (corridos) ou a nota do estágio quando não há prazo em
// dias ("automático", "quando abrir turma").
export function describeStageDeadline(stage: SlaStage, at: Date): string | null {
  const pipeline = stage.pipeline as Pipeline;
  const sla = stageSla(pipeline, stage.stage);
  if (!sla) return null;
  if (sla.calendarDays != null) return plural(sla.calendarDays, "dia", "dias");
  const days = slaBusinessDays(pipeline, stage.stage, at);
  if (days === null || days === 0) return sla.note ?? null;
  return plural(days, "dia útil", "dias úteis");
}

function withDeadline(text: string, stage: SlaStage | undefined, at: Date): string {
  const deadline = stage ? describeStageDeadline(stage, at) : null;
  return deadline ? `${text} (prazo: ${deadline})` : text;
}

export function describeSla(
  info: StageInfo,
  nextActionAt: Date | null,
  now: Date,
  stage?: SlaStage,
): SlaDescription {
  if (nextActionAt) {
    if (nextActionAt.getTime() < now.getTime()) {
      const days = daysBetween(nextActionAt, now);
      const text =
        days <= 0
          ? "Ação vence hoje"
          : days === 1
            ? "Ação atrasada há 1 dia"
            : `Ação atrasada há ${days} dias`;
      return { text, tone: "danger", kind: "next_action" };
    }
    const hours = hoursBetween(now, nextActionAt);
    if (hours < 24) {
      const text = hours <= 0 ? "Ação em menos de 1 h" : `Ação em ${hours} h`;
      return { text, tone: "warning", kind: "next_action" };
    }
    return {
      text: `Próxima ação ${formatShortDay(nextActionAt)}`,
      tone: "neutral",
      kind: "next_action",
    };
  }

  const initial = stage ? isInitialStage(stage.pipeline as Pipeline, stage.stage) : false;

  if (!info.slaDeadline) {
    const note = stage ? stageSla(stage.pipeline as Pipeline, stage.stage)?.note : undefined;
    return { text: note ?? info.slaText ?? "Sem prazo definido", tone: "neutral", kind: "none" };
  }

  if (info.slaOverdue) {
    const days = daysBetween(info.slaDeadline, now);
    if (initial) {
      const since = info.daysInStage;
      const text =
        since <= 0
          ? "Sem contato desde hoje"
          : since === 1
            ? "Sem contato há 1 dia"
            : `Sem contato há ${since} dias`;
      return { text: withDeadline(text, stage, now), tone: "danger", kind: "sla" };
    }
    const text =
      days <= 0
        ? "Prazo do estágio vence hoje"
        : days === 1
          ? "Prazo do estágio vencido há 1 dia"
          : `Prazo do estágio vencido há ${days} dias`;
    return { text: withDeadline(text, stage, now), tone: "danger", kind: "sla" };
  }

  const hours = hoursBetween(now, info.slaDeadline);
  if (hours < 24) {
    const amount = hours <= 0 ? "Falta menos de 1 h" : `Faltam ${hours} h`;
    const text = initial ? `${amount} para o primeiro contato` : `${amount} no prazo do estágio`;
    return { text, tone: "warning", kind: "sla" };
  }
  const days = Math.floor(hours / 24);
  const text = initial
    ? `${plural(days, "dia", "dias")} para o primeiro contato`
    : `${plural(days, "dia", "dias")} no prazo do estágio`;
  return { text, tone: "neutral", kind: "sla" };
}
