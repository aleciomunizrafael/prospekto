import { describe, expect, it } from "vitest";
import { REDACTED, formatLog, redact } from "./log";

describe("log (R-16: sem dado pessoal)", () => {
  it("redige e-mail, telefone, CPF, CNPJ e segredos em qualquer profundidade", () => {
    const out = redact({
      leadId: "abc",
      email: "x@y.z",
      phone: "+5554999999999",
      nested: { cpf: "000", cnpj: "111", lista: [{ userEmail: "a@b.c", ok: 1 }] },
      password: "p",
      token: "t",
    }) as Record<string, unknown>;
    expect(out.leadId).toBe("abc");
    expect(out.email).toBe(REDACTED);
    expect(out.phone).toBe(REDACTED);
    expect((out.nested as Record<string, unknown>).cpf).toBe(REDACTED);
    expect((out.nested as Record<string, unknown>).cnpj).toBe(REDACTED);
    const item = (out.nested as { lista: Record<string, unknown>[] }).lista[0];
    expect(item.userEmail).toBe(REDACTED);
    expect(item.ok).toBe(1);
    expect(out.password).toBe(REDACTED);
    expect(out.token).toBe(REDACTED);
  });

  it("formata uma linha JSON com level, msg, tenantId e requestId", () => {
    const line = formatLog("info", "lead criado", {
      tenantId: "prospekto",
      leadId: "1",
      email: "x@y.z",
    });
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({
      level: "info",
      msg: "lead criado",
      tenantId: "prospekto",
      requestId: null,
      leadId: "1",
      email: REDACTED,
    });
    expect(typeof parsed.time).toBe("string");
    expect(line).not.toContain("x@y.z");
  });
});
