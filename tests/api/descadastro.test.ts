// Descadastro de um clique (/api/descadastro; estrutura-e-copy.md 10.2; RFC 8058; LGPD art. 18, IX):
// token assinado com lead e tenant, GET mostra a confirmação, POST revoga `marketing` em consents
// (append-only, R-14) e registra activities.sistema; token inválido, adulterado ou expirado não grava.
import { beforeAll, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/descadastro/route";
import { env } from "@/env";
import { listActivities } from "@/lib/repos/activities";
import { getCurrentConsent, listConsents } from "@/lib/repos/consents";
import type { Ctx } from "@/lib/repos/ctx";
import { createLead } from "@/lib/repos/leads";
import { ensureTenant } from "@/lib/repos/tenants";
import { issueUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/signing";
import { consentContato, uniqueEmail } from "../helpers";

const ctx: Ctx = { tenantId: env.DEFAULT_TENANT_ID, userId: null };

function request(method: "GET" | "POST", token: string | null): Request {
  const url = new URL("http://localhost:3000/api/descadastro");
  if (token !== null) url.searchParams.set("t", token);
  return new Request(url, {
    method,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: method === "POST" ? "List-Unsubscribe=One-Click" : undefined,
  });
}

let leadId: string;

beforeAll(async () => {
  await ensureTenant({ id: ctx.tenantId, name: "Prospekto" });
  const { lead } = await createLead(ctx, {
    segment: "PJ",
    interest: "rouanet",
    name: "Lead Descadastro",
    email: uniqueEmail("unsub"),
    source: "site",
    consents: [consentContato, { ...consentContato, purpose: "marketing" }],
  });
  leadId = lead.id;
});

describe("token de descadastro", () => {
  it("vale um ano, carrega lead e tenant e recusa adulteração e expiração", () => {
    const token = issueUnsubscribeToken({ leadId, tenantId: ctx.tenantId });
    expect(verifyUnsubscribeToken(token)).toEqual({
      status: "ok",
      payload: { leadId, tenantId: ctx.tenantId },
    });
    expect(verifyUnsubscribeToken(`${token}x`)).toEqual({ status: "invalid" });
    const later = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000);
    expect(verifyUnsubscribeToken(token, later)).toEqual({ status: "expired" });
  });
});

describe("/api/descadastro", () => {
  it("token ausente ou inválido responde 400 sem gravar nada", async () => {
    const before = (await listConsents(ctx, leadId)).length;
    expect((await GET(request("GET", null))).status).toBe(400);
    expect((await POST(request("POST", "abc.def"))).status).toBe(400);
    const guide = issueUnsubscribeToken({
      leadId: "00000000-0000-4000-8000-000000000000",
      tenantId: ctx.tenantId,
    });
    expect((await POST(request("POST", guide))).status).toBe(400);
    expect((await listConsents(ctx, leadId)).length).toBe(before);
    expect(await getCurrentConsent(ctx, leadId, "marketing")).toMatchObject({ granted: true });
  });

  it("token expirado responde 410 sem gravar", async () => {
    const old = issueUnsubscribeToken(
      { leadId, tenantId: ctx.tenantId },
      new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
    );
    expect((await POST(request("POST", old))).status).toBe(410);
    expect(await getCurrentConsent(ctx, leadId, "marketing")).toMatchObject({ granted: true });
  });

  it("GET mostra a confirmação em português sem revogar; POST revoga e registra a activity", async () => {
    const token = issueUnsubscribeToken({ leadId, tenantId: ctx.tenantId });
    const shown = await GET(request("GET", token));
    expect(shown.status).toBe(200);
    expect(await shown.text()).toContain("Cancelar o recebimento");
    expect(await getCurrentConsent(ctx, leadId, "marketing")).toMatchObject({ granted: true });

    const done = await POST(request("POST", token));
    expect(done.status).toBe(200);
    expect(await done.text()).toContain("Descadastro concluído");
    const current = await getCurrentConsent(ctx, leadId, "marketing");
    expect(current).toMatchObject({ granted: false, sourcePage: "one-click" });
    // O consentimento de contato não é tocado.
    expect(await getCurrentConsent(ctx, leadId, "contato_comercial")).toMatchObject({
      granted: true,
    });
    const activities = await listActivities(ctx, { leadId, type: "sistema" });
    expect(activities.some((a) => a.subject.includes("Descadastro"))).toBe(true);

    // Idempotente: o segundo clique insere outra revogação, sem erro (R-14).
    const again = await POST(request("POST", token));
    expect(again.status).toBe(200);
    const revoked = (await listConsents(ctx, leadId)).filter(
      (c) => c.purpose === "marketing" && !c.granted,
    );
    expect(revoked).toHaveLength(2);
  });
});
