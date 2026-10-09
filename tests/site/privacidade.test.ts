// Política de privacidade (src/app/(site)/privacidade/page.tsx), seção 6 "Com quem compartilhamos":
// a frase "Enviamos ao fornecedor só o necessário para isso: …; nunca …" é uma lista fechada e
// precisa acompanhar o que src/lib/ai/redact.ts (buildLeadContext e renderLeadContext) e
// src/lib/ai/notes.ts (CNPJ preservado no ditado) mandam ao modelo (ADR-003, seções 5 e 6.4).
// Quem mudar a lista fechada no código revê a política e este teste. A página é renderizada como o
// servidor faz (renderToString), sem banco e sem chave de IA.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrivacidadePage from "@/app/(site)/privacidade/page";

function sectionText(html: string, id: string, nextId: string): string {
  const start = html.indexOf(`id="${id}"`);
  const end = html.indexOf(`id="${nextId}"`);
  expect(start, id).toBeGreaterThan(-1);
  expect(end, nextId).toBeGreaterThan(start);
  return html
    .slice(start, end)
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");
}

const html = renderToString(createElement(PrivacidadePage));
const sharing = sectionText(html, "compartilhamento", "retencao");
const sentence = sharing.match(/Enviamos ao fornecedor só o necessário para isso: [^.]+\./)?.[0];

// O que buildLeadContext leva (ADR-003, 5.1), na linguagem da pessoa.
const SENT = [
  "nome",
  "empresa ou escritório",
  "cidade",
  "segmento e etapa do atendimento",
  "a origem e a classificação interna do contato",
  "regime tributário",
  "faixa de imposto",
  "cargo ou profissão",
  "resultado estimado e arredondado do simulador",
  "mensagem enviada pelo formulário",
  "teor das conversas registradas",
  "estado e a data das suas autorizações",
  "valor aproximado dos patrocínios em andamento",
];

describe("política de privacidade: o que vai ao fornecedor de IA", () => {
  it("a seção 6 cita o fornecedor, a revisão humana e a frase da lista fechada", () => {
    expect(sharing).toContain("inteligência artificial para apoio ao atendimento");
    expect(sharing).toContain("Anthropic");
    expect(sharing).toContain("revisados por uma pessoa da Prospekto");
    expect(sentence).toBeDefined();
  });

  it("enumera cada categoria que buildLeadContext envia", () => {
    for (const item of SENT) expect(sentence, item).toContain(item);
  });

  it("CNPJ vai só no ditado das notas, e a lista do que nunca vai não o nega", () => {
    expect(sentence).toMatch(/quando a equipe o dita nas notas, o CNPJ da empresa/);
    const never = sentence?.slice(sentence.indexOf("; nunca")) ?? "";
    expect(never).toContain("nunca e-mail, telefone, CPF");
    expect(never).toContain("os valores exatos informados no simulador");
    expect(never).toContain("dados bancários");
    expect(never).toContain("identificadores internos");
    expect(never).not.toContain("CNPJ");
  });

  it("a seção 3 continua coerente com a 6 (regime e faixa são dados coletados)", () => {
    const collected = sectionText(html, "dados", "navegacao");
    expect(collected).toContain("regime tributário e faixa de imposto declarados");
  });
});
