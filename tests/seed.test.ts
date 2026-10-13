// scripts/seed.ts: dados de demonstração num PGlite temporário, pelos scripts reais (migrate e
// seed em processos filhos, como `npm run db:migrate` e `npm run db:seed`). Cenário do README:
// o seed roda antes de SEED_USERS (tudo nasce sem dono) e a execução seguinte, já com usuário,
// preenche os responsáveis em vez de só pular. Sem .env.local no processo filho: o ambiente do
// Vitest já traz as variáveis exigidas por src/env.ts, e um DATABASE_URL local não pode vazar.
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prospectingMessages } from "@/lib/crm/prospecting-messages";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const DEMO_TASKS = [
  "Preparar o roteiro de ligações da semana",
  "Enviar proposta de patrocínio",
  "Confirmar a reunião de diagnóstico",
];

describe("scripts/seed.ts: dados de demonstração", () => {
  let base: string;
  let pg: PGlite;
  let userId: string;
  let secondRun = "";

  async function runScript(script: string, extra: Record<string, string>): Promise<string> {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ...extra,
      PGLITE_DIR: path.join(base, "pglite"),
      // Arquivo de credenciais do seed (senha temporária) fica dentro do diretório descartável.
      TMPDIR: base,
    };
    delete env.DATABASE_URL;
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--import", "tsx", path.join(root, "scripts", script)],
      { cwd: root, env, maxBuffer: 8 * 1024 * 1024 },
    );
    return stdout;
  }

  beforeAll(async () => {
    base = await mkdtemp(path.join(os.tmpdir(), "prospekto-seed-test-"));
    await runScript("migrate.ts", {});
    await runScript("seed.ts", { SEED_USERS: "" });
    secondRun = await runScript("seed.ts", { SEED_USERS: "Teste <teste@example.test>" });
    pg = new PGlite(path.join(base, "pglite"));
    const { rows } = await pg.query<{ id: string }>("select id from users where email = $1", [
      "teste@example.test",
    ]);
    userId = rows[0].id;
  }, 180_000);

  afterAll(async () => {
    await pg?.close();
    if (base) await rm(base, { recursive: true, force: true });
  });

  it("a segunda execução preenche os responsáveis em vez de só pular", () => {
    expect(secondRun).toContain("dados de demonstração já existem: responsáveis preenchidos");
    expect(secondRun).not.toContain("teste@example.test");
  });

  it("lista, ligações e tarefas ganham o usuário criado", async () => {
    const list = await pg.query<{ id: string; assignee: string | null; createdBy: string | null }>(
      `select id, assignee_user_id as "assignee", created_by_user_id as "createdBy"
       from prospecting_lists where name = 'Vinícolas do Vale'`,
    );
    expect(list.rows).toHaveLength(1);
    expect(list.rows[0].assignee).toBe(userId);
    expect(list.rows[0].createdBy).toBe(userId);

    const calls = await pg.query<{ createdBy: string | null }>(
      `select created_by_user_id as "createdBy" from activities
       where prospecting_item_id in (select id from prospecting_items where list_id = $1)`,
      [list.rows[0].id],
    );
    expect(calls.rows).toHaveLength(4);
    expect(calls.rows.every((r) => r.createdBy === userId)).toBe(true);

    const tasks = await pg.query<{
      subject: string;
      owner: string | null;
      createdBy: string | null;
    }>(
      `select subject, owner_user_id as "owner", created_by_user_id as "createdBy"
       from activities where type = 'tarefa' order by position`,
    );
    expect(tasks.rows.map((r) => r.subject)).toEqual(DEMO_TASKS);
    expect(tasks.rows.every((r) => r.owner === userId && r.createdBy === userId)).toBe(true);
  });

  it("leads fora de 'novo' e o Rodrigo ganham dono; os 'novo' do quadro continuam sem dono", async () => {
    const { rows } = await pg.query<{ email: string; stage: string; owner: string | null }>(
      `select email, stage, owner_user_id as "owner" from leads
       where source_detail = 'dados de demonstração' order by email`,
    );
    expect(rows).toHaveLength(11);
    const semDono = rows.filter((r) => r.owner === null).map((r) => r.email);
    expect(semDono).toEqual(["carlos.ficticio@example.test", "fernanda.ficticia@example.test"]);
    expect(rows.filter((r) => r.owner === null).every((r) => r.stage === "novo")).toBe(true);
    expect(rows.find((r) => r.email === "rodrigo.exemplo@example.test")?.owner).toBe(userId);
    expect(rows.filter((r) => r.stage !== "novo").every((r) => r.owner === userId)).toBe(true);
  });

  it("o projeto de demonstração ganha dono", async () => {
    const { rows } = await pg.query<{ owner: string | null }>(
      `select owner_user_id as "owner" from cultural_projects where slug = 'festival-ficticio-de-inverno'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].owner).toBe(userId);
  });

  // ADR-004, crítica 35: o CRM só sabe que a mensagem foi aberta com o texto; "aberto", nunca
  // "enviado". O texto é uma das variações que o produto gera para a empresa.
  it("a atividade de WhatsApp usa o assunto e o texto do produto", async () => {
    const { rows } = await pg.query<{ subject: string; body: string | null }>(
      `select a.subject, a.body from activities a
       join prospecting_items i on i.id = a.prospecting_item_id
       where a.type = 'whatsapp' and i.name = 'Espumantes Ilustrativos'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].subject).toBe("WhatsApp aberto pela prospecção");
    expect(prospectingMessages("Espumantes Ilustrativos")).toContain(rows[0].body);
    expect(readFileSync(path.join(root, "scripts/seed.ts"), "utf8")).not.toContain(
      "WhatsApp enviado",
    );
  });
});
