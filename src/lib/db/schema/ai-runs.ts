// ADR-003, seção 8: uma linha por execução da IA (inclusive recusa e erro), sem conteúdo de prompt.
// Nunca DELETE na Fase 1; a retenção segue a do lead (regra R-17, cron da Fase 2).
import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { AI_KINDS, AI_RUN_STATUSES } from "@/lib/ai/types";
import { users } from "./auth";
import { leads } from "./leads";
import { tenants } from "./tenants";

// Literais SQL (sql.raw): com `sql\`${v}\`` o drizzle-kit emitiria $1, $2... em DDL (como em leads.ts).
const lit = (v: string) => sql.raw(`'${v.replace(/'/g, "''")}'`);
const inList = (values: readonly string[]) => sql.join(values.map(lit), sql`, `);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id),
    kind: text().notNull(), // brief | notes | reply
    leadId: uuid().references(() => leads.id),
    model: text().notNull(), // o modelo que respondeu (muda quando há fallback)
    status: text().notNull(), // ok | refusal | max_tokens | invalid_output | error
    inputTokens: integer().notNull().default(0),
    outputTokens: integer().notNull().default(0),
    cacheReadInputTokens: integer().notNull().default(0),
    durationMs: integer(),
    output: jsonb().$type<Record<string, unknown>>(), // parsed_output validado; nulo fora de "ok"
    data: jsonb().$type<Record<string, unknown>>(), // { effort, fallback, stopDetailsCategory, httpStatus, channel }
    createdBy: text().references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ai_runs_tenant_created_idx").on(t.tenantId, sql`${t.createdAt} desc`),
    index("ai_runs_tenant_lead_kind_created_idx").on(
      t.tenantId,
      t.leadId,
      t.kind,
      sql`${t.createdAt} desc`,
    ),
    check("ai_runs_kind_check", sql`${t.kind} in (${inList(AI_KINDS)})`),
    check("ai_runs_status_check", sql`${t.status} in (${inList(AI_RUN_STATUSES)})`),
  ],
);
