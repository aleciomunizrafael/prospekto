// modelo-de-dados.md, seção 3.7
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { taxpayerKind } from "./enums";
import { leads } from "./leads";
import { tenants } from "./tenants";

export const simulations = pgTable(
  "simulations",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id),
    leadId: uuid().references(() => leads.id),
    kind: taxpayerKind().notNull(),
    inputs: jsonb().$type<Record<string, unknown>>().notNull(),
    outputs: jsonb().$type<Record<string, unknown>>().notNull(),
    parametersVersion: text().notNull(),
    applyLc224: boolean().notNull(),
    resultTokenHash: text(),
    ipHash: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("simulations_tenant_lead_idx").on(t.tenantId, t.leadId),
    uniqueIndex("simulations_result_token_hash_uq")
      .on(t.resultTokenHash)
      .where(sql`${t.resultTokenHash} is not null`),
  ],
);
