// Listas e rótulos do formulário simulator, sem zod: os componentes "use client" importam daqui para o
// pacote zod não ir ao navegador (tests/lint.test.ts); o schema em simulator.ts importa e reexporta.
import type { TaxpayerType } from "@/lib/simulator";

export const SIMULATOR_FORM_IDS = { pj: "simulator_pj", pf: "simulator_pf" } as const;
export type SimulatorFormId = (typeof SIMULATOR_FORM_IDS)[TaxpayerType];

export const CARGO_OPTIONS = [
  { value: "dono_ou_socio", label: "Dono ou sócio" },
  { value: "financeiro", label: "Financeiro" },
  { value: "contabilidade", label: "Contabilidade" },
  { value: "marketing_esg", label: "Marketing ou ESG" },
  { value: "outro", label: "Outro" },
] as const;

// Rótulos para o resumo de erros (ErrorSummary).
export const SIMULATOR_GATE_LABELS: Record<string, string> = {
  nome: "Nome",
  email: "E-mail",
  empresa: "Empresa",
  cargo: "Papel na empresa",
  cidade: "Cidade",
  uf: "UF",
  telefone: "Telefone",
  contador_escritorio: "Escritório contábil",
  consent_lgpd: "Autorização de contato",
  consent_marketing: "Materiais da Prospekto",
  simulator_input: "Simulação",
};
