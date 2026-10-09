// Redação do contexto (src/lib/ai/redact.ts): mascaramento e lista fechada de campos (ADR-003,
// seção 5). Os DTOs vêm dos repositórios contra o PGlite, como na página do lead.
import { beforeAll, describe, expect, it } from "vitest";
import {
  buildLeadContext,
  formatTodayLine,
  renderLeadContext,
  roughBRL,
  scrubText,
  type LeadContextInput,
} from "@/lib/ai/redact";
import { createActivity, listActivities } from "@/lib/repos/activities";
import { listConsents } from "@/lib/repos/consents";
import { createContribution, listContributionSummaries } from "@/lib/repos/contributions";
import type { Ctx } from "@/lib/repos/ctx";
import { createLead, getLeadDetail, type LeadDetail } from "@/lib/repos/leads";
import { createOrganization } from "@/lib/repos/organizations";
import { createProject } from "@/lib/repos/projects";
import { createSimulation, listSimulations } from "@/lib/repos/simulations";
import { consentContato, makeTenant } from "../helpers";

const EMAIL = "rodrigo.pasqualotto@example.test";
const PHONE = "+5554984032180";
const CNPJ = "55667788000186";
const CPF = "529.982.247-25";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe("scrubText", () => {
  it("mascara e-mail, telefone em três formatos, CPF e CNPJ", () => {
    const text = [
      `Falar com ${EMAIL} ou pelo (54) 98403-2180.`,
      "Alternativas: 54 98403-2180 e +55 54 98403 2180.",
      `CPF ${CPF}, CNPJ 55.667.788/0001-86 e também ${CNPJ}.`,
    ].join(" ");
    const out = scrubText(text);
    expect(out).not.toContain("example.test");
    expect(out).not.toContain("98403");
    expect(out).not.toContain("529.982");
    expect(out).not.toContain("0001-86");
    expect(out).not.toContain(CNPJ);
    expect(out.match(/\[e-mail\]/g)).toHaveLength(1);
    expect(out.match(/\[telefone\]/g)).toHaveLength(3);
    expect(out.match(/\[CPF\]/g)).toHaveLength(1);
    expect(out.match(/\[CNPJ\]/g)).toHaveLength(2);
  });

  it("preserva o CNPJ com keepCnpj e continua mascarando o resto", () => {
    const out = scrubText(`CNPJ 55.667.788/0001-86, fone 54984032180, ${EMAIL}`, {
      keepCnpj: true,
    });
    expect(out).toContain("55.667.788/0001-86");
    expect(out).toContain("[telefone]");
    expect(out).toContain("[e-mail]");
    expect(scrubText(`CNPJ ${CNPJ}`, { keepCnpj: true })).toContain(CNPJ);
  });

  it("não mexe em valores e datas comuns e corta em 8.000 caracteres", () => {
    expect(scrubText("R$ 30.000,00 em 20/10/2026, processo 2026-1234")).toBe(
      "R$ 30.000,00 em 20/10/2026, processo 2026-1234",
    );
    expect(scrubText("x".repeat(9000))).toHaveLength(8000);
  });
});

describe("formatTodayLine e roughBRL", () => {
  it("escreve o dia por extenso em São Paulo", () => {
    expect(formatTodayLine(new Date("2026-10-09T19:00:00Z"))).toBe(
      "Hoje é sexta-feira, 09/10/2026.",
    );
    // 23:30 de sexta em SP ainda é sexta.
    expect(formatTodayLine(new Date("2026-10-10T02:30:00Z"))).toBe(
      "Hoje é sexta-feira, 09/10/2026.",
    );
  });

  it("arredonda para o milhar", () => {
    expect(roughBRL(12_480)).toBe("cerca de R$ 12 mil");
    expect(roughBRL(1_250_000)).toBe("cerca de R$ 1,3 milhões");
    expect(roughBRL(900)).toBe("menos de R$ 1 mil");
    expect(roughBRL(0)).toBe("não informado");
  });
});

let ctx: Ctx;
let input: LeadContextInput;
let detail: LeadDetail;
const now = new Date("2026-10-09T19:00:00Z");

beforeAll(async () => {
  ctx = await makeTenant();
  const { lead } = await createLead(ctx, {
    segment: "PJ",
    interest: "rouanet",
    name: "Rodrigo Pasqualotto",
    email: EMAIL,
    phone: PHONE,
    city: "Garibaldi",
    uf: "RS",
    message: `Pode me ligar no (54) 98403-2180 ou escrever para ${EMAIL}. Meu CPF é ${CPF}.`,
    source: "site",
    sourceDetail: "/empresas?utm_source=linkedin&gclid=abc",
    consents: [consentContato],
    attributes: {
      empresa: "Rede Farmácias Vale",
      cnpj: CNPJ,
      regime_tributario: "lucro_real",
      contador_participa: true,
      contador_escritorio: `Contabilidade Serra (${EMAIL})`,
      vinculo_art27_checado: true,
      vinculo_art27_checado_em: "2026-10-01",
      vinculo_art27_checado_por: "Daniela",
    },
    formData: { empresa: "Rede Farmácias Vale" },
  });
  // 25 atividades de contato (limite 20), uma antiga, uma de sistema e um download.
  for (let i = 0; i < 25; i++) {
    await createActivity(ctx, {
      type: i % 2 ? "ligacao" : "nota",
      subject: `Conversa ${i} com ${EMAIL}`,
      body: `${"Detalhe da conversa. ".repeat(60)} telefone ${PHONE}`,
      leadId: lead.id,
      occurredAt: new Date(now.getTime() - (i + 1) * 60 * 60_000),
    });
  }
  await createActivity(ctx, {
    type: "reuniao",
    subject: "Reunião antiga",
    leadId: lead.id,
    occurredAt: new Date(now.getTime() - 200 * 24 * 60 * 60_000),
  });
  await createActivity(ctx, {
    type: "download",
    subject: "Guia baixado",
    leadId: lead.id,
    occurredAt: new Date(now.getTime() - 2 * 60 * 60_000),
  });
  await createActivity(ctx, {
    type: "tarefa",
    subject: "Reenviar material LIC-RS",
    leadId: lead.id,
    dueAt: new Date("2026-10-03T10:00:00Z"),
    occurredAt: new Date(now.getTime() - 30 * 60_000),
  });
  await createSimulation(ctx, {
    leadId: lead.id,
    kind: "pj",
    inputs: { tax_due: 500000, tax_band: "500k_2500k" },
    outputs: {
      status: "ok",
      featured_mechanism: "rouanet_18",
      comparison: { mechanism_name: "Lei Rouanet, art. 18", amount: 18000 },
      limits: { cultural_basket: { min: 18000, max: 20000 } },
    },
    parametersVersion: "2026-10-03",
    applyLc224: true,
    resultTokenHash: "a".repeat(64),
  });
  const proponent = await createOrganization(ctx, { type: "proponente", name: "Proponente Teste" });
  const project = await createProject(ctx, {
    proponentOrgId: proponent.id,
    name: "Cinema na Praça",
    slug: "cinema-na-praca",
    mechanism: "rouanet_art18",
    approvedAmount: 100000,
  });
  await createContribution(ctx, {
    projectId: project.id,
    leadId: lead.id,
    type: "patrocinio",
    mechanism: "rouanet_art18",
    proposedAmount: 30000,
  });
  detail = (await getLeadDetail(ctx, lead.id))!;
  input = {
    lead: detail,
    activities: await listActivities(ctx, { leadId: lead.id, limit: 300 }),
    consents: await listConsents(ctx, lead.id),
    simulations: await listSimulations(ctx, { leadId: lead.id, limit: 10 }),
    contributions: await listContributionSummaries(ctx, { leadId: lead.id }),
    ownerName: "Daniela Sandrin Copat",
    projectNames: new Map([[project.id, project.name]]),
    now,
  };
});

describe("buildLeadContext", () => {
  it("nunca leva e-mail, telefone, CPF, CNPJ, ipHash, inputs da simulação nem ids", () => {
    const context = buildLeadContext(input);
    const json = JSON.stringify(context);
    expect(json).not.toContain("example.test");
    expect(json).not.toContain("98403");
    expect(json).not.toContain("84032180");
    expect(json).not.toContain("529.982");
    expect(json).not.toContain("55667788");
    expect(json).not.toContain("0001-86");
    expect(json).not.toContain("500000");
    expect(json).not.toContain("ipHash");
    expect(json).not.toMatch(UUID_RE);
    expect(json).not.toContain(detail.id);
    expect(json).not.toContain(ctx.tenantId);
    expect(json).not.toContain("gclid");
    expect(json).not.toContain("vinculo_art27_checado_por");
    expect(json).not.toContain("Daniela Sandrin");
  });

  it("traz os campos da lista fechada traduzidos", () => {
    const context = buildLeadContext(input);
    expect(context.nome).toBe("Rodrigo Pasqualotto");
    expect(context.primeiroNome).toBe("Rodrigo");
    expect(context.empresa).toBe("Rede Farmácias Vale");
    expect(context.cidade).toBe("Garibaldi/RS");
    expect(context.segmento).toBe("Empresa (PJ)");
    expect(context.pipeline).toBe("Patrocinadores");
    expect(context.estagio).toBe("Novo");
    expect(context.origem).toBe("Site"); // source_detail com "?" é omitido
    expect(context.campos).toEqual(
      expect.arrayContaining([
        { rotulo: "Regime tributário", valor: "Lucro real" },
        { rotulo: "Contador participa da conversa", valor: "sim" },
        { rotulo: "Escritório contábil", valor: "Contabilidade Serra ([e-mail])" },
        { rotulo: "Vínculo com o proponente checado (art. 27)", valor: "sim" },
        { rotulo: "Checagem do art. 27 em", valor: "01/10/2026" },
      ]),
    );
    expect(context.campos.map((c) => c.rotulo)).not.toContain("CNPJ");
    expect(context.mensagem).toBe(
      "Pode me ligar no [telefone] ou escrever para [e-mail]. Meu CPF é [CPF].",
    );
    expect(context.simulacao).toEqual({
      mecanismo: "Lei Rouanet, art. 18",
      valorEstimado: "cerca de R$ 20 mil",
    });
    expect(context.consentimentos[0]).toMatch(
      /^contato comercial: autorizado em \d{2}\/\d{2}\/\d{4} por e-mail$/,
    );
    expect(context.consentimentos[1]).toBe("marketing: nunca registrado");
    expect(context.aportes).toEqual([
      { projeto: "Cinema na Praça", status: "Proposta", valor: "cerca de R$ 30 mil" },
    ]);
    expect(context.responsavel).toBe("Daniela");
  });

  it("limita a 20 atividades dos últimos 180 dias, corpo a 600 caracteres, e resume sistema e download", () => {
    const context = buildLeadContext(input);
    expect(context.atividades).toHaveLength(20);
    expect(context.atividades.some((a) => a.assunto === "Reunião antiga")).toBe(false);
    expect(context.atividades.some((a) => a.tipo === "Download")).toBe(false);
    for (const a of context.atividades) {
      expect(a.texto === null || a.texto.length <= 600).toBe(true);
      expect(a.assunto).not.toContain("example.test");
      expect(a.texto ?? "").not.toContain("84032180");
    }
    expect(context.downloads).toBe(1);
    expect(context.eventosSistema).toBeGreaterThanOrEqual(0);
    const task = context.atividades.find((a) => a.tipo === "Tarefa");
    expect(task?.assunto).toBe("Reenviar material LIC-RS (aberta (vence 03/10/2026))");
    const form = context.atividades.find((a) => a.tipo === "Formulário");
    expect(form?.assunto).toMatch(/^preencheu o formulário \(Formulário recebido: Site\) em /);
    expect(form?.texto).toBeNull();
  });

  it("chave desconhecida em attributes é omitida", () => {
    const context = buildLeadContext({
      ...input,
      lead: { ...detail, attributes: { ...detail.attributes, chave_desconhecida: "segredo" } },
    });
    expect(JSON.stringify(context)).not.toContain("segredo");
  });
});

describe("renderLeadContext", () => {
  it("brief traz todos os blocos, com responsável e aportes", () => {
    const text = renderLeadContext(buildLeadContext(input), "brief");
    expect(text).toContain("LEAD\nNome: Rodrigo Pasqualotto");
    expect(text).toContain("Responsável: Daniela");
    expect(text).toContain("CAMPOS DO SEGMENTO");
    expect(text).toContain("MENSAGEM DO FORMULÁRIO");
    expect(text).toContain("HISTÓRICO (mais recente primeiro)");
    expect(text).toContain("SIMULAÇÃO MAIS RECENTE");
    expect(text).toContain("CONSENTIMENTOS");
    expect(text).toContain("APORTES EM ABERTO\n- Cinema na Praça: Proposta, cerca de R$ 30 mil");
    expect(text).toMatch(/\(mais \d+ eventos automáticos e 1 downloads\)/);
    expect(text).not.toContain("example.test");
    expect(text).not.toMatch(UUID_RE);
  });

  it("notes traz só o primeiro nome, os campos preenchidos e as 5 últimas atividades", () => {
    const text = renderLeadContext(buildLeadContext(input), "notes");
    expect(text).toContain("Nome: Rodrigo\n");
    expect(text).not.toContain("Pasqualotto");
    expect(text).not.toContain("Cidade");
    expect(text).not.toContain("MENSAGEM DO FORMULÁRIO");
    expect(text).not.toContain("SIMULAÇÃO");
    expect(text).not.toContain("CONSENTIMENTOS");
    expect(text).not.toContain("Responsável");
    expect(text).toContain("CAMPOS JÁ PREENCHIDOS");
    expect(text.match(/^- \d{2}\/\d{2}\/\d{4}/gm)).toHaveLength(5);
    expect(text).not.toContain("Detalhe da conversa");
  });

  it("reply traz nome completo e cidade, sem aportes nem responsável", () => {
    const text = renderLeadContext(buildLeadContext(input), "reply");
    expect(text).toContain("Nome: Rodrigo Pasqualotto");
    expect(text).toContain("Cidade: Garibaldi/RS");
    expect(text).toContain("SIMULAÇÃO MAIS RECENTE");
    expect(text).not.toContain("APORTES");
    expect(text).not.toContain("Responsável");
    expect(text.match(/^- \d{2}\/\d{2}\/\d{4}/gm)).toHaveLength(5);
  });

  it("escreve 'não informado' nos campos vazios", () => {
    const context = buildLeadContext({
      ...input,
      lead: { ...detail, city: null, uf: null, message: null, nextActionAt: null },
      simulations: [],
      contributions: [],
      ownerName: null,
    });
    const text = renderLeadContext(context, "brief");
    expect(text).toContain("Cidade: não informado");
    expect(text).toContain("MENSAGEM DO FORMULÁRIO\nnão informado");
    expect(text).toContain("nenhuma simulação");
    expect(text).toContain("APORTES EM ABERTO\nnenhum");
    expect(text).toContain("Responsável: não informado");
  });
});
