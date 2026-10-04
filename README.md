# Prospekto

Estrutura digital e comercial de captação para a **Prospekto Consultoria & Projetos**, empresa de Daniela Sandrin Copat na Serra Gaúcha (RS): site com captura de leads, simulador de incentivo fiscal, CRM de captação, playbooks de prospecção e um produto digital (mentoria). Na Fase 2, a mesma estrutura vira um hub de captação vendável a outros consultores, produtoras e proponentes, com a Daniela como autoridade da marca. O contexto completo, o modelo de receita e as decisões provisórias estão em `docs/visao.md`, que este arquivo não repete.

## Em uma página

| Item | Resumo |
|---|---|
| A empresa | Prospekto Consultoria & Projetos. Elabora, inscreve, gerencia e capta projetos culturais nas leis de incentivo (Lei Rouanet, Lei do Audiovisual art. 1º-A, LIC-RS) e presta consultoria em cultura e economia criativa a empresas e municípios (`docs/visao.md`, "Quem") |
| Contato público | `projetos@prospekto.com.br` e (54) 98403-2180, os únicos que constam dos materiais da Prospekto (`docs/fontes/materiais/`) |
| Quem constrói | Rafael (desenvolvedor) e o sócio (filho da Daniela, operação comercial e CRM) |
| Repositório | `aleciomunizrafael/prospekto` |
| O software | Uma app Next.js 16 na raiz com dois grupos de rotas: site público (`(site)`) e CRM autenticado (`(app)` em `/app/*`), mesmo banco, sem API entre os dois (`docs/arquitetura/ADR-001-stack.md`) |
| Fase 1 | Outubro de 2026 a março de 2027: site, simulador, CRM, playbooks em operação e validação da mentoria (`docs/roadmap.md`) |
| Fase 2 | Hub multi-tenant; o investimento espera os sinais de `docs/estrategia/mercado-e-posicionamento.md`, seção 9.4 |

## Estado atual

**Kickoff concluído em 03/10/2026; app da Fase 1 construída e revisada em 04/10/2026 (branch `claude/charming-wozniak-187o4c`).**

- `docs/`: visão, briefing e materiais-fonte, referência legal verificada, mercado, personas e funis, especificação do site e do simulador, playbooks, produto digital, ADR-001 (stack), ADR-002 (padrões do simulador), modelo de dados, scaffold e roadmap. Índice em `docs/README.md`.
- `src/`: site público (home, empresas, contadores, pessoa física, municípios, proponentes, mentoria, diagnóstico, projetos, guia, contato, privacidade, obrigado), simulador de incentivo fiscal (biblioteca pura com todos os casos da especificação, telas, gate de captura, resultado por link assinado e e-mail), captura de leads (Server Action com antispam, consentimento LGPD, deduplicação, e-mails, descadastro de um clique) e CRM em `/app` (login e redefinição de senha, "Hoje", leads com filtros e "Mover para" com campos obrigatórios por estágio, atividades, organizações e contatos, projetos com publicação na carteira, aportes com termo, depósito, recibo e comissão, exportação CSV, e-mail diário por cron, webhook do Resend).
- Qualidade: `npm run check` verde (lint, typecheck, format, 376 testes contra PGlite em memória, build com 37 rotas); revisão adversarial em quatro lentes (segurança e LGPD, regras de negócio, UX e acessibilidade, convenções do Next 16) com 36 correções aplicadas.
- O que ainda não existe: deploy (Vercel, Neon, Resend, domínio), a edição revisada do guia em PDF (até lá `/guia` fica em modo "em breve"), páginas de campanha e `/conteudo`, importação de CSV, relatório semanal dentro do CRM, filtros da carteira pública. Pendências que dependem de decisão estão na seção "Perguntas em aberto" e nos marcadores "[verificar]" do código (teste `LAUNCH_GATE=1 npm test` lista os que faltam antes do lançamento).

## Como navegar nos docs

Todo documento deriva de `docs/visao.md` e referencia os demais em vez de repeti-los. O que não foi verificado em fonte primária está marcado com "[verificar]". Ordem de leitura recomendada, com a trilha completa e a descrição de cada arquivo em `docs/README.md`:

1. `docs/visao.md`: o que é, para quem, fases, receita, decisões provisórias.
2. `docs/fontes/`: transcrição do briefing e materiais da Prospekto (guia, deck de projeto, referência de posicionamento).
3. `docs/dominio/`: as leis de incentivo, o glossário e os parâmetros do simulador.
4. `docs/estrategia/`: mercado, posicionamento, personas, funis, pipelines e KPIs.
5. `docs/site/` e `docs/playbooks/`: o que o site diz e faz; como a prospecção opera no dia a dia.
6. `docs/produto/`: a mentoria e o plano de validação.
7. `docs/arquitetura/`: ADR, modelo de dados, scaffold, convenções do Next.js 16 e as três propostas que o ADR julgou.
8. `docs/roadmap.md`: fases, sprints, histórias, métricas e marcos de decisão.

## Stack decidida (resumo do ADR-001)

Decisão registrada em `docs/arquitetura/ADR-001-stack.md` (status: aceito, 03/10/2026), síntese da Proposta C (simplicidade) com as ferramentas geradoras da Proposta A e três regras baratas da Proposta B para a Fase 2.

| Camada | Decisão | Versão fixada (registro npm, 03/10/2026) |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, TypeScript | `next@16.3.8`, `react@19.2.8`, `typescript@5.9.3` |
| CSS e UI | Tailwind CSS 4; shadcn/ui com conjunto fechado de componentes; elementos nativos quando bastam | `tailwindcss@4.3.3`, CLI `shadcn@4.21.1` |
| Banco | PostgreSQL. Produção: Neon (Vercel Marketplace, plano Free, região São Paulo, Postgres 17). Local e testes: PGlite (Postgres em WASM, sem Docker) | `@electric-sql/pglite@0.5.8`, `pg@8.23.1` |
| Acesso a dados | Drizzle ORM com migrações geradas e SQL commitado em `drizzle/`, aplicadas no build do Vercel; toda consulta em `src/lib/repos/` com `ctx: { tenantId, userId }` | `drizzle-orm@0.45.3`, `drizzle-kit@0.31.11` |
| Autenticação | Better Auth, e-mail e senha, cadastro fechado, usuários criados por seed; plugin `organization` fica para a Fase 2 | `better-auth@1.7.7` |
| Validação e env | Zod nos formulários e em `src/env.ts` (falha o build se faltar variável) | `zod@4.6.5` |
| E-mail | Resend atrás de `sendEmail()`; templates em HTML simples | `resend@6.32.0` |
| WhatsApp | Links `wa.me` com texto por página; sem API da Meta na Fase 1 | |
| Hospedagem | Vercel: Hobby na construção, Pro (US$ 20/mês, cerca de R$ 105) no dia em que o primeiro formulário público entrar no ar, porque o Hobby proíbe uso comercial (https://vercel.com/docs/plans/hobby) | |
| Analytics | Vercel Web Analytics, sem cookies; UTM gravado no lead | `@vercel/analytics@2.0.1` |
| Jobs | Cron diário do Vercel (`/api/cron/daily`): e-mail de pendências, SLAs vencidos, limpeza | |
| Testes e CI | Vitest contra PGlite em memória (simulador, domínio, repositórios, Server Actions, isolamento entre tenants); GitHub Actions com lint, typecheck, format, test, build | `vitest@5.0.3` |
| Backups | Restore do Neon (6 h no Free), `pg_dump` semanal por GitHub Actions (artefato de 90 dias), "Exportar CSV" no CRM | |
| Multi-tenant agora | Tabela `tenants` com o tenant `prospekto`; `tenant_id NOT NULL` em toda tabela de negócio; `ctx` obrigatório nos repositórios; regra de lint que restringe quem importa `@/lib/db`; teste de isolamento com dois tenants | |
| Multi-tenant depois | RLS, plugin `organization`, resolução por `Host`, `tenants.settings`, domínios por API, filas, arquivos, cobrança (ADR-001, seção 7) | |

Custo da Fase 1: R$ 0 durante a construção; cerca de R$ 105 por mês em operação (Vercel Pro), mais o domínio (ADR-001, seção 4.1). Runtime: Node 22.12 ou superior e npm 10.

## Como rodar

Sem conta em serviço nenhum: o banco local é PGlite (Postgres em WASM) em `.pglite/`.

```bash
cp .env.example .env.local      # preencher BETTER_AUTH_SECRET e FORM_SECRET (openssl rand -base64 32)
npm install
npm run db:migrate              # aplica as migrações de drizzle/ no PGlite local
SEED_USERS="Daniela <email>" npm run db:seed   # tenant prospekto e usuários; a senha temporária vai para um arquivo em diretório temporário indicado no terminal
SEED_EXAMPLE=1 npm run db:seed  # opcional: proponente e projeto de exemplo (não publicado)
npm run dev                     # http://localhost:3000 (site) e http://localhost:3000/app (CRM)
npm run check                   # lint + typecheck + format:check + test + build (mesma sequência da CI)
```

Deploy (Vercel, Neon em São Paulo, Resend, domínio, seed do primeiro acesso, plano Pro, backup cifrado): guia passo a passo em `docs/arquitetura/deploy.md`; variáveis por ambiente em `docs/arquitetura/scaffold.md`, seção 9. Convenções obrigatórias do código em `AGENTS.md`.

## Próximos passos

Ordem de `docs/arquitetura/scaffold.md`, seção 8, cruzada com o calendário de `docs/roadmap.md`:

1. Executar o scaffold e deixar `npm run check` verde (critério de pronto na seção 7 do scaffold).
2. Simulador puro com os testes de `docs/site/simulador-spec.md`, seção 9, e a página `/simulador` com gate de captura; registrar o `ADR-002-defaults-simulador.md` previsto na seção 13.1 da spec.
3. Formulários do site e `createLead` com consentimento, e-mail de aviso e guia por link assinado (`docs/site/estrutura-e-copy.md`); `/guia` entra em modo "em breve" até a edição revisada do guia ser aprovada (prazo: 16/10/2026).
4. Deploy em preview, domínio, Resend em produção e upgrade para o Vercel Pro no dia do primeiro formulário público (meta: 19/10/2026, antes da Mercopar de 20 a 23/10).
5. CRM: login, tela "Hoje", lista e detalhe de leads, "Mover para" com campos obrigatórios, atividades, e-mail diário, exportação CSV; critério: a Daniela registra um lead real e um follow-up sem ajuda.
6. Organizações, projetos (carteira com saldo a captar), aportes com recibo e comissão, carteira pública em `/projetos`; backup semanal ligado.
7. Em paralelo, fora do código: guia revisado, LinkedIn, Mercopar, campanha 1 (fechamento do ano), programa de parceria com contadores, lista de espera da mentoria (`docs/playbooks/README.md`, "Antes de começar").

## Regras do repositório

- Português do Brasil em UI, textos, commits e documentação; identificadores de código em inglês (`docs/arquitetura/next16-convencoes.md`).
- Nenhum dado inventado: contatos e números só os das fontes ou verificados com referência e data; o que não foi confirmado leva "[verificar]".
- Nunca commitar e-mail, telefone ou dado pessoal de terceiros; `.env.local` fica fora do git.
- Toda afirmação legal ou tributária carrega lei e artigo, ou a seção de `docs/dominio/leis-de-incentivo.md` que a sustenta.
- `docs/visao.md` é o documento-âncora; decisões novas entram lá (tabela de perguntas) ou em um ADR em `docs/arquitetura/`.

## Perguntas em aberto (consolidadas)

Lista única das perguntas levantadas pelos documentos do kickoff, deduplicada e agrupada. As cinco decisões provisórias de `docs/visao.md` continuam valendo até serem substituídas; aqui elas aparecem como referência (visão 1 a 5). A coluna "Destrava" diz o que fica parado sem a resposta; o detalhe de cada pergunta está no documento citado.

### A. Carteira, histórico e prova social

| # | Pergunta | Quem responde | Destrava | Detalhe em |
|---|---|---|---|---|
| A1 | Quais projetos estão em carteira hoje: nome, mecanismo e artigo (art. 18, art. 26, art. 1º-A, LIC-RS), número do processo (Pronac, Ancine ou Pró-Cultura), portaria ou habilitação e prazo de captação, valor aprovado, saldo a captar, contrapartidas, rubrica de captação orçada e autorização de publicação (visão 3) | Daniela | Seed do CRM, página `/projetos`, e-mail 3 da campanha 1, one-pages, meta em reais, modelo de projetos e aportes | `docs/visao.md`; `docs/estrategia/personas-e-funis.md`, seção 11; `docs/arquitetura/modelo-de-dados.md`, seção 3.8 |
| A2 | A autorização da Ancine de R$ 2,4 milhões para "A Tacada Perfeita" (Despacho 127-E, set/2026) é art. 1º-A e qual o saldo a captar hoje? A Ocotea Filmes autoriza publicar o projeto no site (elenco, cotas, prazo, deck) e usá-lo como peça de lançamento? | Daniela, Ocotea Filmes | `/projetos/[slug]`, campanha 3, exemplo do resultado detalhado do simulador | `docs/dominio/leis-de-incentivo.md`, seção 3.5; `docs/site/estrutura-e-copy.md`, seção 4.7; `docs/playbooks/campanhas.md`, seção 5 |
| A3 | Quantos patrocinadores (PJ e PF) e quanto a Prospekto captou em 2023, 2024 e 2025, por mecanismo e por cidade; ticket médio; maior patrocinador; quais patrocinadores e proponentes autorizam citação de nome e valor | Daniela | As metas de KPI deixam de ser hipóteses; prova social no site, no LinkedIn e nas peças | `docs/estrategia/personas-e-funis.md`, seção 10; `docs/estrategia/mercado-e-posicionamento.md`, seção 10 |
| A4 | Quais municípios a Prospekto já atendeu (consultoria, PNAB, editais) e com que instrumento de contratação (dispensa, inexigibilidade, licitação)? | Daniela | Página `/municipios`, campanha 4, score do segmento MUN | `docs/estrategia/personas-e-funis.md`, seções 3.4 e 11 |
| A5 | Biografia da Daniela (formação, anos de atuação, projetos elaborados, aprovados e captados, municípios atendidos, cursos ministrados); CNPJ, endereço e cidade-sede; identidade visual (logotipo, cores) ou adoção da paleta sugerida; fotos autorizadas; materiais existentes (vídeos, depoimentos, releases, relatórios de contrapartidas) | Daniela, sócio | `/sobre`, rodapé, política de privacidade, dados estruturados, kit de networking, perfil do LinkedIn | `docs/site/estrutura-e-copy.md`, seções 4.5, 7.2 e 11; `docs/playbooks/networking.md`, seção 5 |
| A6 | De onde saíram "545 mil empresas no lucro real" e "5% usam" do guia? A Daniela aceita a edição revisada (6% para PF, 7% com esporte, "menos de 3%", estatísticas do MinC 2025, FGV 2024, CNI 7,4 milhões) com PDF aprovado até 16/10/2026 e quem a produz? | Daniela (texto), sócio (diagramação) | Lead magnet principal, página `/guia`, kit impresso da Mercopar, calendário do LinkedIn | `docs/visao.md`, "Nota de revisão"; `docs/site/estrutura-e-copy.md`, seção 10.3; `docs/estrategia/mercado-e-posicionamento.md`, seção 4 |

### B. Remuneração, contratos e jurídico

| # | Pergunta | Quem responde | Destrava | Detalhe em |
|---|---|---|---|---|
| B1 | Como a Prospekto é remunerada hoje em cada projeto (rubrica de captação de até 10% com teto de R$ 150 mil, custos administrativos, contrato à parte com o patrocinador)? Cobra captação? Em que percentual, com que contrato e de quem? Existe modelo de termo de patrocínio e de contrato de captação revisado por advogado? | Daniela | `commission.ts` e a tela de aportes, página `/proponentes`, FAQ de contadores, estágio `termo` | `docs/dominio/leis-de-incentivo.md`, seção 2.8; `docs/estrategia/mercado-e-posicionamento.md`, seções 6 e 10; `docs/playbooks/parceiros-contadores.md`, seção 7.1 |
| B2 | Parceria com contadores: quais escritórios da Serra a Daniela atende ou conhece, quais já indicaram cliente, algum sócio ativo no SESCON Serra Gaúcha ou no CRC-RS; existe acordo ou remuneração combinada? Ela aceita o modelo de co-marketing sem comissão até parecer jurídico? Há advogado de direito cultural de confiança para o parecer e o acordo de parceria? | Daniela | Programa de parceria, página `/contadores` (o que o escritório ganha), campo `modelo_remuneracao` no CRM, meta de 5 escritórios | `docs/playbooks/parceiros-contadores.md`, seções 3 e 7; `docs/site/estrutura-e-copy.md`, seção 11, item 10 |
| B3 | Advogado e LGPD: quem é o encarregado de dados; quem revisa a política de privacidade e o texto de consentimento; é necessário registrar hash de IP no consentimento e reter por 24 meses; cláusula de transferência internacional (Vercel e Resend fora do Brasil; Neon em São Paulo; Inngest e R2 na Fase 2); dispensa de banner para analytics sem cookies; contrato de operador entre hub e tenants e modelo tripartite para captadores credenciados (Fase 2) | Daniela (contrata), advogado | `/privacidade`, tabela `consents`, riscos aceitos do ADR, rede de captadores da mentoria | `docs/arquitetura/ADR-001-stack.md`, seções 6 e 7; `docs/arquitetura/modelo-de-dados.md`, seção 3.6; `docs/produto/mentoria-e-curso.md`, seção 11 |
| B4 | Para pessoa física, qual instrumento é usado hoje (termo, carta de patrocínio ou só depósito identificado)? Já houve patrocinadores PF vindos da diretoria de empresas patrocinadoras? | Daniela | Estágio `termo` no funil PF, campanha PF de novembro | `docs/estrategia/personas-e-funis.md`, seções 7.3 e 11 |
| B5 | Tempo real de emissão do recibo por mecanismo (SALIC, Ancine, CHP da LIC-RS)? | Daniela | SLA do estágio `recibo` (hoje 5 dias úteis [verificar]) | `docs/estrategia/personas-e-funis.md`, seção 8.1 |
| B6 | LIC-RS: qual percentual de captação os editais da Sedac permitem na planilha; qual o prazo de captação após a habilitação; a tabela de faixas (Lei 13.490/2010, art. 6º) confere com a Sedac; a Daniela conhece na prática os limites de custo de captação na LIC-RS e no art. 1º-A? | Daniela, Sedac | Módulo LIC-RS do simulador (publicado com aviso, decisão D2), campanha 6, playbooks com "[verificar]" | `docs/dominio/leis-de-incentivo.md`, seção 6.1; `docs/site/simulador-spec.md`, seção 13; `docs/playbooks/campanhas.md`, seção 8 |
| B7 | A Prospekto atua ou pretende atuar na LIC de Caxias do Sul (novos projetos suspensos em 2026) e nas prefeituras de Bento Gonçalves, Farroupilha, Gramado, Flores da Cunha e Garibaldi (PNAB e eventuais leis municipais)? | Daniela | Página `/municipios`, campanha 4, mapa de entidades | `docs/dominio/leis-de-incentivo.md`, seção 6.3 |
| B8 | Metas comerciais: a Daniela aceita a meta de concentração (nenhum patrocinador acima de 20% da captação anual)? Há interesse em cadastrar a carteira no BIP RS (Prosas) e no Incentiv.me como canais complementares? | Daniela | KPI de concentração; canais complementares da carteira | `docs/estrategia/personas-e-funis.md`, seção 10; `docs/estrategia/mercado-e-posicionamento.md`, seção 10 |

### C. Números do simulador e das peças

| # | Pergunta | Quem responde | Destrava | Detalhe em |
|---|---|---|---|---|
| C1 | LC 224/2025: o simulador já aplica 3,6% por padrão na PJ (decisão D1), com o valor de 4% ao lado e interruptor visível. Há posição do contador ou do advogado da Prospekto, e a Daniela concorda em comunicar "até 4% (3,6% com a LC 224/2025)" nas peças? | Daniela, contador | Texto das campanhas e do site; ADR-002 | `docs/site/simulador-spec.md`, seção 13.1; `docs/dominio/leis-de-incentivo.md`, seção 2.5 |
| C2 | Alíquota de CSLL e tratamento do adicional de 10% na faixa de custo líquido do art. 26: um contador parceiro valida antes da publicação? | Contador parceiro | Seção 4.5 do simulador (economia como despesa operacional) | `docs/site/simulador-spec.md`, seções 4.5 e 13.2 |

### D. Operação e equipe

| # | Pergunta | Quem responde | Destrava | Detalhe em |
|---|---|---|---|---|
| D1 | Quem opera o CRM e cumpre os SLAs de follow-up além da Daniela: o sócio com quantas horas por semana, alguma assistente? A rotina de 10 a 12 horas semanais da Daniela e 8 a 10 do sócio é viável? (visão 5: premissa atual é a Daniela sozinha) | Daniela, sócio | Usuários do seed (`owner`, `operator`), viabilidade dos SLAs da seção 8 de personas, assentos de ferramentas | `docs/visao.md`; `docs/estrategia/personas-e-funis.md`, seção 11; `docs/playbooks/README.md`, "Rotina semanal" |
| D2 | A Daniela aceita: responder leads por WhatsApp a partir do CRM em até 1 dia útil, sem automação por API; um CRM sem kanban, desenhado para desktop, com o e-mail diário como rotina principal; login com senha (ou prefere link mágico)? | Daniela | UX do CRM, plugin `magicLink`, SLA do estágio `novo` | `docs/arquitetura/propostas/proposta-c-simplicidade.md`, seção 9; `docs/arquitetura/ADR-001-stack.md`, seção 4; `docs/site/estrutura-e-copy.md`, seção 11 |
| D3 | As mensagens de LinkedIn e WhatsApp podem sair em nome da Daniela? Quem responde e em quanto tempo? A conta do LinkedIn está ativa e com quantas conexões? Aceita assinar o Sales Navigator (cerca de US$ 120/mês) a partir do segundo mês? | Daniela | Playbook de LinkedIn, cadência de 15 convites por dia, lista mensal de contas | `docs/playbooks/linkedin.md`, seções 2, 5.4 e 6 |
| D4 | Existe base de contatos hoje (patrocinadores, proponentes, municípios, contadores)? Como foi coletada (base legal LGPD) e quem tem consentimento para e-mail e WhatsApp? | Daniela, sócio | Importação CSV, primeiro disparo da campanha 1, renovação de janeiro | `docs/playbooks/campanhas.md`, seção 1.2 |
| D5 | A Daniela é associada a CIC Caxias, CIC-BG, SIMECS, Sindilojas, SESCON Serra ou CRC-RS? Já palestrou em alguma? Há relação prévia com Amesne e Famurs? Qual a cidade-sede real da Prospekto? | Daniela | Mapa de entidades, rodízio de palestras, página `/sobre` | `docs/playbooks/networking.md`, seção 2; `docs/estrategia/personas-e-funis.md`, seção 7.4 |
| D6 | Verba para anúncios de teste (hipótese de R$ 60 por dia por 14 dias em Meta e Google) e para impressão do kit antes da Mercopar (20/10)? Existe conta WhatsApp Business no nome da empresa? | Daniela, sócio | Campanha 1 (anúncios), kit de eventos, respostas rápidas de agendamento | `docs/playbooks/campanhas.md`, seção 3.5; `docs/playbooks/README.md`, "Antes de começar" |
| D7 | Agendamento de reuniões: manter o modelo manual (dois horários por WhatsApp) ou adotar link de agenda (Cal.com ou Google Agenda)? Decisão atual: manual até passar de 20 reuniões por mês | Daniela | Regra comum dos playbooks, página de obrigado | `docs/playbooks/README.md`, "Regras comuns"; `docs/site/estrutura-e-copy.md`, seção 10.4 |

### E. Produto digital

| # | Pergunta | Quem responde | Destrava | Detalhe em |
|---|---|---|---|---|
| E1 | Qual formato a Daniela consegue entregar (mentoria em coorte, curso gravado, consultoria em grupo) e qual preço de referência? Qual o valor-hora dela na consultoria? Quais cursos, ementas e materiais já tem prontos e quantas horas de aula já deu? | Daniela | Formato e preço da coorte (hipótese: R$ 1.497 e R$ 1.997), currículo, comparação de receita por hora | `docs/produto/mentoria-e-curso.md`, seções 3, 4, 5 e 11 |
| E2 | Que noites da semana ela consegue reservar por 8 semanas seguidas em março e abril de 2027? Prefere validar em janeiro e fevereiro de 2027 (plano) ou antecipar para outubro e novembro de 2026, competindo com a campanha de fim de ano? | Daniela | Cronograma de validação e data da turma (09/03/2027) | `docs/produto/mentoria-e-curso.md`, seção 6 |
| E3 | Aceita usar casos reais da carteira (com autorização dos proponentes) como material de aula? Quem responde dúvidas dos alunos entre as aulas? Há secretarias de cultura ou produtoras da Serra que já pediram capacitação? | Daniela, sócio | Currículo, suporte, turma fechada para municípios | `docs/produto/mentoria-e-curso.md`, seções 4, 7.3 e 11 |
| E4 | Plataforma de venda (Kiwify, Hubla, Hotmart ou outra); a Prospekto já vendeu curso antes e com que resultado; regime tributário da Prospekto e enquadramento da venda de curso pelo contador (NFS-e, ISS) | Daniela, contador, sócio | Webhook que alimenta o pipeline `alunos`, receita líquida da coorte | `docs/produto/mentoria-e-curso.md`, seção 7.1; `docs/arquitetura/ADR-001-stack.md`, seção 7 |

### F. Infraestrutura e domínio

| # | Pergunta | Quem responde | Destrava | Detalhe em |
|---|---|---|---|---|
| F1 | Quem administra o DNS de `prospekto.com.br`, existe site hoje, onde está hospedado o e-mail `projetos@prospekto.com.br` e é possível configurar SPF, DKIM e DMARC? (visão 4) Sem isso o Resend não verifica o domínio e o site não aponta para o Vercel; alternativa provisória: `onboarding@resend.dev` só para testes, ou SMTP do provedor atual via Nodemailer | Sócio, Daniela | Deploy no domínio, remetente do Resend, primeiro envio da campanha 1 | `docs/visao.md`; `docs/arquitetura/scaffold.md`, seção 10; `docs/arquitetura/propostas/proposta-c-simplicidade.md`, seção 4.6 |
| F2 | Aceitam pagar o Vercel Pro (US$ 20/mês, cerca de R$ 105) desde o dia em que o primeiro formulário público for publicado, ou preferem o plano B (Cloudflare Workers ou Railway) com mais atrito? Há objeção a hospedar dados de leads fora do Brasil (ver B3)? | Daniela, sócio | Data do deploy público (meta 19/10/2026) | `docs/arquitetura/ADR-001-stack.md`, seções 4, 5 e 6 |
| F3 | O "CRM que a gente fez" (áudio 1): qual stack, tem código, dados ou testes reutilizáveis; quais estágios e campos a Daniela usa de fato e devem entrar no seed? (visão 2: código não é reaproveitado, só lições e seed) | Sócio | Seed do tenant `prospekto`, estimativa da semana 2 | `docs/visao.md`; `docs/arquitetura/propostas/proposta-c-simplicidade.md`, seção 3 |
| F4 | O Rafael desenvolve só no ambiente em nuvem ou também em máquina própria? Define se o fluxo padrão é PGlite local ou branch `dev` do Neon | Rafael | Fluxo de desenvolvimento e variáveis locais | `docs/arquitetura/scaffold.md`, seção 9 |
| F5 | Fase 2 (não bloqueia a Fase 1): a fomento.ai é marca-irmã e poderia ser o segundo tenant antes de qualquer cliente externo? (visão 1: só referência) Domínio do hub: subzona `hub.prospekto.com.br` ou domínio novo? Cobrança: Stripe ou Asaas? Aceita-se uma quinta semana na Fase 1 em troca da arquitetura final, ou vale a ordem de corte? Postgres 17 fixado no Neon e paridade local | Sócio, Rafael | Planejamento da Fase 2 | `docs/visao.md`; `docs/arquitetura/propostas/proposta-b-hub.md`, seção 15; `docs/arquitetura/ADR-001-stack.md`, seção 7 |

### G. Pendências técnicas do scaffold (o Rafael resolve ao executar)

| # | Pendência | Onde |
|---|---|---|
| G1 | TypeScript fixado em 5.9.3 porque a tag `latest` já é 7.0.2; subir só quando o Next 16 declarar suporte | `docs/arquitetura/scaffold.md`, passo 2.5 |
| G2 | Zod 4.6.5: confirmar na compilação o nome `z.treeifyError` usado em `src/env.ts` (alternativa: `parsed.error.issues`) | `docs/arquitetura/scaffold.md`, seção 5.2 |
| G3 | Better Auth 1.7.7: forma recomendada de criar usuário no seed com `disableSignUp` (API interna ou inserção com hash de `better-auth/crypto`) | `docs/arquitetura/scaffold.md`, seção 5.6 |
| G4 | Versão do `pg_dump` no runner `ubuntu-latest` precisa coincidir com o Postgres 17 do Neon; confirmar as majors de `actions/checkout`, `actions/setup-node` e `actions/upload-artifact` antes do primeiro push | `docs/arquitetura/scaffold.md`, seções 5.13 e 5.14 |
| G5 | `ip_hash` em `consents` e retenção de 24 meses dependem do advogado (pergunta B3) | `docs/arquitetura/modelo-de-dados.md`, seção 3.6 |
| G6 | Login com senha ou link mágico (pergunta D2); o scaffold usa senha | `docs/arquitetura/ADR-001-stack.md`, seção 4 |
| G7 | Criar `docs/arquitetura/ADR-002-defaults-simulador.md` repetindo as decisões D1 e D2 com data e responsável | `docs/site/simulador-spec.md`, seção 13.1 |
