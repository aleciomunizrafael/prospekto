# Next.js 16: convenções que valem neste repositório

Resumo extraído da documentação embutida em `node_modules/next/dist/docs/` (versão 16.3.8, lida em 03/10/2026). Vale para todo código escrito aqui. Em dúvida, leia o guia correspondente em `node_modules/next/dist/docs/01-app/` antes de escrever código; a versão instalada tem diferenças em relação ao que modelos e tutoriais antigos conhecem.

## O que mudou e afeta o nosso código

| Tema | Regra na versão 16 |
|---|---|
| Bundler | Turbopack é padrão em `next dev` e `next build`; não usar flag `--turbopack`. Config fica em `turbopack` no topo do `next.config.ts`. |
| APIs de requisição | `params`, `searchParams`, `cookies()`, `headers()` e `draftMode()` são sempre assíncronos (`await`). Use os tipos globais `PageProps<'/rota'>`, `LayoutProps<'/rota'>` e `RouteContext<'/rota'>` gerados por `next typegen` (rodado automaticamente em `next dev` e `next build`). |
| Middleware | O arquivo chama-se `proxy.ts` (em `src/`), com `export function proxy(request: NextRequest)`. Runtime Node.js, sem edge. Serve para redirecionamentos otimistas (ex.: proteger `/app/*`), nunca como autorização completa. |
| Cache | `cacheComponents` é opt-in. Sem ele, vale o modelo anterior (páginas dinâmicas quando usam dados de requisição). `revalidateTag(tag, 'max')` exige segundo argumento; em Server Actions prefira `updateTag(tag)` (ler-depois-de-escrever) ou `refresh()`. `cacheLife` e `cacheTag` são estáveis (sem prefixo `unstable_`). |
| Lint | `next lint` não existe; o script `lint` chama `eslint` diretamente com `eslint.config.mjs` (flat config) usando `eslint-config-next/core-web-vitals` e `eslint-config-next/typescript`. |
| Imagens | `images.qualities` padrão é `[75]`; `minimumCacheTTL` padrão 4 h; imagens locais com query string exigem `images.localPatterns`. |
| React | App Router usa React canary com os recursos do React 19.2 (`useEffectEvent`, `Activity`, View Transitions). React Compiler é estável mas desligado por padrão (`reactCompiler: true` + `babel-plugin-react-compiler`). |
| Arquivos de agente | `create-next-app` gera `AGENTS.md` e `CLAUDE.md`; `next dev` recria o bloco gerenciado. Commitar os dois. |

## Padrões que vamos seguir

- Formulários públicos (captura de lead) e mutações do CRM usam Server Actions (`'use server'`) com validação Zod no servidor e `useActionState` no cliente para mostrar erros. Toda Server Action do CRM verifica a sessão antes de qualquer coisa; Server Actions são alcançáveis por POST direto.
- Rotas de API (`route.ts`) só quando precisamos de um endpoint HTTP de verdade (webhooks, download do guia com registro, integrações).
- Route groups: `src/app/(site)` para o site público e `src/app/(app)` para o CRM autenticado, cada um com seu `layout.tsx`. A raiz `src/app/layout.tsx` só define `<html lang="pt-BR">`, fontes e CSS global.
- Dados: camada de acesso em `src/lib/` (nunca consultas diretas em componentes de página); DTOs para o que vai ao cliente; nada de expor campos sensíveis de leads.
- Idioma: UI, textos, mensagens de erro e commits em português do Brasil; identificadores de código em inglês.

## Notas de operação registradas na revisão de 04/10/2026

- O prerender de `/`, `/empresas`, `/projetos` e `/projetos/[slug]` lê o banco em tempo de build (PGlite local ou `DATABASE_URL` no Vercel); `scripts/check-db.ts` roda como `prebuild` e falha com mensagem clara quando o PGlite local não foi migrado. A carteira pública é cacheada com a tag `projects` e revalidação de 1 hora; uma falha de banco em ISR mantém a última versão válida.
- `cacheComponents` continua desligado; `src/lib/site/public-projects.ts` usa `unstable_cache` e deve migrar para `use cache` quando a flag for ligada.
- Páginas `/entrar` e `/redefinir-senha` são dinâmicas por lerem `searchParams`; decisão aceita.
