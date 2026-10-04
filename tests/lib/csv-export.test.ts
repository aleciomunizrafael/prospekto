// Exportação CSV por tabela (src/lib/repos/export.ts + src/lib/csv.ts): conteúdo e isolamento
// por tenant.
import { beforeAll, describe, expect, it } from "vitest";
import { CSV_BOM, toCsv } from "@/lib/csv";
import type { Ctx } from "@/lib/repos/ctx";
import { EXPORT_TABLES, exportTable } from "@/lib/repos/export";
import { createLead, moveLeadStage } from "@/lib/repos/leads";
import { consentContato, makeTenant, uniqueEmail } from "../helpers";

let a: Ctx;
let b: Ctx;
let leadA: string;
let leadB: string;

beforeAll(async () => {
  a = await makeTenant();
  b = await makeTenant();
  const ra = await createLead(a, {
    segment: "PJ",
    interest: "rouanet",
    name: 'Empresa "Aspas"; Ltda',
    email: uniqueEmail("a"),
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
    expect(activitiesA.rows.every((r) => r.lead_id === leadA)).toBe(true);
    expect(activitiesA.rows.length).toBeGreaterThanOrEqual(2); // formulário + estágio
    const consentsB = await exportTable(b, "consents");
    expect(consentsB.rows).toHaveLength(0);
  });
});
