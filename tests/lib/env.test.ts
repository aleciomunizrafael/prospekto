import { describe, expect, it } from "vitest";
import { envSchema } from "@/env";

const base = {
  BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters-0000",
  FORM_SECRET: "test-only-form-secret-with-at-least-32-chars-0000",
  BETTER_AUTH_URL: "https://prospekto-sistema.vercel.app",
  NEXT_PUBLIC_APP_URL: "https://prospekto-sistema.vercel.app",
};

describe("variáveis de ambiente: URLs da app", () => {
  it("aceita só a origem", () => {
    expect(envSchema.safeParse(base).success).toBe(true);
  });

  it.each([
    ["caminho", "https://prospekto-sistema.vercel.app/entrar"],
    ["barra no fim", "https://prospekto-sistema.vercel.app/"],
  ])("rejeita BETTER_AUTH_URL com %s, citando a variável", (_rotulo, url) => {
    const result = envSchema.safeParse({ ...base, BETTER_AUTH_URL: url });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message).join(" ")).toContain("BETTER_AUTH_URL");
    }
  });

  it("aceita espaço no fim de BETTER_AUTH_URL e o remove (o Zod normaliza a URL)", () => {
    const result = envSchema.safeParse({
      ...base,
      BETTER_AUTH_URL: "https://prospekto-sistema.vercel.app ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.BETTER_AUTH_URL).toBe("https://prospekto-sistema.vercel.app");
    }
  });

  it("rejeita NEXT_PUBLIC_APP_URL com caminho", () => {
    expect(
      envSchema.safeParse({ ...base, NEXT_PUBLIC_APP_URL: "https://x.example/app" }).success,
    ).toBe(false);
  });
});

describe("variáveis de ambiente: EMAIL_FROM", () => {
  it.each([
    ["ausente", undefined],
    ["vazia", ""],
    ["só espaços", "   "],
  ])("usa o remetente padrão quando %s", (_rotulo, value) => {
    const result = envSchema.safeParse({ ...base, EMAIL_FROM: value });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.EMAIL_FROM).toBe("Prospekto <onboarding@resend.dev>");
  });

  it.each([
    "Prospekto <onboarding@resend.dev>",
    "onboarding@resend.dev",
    "Daniela Sandrin Copat . Prospekto <contato@envio.prospekto.com.br>",
    "Prospekto Consultoria & Projetos <projetos@prospekto.com.br>",
  ])("aceita %s", (value) => {
    const result = envSchema.safeParse({ ...base, EMAIL_FROM: value });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.EMAIL_FROM).toBe(value);
  });

  it("remove espaços nas pontas", () => {
    const result = envSchema.safeParse({
      ...base,
      EMAIL_FROM: " Prospekto <onboarding@resend.dev> ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.EMAIL_FROM).toBe("Prospekto <onboarding@resend.dev>");
  });

  it.each([
    ["aspas em volta", '"Prospekto <onboarding@resend.dev>"'],
    ["crases em volta", "`Prospekto <onboarding@resend.dev>`"],
    ["sem os sinais < >", "Prospekto onboarding@resend.dev"],
    ["sinal > faltando", "Prospekto <onboarding@resend.dev"],
    ["sem arroba", "Prospekto <onboarding.resend.dev>"],
    ["só o nome", "Prospekto"],
  ])("rejeita %s, citando a variável", (_rotulo, value) => {
    const result = envSchema.safeParse({ ...base, EMAIL_FROM: value });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message).join(" ")).toContain("EMAIL_FROM");
    }
  });
});
