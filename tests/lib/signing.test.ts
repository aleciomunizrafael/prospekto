import { describe, expect, it } from "vitest";
import {
  FORM_MIN_FILL_MS,
  GUIDE_TOKEN_HOURS,
  hashIp,
  issueFormTimestamp,
  issueGuideToken,
  signPayload,
  verifyFormTimestamp,
  verifyGuideToken,
  verifyPayload,
} from "@/lib/signing";

const HOUR = 60 * 60 * 1000;

describe("signPayload / verifyPayload", () => {
  it("assinatura válida devolve o payload", () => {
    const token = signPayload({ a: 1, b: "x" });
    expect(verifyPayload(token)).toEqual({ a: 1, b: "x" });
  });

  it("token adulterado, malformado, vazio ou com outro segredo é rejeitado", () => {
    const token = signPayload({ a: 1 });
    const [body, sig] = token.split(".");
    expect(verifyPayload(`${body}x.${sig}`)).toBeNull();
    expect(verifyPayload(`${body}.${sig.slice(0, -2)}ab`)).toBeNull();
    expect(verifyPayload("semponto")).toBeNull();
    expect(verifyPayload("")).toBeNull();
    expect(verifyPayload(null)).toBeNull();
    expect(verifyPayload(token, "outro-segredo-com-pelo-menos-32-caracteres-0000")).toBeNull();
    const forged = Buffer.from(JSON.stringify({ a: 2 })).toString("base64url");
    expect(verifyPayload(`${forged}.${sig}`)).toBeNull();
  });
});

describe("carimbo de tempo do formulário (R-18)", () => {
  it("menos de 3 segundos é too_fast; depois é ok; mais de 24 h é expirado", () => {
    const issued = new Date("2026-10-04T12:00:00Z");
    const token = issueFormTimestamp(issued);
    expect(verifyFormTimestamp(token, new Date(issued.getTime() + 1_000)).status).toBe("too_fast");
    expect(verifyFormTimestamp(token, new Date(issued.getTime() + FORM_MIN_FILL_MS)).status).toBe(
      "ok",
    );
    expect(verifyFormTimestamp(token, new Date(issued.getTime() + 25 * HOUR)).status).toBe(
      "expired",
    );
    // Carimbo do futuro (relógio adulterado) também não vale.
    expect(verifyFormTimestamp(token, new Date(issued.getTime() - 1_000)).status).toBe("expired");
  });

  it("token inválido ou de outro tipo é invalid", () => {
    expect(verifyFormTimestamp("abc.def").status).toBe("invalid");
    expect(verifyFormTimestamp(undefined).status).toBe("invalid");
    const guide = issueGuideToken({ leadId: "l", guideVersion: "v", tenantId: "t" });
    expect(verifyFormTimestamp(guide).status).toBe("invalid");
  });
});

describe("token do guia (72 h)", () => {
  const payload = {
    leadId: "6f1c2a8e-0000-4000-8000-000000000001",
    guideVersion: "2026-10",
    tenantId: "prospekto",
  };

  it("válido dentro de 72 horas, com o payload e a expiração", () => {
    const issued = new Date("2026-10-04T12:00:00Z");
    const token = issueGuideToken(payload, issued);
    const check = verifyGuideToken(token, new Date(issued.getTime() + 71 * HOUR));
    expect(check.status).toBe("ok");
    if (check.status === "ok") {
      expect(check.payload).toEqual(payload);
      expect(check.expiresAt).toEqual(new Date(issued.getTime() + GUIDE_TOKEN_HOURS * HOUR));
    }
  });

  it("expirado depois de 72 horas; adulterado é inválido", () => {
    const issued = new Date("2026-10-04T12:00:00Z");
    const token = issueGuideToken(payload, issued);
    expect(verifyGuideToken(token, new Date(issued.getTime() + 73 * HOUR)).status).toBe("expired");
    expect(verifyGuideToken(`${token}a`).status).toBe("invalid");
    expect(verifyGuideToken(issueFormTimestamp()).status).toBe("invalid");
  });
});

describe("hashIp", () => {
  it("é determinístico, não contém o IP e muda com o sal", () => {
    const a = hashIp("203.0.113.9");
    expect(a).toBe(hashIp(" 203.0.113.9 "));
    expect(a).not.toContain("203.0.113.9");
    expect(a).not.toBe(hashIp("203.0.113.10"));
    expect(a).not.toBe(hashIp("203.0.113.9", "outro-segredo-com-pelo-menos-32-caracteres-0000"));
    expect(hashIp(null)).toBe(hashIp(undefined));
  });
});
