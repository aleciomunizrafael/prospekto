// src/lib/ai/reply.ts (puro): esquema, prompts e normalização do rascunho de resposta. Datas
// fixas: 09/10/2026 é sexta-feira; proposeSlots devolve segunda 12/10 às 10h e terça 13/10 às 15h.
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { proposeSlots, qualificationRules } from "@/lib/ai/qualification";
import type { LeadContext } from "@/lib/ai/redact";
import {
  DEFAULT_EMAIL_SUBJECT,
  EMAIL_SIGNATURE,
  REPLY_LIMITS,
  REPLY_SYSTEM,
  WHATSAPP_EXIT_SENTENCE,
  WHATSAPP_SIGNATURE,
  normalizeReply,
  replySchema,
  replySentAt,
  replyUserMessage,
  stripUrls,
  type Reply,
} from "@/lib/ai/reply";

const NOW = new Date("2026-10-09T19:00:00Z"); // sexta-feira, 16:00 em São Paulo
const slots = proposeSlots(NOW);
const [A, B] = slots.map((s) => s.label);

const context: LeadContext = {
  nome: "Rodrigo Pasqualotto",
  primeiroNome: "Rodrigo",
  empresa: "Rede Farmácias Vale",
  cidade: "Garibaldi/RS",
  segmento: "Empresa (PJ)",
  pipeline: "Patrocinadores",
  estagio: "Novo",
  diasNoEstagio: 1,
  prazoEstagio: "1 dia útil",
  interesse: "Lei Rouanet",
  origem: "Site · /empresas",
  temperatura: "Morno",
  score: 40,
  tags: [],
  campos: [{ rotulo: "Regime tributário", valor: "Lucro real" }],
  mensagem: "Quero entender quanto cabe no limite.",
  atividades: [],
  eventosSistema: 0,
  downloads: 0,
  simulacao: null,
  consentimentos: ["contato comercial: autorizado em 09/10/2026 por e-mail"],
  aportes: [],
  responsavel: "Rafael",
  proximaAcao: null,
  ultimoContato: null,
};

const emailReply: Reply = {
  assunto: "Sobre o seu pedido de diagnóstico",
  texto: `Olá, Rodrigo.\n\nVi o seu pedido pelo site para a Rede Farmácias Vale.\n\n1. A empresa é tributada pelo lucro real?\n2. Quem decide o patrocínio?\n\nTenho horários ${A} e ${B}. Qual prefere?\n\n${EMAIL_SIGNATURE}`,
  perguntas_incluidas: ["A empresa é tributada pelo lucro real?", "Quem decide o patrocínio?"],
  horarios_incluidos: [A, B],
};

describe("replySchema", () => {
  it("aceita a saída esperada e não usa min, max, minLength ou regex (decisão P3)", () => {
    expect(replySchema.parse(emailReply)).toEqual(emailReply);
    expect(replySchema.parse({ ...emailReply, assunto: null }).assunto).toBeNull();
    const json = JSON.stringify(z.toJSONSchema(replySchema));
    for (const key of ["minLength", "maxLength", "minItems", "maxItems", "pattern", "minimum"]) {
      expect(json, key).not.toContain(`"${key}"`);
    }
    expect(json).toContain('"assunto"');
    expect(json).toContain('"horarios_incluidos"');
  });
});

describe("REPLY_SYSTEM e replyUserMessage", () => {
  it("o system é estável: voz da Daniela, assinaturas, frase de saída e regras, sem data", () => {
    expect(REPLY_SYSTEM).toContain("Daniela Sandrin Copat");
    expect(REPLY_SYSTEM).toContain(EMAIL_SIGNATURE);
    expect(REPLY_SYSTEM).toContain(WHATSAPP_SIGNATURE);
    expect(REPLY_SYSTEM).toContain(WHATSAPP_EXIT_SENTENCE);
    expect(REPLY_SYSTEM).toContain("3,6% com a LC 224/2025");
    expect(REPLY_SYSTEM.endsWith(qualificationRules())).toBe(true);
    // Uma assinatura só por canal: o template do e-mail acrescenta o bloco completo (F45).
    expect(EMAIL_SIGNATURE).toBe("Daniela");
    expect(REPLY_SYSTEM).toContain(`assinatura só "${EMAIL_SIGNATURE}" no e-mail`);
    expect(REPLY_SYSTEM).not.toContain("a Daniela assina como");
    // A apresentação e a frase de saída dependem da linha PRIMEIRO CONTATO da mensagem (F43).
    expect(REPLY_SYSTEM).toContain("diz se é o PRIMEIRO CONTATO");
    expect(REPLY_SYSTEM).toContain("quando PRIMEIRO CONTATO é sim");
    expect(REPLY_SYSTEM).not.toContain("primeira resposta");
    expect(REPLY_SYSTEM).not.toMatch(/Hoje é/);
    expect(REPLY_SYSTEM).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(REPLY_SYSTEM).not.toContain("Rodrigo");
  });

  it("a mensagem começa com a data, traz canal, contexto, perguntas na ordem e os dois horários", () => {
    const questions = ["Pergunta um?", "Pergunta dois?"];
    const user = replyUserMessage(context, {
      channel: "email",
      questions,
      slots,
      now: NOW,
      isFirstContact: true,
    });
    expect(user.startsWith("Hoje é sexta-feira, 09/10/2026.")).toBe(true);
    expect(user).toContain("CANAL: e-mail");
    expect(user).toContain("\nPRIMEIRO CONTATO: sim\n");
    expect(user.indexOf("CANAL:")).toBeLessThan(user.indexOf("PRIMEIRO CONTATO"));
    expect(user.indexOf("PRIMEIRO CONTATO")).toBeLessThan(user.indexOf("DADOS DO LEAD"));
    expect(user).toContain("Nome: Rodrigo Pasqualotto");
    expect(user).toContain("Empresa ou organização: Rede Farmácias Vale");
    expect(user).toContain("Regime tributário: Lucro real");
    expect(user.indexOf("- Pergunta um?")).toBeLessThan(user.indexOf("- Pergunta dois?"));
    expect(user).toContain(`1. ${A}`);
    expect(user).toContain(`2. ${B}`);
    expect(user).toContain("1. segunda-feira, 12 de outubro, às 10h");
    expect(user).toContain("2. terça-feira, 13 de outubro, às 15h");
    expect(user.trimEnd().endsWith("Escreva a resposta.")).toBe(true);
    // Modo "reply" do contexto: sem responsável e sem aportes.
    expect(user).not.toContain("Responsável");
    expect(user).not.toContain("APORTES");
  });

  it("WhatsApp muda o canal; sem perguntas, avisa que o CRM já tem as respostas", () => {
    const user = replyUserMessage(context, {
      channel: "whatsapp",
      questions: [],
      slots,
      now: NOW,
      isFirstContact: true,
    });
    expect(user).toContain("CANAL: WhatsApp");
    expect(user).toContain("(nenhuma: o CRM já tem as respostas");
  });

  it("fora do primeiro contato, a mensagem manda retomar a conversa sem apresentação nem saída", () => {
    const user = replyUserMessage(context, {
      channel: "whatsapp",
      questions: [],
      slots,
      now: NOW,
      isFirstContact: false,
    });
    expect(user).toContain("PRIMEIRO CONTATO: não");
    expect(user).not.toContain("PRIMEIRO CONTATO: sim");
    expect(user).toContain("não se apresente de novo");
    expect(user).toContain("não use a frase de saída");
  });
});

describe("normalizeReply: e-mail", () => {
  const input = { channel: "email" as const, slots, isFirstContact: true };

  it("mantém um texto completo como veio e o assunto numa linha", () => {
    const out = normalizeReply(emailReply, input);
    expect(out).toEqual(emailReply);
  });

  it("assunto nulo ou vazio vira o padrão; quebras de linha somem; dado pessoal é mascarado", () => {
    expect(normalizeReply({ ...emailReply, assunto: null }, input).assunto).toBe(
      DEFAULT_EMAIL_SUBJECT,
    );
    expect(normalizeReply({ ...emailReply, assunto: "   " }, input).assunto).toBe(
      DEFAULT_EMAIL_SUBJECT,
    );
    expect(
      normalizeReply({ ...emailReply, assunto: "Sobre\no seu\n contato" }, input).assunto,
    ).toBe("Sobre o seu contato");
    expect(
      normalizeReply({ ...emailReply, assunto: "Para rodrigo@example.test" }, input).assunto,
    ).toBe("Para [e-mail]");
    const long = "a".repeat(REPLY_LIMITS.subjectChars + 40);
    expect(normalizeReply({ ...emailReply, assunto: long }, input).assunto).toHaveLength(
      REPLY_LIMITS.subjectChars,
    );
  });

  it("o assunto passa pelo mesmo filtro de URL do texto, menos prospekto.com.br", () => {
    expect(
      normalizeReply({ ...emailReply, assunto: "Pague em https://evil.com/pix agora" }, input)
        .assunto,
    ).toBe("Pague em agora");
    expect(
      normalizeReply({ ...emailReply, assunto: "Confira em bit.ly/3xyz hoje" }, input).assunto,
    ).toBe("Confira em hoje");
    expect(
      normalizeReply({ ...emailReply, assunto: "Veja prospekto.com.br/guia" }, input).assunto,
    ).toBe("Veja prospekto.com.br/guia");
    // Só URL no assunto: cai no padrão, em vez de ficar vazio.
    expect(normalizeReply({ ...emailReply, assunto: "https://evil.com" }, input).assunto).toBe(
      DEFAULT_EMAIL_SUBJECT,
    );
  });

  it("acrescenta o parágrafo dos horários antes da assinatura quando falta um deles", () => {
    const texto = `Olá, Rodrigo.\n\nPodemos conversar ${A}?\n\n${EMAIL_SIGNATURE}`;
    const out = normalizeReply({ ...emailReply, texto }, input).texto;
    const sentence = `Tenho horários ${A} e ${B}. Qual prefere?`;
    expect(out).toContain(sentence);
    expect(out.indexOf(sentence)).toBeLessThan(out.indexOf(EMAIL_SIGNATURE));
    expect(out.endsWith(EMAIL_SIGNATURE)).toBe(true);
    expect(out.split(sentence)).toHaveLength(2);
  });

  it("sem assinatura reconhecível, o parágrafo vai ao fim", () => {
    const out = normalizeReply({ ...emailReply, texto: "Olá, Rodrigo. Vamos conversar?" }, input);
    expect(out.texto.endsWith(`Tenho horários ${A} e ${B}. Qual prefere?`)).toBe(true);
  });

  it("mascara e-mail e telefone inventados e remove URLs, menos prospekto.com.br", () => {
    const texto = `Olá, Rodrigo.\n\nEscreva para daniela@example.test ou ligue (54) 98403-2180. Veja https://exemplo.com/pagina e www.outro-site.com.br/x ou prospekto.com.br/simulador e https://www.prospekto.com.br/empresas.\n\nTenho horários ${A} e ${B}. Qual prefere?\n\n${EMAIL_SIGNATURE}`;
    const out = normalizeReply({ ...emailReply, texto }, input).texto;
    expect(out).toContain("[e-mail]");
    expect(out).toContain("[telefone]");
    expect(out).not.toContain("example.test");
    expect(out).not.toContain("98403");
    expect(out).not.toContain("exemplo.com");
    expect(out).not.toContain("outro-site");
    expect(out).toContain("prospekto.com.br/simulador");
    expect(out).toContain("https://www.prospekto.com.br/empresas");
    expect(out).toContain("Veja e ou prospekto.com.br/simulador");
  });

  it("tolera saída incompleta sem lançar", () => {
    const out = normalizeReply({}, input);
    expect(out.assunto).toBe(DEFAULT_EMAIL_SUBJECT);
    expect(out.texto).toContain("Tenho horários");
    expect(out.perguntas_incluidas).toEqual([]);
    expect(out.horarios_incluidos).toEqual([]);
    expect(
      normalizeReply({ ...emailReply, perguntas_incluidas: ["", " A ", "a", "B"] }, input)
        .perguntas_incluidas,
    ).toEqual(["A", "B"]);
  });
});

describe("normalizeReply: WhatsApp", () => {
  const base = {
    assunto: null,
    texto: `Olá, Rodrigo. Aqui é a Daniela, da Prospekto. Vi o seu pedido pelo site. A empresa é tributada pelo lucro real? Tenho horários ${A} e ${B}. Qual prefere?\n\n${WHATSAPP_SIGNATURE}`,
    perguntas_incluidas: ["A empresa é tributada pelo lucro real?"],
    horarios_incluidos: [A, B],
  };

  // A frase de saída fecha a mensagem em parágrafo próprio, depois da assinatura.
  const closing = `${WHATSAPP_SIGNATURE}\n\n${WHATSAPP_EXIT_SENTENCE}`;

  it("assunto é sempre null e a primeira mensagem termina com a frase de saída em parágrafo próprio", () => {
    const out = normalizeReply(base, { channel: "whatsapp", slots, isFirstContact: true });
    expect(out.assunto).toBeNull();
    expect(out.texto.endsWith(WHATSAPP_EXIT_SENTENCE)).toBe(true);
    expect(out.texto.endsWith(closing)).toBe(true);
    expect(out.texto.split(WHATSAPP_EXIT_SENTENCE)).toHaveLength(2);
    expect(out.texto).toContain(WHATSAPP_SIGNATURE);
  });

  it("quando a frase de saída já veio, não duplica e vai para o parágrafo final", () => {
    const withExit = { ...base, texto: `${base.texto} ${WHATSAPP_EXIT_SENTENCE}` };
    const first = normalizeReply(withExit, { channel: "whatsapp", slots, isFirstContact: true });
    expect(first.texto.split(WHATSAPP_EXIT_SENTENCE)).toHaveLength(2);
    expect(first.texto.endsWith(closing)).toBe(true);
    // Já formatada pelo modelo: sai igual.
    const formatted = { ...base, texto: `${base.texto}\n\n${WHATSAPP_EXIT_SENTENCE}` };
    expect(
      normalizeReply(formatted, { channel: "whatsapp", slots, isFirstContact: true }).texto,
    ).toBe(formatted.texto);
  });

  it("fora do primeiro contato, não acrescenta a frase de saída e remove a que o modelo escreveu", () => {
    const later = normalizeReply(base, { channel: "whatsapp", slots, isFirstContact: false });
    expect(later.texto).not.toContain(WHATSAPP_EXIT_SENTENCE);
    expect(later.texto).toBe(base.texto);
    const atEnd = { ...base, texto: `${base.texto}\n\n${WHATSAPP_EXIT_SENTENCE}` };
    const inMiddle = {
      ...base,
      texto: base.texto.replace("Qual prefere?", `Qual prefere? ${WHATSAPP_EXIT_SENTENCE}`),
    };
    for (const raw of [atEnd, inMiddle]) {
      const out = normalizeReply(raw, { channel: "whatsapp", slots, isFirstContact: false });
      expect(out.texto).not.toContain(WHATSAPP_EXIT_SENTENCE);
      expect(out.texto).not.toContain("SAIR");
      expect(out.texto.endsWith(WHATSAPP_SIGNATURE)).toBe(true);
      expect(out.texto).toContain(`Qual prefere?\n\n${WHATSAPP_SIGNATURE}`);
    }
  });

  it("limita a 900 caracteres sem perder a frase de saída", () => {
    const long = {
      ...base,
      texto: `${"Uma frase comprida sobre incentivo fiscal à cultura na Serra Gaúcha. ".repeat(20)}Tenho horários ${A} e ${B}. Qual prefere?\n\n${WHATSAPP_SIGNATURE}`,
    };
    const out = normalizeReply(long, { channel: "whatsapp", slots, isFirstContact: true });
    expect(out.texto.length).toBeLessThanOrEqual(REPLY_LIMITS.whatsappChars);
    expect(out.texto.endsWith(`\n\n${WHATSAPP_EXIT_SENTENCE}`)).toBe(true);
    expect(out.texto.startsWith("Uma frase comprida")).toBe(true);
  });

  it("horário ausente ganha a frase dos horários antes da assinatura", () => {
    const missing = {
      ...base,
      texto: `Olá, Rodrigo. Podemos falar ${A}?\n\n${WHATSAPP_SIGNATURE}`,
    };
    const out = normalizeReply(missing, { channel: "whatsapp", slots, isFirstContact: true });
    const sentence = `Tenho horários ${A} e ${B}. Qual prefere?`;
    expect(out.texto.indexOf(sentence)).toBeLessThan(out.texto.indexOf(WHATSAPP_SIGNATURE));
    expect(out.texto.endsWith(WHATSAPP_EXIT_SENTENCE)).toBe(true);
  });
});

describe("stripUrls", () => {
  it("remove endereços com e sem protocolo e preserva o domínio da Prospekto", () => {
    expect(stripUrls("Acesse https://exemplo.com/a?b=1 agora.")).toBe("Acesse agora.");
    expect(stripUrls("Veja www.exemplo.com.br.")).toBe("Veja.");
    expect(stripUrls("Veja prospekto.com.br/contato.")).toBe("Veja prospekto.com.br/contato.");
    expect(stripUrls("Lei 8.313/1991, art. 18, e a LC 224/2025.")).toBe(
      "Lei 8.313/1991, art. 18, e a LC 224/2025.",
    );
  });

  it("pega encurtadores e TLDs fora da lista quando há caminho ou TLD de país", () => {
    expect(stripUrls("Pague em bit.ly/3xyz ou cutt.ly/abc.")).toBe("Pague em ou.");
    expect(stripUrls("veja golpe.online/pagar e golpe.shop/x")).toBe("veja e");
    expect(stripUrls("Entre em golpe.ru ou em t.co/abc agora.")).toBe("Entre em ou em agora.");
    expect(stripUrls("Veja prospekto.com.br.evil.com/x e evil-prospekto.com.br.")).toBe("Veja e.");
    // Sem caminho e com TLD desconhecido não é tratado como link.
    expect(stripUrls("Falamos disso.depois, combinado?")).toBe("Falamos disso.depois, combinado?");
  });

  it("não apaga abreviações, números de lei nem palavras coladas ao ponto que parecem TLD", () => {
    expect(stripUrls("Olá, Sr.João. A Lei 8.313/91 e a LC 224/2025.")).toBe(
      "Olá, Sr.João. A Lei 8.313/91 e a LC 224/2025.",
    );
    expect(
      stripUrls("Obrigada pela conversa.Me avise. Vou mandar a proposta.Co isso resolvemos."),
    ).toBe("Obrigada pela conversa.Me avise. Vou mandar a proposta.Co isso resolvemos.");
    expect(
      stripUrls("Falamos disso.Com certeza. Veja exemplo.com/pagina e WWW.Site.ORG hoje."),
    ).toBe("Falamos disso.Com certeza. Veja e hoje.");
    expect(stripUrls("Pode ver no App.Me amanhã, p.ex. na Ltda.ME.")).toBe(
      "Pode ver no App.Me amanhã, p.ex. na Ltda.ME.",
    );
    expect(stripUrls("Acesse HTTPS://Exemplo.COM/x agora.")).toBe("Acesse agora.");
  });
});

describe("replySentAt", () => {
  const RUN = "00000000-0000-4000-8000-0000000000aa";
  const OTHER = "00000000-0000-4000-8000-0000000000bb";
  const at = (iso: string) => new Date(iso);
  const activities = [
    { type: "whatsapp", data: { ai: true, runId: RUN }, occurredAt: at("2026-10-09T16:00:00Z") },
    {
      type: "email",
      data: { ai: true, runId: OTHER, mode: "log" },
      occurredAt: at("2026-10-09T15:00:00Z"),
    },
    {
      type: "email",
      data: { ai: true, runId: RUN, mode: "resend" },
      occurredAt: at("2026-10-09T14:00:00Z"),
    },
    { type: "email", data: null, occurredAt: at("2026-10-09T13:00:00Z") },
    {
      type: "email",
      data: { ai: true, runId: RUN, mode: "log" },
      occurredAt: at("2026-10-08T10:00:00Z"),
    },
  ];

  it("devolve o instante da atividade de e-mail mais recente com o runId", () => {
    expect(replySentAt(activities, RUN)?.toISOString()).toBe("2026-10-09T14:00:00.000Z");
    // Ordem do repositório não é pré-requisito.
    expect(replySentAt([...activities].reverse(), RUN)?.toISOString()).toBe(
      "2026-10-09T14:00:00.000Z",
    );
  });

  it("ignora outro runId, atividade sem data e WhatsApp; null sem runId", () => {
    expect(replySentAt(activities, "00000000-0000-4000-8000-0000000000cc")).toBeNull();
    expect(
      replySentAt(
        activities.filter((a) => a.type === "whatsapp"),
        RUN,
      ),
    ).toBeNull();
    expect(
      replySentAt(
        activities.filter((a) => a.data === null),
        RUN,
      ),
    ).toBeNull();
    expect(replySentAt(activities, null)).toBeNull();
    expect(replySentAt([], RUN)).toBeNull();
  });
});
