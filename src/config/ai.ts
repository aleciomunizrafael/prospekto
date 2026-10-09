// Parâmetros da IA no CRM (ADR-003, seções 7 e 9; ia-plano.md, decisão P8). Só constantes puras:
// nada daqui lê variável de ambiente (isso fica em src/env.ts e src/lib/ai/client.ts).

// Modelo padrão da Claude API; `AI_MODEL` troca sem deploy de código.
export const AI_DEFAULT_MODEL = "claude-opus-5-5";

// Teto de execuções por tenant por dia civil em America/Sao_Paulo (controle de custo).
export const AI_DAILY_LIMIT = 200;

// Teto, não alvo: o gasto é governado por effort e pelo teto diário, não por este valor. O
// pensamento do Opus 5.5 conta em max_tokens mesmo sem ser devolvido e é maior por turno que no
// Opus 5 (claude-api, shared/model-migration.md): com 4000, um lead de histórico cheio (até 20
// atividades no briefing) estourava o teto antes do JSON, a saída inteira era cobrada e a tela só
// dizia "incompleta". 8.000 cobre o pensamento e a maior saída estruturada (briefing, ~900 tokens);
// acima disso AI_DEADLINE_MS tende a cortar antes. Como o cliente fixa `timeout`, o SDK não
// recalcula o prazo a partir de max_tokens (resources/beta/messages/messages.js, `timeout == null`).
export const AI_MAX_TOKENS = 8_000;

// Prazo total de uma chamada ao modelo, somando todas as tentativas do SDK (AbortSignal.timeout em
// runStructured) e também o timeout de cada tentativa. Precisa ficar abaixo do `maxDuration = 60`
// da página do lead, que vale para as Server Actions usadas nela, com folga para carregar os dados
// antes e gravar ai_runs depois: se o Vercel matasse a função, a execução não seria registrada e a
// pessoa veria a página de erro genérica em vez da mensagem do cartão.
export const AI_DEADLINE_MS = 50_000;

export const AI_TIMEZONE = "America/Sao_Paulo";

// Janelas em que a Daniela aceita reunião (dias ISO 1 = segunda … 5 = sexta; horas locais).
export const AI_MEETING_WINDOWS = [
  { days: [1, 2, 3, 4, 5], start: "09:00", end: "11:30" },
  { days: [1, 2, 3, 4, 5], start: "14:00", end: "17:00" },
] as const;

export const AI_SLOT_MINUTES = 30;

// Primeiro horário proposto a partir do próximo dia útil (nunca hoje).
export const AI_SLOT_LEAD_BUSINESS_DAYS = 1;
