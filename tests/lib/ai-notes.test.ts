// "Ditar e organizar", parte pura (src/lib/ai/notes.ts): esquema por segmento, pós-processamento
// e prompts. Sem SDK, sem rede.
import { describe, expect, it } from "vitest";
import {
  NOTES_SYSTEM,
  attributeKeysFor,
  nextActionDateFor,
  normalizeNotes,
  notesAttributes,
  notesSchemaFor,
  notesSystemFor,
  notesUserMessage,
  type NotesRaw,
} from "@/lib/ai/notes";
import { buildLeadContext, type LeadContextInput } from "@/lib/ai/redact";
import { toDateTimeLocal } from "@/lib/crm/format";
import type { LeadDetail } from "@/lib/repos/leads";

const now = new Date("2026-10-09T19:00:00Z"); // sexta-feira, 16:00 em São Paulo

function raw(over: Partial<NotesRaw> = {}): NotesRaw {
  return {
    tipo: "ligacao",
    assunto: "Ligação: contador confirma lucro real.",
    resumo: "Liguei para o Rodrigo. O contador confirmou lucro real.",
    proxima_acao: { descricao: "Enviar proposta", em_dias: 3 },
    tarefas: ["Enviar proposta", " Enviar proposta ", "Pedir a ECF"],
    campos_extraidos: [],
    incertezas: [],
    ...over,
  };
}

describe("attributeKeysFor e notesSchemaFor", () => {
  it("exclui a checagem do art. 27 e mantém o resto do segmento", () => {
    const keys = attributeKeysFor("PJ");
    expect(keys).toContain("regime_tributario");
    expect(keys).toContain("cnpj");
    expect(keys.some((k) => k.startsWith("vinculo_art27"))).toBe(false);
    expect(attributeKeysFor("ALUNO")).toEqual([
      "objetivo",
      "experiencia",
      "faixa_investimento",
      "instagram_ou_linkedin",
      "pesquisa_respondida",
      "aula_aberta",
    ]);
  });

  it('o esquema de CONT não aceita chave "regime_tributario"; o de PJ aceita', () => {
    const item = { chave: "regime_tributario", valor: "lucro_real" };
    expect(notesSchemaFor("CONT").safeParse(raw({ campos_extraidos: [item] })).success).toBe(false);
    expect(notesSchemaFor("PJ").safeParse(raw({ campos_extraidos: [item] })).success).toBe(true);
    expect(
      notesSchemaFor("PJ").safeParse(
        raw({ campos_extraidos: [{ ...item, chave: "vinculo_art27_checado" }] }),
      ).success,
    ).toBe(false);
  });

  it("recusa tipo fora do canal (tarefa) e exige proxima_acao nula ou completa", () => {
    expect(notesSchemaFor("PF").safeParse(raw({ tipo: "tarefa" as never })).success).toBe(false);
    expect(notesSchemaFor("PF").safeParse(raw({ proxima_acao: null })).success).toBe(true);
    expect(
      notesSchemaFor("PF").safeParse(raw({ proxima_acao: { descricao: "x" } as never })).success,
    ).toBe(false);
  });
});

describe("normalizeNotes", () => {
  it("corta o assunto em 80 sem ponto final, dedup e corta listas em 8", () => {
    const out = normalizeNotes(
      raw({
        assunto: `${"a".repeat(100)}.`,
        tarefas: Array.from({ length: 12 }, (_, i) => `tarefa ${i}`),
        incertezas: Array.from({ length: 12 }, (_, i) => `dúvida ${i}`),
      }),
      "PJ",
      now,
    );
    expect(out.assunto).toBe("a".repeat(80));
    expect(out.tarefas).toHaveLength(8);
    expect(out.incertezas).toHaveLength(8);
    expect(normalizeNotes(raw(), "PJ", now).tarefas).toEqual(["Enviar proposta", "Pedir a ECF"]);
    expect(normalizeNotes(raw(), "PJ", now).assunto).toBe("Ligação: contador confirma lucro real");
  });

  it("próxima ação vira 09:00 em America/Sao_Paulo do dia calculado; fora de 0 a 60 vira null", () => {
    const out = normalizeNotes(raw(), "PJ", now);
    expect(out.proximaAcao).toEqual({
      descricao: "Enviar proposta",
      emDias: 3,
      at: "2026-10-12T12:00:00.000Z",
    });
    expect(toDateTimeLocal(new Date(out.proximaAcao!.at))).toBe("2026-10-12T09:00");
    const today = normalizeNotes(
      raw({ proxima_acao: { descricao: "Ligar", em_dias: 0 } }),
      "PJ",
      now,
    );
    expect(toDateTimeLocal(new Date(today.proximaAcao!.at))).toBe("2026-10-09T09:00");
    for (const em_dias of [90, -1, 2.5]) {
      expect(
        normalizeNotes(raw({ proxima_acao: { descricao: "x", em_dias } }), "PJ", now).proximaAcao,
      ).toBeNull();
    }
    expect(
      normalizeNotes(raw({ proxima_acao: { descricao: "   ", em_dias: 2 } }), "PJ", now)
        .proximaAcao,
    ).toBeNull();
    expect(normalizeNotes(raw({ proxima_acao: null }), "PJ", now).proximaAcao).toBeNull();
  });

  it("nextActionDateFor respeita o dia civil de São Paulo", () => {
    // 23:30 de sexta em SP (02:30Z de sábado): "amanhã" é sábado, 10/10.
    const late = new Date("2026-10-10T02:30:00Z");
    expect(toDateTimeLocal(nextActionDateFor(late, 1))).toBe("2026-10-10T09:00");
  });

  it("valida cada campo pelo schema do segmento e manda o que não vale para incertezas", () => {
    const out = normalizeNotes(
      raw({
        campos_extraidos: [
          { chave: "regime_tributario", valor: "lucro real" },
          { chave: "contador_participa", valor: "true" },
          { chave: "irpj_faixa", valor: "100k_500k" },
          { chave: "cnpj", valor: "55.667.788/0001-86" },
          { chave: "setor", valor: "  Farmácias  " },
          { chave: "cargo", valor: "dono_ou_socio" },
          { chave: "cargo", valor: "financeiro" },
          { chave: "contribuinte_icms_rs", valor: "talvez" },
        ],
      }),
      "PJ",
      now,
    );
    expect(out.campos).toEqual([
      {
        chave: "contador_participa",
        rotulo: "Contador participa da conversa",
        valor: true,
        valorRotulo: "sim",
      },
      {
        chave: "irpj_faixa",
        rotulo: "Faixa de IRPJ",
        valor: "100k_500k",
        valorRotulo: "R$ 100 mil a R$ 500 mil",
      },
      { chave: "cnpj", rotulo: "CNPJ", valor: "55667788000186", valorRotulo: "55667788000186" },
      { chave: "setor", rotulo: "Setor", valor: "Farmácias", valorRotulo: "Farmácias" },
      { chave: "cargo", rotulo: "Cargo", valor: "dono_ou_socio", valorRotulo: "Dono ou sócio" },
    ]);
    expect(out.incertezas).toEqual([
      "Valor não reconhecido para Regime tributário: 'lucro real'",
      "Valor não reconhecido para Contribuinte de ICMS no RS: 'talvez'",
    ]);
    expect(notesAttributes(out)).toEqual({
      contador_participa: true,
      irpj_faixa: "100k_500k",
      cnpj: "55667788000186",
      setor: "Farmácias",
      cargo: "dono_ou_socio",
    });
  });

  it("CNPJ só com 14 dígitos; número em reais; data; valor vazio é descartado", () => {
    const out = normalizeNotes(
      raw({
        campos_extraidos: [
          { chave: "cnpj", valor: "123" },
          { chave: "valor_aprovado", valor: "R$ 1.250.000,50" },
          { chave: "saldo_a_captar", valor: "muito" },
          { chave: "prazo_captacao", valor: "   " },
        ],
      }),
      "PROP",
      now,
    );
    // cnpj não é campo de PROP: ignorado sem incerteza (o esquema já não o aceitaria).
    expect(out.campos).toEqual([
      {
        chave: "valor_aprovado",
        rotulo: "Valor aprovado (R$)",
        valor: 1_250_000.5,
        valorRotulo: "1250000.5",
      },
    ]);
    expect(out.incertezas).toEqual([
      "Valor não reconhecido para Saldo a captar (R$): 'muito'",
      "Valor não reconhecido para Prazo de captação: ''",
    ]);
    const cnpj = normalizeNotes(
      raw({ campos_extraidos: [{ chave: "cnpj", valor: "123" }] }),
      "PJ",
      now,
    );
    expect(cnpj.campos).toEqual([]);
    expect(cnpj.incertezas).toEqual(["Valor não reconhecido para CNPJ: '123'"]);
  });
});

describe("prompts", () => {
  it("o system de PJ lista chaves e valores do segmento e não tem data, nome ou id", () => {
    const system = notesSystemFor("PJ");
    expect(system.startsWith(NOTES_SYSTEM)).toBe(true);
    expect(system).toContain("regime_tributario");
    expect(system).toContain("lucro_real (Lucro real)");
    expect(system).toContain(
      "contador_participa (Contador participa da conversa): 'true' ou 'false'",
    );
    expect(system).toContain("cnpj (CNPJ): só os 14 dígitos");
    expect(system).not.toContain("vinculo_art27");
    expect(system).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(system).not.toMatch(/Hoje é/);
    // Estável: duas chamadas produzem o mesmo prefixo de cache.
    expect(notesSystemFor("PJ")).toBe(system);
    expect(notesSystemFor("CONT")).not.toContain("regime_tributario");
    expect(notesSystemFor("CONT")).toContain("clientes_lucro_real_faixa");
  });

  it("a mensagem de usuário começa com a data, traz o contexto e o relato mascarado", () => {
    const lead = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Rodrigo Pasqualotto",
      segment: "PJ",
      pipeline: "patrocinadores",
      stage: "novo",
      stageEnteredAt: new Date("2026-10-06T12:00:00Z"),
      nextActionAt: null,
      lastContactAt: null,
      attributes: { empresa: "Rede Farmácias Vale", regime_tributario: "lucro_real" },
      tags: [],
      city: "Garibaldi",
      uf: "RS",
      interest: "rouanet",
      source: "site",
      sourceDetail: null,
      temperature: "morno",
      score: 40,
      message: null,
      orgName: null,
      ownerName: null,
    } as unknown as LeadDetail;
    const input: LeadContextInput = {
      lead,
      activities: [],
      consents: [],
      simulations: [],
      contributions: [],
      ownerName: null,
      projectNames: new Map(),
      now,
    };
    const text =
      "Falei com o Rodrigo, e-mail rodrigo@example.test, fone (54) 98403-2180, CNPJ 55.667.788/0001-86.";
    const message = notesUserMessage(buildLeadContext(input), text, now);
    expect(message.startsWith("Hoje é sexta-feira, 09/10/2026.\n")).toBe(true);
    expect(message).toContain("LEAD (só para contexto; não repita o que já está preenchido)");
    expect(message).toContain("Nome: Rodrigo\n");
    expect(message).not.toContain("Pasqualotto");
    expect(message).toContain("Regime tributário: Lucro real");
    expect(message).toContain("RELATO DITADO OU COLADO");
    expect(message).toContain("[e-mail]");
    expect(message).toContain("[telefone]");
    expect(message).toContain("55.667.788/0001-86");
    expect(message).not.toContain("example.test");
    expect(message).not.toContain("98403");
    expect(message.endsWith("Organize o relato no formato pedido.")).toBe(true);
  });
});
