import { z } from "zod";

// "Implantado" = execução em um host de verdade. O Vercel define VERCEL_ENV (production | preview |
// development); outro host define PROSPEKTO_ENV com os mesmos valores. NODE_ENV sozinho não basta:
// `next build` local e na CI também roda com NODE_ENV=production, sem banco nem Resend.
const deployEnv = process.env.VERCEL_ENV ?? process.env.PROSPEKTO_ENV;
export const isDeployed = process.env.NODE_ENV === "production" && !!deployEnv;

// Só a origem (https://host): com caminho ou barra final, o Better Auth muda a base das rotas
// /api/auth/* e o login passa a responder 404 vazio (visto no primeiro deploy, 06/10/2026).
const originOnly = (name: string) =>
  z.url().refine((u) => u === u.trim() && !u.endsWith("/") && new URL(u).pathname === "/", {
    message: `${name} deve ser só a origem, por exemplo https://prospekto.com.br (sem caminho nem barra no fim)`,
  });

// Remetente no formato que o Resend aceita: "email@dominio" ou "Nome <email@dominio>". Vazio cai no
// padrão. Aspas ou crases coladas junto com o valor, ou o e-mail sem os sinais < >, fazem o Resend
// responder 422 em todo envio, silenciosamente para quem preenche o formulário (visto em 06/10/2026).
const EMAIL = String.raw`[^\s<>@"'\x60]+@[^\s<>@"'\x60]+\.[^\s<>@"'\x60]+`;
const senderAddress = (name: string) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .regex(new RegExp(`^(?:[^<>]*<${EMAIL}>|${EMAIL})$`), {
        message: `${name} deve ser um e-mail ou "Nome <email@dominio>", sem aspas nem crases; por exemplo Prospekto <onboarding@resend.dev>`,
      })
      .default("Prospekto <onboarding@resend.dev>"),
  );

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Implantado: obrigatório (sem ele o app subiria num PGlite descartável). Local: ausente = PGlite.
  DATABASE_URL: isDeployed ? z.url() : z.url().optional(),
  PGLITE_DIR: z.string().default(".pglite"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: originOnly("BETTER_AUTH_URL"),
  NEXT_PUBLIC_APP_URL: originOnly("NEXT_PUBLIC_APP_URL"),
  RESEND_API_KEY: isDeployed ? z.string().min(1) : z.string().optional(),
  EMAIL_FROM: senderAddress("EMAIL_FROM"),
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

// Exposto só para testes do esquema (tests/lib/env.test.ts).
export { schema as envSchema };
