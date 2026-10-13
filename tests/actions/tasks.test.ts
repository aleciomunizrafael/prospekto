// Server Actions do quadro de Tarefas (src/actions/tasks.ts) contra PGlite. requireSession é
// substituído por um contexto do teste; next/cache e next/navigation são neutralizados. O
// console é espionado: o assunto da tarefa nunca vai para o log (R-16).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createTaskAction,
  deleteTaskAction,
  moveTaskAction,
  searchTaskLeadsAction,
  updateTaskAction,
} from "@/actions/tasks";
import { idleState } from "@/lib/crm/form-state";
import { taskStatusOf } from "@/lib/crm/task-status";
import { createActivity, getActivity, listActivities } from "@/lib/repos/activities";
import type { Ctx } from "@/lib/repos/ctx";
import { createLead } from "@/lib/repos/leads";
import { createOrganization } from "@/lib/repos/organizations";
import { createTask, getTask, listTasksBoard } from "@/lib/repos/tasks";
import { makeTenant, uniqueEmail } from "../helpers";

const session = vi.hoisted(() => ({ ctx: null as Ctx | null }));

vi.mock("@/lib/session", () => ({
  requireSession: async () => {
    if (!session.ctx) throw new Error("REDIRECT:/entrar");
    return { ...session.ctx, role: "owner" };
  },
}));
vi.mock("next/cache", () => ({
  refresh: () => undefined,
  revalidatePath: () => undefined,
  updateTag: () => undefined,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const SUBJECT = "Enviar proposta ao patrocinador sigiloso";
const logged: string[] = [];
const spies = (["log", "warn", "error"] as const).map((level) =>
  vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
    logged.push(args.map(String).join(" "));
  }),
);

let ctx: Ctx;
let other: Ctx;
let leadId: string;

beforeAll(async () => {
  ctx = await makeTenant();
  other = await makeTenant();
  session.ctx = ctx;
  const { lead } = await createLead(ctx, {
    segment: "PJ",
    interest: "rouanet",
    name: "Lead das Tarefas",
    email: uniqueEmail("tarefas-action"),
    source: "linkedin",
    attributes: { empresa: "Empresa das Tarefas" },
  });
  leadId = lead.id;
});

afterAll(() => {
  for (const spy of spies) spy.mockRestore();
});

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

async function board() {
  return listTasksBoard(ctx, { now: new Date() });
}

describe("createTaskAction", () => {
  it("cria tarefa solta com o usuário da sessão como responsável e prioridade média", async () => {
    const result = await createTaskAction(idleState, fd({ subject: SUBJECT }));
    expect(result).toEqual({ status: "ok", message: "Tarefa criada." });
    const b = await board();
    const task = b.a_fazer.rows.find((t) => t.subject === SUBJECT);
    expect(task).toBeDefined();
    expect(task?.ownerUserId).toBe(ctx.userId);
    expect(task?.priority).toBe("media");
    expect(task?.leadId).toBeNull();
    expect(task?.dueAt).toBeNull();
  });

  it("'Ninguém' (ownerUserId vazio) grava nulo; prazo entra na mensagem; vínculo com lead", async () => {
    const result = await createTaskAction(
      idleState,
      fd({
        subject: "Com lead",
        ownerUserId: "",
        priority: "alta",
        status: "em_andamento",
        dueAt: "2026-10-16T09:00",
        linkKind: "lead",
        leadId,
      }),
    );
    expect(result.status).toBe("ok");
    expect(result.status === "ok" && result.message).toMatch(/^Tarefa criada\. Vence sex\./);
    const b = await board();
    const task = b.em_andamento.rows.find((t) => t.subject === "Com lead");
    expect(task?.ownerUserId).toBeNull();
    expect(task?.priority).toBe("alta");
    expect(task?.leadId).toBe(leadId);
    expect(task?.leadName).toBe("Lead das Tarefas");
    expect(task?.startedAt).toBeInstanceOf(Date);
  });

  it("recusa título vazio, prazo inválido e vínculo escolhido sem o registro", async () => {
    const empty = await createTaskAction(idleState, fd({ subject: "   " }));
    expect(empty.status).toBe("error");
    expect(empty.status === "error" && empty.fieldErrors?.subject).toMatch(/título/);
    const badDate = await createTaskAction(idleState, fd({ subject: "x", dueAt: "ontem" }));
    expect(badDate.status === "error" && badDate.fieldErrors?.dueAt).toMatch(/data e hora/);
    const noLead = await createTaskAction(idleState, fd({ subject: "x", linkKind: "lead" }));
    expect(noLead.status === "error" && noLead.fieldErrors?.leadId).toMatch(/escolha o lead/i);
    const noOrg = await createTaskAction(idleState, fd({ subject: "x", linkKind: "organizacao" }));
    expect(noOrg.status === "error" && noOrg.fieldErrors?.orgId).toMatch(/organização/);
    expect((await board()).a_fazer.rows.map((t) => t.subject)).not.toContain("x");
  });

  it("lead de outro tenant é recusado sem gravar", async () => {
    const { lead } = await createLead(other, {
      segment: "PJ",
      interest: "rouanet",
      name: "Lead Alheio",
      email: uniqueEmail("alheio"),
      source: "linkedin",
    });
    const result = await createTaskAction(
      idleState,
      fd({ subject: "Alheia", linkKind: "lead", leadId: lead.id }),
    );
    expect(result.status).toBe("error");
    expect(result.status === "error" && result.message).toMatch(/Lead não encontrado/);
    expect((await board()).a_fazer.rows.map((t) => t.subject)).not.toContain("Alheia");
  });
});

describe("updateTaskAction", () => {
  it("troca prioridade, limpa o dono, troca o vínculo e move de coluna pelo campo Status", async () => {
    const task = await createTask(ctx, { subject: "Editar", leadId });
    const org = await createOrganization(ctx, { type: "empresa", name: "Org da Tarefa" });
    const result = await updateTaskAction(
      idleState,
      fd({
        activityId: task.id,
        subject: "Editada",
        body: "Descrição nova",
        ownerUserId: "",
        priority: "baixa",
        status: "em_andamento",
        linkKind: "organizacao",
        orgId: org.id,
      }),
    );
    expect(result).toEqual({ status: "ok", message: "Tarefa salva." });
    const updated = await getTask(ctx, task.id);
    expect(updated?.subject).toBe("Editada");
    expect(updated?.body).toBe("Descrição nova");
    expect(updated?.ownerUserId).toBeNull();
    expect(updated?.priority).toBe("baixa");
    expect(updated?.leadId).toBeNull();
    expect(updated?.orgId).toBe(org.id);
    expect(updated && taskStatusOf(updated)).toBe("em_andamento");
    // Entra no fim da coluna nova.
    const b = await board();
    expect(b.em_andamento.rows.at(-1)?.id).toBe(task.id);
  });

  it("'Nenhum' limpa o vínculo e mantém o lead atual quando o picker não escolheu outro", async () => {
    const task = await createTask(ctx, { subject: "Vínculo", leadId });
    const kept = await updateTaskAction(
      idleState,
      fd({ activityId: task.id, subject: "Vínculo", linkKind: "lead", leadIdCurrent: leadId }),
    );
    expect(kept.status).toBe("ok");
    expect((await getTask(ctx, task.id))?.leadId).toBe(leadId);
    const cleared = await updateTaskAction(
      idleState,
      fd({ activityId: task.id, subject: "Vínculo", linkKind: "nenhum" }),
    );
    expect(cleared.status).toBe("ok");
    expect((await getTask(ctx, task.id))?.leadId).toBeNull();
  });

  it("tarefa de outro tenant: erro e nada gravado", async () => {
    const theirs = await createTask(other, { subject: "Deles" });
    const result = await updateTaskAction(
      idleState,
      fd({ activityId: theirs.id, subject: "Minha agora", priority: "alta" }),
    );
    expect(result.status).toBe("error");
    expect((await getTask(other, theirs.id))?.subject).toBe("Deles");
  });
});

describe("moveTaskAction", () => {
  it("entre as três colunas grava startedAt/doneAt e a posição, com a mensagem de cada passo", async () => {
    const own = await makeTenant();
    session.ctx = own;
    try {
      const first = await createTask(own, { subject: "Primeira" });
      const second = await createTask(own, { subject: "Segunda" });
      const doing = await moveTaskAction({
        activityId: second.id,
        status: "em_andamento",
        index: 0,
      });
      expect(doing).toEqual({ status: "ok", message: "Tarefa em andamento." });
      expect((await getTask(own, second.id))?.startedAt).toBeInstanceOf(Date);
      const done = await moveTaskAction({ activityId: second.id, status: "concluida", index: 0 });
      expect(done).toEqual({ status: "ok", message: "Tarefa concluída." });
      expect((await getTask(own, second.id))?.doneAt).toBeInstanceOf(Date);
      const reopened = await moveTaskAction({ activityId: second.id, status: "a_fazer", index: 0 });
      expect(reopened).toEqual({ status: "ok", message: "Tarefa reaberta." });
      const row = await getTask(own, second.id);
      expect(row?.doneAt).toBeNull();
      expect(row?.startedAt).toBeNull();
      // Reaberta no índice 0: posição abaixo da primeira (first - 1).
      expect(row?.position).toBeLessThan(first.position);
      const b = await listTasksBoard(own, { now: new Date() });
      expect(b.a_fazer.rows.map((t) => t.subject)).toEqual(["Segunda", "Primeira"]);
      const same = await moveTaskAction({ activityId: second.id, status: "a_fazer", index: 1 });
      expect(same).toEqual({ status: "ok", message: "Ordem atualizada." });
    } finally {
      session.ctx = ctx;
    }
  });

  it("aceita as âncoras beforeId/afterId (uuid) e recusa âncora inválida sem gravar", async () => {
    const own = await makeTenant();
    session.ctx = own;
    try {
      const first = await createTask(own, { subject: "Primeira" });
      const second = await createTask(own, { subject: "Segunda" });
      const third = await createTask(own, { subject: "Terceira" });
      const order = async () =>
        (await listTasksBoard(own, { now: new Date() })).a_fazer.rows.map((t) => t.subject);
      // A âncora vence o índice (o índice é o da coluna como a tela a mostra, talvez filtrada).
      const anchored = await moveTaskAction({
        activityId: third.id,
        status: "a_fazer",
        index: 2,
        afterId: first.id,
      });
      expect(anchored).toEqual({ status: "ok", message: "Ordem atualizada." });
      expect(await order()).toEqual(["Terceira", "Primeira", "Segunda"]);
      const after = await moveTaskAction({
        activityId: third.id,
        status: "a_fazer",
        index: 0,
        beforeId: second.id,
      });
      expect(after.status).toBe("ok");
      expect(await order()).toEqual(["Primeira", "Segunda", "Terceira"]);
      const bad = await moveTaskAction({
        activityId: third.id,
        status: "concluida",
        index: 0,
        afterId: "x",
      });
      expect(bad).toEqual({ status: "error", message: "Movimento inválido." });
      expect((await getTask(own, third.id))?.doneAt).toBeNull();
      expect(await order()).toEqual(["Primeira", "Segunda", "Terceira"]);
    } finally {
      session.ctx = ctx;
    }
  });

  it.each([
    ["índice negativo", { status: "concluida", index: -1 }],
    ["índice fracionário", { status: "concluida", index: 1.5 }],
    ["status desconhecido", { status: "feita", index: 0 }],
  ])("%s devolve erro sem gravar", async (_label, partial) => {
    const task = await createTask(ctx, { subject: "Imóvel" });
    const result = await moveTaskAction({ activityId: task.id, ...partial });
    expect(result).toEqual({ status: "error", message: "Movimento inválido." });
    expect((await getTask(ctx, task.id))?.doneAt).toBeNull();
  });

  it("argumento que não é objeto devolve erro sem tocar o banco", async () => {
    for (const bad of [null, undefined, "x", 42, [], "00000000-0000-4000-8000-000000000001"]) {
      expect(await moveTaskAction(bad)).toEqual({
        status: "error",
        message: "Movimento inválido.",
      });
    }
  });

  it("tarefa de outro tenant devolve erro e não grava", async () => {
    const theirs = await createTask(other, { subject: "Deles" });
    const result = await moveTaskAction({ activityId: theirs.id, status: "concluida", index: 0 });
    expect(result).toEqual({ status: "error", message: "Tarefa não encontrada." });
    expect((await getTask(other, theirs.id))?.doneAt).toBeNull();
  });
});

describe("deleteTaskAction", () => {
  it("recusa atividade que não é tarefa", async () => {
    const note = await createActivity(ctx, { type: "nota", subject: "Nota", leadId });
    const result = await deleteTaskAction(idleState, fd({ activityId: note.id }));
    expect(result.status).toBe("error");
    expect(await getActivity(ctx, note.id)).not.toBeNull();
  });

  it("apaga a tarefa e grava 'Tarefa excluída' no lead quando havia vínculo", async () => {
    const task = await createTask(ctx, { subject: "Apagar com lead", leadId });
    const result = await deleteTaskAction(idleState, fd({ activityId: task.id }));
    expect(result).toEqual({ status: "ok", message: "Tarefa excluída." });
    expect(await getActivity(ctx, task.id)).toBeNull();
    const system = await listActivities(ctx, { leadId, type: "sistema" });
    expect(system.map((s) => s.subject)).toContain("Tarefa excluída: Apagar com lead");
  });

  it("tarefa de outro tenant: erro e continua lá; id inválido: erro", async () => {
    const theirs = await createTask(other, { subject: "Deles" });
    const result = await deleteTaskAction(idleState, fd({ activityId: theirs.id }));
    expect(result.status).toBe("error");
    expect(await getTask(other, theirs.id)).not.toBeNull();
    expect((await deleteTaskAction(idleState, fd({ activityId: "abc" }))).status).toBe("error");
  });
});

describe("searchTaskLeadsAction", () => {
  it("valida o argumento antes de ler; busca por nome só no tenant", async () => {
    expect(await searchTaskLeadsAction(null)).toEqual([]);
    expect(await searchTaskLeadsAction(42)).toEqual([]);
    expect(await searchTaskLeadsAction("a")).toEqual([]);
    expect(await searchTaskLeadsAction("x".repeat(1001))).toEqual([]);
    const found = await searchTaskLeadsAction("das Tarefas");
    expect(found.map((l) => l.id)).toEqual([leadId]);
    expect(found[0]).toMatchObject({ name: "Lead das Tarefas", segment: "PJ", stage: "novo" });
    expect(await searchTaskLeadsAction("Alheio")).toEqual([]);
  });
});

describe("guarda de sessão e logs", () => {
  it("sem sessão a action falha antes de tocar no banco", async () => {
    session.ctx = null;
    try {
      await expect(createTaskAction(idleState, fd({ subject: "Sem sessão" }))).rejects.toThrow(
        /REDIRECT/,
      );
      await expect(moveTaskAction({})).rejects.toThrow(/REDIRECT/);
    } finally {
      session.ctx = ctx;
    }
  });

  it("o console nunca recebe o assunto da tarefa (R-16)", () => {
    expect(logged.length).toBeGreaterThan(0);
    expect(logged.some((line) => line.includes('"tarefa criada"'))).toBe(true);
    for (const line of logged) {
      expect(line).not.toContain(SUBJECT);
      expect(line).not.toContain("Apagar com lead");
      expect(line).not.toContain("Lead das Tarefas");
    }
  });
});
