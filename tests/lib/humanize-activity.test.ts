import { describe, expect, it } from "vitest";
import { humanizeSystemActivity } from "@/lib/crm/humanize-activity";

const USER_A = "4z3JXEAcbd6l0ZbgqGyK2RvSCxk1F3Ul"; // 32 caracteres, como o id do better-auth
const USER_B = "9pQ2mLkT8vWxYzA1bC3dE5fG7hJ0kLmN";
const CONTRIBUTION_ID = "68921684-1b2c-4d3e-9f00-112233445566";
const PROJECT_ID = "0b9d8f6a-0000-4000-8000-000000000000";

const users = new Map([
  [USER_A, "Rafael Teste"],
  [USER_B, "Daniela"],
]);
const projects = new Map([[PROJECT_ID, "Cinema na Praça"]]);

// formatBRL usa espaço inseparável depois de "R$".
const brl = (s: string) => s.replace(/R\$ /g, "R$\u00a0");

const ID_RE =
  /[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[A-Za-z0-9]{32}/;

function all(h: ReturnType<typeof humanizeSystemActivity>): string {
  return [h.text ?? "", ...h.details.map((d) => `${d.label}: ${d.value}`)].join(" ");
}

describe("humanizeSystemActivity", () => {
  it("responsável: ids viram nomes; null vira ninguém", () => {
    const h = humanizeSystemActivity(
      { subject: "Responsável definido", data: { from: null, to: USER_A, reason: "owner" } },
      users,
    );
    expect(h.text).toBe("Responsável: ninguém → Rafael Teste");
    expect(h.details).toEqual([]);
    expect(all(h)).not.toMatch(ID_RE);

    const swap = humanizeSystemActivity(
      { subject: "Responsável alterado", data: { from: USER_A, to: USER_B, reason: "owner" } },
      users,
    );
    expect(swap.text).toBe("Responsável: Rafael Teste → Daniela");

    // Usuário fora do mapa: nunca o id.
    const unknown = humanizeSystemActivity(
      {
        subject: "Responsável alterado",
        data: { from: USER_A, to: "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz", reason: "owner" },
      },
      users,
    );
    expect(unknown.text).toBe("Responsável: Rafael Teste → outra pessoa");
    expect(all(unknown)).not.toMatch(ID_RE);
  });

  it("score", () => {
    const h = humanizeSystemActivity(
      { subject: "Score recalculado", data: { from: 2, to: 41, reason: "score" } },
      users,
    );
    expect(h.text).toBe("Score: 2 → 41");
  });

  it("estágio: rótulos em português e motivo de perda", () => {
    const h = humanizeSystemActivity(
      {
        subject: "Estágio alterado de novo para qualificado",
        data: { from: "novo", to: "qualificado", reason: null, direction: "avanco" },
      },
      users,
    );
    expect(h.text).toBe("Novo → Qualificado");
    const lost = humanizeSystemActivity(
      {
        subject: "Estágio alterado de qualificado para perdido",
        data: { from: "qualificado", to: "perdido", reason: "sem_resposta", direction: "retorno" },
      },
      users,
    );
    expect(lost.text).toBe("Qualificado → Perdido · motivo: Sem resposta");
    const project = humanizeSystemActivity(
      {
        subject: "Projeto movido de elaboracao para inscrito",
        data: { from: "elaboracao", to: "inscrito", reason: null, lostReasonDetail: null },
      },
      users,
    );
    expect(project.text).toBe("Elaboração → Inscrito");
  });

  it("status de aporte: rótulos de status, não de estágio, com os complementos", () => {
    const deposit = humanizeSystemActivity(
      {
        subject: "Depósito confirmado",
        data: {
          from: "termo_assinado",
          to: "depositado",
          depositedAmount: 50000,
          depositedAt: "2026-09-21",
        },
        contributionId: CONTRIBUTION_ID,
      },
      users,
    );
    expect(deposit.text).toBe(
      brl("Termo assinado → Depositado · valor depositado R$ 50.000,00 · depositado em 21/09/2026"),
    );
    const cancel = humanizeSystemActivity(
      {
        subject: "Aporte cancelado",
        data: { from: "proposta", to: "cancelado", reason: "sem_interesse" },
        contributionId: CONTRIBUTION_ID,
      },
      users,
    );
    expect(cancel.text).toBe("Proposta → Cancelado · motivo: Sem interesse");
    expect(all(deposit)).not.toMatch(ID_RE);
  });

  it("proposta de aporte: valor, projeto pelo mapa e mecanismo; nunca o id", () => {
    const h = humanizeSystemActivity(
      {
        subject: "Proposta de aporte criada",
        data: {
          contributionId: CONTRIBUTION_ID,
          proposedAmount: 30000,
          mechanism: "audiovisual_art1A",
        },
        contributionId: CONTRIBUTION_ID,
        projectId: PROJECT_ID,
      },
      users,
      projects,
    );
    expect(h.text).toBe(
      brl("Proposta de R$ 30.000,00 em Cinema na Praça (Lei do Audiovisual, art. 1º-A)"),
    );
    expect(h.details).toEqual([]);
    expect(all(h)).not.toMatch(ID_RE);

    const noProject = humanizeSystemActivity(
      {
        subject: "Proposta de aporte criada",
        data: { contributionId: CONTRIBUTION_ID, proposedAmount: 30000, mechanism: "lic_rs" },
      },
      users,
    );
    expect(noProject.text).toBe(brl("Proposta de R$ 30.000,00 (LIC-RS (Pró-Cultura RS))"));
    expect(all(noProject)).not.toMatch(ID_RE);
  });

  it("chaves desconhecidas vão para os detalhes, sem ids e sem objetos", () => {
    const h = humanizeSystemActivity(
      {
        subject: "Algo novo",
        data: {
          chave_nova: "valor",
          outroId: PROJECT_ID,
          ref: CONTRIBUTION_ID,
          lista: [1, 2],
          flag: true,
        },
      },
      users,
    );
    expect(h.text).toBeNull();
    expect(h.details).toEqual([
      { label: "chave_nova", value: "valor" },
      { label: "flag", value: "sim" },
    ]);
    expect(all(h)).not.toMatch(ID_RE);
    expect(humanizeSystemActivity({ subject: "x", data: null }, users)).toEqual({
      text: null,
      details: [],
    });
  });

  it("comissão registrada e projeto criado", () => {
    const commission = humanizeSystemActivity(
      {
        subject: "Comissão registrada",
        data: {
          commissionDue: 5000,
          commissionPaidAt: "2026-10-01",
          projectCommissionTotal: 5000,
          periodCommissionTotal: 5000,
          depositYear: 2026,
          warnings: [],
        },
      },
      users,
    );
    expect(commission.text).toBe(brl("comissão de R$ 5.000,00 · comissão paga em 01/10/2026"));
    const created = humanizeSystemActivity(
      { subject: "Projeto criado", data: { stage: "prospeccao", mechanism: "lic_rs" } },
      users,
    );
    expect(created.text).toBe("Criado em Prospecção (LIC-RS (Pró-Cultura RS))");
  });
});
