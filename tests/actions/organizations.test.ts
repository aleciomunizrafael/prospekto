// Server Actions de organizações (src/actions/organizations.ts) contra PGlite: as notas da ficha
// salvas pelo AutosaveField (ADR-004, 6.9) e o telefone da empresa na folha "Editar" (P18).
// requireSession é substituído por um contexto do teste; next/cache e next/navigation são
// neutralizados.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { updateOrganizationAction, updateOrganizationNotesAction } from "@/actions/organizations";
import { initialCrmActionState } from "@/lib/crm/action-state";
import { idleState } from "@/lib/crm/form-state";
import type { Ctx } from "@/lib/repos/ctx";
import { createOrganization, getOrganization, type Organization } from "@/lib/repos/organizations";
import { makeTenant } from "../helpers";

const session = vi.hoisted(() => ({ ctx: null as Ctx | null }));

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
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

let ctx: Ctx;
let other: Ctx;
let org: Organization;

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

beforeAll(async () => {
  ctx = await makeTenant();
  other = await makeTenant();
  session.ctx = ctx;
  org = await createOrganization(ctx, { type: "empresa", name: "Empresa das Notas" });
});

describe("updateOrganizationNotesAction", () => {
  it("grava e limpa as notas", async () => {
    const saved = await updateOrganizationNotesAction(
      initialCrmActionState,
      fd({ orgId: org.id, notes: "Decisor viaja em novembro." }),
    );
    expect(saved).toEqual({ status: "ok", message: "Salvo." });
    expect((await getOrganization(ctx, org.id))?.notes).toBe("Decisor viaja em novembro.");

    const cleared = await updateOrganizationNotesAction(
      initialCrmActionState,
      fd({ orgId: org.id, notes: "" }),
    );
    expect(cleared.status).toBe("ok");
    expect((await getOrganization(ctx, org.id))?.notes).toBeNull();
  });

  it("organização de outro tenant devolve erro e não grava", async () => {
    const foreign = await createOrganization(other, { type: "empresa", name: "Alheia" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const state = await updateOrganizationNotesAction(
        initialCrmActionState,
        fd({ orgId: foreign.id, notes: "texto que não pode vazar" }),
      );
      expect(state.status).toBe("error");
      expect(state.message).toBe("Não foi possível salvar; tente de novo");
      expect((await getOrganization(other, foreign.id))?.notes).toBeNull();
      // O log sai sem o texto das notas (R-16).
      const logged = warn.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(logged).not.toContain("texto que não pode vazar");
    } finally {
      warn.mockRestore();
    }
  });

  it("entrada inválida devolve erro antes de tocar no banco", async () => {
    const state = await updateOrganizationNotesAction(
      initialCrmActionState,
      fd({ orgId: "nao-e-uuid", notes: "x" }),
    );
    expect(state.status).toBe("error");
    const tooLong = await updateOrganizationNotesAction(
      initialCrmActionState,
      fd({ orgId: org.id, notes: "a".repeat(8001) }),
    );
    expect(tooLong.status).toBe("error");
  });

  it("sem sessão falha antes de tocar no banco", async () => {
    session.ctx = null;
    try {
      await expect(
        updateOrganizationNotesAction(initialCrmActionState, fd({ orgId: org.id, notes: "x" })),
      ).rejects.toThrow("REDIRECT:/entrar");
    } finally {
      session.ctx = ctx;
    }
  });
});

describe("updateOrganizationAction: telefone da empresa (P18)", () => {
  it("grava E.164 a partir do campo formatado e limpa quando vazio", async () => {
    const base = { orgId: org.id, type: "empresa", name: "Empresa das Notas" };
    const saved = await updateOrganizationAction(
      idleState,
      fd({ ...base, phone: "(54) 3000-0000" }),
    );
    expect(saved.status).toBe("ok");
    expect((await getOrganization(ctx, org.id))?.phone).toBe("+555430000000");

    const cleared = await updateOrganizationAction(idleState, fd({ ...base, phone: "" }));
    expect(cleared.status).toBe("ok");
    expect((await getOrganization(ctx, org.id))?.phone).toBeNull();
  });

  it("telefone inválido devolve erro no campo", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const state = await updateOrganizationAction(
        idleState,
        fd({ orgId: org.id, type: "empresa", name: "Empresa das Notas", phone: "123" }),
      );
      expect(state.status).toBe("error");
      expect(state.status === "error" && state.fieldErrors?.phone).toBeTruthy();
    } finally {
      warn.mockRestore();
    }
  });
});
