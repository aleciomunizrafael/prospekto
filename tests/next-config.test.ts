// Cabeçalhos de segurança (next.config.ts) em toda rota, inclusive o CRM em /app.
import { describe, expect, it } from "vitest";
import nextConfig, { securityHeaders } from "../next.config";

describe("next.config.ts: cabeçalhos de segurança", () => {
  it("headers() devolve as cinco chaves para todas as rotas", async () => {
    const rules = await nextConfig.headers!();
    const all = rules.find((rule) => rule.source === "/:path*");
    expect(all).toBeDefined();
    const keys = new Map(all!.headers.map((h) => [h.key, h.value]));
    expect(keys.get("X-Frame-Options")).toBe("DENY");
    expect(keys.get("Content-Security-Policy")).toBe("frame-ancestors 'none'");
    expect(keys.get("X-Content-Type-Options")).toBe("nosniff");
    expect(keys.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(keys.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
    expect(all!.headers).toEqual(securityHeaders);
  });
});
