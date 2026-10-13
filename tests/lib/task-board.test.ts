// Helpers puros do quadro de Tarefas (src/lib/crm/task-board.ts): índice pelo ponteiro, posição
// fracionária (espelho da regra do repositório), agrupamento, otimista, contagens e filtros.
import { describe, expect, it } from "vitest";
import {
  applyOptimisticMove,
  describeEmptyFiltered,
  describeTaskCounts,
  describeTaskMove,
  groupTasks,
  hasTaskFilters,
  insertIndexFromPointer,
  moveAnchors,
  nextPosition,
  parseTaskFilters,
  taskFiltersHref,
  taskLinkOf,
} from "@/lib/crm/task-board";

const cards = [
  { top: 0, height: 100 },
  { top: 110, height: 100 },
  { top: 220, height: 100 },
];

describe("insertIndexFromPointer", () => {
  it.each([
    [-10, 0],
    [0, 0],
    [49, 0],
    [50, 1],
    [120, 1],
    [159, 1],
    [160, 2],
    [269, 2],
    [270, 3],
    [1000, 3],
  ])("ponteiro em %i px cai no índice %i", (clientY, index) => {
    expect(insertIndexFromPointer(cards, clientY)).toBe(index);
  });

  it("coluna vazia devolve 0", () => {
    expect(insertIndexFromPointer([], 50)).toBe(0);
  });
});

describe("nextPosition", () => {
  it.each([
    [{}, 1],
    [{ after: 1 }, 0],
    [{ before: 3 }, 4],
    [{ before: 1, after: 2 }, 1.5],
    [{ before: 1.5, after: 2 }, 1.75],
    [{ before: -2, after: 0 }, -1],
  ])("%j → %s", (neighbors, expected) => {
    expect(nextPosition(neighbors)).toBe(expected);
  });
});

const d = (iso: string) => new Date(iso);

function task(
  id: string,
  position: number,
  extra: Partial<{ startedAt: Date | null; doneAt: Date | null; createdAt: Date }> = {},
) {
  return {
    id,
    position,
    startedAt: null,
    doneAt: null,
    createdAt: d("2026-10-01T10:00:00Z"),
    ...extra,
  };
}

describe("groupTasks", () => {
  it("agrupa pelo estado derivado e ordena por posição, depois criação; concluída por done_at desc", () => {
    const rows = [
      task("b", 2),
      task("a", 1),
      task("same1", 3, { createdAt: d("2026-10-02T10:00:00Z") }),
      task("same0", 3, { createdAt: d("2026-10-01T10:00:00Z") }),
      task("doing", 5, { startedAt: d("2026-10-03T10:00:00Z") }),
      task("done-old", 1, { doneAt: d("2026-10-04T10:00:00Z") }),
      task("done-new", 9, { doneAt: d("2026-10-05T10:00:00Z") }),
    ];
    const groups = groupTasks(rows);
    expect(groups.a_fazer.map((t) => t.id)).toEqual(["a", "b", "same0", "same1"]);
    expect(groups.em_andamento.map((t) => t.id)).toEqual(["doing"]);
    expect(groups.concluida.map((t) => t.id)).toEqual(["done-new", "done-old"]);
  });
});

describe("moveAnchors", () => {
  const rows = [task("a", 1), task("b", 2), task("c", 3)];

  it.each([
    ["início: só afterId", "x", 0, { afterId: "a" }],
    ["entre a e b", "x", 1, { beforeId: "a", afterId: "b" }],
    ["fim: só beforeId", "x", 3, { beforeId: "c" }],
    ["além do fim cai no fim", "x", 10, { beforeId: "c" }],
    ["índice negativo cai no início", "x", -1, { afterId: "a" }],
    ["mesma coluna: o próprio cartão sai da conta", "b", 1, { beforeId: "a", afterId: "c" }],
    ["mesma coluna, para o fim", "a", 2, { beforeId: "c" }],
  ])("%s", (_label, movedId, index, expected) => {
    expect(moveAnchors(rows, movedId, index)).toEqual(expected);
  });

  it("coluna vazia, ou só com o próprio cartão, não tem âncoras", () => {
    expect(moveAnchors([], "x", 0)).toEqual({});
    expect(moveAnchors([task("x", 1)], "x", 0)).toEqual({});
  });
});

describe("applyOptimisticMove", () => {
  const board = {
    a_fazer: { rows: [task("a", 1), task("b", 2), task("c", 3)], total: 3 },
    em_andamento: { rows: [task("x", 1, { startedAt: d("2026-10-01T00:00:00Z") })], total: 1 },
    concluida: { rows: [], total: 0 },
  };
  const now = d("2026-10-13T12:00:00Z");

  it("move para outra coluna no índice pedido, grava started_at e ajusta os totais", () => {
    const next = applyOptimisticMove(
      board,
      { activityId: "b", status: "em_andamento", index: 0 },
      now,
    );
    expect(next.a_fazer.rows.map((t) => t.id)).toEqual(["a", "c"]);
    expect(next.a_fazer.total).toBe(2);
    expect(next.em_andamento.rows.map((t) => t.id)).toEqual(["b", "x"]);
    expect(next.em_andamento.total).toBe(2);
    const moved = next.em_andamento.rows[0];
    expect(moved.position).toBe(0);
    expect(moved.startedAt).toEqual(now);
    expect(moved.doneAt).toBeNull();
    // O quadro original não muda.
    expect(board.a_fazer.rows).toHaveLength(3);
  });

  it("reordena dentro da coluna com a média dos vizinhos; concluir grava done_at; reabrir limpa", () => {
    const reordered = applyOptimisticMove(
      board,
      { activityId: "c", status: "a_fazer", index: 1 },
      now,
    );
    expect(reordered.a_fazer.rows.map((t) => [t.id, t.position])).toEqual([
      ["a", 1],
      ["c", 1.5],
      ["b", 2],
    ]);
    expect(reordered.a_fazer.total).toBe(3);
    const done = applyOptimisticMove(
      board,
      { activityId: "x", status: "concluida", index: 0 },
      now,
    );
    expect(done.concluida.rows[0].doneAt).toEqual(now);
    expect(done.concluida.rows[0].startedAt).toEqual(d("2026-10-01T00:00:00Z"));
    const reopened = applyOptimisticMove(
      done,
      { activityId: "x", status: "a_fazer", index: 99 },
      now,
    );
    expect(reopened.a_fazer.rows.at(-1)?.id).toBe("x");
    expect(reopened.a_fazer.rows.at(-1)?.startedAt).toBeNull();
    expect(reopened.a_fazer.rows.at(-1)?.position).toBe(4);
  });

  it("Concluída ignora o índice solto: a recém-concluída entra no topo e a já concluída mantém done_at (G20)", () => {
    const earlier = d("2026-09-01T12:00:00Z");
    const withDone = {
      ...board,
      concluida: {
        rows: [
          task("done-new", 1, { doneAt: d("2026-10-10T10:00:00Z") }),
          task("done-old", 2, { doneAt: d("2026-10-05T10:00:00Z") }),
        ],
        total: 2,
      },
    };
    // Concluir pelo arrasto num índice do meio, ou pelo menu "⋯" (fim da coluna): topo, done_at = agora.
    const fresh = applyOptimisticMove(
      withDone,
      { activityId: "b", status: "concluida", index: 2 },
      now,
    );
    expect(fresh.concluida.rows.map((t) => t.id)).toEqual(["b", "done-new", "done-old"]);
    expect(fresh.concluida.rows[0].doneAt).toEqual(now);
    expect(fresh.concluida.rows[0].position).toBe(0);
    expect(fresh.concluida.total).toBe(3);
    expect(fresh.a_fazer.total).toBe(2);
    // Tarefa que já estava concluída (data antiga) solta de novo em Concluída: a data fica e ela
    // volta para onde done_at desc a põe, como o refresh vai mostrar.
    const old = {
      ...withDone,
      concluida: {
        rows: [...withDone.concluida.rows, task("done-older", 3, { doneAt: earlier })],
        total: 3,
      },
    };
    const kept = applyOptimisticMove(
      old,
      { activityId: "done-older", status: "concluida", index: 0 },
      now,
    );
    expect(kept.concluida.rows.map((t) => t.id)).toEqual(["done-new", "done-old", "done-older"]);
    expect(kept.concluida.rows[2].doneAt).toEqual(earlier);
    expect(kept.concluida.total).toBe(3);
    // Sozinha na coluna, a já concluída entra no índice 0 com a data mantida.
    const alone = applyOptimisticMove(
      { ...board, concluida: { rows: [task("done-older", 1, { doneAt: earlier })], total: 1 } },
      { activityId: "done-older", status: "concluida", index: 5 },
      now,
    );
    expect(alone.concluida.rows.map((t) => t.id)).toEqual(["done-older"]);
    expect(alone.concluida.rows[0].doneAt).toEqual(earlier);
  });

  it("tarefa desconhecida devolve o mesmo quadro", () => {
    expect(applyOptimisticMove(board, { activityId: "nope", status: "concluida", index: 0 })).toBe(
      board,
    );
  });
});

describe("textos", () => {
  it("describeTaskCounts e describeTaskMove", () => {
    const board = { a_fazer: { total: 10 }, em_andamento: { total: 2 } };
    expect(describeTaskCounts(board, 3)).toBe("12 abertas · 3 atrasadas");
    expect(describeTaskCounts({ a_fazer: { total: 1 }, em_andamento: { total: 0 } }, 1)).toBe(
      "1 aberta · 1 atrasada",
    );
    expect(describeTaskMove("a_fazer", "em_andamento")).toBe("Tarefa em andamento.");
    expect(describeTaskMove("em_andamento", "concluida")).toBe("Tarefa concluída.");
    expect(describeTaskMove("concluida", "a_fazer")).toBe("Tarefa reaberta.");
    expect(describeTaskMove("em_andamento", "a_fazer")).toBe("Tarefa de volta para A fazer.");
    expect(describeTaskMove("a_fazer", "a_fazer")).toBe("Ordem atualizada.");
  });

  it("vazio com filtro", () => {
    expect(describeEmptyFiltered({ mine: true, overdue: true, dueToday: false })).toBe(
      "Nenhuma tarefa sua atrasada.",
    );
    expect(describeEmptyFiltered({ mine: false, overdue: true, dueToday: false })).toBe(
      "Nenhuma tarefa atrasada.",
    );
    expect(describeEmptyFiltered({ mine: false, overdue: false, dueToday: true })).toBe(
      "Nenhuma tarefa vence hoje.",
    );
    expect(describeEmptyFiltered({ mine: true, overdue: false, dueToday: false })).toBe(
      "Nenhuma tarefa sua aberta.",
    );
  });
});

describe("filtros na URL", () => {
  it("lê ?dono=eu, ?atrasadas=1 e ?vencem=hoje e gera os links de volta", () => {
    const f = parseTaskFilters({ dono: "eu", atrasadas: "1", vencem: ["hoje"] });
    expect(f).toEqual({ mine: true, overdue: true, dueToday: true });
    expect(hasTaskFilters(f)).toBe(true);
    expect(taskFiltersHref(f)).toBe("/app/tarefas?dono=eu&atrasadas=1&vencem=hoje");
    expect(parseTaskFilters({ dono: "outro", atrasadas: "0" })).toEqual({
      mine: false,
      overdue: false,
      dueToday: false,
    });
    expect(hasTaskFilters(parseTaskFilters({}))).toBe(false);
    expect(taskFiltersHref({})).toBe("/app/tarefas");
    expect(taskFiltersHref({ overdue: true })).toBe("/app/tarefas?atrasadas=1");
  });
});

describe("taskLinkOf", () => {
  const base = {
    leadId: null,
    orgId: null,
    projectId: null,
    contributionId: null,
    leadName: null,
    orgName: null,
    projectName: null,
    contributionLabel: null,
  };
  it("um link por tipo de vínculo; nulo na solta", () => {
    expect(taskLinkOf(base)).toBeNull();
    expect(taskLinkOf({ ...base, leadId: "l1", leadName: "Ana" })).toEqual({
      href: "/app/leads/l1",
      label: "Ana",
    });
    expect(taskLinkOf({ ...base, orgId: "o1", orgName: "ACME" })).toEqual({
      href: "/app/organizacoes/o1",
      label: "ACME",
    });
    expect(taskLinkOf({ ...base, projectId: "p1", projectName: "Festival" })).toEqual({
      href: "/app/projetos/p1",
      label: "Festival",
    });
    expect(
      taskLinkOf({ ...base, contributionId: "c1", contributionLabel: "R$ 10.000,00 em Festival" }),
    ).toEqual({ href: "/app/aportes/c1", label: "R$ 10.000,00 em Festival" });
  });
});
