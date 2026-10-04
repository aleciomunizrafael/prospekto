# Documentação do Prospekto

Índice de tudo o que está em `docs/`, com uma linha por documento e a ordem de leitura recomendada. O contexto geral do projeto está em `../README.md`; o documento-âncora é `visao.md`, do qual todos os outros derivam e que nenhum deles repete.

Convenções de toda a pasta: português do Brasil; toda afirmação legal, tributária ou numérica carrega a fonte (lei e artigo, URL ou documento de `fontes/`); o que não foi confirmado em fonte primária recebe a marca literal "[verificar]"; data de referência do kickoff: 03/10/2026.

## Ordem de leitura recomendada

| Passo | Leia | Por quê |
|---|---|---|
| 1 | `visao.md` | Quem é a Prospekto, o problema, as duas fases, o modelo de receita, a nota de revisão dos números do guia e as cinco decisões provisórias |
| 2 | `fontes/transcricao-audios-2026-10-03.md` e `fontes/materiais/*.txt` | O briefing original do sócio e os materiais da própria Prospekto; é o que cada documento derivado interpreta |
| 3 | `dominio/leis-de-incentivo.md`, depois `dominio/glossario.md` | Regras dos mecanismos (Rouanet art. 18 e 26, Audiovisual art. 1º-A, FSA, PNAB, LIC-RS, municípios), limites, prazos, vedações e o que a lei sustenta ou não no discurso de venda |
| 4 | `estrategia/mercado-e-posicionamento.md`, depois `estrategia/personas-e-funis.md` | Tamanho do mercado, concorrentes, remuneração, posicionamento; personas, pipelines, estágios, score, campos de lead e KPIs (contrato com o código) |
| 5 | `site/estrutura-e-copy.md` e `site/simulador-spec.md` | O que o site diz e faz, formulários, LGPD, SEO, design, integrações; regras de cálculo e telas do simulador |
| 6 | `playbooks/README.md`, depois os quatro playbooks | Como a prospecção opera a partir de 05/10/2026: rotina semanal, LinkedIn, networking, campanhas, parceria com contadores |
| 7 | `produto/mentoria-e-curso.md` | O produto digital: formato, currículo, preço, plano de validação com critérios de seguir ou parar |
| 8 | `arquitetura/ADR-001-stack.md`, `arquitetura/ADR-002-defaults-simulador.md`, `arquitetura/modelo-de-dados.md`, `arquitetura/scaffold.md`, `arquitetura/next16-convencoes.md` | A decisão de stack, o esquema de banco, o plano executável do scaffold e as convenções do Next.js 16; as três propostas em `arquitetura/propostas/` são leitura opcional para entender o que o ADR julgou |
| 9 | `roadmap.md` | Fases, sprints de duas semanas, épicos, histórias com critérios de aceite, métricas, marcos de decisão e as primeiras duas semanas |

Trilhas por papel:

- Rafael (desenvolvedor): 1, 8, 5, 4 (seções 8 e 9 de personas), 3 (seções 2.3, 2.8 e 7), 9.
- Sócio (operação e CRM): 1, 2, 6, 4, 5 (seções 5 e 10), 7, 9.
- Daniela (rosto e voz): 1 (em especial a nota de revisão e as perguntas), 6 (`playbooks/README.md` e a lista "Antes de começar"), 7 (seções 1, 5 e 6), e as perguntas em aberto de `../README.md`.

## Índice por pasta

### Raiz de `docs/`

| Arquivo | O que é |
|---|---|
| `visao.md` | Documento-âncora: empresa, problema, fases 1 e 2, modelo de receita, princípios, nota de revisão dos números e tabela de perguntas com decisões provisórias |
| `roadmap.md` | Fase 0 concluída, Fase 1 em sprints de duas semanas (épicos, histórias, dependências, definição de pronto, métricas, marcos de decisão, primeiras duas semanas) e Fase 2 em alto nível |
| `README.md` | Este índice |

### `fontes/`

| Arquivo | O que é |
|---|---|
| `transcricao-audios-2026-10-03.md` | Transcrição dos dois áudios de briefing do sócio (o que é o projeto; a visão de hub) e a lista dos materiais enviados |
| `materiais/contabilizando-cultura-guia-gratuito.pdf` e `.txt` | Guia gratuito da Prospekto para empresas e contadores (lead magnet existente); contém os números corrigidos na nota de revisão de `visao.md` e só volta a circular na edição revisada |
| `materiais/contabilizando-cultura-apresentacao.pdf` e `.txt` | Versão em slides do mesmo guia; mesma ressalva |
| `materiais/exemplo-projeto-a-tacada-perfeita-deck.txt` | Texto do pitch deck de um longa-metragem (Ocotea Filmes) em captação pelo art. 1º-A, com FSA aprovado; exemplo real de projeto da carteira; telefones removidos |
| `materiais/referencia-fomento-ai-apresentacao.txt` | Apresentação institucional da fomento.ai, usada só como referência de estrutura editorial e de modelo de parceria com consultorias (decisão provisória 1 de `visao.md`) |

### `dominio/`

| Arquivo | O que é |
|---|---|
| `leis-de-incentivo.md` | Referência dos mecanismos: Lei Rouanet (art. 18 e 26, limites, LC 224/2025, fluxo no SALIC, custos de captação, vedações), Lei do Audiovisual, FSA e BRDE, PNAB, LIC-RS, FAC-RS, mecanismos municipais da Serra, tabela comparativa, exemplos numéricos, calendário, argumentos que a lei sustenta ou não, tabela de fontes e verificação |
| `glossario.md` | Termos de atores, mecanismos, processo, tributos e CRM, com definição curta e remissão ao documento de leis |
| `parametros-simulador.json` | Fonte única de percentuais, limites, fatores e exemplos do simulador, com data de atualização, status de verificação por parâmetro e URLs das fontes; o código lê este arquivo, não o copia |

### `estrategia/`

| Arquivo | O que é |
|---|---|
| `mercado-e-posicionamento.md` | Série histórica da Rouanet, distribuição regional e lugar do RS, concentração, ticket médio, sazonalidade, universo elegível que não usa o incentivo, concorrentes, como captadores se remuneram, posicionamento da Fase 1, riscos, Fase 2 e os sinais que justificam investir nela, perguntas em aberto, fontes |
| `personas-e-funis.md` | Seis personas (PJ, CONT, PF, MUN, PROP, ALUNO), sazonalidade, regras de desqualificação e score, lead magnets, funis, os cinco pipelines com estágios, critérios e SLAs, campos de lead, entidades do CRM, KPIs do funil e perguntas para a Daniela; nomes de segmento, estágio e campo são contrato com o código |

### `site/`

| Arquivo | O que é |
|---|---|
| `estrutura-e-copy.md` | Especificação do site público: objetivos, públicos, sitemap, copy das páginas principais, projeto exemplo, formulários e regras LGPD, respostas automáticas, política de privacidade, SEO, direção de design e acessibilidade, analytics, integrações (WhatsApp, e-mail, guia em PDF, CRM, carteira), perguntas em aberto |
| `simulador-spec.md` | Especificação do simulador de incentivo fiscal: entradas, regras de cálculo por mecanismo, saídas, gate de captura, textos legais, estados de erro, exemplos esperados que viram testes, telas, arquitetura e as decisões D1 (LC 224 por padrão) e D2 (LIC-RS publicada com aviso) |

### `playbooks/`

| Arquivo | O que é |
|---|---|
| `README.md` | Índice dos quatro playbooks, regras comuns, divisão de trabalho entre Daniela e sócio, rotina semanal e mensal, próximos 90 dias, metas do primeiro ciclo e checklist "Antes de começar" |
| `linkedin.md` | Perfil da Daniela e página da Prospekto, calendário de conteúdo de 8 semanas (05/10 a 29/11/2026), busca de contas, cadência e modelos de mensagem por persona, limites de uso, métricas e registro no CRM (colunas da planilha provisória) |
| `networking.md` | Mapa de entidades e eventos da Serra e do RS (Mercopar 20 a 23/10/2026, Feira do Livro, Natal Luz, CIC, SESCON, CRC-RS), roteiro de abordagem, pitches de 30 segundos e 2 minutos, kit de materiais, conversão de contato em reunião, rotina mensal e métricas |
| `campanhas.md` | Calendário anual de seis campanhas alinhado ao calendário fiscal e aos editais, sequências de e-mail e WhatsApp prontas, landing pages, LGPD e consentimento, anúncios de teste e métricas por campanha |
| `parceiros-contadores.md` | Programa de parceria com escritórios contábeis: proposta de valor, modelo de co-marketing sem comissão até parecer jurídico, onboarding e diagnóstico de carteira, kit, comunicação, acordo e pendências jurídicas, webinar mensal, FAQ, rotina e métricas |

### `produto/`

| Arquivo | O que é |
|---|---|
| `mentoria-e-curso.md` | Produto digital: públicos, formatos (coorte de 8 semanas como primeiro lançamento), currículo, comparáveis de preço, hipóteses de preço e meta mínima, plano de validação de 6 semanas com critérios de seguir ou parar, operação (plataforma, aulas, suporte, certificado), ligação com a Fase 2, métricas, riscos e perguntas |

### `arquitetura/`

| Arquivo | O que é |
|---|---|
| `deploy.md` | Passo a passo do deploy: branch main, segredos, Vercel, Neon pelo Marketplace, Resend (chave, domínio, webhook), seed do primeiro acesso, domínio, plano Pro, backup e checklist de verificação |
| `ADR-002-defaults-simulador.md` | Padrões do simulador: LC 224/2025 aplicada por padrão na pessoa jurídica (D1) e módulo LIC-RS publicado com aviso (D2), com o que faria cada decisão ser revista |
| `ADR-001-stack.md` | Decisão de stack e forma do sistema da Fase 1: critérios e pesos, pontuação das três propostas, decisão item a item, stack em uma página, alternativas rejeitadas, consequências e riscos, o que fica para a Fase 2, fontes |
| `modelo-de-dados.md` | Esquema Drizzle sobre PostgreSQL: convenções, diagrama, as onze entidades (tenants, auth, organizations, contacts, leads, consents, simulations, cultural_projects, contributions, activities, form_attempts), enums, índices e restrições, regras de negócio, como os formulários chegam ao modelo, o que não está modelado |
| `scaffold.md` | Plano executável do scaffold: pré-requisitos, comandos na ordem, `package.json`, estrutura de pastas, conteúdo dos arquivos de base, convenções, critério de pronto, ordem das tarefas seguintes, variáveis por ambiente e deploy |
| `next16-convencoes.md` | O que mudou no Next.js 16.3.8 e afeta o código (Turbopack, APIs assíncronas, `proxy.ts`, cache, lint, imagens, React) e os padrões que o repositório segue |
| `propostas/proposta-a-velocidade.md` | Proposta do painel com a lente "um desenvolvedor coloca tudo no ar em quatro semanas": stack, custos, multi-tenant mínimo, modelo de dados, scaffold, calendário de quatro semanas, riscos |
| `propostas/proposta-b-hub.md` | Proposta com a lente "a Fase 2 é o produto": monorepo, RLS e dois papéis de banco, organizações e convites, domínios por tenant, Inngest, R2, plano de evolução, riscos e custos; fonte das regras baratas de multi-tenant que o ADR adotou |
| `propostas/proposta-c-simplicidade.md` | Proposta com a lente "manutenção por um dev por anos e operação pela Daniela sem suporte": menos serviços, CRM próprio contra pronto, operação em quatro telas com e-mail diário, exportação e importação CSV, ordem de construção; base da decisão do ADR |
