// modelo-de-dados.md, seção 3.10
import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { contacts } from "./contacts";
import { contributions } from "./contributions";
import { activityType } from "./enums";
import { leads } from "./leads";
import { organizations } from "./organizations";
import { culturalProjects } from "./projects";
import { tenants } from "./tenants";

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
    leadId: uuid().references(() => leads.id),
    orgId: uuid().references(() => organizations.id),
    contactId: uuid().references(() => contacts.id),
    projectId: uuid().references(() => culturalProjects.id),
    contributionId: uuid().references(() => contributions.id),
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
    check(
      "activities_subject_check",
      sql`num_nonnulls(${t.leadId}, ${t.orgId}, ${t.projectId}, ${t.contributionId}) >= 1`,
    ),
  ],
);
