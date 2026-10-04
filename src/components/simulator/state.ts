// Estado do gate do simulador devolvido pela Server Action submitSimulatorLead ao useActionState
// (src/actions/simulator.ts). Fica fora do arquivo "use server" porque módulos de Server Action só
// exportam funções assíncronas. Também é o contrato da tela 4 (resultado detalhado), usada após o
// gate e por /simulador/resultado/[token].
import type { SimulatorInput, SimulatorResult } from "@/lib/simulator";

export type SimulatorGateInfo = {
  nome: string;
  email: string;
  empresa?: string;
  cargo?: string;
  cidade: string;
  uf: string;
  telefone?: string;
  contador_escritorio?: string;
};

export type SimulatorDetailData = {
  input: SimulatorInput;
  result: SimulatorResult;
  // ISO 8601; data da simulação no cabeçalho da tela 4.
  createdAt: string;
  // "Simulação de [Empresa ou Nome]".
  subject: string;
  simulationId: string | null;
  // Link /simulador/resultado/[token], quando a simulação foi gravada.
  resultUrl: string | null;
  // Dados do gate para pré-preencher /diagnostico; null quando a tela vem de um link.
  gate: SimulatorGateInfo | null;
};

// saved: lead criado ou atualizado e simulação gravada; deduplicated: reenvio em 10 minutos (R-2),
// simulação gravada, sem novo e-mail; lead_save_failed: erro ao gravar (spec, seção 8), detalhe
// mostrado mesmo assim; discarded: antispam (honeypot ou envio rápido), nada gravado.
export type SimulatorGateOutcome = "saved" | "deduplicated" | "lead_save_failed" | "discarded";

export type SimulatorGateState =
  | { status: "idle" }
  | {
      status: "error";
      errorCode: "validation" | "token" | "rate_limited" | "storage";
      message: string;
      fieldErrors?: Record<string, string>;
      values?: Record<string, string>;
    }
  | {
      status: "success";
      detail: SimulatorDetailData;
      outcome: SimulatorGateOutcome;
      // E-mail para a mensagem "Resultado enviado para [e-mail]"; null quando nada foi enviado.
      emailTo: string | null;
    };

export const initialSimulatorGateState: SimulatorGateState = { status: "idle" };
