// Briefing "Preparar ligação" (src/lib/ai/brief.ts): esquema, prompts e normalização puros.
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  BRIEF_DEADLINES,
  BRIEF_INSTRUCTION,
  BRIEF_LIMITS,
  BRIEF_SYSTEM,
  briefSchema,
  briefUserMessage,
  normalizeBrief,
  type Brief,
} from "@/lib/ai/brief";
import { qualificationRules } from "@/lib/ai/qualification";
import type { LeadContext } from "@/lib/ai/redact";

const example: Brief = {
  resumo: "Rodrigo é diretor de uma rede de farmácias em Garibaldi. Pediu diagnóstico pelo site.",
  gancho_abertura:
    "Rodrigo, vi que você simulou o patrocínio pelo site na semana passada. O que te chamou a atenção?",
  pontos_atencao: [
    "Regime tributário não confirmado pelo contador.",
    "Prazo do estágio vence amanhã.",
  ],
  perguntas: ["A empresa é tributada pelo lucro real?", "Quem decide o patrocínio?"],
  objecoes_provaveis: [
    { objecao: "Vai dar problema com a Receita.", resposta: "É dedução prevista em lei." },
  ],
  proximo_passo: { acao: "Ligar e confirmar o regime com o contador.", prazo: "hoje" },
  lacunas: ["Faixa de IRPJ devido."],
};

const context: LeadContext = {
  nome: "Rodrigo Pasqualotto",
  primeiroNome: "Rodrigo",
  empresa: "Rede Farmácias Vale",
  cidade: "Garibaldi/RS",
  segmento: "Empresa (PJ)",
  pipeline: "Patrocinadores",
  estagio: "Novo",
  diasNoEstagio: 2,
  prazoEstagio: "1 dia útil",
  interesse: "Lei Rouanet",
  origem: "Site",
  temperatura: "Quente",
  score: 72,
  tags: [],
  campos: [{ rotulo: "Regime tributário", valor: "Lucro real" }],
  mensagem: "Quero entender o patrocínio.",
  atividades: [],
  eventosSistema: 0,
  downloads: 0,
  simulacao: null,
  consentimentos: ["contato comercial: autorizado em 06/10/2026 por e-mail"],
  aportes: [],
  responsavel: "Daniela",
  proximaAcao: null,
  ultimoContato: null,
};

describe("briefSchema", () => {
  it("aceita o JSON de exemplo", () => {
    expect(briefSchema.safeParse(example).success).toBe(true);
  });

  it("aceita prazo fora da lista (o SDK não envia enum) e normalizeBrief fecha em BriefDeadline; recusa campos faltando", () => {
    // "amanhã" chegava ao Zod como enum inválido e a execução inteira virava invalid_output.
    const withDeadline = (prazo: string) => ({
      ...example,
      proximo_passo: { acao: "Ligar.", prazo },
    });
    expect(briefSchema.safeParse(withDeadline("mes_que_vem")).success).toBe(true);
    expect(normalizeBrief(withDeadline("amanhã")).proximo_passo.prazo).toBe("amanha");
    expect(normalizeBrief(withDeadline("Esta semana")).proximo_passo.prazo).toBe("esta_semana");
    expect(normalizeBrief(withDeadline("próxima semana")).proximo_passo.prazo).toBe(
      "proxima_semana",
    );
    expect(normalizeBrief(withDeadline("hoje.")).proximo_passo.prazo).toBe("hoje");
    expect(normalizeBrief(withDeadline("mes_que_vem")).proximo_passo.prazo).toBe("esta_semana");
    const missing: Partial<Brief> = { ...example };
    delete missing.lacunas;
    expect(briefSchema.safeParse(missing).success).toBe(false);
  });

  it("não usa min, max, minLength, regex nem enum (subconjunto das saídas estruturadas, decisão P3)", () => {
    // `enum` entra na lista porque o SDK o descarta do JSON Schema enviado (vira texto na
    // description): a lista fechada de `prazo` vale no prompt e em normalizeBrief.
    const json = JSON.stringify(z.toJSONSchema(briefSchema));
    const keys = ["minLength", "maxLength", "minItems", "maxItems", "pattern", "minimum", "enum"];
    for (const key of keys) {
      expect(json).not.toContain(`"${key}"`);
    }
  });
});

describe("BRIEF_SYSTEM e briefUserMessage", () => {
  it("o system é estável: sem data, sem nome de lead, sem id, e termina com as regras fixas", () => {
    expect(BRIEF_SYSTEM).not.toMatch(/Hoje é/);
    expect(BRIEF_SYSTEM).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(BRIEF_SYSTEM).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i);
    expect(BRIEF_SYSTEM).not.toContain("Rodrigo");
    expect(BRIEF_SYSTEM.endsWith(qualificationRules())).toBe(true);
    expect(BRIEF_SYSTEM).toContain("Responda só com o JSON pedido.");
    expect(BRIEF_SYSTEM).toContain(
      "chaves exatas, sem acento: hoje, amanha, esta_semana, proxima_semana",
    );
    expect(BRIEF_SYSTEM).toContain("3,6% com a LC 224/2025");
  });

  it("a mensagem de usuário começa com a data, traz o contexto e termina com a instrução", () => {
    const user = briefUserMessage(context, new Date("2026-10-09T19:00:00Z"));
    expect(user.startsWith("Hoje é sexta-feira, 09/10/2026.")).toBe(true);
    expect(user).toContain("DADOS DO LEAD\nLEAD\nNome: Rodrigo Pasqualotto");
    expect(user).toContain("Empresa ou organização: Rede Farmácias Vale");
    expect(user).toContain("Estágio: Novo (há 2 dias; prazo: 1 dia útil)");
    expect(user).toContain("Responsável: Daniela");
    expect(user).toContain("APORTES EM ABERTO");
    expect(user.endsWith(BRIEF_INSTRUCTION)).toBe(true);
  });
});

describe("normalizeBrief", () => {
  it("corta as listas nos limites, remove vazios e duplicados e faz trim", () => {
    const many = (prefix: string, n: number) =>
      Array.from({ length: n }, (_, i) => ` ${prefix} ${i} `);
    const out = normalizeBrief({
      resumo: "  Resumo.  ",
      gancho_abertura: " Gancho? ",
      pontos_atencao: ["", "  ", " Risco A ", "risco a", "Risco B", ...many("Ponto", 10)],
      perguntas: many("Pergunta", 12),
      objecoes_provaveis: [
        { objecao: " Caro ", resposta: " Não é gasto. " },
        { objecao: "caro", resposta: "Repetida." },
        { objecao: "Sem resposta", resposta: "" },
        ...Array.from({ length: 8 }, (_, i) => ({ objecao: `Obj ${i}`, resposta: `R ${i}` })),
      ],
      proximo_passo: { acao: " Ligar. ", prazo: "amanha" },
      lacunas: [...many("Lacuna", 9), "Lacuna 0"],
    });
    expect(out.resumo).toBe("Resumo.");
    expect(out.gancho_abertura).toBe("Gancho?");
    expect(out.pontos_atencao).toHaveLength(BRIEF_LIMITS.pontos_atencao);
    expect(out.pontos_atencao.slice(0, 2)).toEqual(["Risco A", "Risco B"]);
    expect(out.perguntas).toHaveLength(BRIEF_LIMITS.perguntas);
    expect(out.perguntas[0]).toBe("Pergunta 0");
    expect(out.objecoes_provaveis).toHaveLength(BRIEF_LIMITS.objecoes_provaveis);
    expect(out.objecoes_provaveis[0]).toEqual({ objecao: "Caro", resposta: "Não é gasto." });
    expect(out.objecoes_provaveis.some((o) => o.objecao === "Sem resposta")).toBe(false);
    expect(out.proximo_passo).toEqual({ acao: "Ligar.", prazo: "amanha" });
    expect(out.lacunas).toHaveLength(BRIEF_LIMITS.lacunas);
  });

  it("não altera um briefing já dentro dos limites", () => {
    expect(normalizeBrief(example)).toEqual(example);
  });

  it("tolera campos ausentes ou de tipo errado e prazo desconhecido (registro antigo em ai_runs)", () => {
    const out = normalizeBrief({ resumo: 7, perguntas: "x", proximo_passo: { prazo: "nunca" } });
    expect(out).toEqual({
      resumo: "",
      gancho_abertura: "",
      pontos_atencao: [],
      perguntas: [],
      objecoes_provaveis: [],
      proximo_passo: { acao: "", prazo: "esta_semana" },
      lacunas: [],
    });
    expect(BRIEF_DEADLINES).toContain(out.proximo_passo.prazo);
  });
});
