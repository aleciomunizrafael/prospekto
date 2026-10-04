import { describe, expect, it } from "vitest";
import { CSV_BOM, csvFileName, escapeCsvField, formatCsvValue, toCsv } from "@/lib/csv";

describe("csv.ts", () => {
  it("gera BOM, cabeçalho, separador ponto e vírgula e CRLF", () => {
    const csv = toCsv(
      [{ a: "x", b: 1 }],
      [
        { key: "a", label: "Coluna A" },
        { key: "b", label: "Coluna B" },
      ],
    );
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv.slice(1)).toBe("Coluna A;Coluna B\r\nx;1\r\n");
  });

  it("escapa aspas, separador e quebras de linha", () => {
    expect(escapeCsvField('Diz "oi"')).toBe('"Diz ""oi"""');
    expect(escapeCsvField("a;b")).toBe('"a;b"');
    expect(escapeCsvField("linha 1\nlinha 2")).toBe('"linha 1\nlinha 2"');
    expect(escapeCsvField("linha 1\r\nlinha 2")).toBe('"linha 1\r\nlinha 2"');
    expect(escapeCsvField("simples")).toBe("simples");
  });

  it("neutraliza fórmulas: apóstrofo e aspas em valores iniciados por = + - @ TAB ou CR", () => {
    expect(escapeCsvField('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(escapeCsvField("=1+1")).toBe('"\'=1+1"');
    expect(escapeCsvField("+5554999990000")).toBe('"\'+5554999990000"');
    expect(escapeCsvField("-1")).toBe('"\'-1"');
    expect(escapeCsvField("@SUM(1)")).toBe('"\'@SUM(1)"');
    expect(escapeCsvField("\tx")).toBe('"\'\tx"');
    expect(escapeCsvField("\rx")).toBe('"\'\rx"');
    expect(escapeCsvField("Maria")).toBe("Maria");
    expect(escapeCsvField("a = b")).toBe("a = b");
  });

  it("formata datas em ISO, números com ponto, booleanos, listas, objetos e vazios", () => {
    expect(formatCsvValue(new Date("2026-10-04T10:30:00Z"))).toBe("2026-10-04T10:30:00.000Z");
    expect(formatCsvValue(1234.5)).toBe("1234.5");
    expect(formatCsvValue(true)).toBe("sim");
    expect(formatCsvValue(false)).toBe("não");
    expect(formatCsvValue(["a", "b"])).toBe("a|b");
    expect(formatCsvValue({ k: "v" })).toBe('{"k":"v"}');
    expect(formatCsvValue(null)).toBe("");
    expect(formatCsvValue(undefined)).toBe("");
    expect(formatCsvValue(Number.NaN)).toBe("");
  });

  it("mantém a ordem das colunas do cabeçalho e ignora chaves fora dele", () => {
    const csv = toCsv(
      [{ b: "2", a: "1", c: "x" }],
      [
        { key: "a", label: "a" },
        { key: "b", label: "b" },
      ],
    );
    expect(csv.slice(1)).toBe("a;b\r\n1;2\r\n");
  });

  it("nomeia o arquivo com tabela e data", () => {
    expect(csvFileName("leads", new Date("2026-10-04T12:00:00Z"))).toBe(
      "prospekto-leads-2026-10-04.csv",
    );
  });
});
