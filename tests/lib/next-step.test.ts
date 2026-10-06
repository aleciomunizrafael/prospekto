// As cinco regras de nextStepForLead, um caso de projeto e um de aporte (crm-design-system.md,
// seção 5.2, decisão D2). "Agora" é terça-feira, 6 de outubro de 2026, 13:00 em São Paulo.
import { describe, expect, it } from "vitest";
import {
  nextStepFor,
  nextStepForContribution,
  nextStepForLead,
  nextStepForProject,
  type NextStepLead,
} from "@/lib/crm/next-step";
import { stageMovePlans } from "@/lib/crm/stage-moves";

const now = new Date("2026-10-06T13:00:00-03:00");

// formatBRL usa espaço inseparável depois de "R$".
const brl = (s: string) => s.replace(/R\$ /g, "R$\u00a0");

function lead(over: Partial<NextStepLead> = {}): NextStepLead {
  return {
    segment: "PJ",
    pipeline: "patrocinadores",
    stage: "qualificado",
    stageEnteredAt: new Date("2026-10-01T10:00:00-03:00"),
    nextActionAt: null,
    lastContactAt: new Date("2026-10-01T10:00:00-03:00"),
    ownerUserId: "user_1",
    attributes: {},
    orgCnpj: null,
    ...over,
  };
}

const plansFor = (l: NextStepLead) => stageMovePlans("patrocinadores", l.stage, now);

describe("nextStepForLead", () => {
  it("1. tarefa aberta vencida vem antes de tudo", () => {
    const l = lead({ nextActionAt: new Date("2026-10-03T10:00:00-03:00") });
    const step = nextStepForLead(
      l,
      [
        {
          id: "t2",
          subject: "Ligar de novo",
          dueAt: new Date("2026-10-05T09:00:00-03:00"),
          doneAt: null,
        },
        {
          id: "t1",
          subject: "Reenviar material da LIC-RS",
          dueAt: new Date("2026-10-03T09:00:00-03:00"),
          doneAt: null,
        },
        {
          id: "t0",
          subject: "Já feita",
          dueAt: new Date("2026-09-01T09:00:00-03:00"),
          doneAt: new Date(),
        },
      ],
      plansFor(l),
      now,
    );
    expect(step).toMatchObject({
      kind: "complete_task",
      title: "Concluir: Reenviar material da LIC-RS",
      reason: "Atrasada há 3 dias",
      tone: "danger",
      taskId: "t1",
    });
  });

  it("2. próxima ação vencida pede o registro do contato", () => {
    const l = lead({ nextActionAt: new Date("2026-10-02T07:00:00-03:00") });
    const step = nextStepForLead(l, [], plansFor(l), now);
    expect(step).toMatchObject({
      kind: "register_contact",
      title: "Fazer a próxima ação",
      reason: "Atrasada há 4 dias (sex., 2 de out.)",
      tone: "danger",
      href: "#registrar",
    });
  });

  it("3. estágio inicial sem contato: primeiro contato com a frase do SLA", () => {
    const l = lead({
      stage: "novo",
      stageEnteredAt: new Date("2026-09-30T10:00:00-03:00"),
      lastContactAt: null,
      ownerUserId: null,
    });
    const step = nextStepForLead(l, [], plansFor(l), now);
    expect(step).toMatchObject({
      kind: "first_contact",
      title: "Fazer o primeiro contato",
      reason: "Sem contato há 6 dias (prazo: 1 dia útil)",
      tone: "danger",
      href: "#registrar",
    });
  });

  it("4. próximo estágio com o checklist das exigências", () => {
    const l = lead({ stage: "diagnostico", nextActionAt: new Date("2026-10-10T10:00:00-03:00") });
    const step = nextStepForLead(l, [], plansFor(l), now);
    expect(step).toMatchObject({
      kind: "move_stage",
      title: "Próximo estágio: Proposta",
      reason: "SLA de 5 dias úteis",
      tone: "info",
      targetStage: "proposta",
    });
    expect(step.checklist).toEqual([
      { label: "Projeto da proposta de aporte · registre no projeto", done: false },
      { label: "Valor proposto do aporte · registre no projeto", done: false },
    ]);
  });

  it("4b. checklist marca o que o lead já satisfaz (dono, próxima ação, art. 27, CNPJ)", () => {
    const l = lead({
      stage: "proposta",
      nextActionAt: new Date("2026-10-10T10:00:00-03:00"),
      attributes: { vinculo_art27_checado: true },
      orgCnpj: "55667788000186",
    });
    const step = nextStepForLead(l, [], plansFor(l), now);
    expect(step.title).toBe("Próximo estágio: Termo");
    const byLabel = Object.fromEntries((step.checklist ?? []).map((i) => [i.label, i.done]));
    expect(byLabel["CNPJ da empresa patrocinadora (PJ)"]).toBe(true);
    expect(byLabel["Checagem de vínculo com o proponente (art. 27), com data e quem checou"]).toBe(
      true,
    );
    expect(byLabel["Tipo do aporte (patrocínio ou doação) · registre no projeto"]).toBe(false);

    // Sair do estágio inicial exige dono e próxima ação (regra R-3).
    const fresh = lead({ stage: "novo", ownerUserId: null, nextActionAt: null });
    const first = nextStepForLead(fresh, [], plansFor(fresh), now);
    expect(first.kind).toBe("move_stage");
    expect(first.checklist).toEqual([
      { label: "Responsável pelo lead", done: false },
      { label: "Data da próxima ação", done: false },
    ]);
  });

  it("5. lead perdido mostra o motivo e aponta para a reativação", () => {
    const l = lead({ stage: "perdido", lostReason: "sem_resposta", lostReasonDetail: null });
    const step = nextStepForLead(l, [], plansFor(l), now);
    expect(step).toMatchObject({
      kind: "reactivate",
      title: "Lead perdido",
      reason: "Sem resposta",
      tone: "info",
      targetStage: "novo",
    });
    const other = lead({
      stage: "perdido",
      lostReason: "outro",
      lostReasonDetail: "Mudou de cidade",
    });
    expect(nextStepForLead(other, [], plansFor(other), now).reason).toBe("Outro: Mudou de cidade");
  });

  it("último estágio sem próximo: manter o relacionamento", () => {
    const l = lead({ stage: "renovacao" });
    const step = nextStepForLead(l, [], plansFor(l), now);
    expect(step).toMatchObject({ kind: "none", title: "Manter o relacionamento" });
    expect(step.reason).toContain("contato em janeiro");
  });

  it("nunca expõe ids no texto", () => {
    const l = lead({ ownerUserId: "0b9d8f6a-0000-4000-8000-000000000000" });
    const step = nextStepForLead(l, [], plansFor(l), now);
    expect(`${step.title} ${step.reason}`).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);
  });
});

describe("nextStepForProject", () => {
  it("aporte com passo pendente vem antes do alerta e do estágio", () => {
    const step = nextStepForProject(
      { stage: "captando", alerts: ["prazo"], daysRemaining: 70, raisedPercent: 16 },
      [
        { id: "c0", status: "cancelado", leadName: "Fulano", proposedAmount: 10 },
        {
          id: "c1",
          status: "depositado",
          leadName: "Helena Zanotto",
          proposedAmount: 50_000,
          depositedAt: "2026-09-21",
          depositedAmount: 50_000,
        },
      ],
      [{ to: "execucao", kind: "next", missing: [] }],
      now,
    );
    expect(step).toMatchObject({
      kind: "contribution_step",
      title: "Emitir o recibo de Helena Zanotto",
      reason: brl("Depositado em 21/09/2026 (R$ 50.000,00). Depois, registrar a comissão."),
      contributionId: "c1",
      step: "emitir_recibo",
    });
  });

  it("sem aporte pendente, o alerta R-13 pede novos aportes; sem alerta, o próximo estágio", () => {
    const alert = nextStepForProject(
      { stage: "captando", alerts: ["prazo", "captacao"], daysRemaining: 70, raisedPercent: 16 },
      [],
      [{ to: "execucao", kind: "next", missing: [] }],
      now,
    );
    expect(alert).toMatchObject({
      kind: "new_contribution",
      title: "Prazo em 70 dias com 16 % captado",
      tone: "warning",
    });

    const move = nextStepForProject(
      { stage: "elaboracao", alerts: [], daysRemaining: null, raisedPercent: null },
      [],
      [
        { to: "inscrito", kind: "next", missing: ["número do processo"] },
        { to: "avaliacao", kind: "back", missing: [] },
      ],
      now,
    );
    expect(move).toMatchObject({
      kind: "move_project",
      title: "Próximo estágio: Inscrito",
      reason: "SLA de 10 dias úteis",
      targetStage: "inscrito",
      checklist: [{ label: "número do processo", done: false }],
    });
  });
});

describe("nextStepForContribution e nextStepFor", () => {
  it("o passo atual do fluxo com os bloqueios como checklist", () => {
    const step = nextStepForContribution(
      {
        id: "c1",
        status: "termo_assinado",
        leadName: "Cláudio Bertolini",
        proposedAmount: 200_000,
        termSignedAt: "2026-10-06",
        expectedCloseAt: "2026-10-12",
      },
      { confirmar_deposito: [] },
      now,
    );
    expect(step).toMatchObject({
      kind: "contribution_step",
      title: "Confirmar o depósito previsto para 12/10/2026 (em 6 dias)",
      reason: "Termo assinado em 06/10/2026, depósito previsto para 12/10/2026 (em 6 dias).",
      tone: "info",
      contributionId: "c1",
      step: "confirmar_deposito",
    });
    expect(step.checklist).toBeUndefined();

    const blocked = nextStepForContribution(
      { id: "c2", status: "proposta", leadName: "Rodrigo", proposedAmount: 30_000 },
      { assinar_termo: ["CNPJ da empresa patrocinadora"] },
      now,
    );
    expect(blocked).toMatchObject({
      title: "Assinar o termo",
      tone: "warning",
      step: "assinar_termo",
      checklist: [{ label: "CNPJ da empresa patrocinadora", done: false }],
    });

    expect(
      nextStepForContribution(
        {
          id: "c3",
          status: "cancelado",
          leadName: "X",
          proposedAmount: 1,
          lostReason: "sem_interesse",
        },
        {},
        now,
      ),
    ).toMatchObject({ kind: "none", title: "Aporte cancelado", reason: "Motivo: Sem interesse" });
  });

  it("nextStepFor segue a ordem proposta → termo → depósito → recibo → contador → comissão", () => {
    expect(nextStepFor("proposta", null)).toBe("assinar_termo");
    expect(nextStepFor("termo_assinado", null)).toBe("confirmar_deposito");
    expect(nextStepFor("depositado", null)).toBe("emitir_recibo");
    expect(nextStepFor("recibo_emitido", null)).toBe("enviar_contador");
    expect(nextStepFor("recibo_emitido", "2026-10-01")).toBe("registrar_comissao");
    expect(nextStepFor("recibo_emitido", "2026-10-01", 5_000)).toBeNull();
    expect(nextStepFor("cancelado", null)).toBeNull();
  });
});
