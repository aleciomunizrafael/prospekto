// modelo-de-dados.md, seção 3.10
import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { TASK_PRIORITIES } from "@/lib/domain/enums";
import { users } from "./auth";
import { contacts } from "./contacts";
import { contributions } from "./contributions";
import { activityType } from "./enums";
import { leads } from "./leads";
import { organizations } from "./organizations";
import { culturalProjects } from "./projects";
import { prospectingItems } from "./prospecting";
import { tenants } from "./tenants";

// Literais SQL (sql.raw): com `sql\`${v}\`` o drizzle-kit emitiria $1, $2... em DDL.
const lit = (v: string) => sql.raw(`'${v.replace(/'/g, "''")}'`);
const inList = (values: readonly string[]) => sql.join(values.map(lit), sql`, `);

export const activities = pgTable(
  "activities",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id),
    type: activityType().notNull(),
    subject: text().notNull(),
    body: text(),
    data: jsonb().$type<Record<string, unknown>>(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp({ withTimezone: true }),
    doneAt: timestamp({ withTimezone: true }),
    // Só `tarefa` (ADR-004, 6.4.3): "Em andamento" = started_at preenchido e done_at nulo.
    startedAt: timestamp({ withTimezone: true }),
    // Só `tarefa`: baixa | media | alta; sem DEFAULT porque valeria para ligações e notas.
    priority: text(),
    // Ordem na coluna do quadro de Tarefas (fracionária; renumerada pelo repositório).
    position: doublePrecision().notNull().default(0),
    leadId: uuid().references(() => leads.id),
    orgId: uuid().references(() => organizations.id),
    contactId: uuid().references(() => contacts.id),
    projectId: uuid().references(() => culturalProjects.id),
    contributionId: uuid().references(() => contributions.id),
    // FK sem ON DELETE (NO ACTION): deleteList/deleteItem limpam as atividades antes (P15).
    prospectingItemId: uuid().references(() => prospectingItems.id),
    ownerUserId: text().references(() => users.id),
    createdByUserId: text().references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("activities_tenant_lead_occurred_idx").on(
      t.tenantId,
      t.leadId,
      sql`${t.occurredAt} desc`,
    ),
    index("activities_tenant_due_idx")
      .on(t.tenantId, t.dueAt)
      .where(sql`${t.doneAt} is null and ${t.type} = 'tarefa'`),
    index("activities_tenant_project_idx").on(t.tenantId, t.projectId),
    // Colunas "A fazer" e "Em andamento" do quadro de Tarefas.
    index("activities_tenant_task_position_idx")
      .on(t.tenantId, t.position)
      .where(sql`${t.type} = 'tarefa' and ${t.doneAt} is null`),
    index("activities_tenant_prospecting_idx")
      .on(t.tenantId, t.prospectingItemId, sql`${t.occurredAt} desc`)
      .where(sql`${t.prospectingItemId} is not null`),
    // Tarefa pode ser solta; qualquer outro tipo continua ligado a alguém (ADR-004, 6.4.3).
    check(
      "activities_subject_check",
      sql`${t.type} = 'tarefa' or num_nonnulls(${t.leadId}, ${t.orgId}, ${t.projectId}, ${t.contributionId}, ${t.prospectingItemId}) >= 1`,
    ),
    check(
      "activities_priority_check",
      sql`${t.priority} is null or ${t.priority} in (${inList(TASK_PRIORITIES)})`,
    ),
  ],
);
