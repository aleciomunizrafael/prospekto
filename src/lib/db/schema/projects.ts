// modelo-de-dados.md, seção 3.8 (cultural_projects)
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { STAGES } from "@/lib/domain/pipelines";
import { users } from "./auth";
import { incentiveMechanism } from "./enums";
import { leads } from "./leads";
import { organizations } from "./organizations";
import { tenants } from "./tenants";

const money = () => numeric({ precision: 14, scale: 2, mode: "number" });

export const culturalProjects = pgTable(
  "cultural_projects",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id),
    proponentOrgId: uuid()
      .notNull()
      .references(() => organizations.id),
    leadId: uuid().references((): AnyPgColumn => leads.id),
    name: text().notNull(),
    slug: text().notNull(),
    mechanism: incentiveMechanism().notNull(),
    processNumber: text(),
    stage: text().notNull().default("prospeccao"),
    stageEnteredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    approvedAmount: money(),
    raisedAmount: money().notNull().default(0),
    fundraisingDeadline: date(),
    fundraisingFeeAmount: money(),
    commissionPct: numeric({ precision: 5, scale: 2, mode: "number" }),
    city: text(),
    uf: text(),
    culturalSegment: text(),
    summary: text(),
    counterparts: text(),
    deckUrl: text(),
    salicUrl: text(),
    publishedOnSite: boolean().notNull().default(false),
    publishAuthorizedBy: text(),
    publishAuthorizedAt: timestamp({ withTimezone: true }),
    reportDueAt: date(),
    ownerUserId: text().references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("cultural_projects_tenant_slug_uq").on(t.tenantId, t.slug),
    index("cultural_projects_tenant_stage_idx").on(t.tenantId, t.stage),
    index("cultural_projects_tenant_published_idx")
      .on(t.tenantId, t.publishedOnSite)
      .where(sql`${t.publishedOnSite}`),
    index("cultural_projects_tenant_deadline_idx").on(t.tenantId, t.fundraisingDeadline),
    check(
      "cultural_projects_stage_check",
      sql`${t.stage} in (${sql.join(
        STAGES.projetos.map((s) => sql.raw(`'${s}'`)),
        sql`, `,
      )})`,
    ),
    check(
      "cultural_projects_commission_pct_check",
      sql`${t.commissionPct} is null or (${t.commissionPct} >= 0 and ${t.commissionPct} <= 100)`,
    ),
    check("cultural_projects_raised_amount_check", sql`${t.raisedAmount} >= 0`),
    // Regra R-11: publicação exige autorização por escrito do proponente.
    check(
      "cultural_projects_publish_check",
      sql`${t.publishedOnSite} = false or (${t.publishAuthorizedBy} is not null and ${t.publishAuthorizedAt} is not null)`,
    ),
  ],
);
