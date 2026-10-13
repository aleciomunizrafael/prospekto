// Prazo de uma tarefa em palavras ("Vence hoje", "Atrasada há 2 dias", "Vence sex., 17 de out.",
// "Sem data"), extraído de today.tsx para o Painel, o quadro de Tarefas e a paleta usarem o mesmo
// texto (plano da estrutura, Fundação). Puro.
import { daysBetween } from "./dates";
import { formatShortDay } from "./describe-sla";
import { calendarDateInSaoPaulo } from "./format";

export function describeTaskDue(
  dueAt: Date | null,
  now: Date,
): { text: string; tone: "danger" | "neutral" } {
  if (!dueAt) return { text: "Sem data", tone: "neutral" };
  const today = calendarDateInSaoPaulo(now);
  const day = calendarDateInSaoPaulo(dueAt);
  if (day === today) return { text: "Vence hoje", tone: "danger" };
  if (dueAt.getTime() < now.getTime()) {
    const days = Math.max(1, daysBetween(dueAt, now));
    return { text: `Atrasada ${days === 1 ? "há 1 dia" : `há ${days} dias`}`, tone: "danger" };
  }
  return { text: `Vence ${formatShortDay(dueAt)}`, tone: "neutral" };
}
