// searchAllAction (src/actions/search.ts) contra PGlite (ADR-004, 6.7; plano, P11 e regra 10):
// dois tenants, 5 por tipo, inclui lead perdido, tarefa e item de prospecção; a resposta nunca
// carrega e-mail nem telefone; argumento inválido devolve [] sem lançar; o console não recebe o
// termo (R-16). requireSession é substituído por um contexto controlado pelo teste.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { searchAllAction, type SearchGroups } from "@/actions/search";
import { formatBRL } from "@/lib/crm/format";
import type { Ctx } from "@/lib/repos/ctx";
import { createContribution } from "@/lib/repos/contributions";
import { createLead, moveLeadStage } from "@/lib/repos/leads";
import { createOrganization } from "@/lib/repos/organizations";
import { createProject } from "@/lib/repos/projects";
import { addItems, createList } from "@/lib/repos/prospecting";
import { createTask } from "@/lib/repos/tasks";
import { consentContato, makeTenant, makeUser, uniqueEmail } from "../helpers";

const session = vi.hoisted(() => ({ ctx: null as Ctx | null }));

vi.mock("@/lib/session", () => ({
  requireSession: async () => {
    if (!session.ctx) throw new Error("REDIRECT:/entrar");
    return { ...session.ctx, role: "owner" };
  },
}));

const TERM = "Zabumba";

let a: Ctx;
let b: Ctx;
let ownIds: Set<string>;
let otherIds: Set<string>;
let lostLeadId: string;
let listId: string;
let itemId: string;

async function makeLead(ctx: Ctx, name: string, empresa: string) {
  const { lead } = await createLead(ctx, {
    segment: "PJ",
    interest: "rouanet",
    name,
    email: uniqueEmail("busca"),
    phone: "+5554900000011",
    source: "site",
    consents: [consentContato],
    attributes: { empresa },
  });
  return lead;
}

beforeAll(async () => {
  a = await makeTenant("busca-a");
  b = await makeTenant("busca-b");
  ownIds = new Set();
  otherIds = new Set();

  // Tenant A: seis leads (um perdido), organizações, projeto, aporte, tarefas e prospecção.
  const owner = await makeUser(a);
  for (let i = 1; i <= 5; i++) {
    const lead = await makeLead(a, `${TERM} Lead ${i}`, `Empresa ${TERM} ${i}`);
    ownIds.add(lead.id);
  }
  const lost = await makeLead(a, `${TERM} Perdido`, `Empresa ${TERM} perdida`);
  await moveLeadStage(a, {
    leadId: lost.id,
    to: "perdido",
    ownerUserId: owner,
    nextActionAt: new Date(),
    lostReason: "sem_resposta",
  });
  lostLeadId = lost.id;
  ownIds.add(lost.id);

  const proponent = await createOrganization(a, {
    type: "proponente",
    name: `${TERM} Proponente`,
    city: "Caxias do Sul",
    uf: "RS",
  });
  const sponsor = await createOrganization(a, { type: "empresa", name: `${TERM} Vinícola` });
  ownIds.add(proponent.id);
  ownIds.add(sponsor.id);
  const project = await createProject(a, {
    proponentOrgId: proponent.id,
    name: `${TERM} Festival`,
    slug: `${TERM.toLowerCase()}-festival`,
    mechanism: "rouanet_art18",
    approvedAmount: 100000,
  });
  ownIds.add(project.id);
  const contribution = await createContribution(a, {
    projectId: project.id,
    leadId: lost.id,
    type: "patrocinio",
    mechanism: "rouanet_art18",
    proposedAmount: 25000,
  });
  ownIds.add(contribution.id);
  const task = await createTask(a, { subject: `Ligar para ${TERM}`, dueAt: new Date() });
  ownIds.add(task.id);
  const list = await createList(a, { name: `Lista ${TERM}`, sourceDetail: "teste" });
  listId = list.id;
  const { items } = await addItems(a, {
    listId: list.id,
    items: [{ name: `${TERM} Cervejaria`, phone: "(54) 90000-0002" }],
  });
  itemId = items[0].id;
  ownIds.add(items[0].id);

  // Tenant B: um de cada com o mesmo termo; nada dele pode aparecer para A.
  const leadB = await makeLead(b, `${TERM} Lead B`, `Empresa ${TERM} B`);
  otherIds.add(leadB.id);
  const orgB = await createOrganization(b, { type: "empresa", name: `${TERM} Org B` });
  otherIds.add(orgB.id);
  const taskB = await createTask(b, { subject: `${TERM} tarefa B` });
  otherIds.add(taskB.id);
  const listB = await createList(b, { name: `Lista ${TERM} B`, sourceDetail: "teste" });
  const { items: itemsB } = await addItems(b, {
    listId: listB.id,
    items: [{ name: `${TERM} Empresa B`, phone: "(54) 90000-0003" }],
  });
  otherIds.add(itemsB[0].id);

  session.ctx = a;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function group(groups: SearchGroups, kind: SearchGroups[number]["kind"]) {
  return groups.find((g) => g.kind === kind);
}

describe("searchAllAction", () => {
  it("devolve os seis tipos só do próprio tenant, 5 por tipo, com links reais", async () => {
    const groups = await searchAllAction(TERM);
    expect(groups.map((g) => g.kind)).toEqual([
      "lead",
      "organizacao",
      "projeto",
      "aporte",
      "tarefa",
      "prospeccao",
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      "Leads",
      "Organizações",
      "Projetos",
      "Aportes",
      "Tarefas",
      "Prospecção",
    ]);
    // Seis leads no tenant; só cinco voltam.
    expect(group(groups, "lead")?.items).toHaveLength(5);
    for (const g of groups) {
      for (const item of g.items) {
        expect(item.kind).toBe(g.kind);
        expect(ownIds.has(item.id), `${g.kind} ${item.id}`).toBe(true);
        expect(otherIds.has(item.id)).toBe(false);
        expect(item.href.startsWith("/app/")).toBe(true);
        expect(item.title.length).toBeGreaterThan(0);
      }
    }
    expect(group(groups, "organizacao")?.items.map((i) => i.href)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^\/app\/organizacoes\/[0-9a-f-]{36}$/)]),
    );
    expect(group(groups, "organizacao")?.items.map((i) => i.meta)).toContain(
      "Proponente · Caxias do Sul/RS",
    );
    expect(group(groups, "projeto")?.items[0]).toMatchObject({
      title: `${TERM} Festival`,
      meta: `${TERM} Proponente`,
    });
    expect(group(groups, "aporte")?.items[0]).toMatchObject({
      title: `${TERM} Perdido → ${TERM} Festival`,
      meta: `${formatBRL(25000)} · Proposta`,
    });
    expect(group(groups, "tarefa")?.items[0]).toMatchObject({
      title: `Ligar para ${TERM}`,
      meta: "Vence hoje",
    });
    expect(group(groups, "tarefa")?.items[0].href).toMatch(/^\/app\/tarefas\?task=/);
    expect(group(groups, "prospeccao")?.items[0]).toMatchObject({
      title: `${TERM} Cervejaria`,
      meta: `Lista ${TERM} · A ligar`,
      href: `/app/prospeccao/${listId}/${itemId}`,
    });
  });

  it("inclui o lead perdido, com o estágio na meta", async () => {
    const groups = await searchAllAction(`${TERM} Perdido`);
    const lead = group(groups, "lead")?.items.find((i) => i.id === lostLeadId);
    expect(lead).toMatchObject({
      meta: `Empresa ${TERM} perdida · Perdido`,
      href: `/app/leads/${lostLeadId}`,
    });
  });

  it("nunca devolve e-mail nem telefone", async () => {
    const groups = await searchAllAction(TERM);
    expect(groups.length).toBeGreaterThan(0);
    const json = JSON.stringify(groups);
    expect(json).not.toMatch(/@|\+55|example\.test|phone|email/);
    // Só os campos de tela.
    for (const g of groups) {
      for (const item of g.items) {
        expect(Object.keys(item).sort()).toEqual(["href", "id", "kind", "meta", "title"]);
      }
    }
  });

  it("item de prospecção não é achado pelo telefone", async () => {
    expect(await searchAllAction("900000002")).toEqual([]);
    expect(await searchAllAction("+5554900000002")).toEqual([]);
  });

  it("menos de 2 caracteres, só espaços e termo sem resultado devolvem []", async () => {
    expect(await searchAllAction("Z")).toEqual([]);
    expect(await searchAllAction("   Z   ")).toEqual([]);
    expect(await searchAllAction("")).toEqual([]);
    expect(await searchAllAction("nada-disso-existe")).toEqual([]);
  });

  it("argumento que não é string devolve [] sem lançar (POST direto)", async () => {
    expect(await searchAllAction(42)).toEqual([]);
    expect(await searchAllAction({})).toEqual([]);
    expect(await searchAllAction(null)).toEqual([]);
    expect(await searchAllAction(undefined)).toEqual([]);
    expect(await searchAllAction(["Z", "a"])).toEqual([]);
    expect(await searchAllAction("x".repeat(1001))).toEqual([]);
  });

  it("corta o termo em 120 caracteres", async () => {
    const groups = await searchAllAction(`${TERM} Festival${" ".repeat(10)}${"x".repeat(200)}`);
    // O termo com 200 x's não bate em nada: o corte em 120 ainda deixa x's no termo.
    expect(group(groups, "projeto")).toBeUndefined();
    const padded = await searchAllAction(`${TERM}${" ".repeat(300)}`);
    expect(group(padded, "projeto")?.items[0].title).toBe(`${TERM} Festival`);
  });

  it("loga só contagens: o termo nunca chega ao console", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await searchAllAction(`${TERM} Perdido`);
    const lines = [...logSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls].map(
      (call) => call.map(String).join(" "),
    );
    const busca = lines.filter((l) => l.includes("busca global"));
    expect(busca).toHaveLength(1);
    const entry = JSON.parse(busca[0]);
    expect(entry).toMatchObject({
      level: "info",
      tenantId: a.tenantId,
      userId: a.userId,
      counts: { lead: 1, organizacao: 0, projeto: 0, aporte: 1, tarefa: 0, prospeccao: 0 },
    });
    for (const line of lines) {
      expect(line).not.toContain(TERM);
      expect(line).not.toContain("Perdido");
      expect(line).not.toMatch(/@|\+55/);
    }
  });

  it("sem sessão redireciona em vez de responder", async () => {
    session.ctx = null;
    try {
      await expect(searchAllAction(TERM)).rejects.toThrow("REDIRECT:/entrar");
    } finally {
      session.ctx = a;
    }
  });
});
