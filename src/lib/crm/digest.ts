// E-mail diário (proposta-c-simplicidade.md, seção 9.3; regra R-13): função pura que recebe os
// dados já consultados (src/lib/repos/digest.ts) e devolve assunto, texto e HTML. Sem banco aqui.
import { escapeHtml } from "@/lib/email/templates/layout";
import { formatBRL, formatCalendarDate, formatDate, formatDateTime, daysOverdue } from "./format";
import { stageLabel } from "./enum-labels";

export type DigestOverdueLead = {
  id: string;
  name: string;
  organization: string | null;
  pipeline: string;
  stage: string;
  nextActionAt: Date;
  ownerName: string | null;
};

export type DigestTask = {
  id: string;
  subject: string;
  dueAt: Date;
  leadId: string | null;
  projectId: string | null;
  ownerName: string | null;
};

export type DigestNewLead = {
  id: string;
  name: string;
  segment: string;
  source: string;
  sourceDetail: string | null;
  city: string | null;
  uf: string | null;
  temperature: string;
  createdAt: Date;
};

export type DigestContribution = {
  id: string;
  leadId: string;
  leadName: string;
  projectName: string;
  proposedAmount: number;
  expectedCloseAt: string | null;
  status: string;
};

export type DigestProject = {
  id: string;
  name: string;
  proponentName: string;
  fundraisingDeadline: string | null;
  approvedAmount: number | null;
  raisedAmount: number;
  balance: number | null;
  raisedPercent: number | null;
  reasons: ("prazo" | "captacao")[];
};

export type DigestWeek = {
  leadsTotal: number;
  bySource: { source: string; count: number }[];
  byCampaign: { campaign: string; count: number }[];
  simulations: number;
  guideDownloads: number;
  // Heurística de "campanha ativa": houve lead com utm_campaign nos últimos 30 dias.
  campaignActive: boolean;
  leadsLast24h: number;
};

export type DigestData = {
  overdueLeads: DigestOverdueLead[];
  overdueLeadsTotal: number;
  tasks: DigestTask[];
  tasksTotal: number;
  newLeads: DigestNewLead[];
  newLeadsTotal: number;
  contributions: DigestContribution[];
  contributionsTotal: number;
  projects: DigestProject[];
  projectsTotal: number;
  week: DigestWeek;
};

export type DigestSection = {
  title: string;
  lines: { text: string; href?: string }[];
  emptyText: string;
  seeAllHref?: string;
  seeAllLabel?: string;
};

export type Digest = {
  subject: string;
  // Alertas no topo do e-mail ("zero leads", seção 9.3).
  alerts: string[];
  sections: DigestSection[];
  counts: {
    overdue: number;
    tasks: number;
    newLeads: number;
    contributions: number;
    projects: number;
  };
};

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function subjectDate(now: Date): string {
  const weekday = WEEKDAYS[Math.max(0, dayIndex(now))];
  const ddmm = formatDate(now).slice(0, 5);
  return `${weekday} ${ddmm}`;
}

function dayIndex(now: Date): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  }).format(now);
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(
    name,
  );
}

export function buildDigest(data: DigestData, opts: { appUrl: string; now: Date }): Digest {
  const base = opts.appUrl.replace(/\/$/, "");
  const now = opts.now;
  const overdueCount = data.overdueLeadsTotal + data.tasksTotal;
  const subject = `Prospekto CRM, ${subjectDate(now)}: ${overdueCount} vencidos, ${data.newLeadsTotal} novos, ${data.contributionsTotal} aportes`;

  const alerts: string[] = [];
  if (data.week.leadsTotal === 0) {
    alerts.push("Nenhum lead nos últimos 7 dias: verifique formulários e campanhas.");
  } else if (data.week.campaignActive && data.week.leadsLast24h === 0) {
    alerts.push(
      "Nenhum lead nas últimas 24 horas com campanha ativa (houve lead com utm_campaign nos últimos 30 dias): verifique os formulários e a campanha.",
    );
  }

  const overdue: DigestSection = {
    title: `Follow-ups vencidos (${overdueCount})`,
    emptyText: "Nada pendente hoje.",
    seeAllHref: `${base}/app/leads?vencidos=1`,
    seeAllLabel: "ver todos",
    lines: [
      ...data.overdueLeads.map((l) => ({
        text: `${l.name}${l.organization ? `, ${l.organization}` : ""}, ${l.pipeline}/${stageLabel(l.stage)}, atrasado há ${daysOverdue(l.nextActionAt, now)} dias${l.ownerName ? `, ${l.ownerName}` : ", sem dono"}`,
        href: `${base}/app/leads/${l.id}`,
      })),
      ...data.tasks.map((t) => ({
        text: `Tarefa: ${t.subject}, vencida em ${formatDateTime(t.dueAt)}${t.ownerName ? `, ${t.ownerName}` : ""}`,
        href: t.leadId
          ? `${base}/app/leads/${t.leadId}`
          : t.projectId
            ? `${base}/app/projetos/${t.projectId}`
            : `${base}/app`,
      })),
    ],
  };

  const newLeads: DigestSection = {
    title: `Leads novos sem dono (${data.newLeadsTotal})`,
    emptyText: "Nada pendente hoje.",
    seeAllHref: `${base}/app/leads?semdono=1`,
    seeAllLabel: "ver todos",
    lines: data.newLeads.map((l) => ({
      text: `${l.name}, ${l.segment}, origem ${l.source}${l.sourceDetail ? ` (${l.sourceDetail})` : ""}${l.city ? `, ${l.city}${l.uf ? `/${l.uf}` : ""}` : ""}, ${l.temperature}, criado em ${formatDateTime(l.createdAt)}`,
      href: `${base}/app/leads/${l.id}`,
    })),
  };

  const contributions: DigestSection = {
    title: `Aportes previstos nos próximos 15 dias (${data.contributionsTotal})`,
    emptyText: "Nada pendente hoje.",
    seeAllHref: `${base}/app/aportes?previstos=15`,
    seeAllLabel: "ver todos",
    lines: data.contributions.map((c) => ({
      text: `${c.leadName}, ${c.projectName}, ${formatBRL(c.proposedAmount)}, previsto para ${formatCalendarDate(c.expectedCloseAt) || "data não informada"}, ${stageLabelContribution(c.status)}`,
      href: `${base}/app/aportes/${c.id}`,
    })),
  };

  const projects: DigestSection = {
    title: `Projetos perto do prazo ou abaixo de 10% captado (${data.projectsTotal})`,
    emptyText: "Nada pendente hoje.",
    seeAllHref: `${base}/app/projetos?alertas=1`,
    seeAllLabel: "ver todos",
    lines: data.projects.map((p) => ({
      text: `${p.name}, ${p.proponentName}, prazo ${formatCalendarDate(p.fundraisingDeadline) || "sem prazo"}, saldo a captar ${formatBRL(p.balance)}, ${p.raisedPercent == null ? "sem valor aprovado" : `${p.raisedPercent.toFixed(0)}% captado`} (${p.reasons.map((r) => (r === "prazo" ? "menos de 6 meses" : "abaixo de 10%")).join("; ")})`,
      href: `${base}/app/projetos/${p.id}`,
    })),
  };

  const week: DigestSection = {
    title: "Últimos 7 dias",
    emptyText: "Nenhum lead nos últimos 7 dias.",
    lines: [
      { text: `Leads criados: ${data.week.leadsTotal}` },
      ...data.week.bySource.map((s) => ({ text: `Por origem ${s.source}: ${s.count}` })),
      ...data.week.byCampaign.map((c) => ({ text: `Por campanha ${c.campaign}: ${c.count}` })),
      { text: `Simulações concluídas: ${data.week.simulations}` },
      { text: `Downloads do guia: ${data.week.guideDownloads}` },
    ],
  };

  return {
    subject,
    alerts,
    sections: [overdue, newLeads, contributions, projects, week],
    counts: {
      overdue: data.overdueLeadsTotal,
      tasks: data.tasksTotal,
      newLeads: data.newLeadsTotal,
      contributions: data.contributionsTotal,
      projects: data.projectsTotal,
    },
  };
}

function stageLabelContribution(status: string): string {
  const labels: Record<string, string> = {
    proposta: "proposta",
    termo_assinado: "termo assinado",
    depositado: "depositado",
    recibo_emitido: "recibo emitido",
    cancelado: "cancelado",
  };
  return labels[status] ?? status;
}

// Texto simples e HTML mínimo (sem React Email), como pede a seção 9.3.
export function renderDigest(
  digest: Digest,
  opts: { recipientName: string; now: Date },
): { subject: string; text: string; html: string } {
  const header = `Olá, ${opts.recipientName}. Resumo do CRM em ${formatDateTime(opts.now)}.`;
  const textParts: string[] = [header, ""];
  for (const alert of digest.alerts) textParts.push(`ATENÇÃO: ${alert}`, "");
  for (const s of digest.sections) {
    textParts.push(s.title.toUpperCase());
    if (s.lines.length === 0) textParts.push(`- ${s.emptyText}`);
    for (const line of s.lines) textParts.push(`- ${line.text}${line.href ? ` ${line.href}` : ""}`);
    if (s.seeAllHref) textParts.push(`${s.seeAllLabel ?? "ver todos"}: ${s.seeAllHref}`);
    textParts.push("");
  }
  textParts.push("Os links exigem login no CRM. Este e-mail é interno e contém dados pessoais.");
  const text = textParts.join("\n");

  const sectionsHtml = digest.sections
    .map((s) => {
      const items =
        s.lines.length === 0
          ? `<li style="margin:0 0 6px;color:#5B6670">${escapeHtml(s.emptyText)}</li>`
          : s.lines
              .map(
                (line) =>
                  `<li style="margin:0 0 6px">${line.href ? `<a href="${escapeHtml(line.href)}" style="color:#163B5C">${escapeHtml(line.text)}</a>` : escapeHtml(line.text)}</li>`,
              )
              .join("");
      const seeAll = s.seeAllHref
        ? `<p style="margin:4px 0 0;font-size:13px"><a href="${escapeHtml(s.seeAllHref)}" style="color:#163B5C">${escapeHtml(s.seeAllLabel ?? "ver todos")}</a></p>`
        : "";
      return `<h2 style="font-size:16px;margin:20px 0 8px">${escapeHtml(s.title)}</h2><ul style="margin:0;padding-left:20px">${items}</ul>${seeAll}`;
    })
    .join("\n");
  const alertsHtml = digest.alerts
    .map(
      (a) =>
        `<p style="margin:0 0 12px;padding:10px 12px;background:#FDECEA;color:#7A2230;border-radius:6px;font-weight:600">${escapeHtml(a)}</p>`,
    )
    .join("");
  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(digest.subject)}</title></head>
<body style="margin:0;padding:0;background:#F4F1EB;font-family:Inter,Helvetica,Arial,sans-serif;color:#1E2A32;font-size:15px;line-height:1.5">
<div style="max-width:640px;margin:0 auto;padding:24px">
<div style="background:#ffffff;border-radius:8px;padding:24px">
<p style="margin:0 0 16px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#7A2230;font-weight:600">Prospekto CRM</p>
<p style="margin:0 0 12px">${escapeHtml(header)}</p>
${alertsHtml}
${sectionsHtml}
</div>
<p style="margin:16px 0 0;font-size:13px;color:#5B6670">Os links exigem login no CRM. Este e-mail é interno e contém dados pessoais.</p>
</div>
</body>
</html>`;
  return { subject: digest.subject, text, html };
}
