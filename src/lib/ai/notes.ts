// "Ditar e organizar" (ADR-003, frente 2; ia-plano.md, Frente B): esquema da saída estruturada,
// prompts e pós-processamento puro. Nada de SDK, banco ou Next aqui; a action só orquestra
// (decisão P3). O componente de tela importa só tipos deste módulo (zod não vai ao navegador).
import { z } from "zod";
import { ATTRIBUTE_FIELDS, type AttributeField } from "@/lib/crm/attributes";
import {
  addCalendarDays,
  calendarDateInSaoPaulo,
  fromDateTimeLocal,
  parseDecimalBr,
  slugify,
} from "@/lib/crm/format";
import { SEGMENT_LABELS, enumLabel } from "@/lib/crm/labels";
import type { LeadSegment } from "@/lib/domain/enums";
import { calendarDateSchema } from "@/lib/validation/common";
import { parseAttributes } from "@/lib/validation/lead-attributes";
import { formatTodayLine, renderLeadContext, scrubText, type LeadContext } from "./redact";

// Canal da conversa; "tarefa" fica de fora (tarefas detectadas vão em `tarefas`).
export const NOTES_TYPES = ["ligacao", "reuniao", "email", "whatsapp", "visita", "nota"] as const;
export type NotesType = (typeof NOTES_TYPES)[number];

// Limites do relato (a action valida; o botão da tela segue o mínimo). O máximo é o corte do
// scrubText (redact.ts) e do campo `body` da atividade.
export const NOTES_TEXT_MIN = 20;
export const NOTES_TEXT_MAX = 8_000;

const SUBJECT_MAX = 80;
const LIST_MAX = 8;
const EM_DIAS_MAX = 60;
const NEXT_ACTION_HOUR = "09:00";

// Campos do segmento que a IA pode preencher: tudo de ATTRIBUTE_FIELDS menos a checagem do
// art. 27 (regra R-10: é uma decisão humana registrada com data e autor; decisão P7).
export function attributeFieldsFor(segment: LeadSegment): AttributeField[] {
  return ATTRIBUTE_FIELDS[segment].filter((f) => !f.key.startsWith("vinculo_art27"));
}

export function attributeKeysFor(segment: LeadSegment): string[] {
  return attributeFieldsFor(segment).map((f) => f.key);
}

// Esquema dinâmico por segmento. Sem min/max/minLength/regex nem enum (subconjunto de JSON Schema
// das saídas estruturadas; o SDK descarta `enum` e só colaria a lista na description, então a API
// não garantiria o valor): `tipo` e `chave` são strings descritas, e a lista fechada vale no prompt
// e em normalizeNotes. Os demais limites também ficam no prompt e em normalizeNotes.
export function notesSchemaFor(segment: LeadSegment) {
  const keys = attributeKeysFor(segment);
  return z.object({
    tipo: z.string().describe(`Uma destas chaves exatas, sem acento: ${NOTES_TYPES.join(", ")}.`),
    assunto: z.string().describe("Até 80 caracteres, sem ponto final."),
    resumo: z
      .string()
      .describe(
        "O que aconteceu, em primeira pessoa da Daniela, até 8 frases, em parágrafos curtos.",
      ),
    proxima_acao: z
      .object({
        descricao: z.string(),
        // Zod 4 emite minimum/maximum de inteiro seguro para .int() e o SDK os colaria na
        // description; mantém "type": "integer" e só apaga os limites do JSON Schema.
        em_dias: z
          .number()
          .int()
          .describe("0 = hoje, 1 = amanhã; dias corridos.")
          .meta({ minimum: undefined, maximum: undefined }),
      })
      .nullable(),
    tarefas: z
      .array(z.string())
      .describe("Compromissos assumidos por qualquer das partes, um por item."),
    campos_extraidos: z.array(
      z.object({
        chave: z.string().describe(`Uma das chaves listadas no system prompt: ${keys.join(", ")}.`),
        valor: z
          .string()
          .describe(
            "Para campos de escolha, exatamente um dos valores permitidos; para sim/não, 'true' ou 'false'.",
          ),
      }),
    ),
    incertezas: z.array(z.string()).describe("O que ficou ambíguo no relato."),
  });
}

export type NotesRaw = z.infer<ReturnType<typeof notesSchemaFor>>;

// Campo da empresa já validado pelo schema do segmento, com rótulos para a tela.
export type NotesField = {
  chave: string;
  rotulo: string;
  valor: string | number | boolean;
  valorRotulo: string;
};

// Resultado normalizado que a action devolve e o ActivityForm aplica. `proximaAcao.at` é ISO
// (09:00 em America/Sao_Paulo do dia calculado; decisão P5): a data nunca vem pronta do modelo.
export type Notes = {
  tipo: NotesType;
  assunto: string;
  resumo: string;
  proximaAcao: { descricao: string; emDias: number; at: string } | null;
  tarefas: string[];
  campos: NotesField[];
  incertezas: string[];
};

// 09:00 em America/Sao_Paulo, `emDias` dias corridos depois de hoje (no fuso do CRM).
export function nextActionDateFor(now: Date, emDias: number): Date {
  const day = addCalendarDays(calendarDateInSaoPaulo(now), emDias);
  return fromDateTimeLocal(`${day}T${NEXT_ACTION_HOUR}`) ?? now;
}

function trimList(items: string[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    const text = item.trim();
    if (text && !out.includes(text)) out.push(text);
    if (out.length >= LIST_MAX) break;
  }
  return out;
}

// Canal devolvido pelo modelo na chave de NOTES_TYPES ("Ligação" → "ligacao", "e-mail" → "email"):
// a API só impõe `string` (ver notesSchemaFor), então a lista fechada se resolve aqui.
function canonicalType(raw: string): NotesType | null {
  const key = slugify(raw).replace(/-/g, "");
  return NOTES_TYPES.find((t) => t === key) ?? null;
}

// Converte o texto devolvido pelo modelo no tipo do campo antes da validação do segmento.
// Devolve undefined quando a forma não serve (vira incerteza).
function coerceValue(field: AttributeField, raw: string): unknown {
  const value = raw.trim();
  if (!value) return undefined;
  if (field.type === "boolean") {
    const v = value.toLowerCase();
    if (v === "true" || v === "sim") return true;
    if (v === "false" || v === "nao" || v === "não") return false;
    return undefined;
  }
  if (field.type === "number") {
    // "1.250.000,50", "1500.50" e "1.500" (parseDecimalBr, o mesmo do formulário manual): apagar
    // todos os pontos antes de olhar a vírgula multiplicava "1500.50" por 100.
    return parseDecimalBr(value) ?? undefined;
  }
  if (field.type === "date") {
    // Só AAAA-MM-DD chega ao atributo (a página do lead e o <input type="date"> esperam esse
    // formato): dd/mm/aaaa é convertido; outro texto ou data impossível vira incerteza.
    const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : value;
    return calendarDateSchema.safeParse(iso).success ? iso : undefined;
  }
  if (field.key === "cnpj") {
    const digits = value.replace(/\D/g, "");
    return digits.length === 14 ? digits : undefined;
  }
  return value;
}

export function notesAttributes(notes: Pick<Notes, "campos">): Record<string, unknown> {
  return Object.fromEntries(notes.campos.map((c) => [c.chave, c.valor]));
}

// Pós-processamento puro: fecha o canal na lista, corta assunto e listas, valida cada campo pelo
// schema do segmento (o que não valida vira incerteza, nunca grava) e calcula a data da próxima
// ação.
export function normalizeNotes(raw: NotesRaw, segment: LeadSegment, now: Date): Notes {
  const fields = attributeFieldsFor(segment);
  // Avisos gerados aqui (canal ou campo não reconhecido, valor recusado) vão na frente das
  // incertezas do modelo: são a parte acionável de "Ficou em aberto" e não podem sumir no corte
  // em LIST_MAX quando o modelo já devolveu a lista cheia.
  const avisos: string[] = [];
  const tipo = canonicalType(raw.tipo);
  if (!tipo) avisos.push(`Canal não reconhecido: '${raw.tipo.trim()}'`);
  const campos: NotesField[] = [];
  const seen = new Set<string>();
  for (const item of raw.campos_extraidos) {
    const chave = item.chave.trim();
    const field = fields.find((f) => f.key === chave);
    if (!field) {
      avisos.push(`Campo não reconhecido: '${chave}'`);
      continue;
    }
    if (seen.has(field.key)) continue;
    seen.add(field.key);
    const rejected = () =>
      avisos.push(`Valor não reconhecido para ${field.label}: '${item.valor.trim()}'`);
    const coerced = coerceValue(field, item.valor);
    if (coerced === undefined) {
      rejected();
      continue;
    }
    try {
      const parsed = parseAttributes(segment, { [field.key]: coerced })[field.key];
      if (typeof parsed !== "string" && typeof parsed !== "number" && typeof parsed !== "boolean") {
        rejected();
        continue;
      }
      campos.push({
        chave: field.key,
        rotulo: field.label,
        valor: parsed,
        valorRotulo: enumLabel(parsed),
      });
    } catch {
      rejected();
    }
  }

  const next = raw.proxima_acao;
  const emDias = next?.em_dias;
  const descricao = next?.descricao.trim() ?? "";
  const proximaAcao =
    next && descricao && Number.isInteger(emDias) && emDias! >= 0 && emDias! <= EM_DIAS_MAX
      ? { descricao, emDias: emDias!, at: nextActionDateFor(now, emDias!).toISOString() }
      : null;

  return {
    tipo: tipo ?? "nota",
    assunto: raw.assunto
      .trim()
      .replace(/[.\s]+$/, "")
      .slice(0, SUBJECT_MAX),
    resumo: raw.resumo.trim(),
    proximaAcao,
    tarefas: trimList(raw.tarefas),
    campos,
    incertezas: trimList([...avisos, ...raw.incertezas]),
  };
}

// Parte fixa do system prompt (ia-plano.md, Frente B). Sem data, nome ou id (decisão P4).
export const NOTES_SYSTEM = [
  "Você organiza as anotações que a Daniela Sandrin Copat, consultora da Prospekto (captação de patrocínio cultural incentivado e consultoria em leis de incentivo, Serra Gaúcha, RS), ditou ou colou depois de uma conversa com um lead. O relato é falado: pode ter repetições, hesitações, frases incompletas e erros de reconhecimento de voz.",
  "",
  'Sua tarefa: devolver, em português do Brasil, o registro pronto para o CRM. Regras: 1) Só o que está no relato; nada de inferir dados que não foram ditos. Dúvida vai em "incertezas". 2) "tipo" é o canal da conversa, com uma destas chaves exatas, sem acento: ligacao, reuniao, email, whatsapp, visita; use "nota" quando não houve contato com o lead. 3) "assunto" resume em poucas palavras ("Ligação: contador confirma lucro real"). 4) "resumo" é escrito na voz da Daniela, em primeira pessoa, sem floreio, mantendo nomes, valores e datas exatamente como ditos; não corrija números. 5) "proxima_acao" é a ação seguinte combinada ou implícita, com o prazo em dias corridos a partir de hoje; se nada foi combinado, null. 6) "campos_extraidos" só com informação explícita da conversa, usando as chaves e os valores permitidos; nunca invente. CNPJ só se foi dito, com 14 dígitos. 7) Nunca escreva e-mail, telefone ou CPF no resumo; se aparecerem no relato, escreva "[contato informado]". 8) Responda só com o JSON pedido.',
].join("\n");

function describeField(field: AttributeField): string {
  const head = `- ${field.key} (${field.label}): `;
  if (field.type === "select" && field.options) {
    const options = field.options.map((o) => `${o} (${enumLabel(o)})`).join(", ");
    return `${head}um de ${options}`;
  }
  if (field.type === "boolean") return `${head}'true' ou 'false'`;
  if (field.type === "number") return `${head}número em reais, só dígitos e vírgula decimal`;
  if (field.type === "date") return `${head}data no formato AAAA-MM-DD`;
  if (field.key === "cnpj") return `${head}só os 14 dígitos`;
  return `${head}texto curto`;
}

// System prompt por segmento: a tabela de chaves e valores é estável por segmento, por isso faz
// parte do system (seis prefixos de cache; ADR-003, 7.1).
export function notesSystemFor(segment: LeadSegment): string {
  const table = attributeFieldsFor(segment).map(describeField).join("\n");
  return `${NOTES_SYSTEM}\n\nChaves e valores permitidos de "campos_extraidos" para este segmento (${SEGMENT_LABELS[segment]}):\n${table}`;
}

// Mensagem de usuário: data de hoje, contexto do lead (modo "notes": só primeiro nome, campos
// preenchidos e últimas atividades sem corpo) e o relato com e-mail, telefone e CPF mascarados.
// O CNPJ fica, porque a Daniela pode ditá-lo para virar campo (ADR-003, 5.1).
export function notesUserMessage(context: LeadContext, text: string, now: Date): string {
  return [
    formatTodayLine(now),
    "",
    "LEAD (só para contexto; não repita o que já está preenchido)",
    renderLeadContext(context, "notes"),
    "",
    "RELATO DITADO OU COLADO",
    '"""',
    scrubText(text, { keepCnpj: true }),
    '"""',
    "",
    "Organize o relato no formato pedido.",
  ].join("\n");
}
