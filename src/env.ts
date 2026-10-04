import { z } from "zod";

// "Implantado" = execução em um host de verdade. O Vercel define VERCEL_ENV (production | preview |
// development); outro host define PROSPEKTO_ENV com os mesmos valores. NODE_ENV sozinho não basta:
// `next build` local e na CI também roda com NODE_ENV=production, sem banco nem Resend.
const deployEnv = process.env.VERCEL_ENV ?? process.env.PROSPEKTO_ENV;
export const isDeployed = process.env.NODE_ENV === "production" && !!deployEnv;

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Implantado: obrigatório (sem ele o app subiria num PGlite descartável). Local: ausente = PGlite.
  DATABASE_URL: isDeployed ? z.url() : z.url().optional(),
  PGLITE_DIR: z.string().default(".pglite"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
  RESEND_API_KEY: isDeployed ? z.string().min(1) : z.string().optional(),
  EMAIL_FROM: z.string().default("Prospekto <onboarding@resend.dev>"),
  LEAD_NOTIFY_EMAIL: z.email().default("projetos@prospekto.com.br"),
  DEV_ALERT_EMAIL: z.email().optional(),
  FORM_SECRET: z.string().min(32),
  CRON_SECRET: isDeployed ? z.string().min(16) : z.string().min(16).optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  DEFAULT_TENANT_ID: z.string().default("prospekto"),
  SEED_USERS: z.string().optional(), // "Nome <email>;Nome <email>" só para scripts/seed.ts
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", z.treeifyError(parsed.error));
  throw new Error("Variáveis de ambiente inválidas");
}

export const env = parsed.data;
