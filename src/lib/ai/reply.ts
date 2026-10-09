// "Resposta sugerida" (ADR-003, frente 3; ia-plano.md, Frente C): esquema da saída estruturada,
// prompts e pós-processamento puro do rascunho de resposta (primeiro contato ou não) na voz da
// Daniela, por e-mail ou WhatsApp. Módulo puro: sem SDK, sem banco, sem Next. A action
// (src/actions/ai-reply.ts) só orquestra; o cartão (reply-card.tsx) só importa tipos daqui (zod
// não vai ao navegador).
import { z } from "zod";
import { qualificationRules } from "./qualification";
import { formatTodayLine, renderLeadContext, scrubText, type LeadContext } from "./redact";
import type { AiSlot } from "./types";

export const REPLY_CHANNELS = ["email", "whatsapp"] as const;
export type ReplyChannel = (typeof REPLY_CHANNELS)[number];

export const REPLY_CHANNEL_LABELS: Record<ReplyChannel, string> = {
  email: "e-mail",
  whatsapp: "WhatsApp",
};

// Esquema sem min/max/minLength/regex (subconjunto de JSON Schema das saídas estruturadas,
// decisão P3); os limites valem no prompt e em normalizeReply.
export const replySchema = z.object({
  assunto: z.string().nullable().describe("Só para e-mail; até 70 caracteres. null no WhatsApp."),
  texto: z.string().describe("A mensagem completa, pronta para enviar, com saudação e assinatura."),
  perguntas_incluidas: z
    .array(z.string())
    .describe("As perguntas de qualificação que entraram no texto, para conferência."),
  horarios_incluidos: z
    .array(z.string())
    .describe("Os dois horários propostos, exatamente como escritos no texto."),
});

export type Reply = z.infer<typeof replySchema>;

// O que a action devolve ao cartão: a saída normalizada mais o canal e os horários que o código
// propôs (as datas nunca vêm do modelo, decisão P5).
export type ReplyDraft = Reply & { channel: ReplyChannel; slots: AiSlot[] };

export const REPLY_LIMITS = {
  // Limite do WhatsApp (uma tela de celular; a Daniela edita antes de enviar).
  whatsappChars: 900,
  // Mesmo teto do campo "subject" da action de envio (sendLeadReplyAction).
  subjectChars: 150,
  questionsEmail: 4,
  questionsWhatsapp: 3,
} as const;

export const DEFAULT_EMAIL_SUBJECT = "Sobre o seu contato com a Prospekto";

// Frase de saída obrigatória na primeira mensagem de WhatsApp (estrutura-e-copy.md, 10.1).
export const WHATSAPP_EXIT_SENTENCE = "Responda SAIR se não quiser mensagens por aqui.";

// No e-mail o modelo assina só o primeiro nome: o template (lead-reply.ts) acrescenta nome
// completo, empresa e contatos depois do corpo, e a assinatura completa não pode sair duas vezes.
export const EMAIL_SIGNATURE = "Daniela";
export const WHATSAPP_SIGNATURE = "Daniela, da Prospekto";

// System prompt estável: sem data, nome de lead ou id (decisão P4), para o cache de prompt valer
// entre leads, canais e dias. Termina com as regras fixas de qualificação.
export const REPLY_SYSTEM = [
  "Você escreve a resposta da Daniela Sandrin Copat, da Prospekto Consultoria & Projetos (Serra Gaúcha, RS), a um lead que chegou pelo site, por indicação, por evento ou pelo LinkedIn (a mensagem de usuário diz se é o PRIMEIRO CONTATO; só nele cabem a apresentação e a frase do que a Prospekto faz). A Prospekto capta patrocínio incentivado para projetos culturais da região (Lei Rouanet art. 18 e 26, Lei do Audiovisual art. 1º-A, LIC-RS), elabora projetos e presta consultoria a empresas, escritórios contábeis, municípios e proponentes.",
  'Voz da Daniela: cordial e direta, primeira pessoa, frases curtas, nada de "espero que este e-mail o encontre bem", nada de superlativos, nada de promessa que a lei não sustenta. Números sempre com ressalva: "até 4% do IRPJ devido (3,6% com a LC 224/2025); o cálculo final é do seu contador" para empresa no lucro real; "até 6% do IR devido, na declaração completa" para pessoa física. Simples Nacional e lucro presumido não usam Rouanet nem Audiovisual: para esses, ofereça a LIC-RS se a empresa recolhe ICMS no RS, ou diga com franqueza que não há dedução federal. Patrocínio não devolve dinheiro.',
  `Estrutura: saudação com o primeiro nome; uma frase que cita o que a pessoa fez (formulário, simulação, guia, conversa); uma frase do que a Prospekto faz por esse perfil; as perguntas de qualificação (as da mensagem de usuário, no máximo ${REPLY_LIMITS.questionsWhatsapp} no WhatsApp e ${REPLY_LIMITS.questionsEmail} no e-mail, em lista no e-mail e em frases corridas no WhatsApp); a proposta dos dois horários que vêm na mensagem, escritos exatamente como recebidos, com "Qual prefere?"; assinatura só "${EMAIL_SIGNATURE}" no e-mail (o CRM acrescenta nome completo, empresa e contatos) e "${WHATSAPP_SIGNATURE}" no WhatsApp. No WhatsApp, quando PRIMEIRO CONTATO é sim, a mensagem termina com "${WHATSAPP_EXIT_SENTENCE}". No WhatsApp o texto cabe em ${REPLY_LIMITS.whatsappChars} caracteres. Nunca escreva e-mail, telefone ou link; o CRM acrescenta a assinatura completa. Só o que está nos dados; nada inventado. No e-mail, "assunto" com até 70 caracteres; no WhatsApp, "assunto" é null. Responda só com o JSON pedido.`,
  qualificationRules(),
].join("\n\n");

export const REPLY_INSTRUCTION = "Escreva a resposta.";

export type ReplyUserMessageInput = {
  channel: ReplyChannel;
  questions: string[];
  slots: AiSlot[];
  now: Date;
  // Estágio inicial e sem contato (calculado na action). Fora dele, o modelo não se apresenta de
  // novo nem usa a frase de saída.
  isFirstContact: boolean;
};

const FIRST_CONTACT_LINE = {
  yes: "PRIMEIRO CONTATO: sim",
  no: "PRIMEIRO CONTATO: não: já houve conversa (veja Último contato e ÚLTIMAS ATIVIDADES); não se apresente de novo nem explique o que a Prospekto faz; retome do último contato e não use a frase de saída",
} as const;

// Mensagem de usuário: data de hoje, canal, se é o primeiro contato, contexto redigido
// (src/lib/ai/redact.ts, modo "reply"), perguntas de qualificação na ordem e os dois horários
// por extenso.
export function replyUserMessage(context: LeadContext, input: ReplyUserMessageInput): string {
  const questions = input.questions.length
    ? input.questions.map((q) => `- ${q}`).join("\n")
    : "- (nenhuma: o CRM já tem as respostas; confirme o interesse e proponha a conversa)";
  const slots = input.slots.map((s, i) => `${i + 1}. ${s.label}`).join("\n");
  return [
    formatTodayLine(input.now),
    `CANAL: ${REPLY_CHANNEL_LABELS[input.channel]}`,
    input.isFirstContact ? FIRST_CONTACT_LINE.yes : FIRST_CONTACT_LINE.no,
    `DADOS DO LEAD\n${renderLeadContext(context, "reply")}`,
    `PERGUNTAS DE QUALIFICAÇÃO A INCLUIR (nesta ordem; use as primeiras)\n${questions}`,
    `HORÁRIOS A PROPOR (escreva exatamente assim)\n${slots}`,
    REPLY_INSTRUCTION,
  ].join("\n\n");
}

// URL inventada pelo modelo: sai do texto, exceto o domínio da própria Prospekto. Cobre
// "https://…", "www.…" (em qualquer caixa) e, só em minúsculas e com fronteira depois do TLD,
// domínios soltos ("algo.com.br", "bit.ly/x", "golpe.online/pagar"). A caixa e a fronteira evitam
// apagar "conversa.Me avise", "Sr.João" ou "Ltda.ME"; a lista fixa de TLDs fica para a decisão em
// stripUrls, não para a regex.
const URL_RE =
  /\b(?:[Hh][Tt][Tt][Pp][Ss]?:\/\/|[Ww][Ww][Ww]\.)[^\s<>"')\]]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,24}(?![\p{L}\p{N}-])(?:\/[^\s<>"')\]]*)?/gu;
const OWN_DOMAIN_RE = /(^|\.)prospekto\.com\.br$/i;
const EXPLICIT_URL_RE = /^(?:https?:\/\/|www\.)/i;
// TLDs em que um domínio solto sem caminho ainda é tratado como link.
const BARE_TLDS = new Set([
  "com",
  "net",
  "org",
  "gov",
  "edu",
  "app",
  "io",
  "br",
  "co",
  "me",
  "info",
  "site",
]);

function hostOf(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/[/?#].*$/, "");
}

// Domínio solto: é link quando tem caminho, TLD conhecido ou TLD de país (duas letras, como em
// "bit.ly" e "golpe.ru"); "p.ex." (rótulo de uma letra) e "qualquer.palavra" ficam no texto.
function looksLikeUrl(url: string): boolean {
  if (EXPLICIT_URL_RE.test(url) || url.includes("/")) return true;
  const labels = hostOf(url).split(".");
  const tld = labels[labels.length - 1] ?? "";
  const label = labels[labels.length - 2] ?? "";
  return BARE_TLDS.has(tld) || (tld.length === 2 && label.length >= 2);
}

export function stripUrls(text: string): string {
  return text
    .replace(URL_RE, (match) => {
      // A pontuação colada ao fim ("…com.br.") fica na frase.
      const trail = /[.,;:!?]+$/.exec(match)?.[0] ?? "";
      const url = trail ? match.slice(0, -trail.length) : match;
      if (!looksLikeUrl(url) || OWN_DOMAIN_RE.test(hostOf(url))) return match;
      return trail;
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const clean = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

function cleanList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const text = clean(item);
    const key = text.toLocaleLowerCase("pt-BR");
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

// Assunto do e-mail: obrigatório, numa linha só, sem dado pessoal nem URL e dentro do teto da
// action.
function cleanSubject(raw: unknown): string {
  const text = stripUrls(scrubText(clean(raw)))
    .replace(/\s+/g, " ")
    .trim();
  const subject = text || DEFAULT_EMAIL_SUBJECT;
  return subject.length > REPLY_LIMITS.subjectChars
    ? subject.slice(0, REPLY_LIMITS.subjectChars).trimEnd()
    : subject;
}

const hasSlot = (text: string, label: string) =>
  text.toLocaleLowerCase("pt-BR").includes(label.toLocaleLowerCase("pt-BR"));

function slotsSentence(slots: AiSlot[]): string {
  const labels = slots.map((s) => s.label);
  const list =
    labels.length > 1
      ? `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`
      : labels[0];
  return `Tenho horários ${list}. Qual prefere?`;
}

// Separa a assinatura (e, no WhatsApp, a frase de saída) do corpo para inserir o parágrafo dos
// horários antes dela. A assinatura é o último parágrafo que começa com "Daniela".
function splitSignature(text: string): { body: string; tail: string } {
  const paragraphs = text.split(/\n{2,}/);
  let idx = -1;
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    if (/^(Daniela\b|Atenciosamente|Abraço|Um abraço)/i.test(paragraphs[i].trim())) {
      idx = i;
      break;
    }
  }
  if (idx === -1) return { body: text, tail: "" };
  return {
    body: paragraphs.slice(0, idx).join("\n\n"),
    tail: paragraphs.slice(idx).join("\n\n"),
  };
}

function ensureSlots(text: string, slots: AiSlot[]): string {
  if (!slots.length || slots.every((s) => hasSlot(text, s.label))) return text;
  const { body, tail } = splitSignature(text);
  return [body.trimEnd(), slotsSentence(slots), tail].filter(Boolean).join("\n\n");
}

// Corta no último fim de frase ou de linha antes do limite; sem fronteira, corta seco.
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const cut = Math.max(head.lastIndexOf(". "), head.lastIndexOf("\n"), head.lastIndexOf("! "));
  return (cut > max / 2 ? head.slice(0, cut + 1) : head).trimEnd();
}

// A frase de saída como o modelo possa tê-la escrito (caixa e espaços variáveis).
const WHATSAPP_EXIT_RE = new RegExp(
  WHATSAPP_EXIT_SENTENCE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"),
  "gi",
);

function finishWhatsapp(text: string, isFirstContact: boolean): string {
  const max = REPLY_LIMITS.whatsappChars;
  // A frase de saída do modelo sai sempre: fora do primeiro contato ela não cabe; no primeiro, o
  // código a recoloca em parágrafo próprio, inclusive depois do corte.
  const out = text
    .replace(WHATSAPP_EXIT_RE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!isFirstContact) return clip(out, max);
  const body = clip(out, max - WHATSAPP_EXIT_SENTENCE.length - 2);
  return body ? `${body}\n\n${WHATSAPP_EXIT_SENTENCE}` : WHATSAPP_EXIT_SENTENCE;
}

export type NormalizeReplyInput = {
  channel: ReplyChannel;
  slots: AiSlot[];
  // Estágio inicial e sem contato: a mensagem de WhatsApp oferece a saída "SAIR".
  isFirstContact: boolean;
};

// Pós-processamento puro da saída validada: mascara e-mail, telefone, CPF e CNPJ que o modelo
// possa ter inventado (scrubText), remove URLs (exceto prospekto.com.br) do texto e do assunto,
// garante os dois horários no texto, a frase de saída (só no primeiro contato) e o limite de
// caracteres no WhatsApp, e o assunto numa linha no e-mail. Tolera campos ausentes (registro
// antigo em ai_runs): nunca lança.
export function normalizeReply(
  raw: Partial<Reply> | Record<string, unknown>,
  input: NormalizeReplyInput,
): Reply {
  const r = raw as Record<string, unknown>;
  let texto = stripUrls(scrubText(clean(r.texto)));
  texto = ensureSlots(texto, input.slots);
  texto =
    input.channel === "whatsapp"
      ? finishWhatsapp(texto, input.isFirstContact)
      : texto.replace(/\n{3,}/g, "\n\n").trim();
  return {
    assunto: input.channel === "email" ? cleanSubject(r.assunto) : null,
    texto,
    perguntas_incluidas: cleanList(r.perguntas_incluidas),
    horarios_incluidos: cleanList(r.horarios_incluidos),
  };
}
