// Troca de senha em "Minha conta" (src/actions/account.ts) com o Better Auth real sobre PGlite.
// O login é feito de verdade (signInEmail) e o cookie da sessão vai para o headers() de
// next/headers, substituído aqui pelo cookie do teste corrente.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { generateRandomString } from "better-auth/crypto";
import { changePasswordAction } from "@/actions/account";
import { auth } from "@/lib/auth";
import { initialCrmActionState } from "@/lib/crm/action-state";
import type { Ctx } from "@/lib/repos/ctx";
import { FORM_ATTEMPT_LIMIT_PER_HOUR } from "@/lib/repos/form-attempts";
import { ensureTenant } from "@/lib/repos/tenants";

const current = vi.hoisted(() => ({ cookie: "", ctx: null as (Ctx & { role: "owner" }) | null }));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: current.cookie }),
  // A ação mantém a sessão atual e não grava cookie novo; cookies() fica só para o nextCookies.
  cookies: async () => ({ set: () => undefined, get: () => undefined }),
}));
vi.mock("@/lib/session", () => ({
  requireSession: async () => {
    if (!current.ctx) throw new Error("REDIRECT:/entrar");
    return current.ctx;
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/email/send", () => ({
  sendEmail: async () => ({ delivered: false, mode: "log" }),
}));

const TENANT = "t-conta";

async function createUser(email: string, password: string): Promise<string> {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const created = await ctx.internalAdapter.createUser(
    { name: "Operadora", email, emailVerified: true, tenantId: TENANT, role: "owner" },
    { method: "email-password" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: hash,
  });
  return created.id;
}

// Login real; devolve o cabeçalho Cookie que o navegador mandaria de volta.
async function signIn(email: string, password: string): Promise<string> {
  const { headers } = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  expect(cookie).toMatch(/session_token=/);
  return cookie;
}

async function sessionOf(cookie: string) {
  return auth.api.getSession({ headers: new Headers({ cookie }) });
}

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

function change(currentPassword: string, password: string, confirm = password) {
  return changePasswordAction(initialCrmActionState, fd({ currentPassword, password, confirm }));
}

const email = "operadora@example.test";
const oldPassword = generateRandomString(20, "a-z", "A-Z", "0-9");
const newPassword = "nova-senha-muito-longa-2026";
let userId: string;

beforeAll(async () => {
  await ensureTenant({ id: TENANT, name: "Tenant conta" });
  userId = await createUser(email, oldPassword);
  current.cookie = await signIn(email, oldPassword);
  current.ctx = { tenantId: TENANT, userId, role: "owner" };
});

describe("changePasswordAction", () => {
  it("sem sessão redireciona para /entrar antes de tocar no banco", async () => {
    const saved = current.ctx;
    current.ctx = null;
    try {
      await expect(change(oldPassword, newPassword)).rejects.toThrow("REDIRECT:/entrar");
    } finally {
      current.ctx = saved;
    }
  });

  it("valida os campos sem trocar nada", async () => {
    const short = await change(oldPassword, "curta", "curta");
    expect(short.status).toBe("error");
    expect(short.fieldErrors?.password).toMatch(/12 caracteres/);

    const mismatch = await change(oldPassword, newPassword, "outra-senha-diferente-2026");
    expect(mismatch.status).toBe("error");
    expect(mismatch.fieldErrors?.confirm).toMatch(/iguais/);

    const same = await change(oldPassword, oldPassword);
    expect(same.status).toBe("error");
    expect(same.fieldErrors?.password).toMatch(/diferente da atual/);

    const missing = await change("", newPassword);
    expect(missing.status).toBe("error");
    expect(missing.fieldErrors?.currentPassword).toMatch(/senha atual/i);

    // A senha antiga continua valendo e a sessão continua aberta.
    await auth.api.signInEmail({ body: { email, password: oldPassword } });
    expect(await sessionOf(current.cookie)).not.toBeNull();
  });

  it("senha atual errada volta erro no campo e não troca", async () => {
    const state = await change("senha-errada-mas-longa", newPassword);
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.currentPassword).toBe("Senha atual incorreta.");
    await auth.api.signInEmail({ body: { email, password: oldPassword } });
  });

  it("troca a senha, invalida a antiga e encerra as outras sessões", async () => {
    const otherSession = await signIn(email, oldPassword);
    expect(await sessionOf(otherSession)).not.toBeNull();

    const state = await change(oldPassword, newPassword);
    expect(state.status).toBe("ok");
    expect(state.message).toMatch(/Senha alterada/);

    await expect(
      auth.api.signInEmail({ body: { email, password: oldPassword } }),
    ).rejects.toThrow();
    const signedIn = await auth.api.signInEmail({ body: { email, password: newPassword } });
    expect(signedIn.user.email).toBe(email);

    // A sessão aberta antes da troca deixou de existir; a sessão corrente continua aberta.
    expect(await sessionOf(otherSession)).toBeNull();
    expect(await sessionOf(current.cookie)).not.toBeNull();
  });

  it("senha atual acima do máximo volta erro no campo sem chamar o Better Auth", async () => {
    const state = await change("x".repeat(129), newPassword);
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.currentPassword).toBe("Senha atual incorreta.");
  });
});

describe("rota HTTP /api/auth/change-password", () => {
  it("responde 404: a troca só existe pela Server Action", async () => {
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: current.cookie,
        },
        body: JSON.stringify({
          currentPassword: newPassword,
          newPassword: "outra-senha-muito-longa-2026",
          revokeOtherSessions: true,
        }),
      }),
    );
    expect(response.status).toBe(404);
    // Nada mudou: a senha corrente continua valendo.
    await auth.api.signInEmail({ body: { email, password: newPassword } });
  });
});

describe("limite de tentativas por pessoa", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it(`depois de ${FORM_ATTEMPT_LIMIT_PER_HOUR} tentativas na hora a resposta é "Muitas tentativas"`, async () => {
    // Relógio fixo no meio da hora: hitFormAttempt agrupa por hora UTC e, perto da virada, as
    // tentativas poderiam cair em janelas diferentes. As sessões continuam válidas (expiresAt
    // fica no futuro).
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(new Date().setUTCMinutes(5, 0, 0)));
    const limitEmail = "limite@example.test";
    const password = generateRandomString(20, "a-z", "A-Z", "0-9");
    const limitUserId = await createUser(limitEmail, password);
    current.cookie = await signIn(limitEmail, password);
    current.ctx = { tenantId: TENANT, userId: limitUserId, role: "owner" };

    for (let i = 0; i < FORM_ATTEMPT_LIMIT_PER_HOUR; i += 1) {
      const state = await change("senha-errada-mas-longa", newPassword);
      expect(state.fieldErrors?.currentPassword).toBe("Senha atual incorreta.");
    }
    const blocked = await change(password, newPassword);
    expect(blocked.status).toBe("error");
    expect(blocked.message).toMatch(/^Muitas tentativas/);
    // Acima do limite nem a senha certa passa: a antiga continua valendo.
    await auth.api.signInEmail({ body: { email: limitEmail, password } });
  });
});
