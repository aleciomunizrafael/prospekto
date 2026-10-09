// Núcleo de qualificação reutilizável (ADR-003, seção 10.3): perguntas por segmento, horários
// propostos e regras fixas que entram no system prompt dos três recursos de hoje e, no futuro, do
// agente de voz e do WhatsApp automático. Módulo puro: sem Next, sem banco, sem SDK.
// Fontes: docs/estrategia/personas-e-funis.md, seções 3, 5.1, 5.2 e 8.
import {
  AI_MEETING_WINDOWS,
  AI_SLOT_LEAD_BUSINESS_DAYS,
  AI_SLOT_MINUTES,
  AI_TIMEZONE,
} from "@/config/ai";
import { addCalendarDays, calendarDateInSaoPaulo, fromDateTimeLocal } from "@/lib/crm/format";
import type { LeadSegment } from "@/lib/domain/enums";
import type { AiSlot } from "./types";

// Cada pergunta responde a um campo de `attributes`; já respondida (valor presente e diferente
// de "nao_sei"), sai da lista. Ordem: a que a Daniela faria numa conversa de 15 a 30 minutos.
type Question = { key: string; text: string };

const QUESTIONS: Record<LeadSegment, Question[]> = {
  PJ: [
    {
      key: "regime_tributario",
      text: "A empresa é tributada pelo lucro real? Quem confirma: o contador ou a ECF?",
    },
    {
      key: "irpj_faixa",
      text: "Em que faixa fica o IRPJ devido no ano, e a apuração é trimestral ou anual?",
    },
    {
      key: "decisor_em_contato",
      text: "Quem decide o patrocínio na empresa: você, a diretoria ou o financeiro?",
    },
    {
      key: "contador_participa",
      text: "O contador da empresa pode participar da conversa de diagnóstico?",
    },
    {
      key: "usa_incentivos",
      text: "A empresa já usa algum incentivo fiscal (cultura, esporte, FIA, idoso)?",
    },
    { key: "contribuinte_icms_rs", text: "A empresa recolhe ICMS no Rio Grande do Sul?" },
  ],
  PF: [
    { key: "modelo_declaracao", text: "Você declara pelo modelo completo ou pelo simplificado?" },
    {
      key: "ir_devido_faixa",
      text: "Em que faixa fica o seu imposto devido anual (não o imposto retido)?",
    },
    { key: "contador_declaracao", text: "Quem faz a sua declaração: você ou um contador?" },
    {
      key: "ja_doa_com_incentivo",
      text: "Já doou com incentivo (FIA, idoso) ou patrocinou cultura antes?",
    },
  ],
  CONT: [
    {
      key: "clientes_lucro_real_faixa",
      text: "Quantos clientes do escritório estão no lucro real?",
    },
    {
      key: "ja_lancou_incentivo",
      text: "O escritório já lançou dedução de incentivo cultural na ECF de algum cliente?",
    },
    {
      key: "socio_em_contato",
      text: "Quem decide a parceria no escritório: um sócio ou a diretoria técnica?",
    },
    { key: "sede_serra_gaucha", text: "O escritório atende clientes na Serra Gaúcha?" },
  ],
  MUN: [
    {
      key: "orgao",
      text: "O município tem secretaria, diretoria ou setor de cultura? Quem responde por ele?",
    },
    {
      key: "pnab_status",
      text: "Como está o município na PNAB: ciclo ativo, saldo a executar ou ainda não aderiu?",
    },
    {
      key: "dotacao_consultoria",
      text: "Existe dotação orçamentária para consultoria neste exercício?",
    },
    {
      key: "necessidade",
      text: "Qual é a necessidade principal: editais, prestação de contas, projetos próprios ou lei de incentivo?",
    },
    {
      key: "lei_incentivo_municipal",
      text: "O município tem lei de incentivo à cultura ou fundo municipal?",
    },
  ],
  PROP: [
    {
      key: "status_projeto",
      text: "O projeto tem portaria de captação vigente ou ainda vai ser inscrito?",
    },
    {
      key: "mecanismo",
      text: "Em qual mecanismo o projeto está ou pretende entrar (Rouanet, Audiovisual, LIC-RS)?",
    },
    {
      key: "saldo_a_captar",
      text: "Qual é o saldo a captar e até quando vai o prazo de captação?",
    },
    { key: "rubrica_captacao", text: "O orçamento aprovado tem rubrica de captação de recursos?" },
    {
      key: "prestacao_contas_anterior",
      text: "Como estão as prestações de contas de projetos anteriores?",
    },
    {
      key: "apelo_regional",
      text: "O projeto acontece na Serra Gaúcha ou tem apelo regional para as empresas daqui?",
    },
  ],
  ALUNO: [
    {
      key: "objetivo",
      text: "O que você quer fazer: escrever o primeiro projeto, captar, fazer disso profissão ou se atualizar?",
    },
    {
      key: "experiencia",
      text: "Você já escreveu ou captou para algum projeto, ou atua em secretaria?",
    },
    {
      key: "faixa_investimento",
      text: "Qual faixa de investimento cabe para você numa mentoria em grupo?",
    },
  ],
};

function answered(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (value === "nao_sei") return false;
  return true;
}

export function qualificationQuestions(
  segment: LeadSegment,
  attributes: Record<string, unknown>,
): string[] {
  return QUESTIONS[segment].filter((q) => !answered(attributes[q.key])).map((q) => q.text);
}

export type SlotConfig = {
  windows: readonly { days: readonly number[]; start: string; end: string }[];
  slotMinutes: number;
  leadBusinessDays: number;
  timeZone: string;
};

const DEFAULT_SLOT_CONFIG: SlotConfig = {
  windows: AI_MEETING_WINDOWS,
  slotMinutes: AI_SLOT_MINUTES,
  leadBusinessDays: AI_SLOT_LEAD_BUSINESS_DAYS,
  timeZone: AI_TIMEZONE,
};

function isoWeekday(date: string, timeZone: string): number {
  // Meio-dia local evita a virada de dia na conversão; "en-US" devolve o nome curto.
  const at = fromDateTimeLocal(`${date}T12:00`) ?? new Date(`${date}T12:00:00Z`);
  const name = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone }).format(at);
  return { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[name] ?? 0;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function slotLabel(date: string, minutes: number, timeZone: string): string {
  const at = fromDateTimeLocal(`${date}T12:00`) ?? new Date(`${date}T12:00:00Z`);
  const day = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(at);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${day}, às ${h}h${m ? String(m).padStart(2, "0") : ""}`;
}

// Dois horários em dias úteis diferentes, a partir do próximo dia útil (nunca hoje, nunca sábado
// ou domingo), dentro das janelas: o primeiro na janela da manhã, o segundo na da tarde, ambos
// uma hora depois do início (dois slots de 30 min) para não cair no primeiro minuto da janela.
// Feriados ficam para depois (a Daniela edita o texto antes de enviar).
export function proposeSlots(now: Date, config: Partial<SlotConfig> = {}): AiSlot[] {
  const cfg = { ...DEFAULT_SLOT_CONFIG, ...config };
  const windows = cfg.windows.length ? cfg.windows : DEFAULT_SLOT_CONFIG.windows;
  const slots: AiSlot[] = [];
  let date = calendarDateInSaoPaulo(now);
  let businessDaysAhead = 0;
  let guard = 0;
  while (slots.length < 2 && guard++ < 30) {
    date = addCalendarDays(date, 1);
    const weekday = isoWeekday(date, cfg.timeZone);
    const window = windows.find((w) => w.days.includes(weekday));
    if (!window) continue;
    businessDaysAhead += 1;
    if (businessDaysAhead < cfg.leadBusinessDays) continue;
    // Primeiro horário: janela 0; segundo: a última janela do dia (tarde, quando existir).
    const chosen = slots.length === 0 ? windows[0] : windows[windows.length - 1];
    const usable = chosen.days.includes(weekday) ? chosen : window;
    const start = toMinutes(usable.start);
    const end = toMinutes(usable.end);
    const preferred = start + cfg.slotMinutes * 2;
    const minutes = preferred + cfg.slotMinutes <= end ? preferred : start;
    const hhmm = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    const at = fromDateTimeLocal(`${date}T${hhmm}`);
    if (!at) continue;
    slots.push({ iso: at.toISOString(), label: slotLabel(date, minutes, cfg.timeZone) });
  }
  return slots;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Rascunho gravado em outro dia: ai_runs guarda só os rótulos que entraram no texto
// (horarios_incluidos), não os ISO. Para o texto, a linha "Horários propostos" e a próxima ação
// baterem, troca cada rótulo antigo pelo de hoje, na mesma posição, numa passagem só e sem
// distinguir caixa (como ensureSlots em reply.ts). Só troca quando há o mesmo número de rótulos e
// todos estão no texto; senão devolve o texto intacto com replaced = false, e o cartão avisa que
// os horários podem ter passado em vez de marcar uma hora que não está no texto.
export function refreshSlotLabels(
  texto: string,
  oldLabels: string[],
  slots: AiSlot[],
): { texto: string; horarios: string[]; replaced: boolean } {
  const keep = { texto, horarios: oldLabels, replaced: false };
  if (!oldLabels.length || oldLabels.length !== slots.length) return keep;
  const lower = texto.toLocaleLowerCase("pt-BR");
  const byLabel = new Map<string, string>();
  for (const [i, old] of oldLabels.entries()) {
    const key = old.toLocaleLowerCase("pt-BR");
    if (!key || !lower.includes(key)) return keep;
    byLabel.set(key, slots[i].label);
  }
  const pattern = new RegExp(oldLabels.map(escapeRegExp).join("|"), "gi");
  const replaced = texto.replace(
    pattern,
    (match) => byLabel.get(match.toLocaleLowerCase("pt-BR")) ?? match,
  );
  return { texto: replaced, horarios: slots.map((s) => s.label), replaced: true };
}

// Texto fixo (sem data, nome ou id) que entra no system prompt dos recursos: mecanismos,
// desqualificações, ressalvas e objeções com resposta curta (personas-e-funis.md, 3.1 e 5.1).
export function qualificationRules(): string {
  return [
    "REGRAS DE QUALIFICAÇÃO DA PROSPEKTO",
    "Mecanismos: Lei Rouanet (Lei 8.313/1991) art. 18 (dedução integral, dentro do limite) e art. 26 (dedução parcial); Lei do Audiovisual (Lei 8.685/1993) art. 1º-A (dedução integral); LIC-RS (lei estadual de incentivo à cultura do Rio Grande do Sul, abatimento de ICMS). Município e PNAB entram só para a consultoria a municípios.",
    "Limites (sempre com ressalva): empresa no lucro real pode destinar até 4% do IRPJ devido (3,6% com a LC 224/2025); o cálculo final é do contador. Pessoa física na declaração completa, até 6% do IR devido. Esporte, FIA e Idoso têm tetos próprios e não consomem a cesta cultural. Nunca prometa valor, dedução ou prazo.",
    "Desqualificação: Simples Nacional e lucro presumido não usam Rouanet nem Audiovisual (se a empresa recolhe ICMS no RS, oferecer LIC-RS; senão, dizer com franqueza que não há dedução federal). Pessoa física na declaração simplificada está fora. Empresa com prejuízo no período não tem IRPJ a deduzir: registrar e voltar na apuração seguinte. Proponente sem portaria vigente e sem intenção de inscrever: oferecer elaboração. Município sem setor de cultura e sem PNAB está fora.",
    "Vedações: patrocínio não devolve dinheiro ao patrocinador; devolve dedução e contrapartidas de imagem. Pedido de retorno financeiro ou vantagem ao patrocinador é vedado (Lei 8.313/1991, art. 23). Vínculo entre patrocinador e proponente (sócios, parentes até 3º grau, empresas com sócios comuns) bloqueia a combinação (art. 27); o lead pode seguir com outro projeto.",
    "Operação: a Prospekto assume termo, recibo, prestação de contas e contrapartidas; o patrocinador deposita na conta vinculada do projeto e o contador lança a dedução no DARF e na ECF. A remuneração de captação sai do orçamento do projeto, dentro do limite legal; o patrocinador não paga nada à Prospekto. Pessoa física deposita até o último dia útil bancário de dezembro.",
    "Objeções e resposta curta: 'vai dar problema com a Receita' (é dedução prevista em lei, com conta vinculada, depósito identificado e recibo oficial); 'é coisa de grande empresa' (mais de 6,2 mil CNPJs patrocinaram em 2025, a maior parte do valor vem fora das 10 maiores); 'é gasto' (é parte do IRPJ que já seria pago, dentro do limite); 'meu contador nunca falou disso' (menos de 3% das empresas no lucro real usam; a Prospekto trabalha com o escritório da empresa); 'Rouanet é polêmica' (projeto regional, visível, com prestação de contas pública; a empresa escolhe o projeto); 'já patrocino esporte ou FIA' (tetos separados); 'prefiro apoiar a entidade que já apoio' (possível se ela tiver projeto aprovado; atenção ao vínculo do art. 27); 'estamos com prejuízo' (sem IRPJ não há dedução; voltar no próximo período); 'a LC 224 tirou o sentido' (o limite passa a 3,6%; o valor absoluto continua relevante); 'quero retorno financeiro' (vedado; o retorno é dedução e imagem); 'deu trabalho com outro consultor' (a Prospekto opera tudo); 'quanto vocês cobram de mim' (nada do patrocinador).",
    "Contadores: não pedimos a lista de clientes; o escritório faz a triagem e apresenta quem quiser; o incentivador de boa-fé mantém a dedução mesmo se o projeto falhar na prestação de contas; a Prospekto manda a atualização normativa resumida.",
    "Tom: direto, cordial, sem jargão, sem superlativos; frases curtas. Nunca inventar fato, número, nome ou data que não esteja nos dados; quando faltar, dizer 'não informado'.",
  ].join("\n");
}

// O que qualquer agente futuro (voz, WhatsApp) devolve ao CRM depois de uma conversa de
// qualificação (ADR-003, 10.3). Hoje nenhum recurso o produz; o tipo fixa o contrato.
export type QualificationOutcome = {
  perguntas_respondidas: { pergunta: string; resposta: string }[];
  campos_extraidos: Record<string, unknown>;
  horario_escolhido: string | null; // ISO de um dos horários propostos
  encaminhar_para_pessoa: boolean;
};
