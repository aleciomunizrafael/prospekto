// Texto legível das atividades `formulario` na linha do tempo do lead: chaves e enums do
// formulário traduzidos pelos rótulos do CRM, sem repetir nome, e-mail e telefone (já estão no
// cabeçalho) nem ids internos. Testado em tests/lib/activity-text.test.ts.
import { ATTRIBUTE_FIELDS } from "./attributes";
import { ATTRIBUTE_VALUE_LABELS, SEGMENT_LABELS, SOURCE_LABELS } from "./labels";
import { DIAGNOSTIC_FORMAT_LABELS } from "@/lib/validation/forms/diagnostico-options";

const HIDDEN_KEYS = new Set([
  "form_id",
  "consent_lgpd",
  "consent_marketing",
  "nome",
  "email",
  "telefone",
  "projeto_id",
  "simulation_id",
  "source",
  "source_detail",
]);

const FORM_KEY_LABELS: Record<string, string> = {
  tipo_pessoa: "Quem patrocina",
  formato: "Formato",
  disponibilidade: "Disponibilidade",
  cidade: "Cidade",
  uf: "UF",
  mensagem: "Mensagem",
  projeto_slug: "Projeto",
  empresa: "Empresa",
  cnpj: "CNPJ",
  cargo: "Cargo",
  interesse: "Interesse",
  origem: "Origem",
  sourceDetail: "Detalhe da origem",
};

const ATTRIBUTE_KEY_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(ATTRIBUTE_FIELDS)
    .flat()
    .map((f) => [f.key, f.label]),
);

const FORMAT_SHORT_LABELS: Record<string, string> = {
  diagnostico: "Diagnóstico (30 min, com o contador)",
  simulacao: "Simulação (20 min)",
};

export function formFieldLabel(key: string): string {
  return FORM_KEY_LABELS[key] ?? ATTRIBUTE_KEY_LABELS[key] ?? key;
}

export function formValueLabel(key: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "sim" : "não";
  if (typeof value !== "string") return String(value);
  if (key === "tipo_pessoa") return (SEGMENT_LABELS as Record<string, string>)[value] ?? value;
  if (key === "formato") {
    return (
      FORMAT_SHORT_LABELS[value] ??
      (DIAGNOSTIC_FORMAT_LABELS as Record<string, string>)[value] ??
      value
    );
  }
  return ATTRIBUTE_VALUE_LABELS[value] ?? value;
}

export function formActivityText(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const parts = Object.entries(data)
    .filter(
      ([k, v]) =>
        !HIDDEN_KEYS.has(k) && v !== null && v !== undefined && v !== "" && typeof v !== "object",
    )
    .slice(0, 12)
    .map(([k, v]) => `${formFieldLabel(k)}: ${formValueLabel(k, v)}`);
  return parts.length ? parts.join(" · ") : null;
}

// "Formulário recebido (diagnostico)" -> "Formulário recebido: Diagnóstico".
export function formActivitySubject(subject: string): string {
  const m = /^(Formulário (?:recebido|reenviado)) \((\w+)\)$/.exec(subject);
  if (!m) return subject;
  const source = (SOURCE_LABELS as Record<string, string>)[m[2]] ?? m[2];
  return `${m[1]}: ${source}`;
}
