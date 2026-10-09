// DictationTools (src/components/crm/ai/dictation.tsx) renderizada com renderToString, como o
// servidor faz: sem Web Speech API (o SSR e o Chromium do Playwright não têm) e sem chave de IA.
// Também garante que o ditado não sai por outro caminho além da Server Action.
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DictationTools, describeEmDias } from "@/components/crm/ai/dictation";
import { notesBody } from "@/components/crm/forms/activity-form";

vi.mock("@/actions/ai-notes", () => ({
  organizeNotesAction: async () => ({ status: "idle" }),
  applyLeadAttributesAction: async () => ({ status: "idle" }),
}));
vi.mock("sonner", () => ({ toast: { success: () => undefined, error: () => undefined } }));

function render(props: Partial<Parameters<typeof DictationTools>[0]> = {}) {
  return renderToString(
    createElement(DictationTools, {
      leadId: "00000000-0000-4000-8000-000000000001",
      segment: "PJ",
      enabled: true,
      textareaId: "f-body",
      ...props,
    }),
  );
}

function dictationSource(): string {
  return readFileSync(path.join(process.cwd(), "src/components/crm/ai/dictation.tsx"), "utf8");
}

// A tag <button> que contém o rótulo (o SVG do ícone fica entre a tag e o texto).
function buttonWith(html: string, label: string): string {
  const at = html.indexOf(label);
  expect(at, label).toBeGreaterThan(-1);
  const start = html.lastIndexOf("<button", at);
  return html.slice(start, html.indexOf(">", start) + 1);
}

describe("DictationTools sem suporte a voz (SSR)", () => {
  it('não renderiza "Ditar" e explica onde o ditado funciona', () => {
    const html = render();
    expect(html).not.toMatch(/>Ditar</);
    expect(html).not.toContain("aria-pressed");
    expect(html).toContain("Ditado disponível no Chrome e no Edge.");
    expect(html).not.toContain("O reconhecimento de voz é do navegador.");
  });

  it('com chave: "Organizar com IA" desabilitado até haver 20 caracteres, com a explicação', () => {
    const html = render({ enabled: true });
    const button = buttonWith(html, "Organizar com IA");
    expect(button).toMatch(/disabled|aria-disabled="true"/);
    expect(button).toContain('type="button"');
    expect(html).toContain("Dite ou escreva pelo menos 20 caracteres para organizar.");
    expect(html).not.toContain("IA não configurada");
    // Sem sugestão ainda: nenhum Callout de resultado.
    expect(html).not.toContain("Sugestão da IA");
  });

  it("a região viva existe vazia desde o primeiro render (anuncia o começo e o fim depois)", () => {
    const html = render();
    expect(html).toContain('<p role="status" class="sr-only"></p>');
    expect(html).not.toContain("Organizando…");
    expect(html).not.toContain("Sugestão pronta");
  });

  it('a região viva do ditado existe vazia desde o primeiro render (anuncia "Ouvindo…" ao ligar)', () => {
    const html = render();
    expect(html).toMatch(/<span role="status" class="sr-only"><\/span>/);
    expect(html).not.toContain("Ouvindo…");
  });
});

describe("ditado e leitor de tela", () => {
  it('"Ditar"/"Parar" é botão de ação (rótulo muda, sem aria-pressed) e o parcial não é região viva', () => {
    const source = dictationSource();
    expect(source).toContain('"Parar" : "Ditar"');
    // Atributo no JSX (o comentário do componente cita o nome para explicar a escolha).
    expect(source).not.toMatch(/aria-pressed=/);
    // O parcial muda a cada palavra enquanto a pessoa fala: só visual, nunca aria-live.
    expect(source).not.toMatch(/aria-live[^>]*>\s*\{interim/);
    expect(source).not.toMatch(/aria-live=/);
    expect(source).toContain('{listening ? "Ouvindo… diga o que aconteceu." : ""}');
  });
});

describe("DictationTools sem chave de IA", () => {
  it('"Organizar com IA" fica desabilitado e focável, com "IA não configurada" para leitor de tela', () => {
    const html = render({ enabled: false });
    const button = buttonWith(html, "Organizar com IA");
    expect(button).toMatch(/disabled|aria-disabled="true"/);
    expect(button).toContain("aria-describedby=");
    expect(html).toContain("IA não configurada.");
    expect(html).not.toContain("pelo menos 20 caracteres");
  });
});

describe("texto aplicado ao formulário", () => {
  it("resumo recebe os combinados ao fim; prazo em dias por extenso", () => {
    expect(notesBody({ resumo: "Liguei.", tarefas: [] })).toBe("Liguei.");
    expect(notesBody({ resumo: "Liguei.", tarefas: ["Enviar proposta", "Pedir ECF"] })).toBe(
      "Liguei.\n\nCombinados: Enviar proposta; Pedir ECF",
    );
    expect(describeEmDias(0)).toBe("hoje");
    expect(describeEmDias(1)).toBe("amanhã");
    expect(describeEmDias(3)).toBe("em 3 dias");
  });
});

describe("nenhum áudio ou texto sai por outro caminho", () => {
  it("dictation.tsx não usa fetch e importa de src/lib/ai/notes só o tipo", () => {
    const source = dictationSource();
    expect(source).not.toContain("fetch(");
    expect(source).not.toMatch(/XMLHttpRequest|WebSocket|MediaRecorder/);
    expect(source).toMatch(/import type \{ Notes \} from "@\/lib\/ai\/notes"/);
    expect(source).not.toMatch(/from "zod"/);
    expect(source).toContain('lang = "pt-BR"');
  });
});
