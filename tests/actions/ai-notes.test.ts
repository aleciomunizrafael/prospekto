// Server Actions de "Ditar e organizar" (src/actions/ai-notes.ts) contra PGlite, com o SDK da
// Anthropic substituído (nenhum teste chama a rede) e a chave injetada por vi.stubEnv: o módulo
// é recarregado a cada teste porque src/env.ts lê process.env ao importar.
import { eq } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { aiRuns } from "@/lib/db/schema";
import { initialAiActionState } from "@/lib/ai/types";
import { initialCrmActionState } from "@/lib/crm/action-state";
import { toDateTimeLocal } from "@/lib/crm/format";
import { listActivities } from "@/lib/repos/activities";
import type { Ctx } from "@/lib/repos/ctx";
import { createLead, getLead } from "@/lib/repos/leads";
import { makeTenant, uniqueEmail } from "../helpers";

const sdk = vi.hoisted(() => ({ create: vi.fn() }));
const session = vi.hoisted(() => ({ ctx: null as Ctx | null }));

vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status: number | undefined;
    constructor(status?: number, message = "erro da api") {
      super(message);
      this.status = status;
    }
  }
  class AuthenticationError extends APIError {}
  class PermissionDeniedError extends APIError {}
  class RateLimitError extends APIError {}
  class Anthropic {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static PermissionDeniedError = PermissionDeniedError;
    static RateLimitError = RateLimitError;
    beta = { messages: { create: sdk.create } };
  }
  return {
    default: Anthropic,
    APIError,
    AuthenticationError,
    PermissionDeniedError,
    RateLimitError,
  };
});

vi.mock("@anthropic-ai/sdk/helpers/beta/zod", () => ({
  betaZodOutputFormat: (schema: unknown) => ({ type: "json_schema", schema }),
}));

vi.mock("@/lib/session", () => ({
  requireSession: async () => {
    if (!session.ctx) throw new Error("REDIRECT:/entrar");
    return { ...session.ctx, role: "owner" };
  },
}));
vi.mock("next/cache", () => ({
  refresh: () => undefined,
  revalidatePath: () => undefined,
  updateTag: () => undefined,
}));

const EMAIL = "contador@example.test";
const RELATO = `Liguei para o Rodrigo hoje à tarde. O contador dele, que atende no ${EMAIL} ou no (54) 98403-2180, confirmou que a empresa está no lucro real e apura trimestral. CNPJ da empresa 55.667.788/0001-86. Combinamos que mando a proposta em três dias e ele conversa com o sócio.`;

function parsedOutput(over: Record<string, unknown> = {}) {
  return {
    tipo: "ligacao",
    assunto: "Ligação: contador confirma lucro real.",
    resumo: "Liguei para o Rodrigo. O contador confirmou lucro real e apuração trimestral.",
    proxima_acao: { descricao: "Enviar proposta", em_dias: 3 },
    tarefas: ["Enviar proposta", "Rodrigo conversa com o sócio"],
    campos_extraidos: [
      { chave: "regime_tributario", valor: "lucro_real" },
      { chave: "apuracao", valor: "trimestral" },
      { chave: "cnpj", valor: "55.667.788/0001-86" },
    ],
    incertezas: [],
    ...over,
  };
}

function response(parsed: Record<string, unknown> | null = parsedOutput()) {
  return {
    id: "msg_teste",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    stop_reason: parsed ? "end_turn" : "refusal",
    stop_details: parsed ? null : { category: "general_harms" },
    // A saída estruturada chega como JSON num bloco de texto (client.beta.messages.create).
    content: parsed ? [{ type: "text", text: JSON.stringify(parsed), citations: null }] : [],
    usage: {
      input_tokens: 1500,
      output_tokens: 400,
      cache_read_input_tokens: 1100,
      cache_creation_input_tokens: 0,
      iterations: null,
    },
  };
}

// Recarrega src/actions/ai-notes.ts (e, por dentro, src/lib/ai/client.ts e src/env.ts).
async function loadActions() {
  vi.resetModules();
  return import("@/actions/ai-notes");
}

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

let ctx: Ctx;

beforeAll(async () => {
  ctx = await makeTenant();
  session.ctx = ctx;
});

beforeEach(() => {
  sdk.create.mockReset();
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-teste");
  vi.stubEnv("AI_MODEL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function newLead(segment: "PJ" | "CONT" = "PJ") {
  const { lead } = await createLead(ctx, {
    segment,
    interest: "rouanet",
    name: "Rodrigo Pasqualotto",
    email: uniqueEmail("notas"),
    phone: "(54) 98403-2180",
    source: "linkedin",
    attributes: segment === "PJ" ? { empresa: "Rede Farmácias Vale" } : { escritorio: "Serra" },
  });
  return lead;
}

describe("guarda de sessão", () => {
  it("sem sessão as duas actions falham antes de tocar no banco ou no SDK", async () => {
    const { organizeNotesAction, applyLeadAttributesAction } = await loadActions();
    session.ctx = null;
    try {
      await expect(
        organizeNotesAction(initialAiActionState, fd({ leadId: "x", text: RELATO })),
      ).rejects.toThrow("REDIRECT:/entrar");
      await expect(
        applyLeadAttributesAction(initialCrmActionState, fd({ leadId: "x", attributes: "{}" })),
      ).rejects.toThrow("REDIRECT:/entrar");
    } finally {
      session.ctx = ctx;
    }
    expect(sdk.create).not.toHaveBeenCalled();
  });
});

describe("organizeNotesAction", () => {
  it("envia o relato mascarado (CNPJ preservado) com o system do segmento e effort medium", async () => {
    sdk.create.mockResolvedValueOnce(response());
    const lead = await newLead("PJ");
    const { organizeNotesAction } = await loadActions();
    const state = await organizeNotesAction(
      initialAiActionState,
      fd({ leadId: lead.id, text: RELATO }),
    );
    expect(state.status).toBe("ok");
    expect(sdk.create).toHaveBeenCalledTimes(1);
    const params = sdk.create.mock.calls[0][0];
    expect(params.output_config.effort).toBe("medium");
    expect(params.max_tokens).toBe(4000);
    expect("thinking" in params).toBe(false);
    const system: string = params.system[0].text;
    expect(params.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(system).toContain("regime_tributario");
    expect(system).toContain("lucro_real");
    expect(system).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(system).not.toContain("Rodrigo");
    expect(system).not.toContain(lead.id);
    const user: string = params.messages[0].content;
    expect(user.startsWith("Hoje é ")).toBe(true);
    expect(user).toContain("[e-mail]");
    expect(user).toContain("[telefone]");
    expect(user).not.toContain("example.test");
    expect(user).not.toContain("98403");
    expect(user).toContain("55.667.788/0001-86");
    expect(user).toContain("Nome: Rodrigo\n");
    expect(user).not.toContain("Pasqualotto");
    expect(user).toContain("Empresa ou organização: Rede Farmácias Vale");
    // Esquema dinâmico: só as chaves de PJ sem o art. 27.
    const schema = params.output_config.format.schema;
    const keys: string[] = schema.shape.campos_extraidos.element.shape.chave.options;
    expect(keys).toContain("regime_tributario");
    expect(keys.some((k) => k.startsWith("vinculo_art27"))).toBe(false);
    // Execução registrada em ai_runs com o lead.
    const runs = await db.select().from(aiRuns).where(eq(aiRuns.leadId, lead.id));
    expect(runs).toHaveLength(1);
    expect(runs[0].kind).toBe("notes");
    expect(runs[0].status).toBe("ok");
    expect(runs[0].tenantId).toBe(ctx.tenantId);
    if (state.status !== "ok") return;
    expect(state.runId).toBe(runs[0].id);
  });

  it("devolve a sugestão normalizada: campos validados, próxima ação às 09:00 e tarefas", async () => {
    sdk.create.mockResolvedValueOnce(response());
    const lead = await newLead("PJ");
    const { organizeNotesAction } = await loadActions();
    const state = await organizeNotesAction(
      initialAiActionState,
      fd({ leadId: lead.id, text: RELATO }),
    );
    expect(state.status).toBe("ok");
    if (state.status !== "ok") return;
    expect(state.data.tipo).toBe("ligacao");
    expect(state.data.assunto).toBe("Ligação: contador confirma lucro real");
    expect(state.data.tarefas).toEqual(["Enviar proposta", "Rodrigo conversa com o sócio"]);
    expect(state.data.campos.map((c) => [c.chave, c.valor])).toEqual([
      ["regime_tributario", "lucro_real"],
      ["apuracao", "trimestral"],
      ["cnpj", "55667788000186"],
    ]);
    expect(state.data.campos[0].valorRotulo).toBe("Lucro real");
    expect(state.data.proximaAcao?.emDias).toBe(3);
    expect(toDateTimeLocal(new Date(state.data.proximaAcao!.at))).toMatch(/T09:00$/);
    expect(state.data.incertezas).toEqual([]);
  });

  it("valor inválido num campo chega à tela em incertezas, sem o campo", async () => {
    sdk.create.mockResolvedValueOnce(
      response(
        parsedOutput({
          campos_extraidos: [{ chave: "regime_tributario", valor: "lucro real" }],
          incertezas: ["Não ficou claro se o contador participa"],
        }),
      ),
    );
    const lead = await newLead("PJ");
    const { organizeNotesAction } = await loadActions();
    const state = await organizeNotesAction(
      initialAiActionState,
      fd({ leadId: lead.id, text: RELATO }),
    );
    expect(state.status).toBe("ok");
    if (state.status !== "ok") return;
    expect(state.data.campos).toEqual([]);
    expect(state.data.incertezas).toEqual([
      "Não ficou claro se o contador participa",
      "Valor não reconhecido para Regime tributário: 'lucro real'",
    ]);
  });

  it("texto curto, lead inexistente e lead de outro tenant falham antes de chamar o SDK", async () => {
    const lead = await newLead("PJ");
    const { organizeNotesAction } = await loadActions();
    const short = await organizeNotesAction(
      initialAiActionState,
      fd({ leadId: lead.id, text: "oi" }),
    );
    expect(short).toEqual({
      status: "error",
      reason: "error",
      message: "Dite ou escreva pelo menos 20 caracteres antes de organizar.",
    });
    const missing = await organizeNotesAction(
      initialAiActionState,
      fd({ leadId: "00000000-0000-4000-8000-000000000009", text: RELATO }),
    );
    expect(missing).toMatchObject({ status: "error", message: "Lead não encontrado." });
    const other = await makeTenant();
    session.ctx = other;
    try {
      const foreign = await organizeNotesAction(
        initialAiActionState,
        fd({ leadId: lead.id, text: RELATO }),
      );
      expect(foreign).toMatchObject({ status: "error", message: "Lead não encontrado." });
    } finally {
      session.ctx = ctx;
    }
    expect(sdk.create).not.toHaveBeenCalled();
  });

  it("sem chave devolve disabled sem chamar o SDK; recusa vira refusal com mensagem pronta", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const lead = await newLead("PJ");
    let mod = await loadActions();
    const disabled = await mod.organizeNotesAction(
      initialAiActionState,
      fd({ leadId: lead.id, text: RELATO }),
    );
    expect(disabled).toEqual({
      status: "error",
      reason: "disabled",
      message: "IA não configurada.",
    });
    expect(sdk.create).not.toHaveBeenCalled();

    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-teste");
    sdk.create.mockResolvedValueOnce(response(null));
    mod = await loadActions();
    const refused = await mod.organizeNotesAction(
      initialAiActionState,
      fd({ leadId: lead.id, text: RELATO }),
    );
    expect(refused).toEqual({
      status: "error",
      reason: "refusal",
      message: "A IA não conseguiu gerar este conteúdo. Escreva manualmente.",
    });
  });
});

describe("applyLeadAttributesAction", () => {
  it("grava os campos do segmento, recalcula o score e devolve 'Campos salvos.'", async () => {
    const lead = await newLead("PJ");
    const { applyLeadAttributesAction } = await loadActions();
    const state = await applyLeadAttributesAction(
      initialCrmActionState,
      fd({
        leadId: lead.id,
        attributes: JSON.stringify({
          regime_tributario: "lucro_real",
          regime_confirmado_por: "contador",
          contador_participa: true,
        }),
      }),
    );
    expect(state).toEqual({ status: "ok", message: "Campos salvos." });
    const updated = await getLead(ctx, lead.id);
    expect(updated?.attributes).toMatchObject({
      empresa: "Rede Farmácias Vale",
      regime_tributario: "lucro_real",
      regime_confirmado_por: "contador",
      contador_participa: true,
    });
    expect(updated!.score).toBeGreaterThan(lead.score);
    const system = await listActivities(ctx, { leadId: lead.id, type: "sistema" });
    expect(system.some((a) => (a.data as { reason?: string })?.reason === "score")).toBe(true);
  });

  it("recusa a checagem do art. 27, chave de outro segmento, valor inválido e JSON malformado", async () => {
    const lead = await newLead("PJ");
    const { applyLeadAttributesAction } = await loadActions();
    const art27 = await applyLeadAttributesAction(
      initialCrmActionState,
      fd({ leadId: lead.id, attributes: JSON.stringify({ vinculo_art27_checado: true }) }),
    );
    expect(art27.status).toBe("error");
    expect(art27.message).toContain("vinculo_art27_checado");
    const foreign = await applyLeadAttributesAction(
      initialCrmActionState,
      fd({ leadId: lead.id, attributes: JSON.stringify({ clientes_lucro_real_faixa: "1_4" }) }),
    );
    expect(foreign.status).toBe("error");
    const invalid = await applyLeadAttributesAction(
      initialCrmActionState,
      fd({ leadId: lead.id, attributes: JSON.stringify({ regime_tributario: "lucro real" }) }),
    );
    expect(invalid).toMatchObject({
      status: "error",
      message: "Confira os campos destacados.",
      fieldErrors: { regime_tributario: expect.any(String) },
    });
    const broken = await applyLeadAttributesAction(
      initialCrmActionState,
      fd({ leadId: lead.id, attributes: "{nao é json" }),
    );
    expect(broken).toMatchObject({ status: "error", message: "Nenhum campo para salvar." });
    const nested = await applyLeadAttributesAction(
      initialCrmActionState,
      fd({ leadId: lead.id, attributes: JSON.stringify({ setor: { x: 1 } }) }),
    );
    expect(nested).toMatchObject({ status: "error", message: "Nenhum campo para salvar." });
    expect((await getLead(ctx, lead.id))?.attributes).toEqual({ empresa: "Rede Farmácias Vale" });
  });

  it("lead de outro tenant não é encontrado", async () => {
    const lead = await newLead("PJ");
    const { applyLeadAttributesAction } = await loadActions();
    session.ctx = await makeTenant();
    try {
      const state = await applyLeadAttributesAction(
        initialCrmActionState,
        fd({ leadId: lead.id, attributes: JSON.stringify({ setor: "Varejo" }) }),
      );
      expect(state).toMatchObject({ status: "error", message: "Lead não encontrado." });
    } finally {
      session.ctx = ctx;
    }
    expect((await getLead(ctx, lead.id))?.attributes).toEqual({ empresa: "Rede Farmácias Vale" });
  });
});
