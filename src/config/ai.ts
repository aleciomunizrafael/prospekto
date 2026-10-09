// Parâmetros da IA no CRM (ADR-003, seções 7 e 9; ia-plano.md, decisão P8). Só constantes puras:
// nada daqui lê variável de ambiente (isso fica em src/env.ts e src/lib/ai/client.ts).

// Modelo padrão da Claude API; `AI_MODEL` troca sem deploy de código.
export const AI_DEFAULT_MODEL = "claude-opus-5-5";

// Teto de execuções por tenant por dia civil em America/Sao_Paulo (controle de custo).
export const AI_DAILY_LIMIT = 200;

// Cabe a maior saída estruturada mais o pensamento, que conta em max_tokens mesmo sem ser devolvido.
export const AI_MAX_TOKENS = 4000;

export const AI_TIMEZONE = "America/Sao_Paulo";

// Janelas em que a Daniela aceita reunião (dias ISO 1 = segunda … 5 = sexta; horas locais).
export const AI_MEETING_WINDOWS = [
  { days: [1, 2, 3, 4, 5], start: "09:00", end: "11:30" },
  { days: [1, 2, 3, 4, 5], start: "14:00", end: "17:00" },
] as const;

export const AI_SLOT_MINUTES = 30;

// Primeiro horário proposto a partir do próximo dia útil (nunca hoje).
export const AI_SLOT_LEAD_BUSINESS_DAYS = 1;
