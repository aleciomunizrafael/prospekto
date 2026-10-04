// Parse e formatação de moeda pt-BR do simulador (simulador-spec.md, seções 3.4 e 9.7).
// Puro: sem Next, sem banco.

export type MoneyRange = { min: number; max: number | null };

// Arredonda a duas casas, meio para cima (66.666,666... vira 66.666,67; 2.000,005 vira 2.000,01).
// O ruído binário é removido antes do arredondamento: 2000.005 * 100 é 200000.49999999997 em
// ponto flutuante, e Math.round direto daria 2000.00.
export function round2(value: number): number {
  if (!Number.isFinite(value)) return value;
  const sign = value < 0 ? -1 : 1;
  const cents = Math.round(Number((Math.abs(value) * 100).toFixed(6)));
  return (sign * cents) / 100;
}

// Normaliza entrada de moeda: "1.234.567,89", "1234567.89", "R$ 1.234.567" e "1.234" (ponto como
// separador de milhar quando não há vírgula). Devolve null para texto que não é número.
// Negativos são devolvidos como negativos (a validação os rejeita com mensagem própria).
export function parseCurrencyBR(input: string | number | null | undefined): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? round2(input) : null;
  if (input == null) return null;
  let text = input
    .trim()
    .replace(/^R\$\s*/i, "")
    .replace(/\s+/g, "");
  if (!text) return null;
  let negative = false;
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }
  if (!/^[\d.,]+$/.test(text)) return null;

  let normalized: string;
  if (text.includes(",")) {
    // Vírgula é o separador decimal; pontos são milhares.
    const [intPart, decPart, ...rest] = text.split(",");
    if (rest.length > 0 || !decPart) return null;
    const digits = intPart.replace(/\./g, "");
    if (!/^\d*$/.test(digits) || !/^\d{1,2}$/.test(decPart)) return null;
    normalized = `${digits || "0"}.${decPart}`;
  } else if (text.includes(".")) {
    const parts = text.split(".");
    const isThousands = parts.slice(1).every((p) => p.length === 3) && parts[0].length > 0;
    if (parts.length === 2 && parts[1].length <= 2 && parts[0].length > 0) {
      // "1234.89" ou "1.5": ponto como separador decimal.
      normalized = text;
    } else if (isThousands) {
      // "1.234" ou "1.234.567": ponto como separador de milhar.
      normalized = parts.join("");
    } else {
      return null;
    }
  } else {
    normalized = text;
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return round2(negative ? -value : value);
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// "R$ 66.666,67". O Intl separa "R$" do número com espaço inseparável (U+00A0); normalizamos
// para espaço comum, o que facilita comparação em testes e cópia do valor pelo visitante.
export function formatBRL(value: number): string {
  return brl.format(value).replace(/ /g, " ");
}

// "entre R$ X e R$ Y", "acima de R$ X" ou "R$ X" quando o intervalo é um ponto.
export function formatRange(range: MoneyRange): string {
  if (range.max === null) return `acima de ${formatBRL(range.min)}`;
  if (range.min === range.max) return formatBRL(range.min);
  return `entre ${formatBRL(range.min)} e ${formatBRL(range.max)}`;
}

// Percentual em pontos percentuais, no padrão da tela: "4%", "3,6%".
export function formatPercent(points: number): string {
  const text = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(points);
  return `${text}%`;
}
