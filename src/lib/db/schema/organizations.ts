// modelo-de-dados.md, seção 3.3
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { organizationType, regimeConfirmation, taxRegime } from "./enums";
import { tenants } from "./tenants";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id),
    type: organizationType().notNull(),
    name: text().notNull(),
    tradeName: text(),
    cnpj: text(),
    city: text(),
    uf: text(),
    sector: text(),
    taxRegime: taxRegime(),
    taxRegimeConfirmedBy: regimeConfirmation(),
    estimatedIrpj: numeric({ precision: 14, scale: 2, mode: "number" }),
    icmsContributorRs: boolean(),
    accountantOrgId: uuid().references((): AnyPgColumn => organizations.id),
    ownerUserId: text().references(() => users.id),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("organizations_tenant_cnpj_uq")
      .on(t.tenantId, t.cnpj)
      .where(sql`${t.cnpj} is not null`),
    index("organizations_tenant_type_idx").on(t.tenantId, t.type),
  ],
);
