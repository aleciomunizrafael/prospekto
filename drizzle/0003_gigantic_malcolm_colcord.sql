ALTER TYPE "public"."lead_source" ADD VALUE 'prospeccao';--> statement-breakpoint
CREATE TABLE "prospecting_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"list_id" uuid NOT NULL,
	"name" text NOT NULL,
	"segment" text,
	"phone" text,
	"hook" text,
	"address" text,
	"size" text,
	"info" text,
	"status" text DEFAULT 'a_ligar' NOT NULL,
	"notes" text,
	"callback_at" date,
	"called_at" timestamp with time zone,
	"whatsapp_sent_at" timestamp with time zone,
	"position" double precision DEFAULT 0 NOT NULL,
	"lead_id" uuid,
	"org_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospecting_items_status_check" CHECK ("prospecting_items"."status" in ('a_ligar', 'sem_resposta', 'retornar', 'reuniao_marcada', 'descartado'))
);
--> statement-breakpoint
CREATE TABLE "prospecting_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"region" text,
	"notes" text,
	"source_detail" text NOT NULL,
	"assignee_user_id" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" DROP CONSTRAINT "activities_subject_check";--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "priority" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "position" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "prospecting_item_id" uuid;--> statement-breakpoint
ALTER TABLE "prospecting_items" ADD CONSTRAINT "prospecting_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospecting_items" ADD CONSTRAINT "prospecting_items_list_id_prospecting_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."prospecting_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospecting_items" ADD CONSTRAINT "prospecting_items_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospecting_items" ADD CONSTRAINT "prospecting_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospecting_lists" ADD CONSTRAINT "prospecting_lists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospecting_lists" ADD CONSTRAINT "prospecting_lists_assignee_user_id_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospecting_lists" ADD CONSTRAINT "prospecting_lists_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prospecting_items_tenant_list_position_idx" ON "prospecting_items" USING btree ("tenant_id","list_id","position");--> statement-breakpoint
CREATE INDEX "prospecting_items_tenant_status_idx" ON "prospecting_items" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "prospecting_items_tenant_lead_idx" ON "prospecting_items" USING btree ("tenant_id","lead_id") WHERE "prospecting_items"."lead_id" is not null;--> statement-breakpoint
CREATE INDEX "prospecting_lists_tenant_created_idx" ON "prospecting_lists" USING btree ("tenant_id","created_at" desc);--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_prospecting_item_id_prospecting_items_id_fk" FOREIGN KEY ("prospecting_item_id") REFERENCES "public"."prospecting_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_tenant_task_position_idx" ON "activities" USING btree ("tenant_id","position") WHERE "activities"."type" = 'tarefa' and "activities"."done_at" is null;--> statement-breakpoint
CREATE INDEX "activities_tenant_prospecting_idx" ON "activities" USING btree ("tenant_id","prospecting_item_id","occurred_at" desc) WHERE "activities"."prospecting_item_id" is not null;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_priority_check" CHECK ("activities"."priority" is null or "activities"."priority" in ('baixa', 'media', 'alta'));--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_subject_check" CHECK ("activities"."type" = 'tarefa' or num_nonnulls("activities"."lead_id", "activities"."org_id", "activities"."project_id", "activities"."contribution_id", "activities"."prospecting_item_id") >= 1);--> statement-breakpoint
UPDATE "activities" SET "priority" = 'media' WHERE "type" = 'tarefa' AND "priority" IS NULL;