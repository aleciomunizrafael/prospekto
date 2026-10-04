// Gate do simulador (simulador-spec.md, seção 6; estrutura-e-copy.md, seção 5.3): campos por tipo
// de contribuinte, validação Zod e mapeamento para o lead (segmento, interesse, atributos e tags).
// Não entra no registro FORMS: a Server Action é própria (src/actions/simulator.ts), porque o gate
// devolve o resultado detalhado em vez de redirecionar.
// A faixa (irpj_faixa, ir_devido_faixa) é derivada do valor informado; o valor exato fica só em
// simulations.inputs.
import { z } from "zod";
import type { LeadInterest, LeadSegment, Uf } from "@/lib/domain/enums";
import type { EmailTemplateData } from "@/lib/email/templates";
import {
  bandFor,
  type SimulatorInput,
  type SimulatorResult,
  type TaxpayerType,
} from "@/lib/simulator";
import {
  cityField,
  consentFields,
  emailField,
  hiddenFields,
  nameField,
  optionalText,
  phoneField,
  ufField,
} from "./common";

export const SIMULATOR_FORM_IDS = { pj: "simulator_pj", pf: "simulator_pf" } as const;
export type SimulatorFormId = (typeof SIMULATOR_FORM_IDS)[TaxpayerType];

export const CARGO_OPTIONS = [
  { value: "dono_ou_socio", label: "Dono ou sócio" },
  { value: "financeiro", label: "Financeiro" },
  { value: "contabilidade", label: "Contabilidade" },
  { value: "marketing_esg", label: "Marketing ou ESG" },
  { value: "outro", label: "Outro" },
] as const;

const CARGO_VALUES = CARGO_OPTIONS.map((o) => o.value) as [string, ...string[]];

// Entrada do simulador serializada em JSON pelo cliente (validada de novo com parseSimulatorInput
// na Server Action; o tamanho limita abuso, não o conteúdo).
const simulatorInputField = z
  .string({ error: "Refaça a simulação antes de pedir o detalhe." })
  .min(2, { error: "Refaça a simulação antes de pedir o detalhe." })
  .max(4000, { error: "Refaça a simulação antes de pedir o detalhe." });

const gateCommon = {
  ...hiddenFields,
  nome: nameField,
  email: emailField,
  cidade: cityField,
  uf: ufField,
  telefone: phoneField,
  contador_escritorio: optionalText(2, 120, "O nome do escritório ou contador"),
  ...consentFields,
  simulator_input: simulatorInputField,
};

export const simulatorGatePjSchema = z.object({
  ...gateCommon,
  empresa: z
    .string({ error: "Informe o nome da empresa." })
    .trim()
    .min(2, { error: "Informe o nome da empresa (pelo menos 2 letras)." })
    .max(120, { error: "O nome da empresa pode ter até 120 caracteres." }),
  cargo: z.enum(CARGO_VALUES, { error: "Escolha o seu papel na empresa." }),
});

export const simulatorGatePfSchema = z.object(gateCommon);

export type SimulatorGatePj = z.output<typeof simulatorGatePjSchema>;
export type SimulatorGatePf = z.output<typeof simulatorGatePfSchema>;
export type SimulatorGate = SimulatorGatePj | SimulatorGatePf;

export function gateSchemaFor(type: TaxpayerType) {
  return type === "pj" ? simulatorGatePjSchema : simulatorGatePfSchema;
}

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

export type SimulatorLeadDraft = {
  segment: LeadSegment;
  interest: LeadInterest;
  source: "simulador";
  sourceDetail: string;
  name: string;
  email: string;
  phone?: string;
  city: string;
  uf: Uf;
  tags: string[];
  attributes: Record<string, unknown>;
  consentMarketing: boolean;
  // Vai para activities.formulario e para o aviso interno: faixas, nunca o valor exato.
  formData: Record<string, unknown>;
  actionLabel: string;
  emailTemplate: { id: "simulador"; data: EmailTemplateData["simulador"] };
};

// Faixa gravada no lead: a derivada pelo cálculo ou, sem cálculo, a faixa informada; `nao_sei`
// quando não há como saber (desqualificado sem valor, imposto zero).
export function leadBand(input: SimulatorInput, result: SimulatorResult): string {
  if (result.band) return result.band;
  if (input.input_mode === "tax_band" && input.tax_band) return input.tax_band;
  if (input.input_mode === "tax_due" && input.tax_due != null) {
    return bandFor(input.taxpayer_type, input.tax_due);
  }
  return "nao_sei";
}

export function apuracaoFor(input: SimulatorInput): "anual" | "trimestral" | "nao_sei" {
  if (input.taxpayer_type !== "pj") return "nao_sei";
  if (input.period === "quarterly") return "trimestral";
  if (input.period === "annual") return "anual";
  return "nao_sei";
}

// Tags do gate (spec, seções 6 e 8): regime inelegível e imposto zero.
export function leadTags(result: SimulatorResult): string[] {
  const tags: string[] = [];
  if (result.status === "disqualified" && result.disqualified?.reason === "regime") {
    tags.push("desqualificado_rouanet");
  }
  if (result.status === "no_tax") tags.push("sem_irpj");
  return tags;
}

export type GateAttributeSource = {
  empresa?: string;
  cargo?: string;
  contador_escritorio?: string;
};

export function leadAttributes(
  gate: GateAttributeSource,
  input: SimulatorInput,
  result: SimulatorResult,
): Record<string, unknown> {
  const band = leadBand(input, result);
  if (input.taxpayer_type === "pj") {
    const attributes: Record<string, unknown> = {
      empresa: gate.empresa ?? "",
      cargo: gate.cargo ?? "outro",
      regime_tributario: input.regime,
      irpj_faixa: band,
      apuracao: apuracaoFor(input),
    };
    if (gate.contador_escritorio) attributes.contador_escritorio = gate.contador_escritorio;
    if (input.icms_contributor_rs === "sim") attributes.contribuinte_icms_rs = true;
    if (input.icms_contributor_rs === "nao") attributes.contribuinte_icms_rs = false;
    return attributes;
  }
  const attributes: Record<string, unknown> = {
    modelo_declaracao: input.declaration_model,
    ir_devido_faixa: band,
  };
  if (gate.contador_escritorio) attributes.contador_declaracao = gate.contador_escritorio;
  return attributes;
}

// Resumo da simulação para activities.formulario e para o aviso interno: só faixas e tipos.
export function simulationSummaryForCrm(
  input: SimulatorInput,
  result: SimulatorResult,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    taxpayer_type: input.taxpayer_type,
    input_mode: input.input_mode,
    tax_band: leadBand(input, result),
    status: result.status,
    interest: result.interest,
    featured_mechanism: result.featured_mechanism,
    apply_lc224: result.lc224.applied,
    parameters_version: result.parameters_version,
  };
  if (input.taxpayer_type === "pj") {
    base.regime = input.regime;
    base.period = input.period ?? null;
    base.icms_contributor_rs = input.icms_contributor_rs ?? null;
    base.lic_rs_segment = input.lic_rs_segment ?? null;
  } else {
    base.declaration_model = input.declaration_model;
    base.includes_sport = input.includes_sport ?? false;
  }
  base.contribution_type = result.contribution_type;
  return base;
}

export function buildSimulatorLeadDraft(args: {
  gate: SimulatorGate;
  input: SimulatorInput;
  result: SimulatorResult;
  sourcePage: string;
  email: EmailTemplateData["simulador"];
}): SimulatorLeadDraft {
  const { gate, input, result } = args;
  const pj = input.taxpayer_type === "pj" ? (gate as SimulatorGatePj) : null;
  return {
    segment: input.taxpayer_type === "pj" ? "PJ" : "PF",
    interest: result.interest,
    source: "simulador",
    sourceDetail: args.sourcePage || "/simulador",
    name: gate.nome,
    email: gate.email,
    phone: gate.telefone,
    city: gate.cidade,
    uf: gate.uf,
    tags: leadTags(result),
    attributes: leadAttributes(gate, input, result),
    consentMarketing: gate.consent_marketing,
    formData: {
      form_id: SIMULATOR_FORM_IDS[input.taxpayer_type],
      nome: gate.nome,
      email: gate.email,
      telefone: gate.telefone ?? "",
      empresa: pj?.empresa ?? "",
      cargo: pj?.cargo ?? "",
      cidade: gate.cidade,
      uf: gate.uf,
      contador_escritorio: gate.contador_escritorio ?? "",
      consent_marketing: gate.consent_marketing,
      simulacao: simulationSummaryForCrm(input, result),
      source_page: gate.source_page,
      utm_source: gate.utm_source,
      utm_medium: gate.utm_medium,
      utm_campaign: gate.utm_campaign,
    },
    actionLabel: "fez uma simulação de incentivo fiscal no site da Prospekto",
    emailTemplate: { id: "simulador", data: args.email },
  };
}
