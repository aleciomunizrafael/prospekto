// Server Action pública createLeadFromForm contra PGlite (estrutura-e-copy.md, seção 5.1;
// modelo-de-dados.md, R-1, R-2, R-18). next/headers e next/navigation são substituídos: o IP vem
// de uma variável controlada pelo teste e redirect() lança um erro reconhecível.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createLeadFromForm } from "@/actions/leads";
import { env } from "@/env";
import { listActivities } from "@/lib/repos/activities";
import { listConsents } from "@/lib/repos/consents";
import type { Ctx } from "@/lib/repos/ctx";
import { createLead, getLeadByEmail, moveLeadStage } from "@/lib/repos/leads";
import { ensureTenant } from "@/lib/repos/tenants";
import { issueFormTimestamp } from "@/lib/signing";
import { initialLeadFormState, type LeadFormState } from "@/lib/validation/forms/state";
import { consentContato, makeUser, uniqueEmail } from "../helpers";

const request = vi.hoisted(() => ({ ip: "203.0.113.1" }));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ "x-forwarded-for": `${request.ip}, 10.0.0.1`, "user-agent": "vitest" }),
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
function freshIp(): string {
  ipSeq += 1;
  return `198.51.100.${ipSeq}`;
}

const validToken = () => issueFormTimestamp(new Date(Date.now() - 5_000));

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

type Outcome = { redirect: string } | { state: LeadFormState };

async function submit(fields: Record<string, string>): Promise<Outcome> {
  try {
    const state = await createLeadFromForm(initialLeadFormState, formData(fields));
    return { state };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("REDIRECT:")) return { redirect: message.slice("REDIRECT:".length) };
    throw error;
  }
}

function contactFields(email: string, extra: Record<string, string> = {}) {
  return {
    form_id: "contact",
    nome: "Maria Teste",
    email,
    telefone: "(54) 98403-2180",
    assunto: "patrocinar",
    mensagem: "Quero patrocinar um projeto.",
    consent_lgpd: "on",
    form_ts: validToken(),
    utm_source: "linkedin",
    utm_medium: "social",
    utm_campaign: "outubro",
    referrer: "https://www.linkedin.com/",
    landing_path: "/empresas",
    source_page: "/contato",
    ...extra,
  };
}

describe("createLeadFromForm: sucesso (R-1)", () => {
  it("cria lead, consentimentos e activity formulario e redireciona para /obrigado/[tipo]", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("ok");
    const out = await submit(contactFields(email.toUpperCase(), { consent_marketing: "on" }));
    expect(out).toHaveProperty("redirect");
    const redirect = (out as { redirect: string }).redirect;
    expect(redirect).toMatch(/^\/obrigado\/contato\?/);
    const params = new URLSearchParams(redirect.split("?")[1]);
    expect(params.get("f")).toBe("contact");
    expect(params.get("s")).toBe("PJ");
    expect(params.get("o")).toBe("site");
    // Nenhum dado pessoal na URL.
    expect(redirect).not.toContain("Maria");
    expect(redirect.toLowerCase()).not.toContain(email.toLowerCase());

    const lead = await getLeadByEmail(ctx, email, "PJ");
    expect(lead).not.toBeNull();
    expect(lead!.pipeline).toBe("patrocinadores");
    expect(lead!.stage).toBe("novo");
    expect(lead!.source).toBe("site");
    expect(lead!.sourceDetail).toBe("/contato");
    expect(lead!.phone).toBe("+5554984032180");
    expect(lead!.utmSource).toBe("linkedin");
    expect(lead!.utmCampaign).toBe("outubro");
    expect(lead!.referrer).toBe("https://www.linkedin.com/");
    expect(lead!.landingPath).toBe("/empresas");
    expect(lead!.attributes).toMatchObject({ assunto: "patrocinar" });
    expect(typeof lead!.score).toBe("number");

    const consents = await listConsents(ctx, lead!.id);
    expect(consents.map((c) => c.purpose).sort()).toEqual(["contato_comercial", "marketing"]);
    const contact = consents.find((c) => c.purpose === "contato_comercial")!;
    expect(contact.granted).toBe(true);
    expect(contact.policyVersion).toBe("2026-10-03");
    expect(contact.consentText).toMatch(/^Li a Política de Privacidade/);
    expect(contact.channels).toEqual(["email", "telefone"]);
    expect(contact.sourcePage).toBe("/contato");
    expect(contact.userAgent).toBe("vitest");
    const marketing = consents.find((c) => c.purpose === "marketing")!;
    expect(marketing.channels).toEqual(["email", "whatsapp"]);

    const activities = await listActivities(ctx, { leadId: lead!.id, type: "formulario" });
    expect(activities).toHaveLength(1);
    expect(activities[0].data).toMatchObject({ form_id: "contact", assunto: "patrocinar" });
  });

  it("guia em modo 'em breve' cria o lead pelo perfil com a tag avisar_guia", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("guia");
    const out = await submit({
      form_id: "guide_notify",
      email,
      perfil: "contador",
      consent_lgpd: "on",
      form_ts: validToken(),
      source_page: "/guia",
    });
    expect(out).toMatchObject({ redirect: expect.stringMatching(/^\/obrigado\/guia\?/) });
    const lead = await getLeadByEmail(ctx, email, "CONT");
    expect(lead?.pipeline).toBe("contadores");
    expect(lead?.source).toBe("guia");
    expect(lead?.tags).toContain("avisar_guia");
    expect(lead?.guideVersion).toBeNull();
  });

  it("aviso de novos projetos cria lead PJ com a tag avisar_projetos", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("aviso");
    const out = await submit({
      form_id: "projects_notify",
      email,
      cidade: "Caxias do Sul",
      consent_lgpd: "on",
      form_ts: validToken(),
    });
    expect(out).toMatchObject({ redirect: expect.stringMatching(/^\/obrigado\/aviso-projetos\?/) });
    const lead = await getLeadByEmail(ctx, email, "PJ");
    expect(lead?.tags).toEqual(["avisar_projetos"]);
    expect(lead?.city).toBe("Caxias do Sul");
  });
});

describe("createLeadFromForm: antispam (R-18)", () => {
  it("honeypot preenchido responde sucesso sem gravar", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("bot");
    const out = await submit(contactFields(email, { website: "http://spam.example" }));
    expect(out).toMatchObject({ redirect: expect.stringMatching(/^\/obrigado\/contato/) });
    expect(await getLeadByEmail(ctx, email, "PJ")).toBeNull();
  });

  it("envio em menos de 3 segundos responde sucesso sem gravar", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("rapido");
    const out = await submit(contactFields(email, { form_ts: issueFormTimestamp(new Date()) }));
    expect(out).toMatchObject({ redirect: expect.stringMatching(/^\/obrigado\/contato/) });
    expect(await getLeadByEmail(ctx, email, "PJ")).toBeNull();
  });

  it("carimbo ausente ou adulterado devolve erro de token sem gravar", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("token");
    const missing = await submit(contactFields(email, { form_ts: "" }));
    expect(missing).toMatchObject({ state: { status: "error", errorCode: "token" } });
    const tampered = await submit(contactFields(email, { form_ts: `${validToken()}x` }));
    expect(tampered).toMatchObject({ state: { status: "error", errorCode: "token" } });
    expect(await getLeadByEmail(ctx, email, "PJ")).toBeNull();
  });

  it("sexto envio do mesmo IP na mesma hora devolve erro genérico", async () => {
    request.ip = freshIp();
    for (let i = 1; i <= 5; i += 1) {
      const out = await submit(contactFields(uniqueEmail(`ip${i}`)));
      expect(out).toHaveProperty("redirect");
    }
    const email = uniqueEmail("sexto");
    const sixth = await submit(contactFields(email));
    expect(sixth).toMatchObject({
      state: {
        status: "error",
        errorCode: "rate_limited",
        message: expect.stringMatching(/uma hora/),
      },
    });
    expect(await getLeadByEmail(ctx, email, "PJ")).toBeNull();
    // A mensagem não revela nada sobre o e-mail nem sobre o lead.
    const state = (sixth as { state: LeadFormState }).state;
    expect(state.message).not.toContain(email);
  });
});

describe("createLeadFromForm: deduplicação (R-2)", () => {
  it("reenvio em 10 minutos responde o mesmo sucesso sem gravar nova activity", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("dedup");
    const first = await submit(contactFields(email));
    const second = await submit(contactFields(email, { mensagem: "Outra mensagem." }));
    expect(first).toHaveProperty("redirect");
    expect(second).toEqual(first);
    const lead = await getLeadByEmail(ctx, email, "PJ");
    expect(lead?.message).toBe("Quero patrocinar um projeto.");
    expect(await listActivities(ctx, { leadId: lead!.id, type: "formulario" })).toHaveLength(1);
    expect(await listConsents(ctx, lead!.id)).toHaveLength(1);
  });

  it("reenvio depois de 10 minutos atualiza o lead sem rebaixar o estágio", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("later");
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
    const { lead } = await createLead(
      ctx,
      {
        segment: "PJ",
        interest: "rouanet",
        name: "Nome Antigo",
        email,
        source: "site",
        consents: [consentContato],
      },
      twentyMinutesAgo,
    );
    const owner = await makeUser(ctx);
    const moved = await moveLeadStage(ctx, {
      leadId: lead.id,
      to: "qualificado",
      ownerUserId: owner,
      nextActionAt: new Date(Date.now() + 86_400_000),
    });
    expect(moved.stage).toBe("qualificado");

    const out = await submit(contactFields(email, { nome: "Nome Novo", consent_marketing: "on" }));
    expect(out).toHaveProperty("redirect");
    const updated = await getLeadByEmail(ctx, email, "PJ");
    expect(updated?.stage).toBe("qualificado");
    expect(updated?.name).toBe("Nome Novo");
    expect(updated?.phone).toBe("+5554984032180");
    // Uma activity do formulário original (createLead) e uma do reenvio.
    expect(await listActivities(ctx, { leadId: lead.id, type: "formulario" })).toHaveLength(2);
    expect(await listConsents(ctx, lead.id)).toHaveLength(3);
  });
});

describe("createLeadFromForm: validação", () => {
  it("consentimento obrigatório ausente é erro de validação com mensagem por campo", async () => {
    request.ip = freshIp();
    const email = uniqueEmail("semconsent");
    const out = await submit(contactFields(email, { consent_lgpd: "" }));
    expect(out).toMatchObject({
      state: {
        status: "error",
        errorCode: "validation",
        fieldErrors: { consent_lgpd: expect.stringMatching(/obrigatória/) },
      },
    });
    const state = (out as { state: LeadFormState }).state;
    expect(state.values?.email).toBe(email);
    expect(state.values).not.toHaveProperty("form_ts");
    expect(state.values).not.toHaveProperty("website");
    expect(await getLeadByEmail(ctx, email, "PJ")).toBeNull();
  });

  it("e-mail e telefone inválidos e assunto vazio voltam com erros concretos", async () => {
    request.ip = freshIp();
    const out = await submit(
      contactFields("nao-e-email", { telefone: "123", assunto: "", mensagem: "" }),
    );
    expect(out).toMatchObject({ state: { status: "error", errorCode: "validation" } });
    const errors = (out as { state: LeadFormState }).state.fieldErrors!;
    expect(errors.email).toMatch(/e-mail válido/);
    expect(errors.telefone).toMatch(/DDD/);
    expect(errors.assunto).toMatch(/assunto/i);
    expect(errors.mensagem).toMatch(/realizar/);
  });

  it("formulário desconhecido devolve erro sem gravar", async () => {
    request.ip = freshIp();
    const out = await submit({ form_id: "nope", email: uniqueEmail("x"), form_ts: validToken() });
    expect(out).toMatchObject({ state: { status: "error", errorCode: "unknown_form" } });
  });
});
