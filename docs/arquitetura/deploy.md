# Deploy: Vercel, Neon e Resend, passo a passo

> Guia operacional para colocar a Fase 1 no ar. Complementa `scaffold.md` (seções 9 e 10) e `ADR-001-stack.md`. Telas e nomes de menu dos painéis mudam com o tempo; quando divergirem, siga o painel. Validação feita em 04/10/2026: migração, seed, `vercel-build`, login, CRM e cron rodaram de ponta a ponta contra um PostgreSQL 16 real com o driver `pg` (mesmo caminho que o Neon usa).

## Estado em 06/10/2026

Projeto `prospekto` criado no Vercel (branch de produção `main`), Neon conectado pelo Marketplace, variáveis cadastradas e deploy verde em `https://prospekto-sistema.vercel.app`. Smoke, 15 páginas públicas, cabeçalhos de segurança, cron (401 sem segredo) e webhook (503 sem segredo) conferidos de fora. Seed do primeiro acesso feito pelo workflow `seed` (etapa 4) e login no CRM funcionando; um lead criado por `/contato` apareceu no CRM. Pendentes: aviso de lead por e-mail não chegou no teste (ver "Verificação final"); domínio próprio adicionado no Vercel, aguardando os registros DNS na Hostinger (etapa 5); domínio no Resend e webhook (etapa 3); plano Pro e backup (etapa 6).

## 0. Antes de começar (5 minutos)

1. Crie o branch `main` a partir de `claude/charming-wozniak-187o4c` no GitHub (Branches, "New branch", origem o branch atual) e defina `main` como branch padrão em Settings, General. O Vercel usa `main` como branch de produção.
2. Gere três segredos no terminal (um por linha) e guarde no gerenciador de senhas:

```bash
openssl rand -base64 32   # BETTER_AUTH_SECRET
openssl rand -base64 32   # FORM_SECRET
openssl rand -base64 32   # CRON_SECRET
```

3. Decida o e-mail que vai receber os avisos de lead (`LEAD_NOTIFY_EMAIL`, hoje `projetos@prospekto.com.br`) e o e-mail do desenvolvedor para alertas de erro (`DEV_ALERT_EMAIL`).

## 1. Vercel (projeto e variáveis)

1. Entre em vercel.com com a conta do GitHub. "Add New", "Project", importe `aleciomunizrafael/prospekto`. O Vercel detecta Next.js; o comando de build vem de `vercel.json` (`npm run vercel-build`, que aplica as migrações antes do build).
2. Antes do primeiro deploy, abra "Environment Variables" (na própria tela de importação ou em Settings depois) e cadastre, para Production e Preview:

| Variável | Valor |
|---|---|
| `BETTER_AUTH_SECRET` | segredo 1 |
| `FORM_SECRET` | segredo 2 |
| `CRON_SECRET` | segredo 3 |
| `BETTER_AUTH_URL` | por enquanto `https://<nome-do-projeto>.vercel.app`; troque pelo domínio na etapa 5 |
| `NEXT_PUBLIC_APP_URL` | o mesmo valor de `BETTER_AUTH_URL` |
| `RESEND_API_KEY` | chave da etapa 3 (pode cadastrar depois e fazer "Redeploy") |
| `EMAIL_FROM` | `Prospekto <onboarding@resend.dev>` até o domínio ser verificado no Resend |
| `LEAD_NOTIFY_EMAIL` | e-mail que recebe os leads (até o domínio ser verificado, precisa ser o e-mail da conta do Resend; ver etapa 3) |
| `DEV_ALERT_EMAIL` | e-mail do desenvolvedor |
| `DEFAULT_TENANT_ID` | `prospekto` |
| `RESEND_WEBHOOK_SECRET` | vazio por enquanto; preenchido na etapa 3.4 |

`DATABASE_URL` e `DATABASE_URL_UNPOOLED` são criadas pela integração do Neon (etapa 2); não cadastre à mão. `PGLITE_DIR` e `PROSPEKTO_ENV` não existem no Vercel.

3. Settings, General, "Node.js Version": 22.x.
4. O Vercel só cria um deploy de produção quando recebe um push no `main` depois da importação (ou por "Deployments", "Create Deployment", branch `main`). Faça isso só depois da etapa 2, para o build já encontrar `DATABASE_URL`.

## 2. Neon (banco) pelo Marketplace do Vercel

1. No projeto do Vercel, aba "Storage", "Create Database" (ou "Connect Store"), escolha **Neon**.
2. Plano Free, região **São Paulo (aws-sa-east-1)**, Postgres **17**. Conecte ao projeto `prospekto` em todos os ambientes.
3. A integração injeta `DATABASE_URL` (com pooler) e `DATABASE_URL_UNPOOLED` e cria um branch do banco para cada preview deployment (deixe ligado: cada preview migra o próprio branch).
4. Dispare o primeiro deploy (push no `main` ou "Create Deployment"); nos seguintes, "Deployments", "Redeploy". O log deve mostrar `migrações aplicadas` antes do `Compiled successfully`.
5. Smoke: no terminal, `npm run smoke -- https://<nome-do-projeto>.vercel.app` (espera `/` 200, `/api/health` 200 e `/app` redirecionando para `/entrar`).

## 3. Resend (e-mail)

1. Conta em resend.com. "API Keys", "Create API Key" (permissão de envio) e cadastre em `RESEND_API_KEY` no Vercel; "Redeploy".
2. Enquanto o domínio não está verificado, o remetente `onboarding@resend.dev` só entrega para o e-mail da própria conta do Resend. Use esse e-mail em `LEAD_NOTIFY_EMAIL` durante os testes e volte para `projetos@prospekto.com.br` depois.
3. "Domains", "Add Domain". Recomendação: um subdomínio só para envio (`envio.prospekto.com.br`), para não mexer no e-mail atual do domínio. O Resend mostra os registros DNS (DKIM em TXT, MX e TXT de retorno, DMARC); cadastre onde o DNS de `prospekto.com.br` é administrado (pergunta F1 do `README.md`) e clique em "Verify". Depois troque `EMAIL_FROM` para `Daniela Sandrin Copat . Prospekto <contato@envio.prospekto.com.br>` (ou `projetos@prospekto.com.br` se o domínio raiz for verificado) e faça "Redeploy".
4. "Webhooks", "Add Webhook": URL `https://<domínio>/api/webhooks/resend`, eventos `email.bounced`, `email.complained` e `contact.updated`. Copie o "Signing secret" para `RESEND_WEBHOOK_SECRET` no Vercel; "Redeploy". Sem esse segredo a rota responde 503 e nada quebra.

## 4. Primeiro acesso ao CRM (seed)

Duas formas. **Pelo GitHub Actions** (sem instalar nada): cadastre em Settings, Secrets and variables, Actions os segredos `DATABASE_URL_UNPOOLED` (Storage, Neon, ".env.local snippet") e `BACKUP_PASSPHRASE` (senha forte, guardada no gerenciador; é a mesma do backup). Em Actions, workflow `seed`, "Run workflow", informe os usuários (`Nome <email>;Nome <email>`, o primeiro é owner), se quiser o projeto de exemplo e, para quem já existe e perdeu a senha, a opção "reset_password". As senhas temporárias saem só no artefato `credenciais-<run>` cifrado (1 dia de retenção): baixe, extraia e rode `gpg -d credenciais.txt.gpg` no Git Bash com a passphrase. Alternativa sem senha: depois do seed, use "Esqueci a senha" em `/entrar`, que funciona quando o Resend entrega para o e-mail da pessoa.

**No seu terminal**, apontando para o banco de produção:

```bash
DATABASE_URL="postgres://...unpooled..." \
SEED_USERS="Daniela Sandrin Copat <email-da-daniela>;Nome do sócio <email-do-socio>" \
npm run db:seed
```

O script cria o tenant `prospekto` e os usuários (a primeira pessoa é `owner`), e grava as senhas temporárias em um arquivo 0600 num diretório temporário indicado no terminal; envie por canal seguro e apague o arquivo. Entrada em `https://<domínio>/entrar`; "Esqueci a senha" funciona assim que o Resend estiver enviando. `SEED_EXAMPLE=1` cria o projeto de exemplo (não publicado), útil para treinar.

## 5. Domínio e URLs finais

1. Settings, Domains: adicione `prospekto.com.br` e `www.prospekto.com.br` (aceite o redirecionamento de `www` para o raiz); o painel mostra os registros a cadastrar (A `@` com o IP indicado, hoje `216.198.79.1`, e um CNAME para `www`). O domínio fica em "Invalid Configuration" até o DNS responder com esses valores; "Refresh" reconsulta.
2. O DNS de `prospekto.com.br` é administrado na Hostinger, na conta da Daniela (registrador HSTDOMAINS; servidores `ns1/ns2.dns-parking.com`); o domínio está só estacionado (sem site), e o e-mail do domínio roda na Hostinger. No hPanel: Domínios, `prospekto.com.br`, DNS / Nameservers. Apague os dois registros A de nome `@` da página estacionada, adicione A `@` com o IP indicado pelo Vercel, e edite o CNAME `www` (hoje `connect.hostinger.com`) para o valor indicado pelo Vercel. Não mexa em MX nem nos TXT de SPF: são o e-mail da Daniela. Quem não tem a senha da conta pede à Daniela um compartilhamento de acesso no hPanel (perfil, "Compartilhamento de acesso", permissão de domínio) ou faz a alteração com ela numa chamada.
3. Troque `BETTER_AUTH_URL` e `NEXT_PUBLIC_APP_URL` para `https://prospekto.com.br` (Production) e faça "Redeploy". O login só funciona quando o endereço acessado é igual a `BETTER_AUTH_URL`.
4. Cron: com `vercel.json` o Vercel cria o job diário sozinho (Settings, Cron Jobs) e chama `/api/cron/daily` com `Authorization: Bearer CRON_SECRET`. No plano Hobby a precisão é de uma hora.
5. Analytics: aba "Analytics", "Enable" (Vercel Web Analytics, sem cookies).

## 6. No dia em que o primeiro formulário público entrar no ar

- Upgrade para o plano **Pro** (o Hobby proíbe uso comercial; ADR-001).
- Backup semanal: no GitHub, Settings, Secrets and variables, Actions: `DATABASE_URL_UNPOOLED` e `BACKUP_PASSPHRASE` (senha forte, guardada no gerenciador). Rode o workflow `backup` uma vez por "Run workflow" e confira o artefato `.gpg`.
- As majors das actions (`checkout@v7`, `setup-node@v7`, `upload-artifact@v7`) foram conferidas nos repositórios oficiais em 05/10/2026.

## 7. Checklist de verificação depois do deploy

| Verificação | Como |
|---|---|
| Site e saúde | `npm run smoke -- https://prospekto.com.br` |
| Formulário público grava lead e envia e-mails | preencher `/contato` com um e-mail seu; conferir o lead em `/app/leads` e os dois e-mails (aviso interno e resposta automática) |
| Simulador | simular em `/simulador`, passar pelo gate, abrir o link do resultado recebido por e-mail |
| CRM | entrar, mover um lead de estágio, registrar atividade, exportar CSV |
| Cron | `curl -H "Authorization: Bearer <CRON_SECRET>" "https://prospekto.com.br/api/cron/daily?force=1"` responde contagens em JSON |
| Webhook | no Resend, "Send test event" para o endpoint responde 200 |
