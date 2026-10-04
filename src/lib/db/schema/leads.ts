// modelo-de-dados.md, seção 3.5; scaffold.md, seção 5.17
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { PIPELINES, STAGES, TERMINAL_STAGES } from "@/lib/domain/pipelines";
import { users } from "./auth";
import { contacts } from "./contacts";
import {
  emailStatus,
  leadInterest,
  leadSegment,
  leadSource,
  leadTemperature,
  lostReason,
} from "./enums";
import { organizations } from "./organizations";
import { culturalProjects } from "./projects";
import { tenants } from "./tenants";

// Literais SQL (sql.raw): com `sql\`${v}\`` o drizzle-kit emitiria $1, $2... em DDL.
const lit = (v: string) => sql.raw(`'${v.replace(/'/g, "''")}'`);
const inList = (values: readonly string[]) => sql.join(values.map(lit), sql`, `);

export const leads = pgTable(
  "leads",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id),
    segment: leadSegment().notNull(),
    pipeline: text().notNull(),
    stage: text().notNull(),
    stageEnteredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    interest: leadInterest().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    phone: text(),
    city: text(),
    uf: text(),
    message: text(),
    source: leadSource().notNull(),
    sourceDetail: text(),
    utmSource: text(),
    utmMedium: text(),
    utmCampaign: text(),
    referrer: text(),
    landingPath: text(),
    score: integer().notNull().default(0),
    temperature: leadTemperature().notNull().default("frio"),
    ownerUserId: text().references(() => users.id),
    orgId: uuid().references(() => organizations.id),
    contactId: uuid().references(() => contacts.id),
    referredByOrgId: uuid().references(() => organizations.id),
    projectId: uuid().references((): AnyPgColumn => culturalProjects.id),
    projectInterestId: uuid().references((): AnyPgColumn => culturalProjects.id),
    nextActionAt: timestamp({ withTimezone: true }),
    lastContactAt: timestamp({ withTimezone: true }),
    lostReason: lostReason(),
    lostReasonDetail: text(),
    tags: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    attributes: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    emailStatus: emailStatus().notNull().default("ok"),
    guideVersion: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("leads_tenant_email_segment_uq").on(t.tenantId, t.email, t.segment),
    index("leads_tenant_pipeline_stage_idx").on(t.tenantId, t.pipeline, t.stage),
    index("leads_tenant_next_action_idx")
      .on(t.tenantId, t.nextActionAt)
      .where(sql`${t.nextActionAt} is not null`),
    index("leads_tenant_owner_idx").on(t.tenantId, t.ownerUserId),
    index("leads_tenant_created_idx").on(t.tenantId, sql`${t.createdAt} desc`),
    check("leads_pipeline_check", sql`${t.pipeline} in (${inList(PIPELINES)})`),
    // Pares (pipeline, estágio) válidos, gerados de src/lib/domain/pipelines.ts.
    check(
      "leads_pipeline_stage_check",
      sql.join(
        PIPELINES.map(
          (p) => sql`(${t.pipeline} = ${lit(p)} and ${t.stage} in (${inList(STAGES[p])}))`,
        ),
        sql` or `,
      ),
    ),
    // Regra R-4: estágio terminal exige motivo de perda.
    check(
      "leads_lost_reason_check",
      sql`${t.stage} not in (${inList([...new Set(Object.values(TERMINAL_STAGES))])}) or ${t.lostReason} is not null`,
    ),
    check("leads_score_check", sql`${t.score} between 0 and 100`),
  ],
);
