// Frases curtas de apresentação compartilhadas pelas telas do CRM (plural, dias no estágio, dias
// restantes, valores grandes sem centavos). Só texto: nada de regra de negócio.

export function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

// "desde hoje", "há 1 dia", "há 3 dias" (tempo no estágio atual).
export function daysInStageText(days: number): string {
  if (days <= 0) return "desde hoje";
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

// Prazo de captação: "vencido há 2 dias", "vence hoje", "1 dia restante", "12 dias restantes".
export function daysRemainingText(days: number | null): string {
  if (days == null) return "";
  if (days < 0) return days === -1 ? "vencido há 1 dia" : `vencido há ${-days} dias`;
  if (days === 0) return "vence hoje";
  return days === 1 ? "1 dia restante" : `${days} dias restantes`;
}

// Valores em reais sem centavos nos números grandes dos StatCards ("R$ 1.170.000").
const KPI_BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function formatKpiBRL(value: number): string {
  return KPI_BRL.format(value);
}
