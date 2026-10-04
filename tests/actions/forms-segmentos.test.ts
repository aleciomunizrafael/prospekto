// Formulários por segmento (estrutura-e-copy.md, seção 5.5; modelo-de-dados.md, seção 7) pela
// Server Action pública, contra PGlite: contadores (carteira e webinar), municípios, proponentes e
// lista de espera da mentoria, cada um no pipeline e estágio certos com os attributes esperados.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createLeadFromForm } from "@/actions/leads";
import { env } from "@/env";
import { listActivities } from "@/lib/repos/activities";
import type { Ctx } from "@/lib/repos/ctx";
import { getLeadByEmail } from "@/lib/repos/leads";
import { ensureTenant } from "@/lib/repos/tenants";
import { issueFormTimestamp } from "@/lib/signing";
import { WEBINAR } from "@/lib/validation/forms/contadores-webinar";
import { initialLeadFormState, type LeadFormState } from "@/lib/validation/forms/state";
import { uniqueEmail } from "../helpers";

const request = vi.hoisted(() => ({ ip: "203.0.113.1" }));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": request.ip, "user-agent": "vitest" }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const ctx: Ctx = { tenantId: env.DEFAULT_TENANT_ID, userId: null };

beforeAll(async () => {
  await ensureTenant({ id: ctx.tenantId, name: "Prospekto" });
});

let ipSeq = 0;
const validToken = () => issueFormTimestamp(new Date(Date.now() - 5_000));

type Outcome = { redirect: string } | { state: LeadFormState };

async function submit(fields: Record<string, string>): Promise<Outcome> {
  ipSeq += 1;
  request.ip = `198.51.100.${ipSeq}`;
  const fd = new FormData();
  for (const [k, v] of Object.entries({ form_ts: validToken(), consent_lgpd: "on", ...fields })) {
    fd.append(k, v);
  }
  try {
    const state = await createLeadFromForm(initialLeadFormState, fd);
    return { state };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("REDIRECT:")) return { redirect: message.slice("REDIRECT:".length) };
    throw error;
  }
}

function thanksParams(out: Outcome): URLSearchParams {
  expect(out).toHaveProperty("redirect");
  return new URLSearchParams((out as { redirect: string }).redirect.split("?")[1]);
}

describe("contadores: diagnóstico de carteira (accountant)", () => {
  it("cria lead CONT em contadores/novo, origem site, com os attributes do escritório", async () => {
    const email = uniqueEmail("cont");
    const out = await submit({
      form_id: "accountant",
      escritorio: "Contabilidade Serra",
      nome: "Paulo Sócio",
      cargo: "socio",
      email,
      telefone: "(54) 3222-1234",
      clientes_lucro_real_faixa: "5_19",
      cidade: "Caxias do Sul",
      uf: "rs",
      cnpj: "11.222.333/0001-81",
      ja_lancou_incentivo: "sim",
      registro_crc: "RS-012345/O",
      source_page: "/contadores",
    });
    const params = thanksParams(out);
    expect((out as { redirect: string }).redirect).toMatch(/^\/obrigado\/contadores\?/);
    expect(params.get("s")).toBe("CONT");
    expect(params.get("o")).toBe("site");
    const lead = await getLeadByEmail(ctx, email, "CONT");
    expect(lead!.pipeline).toBe("contadores");
    expect(lead!.stage).toBe("novo");
    expect(lead!.source).toBe("site");
    expect(lead!.sourceDetail).toBe("/contadores");
    expect(lead!.interest).toBe("rouanet");
    expect(lead!.phone).toBe("+555432221234");
    expect(lead!.uf).toBe("RS");
    expect(lead!.attributes).toEqual({
      escritorio: "Contabilidade Serra",
      cargo: "socio",
      clientes_lucro_real_faixa: "5_19",
      uf: "RS",
      cnpj: "11222333000181",
      ja_lancou_incentivo: true,
      registro_crc: "RS-012345/O",
    });
    expect(lead!.tags).toEqual([]);
  });

  it("escritório sem clientes no lucro real recebe a tag fora_do_icp e interesse lic_rs", async () => {
    const email = uniqueEmail("cont-fora");
    const out = await submit({
      form_id: "accountant",
      escritorio: "Contabilidade Simples",
      nome: "Marta Analista",
      cargo: "analista",
      email,
      telefone: "54984032180",
      clientes_lucro_real_faixa: "nenhum",
      cidade: "Farroupilha",
      uf: "RS",
    });
    expect(out).toHaveProperty("redirect");
    const lead = await getLeadByEmail(ctx, email, "CONT");
    expect(lead!.tags).toEqual(["fora_do_icp"]);
    expect(lead!.interest).toBe("lic_rs");
  });

  it("recusa CNPJ inválido e telefone ausente", async () => {
    const out = await submit({
      form_id: "accountant",
      escritorio: "X",
      nome: "Nome",
      cargo: "socio",
      email: uniqueEmail("cont-erro"),
      telefone: "",
      clientes_lucro_real_faixa: "1_4",
      cidade: "Caxias do Sul",
      uf: "RS",
      cnpj: "11.111.111/1111-11",
    });
    const state = (out as { state: LeadFormState }).state;
    expect(state.status).toBe("error");
    expect(state.fieldErrors).toHaveProperty("escritorio");
    expect(state.fieldErrors).toHaveProperty("telefone");
    expect(state.fieldErrors).toHaveProperty("cnpj");
  });
});

describe("contadores: webinar (accountant_webinar)", () => {
  it("cria lead CONT com source_detail webinar:[data] e tag webinar", async () => {
    const email = uniqueEmail("webinar");
    const out = await submit({
      form_id: "accountant_webinar",
      nome: "Júlia Gerente",
      email,
      escritorio: "Escritório Webinar",
      clientes_lucro_real_faixa: "",
      source_page: "/contadores",
    });
    expect((out as { redirect: string }).redirect).toMatch(/^\/obrigado\/contadores\?/);
    const lead = await getLeadByEmail(ctx, email, "CONT");
    expect(lead!.pipeline).toBe("contadores");
    expect(lead!.stage).toBe("novo");
    expect(lead!.source).toBe("site");
    expect(lead!.sourceDetail).toBe(`webinar:${WEBINAR.date}`);
    expect(lead!.attributes).toEqual({ escritorio: "Escritório Webinar" });
    expect(lead!.tags).toEqual(["webinar"]);
  });
});

describe("municípios (municipality)", () => {
  it("cria lead MUN em municipios/novo com interesse consultoria e attributes da secretaria", async () => {
    const email = uniqueEmail("mun");
    const out = await submit({
      form_id: "municipality",
      municipio: "Garibaldi",
      orgao: "secretaria",
      cargo: "secretario",
      nome: "Secretária de Cultura",
      email,
      telefone: "(54) 3462-0000",
      necessidade: "prestacao_contas",
      pnab_status: "saldo_a_executar",
      lei_incentivo_municipal: "nao",
      mensagem: "Precisamos executar o saldo da PNAB.",
      source_page: "/municipios",
    });
    expect((out as { redirect: string }).redirect).toMatch(/^\/obrigado\/municipios\?/);
    const lead = await getLeadByEmail(ctx, email, "MUN");
    expect(lead!.pipeline).toBe("municipios");
    expect(lead!.stage).toBe("novo");
    expect(lead!.source).toBe("site");
    expect(lead!.interest).toBe("consultoria");
    expect(lead!.city).toBe("Garibaldi");
    expect(lead!.message).toBe("Precisamos executar o saldo da PNAB.");
    expect(lead!.attributes).toEqual({
      municipio: "Garibaldi",
      orgao: "secretaria",
      cargo: "secretario",
      necessidade: "prestacao_contas",
      pnab_status: "saldo_a_executar",
      lei_incentivo_municipal: "nao",
    });
  });
});

describe("proponentes (proponent)", () => {
  it("cria lead PROP em projetos/prospeccao com os dados do projeto e valores em número", async () => {
    const email = uniqueEmail("prop");
    const out = await submit({
      form_id: "proponent",
      proponente: "Ocotea Filmes",
      tipo_proponente: "pj",
      nome: "Produtora Executiva",
      email,
      telefone: "47999990000",
      projeto_nome: "Longa de comédia",
      mecanismo: "audiovisual",
      status_projeto: "aprovado_captando",
      segmento_cultural: "Audiovisual",
      cidade: "Balneário Camboriú",
      uf: "SC",
      numero_processo: "Despacho 127-E/2026",
      valor_aprovado: "R$ 2.000.000,00",
      saldo_a_captar: "2400000",
      prazo_captacao: "31/12/2026",
      link_material: "https://example.com/deck.pdf",
      prestacao_contas_anterior: "aprovada",
      source_page: "/proponentes",
    });
    expect((out as { redirect: string }).redirect).toMatch(/^\/obrigado\/proponentes\?/);
    const lead = await getLeadByEmail(ctx, email, "PROP");
    expect(lead!.pipeline).toBe("projetos");
    expect(lead!.stage).toBe("prospeccao");
    expect(lead!.source).toBe("site");
    expect(lead!.interest).toBe("audiovisual");
    expect(lead!.attributes).toEqual({
      proponente: "Ocotea Filmes",
      tipo_proponente: "pj",
      projeto_nome: "Longa de comédia",
      mecanismo: "audiovisual",
      status_projeto: "aprovado_captando",
      segmento_cultural: "Audiovisual",
      numero_processo: "Despacho 127-E/2026",
      valor_aprovado: 2_000_000,
      saldo_a_captar: 2_400_000,
      prazo_captacao: "31/12/2026",
      link_material: "https://example.com/deck.pdf",
      prestacao_contas_anterior: "aprovada",
    });
    // O projeto (cultural_projects) não é criado pelo formulário (modelo-de-dados.md, 7).
    expect(lead!.projectId).toBeNull();
    const forms = await listActivities(ctx, { leadId: lead!.id, type: "formulario" });
    expect(forms[0].data).toMatchObject({ form_id: "proponent", valor_aprovado: 2_000_000 });
  });

  it("recusa link inválido e valor não numérico", async () => {
    const out = await submit({
      form_id: "proponent",
      proponente: "Grupo Teatral",
      tipo_proponente: "instituicao",
      nome: "Diretor",
      email: uniqueEmail("prop-erro"),
      telefone: "54984032180",
      projeto_nome: "Peça",
      mecanismo: "rouanet",
      status_projeto: "ideia",
      segmento_cultural: "Teatro",
      cidade: "Caxias do Sul",
      uf: "RS",
      valor_aprovado: "muito",
      link_material: "drive",
    });
    const state = (out as { state: LeadFormState }).state;
    expect(state.status).toBe("error");
    expect(state.fieldErrors).toHaveProperty("valor_aprovado");
    expect(state.fieldErrors).toHaveProperty("link_material");
  });
});

describe("mentoria: lista de espera (waitlist)", () => {
  it("cria lead ALUNO em alunos/lista_espera com objetivo e experiência", async () => {
    const email = uniqueEmail("aluno");
    const out = await submit({
      form_id: "waitlist",
      nome: "Produtora Iniciante",
      email,
      objetivo: "primeiro_projeto",
      experiencia: "nenhuma",
      faixa_investimento: "500_1500",
      instagram_ou_linkedin: "@produtora",
      cidade: "",
      uf: "",
      telefone: "",
      source_page: "/mentoria",
    });
    expect((out as { redirect: string }).redirect).toMatch(/^\/obrigado\/mentoria\?/);
    const lead = await getLeadByEmail(ctx, email, "ALUNO");
    expect(lead!.pipeline).toBe("alunos");
    expect(lead!.stage).toBe("lista_espera");
    expect(lead!.source).toBe("site");
    expect(lead!.interest).toBe("mentoria");
    expect(lead!.phone).toBeNull();
    expect(lead!.attributes).toEqual({
      objetivo: "primeiro_projeto",
      experiencia: "nenhuma",
      faixa_investimento: "500_1500",
      instagram_ou_linkedin: "@produtora",
    });
  });

  it("objetivo e experiência são obrigatórios", async () => {
    const out = await submit({
      form_id: "waitlist",
      nome: "Alguém",
      email: uniqueEmail("aluno-erro"),
      objetivo: "",
      experiencia: "",
    });
    const state = (out as { state: LeadFormState }).state;
    expect(state.status).toBe("error");
    expect(state.fieldErrors).toHaveProperty("objetivo");
    expect(state.fieldErrors).toHaveProperty("experiencia");
  });
});
