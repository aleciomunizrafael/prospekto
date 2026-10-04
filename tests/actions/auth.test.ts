// Redefinição de senha (src/actions/auth.ts) com o Better Auth real sobre PGlite. O e-mail é
// capturado em vez de enviado; o token vem do link gerado.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { generateRandomString } from "better-auth/crypto";
import { requestPasswordResetAction, resetPasswordAction } from "@/actions/auth";
import { auth } from "@/lib/auth";
import { initialCrmActionState } from "@/lib/crm/action-state";
import { ensureTenant } from "@/lib/repos/tenants";

const mail = vi.hoisted(() => ({ sent: [] as { to: string; text: string; subject: string }[] }));

vi.mock("@/lib/email/send", () => ({
  sendEmail: async (message: { to: string; text: string; subject: string }) => {
    mail.sent.push(message);
    return { delivered: false, mode: "log" };
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const email = "operadora@example.test";
const oldPassword = generateRandomString(20, "a-z", "A-Z", "0-9");

beforeAll(async () => {
  await ensureTenant({ id: "t-auth", name: "Tenant auth" });
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(oldPassword);
  const created = await ctx.internalAdapter.createUser(
    { name: "Operadora", email, emailVerified: true, tenantId: "t-auth", role: "owner" },
    { method: "email-password" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: hash,
  });
});

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

describe("requestPasswordResetAction", () => {
  it("responde igual para e-mail desconhecido, sem enviar nada", async () => {
    const state = await requestPasswordResetAction(
      initialCrmActionState,
      fd({ email: "ninguem@example.test" }),
    );
    expect(state.status).toBe("ok");
    expect(mail.sent).toHaveLength(0);
  });

  it("rejeita e-mail inválido com erro por campo", async () => {
    const state = await requestPasswordResetAction(initialCrmActionState, fd({ email: "x" }));
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email).toBeDefined();
  });
});

describe("resetPasswordAction", () => {
  it("envia o link em português, troca a senha com o token e invalida a antiga", async () => {
    const state = await requestPasswordResetAction(initialCrmActionState, fd({ email }));
    expect(state.status).toBe("ok");
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].to).toBe(email);
    expect(mail.sent[0].subject).toBe("Redefinir a senha do CRM");
    const url = mail.sent[0].text.match(/https?:\/\/\S+reset-password\/\S+/)?.[0];
    expect(url).toBeDefined();
    const token = new URL(url!).pathname.split("/").pop()!;
    expect(new URL(url!).searchParams.get("callbackURL")).toBe("/redefinir-senha");

    const mismatch = await resetPasswordAction(
      initialCrmActionState,
      fd({ token, password: "nova-senha-muito-longa", confirm: "outra-coisa-diferente" }),
    );
    expect(mismatch.fieldErrors?.confirm).toBeDefined();

    const newPassword = "nova-senha-muito-longa-2026";
    await expect(
      resetPasswordAction(
        initialCrmActionState,
        fd({ token, password: newPassword, confirm: newPassword }),
      ),
    ).rejects.toThrow("REDIRECT:/entrar?reset=1");

    const signedIn = await auth.api.signInEmail({ body: { email, password: newPassword } });
    expect(signedIn.user.email).toBe(email);
    await expect(
      auth.api.signInEmail({ body: { email, password: oldPassword } }),
    ).rejects.toThrow();

    // Token é de uso único.
    const reused = await resetPasswordAction(
      initialCrmActionState,
      fd({ token, password: newPassword, confirm: newPassword }),
    );
    expect(reused.status).toBe("error");
    expect(reused.message).toMatch(/não vale mais/);
  });
});
