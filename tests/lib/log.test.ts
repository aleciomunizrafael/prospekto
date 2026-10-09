// src/lib/log.ts (regra R-16): nenhuma linha de log leva e-mail, telefone, CPF, CNPJ ou conteúdo.
// O DrizzleQueryError embute a SQL e os parâmetros da consulta na message e no stack (corpo do
// e-mail, attributes com CNPJ), e o erro do driver no `cause` traz `detail` com valores da linha.
import { DrizzleQueryError } from "drizzle-orm/errors";
import { describe, expect, it } from "vitest";
import { formatLog, REDACTED, redact } from "@/lib/log";

const QUERY = 'insert into "activities" ("tenant_id", "body", "data") values ($1, $2, $3)';
const PARAMS = [
  "prospekto",
  "Oi Ana, meu CNPJ é 12.345.678/0001-90 e meu celular é +5511999990000",
  '{"cnpj":"12345678000190"}',
];

function driverError() {
  return Object.assign(new Error('duplicate key value violates unique constraint "x"'), {
    code: "23505",
    detail: "Key (id)=(1) already exists.",
    query: QUERY,
    params: PARAMS,
  });
}

describe("redact: erro de consulta do Drizzle", () => {
  it("sai só com nome fixo, mensagem e código do driver, sem SQL, parâmetros, detail ou stack", () => {
    const error = new DrizzleQueryError(QUERY, PARAMS, driverError());
    const line = formatLog("error", "falha ao registrar", { tenantId: "t1", leadId: "l1", error });
    expect(line).not.toContain("params:");
    expect(line).not.toContain("Failed query");
    expect(line).not.toContain("12.345.678");
    expect(line).not.toContain("12345678000190");
    expect(line).not.toContain("+5511");
    expect(line).not.toContain("Key (id)");
    expect(line).not.toContain("activities");
    expect(JSON.parse(line)).toMatchObject({
      level: "error",
      msg: "falha ao registrar",
      tenantId: "t1",
      leadId: "l1",
      error: {
        name: "DrizzleQueryError",
        message: 'duplicate key value violates unique constraint "x"',
        code: "23505",
      },
    });
    expect(Object.keys((JSON.parse(line) as { error: object }).error).sort()).toEqual([
      "code",
      "message",
      "name",
    ]);
  });

  it("sem cause (conexão caiu) usa uma frase fixa e código nulo", () => {
    const error = new DrizzleQueryError(QUERY, PARAMS);
    const out = redact({ error }) as { error: Record<string, unknown> };
    expect(out.error).toEqual({
      name: "DrizzleQueryError",
      message: "falha na consulta",
      code: null,
    });
  });
});

describe("redact: demais valores", () => {
  it("Error comum continua com name, message e stack", () => {
    const error = new TypeError("algo quebrou");
    const out = redact({ error }) as { error: Record<string, unknown> };
    expect(out.error).toMatchObject({ name: "TypeError", message: "algo quebrou" });
    expect(String(out.error.stack)).toContain("algo quebrou");
  });

  it("chaves sensíveis são redigidas em qualquer nível", () => {
    const line = formatLog("info", "x", {
      email: "a@example.test",
      nested: { accessToken: "abc", cnpj: "1", ok: 2 },
      list: [{ telefone: "9" }],
    });
    expect(line).not.toContain("example.test");
    expect(line).not.toContain("abc");
    expect(JSON.parse(line)).toMatchObject({
      email: REDACTED,
      nested: { accessToken: REDACTED, cnpj: REDACTED, ok: 2 },
      list: [{ telefone: REDACTED }],
    });
  });
});
