# Scaffold inicial: plano executável

> Executa a decisão de `ADR-001-stack.md`. Quem segue este documento roda os comandos na ordem, cria os arquivos com o conteúdo indicado e termina com `npm run check` verde. Modelo de dados em `modelo-de-dados.md`; convenções de Next.js 16 em `next16-convencoes.md`. Versões conferidas no registro npm em 03/10/2026; comportamento do `create-next-app`, do CLI `auth` e dos caminhos de importação do Drizzle e do Better Auth testados neste ambiente na mesma data.

## 0. Regras para quem executa

- Trabalhar em `/home/user/prospekto`, com a árvore limpa (`git status` sem alterações), para poder desfazer com `git checkout . && git clean -fd`.
- Não commitar nem rodar `git add` durante o scaffold (regra do projeto); quem orquestra decide quando commitar.
- Não editar nada em `docs/`.
- Sem Docker. O banco local é PGlite, criado em `.pglite/` pelo primeiro `npm run db:migrate`.
- Comandos exatos; se um comando falhar, parar e reportar a saída em vez de improvisar outra ferramenta.

## 1. Pré-requisitos

| Item | Exigido | Neste ambiente (03/10/2026) |
|---|---|---|
| Node.js | 22.12 ou superior (Vitest 5 exige 22.12+, https://vitest.dev/guide/; `--env-file-if-exists` exige 22.9+, https://nodejs.org/api/cli.html) | 22.22.0 |
| npm | 10 ou superior | 10.9.4 |
| Acesso à rede | registro npm | via proxy do ambiente |

Sem conta em serviço nenhum para o scaffold: Vercel, Neon e Resend só entram no deploy (seção 10).

## 2. Comandos, na ordem

```bash
cd /home/user/prospekto

# 2.1 Next.js 16.3.8 na raiz. O diretório tem docs/, .gitignore e .git: o create-next-app
#     tolera os três (confirmado) mas SUBSTITUI o .gitignore; o passo 2.2 corrige.
npx create-next-app@16.3.8 . --ts --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm --disable-git --yes

# 2.2 Restaurar regras do .gitignore original e acrescentar as do projeto
cat >> .gitignore <<'GI'

# prospekto
!.env.example
.pglite/
.scratch/
*.db
*.db-journal
GI

# 2.3 Dependências de runtime (versões fixas; o template já instalou next, react e react-dom)
npm i --save-exact drizzle-orm@0.45.3 pg@8.23.1 @electric-sql/pglite@0.5.8 \
  better-auth@1.7.7 zod@4.6.5 resend@6.32.0 @vercel/analytics@2.0.1 server-only@0.0.1

# 2.4 Dependências de desenvolvimento
npm i -D --save-exact drizzle-kit@0.31.11 @types/pg@8.23.1 tsx@4.23.15 dotenv@18.0.5 \
  vitest@5.0.3 prettier@3.9.9 auth@1.7.7

# 2.5 Fixar TypeScript 5.9 e @types/node 22 (o template deixa ^5 e ^20; a tag latest do
#     typescript já é 7.0.2 e o Next 16.3.8 não a declara suportada [verificar])
npm i -D --save-exact typescript@5.9.3 @types/node@22.20.5

# 2.6 shadcn/ui: inicialização com padrões e o conjunto fechado de componentes
npx shadcn@4.21.1 init -d
npx shadcn@4.21.1 add button input label textarea select checkbox badge card table \
  dialog tabs separator sonner

# 2.7 Criar os arquivos da seção 4 (estrutura) e seção 5 (conteúdo). Depois:

# 2.8 Esquema de autenticação gerado pelo Better Auth (usePlural: users, sessions, accounts, verifications)
#     Pré-condição confirmada: src/lib/auth.ts e src/lib/db/index.ts NÃO importam "server-only".
npx auth@1.7.7 generate --config src/lib/auth.ts --output src/lib/db/schema/auth.ts -y

# 2.9 Primeira migração, banco local e seed
npm run db:generate        # drizzle-kit generate -> drizzle/0000_*.sql (revisar o SQL)
npm run db:migrate         # aplica no PGlite local (.pglite/)
npm run db:seed            # tenant prospekto e os usuários de SEED_USERS

# 2.10 Verificação
npm run check              # lint + typecheck + format:check + test + build
npm run dev                # http://localhost:3000
```

Se o `create-next-app` recusar a raiz por algum arquivo inesperado, criar em `/tmp/web` e mover o conteúdo (`mv /tmp/web/* /tmp/web/.[!.]* .`), sem sobrescrever `docs/` nem `.git/`.

## 3. `package.json`

Substituir o bloco `scripts` gerado e acrescentar `engines`, `name`, `type` e `prettier`:

```json
{
  "name": "prospekto",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.12" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "npm run lint && npm run typecheck && npm run format:check && npm run test && npm run build",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "node --env-file-if-exists=.env.local --import tsx scripts/migrate.ts",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "node --env-file-if-exists=.env.local --import tsx scripts/seed.ts",
    "auth:generate": "auth generate --config src/lib/auth.ts --output src/lib/db/schema/auth.ts -y",
    "smoke": "node --import tsx scripts/smoke.ts",
    "vercel-build": "npm run db:migrate && next build"
  },
  "prettier": {
    "semi": true,
    "singleQuote": false,
    "trailingComma": "all",
    "printWidth": 100
  }
}
```

Notas:

- `"type": "module"` é obrigatório: `src/lib/db/index.ts` (seção 5.4) e `scripts/migrate.ts` (seção 5.5) usam `await` de nível superior. Testado neste ambiente em 03/10/2026 com Node 22.22.0 e tsx 4.23.15: sem `"type": "module"`, `node --import tsx scripts/migrate.ts` falha com `Top-level await is currently not supported with the "cjs" output format` (`ERR_REQUIRE_ASYNC_MODULE`); com o campo, o mesmo arquivo executa. Consequência: nenhum arquivo do projeto pode usar `__dirname`, `__filename` ou `require` (ver `vitest.config.ts` na seção 5.10, que usa `import.meta.dirname`). Se o `create-next-app@16.3.8` já gerar o campo, manter.
- `check` roda os mesmos passos da CI (seção 5.13), na mesma ordem, menos `db:migrate`, que no fluxo local já foi executado no passo 2.9 e deixa o `.pglite/` pronto para `test` e `build`. Se `format:check` falhar, `npm run format` corrige.
- `--save-exact` nos passos 2.3 a 2.5 deixa as versões sem `^`; o `package-lock.json` é commitado e é o que vale no Vercel e na CI.
- `--env-file-if-exists` lê `.env.local` quando existe e não falha quando não existe; o mesmo comando serve local e no build do Vercel (variáveis já no ambiente).
- `vercel-build` aplica as migrações antes do `next build` em produção e em cada preview (cada preview tem seu branch do Neon). Regra expand/contract: adicionar em um deploy, remover em outro.
- `db:push` é só para experimentar esquema em desenvolvimento; nunca contra produção.

## 4. Estrutura de pastas

```
prospekto/
  docs/                              documentação (não tocar)
  drizzle/                           migrações SQL geradas + meta/ (commitado)
  public/                            favicon, robots estático se houver, imagens públicas
  scripts/                           migrate.ts, seed.ts, smoke.ts (rodam com tsx, fora do bundle)
  src/
    app/
      layout.tsx                     <html lang="pt-BR">, fonte, globals.css, <Analytics />
      error.tsx, global-error.tsx, not-found.tsx
      (site)/
        layout.tsx                   cabeçalho, rodapé, botão flutuante de WhatsApp
        page.tsx                     home
        empresas/ contadores/ pessoa-fisica/ municipios/ proponentes/ mentoria/
        simulador/ simulador/resultado/[token]/
        guia/ projetos/ projetos/[slug]/ sobre/ contato/ diagnostico/
        conteudo/ conteudo/[slug]/     artigos (estrutura-e-copy.md, seção 3); tarefa seguinte
        empresas/ultima-chance/        campanha "última chance" PJ (campanhas.md, 3.1); tarefa seguinte
        contadores/planejamento/       campanha de planejamento, webinar (campanhas.md, 4.1); tarefa seguinte
        privacidade/ obrigado/[tipo]/
        entrar/ redefinir-senha/
      (app)/
        layout.tsx                   exige sessão (requireSession) e monta a navegação do CRM
        app/page.tsx                 "Hoje"
        app/leads/ app/leads/[id]/ app/organizacoes/ app/organizacoes/[id]/
        app/projetos/ app/projetos/[id]/ app/aportes/ app/exportar/
      api/
        auth/[...all]/route.ts       Better Auth
        downloads/guia/route.ts      PDF com link assinado
        cron/daily/route.ts          e-mail diário, SLAs, limpeza; CRON_SECRET
        webhooks/resend/route.ts     bounce e descadastro
        health/route.ts              select 1
    actions/                         Server Actions: leads.ts, simulator.ts, crm.ts, projects.ts, contributions.ts, auth.ts
    assets/
      contabilizando-cultura-guia.pdf   cópia de docs/fontes/materiais/ (só após a edição revisada)
    components/
      ui/                            gerado pelo shadcn (não editar à mão além do tema)
      site/                          blocos de página, formulários públicos, whatsapp-button.tsx
      crm/                           lead-table.tsx, lead-detail.tsx, stage-select.tsx, activity-form.tsx
    config/
      site.ts                        nome, e-mail, WhatsApp, textos wa.me por página, POLICY_VERSION
    env.ts                           validação das variáveis (Zod)
    lib/
      db/
        index.ts                     conexão (PGlite ou Postgres)
        schema/
          index.ts                   reexporta tudo
          auth.ts                    GERADO por auth generate
          enums.ts                   pgEnum a partir de domain/enums
          tenants.ts organizations.ts contacts.ts leads.ts consents.ts
          simulations.ts projects.ts contributions.ts activities.ts form-attempts.ts
      repos/                         leads.ts, organizations.ts, contacts.ts, projects.ts,
                                     contributions.ts, activities.ts, consents.ts, simulations.ts,
                                     tenants.ts, form-attempts.ts (todos com ctx; "server-only")
      domain/                        enums.ts, pipelines.ts, scoring.ts, commission.ts, sla.ts
                                     (puro: sem Next, sem banco)
      simulator/                     params.ts, simulate.ts, format.ts, simulate.test.ts
                                     (puro; lê docs/dominio/parametros-simulador.json)
      validation/                    um schema Zod por formulário e por segmento
      email/                         send.ts, templates/*.ts
      auth.ts auth-client.ts session.ts
      signing.ts log.ts errors.ts csv.ts
    proxy.ts                         apaga x-tenant-* em toda rota; redireciona /app/* sem cookie
  tests/
    setup.ts                         PGlite em memória com migrações aplicadas
    empty.ts                         stub de "server-only" para o Vitest
    isolation.test.ts                dois tenants
    repos/*.test.ts  actions/*.test.ts
  .github/workflows/ci.yml, backup.yml
  drizzle.config.ts vitest.config.ts next.config.ts eslint.config.mjs tsconfig.json
  postcss.config.mjs vercel.json .env.example .prettierignore
  AGENTS.md CLAUDE.md                gerados pelo create-next-app; commitar
```

## 5. Conteúdo dos arquivos de base

Os blocos abaixo são o mínimo para `npm run check` passar; páginas e repositórios reais vêm nas tarefas seguintes. Onde um arquivo gerado já existe (`tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `globals.css`), só o que muda está indicado.

### 5.1 `next.config.ts`

```ts
import type { NextConfig } from "next";
import "./src/env"; // falha o build se faltar variável

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
```

`pg` já está na lista padrão de pacotes externos do Next.js (https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages); o PGlite precisa ser declarado para o WASM não entrar no bundle.

### 5.2 `src/env.ts`

```ts
import { z } from "zod";

const isProd = process.env.NODE_ENV === "production" && !!process.env.VERCEL_ENV;

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().optional(), // ausente = PGlite local
  PGLITE_DIR: z.string().default(".pglite"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  RESEND_API_KEY: isProd ? z.string().min(1) : z.string().optional(),
  EMAIL_FROM: z.string().default("Prospekto <onboarding@resend.dev>"),
  LEAD_NOTIFY_EMAIL: z.string().email().default("projetos@prospekto.com.br"),
  DEV_ALERT_EMAIL: z.string().email().optional(),
  FORM_SECRET: z.string().min(32),
  CRON_SECRET: isProd ? z.string().min(16) : z.string().optional(),
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
```

`z.treeifyError` existe no Zod 4 (substitui `.flatten()` do Zod 3) [verificar] (nome exato na 4.6.5 ao compilar; alternativa: `parsed.error.issues`).

### 5.3 `drizzle.config.ts`

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  casing: "snake_case",
  ...(url
    ? { dbCredentials: { url } }
    : { driver: "pglite", dbCredentials: { url: process.env.PGLITE_DIR ?? "./.pglite" } }),
});
```

`driver: "pglite"` com `dbCredentials.url` apontando para a pasta é o formato documentado (https://orm.drizzle.team/docs/drizzle-config-file). `casing: "snake_case"` faz `stageEnteredAt` virar `stage_entered_at` sem repetir o nome em cada coluna; o schema gerado pelo Better Auth já traz os nomes explícitos e não conflita.

### 5.4 `src/lib/db/index.ts`

Sem `server-only` (o CLI `auth generate` recusa configurações que o importem; confirmado). A proteção fica nos repositórios e na regra de lint (seção 6).

```ts
import * as schema from "./schema";

export type Db = Awaited<ReturnType<typeof createDb>>;

async function createDb() {
  if (process.env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
    return drizzle({ client: pool, schema, casing: "snake_case" });
  }
  const { drizzle } = await import("drizzle-orm/pglite");
  const { PGlite } = await import("@electric-sql/pglite");
  const client = new PGlite(process.env.PGLITE_DIR ?? ".pglite"); // "memory://" nos testes
  return drizzle({ client, schema, casing: "snake_case" });
}

const g = globalThis as unknown as { __prospektoDb?: Promise<Db> };
export const dbPromise = (g.__prospektoDb ??= createDb());
export const db = await dbPromise;
```

Em produção o `import` do PGlite nunca executa. O cache em `globalThis` evita um pool por recarga do `next dev`. O `await` de nível superior exige `"type": "module"` no `package.json` (seção 3, nota testada); dentro do Next o arquivo é empacotado como ESM de qualquer forma, mas `scripts/` e `tests/` o importam fora do bundle.

### 5.5 `scripts/migrate.ts`

```ts
import path from "node:path";
import { db } from "../src/lib/db";

const migrationsFolder = path.join(process.cwd(), "drizzle");

if (process.env.DATABASE_URL) {
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  await migrate(db as never, { migrationsFolder });
} else {
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  await migrate(db as never, { migrationsFolder });
}
console.log("migrações aplicadas");
process.exit(0);
```

Os dois caminhos de importação existem na 0.45.3 (`node_modules/drizzle-orm/pglite/migrator.js` e `node-postgres/migrator`). O `as never` evita a diferença de tipos entre os dois drivers; refinar quando houver tempo. O `await` de nível superior só funciona com `"type": "module"` no `package.json` (seção 3); sem o campo, o tsx compila o `.ts` como CommonJS e aborta na transformação (testado neste ambiente, 03/10/2026).

### 5.6 `scripts/seed.ts`

Insere o tenant `prospekto` (`id = "prospekto"`, `name = "Prospekto Consultoria & Projetos"`) com `onConflictDoNothing()` e, para cada entrada de `SEED_USERS` (`Nome <email>;Nome <email>`), cria o usuário pela API do Better Auth (`auth.api.signUpEmail` com `disableSignUp` contornado só aqui via `auth.api` interno [verificar] (a forma recomendada de criar usuário com cadastro fechado na 1.7.7; alternativa: inserir em `users` e `accounts` com hash gerado por `better-auth/crypto`)) com senha temporária impressa no terminal e `tenantId = "prospekto"`, `role = "owner"` para o primeiro e `operator` para os demais. Idempotente: pula e-mails já existentes. Sem valores reais de e-mail neste repositório: `SEED_USERS` vem de `.env.local`.

### 5.7 `src/lib/auth.ts` e `src/lib/auth-client.ts`

```ts
// src/lib/auth.ts (sem "server-only")
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", usePlural: true, schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    // sendResetPassword: ({ user, url }) => sendEmail({...}) entra junto com src/lib/email
  },
  user: {
    additionalFields: {
      tenantId: { type: "string", required: true, input: false },
      role: { type: "string", required: true, defaultValue: "operator", input: false },
    },
  },
  plugins: [nextCookies()],
});
```

```ts
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
```

```ts
// src/lib/session.ts
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type Ctx = { tenantId: string; userId: string; role: "owner" | "operator" };

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession(): Promise<Ctx> {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const u = session.user as typeof session.user & { tenantId: string; role?: string };
  return { tenantId: u.tenantId, userId: u.id, role: (u.role as Ctx["role"]) ?? "operator" };
}
```

```ts
// src/app/api/auth/[...all]/route.ts
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
export const { GET, POST } = toNextJsHandler(auth);
```

Toda Server Action do CRM começa com `const ctx = await requireSession();`. Server Actions são alcançáveis por POST direto; o `proxy.ts` é só redirecionamento otimista.

### 5.8 `src/proxy.ts`

```ts
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // 1. Higiene de cabeçalhos em TODAS as rotas (ADR-001, "Multi-tenant agora"):
  //    x-tenant-* nunca vêm do cliente; na Fase 2 o proxy os define a partir do Host.
  const headers = new Headers(request.headers);
  for (const h of ["x-tenant-id", "x-tenant-slug"]) headers.delete(h);

  // 2. Redirecionamento otimista só no CRM; a autorização real é requireSession().
  if (request.nextUrl.pathname.startsWith("/app") && !getSessionCookie(request)) {
    const url = new URL("/entrar", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Tudo, exceto os internos do Next (_next) e arquivos estáticos com extensão (favicon.ico, imagens).
  // Inclui /api/* de propósito: as rotas de API também não podem confiar em x-tenant-*.
  matcher: ["/((?!_next|.*\\..*).*)"],
};
```

O matcher amplo é o que cumpre a promessa do ADR-001 de que os cabeçalhos `x-tenant-*` nunca chegam do cliente em nenhuma rota; a checagem de sessão continua restrita a `/app`. Custo: o proxy roda em toda requisição de página e de API (é uma função pequena, sem acesso ao banco). O padrão `/((?!_next|.*\\..*).*)` segue o exemplo da documentação de matchers do Next.js (https://nextjs.org/docs/app/api-reference/file-conventions/proxy) [verificar] (a página da 16.3 ainda documenta `matcher` com esse formato e a convenção `proxy.ts`, conforme `next16-convencoes.md`).

### 5.9 `src/config/site.ts`

```ts
export const site = {
  tenantId: "prospekto",
  name: "Prospekto Consultoria & Projetos",
  owner: "Daniela Sandrin Copat",
  email: "projetos@prospekto.com.br",
  whatsappNumber: "5554984032180",
  city: "Serra Gaúcha, RS",
  policyVersion: "2026-10-03",
  whatsappMessages: {
    home: "Olá, Daniela. Vi o site da Prospekto e quero entender como minha empresa pode destinar parte do imposto para cultura.",
    // demais textos de docs/site/estrutura-e-copy.md, seção 10.1
  },
} as const;

export const waLink = (message: string) =>
  `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
```

É o único módulo com dados do tenant; na Fase 2 vira `tenants.settings`.

### 5.10 `vitest.config.ts`, `tests/setup.ts`, `tests/empty.ts`

```ts
// vitest.config.ts
import path from "node:path";
import { defineConfig } from "vitest/config";

// "type": "module" no package.json: não existe __dirname; import.meta.dirname existe desde o Node 20.11
// (https://nodejs.org/api/esm.html#importmetadirname) e o projeto exige 22.12+.
const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      "server-only": path.resolve(root, "tests/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    env: { PGLITE_DIR: "memory://", NODE_ENV: "test" },
  },
});
```

```ts
// tests/empty.ts
export {};
```

```ts
// tests/setup.ts
import path from "node:path";
import { beforeAll } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "@/lib/db";

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.join(process.cwd(), "drizzle") });
});
```

Cada arquivo de teste recebe um PGlite em memória novo porque o Vitest isola módulos por arquivo. O stub de `server-only` é necessário porque o pacote lança erro quando importado fora do React Server.

### 5.11 `.env.example`

```
# Banco: ausente = PGlite local em PGLITE_DIR
DATABASE_URL=
PGLITE_DIR=.pglite

# Auth (openssl rand -base64 32)
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# E-mail (Resend); local pode ficar vazio e o envio é só registrado em log
RESEND_API_KEY=
EMAIL_FROM=Prospekto <onboarding@resend.dev>
LEAD_NOTIFY_EMAIL=projetos@prospekto.com.br
DEV_ALERT_EMAIL=
RESEND_WEBHOOK_SECRET=

# Assinaturas (links do guia, carimbo de tempo dos formulários, hash de IP)
FORM_SECRET=

# Cron do Vercel
CRON_SECRET=

# Anti-spam opcional (vazio = desligado)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Tenant padrão da Fase 1
DEFAULT_TENANT_ID=prospekto

# Só para npm run db:seed: "Nome <email>;Nome <email>"
SEED_USERS=
```

`.env.local` (ignorado pelo git) copia este arquivo com os valores. Nunca colocar e-mail ou telefone de terceiros em arquivo commitado.

### 5.12 `vercel.json`

```json
{
  "buildCommand": "npm run vercel-build",
  "crons": [{ "path": "/api/cron/daily", "schedule": "0 10 * * *" }]
}
```

10h UTC é 7h em Brasília. No Hobby o cron roda uma vez por dia com precisão de hora; no Pro, por minuto (https://vercel.com/docs/cron-jobs/usage-and-pricing). A rota exige `Authorization: Bearer ${CRON_SECRET}`.

### 5.13 `.github/workflows/ci.yml`

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      # valores fictícios só para o build e os testes; nenhum segredo real
      BETTER_AUTH_SECRET: ci-only-secret-with-at-least-32-characters-0000
      BETTER_AUTH_URL: http://localhost:3000
      NEXT_PUBLIC_APP_URL: http://localhost:3000
      FORM_SECRET: ci-only-form-secret-with-at-least-32-chars-0000
      PGLITE_DIR: .pglite
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run format:check
      - run: npm run db:migrate
      - run: npm test
      - run: npm run build
```

Versões das actions: `actions/checkout@v7` e `actions/setup-node@v7` [verificar] (as tags major v7 não puderam ser confirmadas neste ambiente, em que o acesso a github.com fora do repositório do projeto é bloqueado; antes do primeiro push, abrir https://github.com/actions/checkout/releases/latest e https://github.com/actions/setup-node/releases/latest e, se a última major for outra, ajustar as duas tags; o workflow falha no primeiro passo se a major não existir). O `db:migrate` antes do `build` deixa o PGlite com esquema para páginas que consultam o banco no build. Deploy não passa por aqui: é a integração Git do Vercel.

### 5.14 `.github/workflows/backup.yml`

```yaml
name: backup
on:
  schedule:
    - cron: "0 6 * * 0"   # domingo 6h UTC, 3h em Brasília
  workflow_dispatch:
jobs:
  dump:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - run: |
          sudo apt-get update -qq && sudo apt-get install -y -qq postgresql-client
          pg_dump -Fc -d "$DATABASE_URL_UNPOOLED" -f prospekto.dump
        env:
          DATABASE_URL_UNPOOLED: ${{ secrets.DATABASE_URL_UNPOOLED }}
      - uses: actions/upload-artifact@v7
        with:
          name: db-dump-${{ github.run_id }}
          path: prospekto.dump
          retention-days: 90
```

Ativar só depois do deploy (o segredo `DATABASE_URL_UNPOOLED` vem do Neon). A versão major do `pg_dump` deve coincidir com a do Postgres do projeto Neon (18, criado em 05/10/2026): o `ubuntu-latest` instala o cliente 16 por padrão e o `pg_dump` aborta com "server version mismatch", por isso o workflow lê `server_version_num` com o `psql` e instala `postgresql-client-<major>` do repositório PGDG já presente na imagem. `actions/upload-artifact@v7` [verificar] (mesma situação das actions da seção 5.13: confirmar a major em https://github.com/actions/upload-artifact/releases/latest antes de ativar o workflow).

Atualização de 04/10/2026 (revisão de segurança): o workflow commitado cifra o dump com `gpg --symmetric` (AES-256) usando o secret `BACKUP_PASSPHRASE`, destrói o dump em claro e retém o artefato por 14 dias; sem os dois secrets (`DATABASE_URL_UNPOOLED`, `BACKUP_PASSPHRASE`) o job é pulado. Custódia da senha: guardar no gerenciador de senhas da Prospekto com acesso de Rafael e do sócio; para restaurar, `gpg --decrypt prospekto.dump.gpg > prospekto.dump` e `pg_restore -d <url> prospekto.dump`.

### 5.15 `eslint.config.mjs`

Manter o gerado e acrescentar a regra que restringe quem importa o banco:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "drizzle/**", ".pglite/**"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/repos/**", "src/lib/auth.ts", "src/lib/db/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "@/lib/db", message: "Acesse o banco só por src/lib/repos/ (regra R-15)." }],
          patterns: ["@/lib/db/*"],
        },
      ],
    },
  },
]);
```

`.prettierignore`: `.next`, `node_modules`, `drizzle`, `.pglite`, `docs`, `package-lock.json`, `src/components/ui`.

### 5.16 `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Prospekto Consultoria & Projetos", template: "%s | Prospekto" },
  description: "Projetos culturais, leis de incentivo e captação de patrocínio na Serra Gaúcha.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

`LayoutProps<'/'>` é o tipo global gerado por `next typegen` (roda em `next dev` e `next build`; `next16-convencoes.md`). O caminho `@vercel/analytics/next` é o indicado para App Router [verificar] (no README da 2.0.1).

### 5.17 Esquema Drizzle: exemplo de uma tabela com as convenções

```ts
// src/lib/db/schema/leads.ts
import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { PIPELINES, STAGES } from "@/lib/domain/pipelines";
import { leadSegment, leadSource, leadInterest, leadTemperature, lostReason, emailStatus } from "./enums";
import { tenants } from "./tenants";
import { users } from "./auth";

const allStages = [...new Set(Object.values(STAGES).flat())];

export const leads = pgTable(
  "leads",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: text().notNull().references(() => tenants.id),
    segment: leadSegment().notNull(),
    pipeline: text().notNull(),
    stage: text().notNull(),
    stageEnteredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    interest: leadInterest().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    phone: text(),
    city: text(),
    uf: text(),
    message: text(),
    source: leadSource().notNull(),
    sourceDetail: text(),
    utmSource: text(),
    utmMedium: text(),
    utmCampaign: text(),
    referrer: text(),
    landingPath: text(),
    score: integer().notNull().default(0),
    temperature: leadTemperature().notNull().default("frio"),
    ownerUserId: text().references(() => users.id),
    nextActionAt: timestamp({ withTimezone: true }),
    lastContactAt: timestamp({ withTimezone: true }),
    lostReason: lostReason(),
    lostReasonDetail: text(),
    tags: text().array().notNull().default(sql`'{}'::text[]`),
    attributes: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    emailStatus: emailStatus().notNull().default("ok"),
    guideVersion: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    // orgId, contactId, referredByOrgId, projectId, projectInterestId: ver modelo-de-dados.md, 3.5
  },
  (t) => [
    uniqueIndex("leads_tenant_email_segment_uq").on(t.tenantId, t.email, t.segment),
    index("leads_tenant_pipeline_stage_idx").on(t.tenantId, t.pipeline, t.stage),
    index("leads_tenant_next_action_idx").on(t.tenantId, t.nextActionAt),
    index("leads_tenant_owner_idx").on(t.tenantId, t.ownerUserId),
    check("leads_pipeline_check", sql`${t.pipeline} in (${sql.join(PIPELINES.map((p) => sql`${p}`), sql`, `)})`),
    check("leads_stage_check", sql`${t.stage} in (${sql.join(allStages.map((s) => sql`${s}`), sql`, `)})`),
    check("leads_lost_reason_check", sql`${t.stage} <> 'perdido' or ${t.lostReason} is not null`),
  ],
);
```

Com `casing: "snake_case"` no `drizzle.config.ts` e no `drizzle()`, `stageEnteredAt` vira `stage_entered_at` sem nome explícito. Dinheiro: `numeric({ precision: 14, scale: 2, mode: "number" })` (opção `mode` presente na 0.45.3, conferida em `pg-core/columns/numeric.d.ts`).

## 6. Convenções

| Tema | Regra |
|---|---|
| Idioma | UI, textos, mensagens de erro, e-mails, nomes de rota (`/empresas`, `/app/leads`), commits e documentação em português do Brasil. Identificadores de código, nomes de tabela e coluna, chaves de enum, nomes de evento de analytics e variáveis de ambiente em inglês. Exceção: valores de enum que o negócio lê (`lucro_real`, `novo`, `patrocinio`) ficam em português sem acento, como em `personas-e-funis.md` |
| Nomenclatura | Arquivos `kebab-case.ts`; componentes React `PascalCase` exportados de arquivo `kebab-case.tsx`; tabelas no plural `snake_case`; colunas `snake_case`; propriedades Drizzle `camelCase`; Server Actions como verbos (`createLead`, `moveLeadStage`); repositórios como substantivo plural (`leads.ts`) com funções `list*`, `get*`, `create*`, `update*` |
| Onde ficam as regras do simulador | `src/lib/simulator/` é puro: `params.ts` importa `../../../docs/dominio/parametros-simulador.json` por caminho relativo (sem cópia) e valida com Zod no build; `simulate.ts` é `simulate(input, params)` sem rede nem banco; testes em `simulate.test.ts`, um `it` por ID de `docs/site/simulador-spec.md`, seção 9. Textos legais do simulador em `src/lib/simulator/texts.ts` com `revisado_em` |
| Onde ficam as regras de domínio | `src/lib/domain/`: `enums.ts` (fonte dos `pgEnum`), `pipelines.ts` (estágios, ordem, SLA, campos obrigatórios, terminais), `scoring.ts`, `commission.ts` (`assertCommissionWithinLimits`), `sla.ts` (dias úteis, regra de novembro e dezembro). Nada aqui importa Next nem banco |
| Site e CRM no mesmo app | Route groups: `src/app/(site)` público, `src/app/(app)` autenticado em `/app/*`. Cada grupo tem `layout.tsx` próprio; a raiz só define `<html lang="pt-BR">`, fonte, CSS global e `<Analytics />`. O site lê o banco só por repositórios com `ctx = { tenantId: env.DEFAULT_TENANT_ID }`; o CRM com `ctx` da sessão. Mesmo banco, sem API entre os dois (`estrutura-e-copy.md`, seção 10.4) |
| Autenticação na Fase 1 | Better Auth, e-mail e senha, cadastro fechado; usuários criados pelo seed; redefinição de senha por e-mail (Resend); sessão por cookie; `proxy.ts` redireciona `/app/*` sem cookie; autorização real é `requireSession()` em toda página e Server Action do CRM. Papéis `owner` e `operator` sem diferença de permissão na Fase 1 (campo existe para a Fase 2) |
| Dados | Toda consulta em `src/lib/repos/` com `ctx` como primeiro argumento; `db` só importado ali, em `src/lib/auth.ts`, em `scripts/` e em `tests/` (lint); DTOs para o que vai ao cliente; nunca expor `attributes` inteiro de um lead em componente cliente |
| Formulários | Server Actions com Zod no servidor e `useActionState` no cliente; schemas em `src/lib/validation/`; mensagens em português concretas; erros inline com `aria-describedby` |
| Mutações e cache | Páginas públicas que leem o banco usam `cacheLife`/`cacheTag` quando `cacheComponents` for ligado (não no scaffold); Server Actions chamam `updateTag` ou `refresh()` (`next16-convencoes.md`) |
| Logs | `src/lib/log.ts` escreve JSON (`level`, `msg`, `tenantId`, `requestId`, extras); sem dado pessoal (regra R-16) |
| Testes | Vitest; PGlite em memória; sem mocks de banco; Server Actions testadas como funções; `tests/isolation.test.ts` obrigatório antes de qualquer tela do CRM |
| Dependências | Versões fixas; `npm outdated` mensal; major só com nota de versão lida; `npm run auth:generate` e revisão do diff a cada upgrade do Better Auth |
| Arquivos de agente | `AGENTS.md` e `CLAUDE.md` gerados pelo `create-next-app` são commitados; `next dev` recria o bloco gerenciado |

## 7. Critério de pronto do scaffold

1. `npm run check` verde (lint, typecheck, format:check, test, build) no ambiente local sem `DATABASE_URL`, depois de `npm run db:migrate`; é a mesma sequência da CI (seção 5.13).
2. `npm run dev` sobe em `http://localhost:3000` com a home mínima do `(site)` e `/app` redirecionando para `/entrar`; uma requisição a `/` ou a `/api/health` com cabeçalho `x-tenant-id` chega ao servidor sem ele (proxy da seção 5.8).
3. `drizzle/0000_*.sql` commitável, revisado, contendo as tabelas de `modelo-de-dados.md` (as de autenticação geradas pelo Better Auth e as de negócio) com os `CHECK` de pipeline e estágio.
4. `tests/isolation.test.ts` passa: dois tenants, um lead em cada, `listLeads(ctxA)` devolve um.
5. `src/lib/simulator/simulate.test.ts` existe com pelo menos os casos T-SCH-01 a T-SCH-06 de `simulador-spec.md`, seção 9.8 (os de cálculo entram na tarefa do simulador).
6. `.env.example` completo; `.env.local` ausente do git.

## 8. Ordem das tarefas seguintes (fora deste scaffold)

1. Simulador puro e página `/simulador` com gate (`docs/site/simulador-spec.md`).
2. Formulários do site e `createLead` com consentimento, e-mail de aviso e guia por link assinado (`docs/site/estrutura-e-copy.md`); inclui `/conteudo` e `/conteudo/[slug]`.
3. Páginas de campanha `/empresas/ultima-chance` e `/contadores/planejamento` (`docs/playbooks/campanhas.md`, seções 3.1 e 4.1), quando a campanha correspondente for agendada; são variações de `/empresas` e `/contadores`, fora do menu.
4. CRM: tela "Hoje", lista e detalhe de leads, `moveLeadStage` com campos obrigatórios, atividades, e-mail diário, exportação CSV.
5. Organizações, projetos, aportes com recibo e comissão, carteira pública `/projetos`.
6. Deploy (seção 10), domínio, Resend em produção, upgrade para Pro, backup ligado.

## 9. Variáveis de ambiente por ambiente

| Variável | Local | CI | Vercel | Origem |
|---|---|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | opcional (branch `dev` do Neon) | não | integração Neon | Vercel Marketplace |
| `PGLITE_DIR` | `.pglite` | `.pglite` (ou `memory://` nos testes) | não | |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` | sim | fictícias | sim | `openssl rand -base64 32` |
| `RESEND_API_KEY`, `EMAIL_FROM`, `RESEND_WEBHOOK_SECRET` | opcional | não | sim | painel do Resend |
| `LEAD_NOTIFY_EMAIL` | `projetos@prospekto.com.br` | | sim | guia da Prospekto |
| `DEV_ALERT_EMAIL` | opcional | não | sim | e-mail do desenvolvedor |
| `FORM_SECRET`, `CRON_SECRET` | sim / opcional | fictícia / não | sim | `openssl rand -base64 32` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | não | não | quando ligar | Cloudflare |
| `DEFAULT_TENANT_ID` | `prospekto` | `prospekto` | `prospekto` | |
| `SEED_USERS` | só para o seed | não | só no terminal, uma vez | |

## 10. Deploy (depois do scaffold, quando houver conta)

1. Importar `aleciomunizrafael/prospekto` no Vercel (Hobby); framework detectado; Node 22.x; `vercel.json` já define o build.
2. Storage: Neon pelo Marketplace, plano Free, região São Paulo, Postgres 18; a integração cria `DATABASE_URL` (pooled) e `DATABASE_URL_UNPOOLED` e um branch por preview (https://neon.com/docs/guides/vercel-managed-integration).
3. Definir as demais variáveis da seção 9 no projeto.
4. `npm run db:seed` uma vez com `DATABASE_URL` de produção no terminal local (`SEED_USERS` só ali).
5. Resend: verificar domínio de envio (SPF, DKIM); depende de quem administra o DNS de `prospekto.com.br` (pergunta 4 de `docs/visao.md`); até lá, `onboarding@resend.dev` só para testes.
6. Domínio `prospekto.com.br` e `www` apontando para o Vercel.
7. No dia em que o primeiro formulário público for publicado: upgrade para Pro e ativar `backup.yml` com o segredo `DATABASE_URL_UNPOOLED` no GitHub.

## 11. Fontes

| Assunto | Fonte | Consultado em |
|---|---|---|
| Versões (`npm view <pacote> dist-tags`) | https://registry.npmjs.org/ | 03/10/2026 |
| Arquivos gerados pelo `create-next-app@16.3.8`; comportamento em diretório com `docs/` e `.gitignore` | Execução em diretório de rascunho neste ambiente | 03/10/2026 |
| `create-next-app`: flags | https://nextjs.org/docs/app/api-reference/cli/create-next-app | 03/10/2026 |
| `serverExternalPackages` | https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages | 03/10/2026 (via proposta A) |
| Drizzle: config (`driver: "pglite"`), conexão PGlite, migrações, `migrator` para pglite e node-postgres | https://orm.drizzle.team/docs/drizzle-config-file ; https://orm.drizzle.team/docs/connect-pglite ; https://orm.drizzle.team/docs/migrations ; `node_modules/drizzle-orm/{pglite,node-postgres}/migrator.js` e `pg-core/columns/numeric.d.ts` da 0.45.3 | 03/10/2026 |
| Better Auth: CLI (`npx auth@latest generate`, `--config`, `--output`, `-y`), Next.js (`toNextJsHandler`, `nextCookies`, `getSessionCookie`), adaptador Drizzle (`usePlural`), recusa de `server-only` | https://www.better-auth.com/docs/concepts/cli ; https://www.better-auth.com/docs/integrations/next ; https://www.better-auth.com/docs/adapters/drizzle ; execução de `npx auth@1.7.7 generate` neste ambiente | 03/10/2026 |
| Vitest: Node 22.12+ | https://vitest.dev/guide/ | 03/10/2026 |
| Node: `--env-file-if-exists` | https://nodejs.org/api/cli.html | 03/10/2026 (via proposta C) |
| Vercel: `buildCommand`, cron, Hobby | https://vercel.com/docs/builds/configure-a-build ; https://vercel.com/docs/cron-jobs/usage-and-pricing ; https://vercel.com/docs/plans/hobby | 03/10/2026 (via propostas) |
| Neon: integração Vercel, regiões, `pg_dump` | https://neon.com/docs/guides/vercel-managed-integration ; https://neon.com/docs/introduction/regions ; https://neon.com/docs/manage/backup-pg-dump | 03/10/2026 (via propostas) |
| GitHub Actions: tags major de `checkout`, `setup-node`, `upload-artifact` | https://github.com/actions/checkout/releases/latest ; https://github.com/actions/setup-node/releases/latest ; https://github.com/actions/upload-artifact/releases/latest | não confirmadas (acesso a github.com bloqueado neste ambiente em 03/10/2026) [verificar] |
| tsx 4.23.15 e `await` de nível superior: falha sem `"type": "module"`, funciona com o campo | Execução de `node --import tsx scripts/migrate.ts` em diretório de rascunho neste ambiente, Node 22.22.0 | 03/10/2026 |
| Node: `import.meta.dirname` (20.11+) | https://nodejs.org/api/esm.html#importmetadirname | 03/10/2026 |
| Next.js: `proxy.ts` e `matcher` | https://nextjs.org/docs/app/api-reference/file-conventions/proxy | 03/10/2026 [verificar] |
| Convenções Next.js 16 | `docs/arquitetura/next16-convencoes.md` | repositório |
| Decisões | `docs/arquitetura/ADR-001-stack.md` ; `docs/arquitetura/modelo-de-dados.md` | repositório |
