// modelo-de-dados.md, seção 3.6 (append-only; regra R-14)
import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { consentPurpose } from "./enums";
import { leads } from "./leads";
import { tenants } from "./tenants";

export const consents = pgTable(
  "consents",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id),
    leadId: uuid()
      .notNull()
      .references(() => leads.id),
    contactId: uuid().references(() => contacts.id),
    purpose: consentPurpose().notNull(),
    granted: boolean().notNull(),
    policyVersion: text().notNull(),
    consentText: text().notNull(),
    channels: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sourcePage: text().notNull(),
    ipHash: text(),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("consents_tenant_lead_purpose_created_idx").on(
      t.tenantId,
      t.leadId,
      t.purpose,
      sql`${t.createdAt} desc`,
    ),
  ],
);
