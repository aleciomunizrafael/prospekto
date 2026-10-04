import { describe, expect, it } from "vitest";
import { LEAD_SEGMENTS } from "./enums";
import {
  ALL_STAGES,
  INITIAL_STAGES,
  PIPELINES,
  STAGES,
  STAGE_SLA,
  TERMINAL_STAGES,
  isStageOf,
  pipelineForSegment,
  allowedStageMoves,
  requirementsForMove,
  stageIndex,
  stageMoveKind,
} from "./pipelines";

describe("pipelines", () => {
  it("todo segmento mapeia para um pipeline existente", () => {
    for (const s of LEAD_SEGMENTS) expect(PIPELINES).toContain(pipelineForSegment(s));
    expect(pipelineForSegment("PJ")).toBe("patrocinadores");
    expect(pipelineForSegment("PF")).toBe("patrocinadores");
    expect(pipelineForSegment("PROP")).toBe("projetos");
  });

  it("estágios seguem a ordem de personas-e-funis.md, seção 8", () => {
    expect(STAGES.patrocinadores).toEqual([
      "novo",
      "qualificado",
      "diagnostico",
      "proposta",
      "termo",
      "aporte",
      "recibo",
      "renovacao",
      "perdido",
    ]);
    expect(STAGES.projetos[0]).toBe("prospeccao");
    expect(STAGES.projetos.at(-1)).toBe("arquivado");
    expect(STAGES.alunos[0]).toBe("lista_espera");
  });

  it("terminais e iniciais pertencem ao próprio pipeline", () => {
    for (const p of PIPELINES) {
      expect(isStageOf(p, TERMINAL_STAGES[p])).toBe(true);
      expect(isStageOf(p, INITIAL_STAGES[p])).toBe(true);
      expect(stageIndex(p, INITIAL_STAGES[p])).toBe(0);
      expect(stageIndex(p, TERMINAL_STAGES[p])).toBe(STAGES[p].length - 1);
    }
  });

  it("rejeita par (pipeline, estágio) inválido", () => {
    expect(isStageOf("contadores", "aporte")).toBe(false);
    expect(isStageOf("patrocinadores", "aporte")).toBe(true);
    expect(ALL_STAGES).toContain("lista_espera");
  });

  it("todo estágio tem SLA declarado", () => {
    for (const p of PIPELINES) {
      for (const s of STAGES[p]) expect(STAGE_SLA[p]).toHaveProperty(s);
    }
    expect(STAGE_SLA.patrocinadores.proposta).toMatchObject({ businessDays: 5, novDec: 2 });
  });

  it("requisitos de movimento combinam saída do atual e entrada do destino", () => {
    const fields = requirementsForMove("patrocinadores", "novo", "perdido").flatMap(
      (r) => r.fields,
    );
    expect(fields).toEqual(
      expect.arrayContaining(["owner_user_id", "next_action_at", "lost_reason"]),
    );

    const termoToAporte = requirementsForMove("patrocinadores", "termo", "aporte").flatMap(
      (r) => r.fields,
    );
    expect(termoToAporte).toContain("contribution.term_signed_at");
    expect(termoToAporte).not.toContain("lost_reason");

    const projetos = requirementsForMove("projetos", "inscrito", "autorizado").flatMap(
      (r) => r.fields,
    );
    expect(projetos).toContain("project.process_number");
    expect(
      requirementsForMove("alunos", "lista_espera", "pesquisado").flatMap((r) => r.fields),
    ).toContain("owner_user_id");
  });

  it("regras de saída não valem ao marcar perdido nem ao voltar um estágio", () => {
    const fields = (from: string, to: string) =>
      requirementsForMove("patrocinadores", from, to).flatMap((r) => r.fields);
    expect(fields("aporte", "perdido")).toEqual(["lost_reason"]);
    expect(fields("termo", "perdido")).toEqual(["lost_reason"]);
    expect(fields("aporte", "termo")).not.toContain("contribution.deposited_at");
    expect(fields("aporte", "recibo")).toContain("contribution.deposited_at");
    // Retorno do playbook continua exigindo a nova proposta.
    expect(fields("renovacao", "proposta")).toContain("contribution.new_proposal");
    // R-3 vale mesmo ao perder a partir do inicial.
    expect(fields("novo", "perdido")).toContain("owner_user_id");
  });

  it("allowedStageMoves lista próximo, retorno, voltar, perdido e reativar; sem saltos", () => {
    expect(allowedStageMoves("patrocinadores", "novo")).toEqual([
      { stage: "qualificado", kind: "next" },
      { stage: "perdido", kind: "lost" },
    ]);
    expect(allowedStageMoves("patrocinadores", "renovacao")).toEqual([
      { stage: "proposta", kind: "return" },
      { stage: "recibo", kind: "back" },
      { stage: "perdido", kind: "lost" },
    ]);
    expect(allowedStageMoves("patrocinadores", "perdido")).toEqual([
      { stage: "novo", kind: "reactivate" },
    ]);
    expect(stageMoveKind("patrocinadores", "novo", "aporte")).toBeNull();
    expect(stageMoveKind("contadores", "inativo", "ativo")).toBe("return");
    expect(stageMoveKind("projetos", "captando", "arquivado")).toBe("lost");
  });
});
