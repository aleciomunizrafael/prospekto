// ReplyCard (src/components/crm/ai/reply-card.tsx) renderizado com renderToString, como o servidor
// faz: sem chave de IA, sem rede (as actions são substituídas) e sem relógio do processo. Fixa que
// "hoje" vem do relógio do servidor (prop `now`, igual no SSR e na hidratação) e que o rascunho
// gravado abre no canal registrado em ai_runs.data.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReplyCard, type ReplyCardProps } from "@/components/crm/ai/reply-card";
import { proposeSlots } from "@/lib/ai/qualification";
import { REPLY_LIMITS } from "@/lib/ai/reply";
import { formatDateTime } from "@/lib/crm/format";

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

// React separa nós de texto adjacentes com <!-- --> no SSR; aqui o HTML volta sem eles.
function render(props: Partial<ReplyCardProps> = {}) {
  return renderToString(
    createElement(ReplyCard, {
      lead,
      enabled: true,
      initial: snapshot(),
      initialSentAt: null,
      slots: [],
      canEmail: true,
      emailBlockReason: null,
      whatsappHref: null,
      now: "2026-10-09T12:00:00Z",
      ...props,
    }),
  ).replace(/<!--.*?-->/g, "");
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

// Botões role="radio" do seletor de canal: atributos e conteúdo de cada um.
function radios(html: string): { attrs: string; inner: string }[] {
  return [...html.matchAll(/<button([^>]*role="radio"[^>]*)>([\s\S]*?)<\/button>/g)].map((m) => ({
    attrs: m[1],
    inner: m[2],
  }));
}

// Valor do textarea da mensagem (conteúdo entre as tags, com as entidades do SSR).
function textareaValue(html: string): string {
  const match = html.match(/<textarea[^>]*id="f-replyText"[^>]*>([\s\S]*?)<\/textarea>/);
  expect(match, "textarea").not.toBeNull();
  return match![1];
}

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

describe("ReplyCard: rascunho de outro dia com horários no texto (F15)", () => {
  // Gerado na sexta 09/10/2026 (propõe segunda 12 e terça 13); aberto na segunda 12/10 às 11h
  // de São Paulo, quando proposeSlots dá terça 13 às 10h e quarta 14 às 15h.
  const MONDAY = "2026-10-12T14:00:00Z";
  const slots = proposeSlots(new Date(MONDAY));
  const OLD = ["segunda-feira, 12 de outubro, às 10h", "terça-feira, 13 de outubro, às 15h"];
  const texto = `Olá, Pessoa.\n\nTenho horários ${OLD[0]} e ${OLD[1]}. Qual prefere?\n\nDaniela`;
  const friday = (horarios: string[], body = texto) =>
    snapshot({
      createdAt: "2026-10-09T15:00:00Z",
      output: { assunto: "Oi", texto: body, horarios_incluidos: horarios },
    });

  it("troca os rótulos antigos pelos de hoje no texto, na linha de horários e no aviso", () => {
    expect(slots.map((s) => s.label)).toEqual([
      "terça-feira, 13 de outubro, às 10h",
      "quarta-feira, 14 de outubro, às 15h",
    ]);
    const html = render({ initial: friday(OLD), slots, now: MONDAY });
    expect(html).toContain(
      "Rascunho de 09/10/2026: os horários foram atualizados para terça-feira, 13 de outubro, às 10h e quarta-feira, 14 de outubro, às 15h. Confira o texto antes de enviar.",
    );
    expect(html).not.toContain(STALE);
    const value = textareaValue(html);
    expect(value).toContain("terça-feira, 13 de outubro, às 10h");
    expect(value).toContain("quarta-feira, 14 de outubro, às 15h");
    expect(value).not.toContain("12 de outubro");
    expect(html).toContain(
      "Horários propostos: terça-feira, 13 de outubro, às 10h · quarta-feira, 14 de outubro, às 15h",
    );
    // O envio continua possível: o texto é editável e já bate com a próxima ação.
    const button = buttonWith(html, "Enviar por e-mail");
    expect(button).not.toMatch(DISABLED_ATTR);
  });

  it("sem os rótulos no texto, mantém o texto e o aviso de que os horários podem ter passado", () => {
    const body = "Olá, Pessoa.\n\nPodemos conversar amanhã às 10h?\n\nDaniela";
    const html = render({
      initial: friday(["quinta-feira, 8 de outubro, às 10h"], body),
      slots,
      now: MONDAY,
    });
    expect(html).toContain(STALE);
    expect(html).not.toContain("os horários foram atualizados");
    expect(textareaValue(html)).toContain("Podemos conversar amanhã às 10h?");
    expect(textareaValue(html)).not.toContain("13 de outubro");
    expect(html).toContain("Horários propostos: quinta-feira, 8 de outubro, às 10h");
    expect(buttonWith(html, "Enviar por e-mail")).not.toMatch(DISABLED_ATTR);
  });

  it("rascunho de hoje não muda nada", () => {
    const html = render({
      initial: snapshot({
        createdAt: "2026-10-12T12:00:00Z",
        output: { assunto: "Oi", texto, horarios_incluidos: OLD },
      }),
      slots,
      now: MONDAY,
    });
    expect(html).not.toContain("Rascunho de");
    expect(textareaValue(html)).toContain("segunda-feira, 12 de outubro, às 10h");
    expect(html).toContain(`Horários propostos: ${OLD[0]} · ${OLD[1]}`);
  });
});

describe("ReplyCard: e-mail já enviado com o rascunho (F16)", () => {
  it("abre com a nota datada no lugar do botão quando a página informa o envio", () => {
    const sentAt = "2026-10-09T13:05:00Z";
    const html = render({ initialSentAt: sentAt });
    expect(html).toContain(
      `E-mail enviado em ${formatDateTime(sentAt)} e registrado na linha do tempo. Edite o texto ou gere de novo para enviar outro.`,
    );
    expect(html).toContain("09/10/2026, 10:05");
    expect(html).not.toContain("Enviar por e-mail");
  });

  it("sem envio registrado, o botão aparece e a nota não", () => {
    const html = render({ initialSentAt: null });
    expect(html).toContain("Enviar por e-mail");
    expect(html).not.toContain("E-mail enviado em");
  });
});

describe("ReplyCard: contagem de caracteres do WhatsApp (F20)", () => {
  const withPhone = { lead: { ...lead, hasPhone: true }, whatsappHref: WA_HREF };
  const whatsapp = (length: number) =>
    snapshot({
      output: {
        assunto: null,
        texto: "x".repeat(length),
        horarios_incluidos: ["segunda-feira, 12 de outubro, às 10h"],
      },
    });
  const HELP_ID = "f-replyText-ajuda";

  it("acima do teto: contagem com o limite, em aviso, ligada ao campo", () => {
    const html = render({ ...withPhone, initial: whatsapp(950), now: "2026-10-08T15:00:00Z" });
    const textarea = html.match(/<textarea[^>]*id="f-replyText"[^>]*>/)?.[0] ?? "";
    expect(textarea).toContain(`aria-describedby="${HELP_ID}"`);
    const help = describedText(html, textarea);
    expect(help).toContain(`950 de ${REPLY_LIMITS.whatsappChars} caracteres`);
    expect(help).toContain("passa de uma tela de celular");
    expect(help).toContain("text-warning");
    const horarios = html.match(/Horários propostos:[^<]*/)?.[0] ?? "";
    expect(horarios).toContain("segunda-feira, 12 de outubro, às 10h");
    expect(horarios).not.toContain("caracteres");
  });

  it("dentro do teto: só a contagem com o limite, sem aviso", () => {
    const html = render({ ...withPhone, initial: whatsapp(500), now: "2026-10-08T15:00:00Z" });
    const textarea = html.match(/<textarea[^>]*id="f-replyText"[^>]*>/)?.[0] ?? "";
    expect(describedText(html, textarea)).toBe("500 de 900 caracteres");
    expect(html).not.toContain("text-warning");
  });

  it("no e-mail a ajuda é a do CRM, sem contagem", () => {
    const html = render({ ...withPhone, now: "2026-10-08T15:00:00Z" });
    expect(html).toContain("O CRM acrescenta nome completo, empresa e contatos ao enviar.");
    expect(html).not.toContain("de 900");
  });
});

describe("ReplyCard: canal WhatsApp sem telefone (F23)", () => {
  it("a opção fica visível, desabilitada e descrita pela nota", () => {
    const html = render({ lead: { ...lead, hasPhone: false } });
    const all = radios(html);
    expect(all).toHaveLength(2);
    const whatsapp = all.find((r) => r.inner.includes("WhatsApp"));
    expect(whatsapp).toBeDefined();
    expect(whatsapp!.attrs).toContain('aria-disabled="true"');
    expect(whatsapp!.attrs).not.toMatch(DISABLED_ATTR);
    expect(whatsapp!.attrs).toContain('tabindex="-1"');
    const noteId = whatsapp!.attrs.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(noteId).toBeTruthy();
    const note = html.match(new RegExp(`<p id="${escapeRegExp(noteId!)}"[^>]*>([^<]*)</p>`));
    expect(note?.[1]).toBe("WhatsApp indisponível: cadastre o telefone em Contato.");
    const email = all.find((r) => r.inner.includes("E-mail"));
    expect(email!.attrs).toContain('aria-checked="true"');
    expect(email!.attrs).not.toContain('aria-disabled="true"');
  });

  it("com telefone, as duas opções ficam habilitadas e não há nota", () => {
    const html = render({ lead: { ...lead, hasPhone: true }, whatsappHref: WA_HREF });
    const all = radios(html);
    expect(all).toHaveLength(2);
    for (const r of all) expect(r.attrs).not.toContain('aria-disabled="true"');
    expect(html).not.toContain("WhatsApp indisponível");
  });
});
