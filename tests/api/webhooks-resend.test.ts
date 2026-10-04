// Webhook do Resend: assinatura Svix (HMAC-SHA256 em base64 sobre "id.timestamp.corpo"),
// 503 sem segredo, bounce/complaint atualizam leads.email_status, descadastro revoga marketing (R-14).
import { beforeAll, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/resend/route";
import { env } from "@/env";
import { signSvix, verifySvixSignature } from "@/lib/crm/resend-signature";
import { getCurrentConsent, listConsents } from "@/lib/repos/consents";
import type { Ctx } from "@/lib/repos/ctx";
import { createLead, getLead } from "@/lib/repos/leads";
import { ensureTenant } from "@/lib/repos/tenants";
import { consentContato, uniqueEmail } from "../helpers";

const secretState = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("@/env", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/env")>();
  return {
    ...mod,
    env: new Proxy(mod.env, {
      get(target, prop) {
        if (prop === "RESEND_WEBHOOK_SECRET") return secretState.value;
        return Reflect.get(target, prop);
      },
    }),
  };
});

const SECRET = `whsec_${Buffer.from("segredo-de-teste-do-webhook").toString("base64")}`;
const ctx: Ctx = { tenantId: env.DEFAULT_TENANT_ID, userId: null };

function signedRequest(payload: unknown, opts: { secret?: string; timestamp?: number } = {}) {
  const body = JSON.stringify(payload);
  const id = "msg_test_1";
  const timestamp = String(opts.timestamp ?? Math.floor(Date.now() / 1000));
  const signature = signSvix(opts.secret ?? SECRET, id, timestamp, body);
  return new Request("http://localhost:3000/api/webhooks/resend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`,
    },
    body,
  });
}

let email: string;
let leadId: string;

beforeAll(async () => {
  await ensureTenant({ id: ctx.tenantId, name: "Prospekto" });
  email = uniqueEmail("hook");
  const { lead } = await createLead(ctx, {
    segment: "PJ",
    interest: "rouanet",
    name: "Lead Webhook",
    email,
    source: "site",
    consents: [consentContato, { ...consentContato, purpose: "marketing" }],
  });
  leadId = lead.id;
});

describe("verifySvixSignature", () => {
  it("aceita a assinatura correta, inclusive em lista com várias versões", () => {
    const body = '{"a":1}';
    const sig = signSvix(SECRET, "id1", "1700000000", body);
    const now = new Date(1700000000 * 1000);
    expect(
      verifySvixSignature(
        SECRET,
        { id: "id1", timestamp: "1700000000", signature: `v1,${sig}` },
        body,
        now,
      ),
    ).toEqual({ ok: true });
    expect(
      verifySvixSignature(
        SECRET,
        { id: "id1", timestamp: "1700000000", signature: `v1,abc v1,${sig}` },
        body,
        now,
      ),
    ).toEqual({ ok: true });
  });

  it("recusa cabeçalho ausente, assinatura errada, segredo errado e carimbo fora da tolerância", () => {
    const body = '{"a":1}';
    const sig = signSvix(SECRET, "id1", "1700000000", body);
    const now = new Date(1700000000 * 1000);
    expect(
      verifySvixSignature(
        SECRET,
        { id: null, timestamp: "1700000000", signature: `v1,${sig}` },
        body,
        now,
      ).ok,
    ).toBe(false);
    expect(
      verifySvixSignature(
        SECRET,
        { id: "id1", timestamp: "1700000000", signature: `v1,${sig}` },
        '{"a":2}',
        now,
      ).ok,
    ).toBe(false);
    expect(
      verifySvixSignature(
        "whsec_b3V0cm8=",
        { id: "id1", timestamp: "1700000000", signature: `v1,${sig}` },
        body,
        now,
      ).ok,
    ).toBe(false);
    expect(
      verifySvixSignature(
        SECRET,
        { id: "id1", timestamp: "1700000000", signature: `v1,${sig}` },
        body,
        new Date(1700000000 * 1000 + 10 * 60 * 1000),
      ),
    ).toEqual({ ok: false, reason: "timestamp_out_of_tolerance" });
  });
});

describe("POST /api/webhooks/resend", () => {
  it("responde 503 sem RESEND_WEBHOOK_SECRET", async () => {
    secretState.value = undefined;
    const res = await POST(signedRequest({ type: "email.bounced", data: { to: [email] } }));
    expect(res.status).toBe(503);
    expect((await getLead(ctx, leadId))?.emailStatus).toBe("ok");
  });

  it("responde 401 com assinatura inválida e não altera nada", async () => {
    secretState.value = SECRET;
    const res = await POST(
      signedRequest({ type: "email.bounced", data: { to: [email] } }, { secret: "whsec_b3V0cm8=" }),
    );
    expect(res.status).toBe(401);
    expect((await getLead(ctx, leadId))?.emailStatus).toBe("ok");
  });

  it("email.bounced marca o lead como bounced; eventos desconhecidos são ignorados", async () => {
    secretState.value = SECRET;
    const ignored = await POST(signedRequest({ type: "email.delivered", data: { to: [email] } }));
    expect(await ignored.json()).toMatchObject({ ignored: true });

    const res = await POST(
      signedRequest({ type: "email.bounced", data: { to: [email.toUpperCase()] } }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      kind: "bounced",
      leadsMatched: 1,
      emailStatusUpdated: 1,
      consentsRevoked: 0,
    });
    expect(JSON.stringify(json)).not.toContain(email);
    expect((await getLead(ctx, leadId))?.emailStatus).toBe("bounced");
    expect((await getCurrentConsent(ctx, leadId, "marketing"))?.granted).toBe(true);
  });

  it("descadastro (contact.updated unsubscribed) insere revogação de marketing append-only", async () => {
    secretState.value = SECRET;
    const before = (await listConsents(ctx, leadId)).length;
    const res = await POST(
      signedRequest({ type: "contact.updated", data: { email, unsubscribed: true } }),
    );
    expect(await res.json()).toMatchObject({
      kind: "unsubscribed",
      leadsMatched: 1,
      consentsRevoked: 1,
      emailStatusUpdated: 0,
    });
    const current = await getCurrentConsent(ctx, leadId, "marketing");
    expect(current?.granted).toBe(false);
    expect(current?.sourcePage).toBe("webhook");
    expect((await listConsents(ctx, leadId)).length).toBe(before + 1);
    // contact.updated sem descadastro é ignorado.
    expect(
      await (
        await POST(signedRequest({ type: "contact.updated", data: { email, unsubscribed: false } }))
      ).json(),
    ).toMatchObject({ ignored: true });
  });

  it("email.complained marca complained e também revoga marketing; e-mail desconhecido não casa nada", async () => {
    secretState.value = SECRET;
    const res = await POST(signedRequest({ type: "email.complained", data: { to: [email] } }));
    expect(await res.json()).toMatchObject({
      kind: "complained",
      leadsMatched: 1,
      emailStatusUpdated: 1,
      consentsRevoked: 1,
    });
    expect((await getLead(ctx, leadId))?.emailStatus).toBe("complained");
    const none = await POST(
      signedRequest({ type: "email.bounced", data: { to: ["ninguem@example.test"] } }),
    );
    expect(await none.json()).toMatchObject({ leadsMatched: 0 });
    const badJson = new Request("http://localhost:3000/api/webhooks/resend", {
      method: "POST",
      headers: {
        "svix-id": "x",
        "svix-timestamp": String(Math.floor(Date.now() / 1000)),
        "svix-signature": `v1,${signSvix(SECRET, "x", String(Math.floor(Date.now() / 1000)), "{")}`,
      },
      body: "{",
    });
    expect((await POST(badJson)).status).toBe(400);
  });
});
