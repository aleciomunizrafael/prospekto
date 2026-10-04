# ADR-001: stack e forma do sistema da Fase 1

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data | 03/10/2026 |
| Decide | Juiz do painel de arquitetura, com base em `propostas/proposta-a-velocidade.md`, `propostas/proposta-b-hub.md` e `propostas/proposta-c-simplicidade.md` |
| Contexto de negócio | `docs/visao.md` (não repetido aqui) |
| Convenções de código | `docs/arquitetura/next16-convencoes.md` |
| Documentos derivados | `modelo-de-dados.md`, `scaffold.md` |

## 1. Pergunta

Com que stack, forma de repositório e grau de preparação para multi-tenant um desenvolvedor sozinho (Rafael) coloca no ar, em semanas, o site com captura de leads, o simulador e o CRM de captação da Prospekto, de modo que a Daniela opere o CRM sem suporte e que a Fase 2 (hub vendável) não exija reescrita?

Decisões já dadas pelo projeto e fora de discussão: Next.js 16.3.8, React 19, Tailwind CSS 4, TypeScript; sem Docker no ambiente de desenvolvimento; dev local com um comando; custo próximo de zero na Fase 1; UI em português, código em inglês.

## 2. Critérios e pesos

| Critério | Peso | O que mede |
|---|---|---|
| Tempo até valor | 20% | Semanas até a Daniela registrar um lead real e o site receber formulário |
| Custo mensal | 10% | R$/mês em operação na Fase 1 e trajetória na Fase 2 |
| Risco técnico | 15% | Dependências em beta ou RC, código próprio em áreas sensíveis (auth), configuração que só funciona em um ambiente |
| Prontidão para multi-tenant | 10% | Quanto da Fase 2 nasce sem retrabalho |
| Experiência para um dev solo | 15% | Quantidade de ferramentas, painéis e conceitos que uma pessoa precisa dominar e manter |
| Operabilidade pela Daniela | 15% | Número de telas, decisões e configurações expostas a quem opera |
| Manutenção a longo prazo | 15% | Estabilidade de API das dependências, legibilidade do histórico de esquema, quantidade de serviços externos com plano grátis que pode mudar |

Os pesos refletem `docs/visao.md`: a Fase 1 é a prioridade e a Fase 2 é requisito de arquitetura, não de entrega.

## 3. Pontuação

Escala de 1 (pior) a 5 (melhor). Cada nota tem a justificativa resumida; o detalhe está nas próprias propostas.

| Critério (peso) | A: velocidade | B: hub | C: simplicidade |
|---|---|---|---|
| Tempo até valor (20%) | 5. Calendário de 4 semanas; CLIs geram tudo (shadcn, auth, drizzle-kit) | 2. Cinco semanas com reserva; a semana 1 inteira é monorepo, RLS, dois pools, proxy por host, dois plugins de auth, sem nada visível para a Daniela (risco reconhecido na própria seção 12) | 4. Mesma base da A, mas auth própria e migrações à mão custam dias; e-mail diário entrega valor antes de o CRM ter tela |
| Custo mensal (10%) | 4. R$ 0 na construção, cerca de R$ 105 em operação (Vercel Pro); quatro painéis grátis a mais (Umami, Sentry, Turnstile, Neon) | 3. Mesmos R$ 105 na Fase 1; R$ 310 a 780 com dez tenants (Inngest, R2, Resend Pro, Neon Launch) | 5. R$ 105 a 110; dois fornecedores com login (Vercel, Resend) |
| Risco técnico (15%) | 4. Drizzle 0.45 e Better Auth 1.7 fixados; PGlite local; o risco é a cadência de versões do Better Auth | 2. RLS com dois papéis de banco e pooler em modo transação; `embedded-postgres` que só sobe como root com `createPostgresUser` e em diretório específico; proxy multi-host sem preview por tenant; Inngest e R2 como dependências de caminho crítico | 3. Autenticação própria (cerca de 200 linhas de código de segurança sem revisão externa) e tipos de banco escritos à mão que podem divergir do SQL; o resto é estável |
| Prontidão para multi-tenant (10%) | 3. `tenant_id` em tudo, chaves únicas compostas, `ctx` nos repositórios; RLS e organizações na Fase 2 | 5. Tudo nasce no formato final: organizações, convites, domínios por API, RLS, settings em tabela | 3. Igual à A, com um módulo único de configuração (`site.ts`) que vira `tenants.settings` |
| Experiência para um dev solo (15%) | 4. Uma app, npm, tudo por CLI; 14 dependências de runtime e seis painéis | 2. Monorepo pnpm e Turborepo, cinco pacotes internos, dois pools, bootstrap de papéis, Inngest dev server, R2, API do Vercel; meio dia só de configuração inicial e disciplina de `--filter` para sempre | 4. Nove dependências, SQL legível, mas escrever migrações e tipos à mão é trabalho recorrente |
| Operabilidade pela Daniela (15%) | 3. CRM com 17 tabelas e telas para leads, organizações, projetos, deals, aportes, atividades, campanhas | 2. Além do CRM, configurações de equipe, domínios, e-mail, dados; papéis e convites | 5. Quatro telas, e-mail diário às 7h, "Mover para" que explica o que falta, exportação CSV, login sem senha |
| Manutenção a longo prazo (15%) | 3. Drizzle 1.0 em RC muda API; Better Auth lança toda semana e trocou de CLI; shadcn e Radix a atualizar | 2. Tudo da A mais Inngest, React Email, Turborepo, SDK do Vercel, S3 SDK, Sentry, pino | 5. Kysely estável na série 0.2x, migrações em SQL que qualquer ferramenta lê, elementos HTML nativos, sem gerador de código |
| Total ponderado | 3,80 | 2,40 | 4,15 |

Conta: A = 5(0,20) + 4(0,10) + 4(0,15) + 3(0,10) + 4(0,15) + 3(0,15) + 3(0,15) = 3,80. B = 2(0,20) + 3(0,10) + 2(0,15) + 5(0,10) + 2(0,15) + 2(0,15) + 2(0,15) = 2,40. C = 4(0,20) + 5(0,10) + 3(0,15) + 3(0,10) + 4(0,15) + 5(0,15) + 5(0,15) = 4,15.

Leitura: C vence pela postura (menos serviços, menos telas, menos conceitos) e perde pontos exatamente onde a A é mais forte (ferramentas geradoras: ORM com migrações geradas, autenticação pronta, componentes prontos). A B não vence em nenhum critério além do multi-tenant, e o seu custo cai sobre a Fase 1, que é a prioridade. A decisão é uma síntese, não a C pura.

## 4. Decisão

Base: Proposta C. Enxertos: as ferramentas geradoras da Proposta A onde elas substituem código próprio sensível ou trabalho manual recorrente, e três regras baratas da Proposta B que evitam retrabalho na Fase 2.

| Tema | Decisão | Origem | Por quê |
|---|---|---|---|
| Forma do repositório | App Next.js única na raiz de `aleciomunizrafael/prospekto`, `src/` ao lado de `docs/`; sem monorepo | A e C (convergem) | Um consumidor de código, um desenvolvedor; `src/lib/domain` e `src/lib/simulator` nascem sem importar Next nem banco e podem virar pacote movendo pastas |
| Banco | PostgreSQL. Produção: Neon pelo Vercel Marketplace, plano Free, região São Paulo (`aws-sa-east-1`), Postgres 17. Local e testes: PGlite 0.5.8 (Postgres em WASM, sem Docker) | A, B, C (convergem); região e versão da B e da C | Um dialeto do teste à produção; `npm run dev` sem conta em nada; preview deployment com branch do Neon é o teste de integração real |
| Acesso ao banco | Drizzle ORM 0.45.3 + drizzle-kit 0.31.11; migrações geradas (`drizzle-kit generate`), SQL commitado em `drizzle/`, aplicadas por script no build do Vercel | A (ORM), C (migrações aplicadas no build, regra expand/contract) | Resolve as duas fraquezas da C: tipos escritos à mão e SQL à mão. O SQL gerado continua legível e versionado. Drizzle tem driver PGlite oficial e o Better Auth gera o esquema de autenticação em formato Drizzle. Fixar 0.45.x; 1.0 está em `rc.4` (registro npm, 03/10/2026) |
| Autenticação | Better Auth 1.7.7, e-mail e senha, cadastro fechado (`disableSignUp`), redefinição de senha por e-mail, campo `tenantId` no usuário; CLI `auth@1.7.7` para gerar o esquema | A | Substitui as 200 linhas de auth própria da C, que eram o maior risco técnico dela. Caminho direto para o plugin `organization` na Fase 2 sem trocar de biblioteca. O plugin `magicLink` do próprio Better Auth pode ser ligado depois se a Daniela preferir entrar sem senha (decisão de produto, não de arquitetura) |
| UI | shadcn/ui (CLI 4.21.1) com um conjunto fechado de componentes, usados pelo site e pelo CRM; elementos nativos quando bastarem (`details`, `dialog`) | A (shadcn), C (conjunto mínimo, nativo quando possível) | Tabela, formulário, diálogo e select prontos economizam dias no CRM; os componentes são código copiado para `src/components/ui`, não dependência de runtime além dos primitivos Radix |
| Hospedagem | Vercel: Hobby durante a construção, Pro (US$ 20/mês) no dia em que o primeiro formulário público entrar no ar | A, B, C (convergem) | O Hobby proíbe uso comercial (https://vercel.com/docs/plans/hobby ; https://vercel.com/docs/limits/fair-use-guidelines) |
| E-mail transacional | Resend 6.32.0 atrás de uma função `sendEmail()` própria; templates em HTML simples com versão texto | C | Trocar de provedor é reescrever dez linhas; sem React Email na Fase 1 |
| WhatsApp | Links `wa.me/5554984032180` com texto por página; no CRM, botão "Abrir WhatsApp" com a mensagem do playbook | A, B, C (convergem) | Sem API da Meta na Fase 1 |
| PDF do guia | Arquivo em `src/assets/`, fora de `public/`, servido por rota com link assinado (HMAC, 72 h) sem tabela de downloads; o acesso vira uma `activity` do tipo `download` | C | Um único arquivo de 0,8 MB não justifica bucket nem tabela |
| Anti-spam | Honeypot, tempo mínimo de preenchimento assinado, deduplicação por e-mail e segmento, e limite de 5 envios por IP por hora na tabela `form_attempts`; Cloudflare Turnstile pré-ligado por variável de ambiente opcional | C (honeypot, tempo, dedup), A (`form_attempts`, Turnstile) | `docs/site/estrutura-e-copy.md`, seção 5.1, exige o limite por IP; Turnstile entra sem mudar código quando o spam aparecer |
| Analytics | Vercel Web Analytics (`@vercel/analytics` 2.0.1), sem cookies; UTM gravado no próprio lead | C | Mesmo painel e mesma fatura; relatório de origem sai do CRM |
| Erros e logs | `console` em JSON nos logs do Vercel, `error.tsx` e `global-error.tsx` em português, e-mail para o desenvolvedor em exceção não tratada com deduplicação de 10 minutos; Sentry só quando um erro não for diagnosticável assim | C | Cinco arquivos de configuração e um painel a menos até doer |
| Validação e env | Zod 4.6.5 nos formulários; `src/env.ts` com Zod puro, importado por `next.config.ts` para falhar no build | C | Mesmo resultado do t3-env com um pacote a menos |
| Testes | Vitest 5.0.3: simulador puro, regras de domínio, schemas Zod, repositórios e Server Actions contra PGlite em memória, mais um teste de isolamento entre dois tenants; `scripts/smoke.ts` pós-deploy; Playwright só quando houver a primeira regressão de UI | C, com o teste de isolamento da B | Sem navegador na CI; Server Actions são funções e se testam direto |
| CI | GitHub Actions, um workflow: `npm ci`, lint, typecheck, test, build. Deploy pela integração Git do Vercel | A, B, C (convergem) | |
| Backups | Restore do Neon (6 h no Free) mais `pg_dump` semanal por GitHub Actions como artefato (90 dias) mais "Exportar CSV" no CRM | C | Três camadas com responsável claro; sem S3 |
| Jobs | Cron diário do Vercel (`/api/cron/daily`, `CRON_SECRET`): e-mail de pendências, SLAs vencidos, limpeza de `form_attempts` e tokens | C | Inngest é a resposta certa para fan-out por tenant; isso é Fase 2 |
| Modelo de dados | Mínimo da C (projeto, aporte com recibo e comissão, atividade, consentimento, simulação) com três ajustes: `form_attempts` da A; estágios de pipeline como constantes em código com `CHECK` no banco; mecanismos de incentivo nomeados exatamente como em `docs/dominio/parametros-simulador.json` | C, A | Detalhe em `modelo-de-dados.md` |
| Multi-tenant agora | Tabela `tenants` com o tenant `prospekto` semeado; `tenant_id NOT NULL` com FK e índice em toda tabela de negócio; chaves únicas compostas; toda função de `src/lib/repos/` recebe `ctx: { tenantId, userId }` e filtra; `db` só é importado em `src/lib/repos/`, `src/lib/auth.ts`, `scripts/` e testes (regra de lint); teste de isolamento com dois tenants; `src/config/site.ts` como único módulo de configuração do tenant; cabeçalhos `x-tenant-*` nunca vêm do cliente | A e C (coluna e `ctx`), B (regra de lint, teste de isolamento, higiene de cabeçalhos) | Custa linhas hoje e semanas depois |
| Multi-tenant depois | RLS com dois papéis e `set_config` por transação; plugin `organization` (membros, convites, papéis); resolução de tenant por `Host` em `proxy.ts`; `tenants.settings` substituindo `site.ts`; domínios por API; Inngest; R2; cobrança | B (como plano, não como entrega) | Seção 7 |

### 4.1 Stack final em uma página

| Camada | Pacote e versão (registro npm, 03/10/2026) |
|---|---|
| Framework | `next@16.3.8`, `react@19.2.8`, `react-dom@19.2.8` (versões que o `create-next-app@16.3.8` fixa; `latest` do React é 19.3.0, mas o template do Next é a referência) |
| Linguagem | `typescript@5.9.3` (a tag `latest` do npm já é `7.0.2`; o template pede `^5`; fixar 5.9.x até o Next declarar suporte ao 7 [verificar]) |
| CSS | `tailwindcss@4.3.3`, `@tailwindcss/postcss@4.3.3` |
| UI | `shadcn@4.21.1` (CLI) e os primitivos Radix que ela instala |
| Banco | `drizzle-orm@0.45.3`, `drizzle-kit@0.31.11`, `pg@8.23.1`, `@electric-sql/pglite@0.5.8` |
| Auth | `better-auth@1.7.7`, CLI `auth@1.7.7` |
| Validação | `zod@4.6.5` |
| E-mail | `resend@6.32.0` |
| Analytics | `@vercel/analytics@2.0.1` |
| Testes | `vitest@5.0.3` (exige Node 22.12 ou superior; https://vitest.dev/guide/) |
| Lint e formato | `eslint@9` com `eslint-config-next@16.3.8` (flat config gerada pelo template), `prettier@3.9.9` |
| Utilitários | `tsx@4.23.15`, `dotenv@18.0.5` (só para `drizzle.config.ts`), `server-only@0.0.1` |
| Runtime | Node 22.12 ou superior (o ambiente tem 22.22.0); npm (10.9.4) |

Custo mensal da Fase 1: R$ 0 durante a construção; cerca de R$ 105 em operação (Vercel Pro, US$ 20 à PTAX de venda de 02/10/2026, R$ 5,2238, Banco Central, série PTAX), mais o domínio `prospekto.com.br` (cerca de R$ 40/ano [verificar] (em https://registro.br/precos/)). Fontes de preço: https://vercel.com/pricing ; https://neon.com/pricing ; https://resend.com/pricing.

## 5. Alternativas rejeitadas

| Alternativa | De onde veio | Por que não agora |
|---|---|---|
| Prisma 7.10 | Nenhuma proposta a defendeu | Exige driver adapter, `prisma.config.ts` e gerador com `output`; a tag `latest` do CLI `prisma` no npm é `8.0.0-rc.19` enquanto `@prisma/client` está em 7.10.0 (registro npm, 03/10/2026): `npm i -D prisma` sem versão fixa instala um release candidate. Não modela políticas de banco. Nada que o Drizzle não faça com menos etapas |
| Kysely 0.29.6 + migrações em SQL puro + tipos à mão | C | A estabilidade é real, mas o custo recai sobre o desenvolvedor a cada mudança de esquema (escrever SQL, escrever `up` e `down`, atualizar `types.ts`) e o `tsc` não pega tipo desalinhado do SQL. Drizzle gera o SQL a partir do schema tipado e o PGlite roda igual. Se o Drizzle 1.0 forçar uma migração dolorosa, o Kysely continua sendo o plano B: o Better Auth o usa internamente e os repositórios ficam concentrados em `src/lib/repos/` |
| Autenticação própria (link mágico, sessão em tabela) | C | Dois usuários não justificam escrever código de segurança sem revisão externa; e a Fase 2 precisa de organizações, convites e papéis, que o Better Auth já tem. A C reconhece "troca por Better Auth se o escopo crescer"; o escopo vai crescer |
| Monorepo pnpm + Turborepo com cinco pacotes | B | Meio dia de configuração e uma disciplina permanente para resolver compartilhamento que não existe. Extrair `src/lib/domain` para um pacote quando houver segundo consumidor é mover uma pasta e escrever um `package.json` |
| Row Level Security desde a migração 0 | B | Correto como destino, caro como ponto de partida: dois papéis de banco, bootstrap por SQL (o papel criado no console do Neon herda `neon_superuser` com `BYPASSRLS`; https://neon.com/docs/manage/roles), `set_config` por transação por causa do pooler em modo transação (https://neon.com/docs/connect/connection-pooling), e o PGlite não aplica políticas (https://github.com/electric-sql/pglite/issues/274), o que obrigaria `embedded-postgres` local. Na Fase 1 há um tenant; a barreira é o `ctx` obrigatório mais o teste de isolamento. RLS entra na Fase 2 junto com o segundo tenant, que é quando passa a proteger alguém |
| `embedded-postgres` como banco local | B | Só necessário para testar RLS; binários de 60 MB, precisa de `createPostgresUser` quando o processo é root e de diretório com permissão específica (teste da própria B) |
| Inngest para filas e eventos | B | Sem fan-out por tenant na Fase 1, um cron diário resolve. O que a B acerta é a porta única `events.publish`; aqui a lógica de "lead criado" fica na Server Action, e extrair para eventos na Fase 2 é um ou dois dias |
| Cloudflare R2 | B | Um PDF de 0,8 MB e decks por link externo (`estrutura-e-copy.md`, seção 5.5) não precisam de bucket. Vercel Blob ou R2 entram com upload por tenant |
| Umami Cloud | A, B | Um login a mais; Vercel Web Analytics é cookieless, está no mesmo painel e o UTM fica no lead |
| Sentry desde a semana 3 | A, B | Cinco arquivos e um painel; entra quando log mais e-mail de erro não bastarem |
| Playwright na CI | A, B | Binário de navegador e minutos de CI para um fluxo que a Server Action testa direto; entra na primeira regressão de UI |
| `@t3-oss/env-nextjs` | A, B | Zod puro faz o mesmo |
| Cloudflare Turnstile obrigatório desde o início | A | Dois painéis e duas chaves antes de haver spam; fica opcional por variável de ambiente |
| Supabase (Free) | Nenhuma | Projeto pausa após uma semana sem atividade (https://supabase.com/pricing); empurra para Auth e Storage próprios |
| SQLite ou Turso | Nenhuma | Dialeto diferente da produção; não roda em função serverless sem serviço externo |
| Cloudflare Workers via OpenNext | A (plano B) | `@opennextjs/cloudflare` ainda não suporta o middleware Node (https://opennext.js.org/cloudflare); fica como plano B de custo, não de arquitetura |
| CRM pronto (HubSpot Free, RD Station CRM, Pipedrive, Notion, Sheets) | C (avaliação, seção 3) | Nenhum modela projeto com saldo a captar, aporte com recibo de mecenato e comissão limitada por lei (IN MinC 29/2026, art. 19, via `docs/dominio/leis-de-incentivo.md`, seção 2.8), nem consentimento versionado junto do lead; e o produto da Fase 2 é o próprio CRM (`docs/visao.md`). Salvaguarda mantida da C: "Exportar CSV" desde a primeira versão |

## 6. Consequências

Positivas:

- Dev local com `npm run dev` depois de `npm run db:migrate && npm run db:seed`; nenhum serviço externo para começar a programar.
- Esquema em TypeScript é a única fonte de verdade; o SQL gerado é revisado no PR e aplicado no build do Vercel (produção e previews, cada preview com seu branch do Neon).
- Autenticação, sessões e redefinição de senha vêm prontas; a Fase 2 liga o plugin `organization` em vez de trocar de biblioteca.
- Dois fornecedores com login (Vercel, Resend) mais o GitHub. A Daniela só vê o CRM e o e-mail.
- `ctx.tenantId` obrigatório em todo repositório e um teste que cria dois tenants tornam a Fase 2 uma extensão, não uma auditoria.

Negativas e riscos aceitos:

| Risco | Mitigação |
|---|---|
| Drizzle 1.0 (hoje `rc.4`) muda API; Better Auth lança versão toda semana e trocou de pacote de CLI em 2026 | Versões fixadas sem `^` nas entradas críticas; `npm outdated` mensal; major só com nota de versão lida; repositórios concentrados em `src/lib/repos/` com testes; regenerar `schema/auth.ts` a cada upgrade do Better Auth e revisar o diff |
| O CLI `auth generate` recusa configuração que importa `server-only` (confirmado neste ambiente em 03/10/2026) | `src/lib/db/index.ts` e `src/lib/auth.ts` não importam `server-only`; a proteção fica em `src/lib/repos/*` e `src/actions/*` e na regra de lint que restringe quem importa `@/lib/db` |
| `create-next-app` substitui o `.gitignore` existente ao rodar na raiz (confirmado neste ambiente) | O scaffold restaura `!.env.example` e acrescenta `.pglite/` logo após |
| Neon Free: scale-to-zero após 5 minutos, restore de só 6 horas, "não recomendado para produção" | Páginas públicas estáticas; formulário mostra estado "enviando"; dump semanal; Launch (pago por uso) quando o volume ou o negócio exigir |
| Vercel Hobby em uso comercial | Upgrade para Pro no dia da publicação do primeiro formulário; está na ordem de construção |
| Dados pessoais em provedores fora do Brasil (Vercel, Resend; Neon em São Paulo) | LGPD, arts. 33 a 36 [verificar] (com advogado); cláusula na política de privacidade (`estrutura-e-copy.md`, seção 5.7) |
| Multi-tenant por coluna depende de disciplina | `ctx` obrigatório, regra de lint, teste de isolamento; RLS na Fase 2 |
| Sem Sentry, erro silencioso em produção | E-mail de erro ao desenvolvedor, `/api/health`, `scripts/smoke.ts`, e-mail diário que denuncia "zero leads" em campanha |
| Uma pessoa constrói e mantém | Tudo por CLI; `AGENTS.md` e `CLAUDE.md` commitados; este ADR, `modelo-de-dados.md` e `scaffold.md` como manual |

## 7. O que fica explicitamente para a Fase 2

Nada desta lista entra no calendário da Fase 1. O que a Fase 1 faz é não fechar a porta.

| Capacidade | O que a Fase 1 deixa pronto | O que a Fase 2 constrói |
|---|---|---|
| Vários tenants | Tabela `tenants`, `tenant_id` em tudo, `ctx` nos repositórios, teste de isolamento | Onboarding, status (`trial`, `active`, `suspended`), seed por tenant |
| Isolamento forte | Nenhuma consulta fora de `src/lib/repos/` | RLS com papel `app_user`, `set_config('app.tenant_id', ..., true)` por transação, `embedded-postgres` para testar (B, seções 4.3 e 4.4) |
| Usuários em vários tenants, convites, papéis | Better Auth com `user.tenantId` | Plugin `organization` (tenant = organization), `admin` para impersonação com auditoria |
| Site por tenant e domínios | `src/config/site.ts` como único módulo de configuração; cabeçalhos `x-tenant-*` apagados no proxy | `tenants.settings`, resolução por `Host` em `proxy.ts`, `tenant_domains` com API do Vercel, wildcard no domínio do hub (B, seções 4.6 e 7) |
| Pipelines editáveis | Estágios como constantes em `src/lib/domain/pipelines.ts` com `CHECK` no banco | Tabelas `pipelines` e `pipeline_stages` por tenant, campos extras por segmento |
| Eventos e filas | Lógica de "lead criado" e "depósito confirmado" em Server Actions; cron diário | Inngest (ou `outbox` + cron) com `tenantId` em todo evento |
| Arquivos | PDF no repositório; decks por link | Vercel Blob ou R2 com prefixo por tenant, tabela `files` |
| WhatsApp automatizado | Links `wa.me`; `activities.type = whatsapp` | Cloud API da Meta por tenant, templates, webhook |
| Cobrança | Nada | `plans`, `subscriptions`, Stripe ou Asaas [verificar] |
| Observabilidade | Log JSON, e-mail de erro | Sentry com tag `tenant_id`, `/admin/status` |
| Analytics de produto | UTM no lead | Tabela `events` por tenant |
| Compliance | Consentimento append-only com texto; exportação CSV | Exclusão e anonimização por titular, contrato de operador entre hub e tenants (LGPD, art. 5º, VII) [verificar] (com advogado) |

## 8. Fontes

| Assunto | Fonte | Consultado em |
|---|---|---|
| Versões e dist-tags (next, react, typescript, tailwindcss, drizzle-orm, drizzle-kit, better-auth, auth, @better-auth/cli, zod, vitest, @electric-sql/pglite, pg, resend, shadcn, prettier, tsx, dotenv, @vercel/analytics, kysely, prisma, @prisma/client) | `npm view <pacote> dist-tags` contra https://registry.npmjs.org/ | 03/10/2026 |
| Arquivos gerados pelo `create-next-app@16.3.8` (package.json, eslint.config.mjs, tsconfig.json, .gitignore) e comportamento em diretório não vazio | Execução em diretório de rascunho neste ambiente | 03/10/2026 |
| `create-next-app`: flags | https://nextjs.org/docs/app/api-reference/cli/create-next-app | 03/10/2026 |
| Drizzle: config, PGlite, migrações | https://orm.drizzle.team/docs/drizzle-config-file ; https://orm.drizzle.team/docs/connect-pglite ; https://orm.drizzle.team/docs/migrations ; `node_modules/drizzle-orm/pglite/migrator.js` da versão 0.45.3 | 03/10/2026 |
| Better Auth: CLI, Next.js, adaptador Drizzle; recusa de `server-only` | https://www.better-auth.com/docs/concepts/cli ; https://www.better-auth.com/docs/integrations/next ; https://www.better-auth.com/docs/adapters/drizzle ; execução de `npx auth@1.7.7 generate` neste ambiente | 03/10/2026 |
| Vitest: requisitos | https://vitest.dev/guide/ | 03/10/2026 |
| Vercel: Hobby, fair use, preços, cron, analytics, build command | https://vercel.com/docs/plans/hobby ; https://vercel.com/docs/limits/fair-use-guidelines ; https://vercel.com/pricing ; https://vercel.com/docs/cron-jobs/usage-and-pricing ; https://vercel.com/docs/analytics/limits-and-pricing ; https://vercel.com/docs/builds/configure-a-build | 03/10/2026 (via propostas A e C) |
| Neon: preços, regiões, papéis, pooling, integração Vercel | https://neon.com/pricing ; https://neon.com/docs/introduction/regions ; https://neon.com/docs/manage/roles ; https://neon.com/docs/connect/connection-pooling ; https://neon.com/docs/guides/vercel-managed-integration | 03/10/2026 (via propostas) |
| PGlite não aplica RLS | https://github.com/electric-sql/pglite/issues/274 | 03/10/2026 (via proposta B) |
| Resend, Supabase, OpenNext | https://resend.com/pricing ; https://supabase.com/pricing ; https://opennext.js.org/cloudflare | 03/10/2026 (via propostas) |
| Câmbio PTAX | Banco Central, série PTAX, venda de 02/10/2026 (via proposta C, seção 12) | 03/10/2026 |
| Regras de domínio (comissão, estágios, LGPD) | `docs/dominio/leis-de-incentivo.md` ; `docs/dominio/parametros-simulador.json` ; `docs/estrategia/personas-e-funis.md` ; `docs/site/estrutura-e-copy.md` | repositório |
