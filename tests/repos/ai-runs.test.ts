// Repositório ai_runs (ADR-003, seção 8): inserção, teto diário na virada do dia em São Paulo e
// último resultado bem-sucedido.
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { aiRuns } from "@/lib/db/schema";
import type { Ctx } from "@/lib/repos/ctx";
import {
  countAiRunsToday,
  finishAiRun,
  getLatestAiRun,
  insertAiRun,
  listAiRuns,
  reserveAiRun,
} from "@/lib/repos/ai-runs";
import { createLead } from "@/lib/repos/leads";
import { eq } from "drizzle-orm";
import { makeTenant, uniqueEmail } from "../helpers";

let ctx: Ctx;
let leadId: string;

beforeAll(async () => {
  ctx = await makeTenant();
  const { lead } = await createLead(ctx, {
    segment: "PJ",
    interest: "rouanet",
    name: "Lead IA",
    email: uniqueEmail("ia"),
    source: "linkedin",
    attributes: { empresa: "Empresa IA" },
  });
  leadId = lead.id;
});

describe("insertAiRun", () => {
  it("grava a linha com padrões e o usuário do contexto", async () => {
    const run = await insertAiRun(ctx, {
      kind: "brief",
      leadId,
      model: "claude-opus-5-5",
      status: "ok",
      inputTokens: 10,
      outputTokens: 5,
      output: { resumo: "x" },
      data: { effort: "medium" },
    });
    expect(run.tenantId).toBe(ctx.tenantId);
    expect(run.cacheReadInputTokens).toBe(0);
    expect(run.durationMs).toBeNull();
    expect(run.createdBy).toBe(ctx.userId);
    expect(run.createdAt).toBeInstanceOf(Date);
  });

  it("recusa kind e status fora dos CHECK", async () => {
    await expect(
      insertAiRun(ctx, { kind: "outro" as never, leadId: null, model: "m", status: "ok" }),
    ).rejects.toThrow();
    await expect(
      insertAiRun(ctx, { kind: "brief", leadId: null, model: "m", status: "feito" as never }),
    ).rejects.toThrow();
  });
});

describe("countAiRunsToday", () => {
  it("conta pelo dia civil em America/Sao_Paulo (23h50 e 00h10)", async () => {
    const own = await makeTenant();
    const row = (createdAt: Date) => ({
      tenantId: own.tenantId,
      kind: "notes",
      leadId: null,
      model: "claude-opus-5-5",
      status: "ok",
      createdAt,
    });
    // 09/10/2026 23:50 em SP = 10/10 02:50Z; 10/10/2026 00:10 em SP = 10/10 03:10Z.
    await db
      .insert(aiRuns)
      .values([row(new Date("2026-10-09T12:00:00Z")), row(new Date("2026-10-10T02:50:00Z"))]);
    expect(await countAiRunsToday(own, new Date("2026-10-10T02:55:00Z"))).toBe(2);
    await db.insert(aiRuns).values([row(new Date("2026-10-10T03:10:00Z"))]);
    expect(await countAiRunsToday(own, new Date("2026-10-10T03:30:00Z"))).toBe(1);
    expect(await countAiRunsToday(own, new Date("2026-10-11T12:00:00Z"))).toBe(0);
  });
});

describe("reserveAiRun e finishAiRun", () => {
  const reserve = (ctx: Ctx, limit: number) =>
    reserveAiRun(ctx, { kind: "brief", leadId: null, model: "claude-opus-5-5", limit });

  it("reserva linhas pending abaixo do teto e devolve null ao atingi-lo", async () => {
    const own = await makeTenant();
    expect(await reserve(own, 2)).toMatch(/^[0-9a-f-]{36}$/);
    expect(await reserve(own, 2)).toMatch(/^[0-9a-f-]{36}$/);
    expect(await reserve(own, 2)).toBeNull();
    expect(await countAiRunsToday(own)).toBe(2);
    const rows = await db.select().from(aiRuns).where(eq(aiRuns.tenantId, own.tenantId));
    expect(rows.map((r) => r.status)).toEqual(["pending", "pending"]);
    expect(rows[0].createdBy).toBe(own.userId);
    expect(rows[0].inputTokens).toBe(0);
    // A linha pending nunca aparece como último resultado.
    expect(await getLatestAiRun(own, { leadId: leadId, kind: "brief" })).toBeNull();
  });

  it("conta só o dia civil em São Paulo: as de ontem não ocupam o teto", async () => {
    const own = await makeTenant();
    // A linha reservada recebe created_at do banco (agora), por isso datas relativas ao relógio real.
    await db.insert(aiRuns).values({
      tenantId: own.tenantId,
      kind: "brief",
      leadId: null,
      model: "m",
      status: "ok",
      createdAt: new Date(Date.now() - 24 * 60 * 60_000),
    });
    expect(await reserve(own, 1)).not.toBeNull();
    expect(await reserve(own, 1)).toBeNull();
    expect(await countAiRunsToday(own)).toBe(1);
  });

  it("finishAiRun completa a linha do próprio tenant e não altera a de outro", async () => {
    const a = await makeTenant();
    const b = await makeTenant();
    const id = (await reserve(a, 5))!;
    const done = { model: "claude-opus-4-8", status: "ok" as const, output: { resumo: "x" } };
    expect(await finishAiRun(b, id, done)).toBeNull();
    const [untouched] = await db.select().from(aiRuns).where(eq(aiRuns.id, id));
    expect(untouched.status).toBe("pending");
    expect(untouched.output).toBeNull();
    const row = await finishAiRun(a, id, {
      ...done,
      inputTokens: 10,
      outputTokens: 5,
      cacheReadInputTokens: 3,
      durationMs: 1200,
      data: { effort: "low", cacheCreation: 7 },
    });
    expect(row).toMatchObject({
      id,
      tenantId: a.tenantId,
      model: "claude-opus-4-8",
      status: "ok",
      inputTokens: 10,
      outputTokens: 5,
      cacheReadInputTokens: 3,
      durationMs: 1200,
      output: { resumo: "x" },
      data: { effort: "low", cacheCreation: 7 },
    });
    expect(await countAiRunsToday(a)).toBe(1);
  });
});

describe("getLatestAiRun e listAiRuns", () => {
  it("ignora status diferente de ok e devolve o mais recente", async () => {
    const own = await makeTenant();
    const { lead } = await createLead(own, {
      segment: "PF",
      interest: "rouanet",
      name: "Lead Recente",
      email: uniqueEmail("ia"),
      source: "indicacao_contador",
    });
    await insertAiRun(own, {
      kind: "reply",
      leadId: lead.id,
      model: "m",
      status: "ok",
      output: { texto: "antigo" },
    });
    await insertAiRun(own, {
      kind: "reply",
      leadId: lead.id,
      model: "m",
      status: "ok",
      output: { texto: "novo" },
    });
    await insertAiRun(own, { kind: "reply", leadId: lead.id, model: "m", status: "refusal" });
    await insertAiRun(own, {
      kind: "brief",
      leadId: lead.id,
      model: "m",
      status: "ok",
      output: { resumo: "b" },
    });
    const latest = await getLatestAiRun(own, { leadId: lead.id, kind: "reply" });
    expect(latest?.output).toEqual({ texto: "novo" });
    expect(await getLatestAiRun(own, { leadId: lead.id, kind: "notes" })).toBeNull();
    const list = await listAiRuns(own, { leadId: lead.id });
    expect(list).toHaveLength(4);
    expect(list[0].kind).toBe("brief");
    expect(await listAiRuns(own, { leadId: lead.id, limit: 2 })).toHaveLength(2);
  });
});
