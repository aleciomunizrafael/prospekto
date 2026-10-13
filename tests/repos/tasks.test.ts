// Quadro de Tarefas (ADR-004, 6.5; plano, P2, P3, P16) contra PGlite.
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { taskStatusOf } from "@/lib/crm/task-status";
import { dayBounds } from "@/lib/crm/format";
import type { Ctx } from "@/lib/repos/ctx";
import { createActivity, getActivity, listActivities } from "@/lib/repos/activities";
import { createLead, recordLeadActivity, type Lead } from "@/lib/repos/leads";
import { createOrganization } from "@/lib/repos/organizations";
import {
  countOverdueOpenTasks,
  createTask,
  deleteTask,
  getTask,
  listOpenTasksForOwner,
  listTasksBoard,
  moveTask,
  searchTasks,
  updateTask,
} from "@/lib/repos/tasks";
import { and, eq } from "drizzle-orm";
import { makeTenant, makeUser, uniqueEmail } from "../helpers";

let ctx: Ctx;
let lead: Lead;

beforeAll(async () => {
  ctx = await makeTenant();
  ({ lead } = await createLead(ctx, {
    segment: "PJ",
    interest: "rouanet",
    name: "Rodrigo Exemplo",
    email: uniqueEmail("tarefas"),
    source: "linkedin",
    attributes: { empresa: "Vinícola Exemplo" },
  }));
});

describe("taskStatusOf (P2)", () => {
  it("deriva o estado de started_at e done_at", () => {
    expect(taskStatusOf({ startedAt: null, doneAt: null })).toBe("a_fazer");
    expect(taskStatusOf({ startedAt: new Date(), doneAt: null })).toBe("em_andamento");
    expect(taskStatusOf({ startedAt: new Date(), doneAt: new Date() })).toBe("concluida");
    expect(taskStatusOf({ startedAt: null, doneAt: new Date() })).toBe("concluida");
  });
});

describe("createTask", () => {
  it("tarefa solta grava type = tarefa, priority = media, position = 1 e dono da sessão", async () => {
    const own = await makeTenant();
    const task = await createTask(own, { subject: "Ligar para a associação" });
    expect(task.type).toBe("tarefa");
    expect(task.priority).toBe("media");
    expect(task.position).toBe(1);
    expect(task.leadId).toBeNull();
    expect(task.orgId).toBeNull();
    expect(task.ownerUserId).toBe(own.userId);
    expect(task.startedAt).toBeNull();
    expect(task.doneAt).toBeNull();
    const second = await createTask(own, { subject: "Segunda" });
    expect(second.position).toBe(2);
  });

  it("ownerUserId: null grava ninguém; outro usuário do tenant é aceito", async () => {
    const nobody = await createTask(ctx, { subject: "Sem dono", ownerUserId: null });
    expect(nobody.ownerUserId).toBeNull();
    const other = await makeUser(ctx);
    const assigned = await createTask(ctx, { subject: "Com dono", ownerUserId: other });
    expect(assigned.ownerUserId).toBe(other);
    await expect(
      createTask(ctx, { subject: "Dono alheio", ownerUserId: "nao-existe" }),
    ).rejects.toThrow(/responsável/);
  });

  it("status em_andamento grava startedAt; concluida grava doneAt", async () => {
    const doing = await createTask(ctx, { subject: "Em andamento", status: "em_andamento" });
    expect(doing.startedAt).toBeInstanceOf(Date);
    expect(doing.doneAt).toBeNull();
    const done = await createTask(ctx, { subject: "Concluída", status: "concluida" });
    expect(done.doneAt).toBeInstanceOf(Date);
  });

  it("vínculo com lead do tenant; mais de um vínculo é recusado", async () => {
    const task = await createTask(ctx, { subject: "Enviar proposta", leadId: lead.id });
    expect(task.leadId).toBe(lead.id);
    const org = await createOrganization(ctx, { type: "empresa", name: "Empresa Tarefa" });
    await expect(
      createTask(ctx, { subject: "Dois vínculos", leadId: lead.id, orgId: org.id }),
    ).rejects.toThrow(/não a mais de um/);
    const other = await makeTenant();
    await expect(createTask(other, { subject: "Lead alheio", leadId: lead.id })).rejects.toThrow(
      /Lead não encontrado/,
    );
  });
});

describe("prioridade e posição em todo caminho que insere tarefa (P16)", () => {
  it("recordLeadActivity de tipo tarefa grava media e posição acima da última aberta", async () => {
    const before = await listTasksBoard(ctx, { now: new Date() });
    const maxBefore = Math.max(
      0,
      ...[...before.a_fazer.rows, ...before.em_andamento.rows].map((t) => t.position),
    );
    const { activity } = await recordLeadActivity(ctx, {
      leadId: lead.id,
      activity: { type: "tarefa", subject: "Tarefa do lead", dueAt: new Date() },
    });
    expect(activity.priority).toBe("media");
    expect(activity.position).toBeGreaterThan(maxBefore);
    const { activity: call } = await recordLeadActivity(ctx, {
      leadId: lead.id,
      activity: { type: "ligacao", subject: "Ligação" },
      touchLastContact: true,
    });
    expect(call.priority).toBeNull();
    expect(call.position).toBe(0);
  });

  it("createActivity de tipo tarefa grava media e posição; nota sem vínculo continua recusada", async () => {
    const task = await createActivity(ctx, { type: "tarefa", subject: "Pelo createActivity" });
    expect(task.priority).toBe("media");
    expect(task.position).toBeGreaterThan(0);
    const high = await createActivity(ctx, {
      type: "tarefa",
      subject: "Alta",
      priority: "alta",
      leadId: lead.id,
    });
    expect(high.priority).toBe("alta");
    await expect(createActivity(ctx, { type: "nota", subject: "Solta" })).rejects.toThrow(
      /precisa estar ligada/,
    );
  });

  it("o banco recusa prioridade fora do enum", async () => {
    await expect(
      db.insert(activities).values({
        tenantId: ctx.tenantId,
        type: "tarefa",
        subject: "Inválida",
        priority: "urgente",
      }),
    ).rejects.toThrow();
  });
});

describe("moveTask (P3)", () => {
  it("para concluida grava doneAt; para a_fazer limpa os dois; em_andamento mantém startedAt", async () => {
    const own = await makeTenant();
    const task = await createTask(own, { subject: "Mover" });
    const doing = await moveTask(own, { activityId: task.id, status: "em_andamento", index: 0 });
    expect(doing.startedAt).toBeInstanceOf(Date);
    expect(doing.doneAt).toBeNull();
    const started = doing.startedAt;
    const done = await moveTask(own, { activityId: task.id, status: "concluida", index: 0 });
    expect(done.doneAt).toBeInstanceOf(Date);
    expect(done.startedAt?.getTime()).toBe(started?.getTime());
    const reopened = await moveTask(own, { activityId: task.id, status: "a_fazer", index: 0 });
    expect(reopened.startedAt).toBeNull();
    expect(reopened.doneAt).toBeNull();
  });

  it("reposicionar dentro de Concluída mantém doneAt (G20); vindo de coluna aberta grava o agora", async () => {
    const own = await makeTenant();
    const finishedAt = new Date("2026-09-01T12:00:00Z");
    const task = await createTask(own, { subject: "Feita em setembro", status: "em_andamento" });
    const done = await moveTask(own, {
      activityId: task.id,
      status: "concluida",
      index: 0,
      now: finishedAt,
    });
    expect(done.doneAt?.toISOString()).toBe(finishedAt.toISOString());
    const started = done.startedAt;
    // Soltar o cartão concluído de novo em Concluída (outro índice, sem `now`) não reescreve a
    // data real de conclusão nem o started_at.
    const again = await moveTask(own, { activityId: task.id, status: "concluida", index: 1 });
    expect(again.doneAt?.toISOString()).toBe(finishedAt.toISOString());
    expect(again.startedAt?.getTime()).toBe(started?.getTime());
    // Uma tarefa aberta continua recebendo o agora ao ser concluída.
    const other = await createTask(own, { subject: "Feita agora" });
    const now = new Date("2026-10-13T19:00:00Z");
    const fresh = await moveTask(own, { activityId: other.id, status: "concluida", index: 0, now });
    expect(fresh.doneAt?.toISOString()).toBe(now.toISOString());
    const board = await listTasksBoard(own, { now });
    expect(board.concluida.rows.map((t) => t.subject)).toEqual([
      "Feita agora",
      "Feita em setembro",
    ]);
  });

  it("posição entre vizinhos é a média; no fim é last + 1; no início é first - 1", async () => {
    const own = await makeTenant();
    const t1 = await createTask(own, { subject: "Um" }); // 1
    const t2 = await createTask(own, { subject: "Dois" }); // 2
    const t3 = await createTask(own, { subject: "Três" }); // 3
    const moved = await moveTask(own, { activityId: t3.id, status: "a_fazer", index: 1 });
    expect(moved.position).toBe(1.5);
    const first = await moveTask(own, { activityId: t2.id, status: "a_fazer", index: 0 });
    expect(first.position).toBe(0);
    const last = await moveTask(own, { activityId: t1.id, status: "a_fazer", index: 10 });
    expect(last.position).toBe(2.5);
    const board = await listTasksBoard(own, { now: new Date() });
    expect(board.a_fazer.rows.map((t) => t.subject)).toEqual(["Dois", "Três", "Um"]);
  });

  it("renumera 1..n quando a distância entre vizinhos cai abaixo de 1e-6", async () => {
    const own = await makeTenant();
    const a = await createTask(own, { subject: "A" });
    const b = await createTask(own, { subject: "B" });
    const c = await createTask(own, { subject: "C" });
    // Força posições quase iguais direto no banco.
    await db
      .update(activities)
      .set({ position: 1 })
      .where(and(eq(activities.tenantId, own.tenantId), eq(activities.id, a.id)));
    await db
      .update(activities)
      .set({ position: 1 + 1e-7 })
      .where(and(eq(activities.tenantId, own.tenantId), eq(activities.id, b.id)));
    const moved = await moveTask(own, { activityId: c.id, status: "a_fazer", index: 1 });
    expect(moved.position).toBe(2);
    const board = await listTasksBoard(own, { now: new Date() });
    expect(board.a_fazer.rows.map((t) => [t.subject, t.position])).toEqual([
      ["A", 1],
      ["C", 2],
      ["B", 3],
    ]);
  });

  it("âncoras pelos vizinhos visíveis: com filtro, a tarefa cai entre eles na coluna inteira", async () => {
    const own = await makeTenant();
    const colleague = await makeUser(own);
    const now = new Date();
    await createTask(own, { subject: "De outra pessoa", ownerUserId: colleague });
    await createTask(own, { subject: "De outra pessoa 2", ownerUserId: colleague });
    const mine1 = await createTask(own, { subject: "Minha 1" });
    const mine2 = await createTask(own, { subject: "Minha 2" });
    const column = async () =>
      (await listTasksBoard(own, { now })).a_fazer.rows.map((t) => t.subject);
    const mine = await listTasksBoard(own, { now, ownerUserId: own.userId! });
    expect(mine.a_fazer.rows.map((t) => t.subject)).toEqual(["Minha 1", "Minha 2"]);

    // "Só as minhas": arrastar Minha 2 para antes de Minha 1 manda index 0 e afterId = Minha 1;
    // sem a âncora ela iria para antes de todas.
    await moveTask(own, { activityId: mine2.id, status: "a_fazer", index: 0, afterId: mine1.id });
    expect(await column()).toEqual(["De outra pessoa", "De outra pessoa 2", "Minha 2", "Minha 1"]);
    // Fim da lista filtrada: beforeId = último visível, e a tarefa entra logo depois dele.
    await moveTask(own, { activityId: mine2.id, status: "a_fazer", index: 1, beforeId: mine1.id });
    expect(await column()).toEqual(["De outra pessoa", "De outra pessoa 2", "Minha 1", "Minha 2"]);

    // Com cartões escondidos entre as duas âncoras, afterId manda: logo antes dele.
    await moveTask(own, { activityId: mine1.id, status: "a_fazer", index: 0 });
    expect(await column()).toEqual(["Minha 1", "De outra pessoa", "De outra pessoa 2", "Minha 2"]);
    const mine3 = await createTask(own, { subject: "Minha 3", status: "em_andamento" });
    await moveTask(own, {
      activityId: mine3.id,
      status: "a_fazer",
      index: 1,
      beforeId: mine1.id,
      afterId: mine2.id,
    });
    expect(await column()).toEqual([
      "Minha 1",
      "De outra pessoa",
      "De outra pessoa 2",
      "Minha 3",
      "Minha 2",
    ]);

    // Âncora que já não está na coluna (movida ou excluída no meio-tempo) cai no índice.
    const elsewhere = await createTask(own, { subject: "Noutra coluna", status: "em_andamento" });
    await moveTask(own, {
      activityId: mine3.id,
      status: "a_fazer",
      index: 0,
      beforeId: elsewhere.id,
      afterId: elsewhere.id,
    });
    expect((await column())[0]).toBe("Minha 3");
  });

  it("tarefa de outro tenant não é movida", async () => {
    const other = await makeTenant();
    const task = await createTask(ctx, { subject: "Minha" });
    await expect(
      moveTask(other, { activityId: task.id, status: "concluida", index: 0 }),
    ).rejects.toThrow(/Tarefa não encontrad/);
    expect((await getActivity(ctx, task.id))?.doneAt).toBeNull();
  });
});

describe("updateTask", () => {
  it("troca prioridade, limpa o dono com null e troca o status", async () => {
    const task = await createTask(ctx, { subject: "Editar", leadId: lead.id });
    const updated = await updateTask(ctx, {
      activityId: task.id,
      priority: "alta",
      ownerUserId: null,
      status: "em_andamento",
      subject: "Editada",
    });
    expect(updated.priority).toBe("alta");
    expect(updated.ownerUserId).toBeNull();
    expect(updated.startedAt).toBeInstanceOf(Date);
    expect(updated.subject).toBe("Editada");
    expect(updated.leadId).toBe(lead.id);
    const unlinked = await updateTask(ctx, { activityId: task.id, leadId: null });
    expect(unlinked.leadId).toBeNull();
  });
});

describe("deleteTask", () => {
  it("recusa atividade que não é tarefa", async () => {
    const note = await createActivity(ctx, { type: "nota", subject: "Nota", leadId: lead.id });
    await expect(deleteTask(ctx, note.id)).rejects.toThrow(/Tarefa não encontrad/);
    expect(await getActivity(ctx, note.id)).not.toBeNull();
  });

  it("numa tarefa com lead grava activities.sistema 'Tarefa excluída' e apaga", async () => {
    const task = await createTask(ctx, { subject: "Enviar proposta", leadId: lead.id });
    await deleteTask(ctx, task.id);
    expect(await getActivity(ctx, task.id)).toBeNull();
    const system = await listActivities(ctx, { leadId: lead.id, type: "sistema" });
    expect(system.map((s) => s.subject)).toContain("Tarefa excluída: Enviar proposta");
  });

  it("tarefa solta é apagada sem registro de sistema", async () => {
    const own = await makeTenant();
    const task = await createTask(own, { subject: "Solta" });
    await deleteTask(own, task.id);
    expect(await getActivity(own, task.id)).toBeNull();
    expect(await listActivities(own, { type: "sistema" })).toHaveLength(0);
  });
});

describe("listTasksBoard", () => {
  it("respeita ownerUserId, overdueOnly, dueToday e o teto de 20 concluídas", async () => {
    const own = await makeTenant();
    const other = await makeUser(own);
    const now = new Date("2026-10-13T15:00:00Z");
    const yesterday = new Date("2026-10-12T15:00:00Z");
    const todayLate = new Date(dayBounds(now).end.getTime() - 60_000);
    const nextWeek = new Date("2026-10-20T15:00:00Z");
    await createTask(own, { subject: "Vencida minha", dueAt: yesterday });
    await createTask(own, { subject: "Hoje minha", dueAt: todayLate });
    await createTask(own, { subject: "Futura minha", dueAt: nextWeek });
    await createTask(own, { subject: "Sem prazo minha" });
    await createTask(own, { subject: "Vencida dele", dueAt: yesterday, ownerUserId: other });
    await createTask(own, {
      subject: "Vencida em andamento",
      dueAt: yesterday,
      status: "em_andamento",
    });
    for (let i = 0; i < 25; i += 1) {
      await createTask(own, { subject: `Feita ${i}`, status: "concluida", dueAt: yesterday });
    }

    const all = await listTasksBoard(own, { now });
    expect(all.a_fazer.total).toBe(5);
    expect(all.concluida.total).toBe(25);
    expect(all.concluida.rows).toHaveLength(20);

    const mine = await listTasksBoard(own, { now, ownerUserId: own.userId! });
    expect(mine.a_fazer.rows.map((t) => t.subject).sort()).toEqual([
      "Futura minha",
      "Hoje minha",
      "Sem prazo minha",
      "Vencida minha",
    ]);

    const overdue = await listTasksBoard(own, { now, overdueOnly: true });
    expect(overdue.a_fazer.rows.map((t) => t.subject).sort()).toEqual([
      "Vencida dele",
      "Vencida minha",
    ]);
    expect(overdue.a_fazer.total).toBe(2);
    expect(overdue.em_andamento.total).toBe(1);

    // O cabeçalho conta as atrasadas por um count próprio (G25): A fazer ∪ Em andamento, sem
    // carregar o quadro; com dono, só as dele.
    expect(await countOverdueOpenTasks(own, { now })).toBe(
      overdue.a_fazer.total + overdue.em_andamento.total,
    );
    const overdueMine = await listTasksBoard(own, {
      now,
      overdueOnly: true,
      ownerUserId: own.userId!,
    });
    expect(await countOverdueOpenTasks(own, { now, ownerUserId: own.userId! })).toBe(
      overdueMine.a_fazer.total + overdueMine.em_andamento.total,
    );
    expect(await countOverdueOpenTasks(own, { now, ownerUserId: own.userId! })).toBe(2);
    expect(await countOverdueOpenTasks(own, { now: yesterday })).toBe(0);

    const today = await listTasksBoard(own, { now, dueToday: true });
    expect(today.a_fazer.rows.map((t) => t.subject).sort()).toEqual([
      "Hoje minha",
      "Vencida dele",
      "Vencida minha",
    ]);
  });

  it("traz os nomes dos vínculos e do dono", async () => {
    const own = await makeTenant();
    const org = await createOrganization(own, { type: "empresa", name: "Metalúrgica Modelo" });
    await createTask(own, { subject: "Visitar", orgId: org.id });
    const board = await listTasksBoard(own, { now: new Date() });
    const row = board.a_fazer.rows.find((t) => t.subject === "Visitar");
    expect(row?.orgName).toBe("Metalúrgica Modelo");
    expect(row?.ownerName).toMatch(/Usuário/);
    expect(row?.contributionLabel).toBeNull();
  });
});

describe("listOpenTasksForOwner e searchTasks", () => {
  it("minhas tarefas por vencimento com nulos por último; busca por assunto com abertas primeiro", async () => {
    const own = await makeTenant();
    const now = new Date("2026-10-13T15:00:00Z");
    await createTask(own, { subject: "Sem prazo" });
    await createTask(own, { subject: "Amanhã", dueAt: new Date("2026-10-14T12:00:00Z") });
    await createTask(own, { subject: "Ontem", dueAt: new Date("2026-10-12T12:00:00Z") });
    await createTask(own, { subject: "Feita ontem", status: "concluida" });
    const mine = await listOpenTasksForOwner(own, { ownerUserId: own.userId!, now });
    expect(mine.map((t) => t.subject)).toEqual(["Ontem", "Amanhã", "Sem prazo"]);
    const found = await searchTasks(own, { search: "ontem" });
    expect(found.map((t) => t.subject)).toEqual(["Ontem", "Feita ontem"]);
    expect(await getTask(own, mine[0].id)).not.toBeNull();
  });
});

describe("posições fracionárias em sequência (frente B)", () => {
  it("dez movimentos seguidos mantêm a ordem esperada", async () => {
    const own = await makeTenant();
    const ids: Record<string, string> = {};
    for (const name of ["A", "B", "C", "D", "E"]) {
      ids[name] = (await createTask(own, { subject: name })).id;
    }
    // Modelo em memória da coluna: a mesma sequência aplicada a uma lista simples.
    const expected = ["A", "B", "C", "D", "E"];
    const moves: [string, number][] = [
      ["E", 0],
      ["A", 4],
      ["C", 0],
      ["B", 2],
      ["D", 1],
      ["E", 3],
      ["A", 0],
      ["C", 4],
      ["B", 0],
      ["D", 2],
    ];
    for (const [name, index] of moves) {
      await moveTask(own, { activityId: ids[name], status: "a_fazer", index });
      expected.splice(expected.indexOf(name), 1);
      expected.splice(Math.min(index, expected.length), 0, name);
      const board = await listTasksBoard(own, { now: new Date() });
      expect(
        board.a_fazer.rows.map((t) => t.subject),
        moves.indexOf([name, index]) + "",
      ).toEqual(expected);
    }
    const final = await listTasksBoard(own, { now: new Date() });
    const positions = final.a_fazer.rows.map((t) => t.position);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("a renumeração preserva a ordem e deixa distâncias inteiras", async () => {
    const own = await makeTenant();
    const a = await createTask(own, { subject: "A" }); // 1
    await createTask(own, { subject: "B" }); // 2
    const c = await createTask(own, { subject: "C" }); // 3
    // Move C para entre A e B muitas vezes alternando com A: as posições colapsam até 1e-6 e o
    // repositório renumera 1..n.
    let renumbered = false;
    for (let i = 0; i < 40 && !renumbered; i += 1) {
      const moved = await moveTask(own, { activityId: c.id, status: "a_fazer", index: 1 });
      const back = await moveTask(own, { activityId: a.id, status: "a_fazer", index: 1 });
      renumbered = Number.isInteger(moved.position) && Number.isInteger(back.position) && i > 0;
    }
    const board = await listTasksBoard(own, { now: new Date() });
    expect(board.a_fazer.rows.map((t) => t.subject)).toEqual(["C", "A", "B"]);
    expect(board.a_fazer.rows.map((t) => t.position)).toEqual([1, 2, 3]);
  });
});
