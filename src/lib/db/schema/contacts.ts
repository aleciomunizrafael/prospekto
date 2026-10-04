// modelo-de-dados.md, seção 3.4
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { tenants } from "./tenants";

export const contacts = pgTable(
  "contacts",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id),
    orgId: uuid()
      .notNull()
      .references(() => organizations.id),
    name: text().notNull(),
    title: text(),
    email: text(),
    phone: text(),
    linkedinUrl: text(),
    isDecisionMaker: boolean().notNull().default(false),
    sourceDetail: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("contacts_tenant_org_idx").on(t.tenantId, t.orgId),
    index("contacts_tenant_email_idx").on(t.tenantId, t.email),
  ],
);
