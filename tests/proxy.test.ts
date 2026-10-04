// src/proxy.ts: apaga x-tenant-* em toda rota (ADR-001) e redireciona /app e /app/* sem cookie.
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { isCrmPath } from "@/lib/routes";
import { config, proxy } from "@/proxy";

function request(pathname: string, init: { headers?: Record<string, string> } = {}) {
  return new NextRequest(new URL(pathname, "http://localhost:3000"), init);
}

// O matcher é `/(<regex>)`: a reconstrução abaixo cobre o que importa (o lookahead negativo).
const matcherRegex = new RegExp(`^/(?:${config.matcher[0].slice(2, -1)})$`);

describe("matcher do proxy", () => {
  it.each([
    "/",
    "/app",
    "/app/leads/a.b",
    "/app/exportar/leads.csv",
    "/api/health",
    "/api/auth/callback/x.y",
    "/entrar",
  ])("inclui %s", (pathname) => {
    expect(matcherRegex.test(pathname)).toBe(true);
  });

  it.each([
    "/favicon.ico",
    "/_next/static/chunks/main.js",
    "/_next/image?url=x",
    "/logo.png",
    "/fonts/inter.woff2",
    "/robots.txt",
  ])("exclui o estático %s", (pathname) => {
    expect(matcherRegex.test(pathname)).toBe(false);
  });
});

describe("proxy()", () => {
  it("remove x-tenant-id e x-tenant-slug vindos do cliente, em qualquer rota", () => {
    for (const pathname of ["/", "/api/health", "/app/leads/a.b"]) {
      const res = proxy(
        request(pathname, {
          headers: { "x-tenant-id": "forjado", "x-tenant-slug": "forjado", "x-outro": "fica" },
        }),
      );
      if (res.status === 307) continue; // /app sem cookie redireciona antes de encaminhar
      const forwarded = res.headers.get("x-middleware-override-headers") ?? "";
      expect(forwarded).not.toContain("x-tenant-id");
      expect(forwarded).not.toContain("x-tenant-slug");
      expect(forwarded).toContain("x-outro");
      expect(res.headers.get("x-middleware-request-x-tenant-id")).toBeNull();
    }
  });

  it("redireciona /app, /app/* e caminhos com ponto sem cookie de sessão", () => {
    for (const pathname of ["/app", "/app/leads", "/app/leads/a.b"]) {
      const res = proxy(request(pathname));
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/entrar");
      expect(location.searchParams.get("next")).toBe(pathname);
    }
  });

  it("não redireciona rotas públicas, inclusive /apple e /application", () => {
    for (const pathname of ["/", "/apple", "/application", "/app-x", "/entrar"]) {
      expect(proxy(request(pathname)).status).toBe(200);
    }
    expect(isCrmPath("/apple")).toBe(false);
    expect(isCrmPath("/app")).toBe(true);
    expect(isCrmPath("/app/leads")).toBe(true);
  });

  it("deixa passar /app com cookie de sessão", () => {
    const res = proxy(
      request("/app", { headers: { cookie: "better-auth.session_token=abc.def" } }),
    );
    expect(res.status).toBe(200);
  });
});
