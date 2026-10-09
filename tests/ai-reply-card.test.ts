// ReplyCard (src/components/crm/ai/reply-card.tsx) renderizado com renderToString, como o servidor
// faz: sem chave de IA, sem rede (as actions são substituídas) e sem relógio do processo. Fixa que
// "hoje" vem do relógio do servidor (prop `now`, igual no SSR e na hidratação) e que o rascunho
// gravado abre no canal registrado em ai_runs.data.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReplyCard, type ReplyCardProps } from "@/components/crm/ai/reply-card";

vi.mock("@/actions/ai-reply", () => ({
  generateReplyAction: async () => ({ status: "idle" }),
  recordWhatsappReplyAction: async () => ({ status: "idle" }),
}));
vi.mock("@/actions/lead-email", () => ({
  sendLeadReplyAction: async () => ({ status: "idle" }),
}));
vi.mock("sonner", () => ({ toast: { success: () => undefined, error: () => undefined } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
}));

const lead: ReplyCardProps["lead"] = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Pessoa Fictícia",
  segment: "PJ",
  pipeline: "patrocinadores",
  stage: "novo",
  emailStatus: "ok",
  hasPhone: false,
};

const RUN_ID = "00000000-0000-4000-8000-0000000000aa";
const WA_HREF = "https://wa.me/5554999999999?text=oi";

function snapshot(over: Partial<NonNullable<ReplyCardProps["initial"]>> = {}) {
  return {
    runId: RUN_ID,
    model: "claude-opus-5-5",
    // 09:00 de 08/10/2026 em São Paulo.
    createdAt: "2026-10-08T12:00:00Z",
    output: { assunto: "Oi", texto: "x".repeat(30), horarios_incluidos: [] },
    ...over,
  };
}

function render(props: Partial<ReplyCardProps> = {}) {
  return renderToString(
    createElement(ReplyCard, {
      lead,
      enabled: true,
      initial: snapshot(),
      slots: [],
      canEmail: true,
      emailBlockReason: null,
      whatsappHref: null,
      now: "2026-10-09T12:00:00Z",
      ...props,
    }),
  );
}

const STALE = "os horários propostos podem ter passado";
const channelInput = (channel: string) => new RegExp(`name="channel" value="${channel}"`);

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

describe("ReplyCard: rascunho de outro dia", () => {
  it("compara a data do rascunho com o relógio do servidor (prop now), não com o do processo", () => {
    expect(render({ now: "2026-10-09T12:00:00Z" })).toContain(STALE);
    expect(render({ now: "2026-10-08T15:00:00Z" })).not.toContain(STALE);
  });

  it("a virada do dia civil é a de São Paulo (UTC-3)", () => {
    // 02:00Z ainda é 23:00 de 08/10 em São Paulo; 03:00Z já é 09/10.
    expect(render({ now: "2026-10-09T02:00:00Z" })).not.toContain(STALE);
    expect(render({ now: "2026-10-09T03:00:00Z" })).toContain(STALE);
  });
});

describe("ReplyCard: canal do rascunho gravado", () => {
  const withPhone = { lead: { ...lead, hasPhone: true }, whatsappHref: WA_HREF };

  it("ai_runs.data.channel manda, mesmo que o assunto venha preenchido", () => {
    const html = render({
      ...withPhone,
      initial: snapshot({ data: { channel: "whatsapp" } }),
    });
    expect(html).toMatch(channelInput("whatsapp"));
    expect(html).toContain("Abrir no WhatsApp");
    expect(html).not.toContain('id="f-replySubject"');
  });

  it("sem data (linha antiga): assunto null é WhatsApp e assunto preenchido é e-mail", () => {
    const whatsapp = render({
      ...withPhone,
      initial: snapshot({
        output: { assunto: null, texto: "y".repeat(30), horarios_incluidos: [] },
      }),
    });
    expect(whatsapp).toMatch(channelInput("whatsapp"));
    expect(whatsapp).toContain("Abrir no WhatsApp");

    const email = render({ ...withPhone, initial: snapshot() });
    expect(email).toMatch(channelInput("email"));
    expect(email).toContain('id="f-replySubject"');
    expect(email).toContain('value="Oi"');
    expect(email).toContain("Enviar por e-mail");
  });
});

describe("ReplyCard: botão de gerar", () => {
  it('sem chave: desabilitado mas focável, descrito por "IA não configurada."', () => {
    const html = render({ enabled: false, initial: null });
    const button = buttonWith(html, "Gerar rascunho");
    expect(button).toContain('aria-disabled="true"');
    expect(button).not.toMatch(DISABLED_ATTR);
    expect(describedText(html, button)).toBe("IA não configurada.");
  });

  it("com chave e sem rascunho: habilitado, sem descrição", () => {
    const button = buttonWith(render({ initial: null }), "Gerar rascunho");
    expect(button).not.toContain('aria-disabled="true"');
    expect(button).not.toMatch(DISABLED_ATTR);
    expect(button).not.toContain("aria-describedby");
  });
});

describe("ReplyCard: botão de envio", () => {
  it("mensagem curta: bloqueado e descrito pela dica de preenchimento", () => {
    const html = render({
      initial: snapshot({ output: { assunto: "Oi", texto: "curta", horarios_incluidos: [] } }),
    });
    const button = buttonWith(html, "Enviar por e-mail");
    expect(button).toMatch(DISABLED_ATTR);
    expect(describedText(html, button)).toBe(
      "Preencha o assunto e uma mensagem com pelo menos 20 caracteres.",
    );
  });

  it("rascunho completo: habilitado, sem dica", () => {
    const html = render();
    const button = buttonWith(html, "Enviar por e-mail");
    expect(button).not.toMatch(DISABLED_ATTR);
    expect(button).not.toContain("aria-describedby");
    expect(html).not.toContain("Preencha o assunto");
  });
});

describe("ReplyCard: região viva", () => {
  // O estado `pending` não existe em renderToString; "Gerando o rascunho…" só é verificado por
  // ausência e a sonda em 390 px mede a altura real dos botões.
  it("existe vazia desde o primeiro render, com ou sem rascunho gravado", () => {
    for (const html of [render({ initial: null }), render(), render({ enabled: false })]) {
      expect(html).toContain(LIVE_EMPTY);
      expect(html).not.toContain("Gerando o rascunho…");
      expect(html).not.toContain("Rascunho pronto.");
    }
  });
});
