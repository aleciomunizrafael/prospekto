// As oito situações da tabela de describeSla (crm-design-system.md, seção 5.2), com datas fixas em
// America/Sao_Paulo. "Agora" é terça-feira, 6 de outubro de 2026, 13:00 em São Paulo.
import { describe, expect, it } from "vitest";
import { describeSla, describeStageDeadline, formatShortDay } from "@/lib/crm/describe-sla";
import { stageInfo } from "@/lib/crm/lead-view";

const now = new Date("2026-10-06T13:00:00-03:00");

function leadAt(pipeline: string, stage: string, enteredAt: string, nextActionAt?: string) {
  return {
    segment: "PJ" as const,
    pipeline,
    stage,
    stageEnteredAt: new Date(enteredAt),
    nextActionAt: nextActionAt ? new Date(nextActionAt) : null,
    attributes: {},
  };
}

function describe_(lead: ReturnType<typeof leadAt>) {
  return describeSla(stageInfo(lead, now), lead.nextActionAt, now, lead);
}

describe("describeSla: frases humanas de prazo", () => {
  it("1. próxima ação vencida há N dias", () => {
    const lead = leadAt(
      "patrocinadores",
      "qualificado",
      "2026-09-29T10:00:00-03:00",
      "2026-10-03T10:00:00-03:00",
    );
    expect(describe_(lead)).toEqual({
      text: "Ação atrasada há 3 dias",
      tone: "danger",
      kind: "next_action",
    });
    const oneDay = leadAt(
      "patrocinadores",
      "qualificado",
      "2026-09-29T10:00:00-03:00",
      "2026-10-05T10:00:00-03:00",
    );
    expect(describe_(oneDay).text).toBe("Ação atrasada há 1 dia");
    const today = leadAt(
      "patrocinadores",
      "qualificado",
      "2026-09-29T10:00:00-03:00",
      "2026-10-06T08:00:00-03:00",
    );
    expect(describe_(today)).toMatchObject({ text: "Ação vence hoje", tone: "danger" });
  });

  it("2. próxima ação nas próximas 24 h", () => {
    const lead = leadAt(
      "patrocinadores",
      "qualificado",
      "2026-09-29T10:00:00-03:00",
      "2026-10-06T18:00:00-03:00",
    );
    expect(describe_(lead)).toEqual({ text: "Ação em 5 h", tone: "warning", kind: "next_action" });
  });

  it("3. próxima ação futura, com a data por extenso", () => {
    const lead = leadAt(
      "patrocinadores",
      "qualificado",
      "2026-09-29T10:00:00-03:00",
      "2026-10-09T10:00:00-03:00",
    );
    expect(describe_(lead)).toEqual({
      text: "Próxima ação sex., 9 de out.",
      tone: "neutral",
      kind: "next_action",
    });
    expect(formatShortDay(new Date("2026-10-09T10:00:00-03:00"))).toBe("sex., 9 de out.");
  });

  it("4. sem próxima ação, SLA vencido no estágio inicial: sem contato há N dias (prazo)", () => {
    // Entrou na quarta 30/09; 1 dia útil -> quinta 01/10; hoje é 06/10: 6 dias sem contato.
    const lead = leadAt("patrocinadores", "novo", "2026-09-30T10:00:00-03:00");
    expect(describe_(lead)).toEqual({
      text: "Sem contato há 6 dias (prazo: 1 dia útil)",
      tone: "danger",
      kind: "sla",
    });
  });

  it("5. sem próxima ação, SLA vencido em outro estágio: prazo do estágio vencido", () => {
    // Diagnóstico tem 5 dias úteis; entrou sexta 25/09 -> prazo sexta 02/10 10:00; vencido há 4 dias.
    const lead = leadAt("patrocinadores", "diagnostico", "2026-09-25T10:00:00-03:00");
    expect(describe_(lead)).toEqual({
      text: "Prazo do estágio vencido há 4 dias (prazo: 5 dias úteis)",
      tone: "danger",
      kind: "sla",
    });
  });

  it("6. sem próxima ação, SLA em menos de 24 h", () => {
    // Novo: 1 dia útil. Entrou hoje 06:00 -> prazo quarta 07/10 06:00; faltam 17 h.
    const initial = leadAt("patrocinadores", "novo", "2026-10-06T06:00:00-03:00");
    expect(describe_(initial)).toEqual({
      text: "Faltam 17 h para o primeiro contato",
      tone: "warning",
      kind: "sla",
    });
    // Termo: 3 dias úteis. Entrou sexta 02/10 06:00 -> seg, ter, qua 07/10 06:00; faltam 17 h.
    const other = leadAt("patrocinadores", "termo", "2026-10-02T06:00:00-03:00");
    expect(describe_(other)).toEqual({
      text: "Faltam 17 h no prazo do estágio",
      tone: "warning",
      kind: "sla",
    });
  });

  it("7. sem próxima ação, SLA em N dias", () => {
    // Diagnóstico: 5 dias úteis. Entrou sexta 02/10 13:00 -> sexta 09/10 13:00; 3 dias.
    const lead = leadAt("patrocinadores", "diagnostico", "2026-10-02T13:00:00-03:00");
    expect(describe_(lead)).toEqual({
      text: "3 dias no prazo do estágio",
      tone: "neutral",
      kind: "sla",
    });
    const initial = leadAt("municipios", "novo", "2026-10-05T13:00:00-03:00"); // 5 dias úteis
    expect(describe_(initial).text).toBe("6 dias para o primeiro contato");
  });

  it("8. estágio sem SLA em dias: a nota do estágio", () => {
    const lead = leadAt("patrocinadores", "renovacao", "2026-01-10T10:00:00-03:00");
    expect(describe_(lead)).toEqual({
      text: "contato em janeiro; depois trimestral",
      tone: "neutral",
      kind: "none",
    });
    const student = leadAt("alunos", "pesquisado", "2026-09-01T10:00:00-03:00");
    expect(describe_(student).text).toBe("quando abrir turma");
  });

  it("sem pipeline e estágio a frase fica genérica, sem o prazo entre parênteses", () => {
    const lead = leadAt("patrocinadores", "novo", "2026-09-30T10:00:00-03:00");
    const info = stageInfo(lead, now);
    expect(describeSla(info, null, now).text).toBe("Prazo do estágio vencido há 5 dias");
  });

  it("nunca produz o texto antigo em horas", () => {
    const lead = leadAt("patrocinadores", "qualificado", "2026-09-20T10:00:00-03:00");
    expect(describe_(lead).text).not.toMatch(/SLA estourado|h restantes/);
  });

  it("describeStageDeadline: dias úteis, corridos e nota", () => {
    expect(describeStageDeadline({ pipeline: "patrocinadores", stage: "novo" }, now)).toBe(
      "1 dia útil",
    );
    expect(describeStageDeadline({ pipeline: "patrocinadores", stage: "diagnostico" }, now)).toBe(
      "5 dias úteis",
    );
    expect(describeStageDeadline({ pipeline: "municipios", stage: "contrato" }, now)).toBe(
      "30 dias",
    );
    // Prazo zero ("automático") não é um prazo a citar: a frase sai sem "(prazo: …)".
    expect(describeStageDeadline({ pipeline: "alunos", stage: "lista_espera" }, now)).toBeNull();
    expect(describeStageDeadline({ pipeline: "alunos", stage: "pesquisado" }, now)).toBe(
      "quando abrir turma",
    );
    // Proposta cai para 2 dias úteis em novembro e dezembro.
    expect(
      describeStageDeadline(
        { pipeline: "patrocinadores", stage: "proposta" },
        new Date("2026-11-10T12:00:00-03:00"),
      ),
    ).toBe("2 dias úteis");
  });
});
