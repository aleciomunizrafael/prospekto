// ADR-004, seções 6.4.1 e 6.4.2: listas de prospecção e itens (pré-lead). Toda tabela nova tem
// tenant_id; o status é text + CHECK gerado de PROSPECTING_STATUSES (mesmo padrão de ai_runs).
import { sql } from "drizzle-orm";
import {
  check,
  date,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { PROSPECTING_STATUSES } from "@/lib/domain/enums";
import { users } from "./auth";
import { leads } from "./leads";
import { organizations } from "./organizations";
import { tenants } from "./tenants";

// Literais SQL (sql.raw): com `sql\`${v}\`` o drizzle-kit emitiria $1, $2... em DDL.
const lit = (v: string) => sql.raw(`'${v.replace(/'/g, "''")}'`);
const inList = (values: readonly string[]) => sql.join(values.map(lit), sql`, `);

export const prospectingLists = pgTable(
  "prospecting_lists",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id),
    name: text().notNull(),
    region: text(),
    notes: text(),
    // De onde vieram os dados (LGPD, art. 18), obrigatório como em contacts.source_detail.
    sourceDetail: text().notNull(),
    assigneeUserId: text().references(() => users.id),
    createdByUserId: text().references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("prospecting_lists_tenant_created_idx").on(t.tenantId, sql`${t.createdAt} desc`)],
);

export const prospectingItems = pgTable(
  "prospecting_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id),
    // Excluir a lista apaga os itens; leads e organizações criados ficam.
    listId: uuid()
      .notNull()
      .references(() => prospectingLists.id, { onDelete: "cascade" }),
    name: text().notNull(),
    // Grupo dentro da lista ("Vinícolas"); texto livre, não o enum lead_segment.
    segment: text(),
    // E.164 (+55...) validado por phoneSchema; número não reconhecido vai para `info`.
    phone: text(),
    hook: text(),
    address: text(),
    size: text(),
    info: text(),
    status: text().notNull().default("a_ligar"),
    notes: text(),
    callbackAt: date(),
    calledAt: timestamp({ withTimezone: true }),
    whatsappSentAt: timestamp({ withTimezone: true }),
    position: doublePrecision().notNull().default(0),
    leadId: uuid().references(() => leads.id, { onDelete: "set null" }),
    orgId: uuid().references(() => organizations.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("prospecting_items_tenant_list_position_idx").on(t.tenantId, t.listId, t.position),
    index("prospecting_items_tenant_status_idx").on(t.tenantId, t.status),
    index("prospecting_items_tenant_lead_idx")
      .on(t.tenantId, t.leadId)
      .where(sql`${t.leadId} is not null`),
    check("prospecting_items_status_check", sql`${t.status} in (${inList(PROSPECTING_STATUSES)})`),
  ],
);
