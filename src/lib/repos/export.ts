import "server-only";
import { aliasedTable, and, desc, eq, getTableColumns } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activities,
  consents,
  contacts,
  contributions,
  culturalProjects,
  leads,
  organizations,
  simulations,
  users,
} from "@/lib/db/schema";
import { ALL_ATTRIBUTE_KEYS } from "@/lib/crm/attributes";
import type { CsvRow } from "@/lib/csv";
import type { Ctx } from "./ctx";

// Exportação CSV por tabela, só do tenant da sessão (proposta-c-simplicidade.md, seção 9.4).
// Cabeçalhos em português; valores de enum no literal do banco. Datas em ISO e números com
// ponto (src/lib/csv.ts). Consentimentos e simulações têm arquivo próprio nesta onda.
export const EXPORT_TABLES = [
  "leads",
  "organizations",
  "contacts",
  "consents",
  "simulations",
  "cultural_projects",
  "contributions",
  "activities",
] as const;
export type ExportTable = (typeof EXPORT_TABLES)[number];

export function isExportTable(value: string): value is ExportTable {
  return (EXPORT_TABLES as readonly string[]).includes(value);
}

export const EXPORT_TABLE_LABELS: Record<ExportTable, string> = {
  leads: "Leads",
  organizations: "Organizações",
  contacts: "Contatos",
  consents: "Consentimentos",
  simulations: "Simulações",
  cultural_projects: "Projetos",
  contributions: "Aportes",
  activities: "Atividades",
};

export type ExportHeader = { key: string; label: string };
export type ExportResult = { headers: ExportHeader[]; rows: CsvRow[] };

const h = (key: string, label = key): ExportHeader => ({ key, label });

function pick(attributes: Record<string, unknown>): {
  known: Record<string, unknown>;
  extra: Record<string, unknown> | null;
} {
  const known: Record<string, unknown> = {};
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attributes ?? {})) {
    if (ALL_ATTRIBUTE_KEYS.includes(k)) known[k] = v;
    else extra[k] = v;
  }
  return { known, extra: Object.keys(extra).length ? extra : null };
}

async function exportLeads(ctx: Ctx): Promise<ExportResult> {
  const referredBy = aliasedTable(organizations, "referred_by");
  const rows = await db
    .select({
      lead: leads,
      orgName: organizations.name,
      orgCnpj: organizations.cnpj,
      ownerName: users.name,
      referredByName: referredBy.name,
      projectInterestName: culturalProjects.name,
    })
    .from(leads)
    .leftJoin(
      organizations,
      and(eq(organizations.id, leads.orgId), eq(organizations.tenantId, ctx.tenantId)),
    )
    .leftJoin(users, and(eq(users.id, leads.ownerUserId), eq(users.tenantId, ctx.tenantId)))
    .leftJoin(
      referredBy,
      and(eq(referredBy.id, leads.referredByOrgId), eq(referredBy.tenantId, ctx.tenantId)),
    )
    .leftJoin(
      culturalProjects,
      and(
        eq(culturalProjects.id, leads.projectInterestId),
        eq(culturalProjects.tenantId, ctx.tenantId),
      ),
    )
    .where(eq(leads.tenantId, ctx.tenantId))
    .orderBy(desc(leads.createdAt));
  const consentRows = await db
    .select()
    .from(consents)
    .where(eq(consents.tenantId, ctx.tenantId))
    .orderBy(desc(consents.createdAt), desc(consents.id));
  // Estado vigente por (lead, finalidade): a linha mais recente (regra R-14).
  const current = new Map<string, (typeof consentRows)[number]>();
  for (const c of consentRows) {
    const key = `${c.leadId}:${c.purpose}`;
    if (!current.has(key)) current.set(key, c);
  }
  const headers: ExportHeader[] = [
    h("id"),
    h("segmento"),
    h("pipeline"),
    h("estagio"),
    h("estagio_desde"),
    h("interesse"),
    h("nome"),
    h("email"),
    h("telefone"),
    h("cidade"),
    h("uf"),
    h("mensagem"),
    h("organizacao"),
    h("cnpj"),
    h("origem"),
    h("detalhe_origem"),
    h("utm_source"),
    h("utm_medium"),
    h("utm_campaign"),
    h("pagina_entrada"),
    h("score"),
    h("temperatura"),
    h("dono"),
    h("indicado_por"),
    h("projeto_interesse"),
    h("proxima_acao"),
    h("ultimo_contato"),
    h("motivo_perda"),
    h("detalhe_motivo_perda"),
    h("tags"),
    h("status_email"),
    h("versao_guia"),
    h("consentimento_contato_em"),
    h("consentimento_marketing"),
    h("canais_consentidos"),
    h("criado_em"),
    h("atualizado_em"),
    ...ALL_ATTRIBUTE_KEYS.map((k) => h(k)),
    h("atributos_extra"),
  ];
  const out: CsvRow[] = rows.map(({ lead, ...r }) => {
    const contact = current.get(`${lead.id}:contato_comercial`);
    const marketing = current.get(`${lead.id}:marketing`);
    const { known, extra } = pick(lead.attributes);
    const attrs: CsvRow = {};
    for (const k of ALL_ATTRIBUTE_KEYS) {
      const v = known[k];
      attrs[k] = v === undefined ? "" : (v as CsvRow[string]);
    }
    return {
      id: lead.id,
      segmento: lead.segment,
      pipeline: lead.pipeline,
      estagio: lead.stage,
      estagio_desde: lead.stageEnteredAt,
      interesse: lead.interest,
      nome: lead.name,
      email: lead.email,
      telefone: lead.phone,
      cidade: lead.city,
      uf: lead.uf,
      mensagem: lead.message,
      organizacao: r.orgName,
      cnpj: r.orgCnpj,
      origem: lead.source,
      detalhe_origem: lead.sourceDetail,
      utm_source: lead.utmSource,
      utm_medium: lead.utmMedium,
      utm_campaign: lead.utmCampaign,
      pagina_entrada: lead.landingPath,
      score: lead.score,
      temperatura: lead.temperature,
      dono: r.ownerName,
      indicado_por: r.referredByName,
      projeto_interesse: r.projectInterestName,
      proxima_acao: lead.nextActionAt,
      ultimo_contato: lead.lastContactAt,
      motivo_perda: lead.lostReason,
      detalhe_motivo_perda: lead.lostReasonDetail,
      tags: lead.tags,
      status_email: lead.emailStatus,
      versao_guia: lead.guideVersion,
      consentimento_contato_em: contact?.granted ? contact.createdAt : null,
      consentimento_marketing: marketing?.granted === true,
      canais_consentidos: contact?.granted ? contact.channels : [],
      criado_em: lead.createdAt,
      atualizado_em: lead.updatedAt,
      ...attrs,
      atributos_extra: extra,
    };
  });
  return { headers, rows: out };
}

async function exportOrganizations(ctx: Ctx): Promise<ExportResult> {
  // O escritório contábil é outra organização do mesmo tenant: resolvido em memória, sem self-join.
  const rows = await db
    .select({ ...getTableColumns(organizations), ownerName: users.name })
    .from(organizations)
    .leftJoin(users, and(eq(users.id, organizations.ownerUserId), eq(users.tenantId, ctx.tenantId)))
    .where(eq(organizations.tenantId, ctx.tenantId))
    .orderBy(desc(organizations.createdAt));
  const nameById = new Map(rows.map((r) => [r.id, r.name]));
  const headers = [
    "id",
    "tipo",
    "nome",
    "nome_fantasia",
    "cnpj",
    "cidade",
    "uf",
    "setor",
    "regime_tributario",
    "regime_confirmado_por",
    "irpj_estimado",
    "contribuinte_icms_rs",
    "escritorio_contabil",
    "dono",
    "observacoes",
    "criado_em",
  ].map((k) => h(k));
  return {
    headers,
    rows: rows.map((org) => ({
      id: org.id,
      tipo: org.type,
      nome: org.name,
      nome_fantasia: org.tradeName,
      cnpj: org.cnpj,
      cidade: org.city,
      uf: org.uf,
      setor: org.sector,
      regime_tributario: org.taxRegime,
      regime_confirmado_por: org.taxRegimeConfirmedBy,
      irpj_estimado: org.estimatedIrpj,
      contribuinte_icms_rs: org.icmsContributorRs,
      escritorio_contabil: org.accountantOrgId ? (nameById.get(org.accountantOrgId) ?? null) : null,
      dono: org.ownerName,
      observacoes: org.notes,
      criado_em: org.createdAt,
    })),
  };
}

async function exportContacts(ctx: Ctx): Promise<ExportResult> {
  const rows = await db
    .select({ contact: contacts, orgName: organizations.name, orgCnpj: organizations.cnpj })
    .from(contacts)
    .leftJoin(
      organizations,
      and(eq(organizations.id, contacts.orgId), eq(organizations.tenantId, ctx.tenantId)),
    )
    .where(eq(contacts.tenantId, ctx.tenantId))
    .orderBy(desc(contacts.createdAt));
  const headers = [
    "id",
    "organizacao",
    "cnpj_organizacao",
    "nome",
    "cargo",
    "email",
    "telefone",
    "linkedin",
    "decisor",
    "origem_dado",
    "criado_em",
  ].map((k) => h(k));
  return {
    headers,
    rows: rows.map(({ contact, orgName, orgCnpj }) => ({
      id: contact.id,
      organizacao: orgName,
      cnpj_organizacao: orgCnpj,
      nome: contact.name,
      cargo: contact.title,
      email: contact.email,
      telefone: contact.phone,
      linkedin: contact.linkedinUrl,
      decisor: contact.isDecisionMaker,
      origem_dado: contact.sourceDetail,
      criado_em: contact.createdAt,
    })),
  };
}

async function exportConsents(ctx: Ctx): Promise<ExportResult> {
  const rows = await db
    .select({ consent: consents, leadName: leads.name, leadEmail: leads.email })
    .from(consents)
    .leftJoin(leads, and(eq(leads.id, consents.leadId), eq(leads.tenantId, ctx.tenantId)))
    .where(eq(consents.tenantId, ctx.tenantId))
    .orderBy(desc(consents.createdAt));
  const headers = [
    "id",
    "lead_id",
    "lead",
    "email_lead",
    "finalidade",
    "concedido",
    "versao_politica",
    "texto",
    "canais",
    "pagina_origem",
    "criado_em",
  ].map((k) => h(k));
  return {
    headers,
    rows: rows.map(({ consent, leadName, leadEmail }) => ({
      id: consent.id,
      lead_id: consent.leadId,
      lead: leadName,
      email_lead: leadEmail,
      finalidade: consent.purpose,
      concedido: consent.granted,
      versao_politica: consent.policyVersion,
      texto: consent.consentText,
      canais: consent.channels,
      pagina_origem: consent.sourcePage,
      criado_em: consent.createdAt,
    })),
  };
}

async function exportSimulations(ctx: Ctx): Promise<ExportResult> {
  const rows = await db
    .select({ sim: simulations, leadName: leads.name, leadEmail: leads.email })
    .from(simulations)
    .leftJoin(leads, and(eq(leads.id, simulations.leadId), eq(leads.tenantId, ctx.tenantId)))
    .where(eq(simulations.tenantId, ctx.tenantId))
    .orderBy(desc(simulations.createdAt));
  const headers = [
    "id",
    "lead_id",
    "lead",
    "email_lead",
    "tipo",
    "versao_parametros",
    "entradas",
    "resultado",
    "criado_em",
  ].map((k) => h(k));
  return {
    headers,
    rows: rows.map(({ sim, leadName, leadEmail }) => ({
      id: sim.id,
      lead_id: sim.leadId,
      lead: leadName,
      email_lead: leadEmail,
      tipo: sim.kind,
      versao_parametros: sim.parametersVersion,
      entradas: sim.inputs,
      resultado: sim.outputs,
      criado_em: sim.createdAt,
    })),
  };
}

async function exportProjects(ctx: Ctx): Promise<ExportResult> {
  const rows = await db
    .select({
      project: culturalProjects,
      proponentName: organizations.name,
      proponentCnpj: organizations.cnpj,
      ownerName: users.name,
    })
    .from(culturalProjects)
    .leftJoin(
      organizations,
      and(
        eq(organizations.id, culturalProjects.proponentOrgId),
        eq(organizations.tenantId, ctx.tenantId),
      ),
    )
    .leftJoin(
      users,
      and(eq(users.id, culturalProjects.ownerUserId), eq(users.tenantId, ctx.tenantId)),
    )
    .where(eq(culturalProjects.tenantId, ctx.tenantId))
    .orderBy(desc(culturalProjects.createdAt));
  const headers = [
    "id",
    "nome",
    "slug",
    "proponente",
    "cnpj_proponente",
    "mecanismo",
    "numero_processo",
    "estagio",
    "estagio_desde",
    "valor_aprovado",
    "valor_captado",
    "saldo_a_captar",
    "percentual_captado",
    "prazo_captacao",
    "rubrica_captacao",
    "comissao_percentual",
    "cidade",
    "uf",
    "segmento_cultural",
    "contrapartidas",
    "publicado_no_site",
    "autorizado_por",
    "autorizado_em",
    "data_limite_relatorio",
    "dono",
    "link_deck",
    "link_salic",
    "criado_em",
    "atualizado_em",
  ].map((k) => h(k));
  return {
    headers,
    rows: rows.map(({ project: p, proponentName, proponentCnpj, ownerName }) => {
      const balance = p.approvedAmount != null ? p.approvedAmount - p.raisedAmount : null;
      const pct =
        p.approvedAmount && p.approvedAmount > 0
          ? Math.round((p.raisedAmount / p.approvedAmount) * 10000) / 100
          : null;
      return {
        id: p.id,
        nome: p.name,
        slug: p.slug,
        proponente: proponentName,
        cnpj_proponente: proponentCnpj,
        mecanismo: p.mechanism,
        numero_processo: p.processNumber,
        estagio: p.stage,
        estagio_desde: p.stageEnteredAt,
        valor_aprovado: p.approvedAmount,
        valor_captado: p.raisedAmount,
        saldo_a_captar: balance,
        percentual_captado: pct,
        prazo_captacao: p.fundraisingDeadline,
        rubrica_captacao: p.fundraisingFeeAmount,
        comissao_percentual: p.commissionPct,
        cidade: p.city,
        uf: p.uf,
        segmento_cultural: p.culturalSegment,
        contrapartidas: p.counterparts,
        publicado_no_site: p.publishedOnSite,
        autorizado_por: p.publishAuthorizedBy,
        autorizado_em: p.publishAuthorizedAt,
        data_limite_relatorio: p.reportDueAt,
        dono: ownerName,
        link_deck: p.deckUrl,
        link_salic: p.salicUrl,
        criado_em: p.createdAt,
        atualizado_em: p.updatedAt,
      };
    }),
  };
}

async function exportContributions(ctx: Ctx): Promise<ExportResult> {
  const rows = await db
    .select({
      c: contributions,
      projectName: culturalProjects.name,
      leadName: leads.name,
      leadEmail: leads.email,
      orgName: organizations.name,
      orgCnpj: organizations.cnpj,
    })
    .from(contributions)
    .leftJoin(
      culturalProjects,
      and(
        eq(culturalProjects.id, contributions.projectId),
        eq(culturalProjects.tenantId, ctx.tenantId),
      ),
    )
    .leftJoin(leads, and(eq(leads.id, contributions.leadId), eq(leads.tenantId, ctx.tenantId)))
    .leftJoin(
      organizations,
      and(eq(organizations.id, contributions.orgId), eq(organizations.tenantId, ctx.tenantId)),
    )
    .where(eq(contributions.tenantId, ctx.tenantId))
    .orderBy(desc(contributions.createdAt));
  const headers = [
    "id",
    "projeto",
    "patrocinador",
    "email_patrocinador",
    "organizacao",
    "cnpj",
    "tipo",
    "mecanismo",
    "status",
    "valor_proposto",
    "previsao_fechamento",
    "termo_assinado_em",
    "dados_bancarios_enviados_em",
    "valor_depositado",
    "data_deposito",
    "numero_recibo",
    "data_recibo",
    "recibo_enviado_contador_em",
    "comissao_devida",
    "comissao_paga_em",
    "contrapartidas_entregues",
    "motivo_cancelamento",
    "observacoes",
    "criado_em",
    "atualizado_em",
  ].map((k) => h(k));
  return {
    headers,
    rows: rows.map(({ c, projectName, leadName, leadEmail, orgName, orgCnpj }) => ({
      id: c.id,
      projeto: projectName,
      patrocinador: leadName,
      email_patrocinador: leadEmail,
      organizacao: orgName,
      cnpj: orgCnpj,
      tipo: c.type,
      mecanismo: c.mechanism,
      status: c.status,
      valor_proposto: c.proposedAmount,
      previsao_fechamento: c.expectedCloseAt,
      termo_assinado_em: c.termSignedAt,
      dados_bancarios_enviados_em: c.bankDetailsSentAt,
      valor_depositado: c.depositedAmount,
      data_deposito: c.depositedAt,
      numero_recibo: c.receiptNumber,
      data_recibo: c.receiptIssuedAt,
      recibo_enviado_contador_em: c.receiptSentToAccountantAt,
      comissao_devida: c.commissionDue,
      comissao_paga_em: c.commissionPaidAt,
      contrapartidas_entregues: c.counterpartsDelivered,
      motivo_cancelamento: c.lostReason,
      observacoes: c.notes,
      criado_em: c.createdAt,
      atualizado_em: c.updatedAt,
    })),
  };
}

async function exportActivities(ctx: Ctx): Promise<ExportResult> {
  const owner = aliasedTable(users, "owner");
  const creator = aliasedTable(users, "creator");
  const rows = await db
    .select({
      a: activities,
      leadName: leads.name,
      leadEmail: leads.email,
      orgName: organizations.name,
      projectName: culturalProjects.name,
      ownerName: owner.name,
      creatorName: creator.name,
    })
    .from(activities)
    .leftJoin(leads, and(eq(leads.id, activities.leadId), eq(leads.tenantId, ctx.tenantId)))
    .leftJoin(
      organizations,
      and(eq(organizations.id, activities.orgId), eq(organizations.tenantId, ctx.tenantId)),
    )
    .leftJoin(
      culturalProjects,
      and(
        eq(culturalProjects.id, activities.projectId),
        eq(culturalProjects.tenantId, ctx.tenantId),
      ),
    )
    .leftJoin(owner, and(eq(owner.id, activities.ownerUserId), eq(owner.tenantId, ctx.tenantId)))
    .leftJoin(
      creator,
      and(eq(creator.id, activities.createdByUserId), eq(creator.tenantId, ctx.tenantId)),
    )
    .where(eq(activities.tenantId, ctx.tenantId))
    .orderBy(desc(activities.occurredAt));
  const headers = [
    "id",
    "tipo",
    "assunto",
    "descricao",
    "ocorrido_em",
    "vence_em",
    "concluido_em",
    "lead_id",
    "lead",
    "email_lead",
    "organizacao",
    "projeto",
    "aporte_id",
    "responsavel",
    "criado_por",
    "dados",
    "criado_em",
  ].map((k) => h(k));
  return {
    headers,
    rows: rows.map(({ a, leadName, leadEmail, orgName, projectName, ownerName, creatorName }) => ({
      id: a.id,
      tipo: a.type,
      assunto: a.subject,
      descricao: a.body,
      ocorrido_em: a.occurredAt,
      vence_em: a.dueAt,
      concluido_em: a.doneAt,
      lead_id: a.leadId,
      lead: leadName,
      email_lead: leadEmail,
      organizacao: orgName,
      projeto: projectName,
      aporte_id: a.contributionId,
      responsavel: ownerName,
      criado_por: creatorName,
      dados: a.data,
      criado_em: a.createdAt,
    })),
  };
}

export async function exportTable(ctx: Ctx, table: ExportTable): Promise<ExportResult> {
  switch (table) {
    case "leads":
      return exportLeads(ctx);
    case "organizations":
      return exportOrganizations(ctx);
    case "contacts":
      return exportContacts(ctx);
    case "consents":
      return exportConsents(ctx);
    case "simulations":
      return exportSimulations(ctx);
    case "cultural_projects":
      return exportProjects(ctx);
    case "contributions":
      return exportContributions(ctx);
    case "activities":
      return exportActivities(ctx);
  }
}
