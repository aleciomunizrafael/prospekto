// modelo-de-dados.md, seção 3.9
import { sql } from "drizzle-orm";
import {
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
import { contributionStatus, contributionType, incentiveMechanism, lostReason } from "./enums";
import { leads } from "./leads";
import { organizations } from "./organizations";
import { culturalProjects } from "./projects";
import { tenants } from "./tenants";

const money = () => numeric({ precision: 14, scale: 2, mode: "number" });

export const contributions = pgTable(
  "contributions",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id),
    projectId: uuid()
      .notNull()
      .references(() => culturalProjects.id),
    leadId: uuid()
      .notNull()
      .references(() => leads.id),
    orgId: uuid().references(() => organizations.id),
    type: contributionType().notNull(),
    mechanism: incentiveMechanism().notNull(),
    status: contributionStatus().notNull().default("proposta"),
    proposedAmount: money().notNull(),
    expectedCloseAt: date(),
    termSignedAt: date(),
    bankDetailsSentAt: date(),
    depositedAmount: money(),
    depositedAt: date(),
    receiptNumber: text(),
    receiptIssuedAt: date(),
    receiptSentToAccountantAt: date(),
    commissionDue: money(),
    commissionPaidAt: date(),
    counterpartsDelivered: boolean().notNull().default(false),
    lostReason: lostReason(),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("contributions_tenant_project_status_idx").on(t.tenantId, t.projectId, t.status),
    index("contributions_tenant_lead_idx").on(t.tenantId, t.leadId),
    index("contributions_tenant_expected_close_idx").on(t.tenantId, t.expectedCloseAt),
    // Regra R-7: um recibo por aporte, único por projeto.
    uniqueIndex("contributions_tenant_project_receipt_uq")
      .on(t.tenantId, t.projectId, t.receiptNumber)
      .where(sql`${t.receiptNumber} is not null`),
    // Regra R-8: comissão só é paga com depósito.
    check(
      "contributions_commission_paid_check",
      sql`${t.commissionPaidAt} is null or ${t.depositedAt} is not null`,
    ),
    check(
      "contributions_termo_check",
      sql`${t.status} <> 'termo_assinado' or ${t.termSignedAt} is not null`,
    ),
    check(
      "contributions_depositado_check",
      sql`${t.status} <> 'depositado' or (${t.depositedAt} is not null and ${t.depositedAmount} > 0)`,
    ),
    check(
      "contributions_recibo_check",
      sql`${t.status} <> 'recibo_emitido' or (${t.receiptNumber} is not null and ${t.receiptIssuedAt} is not null)`,
    ),
    // Regra R-4 aplicada ao aporte cancelado.
    check(
      "contributions_cancelado_check",
      sql`${t.status} <> 'cancelado' or ${t.lostReason} is not null`,
    ),
    check("contributions_proposed_amount_check", sql`${t.proposedAmount} >= 0`),
  ],
);
