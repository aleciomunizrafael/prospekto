// Parser do "Colar lista" (ADR-004, 6.6): função pura, testada em tabela.
import { describe, expect, it } from "vitest";
import {
  PASTE_LINE_LIMIT,
  describePastePreview,
  looksLikePhone,
  normalizeBrazilianPhone,
  parseProspectingPaste,
} from "@/lib/crm/prospecting-paste";

describe("parseProspectingPaste", () => {
  it("lê # como segmento e aceita |, ; e tabulação como separadores", () => {
    const text = [
      "# Vinícolas",
      "Vinícola Exemplo | (54) 3000-0000 | Lançaram um rótulo novo",
      "Adega Modelo; 54 99000-0001; Abriram loja",
      "#Metalúrgicas",
      "Metalúrgica Modelo\t+55 54 99000-0002\tAmpliaram a fábrica",
    ].join("\n");
    const parsed = parseProspectingPaste(text);
    expect(parsed.items).toEqual([
      {
        name: "Vinícola Exemplo",
        segment: "Vinícolas",
        phone: "+555430000000",
        hook: "Lançaram um rótulo novo",
        info: null,
      },
      {
        name: "Adega Modelo",
        segment: "Vinícolas",
        phone: "+5554990000001",
        hook: "Abriram loja",
        info: null,
      },
      {
        name: "Metalúrgica Modelo",
        segment: "Metalúrgicas",
        phone: "+5554990000002",
        hook: "Ampliaram a fábrica",
        info: null,
      },
    ]);
    expect(parsed.unrecognizedPhones).toBe(0);
    expect(parsed.ignoredLines).toBe(0);
  });

  it.each([
    ["(54) 3000-0000", "+555430000000"],
    ["54 99000-0001", "+5554990000001"],
    ["+55 (54) 99000-0001", "+5554990000001"],
    ["5554990000001", "+5554990000001"],
    ["054 3000-0000", "+555430000000"],
    ["0800 123 4567", null],
    ["12.345.678/0001-90", null],
    ["55.123.456/0001-90", null],
    ["123", null],
    ["", null],
  ])("normaliza %s para %s", (raw, expected) => {
    expect(normalizeBrazilianPhone(raw)).toBe(expected);
  });

  it("campo que parece telefone mas não é vira info; número curto vai para o gancho", () => {
    const parsed = parseProspectingPaste(
      "Empresa X | 12.345.678/0001-90 | gancho\nEmpresa Y | 2024 | fundada há tempo",
    );
    expect(parsed.items[0]).toEqual({
      name: "Empresa X",
      segment: null,
      phone: null,
      hook: "gancho",
      info: "Telefone informado: 12.345.678/0001-90",
    });
    expect(parsed.items[1]).toEqual({
      name: "Empresa Y",
      segment: null,
      phone: null,
      hook: "2024 · fundada há tempo",
      info: null,
    });
    expect(parsed.unrecognizedPhones).toBe(1);
    expect(looksLikePhone("2024")).toBe(false);
    expect(looksLikePhone("(54) 3000-0000")).toBe(true);
  });

  it("linha só com nome, linhas vazias e espaços; só o primeiro campo numérico é telefone", () => {
    const parsed = parseProspectingPaste(
      "\n  Só o nome  \n\n# \nOutra | 54 3000-0000 | 54 3000-0001\n",
    );
    expect(parsed.items).toEqual([
      { name: "Só o nome", segment: null, phone: null, hook: null, info: null },
      {
        name: "Outra",
        segment: null,
        phone: "+555430000000",
        hook: "54 3000-0001",
        info: null,
      },
    ]);
  });

  it("respeita o teto de 500 empresas por colagem e conta as ignoradas", () => {
    const lines = Array.from({ length: PASTE_LINE_LIMIT + 5 }, (_, i) => `Empresa ${i + 1}`);
    const parsed = parseProspectingPaste(lines.join("\n"));
    expect(parsed.items).toHaveLength(PASTE_LINE_LIMIT);
    expect(parsed.items[PASTE_LINE_LIMIT - 1]?.name).toBe(`Empresa ${PASTE_LINE_LIMIT}`);
    expect(parsed.ignoredLines).toBe(5);
    expect(describePastePreview(parsed)).toBe(
      "500 empresas reconhecidas · 5 além do limite de 500 por colagem (ignoradas)",
    );
  });

  it("descreve a prévia no singular e no plural", () => {
    const one = parseProspectingPaste("Uma | 54 3000-0000");
    expect(describePastePreview(one)).toBe("1 empresa reconhecida");
    const many = parseProspectingPaste(
      ["A | 54 3000-0000", "B | 12.345.678/0001-90", "C | 00.000.000/0000-00"].join("\n"),
    );
    expect(describePastePreview(many)).toBe(
      "3 empresas reconhecidas · 2 telefones não reconhecidos",
    );
  });
});
