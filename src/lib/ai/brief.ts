// "Preparar ligação" (ADR-003, frente 1; ia-plano.md, Frente A): esquema da saída estruturada,
// prompts e pós-processamento puro do briefing. Módulo puro: sem SDK, sem banco, sem Next. A
// action (src/actions/ai-brief.ts) só orquestra; o cartão (brief-card.tsx) só importa tipos daqui
// (zod não vai ao navegador).
import { z } from "zod";
import { slugify } from "@/lib/crm/format";
import { qualificationRules } from "./qualification";
import { formatTodayLine, renderLeadContext, type LeadContext } from "./redact";

// Prazo do próximo passo: o modelo escolhe uma categoria; a data nunca vem pronta (decisão P5).
export const BRIEF_DEADLINES = ["hoje", "amanha", "esta_semana", "proxima_semana"] as const;
export type BriefDeadline = (typeof BRIEF_DEADLINES)[number];

// Esquema sem min/max/minLength/regex nem enum (subconjunto de JSON Schema das saídas estruturadas,
// decisão P3; o SDK descarta `enum` e só colaria a lista na description, então a API não
// garantiria o valor): `prazo` é string descrita e normalizeBrief fecha em BriefDeadline. Os
// limites das listas valem no prompt e em normalizeBrief.
export const briefSchema = z.object({
  resumo: z.string().describe("Três a cinco frases: quem é, o que pediu, em que ponto está."),
  gancho_abertura: z
    .string()
    .describe(
      "Uma ou duas frases para abrir a ligação, na voz da Daniela, citando um fato do histórico.",
    ),
  pontos_atencao: z
    .array(z.string())
    .describe("Até seis itens: riscos, prazos, desqualificação possível, pendências."),
  perguntas: z
    .array(z.string())
    .describe("Três a sete perguntas de qualificação ainda não respondidas, na ordem."),
  objecoes_provaveis: z
    .array(z.object({ objecao: z.string(), resposta: z.string() }))
    .describe("Até cinco."),
  proximo_passo: z.object({
    acao: z.string().describe("Uma frase imperativa."),
    prazo: z
      .string()
      .describe(`Uma destas chaves exatas, sem acento: ${BRIEF_DEADLINES.join(", ")}.`),
  }),
  lacunas: z
    .array(z.string())
    .describe("Até seis dados que faltam no CRM e que mudariam a abordagem."),
});

// O que a API devolve validado (`prazo` ainda string) e o briefing fechado que a action e o cartão
// usam (`prazo: BriefDeadline`, garantido por normalizeBrief; o cartão indexa os rótulos por ele).
export type BriefRaw = z.infer<typeof briefSchema>;
export type Brief = Omit<BriefRaw, "proximo_passo"> & {
  proximo_passo: { acao: string; prazo: BriefDeadline };
};

export const BRIEF_LIMITS = {
  pontos_atencao: 6,
  perguntas: 7,
  objecoes_provaveis: 5,
  lacunas: 6,
} as const;

// System prompt estável: sem data, nome ou id (decisão P4), para o cache de prompt valer entre
// leads e entre dias. Termina com as regras fixas de qualificação.
export const BRIEF_SYSTEM = [
  "Você prepara a Daniela Sandrin Copat, consultora da Prospekto Consultoria & Projetos (Serra Gaúcha, RS), para uma ligação ou reunião com um lead do CRM. A Prospekto capta patrocínio incentivado para projetos culturais (Lei Rouanet art. 18 e 26, Lei do Audiovisual art. 1º-A, LIC-RS), elabora projetos e presta consultoria a empresas, escritórios contábeis, municípios e proponentes.",
  'Sua tarefa: a partir dos dados do CRM que vêm na mensagem, devolver um briefing curto e útil, em português do Brasil, só com o que está nos dados. Regras: 1) Nunca invente fato, número, nome ou data; quando faltar, escreva "não informado" e inclua o item em "lacunas". 2) Nunca prometa dedução, valor ou prazo: use "até 4% do IRPJ devido (3,6% com a LC 224/2025); o cálculo final é do contador" para PJ e "até 6% do IR devido, declaração completa" para PF. 3) Respeite as regras de desqualificação: Simples Nacional ou lucro presumido não usam Rouanet nem Audiovisual (ofereça LIC-RS se contribuinte de ICMS no RS); PF com declaração simplificada está fora. 4) Patrocínio não devolve dinheiro ao patrocinador; vínculo entre patrocinador e proponente (art. 27) bloqueia a combinação. 5) Tom: direto, cordial, sem jargão, sem adjetivos vazios; frases curtas. 6) As perguntas devem ser as que ainda não foram respondidas no CRM, na ordem em que a Daniela faria numa conversa de 15 a 30 minutos. 7) O gancho de abertura cita um fato concreto do histórico (o formulário preenchido, a simulação, a última conversa) e termina com uma pergunta aberta. 8) O "prazo" do próximo passo é uma destas chaves exatas, sem acento: hoje, amanha, esta_semana, proxima_semana. 9) Responda só com o JSON pedido.',
  qualificationRules(),
].join("\n\n");

export const BRIEF_INSTRUCTION =
  "Com base só nesses dados, prepare o briefing para a próxima ligação ou reunião. Estágio atual e prazo do estágio importam para o próximo passo.";

// Mensagem de usuário: data de hoje, contexto redigido (src/lib/ai/redact.ts) e a instrução.
export function briefUserMessage(context: LeadContext, now: Date): string {
  return [
    formatTodayLine(now),
    `DADOS DO LEAD\n${renderLeadContext(context, "brief")}`,
    BRIEF_INSTRUCTION,
  ].join("\n\n");
}

const clean = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

// Lista de textos: trim, sem vazios, sem repetidos (ignorando caixa) e cortada no limite.
function cleanList(raw: unknown, limit: number): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const text = clean(item);
    const key = text.toLocaleLowerCase("pt-BR");
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function cleanObjections(raw: unknown): Brief["objecoes_provaveis"] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Brief["objecoes_provaveis"] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const objecao = clean((item as { objecao?: unknown }).objecao);
    const resposta = clean((item as { resposta?: unknown }).resposta);
    const key = objecao.toLocaleLowerCase("pt-BR");
    if (!objecao || !resposta || seen.has(key)) continue;
    seen.add(key);
    out.push({ objecao, resposta });
    if (out.length >= BRIEF_LIMITS.objecoes_provaveis) break;
  }
  return out;
}

// "amanhã", "Esta semana" ou "proxima_semana" viram a chave; fora da lista, "esta_semana". A API
// só impõe `string` (ver briefSchema), então a lista fechada se resolve aqui.
function cleanDeadline(raw: unknown): BriefDeadline {
  const key = typeof raw === "string" ? slugify(raw).replace(/-/g, "_") : "";
  return (BRIEF_DEADLINES as readonly string[]).includes(key)
    ? (key as BriefDeadline)
    : "esta_semana";
}

// Pós-processamento puro da saída validada: corta as listas nos limites, remove itens vazios e
// duplicados, trim. Tolera campos ausentes (o último briefing gravado em ai_runs pode ter vindo
// de uma versão anterior do esquema): nunca lança.
export function normalizeBrief(raw: Partial<Brief> | Record<string, unknown>): Brief {
  const r = raw as Record<string, unknown>;
  const next = (r.proximo_passo ?? {}) as Record<string, unknown>;
  return {
    resumo: clean(r.resumo),
    gancho_abertura: clean(r.gancho_abertura),
    pontos_atencao: cleanList(r.pontos_atencao, BRIEF_LIMITS.pontos_atencao),
    perguntas: cleanList(r.perguntas, BRIEF_LIMITS.perguntas),
    objecoes_provaveis: cleanObjections(r.objecoes_provaveis),
    proximo_passo: { acao: clean(next.acao), prazo: cleanDeadline(next.prazo) },
    lacunas: cleanList(r.lacunas, BRIEF_LIMITS.lacunas),
  };
}
