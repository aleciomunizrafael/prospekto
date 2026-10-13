// Cartões da lista de prospecção e índice de listas renderizados com renderToString, como o
// servidor faz: actions, sonner e o router são substituídos. Fixa o link real do nome, o "Ligar"
// com tel: e o número formatado, "sem telefone", o badge com texto e "retorna …", o agrupamento
// por segmento, o Meter com texto e a ausência de chaves de enum no texto visível (P20).
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  ItemCards,
  type ItemCardItem,
  type ItemCardsContext,
} from "@/components/crm/prospecting/item-cards";
import { ListTable } from "@/components/crm/prospecting/list-table";
import type { ProspectingListSummary } from "@/lib/repos/prospecting";

vi.mock("@/actions/prospecting", () => {
  const idle = async () => ({ status: "idle" });
  return {
    recordCallResultAction: idle,
    recordWhatsappSentAction: idle,
    convertProspectingItemAction: idle,
    deleteItemAction: idle,
    updateItemFieldAction: idle,
  };
});
vi.mock("sonner", () => ({ toast: { success: () => undefined, error: () => undefined } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
}));

const LIST_ID = "00000000-0000-4000-8000-00000000000a";
const NOW = "2026-10-13T12:00:00.000Z";

function item(overrides: Partial<ItemCardItem> & { id: string; name: string }): ItemCardItem {
  return {
    segment: null,
    phone: null,
    hook: null,
    address: null,
    size: null,
    info: null,
    status: "a_ligar",
    notes: null,
    callbackAt: null,
    whatsappSentAt: null,
    leadId: null,
    ...overrides,
  };
}

const ctx: ItemCardsContext = {
  listId: LIST_ID,
  now: NOW,
  users: [{ value: "u1", label: "Daniela Demo" }],
  defaultOwnerUserId: "u1",
  defaultMeetingAt: "2026-10-14T10:00",
  defaultCallbackAt: "2026-10-15",
  discardReasons: {},
};

const items: ItemCardItem[] = [
  item({ id: "i1", name: "Sem Segmento Ltda", phone: "+5554990000001", hook: "Abriram loja." }),
  item({
    id: "i2",
    name: "Vinícola Exemplo",
    segment: "Vinícolas",
    phone: "+555430000000",
    address: "Vale dos Vinhedos",
    size: "Média",
    status: "retornar",
    callbackAt: "2026-10-16",
    notes: "Falar com o financeiro.",
  }),
  item({ id: "i3", name: "Cantina Exemplar", segment: "Vinícolas", status: "descartado" }),
  item({
    id: "i4",
    name: "Metalúrgica Modelo",
    segment: "Metalúrgicas",
    phone: "+5554990000005",
    status: "reuniao_marcada",
    leadId: "00000000-0000-4000-8000-00000000000b",
    whatsappSentAt: "2026-10-11T12:00:00.000Z",
  }),
];

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("ItemCards", () => {
  const html = renderToString(createElement(ItemCards, { items, ctx }));
  const visible = text(html);

  it("nome é link real para a ficha e o Ligar é tel: com o número formatado", () => {
    expect(html).toContain(`href="/app/prospeccao/${LIST_ID}/i1"`);
    expect(html).toContain('href="tel:+5554990000001"');
    expect(visible).toContain("Ligar (54) 99000-0001");
    expect(visible).toContain("Ligar (54) 3000-0000");
  });

  it("sem telefone mostra o texto no lugar de Ligar e WhatsApp, e os resultados continuam", () => {
    const card = html.slice(html.indexOf("Cantina Exemplar"), html.indexOf("Metalúrgica Modelo"));
    expect(text(card)).toContain("sem telefone");
    expect(card).not.toContain('href="tel:');
    expect(text(card)).toContain("Voltar para a ligar");
  });

  it("badge com texto e a data do retorno; WhatsApp aberto há 2 d; Ver lead quando convertido", () => {
    expect(visible).toContain("Retornar · retorna sex., 16 de out.");
    expect(visible).toContain("Reunião marcada");
    expect(visible).toContain("WhatsApp · aberto há 2 d");
    expect(html).toContain('href="/app/leads/00000000-0000-4000-8000-00000000000b"');
    expect(visible).toContain("Ver lead");
  });

  it("agrupa por segmento com os sem segmento primeiro e sem cabeçalho", () => {
    const first = html.indexOf("Sem Segmento Ltda");
    const vinicolas = html.indexOf(">Vinícolas<");
    const metal = html.indexOf(">Metalúrgicas<");
    expect(first).toBeGreaterThan(-1);
    expect(vinicolas).toBeGreaterThan(first);
    expect(metal).toBeGreaterThan(vinicolas);
    expect(html).toContain('aria-label="Sem segmento"');
    // O primeiro cabeçalho de segmento vem depois do item sem segmento.
    expect(html.indexOf("crm-eyebrow")).toBeGreaterThan(first);
  });

  it("mostra abertura, endereço · porte e anotação; botões clicáveis acima do link do nome", () => {
    expect(visible).toContain("Abriram loja.");
    expect(visible).toContain("Vale dos Vinhedos · Média");
    expect(visible).toContain("Falar com o financeiro.");
    expect(html).toMatch(/row-link/);
    const telTag = html.match(/<a [^>]*href="tel:\+5554990000001"[^>]*>/)?.[0] ?? "";
    expect(telTag).toContain("z-10");
  });

  it("não expõe chaves de enum no texto visível (P20)", () => {
    expect(visible).not.toMatch(/\b(a_ligar|sem_resposta|reuniao_marcada|descartado|retornar)\b/);
  });
});

describe("ListTable", () => {
  const lists: ProspectingListSummary[] = [
    {
      id: LIST_ID,
      tenantId: "t",
      name: "Vinícolas do Vale",
      region: "Bento Gonçalves/RS",
      notes: null,
      sourceDetail: "busca pública",
      assigneeUserId: "u1",
      createdByUserId: "u1",
      createdAt: new Date("2026-10-01T12:00:00Z"),
      updatedAt: new Date("2026-10-01T12:00:00Z"),
      total: 50,
      contacted: 12,
      meetings: 3,
      assigneeName: "Daniela Demo",
    },
    {
      id: "00000000-0000-4000-8000-00000000000c",
      tenantId: "t",
      name: "Sem ninguém",
      region: null,
      notes: null,
      sourceDetail: "indicação",
      assigneeUserId: null,
      createdByUserId: null,
      createdAt: new Date("2026-10-02T12:00:00Z"),
      updatedAt: new Date("2026-10-02T12:00:00Z"),
      total: 0,
      contacted: 0,
      meetings: 0,
      assigneeName: null,
    },
  ];
  const html = renderToString(createElement(ListTable, { lists, empty: "vazio" }));
  const visible = text(html);

  it("link real da lista, Meter com texto, responsável e reuniões", () => {
    expect(html).toContain(`href="/app/prospeccao/${LIST_ID}"`);
    expect(visible).toContain("12/50 contatadas");
    expect(html).toContain('role="progressbar"');
    expect(visible).toContain("Daniela Demo");
    expect(visible).toContain("sem responsável");
    expect(visible).toContain("Bento Gonçalves/RS");
    expect(visible).toContain("—");
  });

  it("vazio renderiza o conteúdo passado", () => {
    expect(renderToString(createElement(ListTable, { lists: [], empty: "nada aqui" }))).toContain(
      "nada aqui",
    );
  });
});
