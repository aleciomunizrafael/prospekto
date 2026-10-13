"use server";

// Busca da paleta Ctrl+K (ADR-004, seção 6.7; plano, P11 e regra 10). Começa com requireSession()
// (AGENTS.md; tests/auth-guard.test.ts): Server Actions são alcançáveis por POST direto, por isso o
// argumento passa por `safeParse` antes de qualquer `.trim()` e, inválido, devolve `[]` em vez de
// deixar um TypeError virar 500. Seis repositórios em paralelo, 5 por tipo, e a resposta só com
// campos de tela (nome, empresa, estágio, cidade, prazo): nunca e-mail nem telefone (R-16, LGPD).
// Itens de prospecção são buscados só por nome. O log registra contagens; nunca o termo.
import { z } from "zod";
import {
  SEARCH_GROUP_LABELS,
  type SearchKind as ShellSearchKind,
} from "@/components/crm/shell/modules";
import { CONTRIBUTION_STATUS_LABELS, ORGANIZATION_TYPE_LABELS } from "@/lib/crm/enum-labels";
import { formatBRL } from "@/lib/crm/format";
import { PROSPECTING_STATUS_LABELS, SEGMENT_LABELS, stageLabel } from "@/lib/crm/labels";
import { leadCompany } from "@/lib/crm/lead-view";
import { describeTaskDue } from "@/lib/crm/task-due";
import type { ProspectingStatus } from "@/lib/domain/enums";
import { log } from "@/lib/log";
import { listContributionSummaries } from "@/lib/repos/contributions";
import { searchLeads } from "@/lib/repos/leads";
import { listOrganizationSummaries } from "@/lib/repos/organizations";
import { listProjectSummaries } from "@/lib/repos/projects";
import { searchProspectingItems } from "@/lib/repos/prospecting";
import { searchTasks, type TaskRow } from "@/lib/repos/tasks";
import { requireSession } from "@/lib/session";

export type SearchKind = ShellSearchKind;
export type SearchItem = {
  id: string;
  kind: SearchKind;
  title: string;
  meta: string | null;
  href: string;
};
export type SearchGroups = { kind: SearchKind; label: string; items: SearchItem[] }[];

const PER_KIND = 5;

const querySchema = z.string().max(1000);

function joinMeta(parts: (string | null | undefined)[]): string | null {
  const text = parts.filter((p): p is string => Boolean(p && p.trim())).join(" · ");
  return text || null;
}

// Vínculo da tarefa em texto: o primeiro que existir (uma tarefa tem no máximo um).
function taskLink(task: TaskRow): string | null {
  return task.leadName ?? task.orgName ?? task.projectName ?? task.contributionLabel ?? null;
}

export async function searchAllAction(query: unknown): Promise<SearchGroups> {
  const ctx = await requireSession();
  const parsed = querySchema.safeParse(query);
  if (!parsed.success) return [];
  const q = parsed.data.trim().slice(0, 120);
  if (q.length < 2) return [];

  const now = new Date();
  const [leads, organizations, projects, contributions, tasks, items] = await Promise.all([
    searchLeads(ctx, { search: q, pageSize: PER_KIND, includeLost: true }),
    listOrganizationSummaries(ctx, { search: q, limit: PER_KIND }),
    listProjectSummaries(ctx, { search: q, limit: PER_KIND, includeArchived: true }),
    listContributionSummaries(ctx, { search: q, limit: PER_KIND }),
    searchTasks(ctx, { search: q, limit: PER_KIND }),
    searchProspectingItems(ctx, { search: q, limit: PER_KIND }),
  ]);

  const groups: SearchGroups = [
    {
      kind: "lead",
      label: SEARCH_GROUP_LABELS.lead,
      items: leads.rows.map((lead) => ({
        id: lead.id,
        kind: "lead",
        title: lead.name,
        meta: joinMeta([leadCompany(lead) ?? SEGMENT_LABELS[lead.segment], stageLabel(lead.stage)]),
        href: `/app/leads/${lead.id}`,
      })),
    },
    {
      kind: "organizacao",
      label: SEARCH_GROUP_LABELS.organizacao,
      items: organizations.map((org) => ({
        id: org.id,
        kind: "organizacao",
        title: org.name,
        meta: joinMeta([
          ORGANIZATION_TYPE_LABELS[org.type],
          org.city ? [org.city, org.uf].filter(Boolean).join("/") : null,
        ]),
        href: `/app/organizacoes/${org.id}`,
      })),
    },
    {
      kind: "projeto",
      label: SEARCH_GROUP_LABELS.projeto,
      items: projects.map((project) => ({
        id: project.id,
        kind: "projeto",
        title: project.name,
        meta: joinMeta([project.proponentName]),
        href: `/app/projetos/${project.id}`,
      })),
    },
    {
      kind: "aporte",
      label: SEARCH_GROUP_LABELS.aporte,
      items: contributions.map((c) => ({
        id: c.id,
        kind: "aporte",
        title: `${c.leadName} → ${c.projectName}`,
        meta: joinMeta([formatBRL(c.proposedAmount), CONTRIBUTION_STATUS_LABELS[c.status]]),
        href: `/app/aportes/${c.id}`,
      })),
    },
    {
      kind: "tarefa",
      label: SEARCH_GROUP_LABELS.tarefa,
      items: tasks.map((task) => ({
        id: task.id,
        kind: "tarefa",
        title: task.subject,
        meta: joinMeta([
          task.doneAt ? "Concluída" : describeTaskDue(task.dueAt, now).text,
          taskLink(task),
        ]),
        href: `/app/tarefas?task=${task.id}`,
      })),
    },
    {
      kind: "prospeccao",
      label: SEARCH_GROUP_LABELS.prospeccao,
      items: items.map((item) => ({
        id: item.id,
        kind: "prospeccao",
        title: item.name,
        meta: joinMeta([
          item.listName,
          PROSPECTING_STATUS_LABELS[item.status as ProspectingStatus] ?? null,
        ]),
        href: `/app/prospeccao/${item.listId}/${item.id}`,
      })),
    },
  ];

  const counts = Object.fromEntries(groups.map((g) => [g.kind, g.items.length]));
  log("info", "busca global", { tenantId: ctx.tenantId, userId: ctx.userId, counts });

  return groups.filter((g) => g.items.length > 0);
}
