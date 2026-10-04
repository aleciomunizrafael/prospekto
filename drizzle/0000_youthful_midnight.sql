CREATE TYPE "public"."activity_type" AS ENUM('ligacao', 'reuniao', 'email', 'whatsapp', 'visita', 'nota', 'tarefa', 'formulario', 'download', 'sistema');--> statement-breakpoint
CREATE TYPE "public"."consent_purpose" AS ENUM('contato_comercial', 'marketing');--> statement-breakpoint
CREATE TYPE "public"."contribution_status" AS ENUM('proposta', 'termo_assinado', 'depositado', 'recibo_emitido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."contribution_type" AS ENUM('patrocinio', 'doacao');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('ok', 'bounced', 'complained');--> statement-breakpoint
CREATE TYPE "public"."incentive_mechanism" AS ENUM('rouanet_art18', 'rouanet_art26_patrocinio', 'rouanet_art26_doacao', 'audiovisual_art1', 'audiovisual_art1A', 'audiovisual_art3', 'audiovisual_art3A', 'funcines', 'lic_rs', 'esporte', 'fia', 'idoso', 'pronon', 'pronas', 'lic_municipal', 'fsa_brde', 'pnab', 'edital');--> statement-breakpoint
CREATE TYPE "public"."lead_interest" AS ENUM('rouanet', 'audiovisual', 'lic_rs', 'lic_municipal', 'pnab_editais', 'consultoria', 'mentoria', 'nao_sei');--> statement-breakpoint
CREATE TYPE "public"."lead_segment" AS ENUM('PJ', 'PF', 'CONT', 'MUN', 'PROP', 'ALUNO');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('site', 'guia', 'simulador', 'diagnostico', 'linkedin', 'indicacao_contador', 'indicacao_cliente', 'evento', 'campanha', 'whatsapp', 'outro');--> statement-breakpoint
CREATE TYPE "public"."lead_temperature" AS ENUM('frio', 'morno', 'quente');--> statement-breakpoint
CREATE TYPE "public"."lost_reason" AS ENUM('sem_irpj', 'regime_inelegivel', 'sem_decisor', 'sem_interesse', 'prazo_perdido', 'escolheu_outro_captador', 'escolheu_outro_incentivo', 'vinculo_art27', 'vantagem_indevida', 'sem_resposta', 'outro');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('empresa', 'contabilidade', 'municipio', 'proponente', 'outro');--> statement-breakpoint
CREATE TYPE "public"."regime_confirmation" AS ENUM('contador', 'ecf', 'declarado');--> statement-breakpoint
CREATE TYPE "public"."tax_regime" AS ENUM('lucro_real', 'lucro_presumido', 'lucro_arbitrado', 'simples_nacional', 'nao_sei');--> statement-breakpoint
CREATE TYPE "public"."taxpayer_kind" AS ENUM('pj', 'pf');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"tenant_id" text NOT NULL,
	"role" text DEFAULT 'operator' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"type" "organization_type" NOT NULL,
	"name" text NOT NULL,
	"trade_name" text,
	"cnpj" text,
	"city" text,
	"uf" text,
	"sector" text,
	"tax_regime" "tax_regime",
	"tax_regime_confirmed_by" "regime_confirmation",
	"estimated_irpj" numeric(14, 2),
	"icms_contributor_rs" boolean,
	"accountant_org_id" uuid,
	"owner_user_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"email" text,
	"phone" text,
	"linkedin_url" text,
	"is_decision_maker" boolean DEFAULT false NOT NULL,
	"source_detail" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"segment" "lead_segment" NOT NULL,
	"pipeline" text NOT NULL,
	"stage" text NOT NULL,
	"stage_entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"interest" "lead_interest" NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"city" text,
	"uf" text,
	"message" text,
	"source" "lead_source" NOT NULL,
	"source_detail" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"referrer" text,
	"landing_path" text,
	"score" integer DEFAULT 0 NOT NULL,
	"temperature" "lead_temperature" DEFAULT 'frio' NOT NULL,
	"owner_user_id" text,
	"org_id" uuid,
	"contact_id" uuid,
	"referred_by_org_id" uuid,
	"project_id" uuid,
	"project_interest_id" uuid,
	"next_action_at" timestamp with time zone,
	"last_contact_at" timestamp with time zone,
	"lost_reason" "lost_reason",
	"lost_reason_detail" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"email_status" "email_status" DEFAULT 'ok' NOT NULL,
	"guide_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_pipeline_check" CHECK ("leads"."pipeline" in ('patrocinadores', 'contadores', 'municipios', 'projetos', 'alunos')),
	CONSTRAINT "leads_pipeline_stage_check" CHECK (("leads"."pipeline" = 'patrocinadores' and "leads"."stage" in ('novo', 'qualificado', 'diagnostico', 'proposta', 'termo', 'aporte', 'recibo', 'renovacao', 'perdido')) or ("leads"."pipeline" = 'contadores' and "leads"."stage" in ('novo', 'contato', 'apresentacao', 'parceria', 'ativo', 'inativo', 'perdido')) or ("leads"."pipeline" = 'municipios' and "leads"."stage" in ('novo', 'contato', 'diagnostico', 'proposta', 'contrato', 'execucao', 'encerrado', 'perdido')) or ("leads"."pipeline" = 'projetos' and "leads"."stage" in ('prospeccao', 'avaliacao', 'elaboracao', 'inscrito', 'autorizado', 'captando', 'execucao', 'prestacao_contas', 'encerrado', 'arquivado')) or ("leads"."pipeline" = 'alunos' and "leads"."stage" in ('lista_espera', 'pesquisado', 'inscrito', 'aluno', 'alumni', 'perdido'))),
	CONSTRAINT "leads_lost_reason_check" CHECK ("leads"."stage" not in ('perdido', 'arquivado') or "leads"."lost_reason" is not null),
	CONSTRAINT "leads_score_check" CHECK ("leads"."score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"lead_id" uuid NOT NULL,
	"contact_id" uuid,
	"purpose" "consent_purpose" NOT NULL,
	"granted" boolean NOT NULL,
	"policy_version" text NOT NULL,
	"consent_text" text NOT NULL,
	"channels" text[] DEFAULT '{}'::text[] NOT NULL,
	"source_page" text NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"lead_id" uuid,
	"kind" "taxpayer_kind" NOT NULL,
	"inputs" jsonb NOT NULL,
	"outputs" jsonb NOT NULL,
	"parameters_version" text NOT NULL,
	"apply_lc224" boolean NOT NULL,
	"result_token_hash" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cultural_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"proponent_org_id" uuid NOT NULL,
	"lead_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"mechanism" "incentive_mechanism" NOT NULL,
	"process_number" text,
	"stage" text DEFAULT 'prospeccao' NOT NULL,
	"stage_entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_amount" numeric(14, 2),
	"raised_amount" numeric(14, 2) DEFAULT 0 NOT NULL,
	"fundraising_deadline" date,
	"fundraising_fee_amount" numeric(14, 2),
	"commission_pct" numeric(5, 2),
	"city" text,
	"uf" text,
	"cultural_segment" text,
	"summary" text,
	"counterparts" text,
	"deck_url" text,
	"salic_url" text,
	"published_on_site" boolean DEFAULT false NOT NULL,
	"publish_authorized_by" text,
	"publish_authorized_at" timestamp with time zone,
	"report_due_at" date,
	"owner_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cultural_projects_stage_check" CHECK ("cultural_projects"."stage" in ('prospeccao', 'avaliacao', 'elaboracao', 'inscrito', 'autorizado', 'captando', 'execucao', 'prestacao_contas', 'encerrado', 'arquivado')),
	CONSTRAINT "cultural_projects_commission_pct_check" CHECK ("cultural_projects"."commission_pct" is null or ("cultural_projects"."commission_pct" >= 0 and "cultural_projects"."commission_pct" <= 100)),
	CONSTRAINT "cultural_projects_raised_amount_check" CHECK ("cultural_projects"."raised_amount" >= 0),
	CONSTRAINT "cultural_projects_publish_check" CHECK ("cultural_projects"."published_on_site" = false or ("cultural_projects"."publish_authorized_by" is not null and "cultural_projects"."publish_authorized_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"org_id" uuid,
	"type" "contribution_type" NOT NULL,
	"mechanism" "incentive_mechanism" NOT NULL,
	"status" "contribution_status" DEFAULT 'proposta' NOT NULL,
	"proposed_amount" numeric(14, 2) NOT NULL,
	"expected_close_at" date,
	"term_signed_at" date,
	"bank_details_sent_at" date,
	"deposited_amount" numeric(14, 2),
	"deposited_at" date,
	"receipt_number" text,
	"receipt_issued_at" date,
	"receipt_sent_to_accountant_at" date,
	"commission_due" numeric(14, 2),
	"commission_paid_at" date,
	"counterparts_delivered" boolean DEFAULT false NOT NULL,
	"lost_reason" "lost_reason",
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contributions_commission_paid_check" CHECK ("contributions"."commission_paid_at" is null or "contributions"."deposited_at" is not null),
	CONSTRAINT "contributions_termo_check" CHECK ("contributions"."status" <> 'termo_assinado' or "contributions"."term_signed_at" is not null),
	CONSTRAINT "contributions_depositado_check" CHECK ("contributions"."status" <> 'depositado' or ("contributions"."deposited_at" is not null and "contributions"."deposited_amount" > 0)),
	CONSTRAINT "contributions_recibo_check" CHECK ("contributions"."status" <> 'recibo_emitido' or ("contributions"."receipt_number" is not null and "contributions"."receipt_issued_at" is not null)),
	CONSTRAINT "contributions_cancelado_check" CHECK ("contributions"."status" <> 'cancelado' or "contributions"."lost_reason" is not null),
	CONSTRAINT "contributions_proposed_amount_check" CHECK ("contributions"."proposed_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"type" "activity_type" NOT NULL,
	"subject" text NOT NULL,
	"body" text,
	"data" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone,
	"done_at" timestamp with time zone,
	"lead_id" uuid,
	"org_id" uuid,
	"contact_id" uuid,
	"project_id" uuid,
	"contribution_id" uuid,
	"owner_user_id" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activities_subject_check" CHECK (num_nonnulls("activities"."lead_id", "activities"."org_id", "activities"."project_id", "activities"."contribution_id") >= 1)
);
--> statement-breakpoint
CREATE TABLE "form_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_hash" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_accountant_org_id_organizations_id_fk" FOREIGN KEY ("accountant_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_referred_by_org_id_organizations_id_fk" FOREIGN KEY ("referred_by_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_project_id_cultural_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."cultural_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_project_interest_id_cultural_projects_id_fk" FOREIGN KEY ("project_interest_id") REFERENCES "public"."cultural_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cultural_projects" ADD CONSTRAINT "cultural_projects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cultural_projects" ADD CONSTRAINT "cultural_projects_proponent_org_id_organizations_id_fk" FOREIGN KEY ("proponent_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cultural_projects" ADD CONSTRAINT "cultural_projects_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cultural_projects" ADD CONSTRAINT "cultural_projects_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_project_id_cultural_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."cultural_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_project_id_cultural_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."cultural_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_contribution_id_contributions_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."contributions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_tenant_cnpj_uq" ON "organizations" USING btree ("tenant_id","cnpj") WHERE "organizations"."cnpj" is not null;--> statement-breakpoint
CREATE INDEX "organizations_tenant_type_idx" ON "organizations" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "contacts_tenant_org_idx" ON "contacts" USING btree ("tenant_id","org_id");--> statement-breakpoint
CREATE INDEX "contacts_tenant_email_idx" ON "contacts" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_tenant_email_segment_uq" ON "leads" USING btree ("tenant_id","email","segment");--> statement-breakpoint
CREATE INDEX "leads_tenant_pipeline_stage_idx" ON "leads" USING btree ("tenant_id","pipeline","stage");--> statement-breakpoint
CREATE INDEX "leads_tenant_next_action_idx" ON "leads" USING btree ("tenant_id","next_action_at") WHERE "leads"."next_action_at" is not null;--> statement-breakpoint
CREATE INDEX "leads_tenant_owner_idx" ON "leads" USING btree ("tenant_id","owner_user_id");--> statement-breakpoint
CREATE INDEX "leads_tenant_created_idx" ON "leads" USING btree ("tenant_id","created_at" desc);--> statement-breakpoint
CREATE INDEX "consents_tenant_lead_purpose_created_idx" ON "consents" USING btree ("tenant_id","lead_id","purpose","created_at" desc);--> statement-breakpoint
CREATE INDEX "simulations_tenant_lead_idx" ON "simulations" USING btree ("tenant_id","lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "simulations_result_token_hash_uq" ON "simulations" USING btree ("result_token_hash") WHERE "simulations"."result_token_hash" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "cultural_projects_tenant_slug_uq" ON "cultural_projects" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "cultural_projects_tenant_stage_idx" ON "cultural_projects" USING btree ("tenant_id","stage");--> statement-breakpoint
CREATE INDEX "cultural_projects_tenant_published_idx" ON "cultural_projects" USING btree ("tenant_id","published_on_site") WHERE "cultural_projects"."published_on_site";--> statement-breakpoint
CREATE INDEX "cultural_projects_tenant_deadline_idx" ON "cultural_projects" USING btree ("tenant_id","fundraising_deadline");--> statement-breakpoint
CREATE INDEX "contributions_tenant_project_status_idx" ON "contributions" USING btree ("tenant_id","project_id","status");--> statement-breakpoint
CREATE INDEX "contributions_tenant_lead_idx" ON "contributions" USING btree ("tenant_id","lead_id");--> statement-breakpoint
CREATE INDEX "contributions_tenant_expected_close_idx" ON "contributions" USING btree ("tenant_id","expected_close_at");--> statement-breakpoint
CREATE UNIQUE INDEX "contributions_tenant_project_receipt_uq" ON "contributions" USING btree ("tenant_id","project_id","receipt_number") WHERE "contributions"."receipt_number" is not null;--> statement-breakpoint
CREATE INDEX "activities_tenant_lead_occurred_idx" ON "activities" USING btree ("tenant_id","lead_id","occurred_at" desc);--> statement-breakpoint
CREATE INDEX "activities_tenant_due_idx" ON "activities" USING btree ("tenant_id","due_at") WHERE "activities"."done_at" is null and "activities"."type" = 'tarefa';--> statement-breakpoint
CREATE INDEX "activities_tenant_project_idx" ON "activities" USING btree ("tenant_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "form_attempts_ip_window_uq" ON "form_attempts" USING btree ("ip_hash","window_start");