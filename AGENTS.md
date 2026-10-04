<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Convenções do projeto Prospekto

Detalhe em `docs/arquitetura/` (ADR-001, `scaffold.md`, `modelo-de-dados.md`, `next16-convencoes.md`).

- Autorização do CRM: **toda** `page.tsx` em `src/app/(app)/` e **toda** Server Action em `src/actions/` começa com `const ctx = await requireSession();`. O `requireSession()` do `(app)/layout.tsx` serve só à navegação: layouts não re-renderizam em navegação cliente nem impedem o segmento de rodar; `src/proxy.ts` é só redirecionamento otimista. `tests/auth-guard.test.ts` falha quando um arquivo desses não chama `requireSession`.
- Banco: `db` só é importado em `src/lib/repos/`, `src/lib/auth.ts`, `scripts/` e `tests/` (regra R-15); a regra de lint cobre alias e importação relativa (`tests/lint.test.ts`).
- Cabeçalhos `x-tenant-*` nunca vêm do cliente: o proxy os apaga em toda rota, inclusive caminhos com ponto (`tests/proxy.test.ts`).
- Logs: `src/lib/log.ts` (JSON, sem e-mail, telefone, CPF ou CNPJ; regra R-16).
