import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/daily/route";
import { env } from "@/env";
import { isCronAuthorized } from "@/lib/cron-auth";

function request(authorization?: string) {
  return new Request("http://localhost:3000/api/cron/daily", {
    headers: authorization ? { authorization } : {},
  });
}

describe("/api/cron/daily", () => {
  it("responde 401 sem cabeçalho, com segredo errado ou com segredo não configurado", async () => {
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request("Bearer errado"))).status).toBe(401);
    expect((await GET(request(`Bearer ${env.CRON_SECRET}x`))).status).toBe(401);
    expect(isCronAuthorized(request("Bearer qualquer"), undefined)).toBe(false);
    expect(isCronAuthorized(request("Bearer qualquer"), "")).toBe(false);
  });

  it("responde 204 com Authorization: Bearer CRON_SECRET", async () => {
    expect(env.CRON_SECRET).toBeTruthy();
    const res = await GET(request(`Bearer ${env.CRON_SECRET}`));
    expect(res.status).toBe(204);
  });
});
