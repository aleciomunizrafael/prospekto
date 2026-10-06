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
    ["espaço no fim", "https://prospekto-sistema.vercel.app "],
  ])("rejeita BETTER_AUTH_URL com %s", (_rotulo, url) => {
    const result = envSchema.safeParse({ ...base, BETTER_AUTH_URL: url });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message).join(" ")).toContain("BETTER_AUTH_URL");
    }
  });

  it("rejeita NEXT_PUBLIC_APP_URL com caminho", () => {
    expect(
      envSchema.safeParse({ ...base, NEXT_PUBLIC_APP_URL: "https://x.example/app" }).success,
    ).toBe(false);
  });
});
