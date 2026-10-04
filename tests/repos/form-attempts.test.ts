import { beforeAll, describe, expect, it } from "vitest";
import type { Ctx } from "@/lib/repos/ctx";
import { cleanupFormAttempts, hitFormAttempt } from "@/lib/repos/form-attempts";
import { makeTenant } from "../helpers";

let ctx: Ctx;

beforeAll(async () => {
  ctx = await makeTenant();
});

describe("form_attempts (R-18): 5 envios por IP por hora", () => {
  it("permite 5 e bloqueia o sexto na mesma janela", async () => {
    const now = new Date("2026-10-04T10:15:00Z");
    for (let i = 1; i <= 5; i += 1) {
      const r = await hitFormAttempt(ctx, "ip-a", now);
      expect(r.count).toBe(i);
      expect(r.allowed).toBe(true);
    }
    const sixth = await hitFormAttempt(ctx, "ip-a", new Date("2026-10-04T10:59:00Z"));
    expect(sixth.allowed).toBe(false);
    expect(sixth.count).toBe(6);
    expect(sixth.windowStart).toEqual(new Date("2026-10-04T10:00:00Z"));
  });

  it("outra janela ou outro IP começa do zero", async () => {
    expect((await hitFormAttempt(ctx, "ip-a", new Date("2026-10-04T11:00:00Z"))).count).toBe(1);
    expect((await hitFormAttempt(ctx, "ip-b", new Date("2026-10-04T10:30:00Z"))).count).toBe(1);
  });

  it("limpeza remove janelas com mais de um dia", async () => {
    await cleanupFormAttempts(ctx, new Date("2026-10-06T12:00:00Z"));
    expect((await hitFormAttempt(ctx, "ip-a", new Date("2026-10-04T10:20:00Z"))).count).toBe(1);
  });
});
