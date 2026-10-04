// modelo-de-dados.md, seção 3.11: limite de 5 envios por IP por hora; sem tenant_id, de propósito.
import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const formAttempts = pgTable(
  "form_attempts",
  {
    id: uuid().primaryKey().defaultRandom(),
    ipHash: text().notNull(),
    windowStart: timestamp({ withTimezone: true }).notNull(),
    count: integer().notNull().default(0),
  },
  (t) => [uniqueIndex("form_attempts_ip_window_uq").on(t.ipHash, t.windowStart)],
);
