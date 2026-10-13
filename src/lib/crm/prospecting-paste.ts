// "Colar lista" da prospecção (ADR-004, 6.6): interpreta o texto colado, uma empresa por linha,
// `Nome | Telefone | Gancho` (separadores `|`, `;` ou tabulação). Uma linha começando com `#` define
// o segmento das seguintes. Um campo com 8 ou mais dígitos e mais da metade de dígitos é telefone;
// o resto, concatenado com " · ", vira o gancho. Telefone normalizado para E.164 (+55 + DDD +
// número) ou nulo, com o texto original em `info`. Linhas vazias são ignoradas; teto de 500
// empresas por colagem (P13), as demais ignoradas com aviso na prévia.
//
// Função pura, sem Zod: roda no cliente (prévia do diálogo) e no servidor (fonte única da action).
// A normalização do telefone copia a regra de phoneSchema (src/lib/validation/common.ts) e aceita,
// além dela, o zero de tronco ("051 3593-0000"), que a máscara da lista telefônica costuma trazer.
// O parser também aplica os mesmos tetos de newItemSchema (src/lib/validation/prospecting.ts:
// nome 160, segmento 80, abertura e informações 2.000) para todo item da prévia passar no schema
// e a action nunca recusar o que a prévia disse que reconheceu (addItems reparseia cada item).

export type ParsedItem = {
  name: string;
  segment: string | null;
  phone: string | null;
  hook: string | null;
  info: string | null;
};

export type ParsedPaste = {
  items: ParsedItem[];
  // Campos que pareciam telefone mas não deram um número brasileiro válido (ficaram em `info`).
  unrecognizedPhones: number;
  // Empresas além do teto, ignoradas.
  ignoredLines: number;
};

export const PASTE_LINE_LIMIT = 500;

// Tetos de newItemSchema (não importados: o schema traz o Zod, e este módulo roda no cliente).
const NAME_MAX = 160;
const SEGMENT_MAX = 80;
const TEXT_MAX = 2000;

// Subconjunto de phoneSchema: DDD brasileiro (dois dígitos de 1 a 9) e 8 ou 9 dígitos, para um
// "0800" ou um CNPJ não virarem telefone.
const E164_BR = /^\+55[1-9][1-9]\d{8,9}$/;

// E.164 brasileiro ou null. Mesma regra de phoneSchema, mais o zero de tronco.
export function normalizeBrazilianPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // "0" de tronco antes do DDD: 0 + 2 + 8/9 dígitos (sem o 55 do país).
  if (/^0\d{10,11}$/.test(digits)) digits = digits.slice(1);
  const withCountry = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  const value = `+${withCountry}`;
  return E164_BR.test(value) ? value : null;
}

// Um campo "parece telefone" quando tem 8 ou mais dígitos e mais da metade dos caracteres são dígitos.
export function looksLikePhone(field: string): boolean {
  const digits = field.replace(/\D/g, "");
  return digits.length >= 8 && digits.length / field.length > 0.5;
}

export function parseProspectingPaste(text: string): ParsedPaste {
  const items: ParsedItem[] = [];
  let unrecognizedPhones = 0;
  let ignoredLines = 0;
  let segment: string | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      segment =
        line
          .replace(/^#+\s*/, "")
          .replace(/^\d+[.)]\s*/, "")
          .trim()
          .slice(0, SEGMENT_MAX)
          .trim() || null;
      continue;
    }
    const fields = line
      .split(/[|;\t]/)
      .map((f) => f.trim())
      .filter(Boolean);
    const name = fields[0];
    if (!name) continue;
    if (items.length >= PASTE_LINE_LIMIT) {
      ignoredLines += 1;
      continue;
    }
    let phone: string | null = null;
    let rawPhone: string | null = null;
    const hookParts: string[] = [];
    for (const field of fields.slice(1)) {
      if (rawPhone === null && looksLikePhone(field)) {
        rawPhone = field;
        phone = normalizeBrazilianPhone(field);
        continue;
      }
      hookParts.push(field);
    }
    let info: string | null = null;
    if (rawPhone !== null && phone === null) {
      unrecognizedPhones += 1;
      info = `Telefone informado: ${rawPhone}`.slice(0, TEXT_MAX);
    }
    items.push({
      name: name.slice(0, NAME_MAX),
      segment,
      phone,
      hook: hookParts.length ? hookParts.join(" · ").slice(0, TEXT_MAX) : null,
      info,
    });
  }
  return { items, unrecognizedPhones, ignoredLines };
}

// Frase da prévia do diálogo: "37 empresas reconhecidas · 2 telefones não reconhecidos".
export function describePastePreview(parsed: ParsedPaste): string {
  const n = parsed.items.length;
  const parts = [`${n} ${n === 1 ? "empresa reconhecida" : "empresas reconhecidas"}`];
  if (parsed.unrecognizedPhones > 0) {
    const u = parsed.unrecognizedPhones;
    parts.push(`${u} ${u === 1 ? "telefone não reconhecido" : "telefones não reconhecidos"}`);
  }
  if (parsed.ignoredLines > 0) {
    parts.push(
      `${parsed.ignoredLines} além do limite de ${PASTE_LINE_LIMIT} por colagem (ignoradas)`,
    );
  }
  return parts.join(" · ");
}
