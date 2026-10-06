import { describe, expect, it } from "vitest";
import { CONTRIBUTION_STATUSES, LEAD_TEMPERATURES, ORGANIZATION_TYPES } from "@/lib/domain/enums";
import { PIPELINES, STAGES } from "@/lib/domain/pipelines";
import {
  contributionTone,
  orgTypeTone,
  stageTone,
  temperatureTone,
  type StatusTone,
} from "@/lib/crm/status-tones";

const TONES: StatusTone[] = ["neutral", "info", "brand", "success", "warning", "danger", "outline"];

describe("famílias semânticas dos badges (crm-design-system.md, seção 6)", () => {
  it("todo par (pipeline, estágio) de STAGES tem tom e ícone", () => {
    for (const pipeline of PIPELINES) {
      for (const stage of STAGES[pipeline]) {
        const { tone, icon } = stageTone(pipeline, stage);
        expect(TONES, `${pipeline}/${stage}`).toContain(tone);
        expect(icon, `${pipeline}/${stage} sem ícone`).toBeTruthy();
      }
    }
  });

  it("o mesmo nome de estágio muda de tom por pipeline", () => {
    expect(stageTone("projetos", "inscrito").tone).toBe("info");
    expect(stageTone("alunos", "inscrito").tone).toBe("brand");
    expect(stageTone("municipios", "execucao").tone).toBe("success");
    expect(stageTone("projetos", "execucao").tone).toBe("success");
  });

  it("estágio inicial é neutro e terminal é outline em todos os pipelines", () => {
    expect(stageTone("patrocinadores", "novo").tone).toBe("neutral");
    expect(stageTone("alunos", "lista_espera").tone).toBe("neutral");
    expect(stageTone("patrocinadores", "perdido").tone).toBe("outline");
    expect(stageTone("projetos", "arquivado").tone).toBe("outline");
  });

  it("estágio desconhecido cai em neutro sem quebrar", () => {
    expect(stageTone("patrocinadores", "inexistente").tone).toBe("neutral");
    expect(stageTone("outro_pipeline", "novo").tone).toBe("neutral");
  });

  it("todo CONTRIBUTION_STATUSES tem tom e ícone", () => {
    for (const status of CONTRIBUTION_STATUSES) {
      const { tone, icon } = contributionTone(status);
      expect(TONES, status).toContain(tone);
      expect(icon).toBeTruthy();
    }
    expect(contributionTone("depositado").tone).toBe("success");
    expect(contributionTone("cancelado").tone).toBe("outline");
  });

  it("temperatura e tipo de organização cobrem os enums", () => {
    for (const t of LEAD_TEMPERATURES) expect(TONES).toContain(temperatureTone(t).tone);
    for (const t of ORGANIZATION_TYPES) expect(TONES).toContain(orgTypeTone(t).tone);
    expect(temperatureTone("quente").tone).toBe("danger");
    expect(temperatureTone("frio").tone).toBe("neutral");
    expect(orgTypeTone("proponente").tone).toBe("brand");
  });
});
