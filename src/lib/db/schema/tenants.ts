import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// modelo-de-dados.md, seção 3.1
export const tenants = pgTable("tenants", {
  id: text().primaryKey(), // slug imutável ("prospekto")
  name: text().notNull(),
  settings: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
