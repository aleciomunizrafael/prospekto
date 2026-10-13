// Exportação CSV por tabela (src/lib/repos/export.ts + src/lib/csv.ts): conteúdo e isolamento
// por tenant.
import { beforeAll, describe, expect, it } from "vitest";
import { CSV_BOM, toCsv } from "@/lib/csv";
import type { Ctx } from "@/lib/repos/ctx";
import { EXPORT_TABLES, exportTable } from "@/lib/repos/export";
import { createLead, moveLeadStage } from "@/lib/repos/leads";
import { createOrganization } from "@/lib/repos/organizations";
import { addItems, createList, recordCallResult } from "@/lib/repos/prospecting";
import { createTask, moveTask } from "@/lib/repos/tasks";
import { consentContato, makeTenant, uniqueEmail } from "../helpers";

let a: Ctx;
let b: Ctx;
let leadA: string;
let leadB: string;
let listA: string;
let itemA: string;
let taskA: string;

beforeAll(async () => {
  a = await makeTenant();
  b = await makeTenant();
  const ra = await createLead(a, {
    segment: "PJ",
    interest: "rouanet",
    name: 'Empresa "Aspas"; Ltda',
    email: uniqueEmail("a"),
    phone: "+5554999990000",
    source: "site",
    consents: [consentContato],
    attributes: { empresa: "Empresa A", regime_tributario: "lucro_real", chave_extra: 1 },
  });
  leadA = ra.lead.id;
  await moveLeadStage(a, {
    leadId: leadA,
    to: "qualificado",
    ownerUserId: a.userId!,
    nextActionAt: new Date("2026-10-10T12:00:00Z"),
  });
  const rb = await createLead(b, {
    segment: "CONT",
    interest: "rouanet",
    name: "Escritório B",
    email: uniqueEmail("b"),
    source: "linkedin",
  });
  leadB = rb.lead.id;

  // Prospecção e tarefas (ADR-004, 6.4.6): uma lista com um item ligado, uma tarefa em andamento.
  const list = await createList(a, {
    name: "Vinícolas de teste",
    region: "Bento Gonçalves/RS",
    sourceDetail: "busca pública",
    assigneeUserId: a.userId!,
  });
  listA = list.id;
  const added = await addItems(a, {
    listId: listA,
    items: [{ name: "Vinícola Teste", segment: "Vinícolas", phone: "+5554900000011" }],
  });
  itemA = added.items[0].id;
  await recordCallResult(a, { itemId: itemA, status: "retornar", callbackAt: "2026-10-20" });
  const task = await createTask(a, { subject: "Ligar de volta", priority: "alta", leadId: leadA });
  taskA = task.id;
  await moveTask(a, { activityId: taskA, status: "em_andamento", index: 0 });
  await createOrganization(a, {
    type: "empresa",
    name: "Empresa com telefone",
    phone: "(54) 3000-0000",
  });
  const listB = await createList(b, { name: "Lista do outro tenant", sourceDetail: "indicação" });
  await addItems(b, { listId: listB.id, items: [{ name: "Empresa Alheia" }] });
});

describe("exportTable", () => {
  it("leads: colunas do contrato, consentimento vigente, attributes e extras", async () => {
    const { headers, rows } = await exportTable(a, "leads");
    const keys = headers.map((h) => h.key);
    expect(keys.slice(0, 8)).toEqual([
      "id",
      "segmento",
      "pipeline",
      "estagio",
      "estagio_desde",
      "interesse",
      "nome",
      "email",
    ]);
    expect(keys).toContain("empresa");
    expect(keys.at(-1)).toBe("atributos_extra");
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.id).toBe(leadA);
    expect(row.estagio).toBe("qualificado");
    expect(row.dono).toMatch(/^Usuário /);
    expect(row.consentimento_contato_em).toBeInstanceOf(Date);
    expect(row.consentimento_marketing).toBe(false);
    expect(row.canais_consentidos).toEqual(["email"]);
    expect(row.empresa).toBe("Empresa A");
    expect(row.regime_tributario).toBe("lucro_real");
    expect(row.atributos_extra).toEqual({ chave_extra: 1 });

    const csv = toCsv(rows, headers);
    expect(csv.startsWith(`${CSV_BOM}id;segmento;pipeline`)).toBe(true);
    expect(csv).toContain('"Empresa ""Aspas""; Ltda"');
    expect(csv).toContain("2026-10-10T12:00:00.000Z");
    // Telefone E.164 começa com "+": sai neutralizado contra fórmula (apóstrofo e aspas).
    expect(csv).toContain(';"\'+5554999990000";');
  });

  it("organizations: telefone da empresa em E.164", async () => {
    const { headers, rows } = await exportTable(a, "organizations");
    expect(headers.map((h) => h.key)).toContain("telefone");
    expect(rows.find((r) => r.nome === "Empresa com telefone")?.telefone).toBe("+555430000000");
  });

  it("activities: started_at, priority, status derivado e empresa de prospecção", async () => {
    const { headers, rows } = await exportTable(a, "activities");
    const keys = headers.map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining(["iniciado_em", "status", "prioridade", "empresa_prospeccao"]),
    );
    const task = rows.find((r) => r.id === taskA);
    expect(task?.status).toBe("em_andamento");
    expect(task?.prioridade).toBe("alta");
    expect(task?.iniciado_em).toBeInstanceOf(Date);
    expect(task?.concluido_em).toBeNull();
    const call = rows.find(
      (r) => r.tipo === "ligacao" && r.empresa_prospeccao === "Vinícola Teste",
    );
    expect(call).toBeDefined();
    // Status derivado só nas tarefas; ligações e notas saem sem status nem prioridade.
    expect(call?.status).toBeNull();
    expect(call?.prioridade).toBeNull();
  });

  it("prospecting_lists e prospecting_items: colunas do contrato, com telefone", async () => {
    const lists = await exportTable(a, "prospecting_lists");
    expect(lists.headers.map((h) => h.key)).toEqual([
      "id",
      "nome",
      "regiao",
      "origem_dados",
      "instrucoes",
      "quem_liga",
      "criado_por",
      "criado_em",
      "atualizado_em",
    ]);
    expect(lists.rows).toHaveLength(1);
    expect(lists.rows[0]).toMatchObject({
      id: listA,
      nome: "Vinícolas de teste",
      origem_dados: "busca pública",
    });
    expect(lists.rows[0].quem_liga).toMatch(/^Usuário /);

    const items = await exportTable(a, "prospecting_items");
    expect(items.headers.map((h) => h.key)).toEqual(
      expect.arrayContaining(["lista", "empresa", "telefone", "status", "retornar_em", "lead_id"]),
    );
    expect(items.rows).toHaveLength(1);
    expect(items.rows[0]).toMatchObject({
      id: itemA,
      lista_id: listA,
      lista: "Vinícolas de teste",
      empresa: "Vinícola Teste",
      grupo: "Vinícolas",
      telefone: "+5554900000011",
      status: "retornar",
      retornar_em: "2026-10-20",
      lead_id: null,
    });
    expect(items.rows[0].ultima_tentativa).toBeInstanceOf(Date);
    const csv = toCsv(items.rows, items.headers);
    expect(csv).toContain(';"\'+5554900000011";');
  });

  it("isola por tenant em todas as tabelas", async () => {
    for (const table of EXPORT_TABLES) {
      const fromA = await exportTable(a, table);
      const fromB = await exportTable(b, table);
      const idsA = fromA.rows.map((r) => String(r.id ?? r.lead_id ?? ""));
      const idsB = fromB.rows.map((r) => String(r.id ?? r.lead_id ?? ""));
      expect(idsA, table).not.toContain(leadB);
      expect(idsB, table).not.toContain(leadA);
      const leadIdsB = fromB.rows.map((r) => r.lead_id);
      expect(leadIdsB, table).not.toContain(leadA);
    }
    const activitiesA = await exportTable(a, "activities");
    expect(
      activitiesA.rows.every(
        (r) => r.lead_id === leadA || r.empresa_prospeccao === "Vinícola Teste",
      ),
    ).toBe(true);
    expect(activitiesA.rows.length).toBeGreaterThanOrEqual(2); // formulário + estágio
    const consentsB = await exportTable(b, "consents");
    expect(consentsB.rows).toHaveLength(0);
    const itemsB = await exportTable(b, "prospecting_items");
    expect(itemsB.rows.map((r) => r.empresa)).toEqual(["Empresa Alheia"]);
    expect(itemsB.rows[0].lista_id).not.toBe(listA);
  });
});
