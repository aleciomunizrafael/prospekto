// Mapeamento puro do resultado do simulador para a tela (simulador-spec.md, seções 5, 8 e 10;
// estrutura-e-copy.md, seções 9.2 e 10.1). Sem React, sem Next: testado em tests/simulator-ui.test.ts.
// Nada daqui envia valor exato ao analytics ou ao WhatsApp: só faixas e tipos.
import { site } from "@/config/site";
import type { AnalyticsProps } from "@/lib/analytics";
import {
  MECHANISM_LABELS,
  PF_TAX_BANDS,
  PJ_TAX_BANDS,
  bandRange,
  formatBRL,
  formatPercent,
  formatRange,
  renderText,
  type MoneyRange,
  type PfTaxBand,
  type PjTaxBand,
  type SimulatorInput,
  type SimulatorMechanismKey,
  type SimulatorResult,
  type TaxpayerType,
  type TextKey,
} from "@/lib/simulator";

export const LC224_LABEL = "LC 224/2025";

// Rótulo humano de uma faixa de imposto ("até R$ 100.000,00"; "não sei").
export function bandLabel(type: TaxpayerType, code: string): string {
  if (code === "nao_sei") return "Não sei";
  const range = bandRange(type, code);
  if (!range) return code;
  if (range.max === null) return `acima de ${formatBRL(range.min)}`;
  // A primeira faixa começa em um centavo: "até R$ X".
  if (range.min <= 1) return `até ${formatBRL(range.max)}`;
  return `de ${formatBRL(range.min)} a ${formatBRL(range.max)}`;
}

export function bandOptions(type: TaxpayerType): Array<{ value: string; label: string }> {
  const codes: readonly string[] = type === "pj" ? PJ_TAX_BANDS : PF_TAX_BANDS;
  return codes.map((code) => ({ value: code, label: bandLabel(type, code) }));
}

// Faixa do resultado para o WhatsApp e o analytics: a derivada ou a informada; nunca o valor.
export function resultBand(input: SimulatorInput, result: SimulatorResult): string {
  if (result.band) return result.band;
  if (input.input_mode === "tax_band" && input.tax_band) return input.tax_band;
  return "nao_sei";
}

export type SummaryScreen = "number" | "range" | "disqualified" | "no_tax" | "examples";

// Qual bloco a tela 3 mostra no lugar do número grande (spec, seções 5.1 e 8).
export function summaryScreen(result: SimulatorResult): SummaryScreen {
  if (result.status === "disqualified") return "disqualified";
  if (result.status === "no_tax") return "no_tax";
  if (result.status === "band_only") return result.examples ? "examples" : "range";
  return "number";
}

export type Headline = {
  // "Até R$ 18.000,00" ou "Entre R$ X e R$ Y".
  value: string;
  caption: string;
  // PJ com LC 224 aplicada: o valor sem a redução, logo abaixo.
  secondary: string | null;
  lines: string[];
};

function upToRange(range: MoneyRange): string {
  if (range.max === null) return `Acima de ${formatBRL(range.min)}`;
  if (range.min === range.max) return `Até ${formatBRL(range.max)}`;
  return `Entre ${formatBRL(range.min)} e ${formatBRL(range.max)}`;
}

// Número grande e legendas do resultado resumido (spec, 5.1 e tela 3).
export function headline(result: SimulatorResult): Headline | null {
  if (!result.limits) return null;
  const pj = result.taxpayer_type === "pj";
  const basket = result.limits.cultural_basket;
  const percent = formatPercent(
    result.limits.groups.find((g) => g.key === (pj ? "cesta_cultural_pj" : "cesta_pf"))
      ?.effective_percent ?? (pj ? 4 : 6),
  );
  const lines = [
    "Dedução de 100% do aporte no art. 18 da Lei Rouanet e no art. 1º-A da Lei do Audiovisual, dentro do teto. Custo líquido: zero.",
  ];
  if (pj) {
    const total = upToRange(result.limits.total);
    lines.push(
      `Somando esporte, fundos da criança e do idoso, Pronon e Pronas, ${total.charAt(0).toLowerCase()}${total.slice(1)} do IRPJ pode ter outro destino.`,
    );
  }
  if (pj && result.lc224.applied && result.scenarios) {
    const without = result.scenarios.without_lc224.cultural_basket;
    return {
      value: upToRange(basket),
      caption: `do IRPJ da sua empresa podem ir para projetos culturais (${percent} com a ${LC224_LABEL}).`,
      secondary: `${formatRange(without)} sem a redução da ${LC224_LABEL} [verificar]`,
      lines,
    };
  }
  if (pj) {
    return {
      value: upToRange(basket),
      caption: `do IRPJ da sua empresa podem ir para projetos culturais (${percent} do imposto devido, sem a redução da ${LC224_LABEL}).`,
      secondary: null,
      lines,
    };
  }
  return {
    value: upToRange(basket),
    caption: `do seu imposto de renda podem ir para projetos culturais (${percent} do imposto devido).`,
    secondary: null,
    lines,
  };
}

// Motivo de desqualificação para o evento simulator_disqualified (estrutura-e-copy.md, 9.2).
export function disqualifiedReason(
  input: SimulatorInput,
  result: SimulatorResult,
): "presumido" | "simples" | "arbitrado" | "simplificada" | "no_tax" | null {
  if (result.status === "no_tax") return "no_tax";
  if (result.status !== "disqualified") return null;
  if (input.taxpayer_type === "pf") return "simplificada";
  if (input.regime === "lucro_presumido") return "presumido";
  if (input.regime === "simples_nacional") return "simples";
  if (input.regime === "lucro_arbitrado") return "arbitrado";
  return null;
}

// Avisos em faixa amarela da tela (spec, estados visuais): só os que não têm bloco próprio.
export function noticeKeys(result: SimulatorResult): TextKey[] {
  const keys: TextKey[] = [];
  for (const w of result.warnings) {
    if (w.code === "unknown_regime" || w.code === "unknown_model" || w.code === "params_stale") {
      if (!keys.includes(w.text_key)) keys.push(w.text_key);
    }
  }
  return keys;
}

export function warningText(result: SimulatorResult, key: TextKey): string {
  const warning = result.warnings.find((w) => w.text_key === key);
  return renderText(key, {
    atualizado_em: formatIsoDate(result.parameters_version),
    ...(warning?.vars ?? {}),
  });
}

// Propriedades do evento simulator_summary_view: tipo, regime ou modelo, faixa e mecanismos.
export function summaryAnalyticsProps(
  input: SimulatorInput,
  result: SimulatorResult,
): AnalyticsProps {
  return {
    taxpayer_type: input.taxpayer_type,
    regime: input.taxpayer_type === "pj" ? input.regime : input.declaration_model,
    tax_band: resultBand(input, result),
    mechanisms: (input.mechanisms_of_interest ?? []).join(",") || result.featured_mechanism,
    status: result.status,
  };
}

// Mensagem de WhatsApp da tela 3 (estrutura-e-copy.md, 10.1 e 5.6): com a faixa, nunca o valor.
export function whatsappMessage(input: SimulatorInput, result: SimulatorResult): string {
  const band = resultBand(input, result);
  const bandText =
    band === "nao_sei" ? "ainda sem a faixa do imposto" : bandLabel(input.taxpayer_type, band);
  if (input.taxpayer_type === "pj") {
    const base =
      band === "nao_sei"
        ? "Olá, Daniela. Acabei de simular no site da Prospekto (ainda sem a faixa do IRPJ da empresa)"
        : `Olá, Daniela. Acabei de simular no site da Prospekto: IRPJ devido da empresa na faixa ${bandText}`;
    if (result.status === "disqualified") {
      return `${base}. A empresa não é do lucro real; quero saber de outras formas de apoiar cultura.`;
    }
    return `${base}. Quero entender quanto pode ir para um projeto cultural da região e adiantar a conversa com o meu contador.`;
  }
  const base =
    band === "nao_sei"
      ? "Olá, Daniela. Acabei de simular no site da Prospekto (ainda sem a faixa do imposto)"
      : `Olá, Daniela. Acabei de simular no site da Prospekto: imposto devido na faixa ${bandText}`;
  if (result.status === "disqualified") {
    return `${base}. Declaro pelo modelo simplificado e quero entender se vale mudar para a completa.`;
  }
  return `${base}. Quero a lista de projetos que aceitam pessoa física e adiantar a conversa.`;
}

export function whatsappHref(message: string): string {
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

// "2026-10-03" -> "03/10/2026".
export function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatDateTimeBr(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

// Rótulos das colunas da tabela de exemplos (P.exemplos; chaves do JSON).
const EXAMPLE_LABELS: Record<string, string> = {
  ir_devido: "Imposto devido",
  cesta_cultural_4pct: "Cesta cultural (4%)",
  cesta_cultural_lc224: `Cesta cultural (3,6%, ${LC224_LABEL})`,
  audiovisual_art1_3pct: "Audiovisual art. 1º (3%)",
  esporte_2pct: "Esporte (2%)",
  esporte_lc224: `Esporte (1,8%, ${LC224_LABEL})`,
  fia_1pct: "FIA (1%)",
  idoso_1pct: "Fundo do Idoso (1%)",
  pronon_1pct: "Pronon (1%)",
  pronas_1pct: "Pronas (1%)",
  total_10pct: "Total (10%)",
  total_lc224_9pct: `Total (9%, ${LC224_LABEL})`,
  art26_patrocinio_aporte_para_teto: "Aporte art. 26 patrocínio para o teto",
  art26_doacao_aporte_para_teto: "Aporte art. 26 doação para o teto",
  cesta_6pct: "Cesta (6%)",
  cesta_7pct_com_esporte: "Cesta com esporte (7%)",
  aporte_art18_para_teto: "Aporte art. 18 para o teto",
  aporte_art26_doacao_para_teto: "Aporte art. 26 doação para o teto",
  aporte_art26_patrocinio_para_teto: "Aporte art. 26 patrocínio para o teto",
  audiovisual_art1_3pct_pf: "Audiovisual art. 1º (3%)",
  fia_na_declaracao_3pct: "FIA na declaração (3%)",
  idoso_na_declaracao_3pct: "Fundo do Idoso na declaração (3%)",
};

export function exampleLabel(key: string): string {
  return EXAMPLE_LABELS[key] ?? key.replace(/_/g, " ");
}

// Mecanismos com aba na comparação (tela 4, bloco 4): art. 18, 1º-A, art. 26 e LIC-RS.
export function comparisonTabs(result: SimulatorResult): SimulatorMechanismKey[] {
  const keys: SimulatorMechanismKey[] = [];
  const wanted: SimulatorMechanismKey[] = [
    "rouanet_art18",
    "audiovisual_art1A",
    "rouanet_art26_patrocinio",
    "rouanet_art26_doacao",
  ];
  const available = new Set(result.limits?.mechanisms.map((m) => m.key) ?? []);
  for (const key of wanted) if (available.has(key)) keys.push(key);
  if (result.lic_rs && result.lic_rs.status === "ok") keys.push("lic_rs");
  return keys;
}

export function mechanismShortLabel(key: SimulatorMechanismKey): string {
  switch (key) {
    case "rouanet_art18":
      return "Art. 18";
    case "audiovisual_art1A":
      return "Art. 1º-A";
    case "rouanet_art26_patrocinio":
      return "Art. 26 patrocínio";
    case "rouanet_art26_doacao":
      return "Art. 26 doação";
    case "lic_rs":
      return "LIC-RS";
    default:
      return MECHANISM_LABELS[key];
  }
}

// Resumo para o e-mail "Sua simulação" (estrutura-e-copy.md, 5.6): limite por mecanismo e, para
// PJ, os cenários com e sem a LC 224.
export function emailSummary(result: SimulatorResult): {
  amountLabel: string;
  summaryLines: string[];
} {
  const lines: string[] = [];
  if (result.status === "disqualified") {
    const reason =
      result.disqualified?.reason === "regime" ? "disqualified_regime" : "disqualified_model";
    lines.push(renderText(reason));
  }
  if (result.status === "no_tax") lines.push(renderText("no_tax"));
  if (result.status === "band_only" && result.examples) lines.push(renderText("band_examples"));
  if (result.limits) {
    for (const row of result.limits.mechanisms) {
      lines.push(`${row.name}: teto de ${formatRange(row.limit)}`);
    }
    if (result.scenarios) {
      lines.push(
        `Cesta cultural com a ${LC224_LABEL}: ${formatRange(result.scenarios.with_lc224.cultural_basket)}; sem a redução: ${formatRange(result.scenarios.without_lc224.cultural_basket)} [verificar]`,
      );
    }
  }
  if (result.lic_rs) {
    lines.push(
      result.lic_rs.status === "ok"
        ? `LIC-RS (ICMS): limite anual de ${formatBRL(result.lic_rs.annual_limit)}; repasse ao FAC de ${formatBRL(result.lic_rs.fac_transfer)}`
        : renderText("no_icms"),
    );
  }
  const amountLabel = result.limits
    ? formatRange(result.limits.cultural_basket)
    : result.lic_rs?.status === "ok"
      ? formatBRL(result.lic_rs.annual_limit)
      : "a confirmar";
  return { amountLabel, summaryLines: lines };
}

// Query do diagnóstico (tela 5): dados do gate e simulation_id.
export function diagnosticHref(
  gate: {
    nome: string;
    email: string;
    empresa?: string;
    cargo?: string;
    cidade: string;
    uf: string;
    telefone?: string;
    contador_escritorio?: string;
  } | null,
  taxpayerType: TaxpayerType,
  simulationId: string | null,
): string {
  const params = new URLSearchParams();
  params.set("tipo_pessoa", taxpayerType === "pj" ? "PJ" : "PF");
  if (gate) {
    params.set("nome", gate.nome);
    params.set("email", gate.email);
    params.set("cidade", gate.cidade);
    params.set("uf", gate.uf);
    if (gate.empresa) params.set("empresa", gate.empresa);
    if (gate.cargo) params.set("cargo", gate.cargo);
    if (gate.telefone) params.set("telefone", gate.telefone);
    if (gate.contador_escritorio) params.set("contador_escritorio", gate.contador_escritorio);
  }
  if (simulationId) params.set("simulation_id", simulationId);
  return `/diagnostico?${params.toString()}`;
}

export function projectsHref(result: SimulatorResult): string {
  const mechanism = result.featured_mechanism;
  return `/projetos?mecanismo=${encodeURIComponent(mechanism)}`;
}

export type TaxBandCode = PjTaxBand | PfTaxBand;
