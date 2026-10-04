// Mapeamento puro do resultado do simulador para a tela (src/components/simulator/view-model.ts):
// estados da tela 3, número grande com e sem a LC 224, faixas, WhatsApp e analytics só com faixas e
// tipos (nunca o valor exato), resumo do e-mail e link do diagnóstico.
import { describe, expect, it } from "vitest";
import {
  bandLabel,
  bandOptions,
  comparisonTabs,
  diagnosticHref,
  disqualifiedReason,
  emailSummary,
  exampleLabel,
  formatIsoDate,
  headline,
  noticeKeys,
  summaryAnalyticsProps,
  summaryScreen,
  taxpayerTypeFromQuery,
  whatsappMessage,
} from "@/components/simulator/view-model";
import { sanitizeProps } from "@/lib/analytics";
import { renderTemplate } from "@/lib/email/templates";
import { parseSimulatorInput, simulate, type SimulatorInput } from "@/lib/simulator";
import {
  apuracaoFor,
  leadAttributes,
  leadBand,
  leadTags,
  simulationSummaryForCrm,
} from "@/lib/validation/forms/simulator";

const NOW = new Date("2026-10-04T12:00:00Z");

function run(raw: Record<string, unknown>) {
  const parsed = parseSimulatorInput(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return { input: parsed.input, result: simulate(parsed.input, undefined, { now: NOW }) };
}

const pj = (extra: Record<string, unknown> = {}) =>
  run({
    taxpayer_type: "pj",
    regime: "lucro_real",
    input_mode: "tax_due",
    tax_due: 500000,
    ...extra,
  });
const pf = (extra: Record<string, unknown> = {}) =>
  run({
    taxpayer_type: "pf",
    declaration_model: "completa",
    input_mode: "tax_due",
    tax_due: 20000,
    ...extra,
  });

describe("tela 3: estado e número grande", () => {
  it("PJ no lucro real mostra a cesta com a LC 224 e o valor sem a redução logo abaixo", () => {
    const { result } = pj();
    expect(summaryScreen(result)).toBe("number");
    const head = headline(result);
    expect(head?.value).toBe("Até R$ 18.000,00");
    expect(head?.caption).toContain("3,6% com a LC 224/2025");
    expect(head?.secondary).toContain("R$ 20.000,00 sem a redução da LC 224/2025");
    expect(head?.lines[0]).toContain("Custo líquido: zero");
    expect(head?.lines[1]).toContain("até R$ 45.000,00");
  });

  it("PJ sem a LC 224 não mostra a linha secundária", () => {
    const { result } = pj({ apply_lc224: false });
    const head = headline(result);
    expect(head?.value).toBe("Até R$ 20.000,00");
    expect(head?.secondary).toBeNull();
  });

  it("PF mostra 6% do imposto de renda e só uma linha de contexto", () => {
    const { result } = pf();
    const head = headline(result);
    expect(head?.value).toBe("Até R$ 1.200,00");
    expect(head?.caption).toContain("do seu imposto de renda");
    expect(head?.lines).toHaveLength(1);
  });

  it("faixa escolhida vira intervalo; faixa nao_sei vira tabela de exemplos", () => {
    const band = pj({ input_mode: "tax_band", tax_band: "100k_500k" });
    expect(summaryScreen(band.result)).toBe("range");
    expect(headline(band.result)?.value).toMatch(/^Entre R\$ .* e R\$ /);
    const unknown = pj({ input_mode: "tax_band", tax_band: "nao_sei" });
    expect(summaryScreen(unknown.result)).toBe("examples");
    expect(headline(unknown.result)).toBeNull();
  });

  it("estados especiais substituem o número: disqualified e no_tax", () => {
    const presumido = pj({ regime: "lucro_presumido" });
    expect(summaryScreen(presumido.result)).toBe("disqualified");
    expect(headline(presumido.result)).toBeNull();
    expect(disqualifiedReason(presumido.input, presumido.result)).toBe("presumido");
    const simples = pj({ regime: "simples_nacional" });
    expect(disqualifiedReason(simples.input, simples.result)).toBe("simples");
    const zero = pj({ tax_due: 0 });
    expect(summaryScreen(zero.result)).toBe("no_tax");
    expect(disqualifiedReason(zero.input, zero.result)).toBe("no_tax");
    const simplificada = pf({ declaration_model: "simplificada" });
    expect(disqualifiedReason(simplificada.input, simplificada.result)).toBe("simplificada");
    expect(disqualifiedReason(pj().input, pj().result)).toBeNull();
  });

  it("regime ou modelo nao_sei vira aviso amarelo", () => {
    expect(noticeKeys(pj({ regime: "nao_sei" }).result)).toEqual(["unknown_regime"]);
    expect(noticeKeys(pf({ declaration_model: "nao_sei" }).result)).toEqual(["unknown_model"]);
    expect(noticeKeys(pj().result)).toEqual([]);
  });
});

describe("faixas, WhatsApp e analytics sem valor exato", () => {
  it("rótulos de faixa em reais e opções por tipo", () => {
    expect(bandLabel("pj", "ate_100k")).toBe("até R$ 100.000,00");
    expect(bandLabel("pj", "acima_2500k")).toBe("acima de R$ 2.500.000,00");
    expect(bandLabel("pf", "20k_80k")).toBe("de R$ 20.000,00 a R$ 80.000,00");
    expect(bandLabel("pf", "nao_sei")).toBe("Não sei");
    expect(bandOptions("pj").map((o) => o.value)).toEqual([
      "ate_100k",
      "100k_500k",
      "500k_2500k",
      "acima_2500k",
      "nao_sei",
    ]);
  });

  it("mensagem de WhatsApp leva a faixa, nunca o valor informado", () => {
    const { input, result } = pj({ tax_due: 123456 });
    const message = whatsappMessage(input, result);
    expect(message).toContain("Olá, Daniela");
    expect(message).toContain("de R$ 100.000,00 a R$ 500.000,00");
    expect(message).not.toContain("123.456");
    expect(message).not.toContain("123456");
    const disq = pj({ regime: "lucro_presumido", tax_due: 123456 });
    expect(whatsappMessage(disq.input, disq.result)).toContain("não é do lucro real");
    const person = pf({ tax_due: 50000 });
    expect(whatsappMessage(person.input, person.result)).toContain("pessoa física");
    expect(whatsappMessage(person.input, person.result)).not.toContain("50.000");
  });

  it("propriedades de simulator_summary_view passam pelo filtro do analytics e só têm faixas", () => {
    const { input, result } = pj({ tax_due: 123456 });
    const props = sanitizeProps(summaryAnalyticsProps(input, result));
    expect(props).toMatchObject({
      taxpayer_type: "pj",
      regime: "lucro_real",
      tax_band: "100k_500k",
      status: "ok",
    });
    expect(JSON.stringify(props)).not.toContain("123456");
  });
});

describe("tela 4: abas da comparação, exemplos e diagnóstico", () => {
  it("abas por mecanismo: art. 18, 1º-A, art. 26 patrocínio e doação; LIC-RS quando houver", () => {
    expect(comparisonTabs(pj().result)).toEqual([
      "rouanet_art18",
      "audiovisual_art1A",
      "rouanet_art26_patrocinio",
      "rouanet_art26_doacao",
    ]);
    const lic = pj({
      icms_contributor_rs: "sim",
      icms_prior_year: 300000,
      lic_rs_segment: "demais_editais",
    });
    expect(comparisonTabs(lic.result)).toContain("lic_rs");
    const presumido = pj({
      regime: "lucro_presumido",
      icms_contributor_rs: "sim",
      icms_prior_year: 300000,
    });
    expect(comparisonTabs(presumido.result)).toEqual(["lic_rs"]);
  });

  it("rótulos das colunas de exemplos e datas", () => {
    expect(exampleLabel("ir_devido")).toBe("Imposto devido");
    expect(exampleLabel("chave_nova")).toBe("chave nova");
    expect(formatIsoDate("2026-10-03")).toBe("03/10/2026");
  });

  it("link do diagnóstico leva só tipo e simulation_id; nenhum dado pessoal na URL", () => {
    const href = diagnosticHref("pj", "11111111-1111-4111-8111-111111111111");
    const url = new URL(href, "http://localhost");
    expect(url.pathname).toBe("/diagnostico");
    expect(url.searchParams.get("tipo")).toBe("PJ");
    expect(url.searchParams.get("simulation_id")).toBe("11111111-1111-4111-8111-111111111111");
    expect([...url.searchParams.keys()].sort()).toEqual(["simulation_id", "tipo"]);
    expect(href).not.toMatch(/nome|email|telefone|cidade|empresa|cargo/);
    expect(diagnosticHref("pf", null)).toBe("/diagnostico?tipo=PF");
  });

  it("tipo de contribuinte vindo da query (/simulador?tipo=PF) sem distinção de maiúsculas", () => {
    expect(taxpayerTypeFromQuery("?tipo=PF")).toBe("pf");
    expect(taxpayerTypeFromQuery("?tipo=pj&utm_source=x")).toBe("pj");
    expect(taxpayerTypeFromQuery("?tipo=empresa")).toBeNull();
    expect(taxpayerTypeFromQuery("")).toBeNull();
  });
});

describe("e-mail e mapeamento do lead", () => {
  it("resumo do e-mail traz o limite por mecanismo e os dois cenários da LC 224", () => {
    const { amountPhrase, summaryLines } = emailSummary(pj().result);
    expect(amountPhrase).toBe("até R$ 18.000,00");
    expect(summaryLines.some((l) => l.startsWith("Rouanet art. 18: teto de R$ 18.000,00"))).toBe(
      true,
    );
    expect(summaryLines.at(-1)).toContain("sem a redução: R$ 20.000,00");
    const disq = emailSummary(pj({ regime: "simples_nacional" }).result);
    expect(disq.amountPhrase).toBeNull();
    expect(disq.summaryLines[0]).toContain("lucro real");
  });

  it("assunto do e-mail com faixa, faixa sem teto e sem limite fica gramatical", () => {
    const band = emailSummary(pj({ input_mode: "tax_band", tax_band: "500k_2500k" }).result);
    expect(band.amountPhrase).toMatch(/^entre R\$ .+ e R\$ /);
    const open = emailSummary(pj({ input_mode: "tax_band", tax_band: "acima_2500k" }).result);
    expect(open.amountPhrase).toMatch(/^acima de R\$ /);
    for (const phrase of [band.amountPhrase, open.amountPhrase]) {
      expect(phrase).not.toMatch(/até (entre|acima)/);
    }
    const subject = (phrase: string | null) =>
      renderTemplate(
        "simulador",
        { name: "Maria", actionLabel: "simulou", sentAt: NOW, marketing: false },
        { amountPhrase: phrase, summaryLines: [] },
      ).subject;
    expect(subject(band.amountPhrase)).toBe(`Sua simulação: ${band.amountPhrase} para cultura`);
    expect(subject(null)).toBe("Sua simulação: outras formas de apoiar cultura");
  });

  it("faixa, apuração, tags e atributos por tipo", () => {
    const quarterly = pj({
      input_mode: "taxable_profit",
      taxable_profit: 1000000,
      period: "quarterly",
    });
    expect(leadBand(quarterly.input, quarterly.result)).toBe("100k_500k");
    expect(apuracaoFor(quarterly.input)).toBe("trimestral");
    const attrs = leadAttributes(
      { empresa: "Vinícola", cargo: "financeiro", contador_escritorio: "Escritório" },
      quarterly.input,
      quarterly.result,
    );
    expect(attrs).toEqual({
      empresa: "Vinícola",
      cargo: "financeiro",
      regime_tributario: "lucro_real",
      irpj_faixa: "100k_500k",
      apuracao: "trimestral",
      contador_escritorio: "Escritório",
    });
    expect(leadTags(quarterly.result)).toEqual([]);
    expect(leadTags(pj({ regime: "lucro_arbitrado" }).result)).toEqual(["desqualificado_rouanet"]);
    expect(leadTags(pj({ tax_due: 0 }).result)).toEqual(["sem_irpj"]);
    expect(leadTags(pf({ declaration_model: "simplificada" }).result)).toEqual([]);

    const person = pf({ tax_due: 90000 });
    expect(
      leadAttributes({ contador_escritorio: "Contadora" }, person.input, person.result),
    ).toEqual({
      modelo_declaracao: "completa",
      ir_devido_faixa: "acima_80k",
      contador_declaracao: "Contadora",
    });
    const summary = simulationSummaryForCrm(person.input, person.result);
    expect(summary).toMatchObject({ taxpayer_type: "pf", tax_band: "acima_80k", status: "ok" });
    expect(JSON.stringify(summary)).not.toContain("90000");
  });

  it("entrada só com faixa grava a faixa informada", () => {
    const input: SimulatorInput = pj({ input_mode: "tax_band", tax_band: "acima_2500k" }).input;
    const result = simulate(input, undefined, { now: NOW });
    expect(leadBand(input, result)).toBe("acima_2500k");
  });
});
