// BriefCard (src/components/crm/ai/brief-card.tsx) renderizado com renderToString, como o servidor
// faz: sem chave de IA e sem rede (a action é substituída). Fixa a acessibilidade do cartão: nome
// acessível das perguntas, botão bloqueado focável e descrito, região viva montada desde o início.
// O estado `pending` não existe em renderToString (useActionState nunca dispara no servidor), por
// isso "Gerando o briefing…" só é verificado por ausência; a sonda em 390 px mede a altura real.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BriefCard, type BriefCardProps } from "@/components/crm/ai/brief-card";

vi.mock("@/actions/ai-brief", () => ({
  generateBriefAction: async () => ({ status: "idle" }),
}));
vi.mock("sonner", () => ({ toast: { success: () => undefined, error: () => undefined } }));

const LEAD_ID = "00000000-0000-4000-8000-000000000001";
const RUN_ID = "00000000-0000-4000-8000-0000000000aa";

const snapshot: NonNullable<BriefCardProps["initial"]> = {
  runId: RUN_ID,
  model: "modelo-de-teste",
  createdAt: "2026-10-08T12:00:00Z",
  output: {
    resumo: "Lead fictício de teste.",
    gancho_abertura: "Vi que vocês apoiam cultura.",
    pontos_atencao: ["Sem resposta há 10 dias"],
    perguntas: ["Quem decide o patrocínio?", "A empresa é tributada pelo lucro real?"],
    objecoes_provaveis: [],
    proximo_passo: { acao: "Ligar", prazo: "hoje" },
    lacunas: [],
  },
};

function render(props: Partial<BriefCardProps> = {}) {
  return renderToString(
    createElement(BriefCard, { leadId: LEAD_ID, enabled: true, initial: null, ...props }),
  );
}

// A tag <button> que contém o rótulo (o SVG do ícone fica entre a tag e o texto).
function buttonWith(html: string, label: string): string {
  const at = html.indexOf(label);
  expect(at, label).toBeGreaterThan(-1);
  const start = html.lastIndexOf("<button", at);
  return html.slice(start, html.indexOf(">", start) + 1);
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Texto do elemento apontado por aria-describedby.
function describedText(html: string, tag: string): string {
  const id = tag.match(/aria-describedby="([^"]+)"/)?.[1];
  expect(id, tag).toBeTruthy();
  const match = html.match(new RegExp(`id="${escapeRegExp(id!)}"[^>]*>([\\s\\S]*?)</`));
  expect(match, `elemento com id ${id}`).not.toBeNull();
  // React separa nós de texto adjacentes com <!-- --> no SSR.
  return match![1].replace(/<!--.*?-->/g, "").trim();
}

// Atributo `disabled` de verdade (a lista de classes também contém "disabled:…").
const DISABLED_ATTR = /\sdisabled(=""|\s|>)/;

const LIVE_EMPTY = '<p role="status" class="sr-only"></p>';

describe("BriefCard: perguntas a fazer", () => {
  it("cada caixa tem como nome acessível o texto da pergunta (label envolvente, sem aria-label)", () => {
    const html = render({ initial: snapshot });
    const inputs = html.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? [];
    expect(inputs).toHaveLength(2);
    for (const input of inputs) expect(input).not.toContain("aria-label");
    // O nome vem do <label> envolvente: "N. pergunta" (sem os <!-- --> do SSR entre nós de texto).
    const labels = html.replace(/<!--.*?-->/g, "").match(/<label[^>]*>[\s\S]*?<\/label>/g) ?? [];
    expect(labels).toHaveLength(2);
    expect(labels[0]).toContain('<input type="checkbox"');
    expect(labels[0]).toContain("1.</span> Quem decide o patrocínio?");
    expect(labels[1]).toContain("2.</span> A empresa é tributada pelo lucro real?");
    // Linha de 44 px no celular (crm-design-system.md, seção 9), como o CheckboxField.
    expect(html).toMatch(/<label class="[^"]*min-h-11[^"]*"[^>]*><input[^>]*type="checkbox"/);
  });
});

describe("BriefCard: botão de gerar", () => {
  it('sem chave: desabilitado mas focável, descrito por "IA não configurada."', () => {
    const html = render({ enabled: false });
    const button = buttonWith(html, "Gerar briefing");
    expect(button).toContain('aria-disabled="true"');
    expect(button).not.toMatch(DISABLED_ATTR);
    expect(describedText(html, button)).toBe("IA não configurada.");
  });

  it("com chave e sem briefing: habilitado, sem descrição", () => {
    const button = buttonWith(render(), "Gerar briefing");
    expect(button).not.toContain('aria-disabled="true"');
    expect(button).not.toMatch(DISABLED_ATTR);
    expect(button).not.toContain("aria-describedby");
  });

  it('com briefing gravado: "Gerar de novo" e o gancho com "Copiar"', () => {
    const html = render({ initial: snapshot });
    expect(buttonWith(html, "Gerar de novo")).not.toContain('aria-disabled="true"');
    expect(html).toContain("Vi que vocês apoiam cultura.");
    expect(buttonWith(html, "Copiar")).toContain('type="button"');
  });
});

describe("BriefCard: região viva", () => {
  it("existe vazia desde o primeiro render, com ou sem briefing gravado", () => {
    for (const html of [render(), render({ initial: snapshot }), render({ enabled: false })]) {
      expect(html).toContain(LIVE_EMPTY);
      expect(html).not.toContain("Gerando o briefing…");
      expect(html).not.toContain("Briefing pronto.");
    }
  });
});
