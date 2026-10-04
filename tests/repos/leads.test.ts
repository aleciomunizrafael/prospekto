import { beforeAll, describe, expect, it } from "vitest";
import { MissingFieldsError, ValidationError } from "@/lib/errors";
import type { Ctx } from "@/lib/repos/ctx";
import { listActivities } from "@/lib/repos/activities";
import { getCurrentConsent, listConsents, revokeConsent } from "@/lib/repos/consents";
import {
  createLead,
  getLeadByEmail,
  listLeads,
  moveLeadStage,
  updateLead,
} from "@/lib/repos/leads";
import { createOrganization } from "@/lib/repos/organizations";
import { createProject, updateProject } from "@/lib/repos/projects";
import { consentContato, makeTenant, makeUser, uniqueEmail } from "../helpers";

let ctx: Ctx;

beforeAll(async () => {
  ctx = await makeTenant();
});

describe("createLead (R-1, R-2)", () => {
  it("cria lead no pipeline do segmento com consentimento e atividade formulario", async () => {
    const email = uniqueEmail();
    const { lead, created } = await createLead(ctx, {
      segment: "CONT",
      interest: "rouanet",
      name: "Escritório Teste",
      email: email.toUpperCase(),
      source: "site",
      consents: [
        consentContato,
        { ...consentContato, purpose: "marketing", channels: ["email", "whatsapp"] },
      ],
      attributes: {
        escritorio: "Escritório Teste",
        cargo: "socio",
        clientes_lucro_real_faixa: "5_19",
      },
      formData: { escritorio: "Escritório Teste" },
    });
    expect(created).toBe(true);
    expect(lead.pipeline).toBe("contadores");
    expect(lead.stage).toBe("novo");
    expect(lead.email).toBe(email); // minúsculas
    expect(lead.score).toBe(20 + 20 + 4);
    expect(lead.temperature).toBe("morno");
    expect(await listConsents(ctx, lead.id)).toHaveLength(2);
    expect((await getCurrentConsent(ctx, lead.id, "marketing"))?.granted).toBe(true);
    const activities = await listActivities(ctx, { leadId: lead.id, type: "formulario" });
    expect(activities).toHaveLength(1);
    expect(activities[0].data).toEqual({ escritorio: "Escritório Teste" });
  });

  it("R-1: formulário do site sem consentimento contato_comercial é rejeitado", async () => {
    for (const source of ["site", "guia", "simulador", "diagnostico"] as const) {
      await expect(
        createLead(ctx, {
          segment: "PJ",
          interest: "rouanet",
          name: "Sem consentimento",
          email: uniqueEmail("semconsent"),
          source,
          consents: [],
        }),
      ).rejects.toThrow(/contato comercial/);
    }
    // Consentimento de outra finalidade, ou revogado, não basta.
    await expect(
      createLead(ctx, {
        segment: "PJ",
        interest: "rouanet",
        name: "Só marketing",
        email: uniqueEmail("somkt"),
        source: "site",
        consents: [{ ...consentContato, purpose: "marketing" }],
      }),
    ).rejects.toThrow(/contato comercial/);
    await expect(
      createLead(ctx, {
        segment: "PJ",
        interest: "rouanet",
        name: "Revogado",
        email: uniqueEmail("revog"),
        source: "site",
        consents: [{ ...consentContato, granted: false }],
      }),
    ).rejects.toThrow(/contato comercial/);
    // Origem fora do site (CRM, importação, indicação) pode registrar o consentimento depois.
    const { lead } = await createLead(ctx, {
      segment: "PJ",
      interest: "rouanet",
      name: "Importado",
      email: uniqueEmail("import"),
      source: "linkedin",
      sourceDetail: "importacao:lista.csv",
    });
    expect(await listConsents(ctx, lead.id)).toHaveLength(0);
  });

  it("deduplica por e-mail e segmento: reenvio em 10 minutos não grava", async () => {
    const email = uniqueEmail();
    const base = {
      segment: "PJ" as const,
      interest: "rouanet" as const,
      name: "Ana",
      email,
      source: "guia" as const,
      consents: [consentContato],
    };
    const first = await createLead(ctx, base);
    const again = await createLead(ctx, { ...base, name: "Ana Maria" });
    expect(again.created).toBe(false);
    expect(again.deduplicated).toBe(true);
    expect(again.lead.id).toBe(first.lead.id);
    expect(again.lead.name).toBe("Ana");
    expect((await listLeads(ctx, { segment: "PJ" })).filter((l) => l.email === email)).toHaveLength(
      1,
    );
    expect((await listActivities(ctx, { leadId: first.lead.id, type: "formulario" })).length).toBe(
      1,
    );
  });

  it("depois de 10 minutos atualiza o lead sem rebaixar o estágio e registra novo formulário", async () => {
    const email = uniqueEmail();
    const t0 = new Date("2026-10-04T10:00:00Z");
    const base = {
      segment: "PJ" as const,
      interest: "rouanet" as const,
      name: "Bruno",
      email,
      source: "guia" as const,
      consents: [consentContato],
    };
    const first = await createLead(ctx, base, t0);
    const owner = await makeUser(ctx);
    await moveLeadStage(ctx, {
      leadId: first.lead.id,
      to: "qualificado",
      ownerUserId: owner,
      nextActionAt: new Date(),
    });
    const later = await createLead(
      ctx,
      {
        ...base,
        name: "Bruno Silva",
        attributes: { regime_tributario: "simples", irpj_faixa: "ate_100k" },
      },
      new Date(t0.getTime() + 11 * 60 * 1000),
    );
    expect(later.created).toBe(false);
    expect(later.deduplicated).toBe(false);
    expect(later.lead.name).toBe("Bruno Silva");
    expect(later.lead.stage).toBe("qualificado");
    expect(later.lead.attributes.regime_tributario).toBe("simples_nacional");
    expect((await listActivities(ctx, { leadId: first.lead.id, type: "formulario" })).length).toBe(
      2,
    );
  });

  it("R-2: a janela de 10 minutos conta do último formulário, não de edições no CRM", async () => {
    const t0 = new Date("2026-10-04T12:00:00Z");
    const base = {
      segment: "PF" as const,
      interest: "rouanet" as const,
      name: "Clara",
      email: uniqueEmail("dedup"),
      source: "simulador" as const,
      consents: [consentContato],
    };
    const first = await createLead(ctx, base, t0);
    // Edição no CRM 20 minutos depois do formulário avança updated_at...
    await updateLead(ctx, { leadId: first.lead.id, tags: ["triagem"] });
    // ...mas o reenvio 30 minutos depois do primeiro formulário é um reenvio real: grava.
    const again = await createLead(ctx, base, new Date(t0.getTime() + 30 * 60 * 1000));
    expect(again.deduplicated).toBe(false);
    expect((await listActivities(ctx, { leadId: first.lead.id, type: "formulario" })).length).toBe(
      2,
    );
    // Reenvio 5 minutos depois do segundo formulário é descartado.
    const third = await createLead(ctx, base, new Date(t0.getTime() + 35 * 60 * 1000));
    expect(third.deduplicated).toBe(true);
  });

  it("mesmo e-mail em outro segmento é outro lead", async () => {
    const email = uniqueEmail();
    const pj = await createLead(ctx, {
      segment: "PJ",
      interest: "rouanet",
      name: "Carla",
      email,
      source: "site",
      consents: [consentContato],
    });
    const pf = await createLead(ctx, {
      segment: "PF",
      interest: "rouanet",
      name: "Carla",
      email,
      source: "site",
      consents: [consentContato],
    });
    expect(pj.lead.id).not.toBe(pf.lead.id);
    expect((await getLeadByEmail(ctx, email, "PF"))?.id).toBe(pf.lead.id);
  });

  it("rejeita entrada inválida", async () => {
    await expect(
      createLead(ctx, {
        segment: "PJ",
        interest: "rouanet",
        name: "X",
        email: "nao-e-email",
        source: "site",
        consents: [consentContato],
      }),
    ).rejects.toThrow();
  });
});

describe("moveLeadStage (R-3, R-4)", () => {
  it("sair de novo exige responsável e próxima ação e grava activities.sistema", async () => {
    const { lead } = await createLead(ctx, {
      segment: "MUN",
      interest: "pnab_editais",
      name: "Prefeitura",
      email: uniqueEmail("mun"),
      source: "site",
      consents: [consentContato],
    });
    await expect(moveLeadStage(ctx, { leadId: lead.id, to: "contato" })).rejects.toThrow(
      MissingFieldsError,
    );
    const owner = await makeUser(ctx);
    await expect(
      moveLeadStage(ctx, { leadId: lead.id, to: "contato", ownerUserId: owner }),
    ).rejects.toThrow(/próxima ação/);
    const next = new Date("2026-10-10T12:00:00Z");
    const moved = await moveLeadStage(ctx, {
      leadId: lead.id,
      to: "contato",
      ownerUserId: owner,
      nextActionAt: next,
    });
    expect(moved.stage).toBe("contato");
    expect(moved.ownerUserId).toBe(owner);
    expect(moved.nextActionAt).toEqual(next);
    expect(moved.stageEnteredAt.getTime()).toBeGreaterThan(lead.stageEnteredAt.getTime() - 1);
    const sys = await listActivities(ctx, { leadId: lead.id, type: "sistema" });
    expect(sys.map((a) => a.data)).toEqual(
      expect.arrayContaining([expect.objectContaining({ from: "novo", to: "contato" })]),
    );
  });

  it("perdido exige lost_reason; outro exige detalhe", async () => {
    const owner = await makeUser(ctx);
    const { lead } = await createLead(ctx, {
      segment: "ALUNO",
      interest: "mentoria",
      name: "Aluno",
      email: uniqueEmail("aluno"),
      source: "linkedin",
    });
    await expect(
      moveLeadStage(ctx, {
        leadId: lead.id,
        to: "perdido",
        ownerUserId: owner,
        nextActionAt: new Date(),
      }),
    ).rejects.toThrow(/motivo de perda/);
    await expect(
      moveLeadStage(ctx, {
        leadId: lead.id,
        to: "perdido",
        ownerUserId: owner,
        nextActionAt: new Date(),
        lostReason: "outro",
      }),
    ).rejects.toThrow(/detalhe/);
    const lost = await moveLeadStage(ctx, {
      leadId: lead.id,
      to: "perdido",
      ownerUserId: owner,
      nextActionAt: new Date(),
      lostReason: "sem_resposta",
    });
    expect(lost.stage).toBe("perdido");
    expect(lost.lostReason).toBe("sem_resposta");
    expect(lost.nextActionAt).toBeNull();
  });

  it("rejeita estágio de outro pipeline e estágio igual ao atual", async () => {
    const { lead } = await createLead(ctx, {
      segment: "CONT",
      interest: "rouanet",
      name: "Esc",
      email: uniqueEmail("cont"),
      source: "site",
      consents: [consentContato],
    });
    await expect(moveLeadStage(ctx, { leadId: lead.id, to: "aporte" })).rejects.toThrow(
      ValidationError,
    );
    await expect(moveLeadStage(ctx, { leadId: lead.id, to: "novo" })).rejects.toThrow(/já está/);
  });

  it("não move lead de outro tenant", async () => {
    const other = await makeTenant();
    const { lead } = await createLead(other, {
      segment: "PJ",
      interest: "rouanet",
      name: "Outro",
      email: uniqueEmail("outro"),
      source: "site",
      consents: [consentContato],
    });
    await expect(moveLeadStage(ctx, { leadId: lead.id, to: "qualificado" })).rejects.toThrow(
      /não encontrado/,
    );
    await expect(updateLead(ctx, { leadId: lead.id, name: "Invasor" })).rejects.toThrow(
      /não encontrado/,
    );
  });

  it("lead PROP no pipeline projetos: autorizado, captando e prestacao_contas leem o projeto", async () => {
    const owner = await makeUser(ctx);
    const { lead } = await createLead(ctx, {
      segment: "PROP",
      interest: "rouanet",
      name: "Proponente",
      email: uniqueEmail("prop"),
      source: "site",
      consents: [consentContato],
      attributes: { proponente: "Cia de Teatro", tipo_proponente: "pj" },
    });
    const base = { leadId: lead.id, ownerUserId: owner, nextActionAt: new Date() };
    await moveLeadStage(ctx, { ...base, to: "avaliacao" });
    await moveLeadStage(ctx, { ...base, to: "elaboracao" });
    await moveLeadStage(ctx, { ...base, to: "inscrito" });
    // Sem projeto cadastrado: não entra em autorizado.
    await expect(moveLeadStage(ctx, { ...base, to: "autorizado" })).rejects.toThrow(
      /crie o projeto/,
    );
    const proponent = await createOrganization(ctx, { type: "proponente", name: "Cia de Teatro" });
    const project = await createProject(ctx, {
      proponentOrgId: proponent.id,
      leadId: lead.id,
      name: "Espetáculo",
      slug: "espetaculo",
      mechanism: "rouanet_art18",
      stage: "inscrito",
    });
    // Projeto sem número de processo, valor, prazo e rubrica: ainda não entra.
    await expect(moveLeadStage(ctx, { ...base, to: "autorizado" })).rejects.toThrow(
      /número do processo/,
    );
    await updateProject(ctx, {
      projectId: project.id,
      processNumber: "PRONAC 26-0001",
      approvedAmount: 200_000,
      fundraisingDeadline: "2027-12-31",
      fundraisingFeeAmount: 20_000,
    });
    expect((await moveLeadStage(ctx, { ...base, to: "autorizado" })).stage).toBe("autorizado");
    expect((await moveLeadStage(ctx, { ...base, to: "captando" })).stage).toBe("captando");
    await moveLeadStage(ctx, { ...base, to: "execucao" });
    await expect(moveLeadStage(ctx, { ...base, to: "prestacao_contas" })).rejects.toThrow(
      /relatório/,
    );
    await updateProject(ctx, { projectId: project.id, reportDueAt: "2028-03-01" });
    expect((await moveLeadStage(ctx, { ...base, to: "prestacao_contas" })).stage).toBe(
      "prestacao_contas",
    );
  });
});

describe("updateLead e consentimentos", () => {
  it("recalcula score e registra activities.sistema de score e dono (R-12)", async () => {
    const { lead } = await createLead(ctx, {
      segment: "PJ",
      interest: "rouanet",
      name: "Dora",
      email: uniqueEmail("pj"),
      source: "indicacao_contador",
    });
    expect(lead.score).toBe(10);
    const owner = await makeUser(ctx);
    const updated = await updateLead(ctx, {
      leadId: lead.id,
      ownerUserId: owner,
      attributes: {
        regime_tributario: "lucro_real",
        regime_confirmado_por: "ecf",
        irpj_faixa: "acima_2500k",
      },
    });
    expect(updated.score).toBe(30 + 25 + 10);
    expect(updated.temperature).toBe("morno");
    const sys = await listActivities(ctx, { leadId: lead.id, type: "sistema" });
    expect(sys.map((a) => (a.data as { reason?: string }).reason).sort()).toEqual([
      "owner",
      "score",
    ]);
  });

  it("R-10: vinculo_art27_checado = true exige data e quem checou", async () => {
    const { lead } = await createLead(ctx, {
      segment: "PJ",
      interest: "rouanet",
      name: "Art 27",
      email: uniqueEmail("art27"),
      source: "indicacao_cliente",
    });
    await expect(
      updateLead(ctx, { leadId: lead.id, attributes: { vinculo_art27_checado: true } }),
    ).rejects.toThrow(/art\. 27/);
    await expect(
      updateLead(ctx, {
        leadId: lead.id,
        attributes: {
          vinculo_art27_checado: true,
          vinculo_art27_checado_em: "ontem",
          vinculo_art27_checado_por: "Daniela",
        },
      }),
    ).rejects.toThrow(/data/);
    const ok = await updateLead(ctx, {
      leadId: lead.id,
      attributes: {
        vinculo_art27_checado: true,
        vinculo_art27_checado_em: "2026-10-04",
        vinculo_art27_checado_por: "Daniela",
      },
    });
    expect(ok.attributes.vinculo_art27_checado).toBe(true);
  });

  it("consentimento é append-only: revogar insere granted=false e vira o estado vigente (R-14)", async () => {
    const { lead } = await createLead(ctx, {
      segment: "PF",
      interest: "rouanet",
      name: "Eva",
      email: uniqueEmail("pf"),
      source: "simulador",
      consents: [consentContato, { ...consentContato, purpose: "marketing" }],
    });
    expect((await getCurrentConsent(ctx, lead.id, "marketing"))?.granted).toBe(true);
    await revokeConsent(ctx, {
      leadId: lead.id,
      purpose: "marketing",
      policyVersion: "2026-10-03",
      sourcePage: "webhook:resend",
    });
    expect((await getCurrentConsent(ctx, lead.id, "marketing"))?.granted).toBe(false);
    expect(await listConsents(ctx, lead.id)).toHaveLength(3);
    expect((await getCurrentConsent(ctx, lead.id, "contato_comercial"))?.granted).toBe(true);
  });
});
