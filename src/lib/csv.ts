// CSV para Excel pt-BR (proposta-c-simplicidade.md, seção 9.4): UTF-8 com BOM, separador ponto e
// vírgula, quebra CRLF, valores entre aspas quando contêm separador, aspas ou quebra de linha.
// Datas em ISO 8601 e números com ponto decimal (decisão desta onda: valores reimportáveis sem
// ambiguidade); booleanos "sim" e "não"; listas separadas por "|"; objetos como JSON. Puro, sem
// dependências; testado em tests/lib/csv.test.ts.
export type CsvScalar = string | number | boolean | Date | null | undefined;
export type CsvValue = CsvScalar | CsvScalar[] | Record<string, unknown>;
export type CsvRow = Record<string, CsvValue>;

export const CSV_BOM = "﻿";
export const CSV_SEPARATOR = ";";
export const CSV_LINE_BREAK = "\r\n";

export function formatCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  if (typeof value === "boolean") return value ? "sim" : "não";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((v) => formatCsvValue(v)).join("|");
  return JSON.stringify(value);
}

export function escapeCsvField(text: string): string {
  const needsQuotes = /[";\r\n]/.test(text);
  if (!needsQuotes) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

// `headers` fixa a ordem das colunas e o texto do cabeçalho: chave da linha -> rótulo.
export function toCsv(
  rows: readonly CsvRow[],
  headers: readonly { key: string; label: string }[],
): string {
  const lines: string[] = [headers.map((h) => escapeCsvField(h.label)).join(CSV_SEPARATOR)];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(formatCsvValue(row[h.key]))).join(CSV_SEPARATOR));
  }
  return CSV_BOM + lines.join(CSV_LINE_BREAK) + CSV_LINE_BREAK;
}

export function csvFileName(table: string, date: Date = new Date()): string {
  return `prospekto-${table}-${date.toISOString().slice(0, 10)}.csv`;
}
