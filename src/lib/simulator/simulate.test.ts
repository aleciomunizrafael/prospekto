// Casos de docs/site/simulador-spec.md, seção 9. Nesta etapa só os de esquema (T-SCH-*);
// os de cálculo (T-PJ-*, T-PF-*, T-LIC-*, T-FMT-*) entram com simulate.ts na tarefa do simulador.
import { describe, expect, it } from "vitest";
import {
  SIMULATOR_MECHANISMS,
  licRsAnnualLimit,
  loadParams,
  params,
  paramsAgeInDays,
} from "./params";

describe("parametros-simulador.json (simulador-spec.md, 9.8)", () => {
  it("T-SCH-01: cesta cultural PJ é 4% e inclui os mecanismos culturais", () => {
    const cesta = params.regras_gerais.grupos_de_limite_compartilhado.cesta_cultural_pj;
    expect(cesta.limite_percentual).toBe(4);
    expect(cesta.membros).toEqual(
      expect.arrayContaining([
        "rouanet_art18",
        "rouanet_art26_patrocinio",
        "rouanet_art26_doacao",
        "audiovisual_art1",
        "audiovisual_art1A",
      ]),
    );
  });

  it("T-SCH-02: cesta PF é 6% e 7% com esporte", () => {
    expect(params.pf.limite_percentual_cesta).toBe(6);
    expect(params.pf.limite_percentual_cesta_com_esporte).toBe(7);
  });

  it("T-SCH-03: fator da LC 224 entre 0 e 1 e não se aplica a PF", () => {
    const lc = params.regras_gerais.lc_224_2025;
    expect(lc.fator_pj).toBeGreaterThan(0);
    expect(lc.fator_pj).toBeLessThanOrEqual(1);
    expect(lc.aplica_a_pf).toBe(false);
  });

  it("T-SCH-04: todo mecanismo usado pelo simulador tem fonte e status", () => {
    for (const key of SIMULATOR_MECHANISMS) {
      const m = params.mecanismos[key];
      expect(m.fonte, key).toBeTruthy();
      expect(["verificado", "verificar"], key).toContain(m.status);
    }
  });

  it("T-SCH-05: atualizado_em é uma data válida; aviso (não falha) se tiver mais de 180 dias", () => {
    expect(Number.isNaN(Date.parse(params.atualizado_em))).toBe(false);
    const age = paramsAgeInDays();
    expect(age).toBeGreaterThanOrEqual(0);
    if (age > 180) {
      console.warn(`[T-SCH-05] parametros-simulador.json tem ${age} dias; revisar as fontes.`);
    }
  });

  it("T-SCH-06: faixas da LIC-RS são contínuas (tolerância de R$ 0,01)", () => {
    const bands = params.mecanismos.lic_rs.limite_por_faixa_icms_ano_anterior;
    for (let i = 0; i < bands.length - 1; i += 1) {
      const end = bands[i].ate!;
      const atEnd = (end * bands[i].percentual) / 100 + bands[i].acrescimo;
      const next = bands[i + 1];
      const atNextStart = ((next.de ?? end) * next.percentual) / 100 + next.acrescimo;
      expect(Math.abs(atEnd - atNextStart)).toBeLessThanOrEqual(0.01);
    }
    expect(bands.at(-1)!.ate).toBeNull();
    for (const ex of params.exemplos.lic_rs) {
      expect(licRsAnnualLimit(ex.icms_proprio_ano_anterior)).toBe(ex.limite_anual_compensacao);
    }
  });

  it("T-SCH-07: contrato de chaves (schema Zod rejeita caminho ausente ou com tipo errado)", () => {
    expect(() => loadParams()).not.toThrow();
    const broken = structuredClone(params) as Record<string, unknown>;
    (broken.regras_gerais as Record<string, unknown>).lc_224_2025 = { fator_pj: "0.9" };
    expect(() => loadParams(broken)).toThrow();
    const missing = structuredClone(params) as Record<string, unknown>;
    delete (missing.pf as Record<string, unknown>).limite_percentual_cesta;
    expect(() => loadParams(missing)).toThrow();
    expect(params.captacao.rouanet.remuneracao_captacao_percentual_max).toBe(10);
  });

  it.todo(
    "T-SCH-08: enum lic_rs_segment do formulário igual às chaves de repasse_adicional_fac_percentual",
  );
  it.todo(
    "T-PJ-01 a T-PJ-25, T-PF-01 a T-PF-11, T-LIC-01 a T-LIC-09, T-FMT-01 a T-FMT-06: cálculo (tarefa do simulador)",
  );
});
