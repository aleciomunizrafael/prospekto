# ADR-004: estrutura de navegação e telas do CRM no padrão do Trilis, mantendo as regras da Prospekto

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data | 13/10/2026 |
| Decide | Dono do projeto (Rafael), com a Daniela como usuária de referência; decisões D-A a D-H fechadas pelo orquestrador e registradas aqui como dadas |
| Contexto de negócio | `docs/visao.md`; operação em `docs/playbooks/README.md` (rotina semanal, regra de registro da reunião marcada) |
| Convenções de código | `AGENTS.md`, `docs/arquitetura/next16-convencoes.md`, `docs/design/crm-design-system.md`, `docs/arquitetura/modelo-de-dados.md` (seções 1, 3.10, 5 e 6) |
| Decisões anteriores que este ADR respeita | ADR-001 (stack, R-15, R-16), ADR-003 (IA com a pessoa no comando; `activities` como registro do que a pessoa fez), design system D1 a D20 (D11 é revista na seção 6.7) |
| Documento derivado | `estrutura-plano.md` (plano executável: Fundação, cinco frentes de arquivos disjuntos, Integração e QA) |
| Revisão | 13/10/2026: duas críticas adversariais (domínio, dados e segurança; UX, design system e viabilidade) incorporadas; o que mudou e o que foi acolhido com ajuste está na seção "Revisão de 13/10/2026" do plano |
| Fontes lidas em 13/10/2026 | Código do Trilis em `/home/user/aleciomunizrafael/trilis-crm` (`src/pages/crm/Pipeline.tsx`, `src/pages/tasks/Tasks.tsx`, `src/pages/prospect/{Prospects,ProspectListDetail,ProspectDetail,WhatsAppSend}.tsx`, `src/lib/prospecting.ts`, `src/components/CommandPalette.tsx`, `src/pages/Dashboard.tsx`, `src/pages/crm/ClientDetail.tsx`); síntese e mapas produzidos na etapa anterior (`scratchpad/trilis-sintese.md`, `scratchpad/trilis-mapas.md`); código da Prospekto que este ADR toca (shell em `src/components/crm/shell/`, `src/app/(app)/app/leads/page.tsx`, `src/components/crm/forms/stage-move-dialog.tsx`, `src/lib/repos/{leads,activities,organizations,contributions,digest}.ts`, `src/components/crm/today.tsx`, `src/app/(app)/app/organizacoes/[id]/page.tsx`, `src/lib/db/schema/*`, `drizzle/`, `src/app/api/cron/daily/route.ts`, `tests/{isolation,shell-nav,auth-guard}.test.ts`) |

## 1. Pergunta

Como o CRM da Prospekto passa a ter a mesma organização de módulos e o mesmo jeito de trabalhar do Trilis (painel com medidores, pipeline em quadro com arrastar e soltar, prospecção com listas de ligação e cadência por WhatsApp, clientes com ficha completa, tarefas em quadro, busca Ctrl+K em qualquer tela) sem perder nada do que a Prospekto já tem e o Trilis não: estágios com campos obrigatórios e SLA por pipeline, consentimento LGPD, aportes com termo, depósito, recibo e comissão, multi-tenant com isolamento testado, e a IA do ADR-003?

Decisões já dadas pelo projeto e fora de discussão aqui: stack do ADR-001 (Next 16, Drizzle, Better Auth, Resend, Vitest com PGlite); R-15 (`db` só em `src/lib/repos/`) e R-16 (logs sem e-mail, telefone, CPF ou CNPJ); toda `page.tsx` de `(app)` e toda Server Action começam com `requireSession()`; tema claro "Mesa de trabalho"; português do Brasil na interface; nenhuma biblioteca pesada nova (design system, princípio "nada de bibliotecas pesadas novas", D13).

## 2. Decisão em uma frase

O CRM ganha a arquitetura de informação do Trilis (sete módulos na sidebar, paleta Ctrl+K, painel com réguas de medidores, quadro de leads por pipeline, módulo de Prospecção com listas e cadência, quadro de Tarefas, ficha de organização com histórico) implementada sobre o modelo, as regras e o design system que a Prospekto já tem: duas tabelas novas (`prospecting_lists`, `prospecting_items`), quatro colunas novas em `activities`, uma em `organizations` (`phone`), uma origem nova de lead (`prospeccao`), nenhuma mudança de estágio gravada fora de `moveLeadStage`, nenhuma cor nem fonte do Trilis.

## 3. Contexto

### 3.1 O pedido

Rafael pediu: "quero que a estrutura do CRM fique parecida com o CRM Trilis". Entre as três opções apresentadas na síntese (só estrutura; estrutura mais módulos de operação; réplica completa), ele escolheu o escopo "Navegação e telas": mesma organização de módulos, adaptada a leads, aportes e projetos, mantendo as regras atuais. Ficaram fora, por decisão dele: tema escuro (o CRM continua claro, com a identidade da Prospekto), Chat e Docs, telefonia pelo CRM (Twilio).

### 3.2 O que é o Trilis

Sistema interno de uma equipe pequena de prospecção para residenciais geriátricos (todo mundo logado vê e edita tudo), feito como aplicação de página única em React 18 + Vite + Tailwind 3 falando direto com o Supabase, sem servidor próprio, sem tenant, sem papéis, sem testes, com tema escuro (ciano e violeta, Orbitron) e pensado para o celular (barra inferior com os sete módulos, instalável como app). Os sete módulos: Painel (quatro medidores clicáveis, últimas atividades, suas tarefas), Pipeline (kanban de seis colunas fixas com arrastar e soltar livre e ordem manual gravada), Prospecção (listas de estabelecimentos para ligar, com botões de resultado, "Colar lista", WhatsApp em três variações e conversão "Reunião marcada" que cria cliente, negócio e atividade), Clientes (tabela simples e ficha em duas colunas com "Registrar atividade", histórico, negócios, contatos, documentos e anotações com salvamento automático), Chat (canais e mensagens diretas em tempo real), Docs (editor de blocos) e Tarefas (quadro de três colunas com arrastar e soltar, prioridade, responsável e push). Busca global por Ctrl+K em uma janela que procura em cinco tabelas, cinco resultados de cada, e só navega.

### 3.3 O que foi mapeado

A etapa anterior leu os dois sistemas e produziu a comparação área a área (`trilis-sintese.md`) e os mapas detalhados do Trilis (`trilis-mapas.md`: shell e paleta, CRM e kanban, prospecção, tarefas, docs e chat, com rotas, telas, modelo de dados, padrões e notas de porte). As conclusões que este ADR assume:

- A Prospekto já tem a forma do Trilis onde importa menos: shell com sidebar e barra inferior a partir de um único mapa de módulos (`modules.ts`), cabeçalho com busca e "Novo ▾", detalhe de lead em duas colunas com `NextStepCard`, "Registrar atividade" e linha do tempo (decisões D1 e D14 do design system), estados de vazio, carregamento e erro.
- O que falta para "parecer" e "funcionar como" o Trilis: o quadro de leads, a paleta de busca, o painel com réguas e últimas atividades, o módulo de Prospecção, o quadro de Tarefas e a ficha da organização com histórico e notas.
- O que a Prospekto não pode perder: regras de estágio declarativas (`STAGE_REQUIREMENTS`, `allowedStageMoves`, `requirementsForMove`) aplicadas em `moveLeadStage`; SLA em dias úteis; consentimento append-only e bloqueio de e-mail sem consentimento; aportes com fluxo e recálculo; projetos publicados no site; IA com a pessoa no comando; isolamento por tenant.
- Diferenças técnicas que condicionam o porte: não há realtime (Server Components na Vercel, sem WebSocket), então todo fluxo é Server Component mais Server Action mais `refresh()`; `db` só nos repositórios; `activities` exige vínculo com lead, organização, projeto ou aporte; `leads.email` é obrigatório e único por segmento; `leads` não tem coluna de posição.

## 4. Trilis → Prospekto, módulo a módulo

| Módulo do Trilis | Na Prospekto | Rota | O que muda em relação ao Trilis | Esforço |
|---|---|---|---|---|
| Painel ("Olá, Nome"; régua de 4 medidores; últimas atividades; suas tarefas) | **Painel**: a tela "Hoje" continua como fila de trabalho e ganha a régua de medidores com hairlines, a segunda régua "Carteira", o bloco "Últimas atividades" (8) e o bloco "Minhas tarefas" (8) | `/app` | Não é um retrato da empresa no lugar da fila: é a fila mais o retrato. "Suas tarefas" filtra por `owner_user_id = usuário da sessão` | pequeno |
| Pipeline (kanban de 6 colunas fixas, arrasto livre, ordem manual, modal de edição) | **Pipeline**: a lista de leads ganha a alternância Lista/Quadro; o quadro tem uma coluna por estágio do pipeline escolhido nas abas; soltar abre o "Mover para" já no destino | `/app/leads` (`?view=quadro` ou `lista`) | Colunas vêm de `STAGES[pipeline]` (6 a 10); só destinos de `allowedStageMoves` aceitam soltura; nada é gravado no drop; sem ordem manual; clique abre o detalhe, não um modal; "Ganho" não existe (o fechamento é recibo e renovação; o dinheiro vive em `contributions`) | médio |
| Prospecção (listas → lista → ficha; Colar lista; botões de resultado; WhatsApp em 3 variações; Reunião marcada cria cliente + negócio + atividade; ligação por Twilio; treinamento) | **Prospecção**: módulo novo com `prospecting_lists` e `prospecting_items` (pré-lead: nome, telefone, gancho, endereço, porte, informações, status de cadência); três rotas; "Colar lista" com parser puro; botões de resultado gravando status e `activities.ligacao`; modal de WhatsApp em 3 variações na voz da Daniela; "Reunião marcada" cria organização, contato, lead em Patrocinadores e `activities.reuniao` | `/app/prospeccao`, `/app/prospeccao/[listId]`, `/app/prospeccao/[listId]/[itemId]` | Telefone normalizado E.164; origem dos dados obrigatória na lista (LGPD, art. 18); o lead criado exige e-mail (pedido no diálogo); o estágio inicial do lead convertido é `qualificado` (seção 6.6); sem Twilio e sem treinamento | grande |
| Clientes (tabela com busca em memória) e ficha (registrar atividade + histórico; negócios, contatos, documentos, anotações com autosave) | **Organizações**: a lista continua; a ficha adota a grade do Trilis: "Registrar atividade" e "Histórico" na coluna principal; "Leads e aportes", "Contatos", "Dados" e "Notas" (salvamento automático) na lateral | `/app/organizacoes`, `/app/organizacoes/[id]` | Sem exclusão física (LGPD e histórico pedem arquivar); sem documentos em bucket público (não há storage; fica para a tabela `files` da Fase 2); "Negócios" vira leads vinculados com estágio e valor do aporte aberto | médio |
| Tarefas (quadro A fazer / Em andamento / Concluído; prioridade; responsável; tarefa sem cliente; push) | **Tarefas**: quadro de três colunas sobre `activities.type = 'tarefa'` com `started_at`, `priority` e `position` novos; tarefa pode existir sem vínculo; diálogo Nova/Editar com responsável, prioridade, prazo e vínculo opcional | `/app/tarefas` (`?dono=eu`, `?atrasadas=1`, `?vencem=hoje`, `?task=`, `?novo=1`) | Sem push: "Tarefas atribuídas a você" entra no e-mail diário; excluir pede confirmação (D16); prazo com hora (`timestamptz`) e `DateHint` | médio |
| Busca Ctrl+K (paleta sobre 5 tabelas, 5 por tipo, só navega) | **Busca**: paleta em qualquer tela (Dialog do base-ui) sobre leads, organizações, projetos, aportes, tarefas e itens de prospecção, 5 por tipo, chip de tipo e link real para o registro; mais navegação para os módulos e "Novo…"; `/app/busca` vira o "ver todos" | atalho Ctrl/Cmd+K; `/app/busca?q=` | Dados nunca saem direto do banco para o cliente: Server Action `searchAllAction` com `requireSession`; a tecla `/` continua focando o campo do header (revisão de D11, seção 6.7) | pequeno |
| Chat | Fora (decisão do dono; sem realtime na arquitetura) | | A equipe continua no WhatsApp | |
| Docs | Fora (decisão do dono) | | Notas longas ficam em `organizations.notes` com autosave (esta entrega) e em `activities.nota` | |
| Telefonia pelo CRM (Twilio) e Treinamento de ligações | Fora (decisão do dono); só o padrão de tela: "Ligar (54) 3000-0000" como link `tel:` com o número visível, WhatsApp ao lado, botões de resultado logo abaixo | | Nem no Trilis a telefonia está ligada | |
| Identidade visual (escuro, ciano e violeta, Orbitron, holo, glow) | Fora (decisão D-A) | | Só padrões estruturais já expressos nos tokens da Prospekto | |

## 5. Decisões dadas pelo orquestrador (D-A a D-H)

Registradas como dadas; o resto do documento assume estas decisões.

| # | Decisão |
|---|---|
| D-A | Tema claro; nada da identidade visual do Trilis. Portar só padrões estruturais já expressos nos tokens da Prospekto: régua de medidores com hairlines, eyebrow + H1, item ativo com moldura, pills e chips com texto. |
| D-B | Sidebar final, nesta ordem: Painel (`/app`), Pipeline (`/app/leads`, com alternância Lista/Quadro; padrão Quadro no desktop e Lista no celular, lembrado em cookie como a sidebar), Prospecção (`/app/prospeccao`), Organizações (`/app/organizacoes`; detalhe no padrão de ficha do Trilis), Projetos, Aportes, Tarefas (`/app/tarefas`), separador, Exportar. No celular continua 5 itens + "Mais". |
| D-C | Kanban: colunas = `STAGES` do pipeline; soltar nunca grava direto: abre o `StageMoveDialog` existente pré-selecionado no destino; colunas não permitidas (`allowedStageMoves`) esmaecidas durante o arrasto; coluna terminal abre o diálogo de perda; sem ordem manual (ordem por urgência: próxima ação vencida primeiro, depois `stage_entered_at`); caminho sem arrasto preservado (botão "Mover para" no cartão) e teclado. |
| D-D | Prospecção como módulo próprio com tabelas novas `prospecting_lists` e `prospecting_items` (pré-lead), rotas índice → lista → item, "Colar lista" com parser puro, botões de resultado que gravam status + `activities.ligacao`, modal de WhatsApp com 3 variações revisáveis (texto na voz da Daniela, sem presumir a dor do local), "Reunião marcada" em transação criando organização + lead no pipeline Patrocinadores + `activities.reuniao`, no estágio que as `STAGE_REQUIREMENTS` permitirem (justificado na seção 6.6). |
| D-E | Tarefas: quadro com três colunas (A fazer, Em andamento, Concluída) sobre `activities.type = 'tarefa'`; migração com `started_at`, `priority` (baixa, media, alta) e `position`; tarefa pode existir sem vínculo (relaxar o CHECK só para `tarefa`; impacto em Hoje, linha do tempo e e-mail diário avaliado na seção 6.5); diálogo Nova/Editar com responsável, prioridade, prazo e vínculo opcional; "tarefas atribuídas a você" no e-mail diário, sem push. |
| D-F | Busca Ctrl+K como paleta em qualquer tela (Dialog do base-ui; Server Action de busca com `requireSession`; leads, organizações, projetos, aportes, tarefas e itens de prospecção, 5 por tipo, chip de tipo e link real) mais navegação para os módulos; a tecla `/` continua focando o campo do header e `/app/busca` vira o "ver todos" (revisão de D11, registrada na seção 6.7). |
| D-G | Telefonia: só o padrão "Ligar" `tel:` com número visível + WhatsApp + botões de resultado; nada de Twilio. |
| D-H | Tudo multi-tenant (`tenant_id` em toda tabela nova, `tests/isolation.test.ts`); toda `page.tsx` e action começam com `requireSession`; `db` só em `src/lib/repos`; logs sem telefone ou e-mail (R-16); textos em português; componentes do design system existentes (`src/components/crm/ui`, `src/components/ui`). Arrastar e soltar: HTML5 nativo como no Trilis é aceitável, mas `@dnd-kit` foi avaliado (seção 6.11). |

## 6. Decisões fechadas neste ADR

### 6.1 Módulos, rótulos e rotas (D-1)

`src/components/crm/shell/modules.ts` passa a ter, nesta ordem (a ordem é a da sidebar e do teste `tests/shell-nav.test.ts`):

| Chave | Rótulo | Rota | Ícone (lucide) | Sidebar | Barra inferior (celular) | Subpáginas no caminho do header |
|---|---|---|---|---|---|---|
| `painel` | Painel | `/app` (exato) | `LayoutDashboard` | sim, com o contador de vencidos | sim | |
| `pipeline` | Pipeline | `/app/leads` | `SquareKanban` (o lucide-react instalado não exporta `KanbanSquare`, nome antigo do mesmo glifo) | sim | sim | `/app/leads/novo` → "Novo lead"; `/app/leads/[id]` → "Lead" |
| `prospeccao` | Prospecção | `/app/prospeccao` | `PhoneOutgoing` | sim | sim | `/app/prospeccao/[listId]` → "Lista"; `/app/prospeccao/[listId]/[itemId]` → "Empresa" |
| `organizacoes` | Organizações | `/app/organizacoes` | `Building2` | sim | em "Mais" | `/app/organizacoes/[id]` → "Organização" |
| `projetos` | Projetos | `/app/projetos` | `Clapperboard` | sim | em "Mais" | `/app/projetos/novo` → "Novo projeto"; `/app/projetos/[id]` → "Projeto" |
| `aportes` | Aportes | `/app/aportes` | `HandCoins` | sim | em "Mais" | `/app/aportes/[id]` → "Aporte" |
| `tarefas` | Tarefas | `/app/tarefas` | `SquareCheck` | sim | sim | |
| `exportar` | Exportar | `/app/exportar` | `Download` | sim, após separador | em "Mais" | |
| `conta` | Minha conta | `/app/conta` | `UserRound` | não (menu do usuário) | em "Mais" | |
| `busca` | Busca | `/app/busca` | `Search` | não (botão "Buscar…" acima dos itens) | lupa do header abre a paleta | |

Decisões embutidas:

- "Hoje" vira "Painel" como rótulo do módulo; a saudação "Bom dia, Daniela." e a data continuam sendo o `PageHeader` da página (seção 6.8). O `<title>` da aba passa a "Painel".
- "Leads" vira "Pipeline" como rótulo; a rota `/app/leads` e os links existentes não mudam (nenhuma URL quebra; o teste de `describePath` passa a esperar `Pipeline`).
- Barra inferior: Painel, Pipeline, Prospecção, Tarefas e "Mais" (Organizações, Projetos, Aportes, Exportar, Minha conta, Atalhos, Sair). Projetos e Aportes saem dos cinco alvos porque são trabalho de mesa; Prospecção e Tarefas entram porque são o que a Daniela faz com o telefone na mão. Princípio 5 do design system (cinco alvos) mantido.
- Sidebar ganha, acima dos itens, o botão "Buscar…" com `<kbd>Ctrl K</kbd>` (no trilho recolhido, só a lupa com `Tooltip`) e, no rodapé, o bloco do usuário: `Avatar` 32 px, nome e e-mail truncados e o menu (Minha conta, Sair) que hoje fica no avatar do header. O header do desktop mantém caminho, campo de busca e "Novo ▾"; o avatar sai do header para não haver dois menus iguais na mesma tela (atualização da seção 4.1 do design system, seção 7 deste ADR). O e-mail mostrado é o do próprio usuário da sessão; nunca vai ao log.
- "Novo ▾" ganha "Nova tarefa" (`/app/tarefas?novo=1`) e "Nova lista de prospecção" (`/app/prospeccao?nova=1`).
- "Atalhos de teclado" em Minha conta ganha a linha "Ctrl K (Cmd K no Mac): abrir a busca em qualquer tela".

### 6.2 Alternância Lista/Quadro e cookie (D-2)

- Parâmetro `view` em `/app/leads`: `lista` ou `quadro`. Cookie `crm-leads-view` com o mesmo valor (`path=/app`, 1 ano, `samesite=lax`), gravado pelo cliente ao clicar na alternância e lido com `cookies()` na página, como `crm-sidebar` (D12).
- Precedência: `?view=` na URL vence o cookie; o cookie vence o padrão; o padrão é `quadro`. A alternância é um par de links (`?view=lista` e `?view=quadro`, com os demais filtros preservados) envolto num Client Component mínimo que grava o cookie no clique. Função pura `resolveLeadsView(param, cookie)` em `src/lib/crm/leads-view.ts`, testada.
- Padrão Lista no celular: não há como saber o tamanho da tela no servidor sem adivinhar pelo `User-Agent`. Na primeira visita **sem cookie e sem `?view=`**, a página carrega as duas consultas e renderiza as duas visões, o quadro em `hidden md:block` e a lista em `md:hidden`, cada uma com a sua `ViewToggle` (assim o `aria-current` é correto em cada largura); o Client Component, ao montar, grava o cookie em silêncio (`lista` quando `matchMedia("(max-width: 59.99rem)")` casa, abaixo do `md` do projeto, 960 px; senão `quadro`), sem `router.refresh()`. Custo: uma consulta a mais uma vez por aparelho; nenhuma troca de tela. Com cookie ou `?view=`, uma visão só.
- O cookie só é gravado pela alternância (clique em "Lista" ou "Quadro") e pela primeira visita. Links que levam a `?view=lista` por conveniência (o "ver todos os N em Lista ›" do rodapé da coluna) não gravam o cookie: é uma espiada; a navegação seguinte sem `?view=` volta ao que o cookie diz. Enquanto a pessoa está na lista aberta assim, a paginação e os filtros preservam `view=lista` (`leadFiltersToQuery` serializa `view`).
- Em `quadro`: o filtro "Estágio" e a ordenação somem da `Toolbar` (as colunas são os estágios; a ordem é fixa por urgência); busca, segmento, origem, dono, temperatura e "Mostrar perdidos" continuam valendo para as duas visões. `page` é ignorado no quadro (teto de 50 cartões por coluna, com "ver todos os N em Lista ›" no rodapé da coluna quando há mais).
- No celular, `quadro` é permitido (a pessoa escolheu): as colunas rolam na horizontal dentro do próprio elemento com `snap-x` (a única rolagem horizontal admitida, como as abas de pipeline), sem arrasto (DnD nativo não funciona com toque); o caminho é o "Mover para" de cada cartão. Medidas na seção 6.3.

### 6.3 Regras do quadro de leads (D-3)

| Situação | Comportamento |
|---|---|
| Colunas | `STAGES[pipeline]` na ordem do domínio, uma coluna por estágio, rótulo de `stageLabel`, contagem total da coluna (não só os 50 carregados) e, só em Patrocinadores, o subtotal "R$ 350 mil em propostas" = soma de `proposed_amount` dos aportes em `proposta` ou `termo_assinado` dos leads da coluna. O estágio terminal (`perdido` ou `arquivado`) não aparece como coluna por padrão (como `searchLeads` já esconde perdidos); aparece só com "Mostrar perdidos". |
| Ordem dentro da coluna | `next_action_at` ascendente com nulos por último, depois `stage_entered_at` ascendente (o mais antigo no estágio primeiro). Nenhuma coluna `position` em `leads`; nenhuma ordem manual. |
| Cartão | Nome (link real para `/app/leads/[id]`, decisão D10) com `StatusBadge temperature size="sm"` (só morno e quente); empresa · segmento em `.crm-meta`; `SlaIndicator` (`stageInfo` + `nextActionAt`); `Avatar` do dono ou `ClaimButton` "Assumir"; valor do aporte aberto em `tabular` quando existe; botão "Mover para ▾" (ícone `ArrowRightLeft`, `aria-label="Mover {nome} para"`, `relative z-10`) que abre um `DropdownMenu` com os destinos de `stageTargets` mais "Marcar perdido". |
| Começar o arrasto | O cartão é `draggable`; ao iniciar, o quadro calcula `allowedStageMoves(pipeline, stage)`; as colunas fora da lista recebem `data-blocked`, opacidade 0,5 e, no cabeçalho, a frase "Avance um estágio por vez" (ou "Reative pelo Mover para" quando o cartão é de perdido); a coluna terminal aparece como zona de soltura "Marcar perdido" **fixa à direita do quadro** (`sticky right-0` dentro do contêiner com rolagem horizontal, sempre visível sem atravessar as sete colunas de Patrocinadores, que somam cerca de 2.100 px num conteúdo de 1.280 px) mesmo quando oculta. Um `<span role="status" class="sr-only">` anuncia "Arrastando {nome}. Solte em: Qualificado, Perdido." O `draggable` nasce falso no HTML e só vira verdadeiro depois da montagem (`useEffect` lendo `matchMedia("(pointer: fine)")`), para a hidratação não divergir; os links e botões dentro do cartão levam `draggable={false}` (senão Firefox e Safari arrastam o link, não o cartão) e `onDragStart` chama `dataTransfer.setData("text/plain", lead.id)` (o Firefox não inicia o arrasto sem dado). |
| Soltar em coluna permitida | Nada é gravado. Abre o `StageMoveDialog` existente com `defaultTarget` = estágio da coluna e `trigger={null}` (controlado), montado com `key={`${lead.id}:${target}`}` porque o diálogo guarda o destino em `useState` só na montagem (reaproveitar a instância entre arrastos mostraria o destino anterior; o mesmo vale para o motivo do `MarkLostDialog`); o diálogo já pede responsável e próxima ação ao sair do inicial, checagem do art. 27, motivo da correção ao voltar, e bloqueia (botão desabilitado com `Callout`) quando depende de aporte ou projeto. Sucesso: toast "Lead movido para Diagnóstico." e `router.refresh()`; cancelar: o cartão continua onde estava. |
| Soltar na coluna terminal | Abre o `MarkLostDialog` (`alertdialog`, motivo obrigatório, D16). |
| Soltar em coluna bloqueada ou fora do quadro | Nada acontece; toast informativo "Não dá para mover direto para Termo: avance um estágio por vez." só quando a soltura foi numa coluna bloqueada. |
| Teclado e leitor de tela | O arrasto nativo não é acessível por teclado; o caminho oficial é o "Mover para ▾" do cartão (menu com setas e Enter) que abre o mesmo diálogo. O cartão inteiro não é focável; o nome e os botões são. |
| Celular com `?view=quadro` | As colunas têm `w-[85vw]` com `snap-center` e `max-h-none` (a página rola; sem rolagem aninhada de 70 vh dentro do documento, difícil ao toque); o quadro rola na horizontal dentro do próprio elemento; sem arrasto (`pointer: coarse`); o caminho é o "Mover para" de cada cartão. |
| Erro na action | O diálogo mostra a mensagem (`MissingFieldsError` vira a lista "Antes de mover, preencha:"); o quadro não muda. |
| Dados por cartão para o diálogo | O repositório devolve, além de `LeadListRow`, `orgCnpj`, `openContributionProjectId` e `openContributionAmount`; `stageMovePlans` é calculado no cliente com o `now` do servidor (ISO) para não divergir na hidratação. |
| Pipelines sem aporte (contadores, municípios, projetos, alunos) | Mesmo quadro, sem subtotal em R$; leads PROP continuam com o projeto como registro de verdade (o quadro de projetos não existe: `MoveProjectStageDialog` segue na página do projeto). |

### 6.4 Modelo de dados novo (D-4)

Migração única `drizzle/0003_<nome>.sql` gerada por `npm run db:generate` (o `0002_*` já existe: é a correção do CHECK de `ai_runs`). Convenções da seção 1 de `modelo-de-dados.md`: `uuid` gerado pelo banco, `tenant_id text NOT NULL REFERENCES tenants(id)` em toda tabela nova, enums como `text` com `CHECK` gerado das constantes (mesmo padrão de `ai_runs`), nunca `DELETE` em `leads`.

#### 6.4.1 `prospecting_lists` (`src/lib/db/schema/prospecting.ts`)

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid PK | sim | |
| `tenant_id` | text FK `tenants` | sim | |
| `name` | text | sim | "Vinícolas do Vale dos Vinhedos" |
| `region` | text | não | "Bento Gonçalves/RS" |
| `notes` | text | não | Instruções para quem liga (abertura, horário bom, o que oferecer) |
| `source_detail` | text | sim | De onde vieram os dados (busca pública, associação, indicação); obrigatório como em `contacts.source_detail` (LGPD, art. 18) |
| `assignee_user_id` | text FK `users` | não | Quem liga |
| `created_by_user_id` | text FK `users` | não | |
| `created_at`, `updated_at` | timestamptz | sim | |

Índice: `(tenant_id, created_at desc)`.

#### 6.4.2 `prospecting_items`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid PK | sim | |
| `tenant_id` | text FK `tenants` | sim | |
| `list_id` | uuid FK `prospecting_lists` ON DELETE CASCADE | sim | Excluir a lista apaga os itens (os leads e organizações criados ficam) |
| `name` | text | sim | Nome da empresa |
| `segment` | text | não | Grupo dentro da lista ("Vinícolas", "Metalúrgicas"); texto livre do `# Segmento` do "Colar lista", não o enum `lead_segment` |
| `phone` | text | não | E.164 (`+55...`) validado por `phoneSchema`; número não reconhecido vai para `info` como "Telefone informado: …" e `phone` fica nulo |
| `hook` | text | não | Abertura da ligação (o "gancho"); editável na ficha |
| `address`, `size`, `info` | text | não | "Sobre a empresa": localização, porte, informações relevantes |
| `status` | text CHECK (`a_ligar`, `sem_resposta`, `retornar`, `reuniao_marcada`, `descartado`) | sim, padrão `a_ligar` | Cadência |
| `notes` | text | não | Anotação curta da ligação |
| `callback_at` | date | não | Quando retornar (`status = retornar`) |
| `called_at` | timestamptz | não | Última tentativa |
| `whatsapp_sent_at` | timestamptz | não | Último envio pelo modal de WhatsApp |
| `position` | double precision | sim, padrão 0 | Ordem de colagem; sem reordenação por arrasto nesta entrega |
| `lead_id` | uuid FK `leads` ON DELETE SET NULL | não | Preenchido por "Reunião marcada" |
| `org_id` | uuid FK `organizations` ON DELETE SET NULL | não | Idem |
| `created_at`, `updated_at` | timestamptz | sim | |

Índices: `(tenant_id, list_id, position)`, `(tenant_id, status)`, `(tenant_id, lead_id) WHERE lead_id IS NOT NULL`. CHECK `prospecting_items_status_check`.

#### 6.4.3 `activities` (alterações)

| Campo | Tipo | Descrição |
|---|---|---|
| `started_at` | timestamptz, nulo | "Em andamento" = `started_at IS NOT NULL AND done_at IS NULL`. Só `tarefa` |
| `priority` | text CHECK (`baixa`, `media`, `alta`), nulo | Só `tarefa`; a migração preenche `media` nas tarefas existentes; **todo** caminho que insere uma `tarefa` grava `media` por padrão: `createActivity`, `insertSystemActivity`, `recordLeadActivity` (que insere direto em `activities`, sem passar por `createActivity`) e `createTask`. Sem `DEFAULT` na coluna, porque ele valeria para ligações e notas, que devem ficar nulas. O quadro ainda trata `null` como `media` por segurança |
| `position` | double precision NOT NULL DEFAULT 0 | Ordem dentro da coluna do quadro de Tarefas; posição fracionária (média entre vizinhos), renumeração só quando a distância cai abaixo de 1e-6, sempre numa transação do repositório. Toda inserção de `tarefa` (os quatro caminhos acima) grava `position = max(position) + 1` das tarefas abertas do tenant pela subconsulta `nextTaskPositionSql(ctx)` de `activities.ts`, para a tarefa criada no lead entrar no fim de "A fazer", como a criada no quadro, e não empilhada em 0 no topo |
| `prospecting_item_id` | uuid FK `prospecting_items` (sem `ON DELETE`: `NO ACTION`), nulo | Ligação, WhatsApp e nota registrados antes de existir lead; ao converter, as atividades do item ganham também `lead_id`. **Não** é `SET NULL`: numa atividade de item ainda não convertido só esta coluna está preenchida, e o `UPDATE` que o `SET NULL` dispara violaria o CHECK abaixo, abortando o `DELETE` da lista inteira. `deleteList` e `deleteItem` fazem, na mesma transação e antes de apagar: `DELETE` das atividades dos itens que não têm `lead_id` (a história pré-lead morre com o item; `activities` podem ser apagadas, seção 1 do modelo de dados) e `UPDATE ... SET prospecting_item_id = NULL` nas que já têm `lead_id` (a história que viajou para o lead fica) |
| CHECK `activities_subject_check` | | Passa a `type = 'tarefa' OR num_nonnulls(lead_id, org_id, project_id, contribution_id, prospecting_item_id) >= 1`: tarefa pode ser solta; qualquer outro tipo continua ligado a alguém |
| Índices | | Novo `(tenant_id, position) WHERE type = 'tarefa' AND done_at IS NULL` (colunas A fazer e Em andamento); novo `(tenant_id, prospecting_item_id, occurred_at desc) WHERE prospecting_item_id IS NOT NULL`; os existentes ficam |

`createActivitySchema` (`src/lib/validation/activities.ts`) passa a aceitar `startedAt`, `priority`, `position` e `prospectingItemId`, e o `refine` de vínculo passa a liberar `type = "tarefa"`.

#### 6.4.4 `leads.source`

`lead_source` ganha o valor `prospeccao`, acrescentado **depois de `outro`** (fim real do enum): assim o `drizzle-kit generate` emite um único `ALTER TYPE "public"."lead_source" ADD VALUE 'prospeccao'`, sem `BEFORE` nem recriação do tipo. `LEAD_SOURCES` em `src/lib/domain/enums.ts`, `SOURCE_LABELS.prospeccao = "Prospecção"` (o `Record<LeadSource, string>` obriga, no typecheck, todo mapa por origem a ganhar a chave). Score: `prospeccao` cai no ramo "demais origens: 2 pontos" de `scoring.ts`, sem alteração.

Regras da migração que este valor impõe (o migrator do Drizzle, `pg-core/dialect.js`, aplica **todas** as migrações pendentes numa única transação, e `tests/setup.ts` e `scripts/migrate.ts` usam esse migrator; o PostgreSQL aceita `ADD VALUE` dentro de uma transação desde a versão 12 e PGlite 0.5.8 e Neon, 16 a 18, também, mas proíbe usar o valor novo na mesma transação):

- Nenhuma migração em `drizzle/*.sql` pode fazer `INSERT` ou `UPDATE` com um valor de enum acrescentado por outra migração: num banco novo (os testes) as duas rodam na mesma transação e a segunda quebraria. Regra prática: backfills de dados em migração só com valores antigos; valores novos entram só pela aplicação. A `0003` cumpre (o `UPDATE` de backfill usa `'media'` numa coluna nova de texto, não o enum).
- `ADD VALUE` não tem reversão: o valor fica no tipo. A reversão desta entrega é **da aplicação** (voltar o deploy anterior): as colunas novas são nulas ou têm padrão, o CHECK é mais frouxo que o anterior e o valor extra no enum não é lido por código antigo, então o código anterior continua funcionando sobre o banco migrado. "Compatível com rollback da aplicação", não "reversível".

#### 6.4.5 Enums e rótulos novos

`PROSPECTING_STATUSES` e `TASK_PRIORITIES` em `src/lib/domain/enums.ts`; `PROSPECTING_STATUS_LABELS` (A ligar, Sem resposta, Retornar, Reunião marcada, Descartado), `TASK_PRIORITY_LABELS` (Baixa, Média, Alta) e `TASK_STATUS_LABELS` (A fazer, Em andamento, Concluída) em `src/lib/crm/labels.ts`; `StatusBadge` ganha os tipos `prospecting` e `priority` com famílias em `status-tones.ts` (seção 7).

#### 6.4.6 Exportação

`EXPORT_TABLES` ganha `prospecting_lists` e `prospecting_items` (telefone incluído, com o mesmo aviso LGPD da página Exportar). `activities` exportada passa a trazer `started_at`, `priority` e o nome do item de prospecção.

#### 6.4.7 `organizations.phone`

`organizations` ganha `phone text` nulo (E.164 por `phoneSchema`, como `contacts.phone` e `leads.phone`), na mesma migração. Motivo: o telefone colado na prospecção é o da **empresa** (central, recepção); `leads.phone` e `contacts.phone` são o telefone da **pessoa** (é o número que "Abrir WhatsApp" e as mensagens de `whatsapp-messages.ts`, com o "Responda SAIR", usam). Gravar o número da central como telefone da pessoa mandaria a mensagem à recepção. Com a coluna, a conversão guarda o número da empresa no lugar certo, o cabeçalho da organização ganha "Ligar" mesmo sem contato cadastrado (seção 6.9), e `notes` continua texto livre. A `Sheet` "Editar organização" ganha o campo "Telefone" e `KeyValueList` "Dados" o mostra como link `tel:`; a exportação de `organizations` inclui a coluna com o aviso LGPD existente.

### 6.5 Tarefas: estados e regras (D-5)

| Tema | Decisão |
|---|---|
| Estado | Derivado, nunca gravado: `done_at` preenchido → Concluída; senão `started_at` preenchido → Em andamento; senão A fazer. `listOpenTasks`, `listOpenTasksWithLead`, `completeTask` e o `NextStepCard` continuam valendo sem mudança (abertas = `done_at IS NULL`). |
| Mover entre colunas | `moveTask(ctx, { activityId, status, index })` numa transação: A fazer limpa `started_at` e `done_at`; Em andamento grava `started_at = coalesce(started_at, now())` e limpa `done_at`; Concluída grava `done_at = now()` (mantém `started_at`). Concluída → A fazer reabre a tarefa (como no Trilis); o quadro avisa com toast "Tarefa reaberta.". |
| Posição | Fracionária entre vizinhos da coluna de destino; o índice vem do quadro; o repositório relê a coluna dentro da transação e decide. Nunca N updates vindos do cliente. |
| Prioridade | `baixa`, `media`, `alta`; padrão `media` em todo caminho que cria tarefa (6.4.3); pill sempre com texto ("Alta", nunca só um ponto colorido: princípio 2 do design system). |
| Responsável | Padrão o usuário da sessão; "Ninguém" é um valor de verdade: `createTaskSchema.ownerUserId` é `z.string().min(1).nullable().optional()`, em que `undefined` significa "padrão da sessão" e `null` significa "ninguém" (o diálogo envia `""` e a action converte em `null`). Sem isso, `ownerUserId ?? ctx.userId` engoliria a escolha. |
| Vínculo | Opcional: lead, organização ou projeto (aporte continua possível pelo modelo, mas não entra no diálogo; tarefas de aporte nascem na página do aporte, como hoje). Tarefa solta é a exceção aberta pelo CHECK só para `tarefa`. |
| Impacto da tarefa solta em Hoje | `listOpenTasksWithLead` já faz `leftJoin` com `leads` e a fila já trata `leadId` nulo (`Who` sem link). Uma tarefa solta aparece com o assunto e sem empresa. Nada quebra; teste novo cobre. |
| Impacto na linha do tempo | A `Timeline` lista por `leadId`, `orgId`, `projectId` ou `contributionId`: tarefa solta nunca aparece numa linha do tempo, o que é o esperado. O quadro de Tarefas é a tela dela. |
| Impacto no e-mail diário | O link da tarefa vencida sem lead nem projeto hoje cai em `/app`; passa a `/app/tarefas?task=<id>` (abre o diálogo da tarefa). Seção nova "Tarefas atribuídas a você" por destinatário (até 10 tarefas abertas com `owner_user_id` do destinatário: vencidas, que vencem nos próximos 7 dias **ou sem prazo**, pois a tarefa solta criada no quadro muitas vezes não tem data e "atribuída a você" é o que importa; linha "sem prazo" quando `due_at` é nulo; `due_at asc nulls last`; as criadas nas últimas 24 h marcadas com "(nova)"); o tipo `DigestAssignedTask.dueAt` é `Date | null`, diferente do `DigestTask.dueAt: Date` de hoje; `loadDigestData` continua por tenant e o cron consulta a seção por usuário. Sem push. |
| Impacto na exportação | Coluna `priority`, `started_at` e "status derivado" no CSV de `activities`. |
| Concluir | `TaskCompleteButton` e `completeTaskAction` continuam como estão (Hoje, linha do tempo, `NextStepCard`); o quadro usa `moveTaskAction` para as três colunas e `updateTaskAction`/`deleteTaskAction` no diálogo. |
| Excluir | Permitido (`activities` podem ser apagadas: seção 1 do modelo de dados), só `type = 'tarefa'`, com `ConfirmDialog` "Excluir tarefa" (D16). Como a tarefa pode ser registro de outro fluxo (a tarefa de agendamento criada pelo formulário de diagnóstico, R-13; as tarefas da linha do tempo do lead), `deleteTask` grava, na mesma transação e só quando a tarefa tem vínculo, uma `activities.sistema` "Tarefa excluída: {assunto}" no mesmo lead, organização, projeto ou aporte (auditoria mínima, como as trocas de dono), e o `ConfirmDialog` avisa que a tarefa some da linha do tempo. |
| Deep links | `?task=<id>` abre o diálogo de edição; `?novo=1` abre "Nova tarefa"; `?dono=eu`, `?atrasadas=1` (`due_at < now`) e `?vencem=hoje` (`due_at <= fim de hoje`, o mesmo recorte do medidor "Tarefas hoje") filtram; tudo na URL (D17 e D19). |

### 6.6 Prospecção: cadência, conversão e estágio (D-6)

**Ciclo de um item.** `a_ligar` → (ligação) → `sem_resposta` | `retornar` (com `callback_at`) | `reuniao_marcada` (conversão) | `descartado`; "Voltar para a ligar" volta ao início e limpa `called_at`. Cada botão de resultado grava, numa transação: `status`, `called_at = now()` (exceto ao voltar), `callback_at` quando é retorno, e uma `activities` do tipo `ligacao` com `subject` "Ligação: sem resposta" / "Ligação: retornar em 17/10" / "Ligação: descartada (não contatar)" / "Ligação: reunião marcada", `data = { result, callbackAt, reason }`, `prospecting_item_id` e `created_by_user_id`. "Descartar" pede o motivo (`sem_interesse`, `nao_contatar`, `numero_errado`, `outro`), gravado em `data.reason`: é a "saída fácil" da seção 8 registrada de forma consultável. "Voltar para a ligar" em item descartado como `nao_contatar` passa por `ConfirmDialog` ("Esta empresa pediu para não ser contatada."). Ao colar ou adicionar itens, `addItems` procura, no tenant, itens `descartado` de outras listas com o mesmo telefone E.164 e grava neles `notes = "Descartada em {lista} ({motivo})"`; a action devolve a contagem e o toast diz "37 empresas adicionadas; 2 já foram descartadas em outra lista" (a prévia do diálogo é um cálculo puro no cliente e não consulta o banco; o aviso vem depois de gravar). Não é bloqueio: é aviso para quem liga.

**WhatsApp.** "Abrir no WhatsApp" abre o `wa.me` com o texto editado e, no mesmo clique, grava `whatsapp_sent_at = now()` e uma `activities.whatsapp` com o texto em `body`. O CRM não tem como saber se a mensagem foi de fato enviada: "enviado" aqui significa "aberto no WhatsApp com este texto", e a tela diz isso ("WhatsApp aberto há 2 d"); a métrica da seção 12 lê o campo com esse sentido.

**Sem telefone.** O cartão mostra "sem telefone" no lugar de "Ligar" e do WhatsApp; os botões de resultado continuam (a pessoa pode ter ligado de outro número).

**"Reunião marcada"** (`convertProspectingItem` em `src/lib/repos/prospecting.ts`), em uma transação:

1. Organização: reaproveita `item.org_id` se existir; senão procura organização do tenant com `type = 'empresa'` e nome igual (`ilike` exato, sem `%`); senão cria `organizations { type: 'empresa', name: item.name, notes: "Origem: prospecção, lista X\nLocalização: …\nPorte: …\nInformações: …\nAbertura usada: …" }`.
2. Contato: `contacts { org_id, name: contactName, phone: contactPhone, email, title, is_decision_maker, source_detail: "Prospecção: lista X (ligação em dd/mm/aaaa)" }`. `contactPhone` é o campo opcional "Telefone de quem vai à reunião" do diálogo, **não** `item.phone`: o telefone do item é o da empresa e vai para `organizations.phone` (6.4.7); `leads.phone` e `contacts.phone` ficam nulos quando a Daniela não anotou o número da pessoa, para o "Abrir WhatsApp" do lead nunca mandar o "Responda SAIR" à recepção.
3. Lead: se já existe lead `PJ` com o e-mail informado no tenant, reaproveita (vincula `org_id` e `contact_id` se vazios, por `tx.update(leads)` direto); senão insere `leads { segment: 'PJ', pipeline: 'patrocinadores', stage: 'novo', interest (do diálogo, padrão nao_sei), name: contactName, email, phone: contactPhone, source: 'prospeccao', source_detail: list.name, org_id, contact_id, owner_user_id: list.assignee_user_id ?? ctx.userId, attributes: { empresa: item.name, cargo?, regime_tributario? } }` com score por `scoreLead` e uma `activities.sistema` "Lead criado pela prospecção (lista X)". Nenhum consentimento é gravado: a base é o legítimo interesse do contato profissional B2B (ADR-003, 6.3); a Daniela registra o consentimento no CRM quando a pessoa o dá por e-mail ou WhatsApp.
4. Atividade `reuniao` ligada ao lead e ao item: "Reunião de diagnóstico marcada para sex., 17 de out., 10h (via prospecção, lista X)", `occurred_at = meetingAt` e `data = { meetingKind, channel: 'ligacao', meetingAt: ISO }`, como o `ActivityForm` do lead já faz ao registrar uma reunião (ele pede data e hora e grava em `occurred_at`; `playbooks/README.md` pede "atividade `reuniao` com data e hora, canal"): a linha do tempo mostra a reunião na data marcada, não na hora da ligação. `leads.last_contact_at = now()` (a ligação foi agora).
5. Item: `status = reuniao_marcada`, `called_at`, `lead_id`, `org_id`; as atividades anteriores do item (`prospecting_item_id = item`) ganham `lead_id` para a história viajar com o lead.

Dentro dessa transação só existe `tx`: inserções e atualizações inline ou funções que recebem o `tx` (`requireOrganization(ctx, id, tx)`, `insertSystemActivity(tx, ...)`, `getOpenContributionForLead(tx, ...)`). `createOrganization`, `createContact`, `createLead` e `updateLead` **não** podem ser chamados aí: usam `db` ou abrem `db.transaction`, e com PGlite (uma conexão) uma consulta em `db` com transação aberta espera para sempre (comentário em `repos/organizations.ts`; visto em `createContribution`). A mesma regra vale para `recordCallResult`, `recordWhatsappSent`, `moveTask`, `deleteList` e `deleteItem`.

Depois de confirmada a transação, a mesma função chama `moveLeadStage` conforme o estágio do lead:

- lead em `novo` (criado agora ou reaproveitado sem contato): `moveLeadStage(ctx, { leadId, to: 'qualificado', ownerUserId, nextActionAt: meetingAt })`;
- lead reaproveitado no estágio terminal (`perdido`: o caso comum da prospecção, a empresa que disse não no ano passado): dois movimentos, `reactivate` para `novo` (único destino que `allowedStageMoves` oferece a partir do terminal; `moveLeadStage` limpa `lost_reason` e `lost_reason_detail` e grava dono e próxima ação) e depois `next` para `qualificado`; sem isso a reunião ficaria registrada num lead escondido de `searchLeads`, `countLeadsByPipeline` e `listOverdueLeads`; o toast diz "Lead reativado em Qualificado.";
- lead reaproveitado em qualquer outro estágio: nenhum movimento (não é rebaixado nem avançado); o toast diz "Já existe um lead com este e-mail; a reunião foi registrada nele."

São transações separadas de propósito: `moveLeadStage` continua sendo o único lugar que grava `stage` (R-3 e a atividade de sistema "Estágio alterado" vêm dele), e, se um movimento falhar, o lead fica onde estava (`novo`, com a reunião registrada e a próxima ação na data da reunião; ou `perdido` com a reunião registrada), estado recuperável pela própria tela do lead; a função devolve o `stage` real, a falha vira log `warn` sem dado pessoal e o toast diz "Reunião registrada; não foi possível avançar o estágio: abra o lead e use Mover para."

**Por que `qualificado`, e não `diagnostico` nem `novo`.** Em `pipelines.ts`, entrar em `qualificado` não tem exigência; sair de `novo` exige dono e próxima ação (R-3), que a conversão fornece (quem liga e a data da reunião). `diagnostico` seria errado: pela definição do funil (`personas-e-funis.md`, seção 8), `diagnostico` é a reunião **realizada**, com valor potencial calculado; `qualificado` tem como critério de saída exatamente "reunião de diagnóstico agendada", e a regra operacional de `playbooks/README.md` diz que "o lead sobe a `qualificado` quando a reunião está marcada". Ficar em `novo` deixaria o lead sob o SLA de 1 dia útil do estágio inicial (`STAGE_SLA.patrocinadores.novo`), gerando "vencido" para uma reunião daqui a cinco dias (não entraria em "Sem contato": `listNewLeadsWithoutContact` exige `last_contact_at` nulo, e a conversão o preenche). O critério de entrada de `qualificado` que `personas-e-funis.md` (seção 8) e `playbooks/README.md` citam (regime confirmado, decisor identificado) não é imposto pelo código; a prospecção é a **exceção documentada** (registrada na R-19): a reunião marcada basta, o regime pode ficar `nao_sei`; o diálogo pergunta o regime quando a Daniela soube na ligação e grava em `attributes.regime_tributario`, sem bloquear quando não soube. O playbook passa a dizer isso na Fase 3.

**E-mail obrigatório no diálogo.** `leads.email` é `NOT NULL` e único por segmento; mudar isso ripplaria por consentimentos, `email_status`, resposta sugerida e exportação. O diálogo pede o e-mail de quem vai à reunião, com a ajuda "Peça o e-mail na ligação: o convite da reunião e o CRM precisam dele." O e-mail nunca vai ao log.

**WhatsApp em três variações** (`src/lib/crm/prospecting-messages.ts`, puro): variação escolhida por hash estável do `id` do item (mesma empresa abre sempre na mesma), "outra versão" avança, texto editável, link `wa.me` real com o texto editado. Regras do texto: na voz da Daniela ("Daniela, da Prospekto"), apresentação honesta do que a Prospekto faz, convite para a empresa contar como decide apoios e patrocínios, nenhuma suposição sobre a dor ou a rotina da empresa, nenhum número sem ressalva (a primeira mensagem não traz números), nenhuma promessa de retorno, e sempre a saída "Responda SAIR se não quiser mensagens por aqui." (regra das primeiras mensagens, `campanhas.md`, seção 1.2, já aplicada em `whatsapp-messages.ts`). Dica de cadência no modal: "Mensagem hoje; sem resposta, ligue em 2 dias úteis: a ligação deixa de ser fria."

**"Colar lista"** (`parseProspectingPaste(text)` em `src/lib/crm/prospecting-paste.ts`, puro, testado): uma linha por empresa, `Nome | Telefone | Gancho` (separadores `|`, `;` ou tabulação); linha começando com `#` define o `segment` das seguintes; um campo com 8 ou mais dígitos e mais da metade de dígitos é telefone; o resto, concatenado com " · ", é o gancho; telefone normalizado para E.164 (`+55` + DDD + número) ou nulo com o texto original em `info`; linhas vazias ignoradas; limite de 500 linhas por colagem. A prévia do diálogo mostra "37 empresas reconhecidas · 2 telefones não reconhecidos".

### 6.7 Busca Ctrl+K e revisão da decisão D11 (D-7)

D11 do design system dizia: "Só `/` foca a busca. `n`, `g h/l/o/p/a`, `j/k` e o diálogo `?` não entram", com a justificativa de "treinamento disfarçado para usuária não técnica". A revisão, registrada aqui e refletida na seção 0 do design system:

> **D11 (revisada em 13/10/2026 pelo ADR-004).** `/` foca o campo de busca do header; **Ctrl+K (Cmd+K no Mac) abre a paleta de busca em qualquer tela**, inclusive com o foco em um campo de texto. Nenhum outro atalho de letra solta entra. O botão "Buscar…" da sidebar, a lupa do header no celular e a própria paleta mostram o atalho como `<kbd>`: a pessoa descobre o atalho olhando, não decorando. `/app/busca` continua existindo como a página de "ver todos os resultados" e como destino sem JavaScript do formulário do header.

Por que convive: Ctrl+K é um acorde com modificador (não dispara ao digitar), é o atalho que a Daniela já conhece de outros programas, e a paleta é o mesmo gesto do Trilis que motivou o pedido.

Comportamento da paleta (`src/components/crm/shell/command-palette.tsx`, Client Component sobre o `Dialog` do base-ui, que já cuida de Esc, foco preso e `aria-modal`):

| Situação | Comportamento |
|---|---|
| Abrir | Ctrl/Cmd+K em qualquer tela do CRM (o `keydown` é tratado na própria paleta, não em `shortcuts.tsx`), inclusive com o foco num campo de texto, **mas não** quando já há um diálogo, `alertdialog` ou menu aberto (a mesma regra `OVERLAY` de `shortcuts.tsx`: dois modais do base-ui ao mesmo tempo prendem o foco em dois lugares); clique em "Buscar…" da sidebar; lupa do header no celular (que deixa de ser link para `/app/busca`); evento `prospekto:paleta` para quem precisar. |
| Fechar | Esc, clique fora ou navegação. Como a paleta não tem `trigger` (abre por atalho ou evento), o `DialogPopup` recebe `finalFocus` apontando para o elemento que tinha o foco antes de abrir; sem isso o foco cairia no `body` (WCAG 2.4.3). |
| Celular | O `DialogContent` padrão vira folha inferior abaixo de `sm`, e com o teclado virtual a lista ficaria espremida; a paleta usa `className="sm:max-w-lg max-sm:inset-x-0 max-sm:top-0 max-sm:bottom-auto max-sm:rounded-t-none max-sm:rounded-b-xl"` (folha **superior**, como o Trilis ancora em `pt-[15vh]`). `DialogTitle` "Buscar" em `sr-only` (o diálogo exige título). |
| Vazio | Lista "Ir para": os módulos da sidebar (Painel, Pipeline, Prospecção, Organizações, Projetos, Aportes, Tarefas, Exportar, Minha conta) e "Novo…": os itens de `NEW_ITEMS`. Dica: "Digite para buscar leads, organizações, projetos, aportes, tarefas e empresas de prospecção." |
| Digitando | A partir de 2 caracteres, com debounce de 250 ms, `searchAllAction(query)` (`src/actions/search.ts`, `requireSession`; o argumento passa por `z.string().max(1000).safeParse` e, inválido, devolve `[]` em vez de deixar um `TypeError` virar 500, porque Server Actions aceitam POST direto; válido, `q = query.trim().slice(0, 120)`): `Promise.all` de `searchLeads({ search, pageSize: 5, includeLost: true })`, `listOrganizationSummaries({ search, limit: 5 })`, `listProjectSummaries({ search, limit: 5, includeArchived: true })`, `listContributionSummaries({ search, limit: 5 })` (parâmetro `search` novo: nome do lead, do projeto ou da organização), `searchTasks({ search, limit: 5 })` (assunto) e `searchProspectingItems({ search, limit: 5 })` (nome da empresa; nunca por telefone). Resposta: `{ groups: { kind, items: { id, title, meta, href }[] }[] }`, só campos de tela (nome, empresa, estágio, cidade), nunca e-mail nem telefone. |
| Resultado | Uma lista única `role="listbox"` com `aria-activedescendant`; cada item é um `<a href>` real (`/app/leads/[id]`, `/app/organizacoes/[id]`, `/app/projetos/[id]`, `/app/aportes/[id]`, `/app/tarefas?task=[id]`, `/app/prospeccao/[listId]/[itemId]`) com chip do tipo (`Badge` "Lead", "Organização", "Projeto", "Aporte", "Tarefa", "Prospecção") e uma linha de meta (empresa · estágio; cidade/UF; proponente; projeto · valor; vence qui., 16; lista). Setas, Enter e Esc; `aria-live="polite"` com "N resultados". |
| Rodapé | "ver todos os resultados em Busca ›" para `/app/busca?q=`. |
| Nada | "Nada encontrado para "vinícola". Tente parte do nome ou o CNPJ." |
| Erro | "Não foi possível buscar. Tente de novo." sem fechar a paleta. |
| Log | `log("info", "busca", { tenantId, userId, groups: contagens })`; nunca o termo. |

### 6.8 Painel (D-8)

A tela `/app` continua sendo a fila de trabalho (R-13) e ganha, nesta ordem no desktop:

1. `PageHeader` com eyebrow = data por extenso e título "Bom dia, Daniela." (como hoje).
2. **Régua "Hoje"**: os quatro `StatCard` atuais (Vencidas, Sem contato, Tarefas hoje, Aportes 15 dias) dentro de um único `Card` com hairlines (`divide-x` no desktop, `divide-y` em duas colunas no celular), sem borda própria por célula, seta `↗` ao passar o mouse, `title` com o valor por extenso; mesmos números e links de hoje, exceto "Tarefas hoje", que passa a apontar para `/app/tarefas?vencem=hoje` (o número é `dueTo: fim de hoje`, vencidas mais as de hoje; `?atrasadas=1` é `due_at < now` e mostraria menos do que o medidor diz; o hint "2 atrasadas" é que leva a `?atrasadas=1`). Componente novo `StatRuler` em `src/components/crm/ui/stat-ruler.tsx` e `variant="ruler"` no `StatCard`; na régua, o anel de foco das células é `focus-visible:ring-2 ring-inset`, porque o grupo tem `overflow-hidden` e um anel externo seria cortado nas bordas (WCAG 2.4.7).
3. **Régua "Carteira"**: Organizações ativas (organizações com aporte `depositado` ou `recibo_emitido` nos últimos 12 meses; link para `/app/organizacoes`), Aportes em aberto (soma de `proposed_amount` em `proposta` e `termo_assinado`; link para `/app/aportes`), Depositado no ano (soma de `deposited_amount` com `deposited_at` no ano civil de São Paulo; link para `/app/aportes?status=depositado`), Projetos captando (contagem em `captando`; link para `/app/projetos?estagio=captando`). Consulta agregada única `getPortfolioTotals(ctx, now)` em `src/lib/repos/dashboard.ts` (quatro `select` com `count`/`sum` no banco, nunca em JavaScript sobre linhas carregadas). O hint "N com alerta" vem de `projectsAlert.length`, que a página já carrega por `listProjectAlerts` para o bloco "Projetos com alerta" (a função deriva o alerta em memória; chamá-la de novo dentro de `getPortfolioTotals` duplicaria a consulta e contradiria a regra do agregado no banco).
4. Fila "Precisa de ação agora" (sem mudança).
5. Grade de duas colunas: **"Últimas atividades"** (8 mais recentes do tenant, exceto `sistema`, `download` e `formulario`, por `occurred_at`; ícone por tipo, assunto, "Autor · Empresa ou lead · hoje, 14:10"; link para o lead, a organização, o projeto, o aporte ou o item de prospecção; `listRecentActivities(ctx, { limit: 8 })`) e **"Minhas tarefas"** (8 tarefas abertas com `owner_user_id = ctx.userId`, por vencimento, pill de prioridade com texto e prazo humano; link "ver todas ›" para `/app/tarefas?dono=eu`; `listOpenTasksForOwner`).
6. "Próximos 7 dias", "Aportes previstos" e "Projetos com alerta" (sem mudança).

Vazio: a régua "Carteira" mostra zeros; "Últimas atividades" vazio diz "Nenhuma atividade registrada ainda. Ligações, reuniões e notas aparecem aqui."; "Minhas tarefas" vazio diz "Nenhuma tarefa atribuída a você." com "Nova tarefa".

### 6.9 Detalhe da organização (D-9)

`/app/organizacoes/[id]` adota a grade da ficha do Trilis sobre o `DetailLayout` existente:

- Cabeçalho: como hoje (nome, tipo, cidade, quem cuida); primário "Novo contato"; secundários "Editar" (Sheet, que ganha o campo "Telefone" da organização) e "Vincular lead"; novo: botão `outline` "Ligar (54) 3000-0000" como link `tel:` (padrão D-G) com o telefone do contato decisor, na falta o do primeiro contato com telefone, na falta `organizations.phone` (6.4.7).
- Coluna principal: `FormSection` "Registrar atividade" com o `ActivityForm` em modo organização (`target: { orgId }`: tipos ligação, reunião, e-mail, WhatsApp, visita, nota e tarefa; sem "próxima ação" nem IA, que são do lead; `registerActivityAction` passa a aceitar `orgId` em vez de `leadId`, gravando `activities.org_id`), depois "Histórico" com a `Timeline` de `listOrganizationActivities(ctx, orgId, { limit: 300 })` (função nova em `repos/organizations.ts`): atividades com `org_id = organização` **ou** `lead_id` em um lead da organização (`inArray(activities.leadId, select id from leads where org_id = ...)`), porque toda ligação, reunião e e-mail da Daniela é registrada no lead (`recordLeadActivity`) com `org_id` nulo, e `listActivities({ orgId })` devolveria um histórico quase vazio; cada linha vinda de um lead mostra "· Rodrigo" (nome do lead) depois do assunto.
- Lateral, nesta ordem: "Leads e aportes" (leads vinculados com `StatusBadge` do estágio, `SlaIndicator` e o valor do aporte aberto quando houver; "ver no quadro ›" para `/app/leads?pipeline=patrocinadores&view=quadro`; "Vincular lead" no vazio), "Contatos" (lista compacta: nome com `Crown` de decisor, cargo, e-mail `mailto:` e telefone `tel:` como links; "Editar" por contato; "+ Novo contato"; não há remoção de contato nesta entrega: o contato é dado pessoal com origem registrada, e apagar exige a mesma política de retenção dos leads), "Dados" (`KeyValueList hideEmpty`, sem o item "Notas"), "Notas" (textarea com auto-altura; salva ao perder o foco quando mudou, por `updateOrganizationNotesAction`; estado em texto ao lado do título: "Salvo às 14:32", "Salvando…", "Não foi possível salvar; tente de novo"; sem debounce por tecla, sem concorrência otimista: último a gravar vence, registrado como risco), e, para proponentes, "Projetos deste proponente" (como hoje).
- Celular: `ActionBarMobile` "Novo contato" + "Ligar" (quando há telefone), "⋯" com Vincular lead e Editar organização; a ordem no celular é cabeçalho, Registrar atividade, Leads e aportes, Contatos, Histórico, Dados, Notas.
- Status derivado da organização (lead/ativa/inativa) **não** entra: a régua "Carteira" já conta as ativas e nada no fluxo da Daniela depende da pill; fica para quando houver pedido.

### 6.10 Padrão "Ligar" (D-10)

Onde há telefone, o botão "Ligar (54) 3000-0000" é um `<a href="tel:+555430000000">` com o número visível formatado por `formatPhoneBR`, ícone `Phone`, e nunca abre nada no CRM. Aparece: no cartão e na ficha do item de prospecção (na ficha é a ação primária sólida; no cartão, `outline`, para não haver 50 botões sólidos numa tela: decisão D5), no card "Contato" do lead (`outline`, ao lado de "Abrir WhatsApp") e no cabeçalho da organização (telefone do decisor). Ao lado, WhatsApp; abaixo, os botões de resultado (na prospecção) ou o "Registrar atividade" (no lead e na organização). Nada de Twilio, nada de gravação.

### 6.11 Arrastar e soltar: HTML5 nativo, sem biblioteca (D-11)

`@dnd-kit/core` foi avaliado: traz sensores de teclado e de ponteiro (toque inclusive), anúncios para leitor de tela e sobreposição animada, por cerca de 12 KB gzip no cliente mais `@dnd-kit/sortable` para ordem manual. Decisão: **HTML5 nativo**, como o Trilis, porque (1) o que a acessibilidade exige aqui é um caminho equivalente, e ele já existe e é o oficial: o menu "Mover para ▾" no cartão de lead e o campo "Status" no diálogo da tarefa, ambos por teclado; (2) soltar um lead nunca grava: abre um diálogo, então a precisão de posição do `dnd-kit` não compra nada; (3) não há ordem manual de leads, e a de tarefas é uma posição fracionária simples; (4) no celular o padrão é Lista e o quadro de tarefas empilha as colunas com o "Status" no diálogo, então o sensor de toque não é necessário; (5) o design system veta bibliotecas novas sem ganho medido (D13). O quadro anuncia o arrasto em `role="status"` e esmaece as colunas bloqueadas; se em um mês a Daniela pedir reordenar tarefas pelo toque, `@dnd-kit` entra só no quadro de Tarefas.

### 6.12 Estados e mensagens (D-12)

| Onde | Estado | Texto |
|---|---|---|
| Quadro de leads, coluna vazia | vazio | "Nenhum lead em Diagnóstico." (sem botão) |
| Quadro de leads, pipeline vazio | vazio | O mesmo `EmptyState` da lista ("Nenhum lead de patrocinadores ainda." + "Cadastrar lead") |
| Quadro de leads, coluna com mais de 50 | rodapé | "ver todos os 73 em Lista ›" |
| Quadro de leads, arrasto | status | "Arrastando Rodrigo. Solte em: Diagnóstico, Perdido." |
| Quadro de leads, soltura bloqueada | toast | "Não dá para mover direto para Termo: avance um estágio por vez." |
| Quadro de leads, sucesso | toast | "Lead movido para Diagnóstico." (o do diálogo) |
| Alternância | controle | "Lista" / "Quadro" como links com `aria-current="true"` no ativo (`aria-pressed` só vale em `role="button"`); no celular, a primeira visita grava Lista sem troca de tela |
| Tarefas, quadro vazio | vazio | "Nenhuma tarefa aberta. Crie a primeira ou registre uma tarefa num lead." + "Nova tarefa" |
| Tarefas, filtro sem resultado | vazio | "Nenhuma tarefa sua atrasada." / "Nenhuma tarefa atrasada." + "Limpar filtros" |
| Tarefas, mover | toast | "Tarefa em andamento." / "Tarefa concluída." / "Tarefa reaberta." |
| Tarefas, salvar | toast | "Tarefa criada. Vence sex., 17 de out." / "Tarefa salva." |
| Tarefas, excluir | `ConfirmDialog` | "Excluir tarefa 'Enviar proposta'? Ela some da linha do tempo do lead; isso não pode ser desfeito." · botão "Excluir tarefa" |
| Tarefas, filtros | controle | "Só as minhas" / "Só atrasadas" como chips-link com `aria-current="true"` no ativo |
| Prospecção, índice vazio | vazio | "Nenhuma lista de prospecção ainda. Cole uma lista de empresas e comece a ligar." + "Nova lista" |
| Prospecção, lista vazia | vazio | "A lista está vazia. Use Colar lista para adicionar várias empresas de uma vez (nome, telefone e abertura), ou Adicionar para incluir uma por uma." |
| Prospecção, colar | prévia | "37 empresas reconhecidas · 2 telefones não reconhecidos" · botão "Adicionar 37" |
| Prospecção, descartar | `ConfirmDialog` | "Descartar 'Vinícola Exemplo'? Ela continua na lista como descartada." com o motivo (Sem interesse / Pediu para não contatar / Número errado / Outro) · botão "Descartar" |
| Prospecção, resultado | toast | "Registrado: sem resposta." / "Retorno marcado para sex., 17 de out." / "Empresa descartada." / "De volta para a ligar." |
| Prospecção, colar com descartados | toast | "37 empresas adicionadas; 2 já foram descartadas em outra lista (veja a anotação)." |
| Prospecção, WhatsApp | modal | título "WhatsApp · Vinícola Exemplo"; "Mensagem (revise antes de enviar)"; "outra versão"; "Abrir no WhatsApp"; aviso "O telefone desta empresa não serve para WhatsApp: confira o número na ficha." (telefone fixo: WhatsApp só com celular, `+55` + DDD + `9` + 8 dígitos) |
| Prospecção, WhatsApp aberto | cartão e ficha | "WhatsApp aberto há 2 d" (nunca "enviado": o CRM só sabe que abriu com o texto) |
| Prospecção, reunião marcada | diálogo | título "Reunião marcada · Vinícola Exemplo"; texto "A empresa vira organização, a pessoa vira lead em Patrocinadores (Qualificado) e a reunião fica no histórico."; campos: Nome de quem vai à reunião*, E-mail*, Telefone de quem vai à reunião (opcional; ajuda "O telefone da empresa já fica na organização."), Cargo, Data e hora da reunião*, Tipo (simulação 20 min / diagnóstico 30 min), Regime tributário (se soube), Interesse; botão "Confirmar reunião"; toast "Reunião marcada. Lead criado em Qualificado." com link "abrir lead" |
| Prospecção, e-mail já existente | diálogo | aviso dentro do diálogo depois da tentativa: "Já existe um lead com este e-mail; a reunião foi registrada nele." (sucesso, não erro); quando o lead estava perdido: "Lead reativado em Qualificado." |
| Prospecção, excluir lista | `ConfirmDialog` | "Excluir a lista 'Vinícolas' e suas 48 empresas? Leads e organizações já criados continuam no CRM." · botão "Excluir lista" |
| Prospecção, autosave na ficha | status | "Salvo" / "Salvando…" / "Não foi possível salvar" ao lado do título do bloco |
| Paleta | vários | seção 6.7 |
| Organização, notas | status | "Salvo às 14:32" / "Salvando…" / "Não foi possível salvar; tente de novo" |
| Organização, histórico vazio | vazio | "Nenhuma atividade registrada." |
| Painel, blocos novos | vazio | seção 6.8 |

Convenções de texto do design system (seção 8) valem: verbo no infinitivo nos botões, nada de id ou chave de enum na tela, datas por extenso quando há espaço.

## 7. O que muda no design system

Edições em `docs/design/crm-design-system.md` (feitas na Fase 3 do plano):

- **Seção 0, D11**: substituída pelo texto da seção 6.7 deste ADR, com a data e a referência ao ADR-004.
- **Seção 4.1 (desktop)**: a sidebar ganha o botão "Buscar…" com `<kbd>Ctrl K</kbd>` acima dos itens (40 px, `outline` discreto em `bg-background`, lupa à esquerda; no trilho só a lupa com `Tooltip`) e o rodapé do usuário (`Avatar` 32 px, nome 14 px/500, e-mail 12 px em `muted`, `DropdownMenu` com Minha conta e Sair; no trilho só o avatar); a lista de módulos passa a ser a da seção 6.1 (ícones novos `LayoutDashboard`, `KanbanSquare`, `PhoneOutgoing`, `SquareCheck`); o header perde o avatar e mantém caminho, busca e "Novo ▾" (que ganha "Nova tarefa" e "Nova lista de prospecção"); o item ativo ganha a "moldura" (fundo branco mais `ring-1 ring-border`, além da barra de 3 px; padrão estrutural do Trilis já expresso nos tokens).
- **Seção 4.2 (celular)**: barra inferior com Painel, Pipeline, Prospecção, Tarefas e Mais; a lupa do header abre a paleta; "Mais" lista Organizações, Projetos, Aportes, Exportar, Minha conta, Atalhos, Sair.
- **Seção 5.2**: componentes novos `StatRuler` (régua de medidores com hairlines), `CommandPalette`, `LeadBoard`, `TaskBoard`, `ViewToggle`, `AutosaveField` (textarea ou input que salva ao perder o foco por Server Action, com o status em texto) e os cartões de prospecção; `StatusBadge` ganha `kind="prospecting"` e `kind="priority"`.
- **Seção 6.3**: famílias novas: prospecção `a_ligar` neutral (`Phone`), `sem_resposta` warning (`PhoneMissed`), `retornar` info (`CalendarClock`), `reuniao_marcada` success (`CalendarCheck`), `descartado` outline (`Ban`); prioridade `alta` warning (`ArrowUp`), `media` neutral (`Minus`), `baixa` outline (`ArrowDown`); todas com texto visível.
- **Seção 7**: 7.2 "Hoje" passa a "Painel" com as duas réguas e os dois blocos novos; 7.3 ganha a alternância e o quadro (layout em palavras, cartão, regras de soltura, celular); 7.6 ganha a ficha nova; seções novas 7.13 "Prospecção" (índice, lista, ficha, modal de WhatsApp, diálogos) e 7.14 "Tarefas" (quadro, cartão, diálogo); 7.12 "Diálogos" lista os novos (Nova tarefa, Reunião marcada, Colar lista, WhatsApp).
- **Seção 8 (estados)**: as linhas da seção 6.12 deste ADR.
- **Seção 9 (acessibilidade)**: item novo "arrastar e soltar sempre tem caminho equivalente por menu ou campo; o arrasto é anunciado em `role="status"`".
- **Seção 10 (inventário)**: os arquivos novos do plano.

`docs/arquitetura/modelo-de-dados.md` ganha as seções 3.12 `prospecting_lists`, 3.13 `prospecting_items`, as colunas novas em 3.10 (com a regra de que `priority` e `position` são gravadas por todo caminho que insere `tarefa`) e `phone` em 3.3 (`organizations`), o valor `prospeccao` em 4.4 (com a regra "nenhuma migração usa valor de enum acrescentado por outra migração"), os índices e o CHECK alterado em 5 (com a explicação de por que `activities.prospecting_item_id` não é `SET NULL`), e a regra **R-19**: "Um item de prospecção vira lead só por 'Reunião marcada'; o lead criado entra em `novo` e é movido a `qualificado` por `moveLeadStage` com dono e próxima ação (um lead reaproveitado no terminal é reativado para `novo` e então movido a `qualificado`, pelo mesmo `moveLeadStage`); a reunião marcada basta para `qualificado` neste caminho, mesmo com regime `nao_sei` (exceção documentada ao critério de entrada de `personas-e-funis.md`); nenhum outro caminho grava `stage` fora de `moveLeadStage`." A seção 8 (não modelado) passa a citar `position` em `leads` (ordem manual do quadro) como decisão de não modelar.

## 8. LGPD e logs

- **Telefones de empresas prospectadas.** São dados de contato profissional (muitas vezes públicos); a base é o legítimo interesse para contato B2B (art. 7º, IX), com saída fácil (a frase "Responda SAIR" em toda primeira mensagem; "Descartar" na lista com o motivo, em que "Pediu para não contatar" registra a oposição em `data.reason` da `activities.ligacao`). A lista registra `source_detail` obrigatório (de onde vieram os dados), como `contacts` já faz, para atender ao art. 18. O item descartado permanece na lista (status) para não ser ligado de novo; "Voltar para a ligar" de um `nao_contatar` pede confirmação; ao colar o mesmo telefone em outra lista, o item nasce com a anotação "Descartada em {lista} ({motivo})" e o toast avisa (6.6). A limpeza segue R-17 (a Fase 1 só registra). O telefone da empresa fica em `organizations.phone`; o da pessoa, só quando ela o deu, em `contacts.phone` e `leads.phone` (6.4.7).
- **Logs (R-16).** Nenhuma action de prospecção loga `phone`, `name` da pessoa, `email` nem o texto do WhatsApp; só `tenantId`, `userId`, `listId`, `itemId`, `leadId`, `status`. O `redact` de `log.ts` já mascara chaves `phone`, `telefone`, `whatsapp` e `email` em qualquer profundidade; os testes das actions conferem que o `console` não recebe o número.
- **Paleta de busca.** Nunca devolve e-mail nem telefone ao cliente; busca itens de prospecção só por nome; o termo não é logado.
- **Exportação.** As duas tabelas novas entram em `/app/exportar` com o aviso existente ("contém dados pessoais; guarde com cuidado").
- **Consentimento.** A conversão não cria consentimento; a resposta sugerida por e-mail (ADR-003) continua bloqueada até a Daniela registrar o consentimento `contato_comercial` do lead convertido, como para qualquer lead cadastrado à mão.

## 9. O que fica fora e por quê

| Fora | Por quê |
|---|---|
| Tema escuro e identidade visual do Trilis | Decisão do dono (D-A); o próprio `PRODUCT.md` do Trilis lista "escuro cansativo" como risco; nada do visual é estrutura |
| Chat | Decisão do dono; depende de realtime que a arquitetura não tem; equipe de 3 que já se fala por WhatsApp |
| Docs (editor de blocos, árvore de páginas, anexos) | Decisão do dono; peça mais pesada do Trilis; anexos exigem storage privado e política de retenção (tabela `files`, Fase 2) |
| Telefonia pelo CRM (Twilio) e Treinamento de ligações | Decisão do dono (D-G); nem no Trilis estão ligados; dependem de conta, bundle regulatório, STT e storage de áudio |
| Ordem manual dos cartões de lead | `leads` sem `position`; a ordem por urgência é a mesma de Hoje e do `SlaIndicator`; ordem manual mudaria o que "prioridade" significa no CRM (D-C) |
| Arrastar livre que grava o estágio | Quebraria R-3, R-4, R-6 a R-11; o diálogo "Mover para" é o que garante os campos por estágio (D-C) |
| Push (service worker, VAPID) | Equipe de 3; "tarefas atribuídas a você" vai no e-mail diário (D-E) |
| Status manual da organização (lead/ativa/inativa) | A régua "Carteira" conta as ativas; sem pedido de edição manual |
| Remover contato na ficha da organização | Dado pessoal com origem registrada; apagar exige a política de retenção; fica para o cron de R-17 |
| Exclusão física de organização ou lead | LGPD e histórico pedem arquivar (regra de exclusão da seção 1 do modelo) |
| `@dnd-kit` | Seção 6.11 |
| Ações na paleta além de navegação e "Novo…" (ex.: "mover lead") | Mesma razão de D11: sem ganho medido; a paleta navega |
| Reordenar itens de prospecção por arrasto | A ordem de colagem basta; os chips por status são o filtro de trabalho |
| Busca por telefone na paleta | Evita expor telefone na resposta da paleta; na lista de prospecção a busca por nome cobre |

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Quem espera "arrastar livre" se frustra ao ver um diálogo a cada soltura | Colunas bloqueadas esmaecidas com a frase do motivo; o diálogo abre já no destino com a data sugerida; medir em um mês quantos movimentos nascem no quadro (seção 12) |
| Primeira visita sem cookie carrega as duas visões de `/app/leads` | Uma vez por aparelho (6.2); depois o cookie decide; sem troca de tela |
| `ALTER TYPE ... ADD VALUE` dentro da transação única do migrator | Regra de 6.4.4: nenhuma migração usa valor de enum acrescentado por outra; `tests/setup.ts` aplica todas as migrações num PGlite novo em todo arquivo de teste, o que prova o caminho a cada execução; sem reversão do enum, a reversão é da aplicação |
| Excluir lista ou item com ligações registradas | FK sem `SET NULL` e limpeza explícita das atividades órfãs na transação (6.4.3); teste cobre lista com item convertido e item não convertido |
| Lead perdido reaproveitado pela conversão | Reativado por dois `moveLeadStage` (6.6); se o segundo falhar, fica em `novo` com a reunião e a próxima ação, visível no pipeline |
| Chamada de repositório que usa `db` dentro da transação da conversão trava o PGlite | Regra de 6.6 (só `tx` dentro da transação); o teste da conversão roda no PGlite e travaria na hora |
| Relaxar o CHECK de `activities` para tarefas soltas deixa passar tarefa sem vínculo por outros formulários | Só `createTask` (repositório de tarefas) cria sem vínculo; `recordLeadActivity` e o `ActivityForm` continuam exigindo o registro; teste de repositório cobre |
| Conversão em transações separadas (criar, depois mover) pode deixar o lead em `novo` ou em `perdido` | Estado recuperável e visível; toast explica; log `warn`; a função devolve o `stage` real; teste simula a falha do segundo passo |
| Duplicidade de organização quando a mesma empresa aparece em duas listas | Reaproveitamento por nome exato antes de criar; a Daniela corrige o resto pelo "Vincular lead" |
| Telefone no centro do módulo de prospecção e R-16 | Actions logam só ids; testes com `vi.spyOn(console, …)` conferem; exportação com aviso |
| Notas da organização e autosave sem concorrência | Último a gravar vence (duas pessoas na mesma nota é raro com 3 usuários); registrado como melhoria (`updated_at` esperado no update) |
| Consultas agregadas do Painel sem índice ao crescer | Hoje dezenas de leads; `contributions` já tem índices por `(tenant_id, project_id, status)`; medir em um mês |
| Mais itens de menu para uma usuária não técnica | Oito itens com rótulos de uma palavra; barra inferior com os quatro do dia a dia |
| Esforço: cinco frentes em paralelo tocando o mesmo domínio | Fundação fecha schema, repositórios, validações, rótulos e stubs antes; frentes com arquivos disjuntos (o shell e a paleta são a frente E, que ninguém mais toca) (plano) |

## 11. Alternativas rejeitadas

| Alternativa | Por que não |
|---|---|
| Listas de prospecção como tag `lista:<slug>` sobre leads existentes | Obriga a criar um lead (com e-mail único) antes de ligar, o contrário do fluxo "colar 50 nomes e ligar" |
| Lead sem e-mail (`leads.email` nulo para `prospeccao`) | Ripple em consentimentos, `email_status`, resposta sugerida, unicidade e exportação; pedir o e-mail na reunião marcada é o que a Daniela já faz |
| Criar o lead convertido direto em `qualificado` no `INSERT` | Segunda escrita de `stage` fora de `moveLeadStage`; a atividade "Estágio alterado" e R-3 vivem lá |
| Tabela `tasks` separada | Tarefas já são `activities.tarefa` em Hoje, linha do tempo, `NextStepCard`, e-mail diário e exportação; três colunas novas custam menos que migrar tudo |
| Status de tarefa como enum gravado (`todo/doing/done`) | Contradiria `done_at`; derivar de `started_at` e `done_at` mantém `listOpenTasks` intacto |
| Posição de tarefa renumerada 1..n com N updates do cliente (Trilis) | Fora de transação e fora do repositório (R-15); posição fracionária grava uma linha |
| Paleta chamando um Route Handler | Server Action com `requireSession` é o padrão do projeto e passa pelo `auth-guard` |
| Busca com `cmdk` | A lógica de setas tem dez linhas; o `Dialog` do base-ui já traz foco e Esc |
| Avatar no header e no rodapé da sidebar ao mesmo tempo | Dois menus iguais na mesma tela; o rodapé é o padrão do Trilis que o dono pediu |
| Seis ou sete itens na barra inferior (todos os módulos, como o Trilis) | Princípio 5 do design system e alvos de 64 px; "Mais" resolve |
| `@dnd-kit` | Seção 6.11 |
| Mover Hoje para `/app/painel` e criar um `/app` novo | Mudaria URLs e o contador da sidebar sem ganho; o módulo só muda de rótulo |

## 12. Como medir em um mês

Revisão em 13/11/2026 com estas leituras (consultas no banco, sem ferramenta nova):

- **Quadro vs lista**: proporção de mudanças de estágio iniciadas pelo quadro: `activities.sistema` com `data.origin = 'board'` (a `moveLeadStageAction` passa a gravar `origin` quando o diálogo foi aberto pelo quadro) sobre o total de "Estágio alterado". Meta: acima de 50 % no pipeline Patrocinadores.
- **Prospecção**: listas criadas, itens colados, ligações registradas por semana (`activities.ligacao` com `prospecting_item_id`), taxa de reunião marcada (`reuniao_marcada / (itens - a_ligar)`), leads criados com `source = 'prospeccao'` e quantos chegaram a `diagnostico` e `proposta`. Meta de referência do funil (`personas-e-funis.md`, seção 11): 8 reuniões de diagnóstico PJ por mês.
- **WhatsApp**: envios registrados (`whatsapp_sent_at`) e quantos itens com envio viraram `reuniao_marcada` em até 7 dias.
- **Tarefas**: tarefas criadas pelo quadro vs pelo formulário do lead; tarefas soltas vs vinculadas; tempo médio em "Em andamento"; tarefas vencidas por dono no e-mail diário.
- **Paleta**: contagem de `log "busca"` por dia e grupos com resultado; se a paleta é usada e `/app/busca` não, o campo do header pode ficar só como atalho.
- **Painel**: se "Últimas atividades" e "Minhas tarefas" são abertos (cliques nos links, pelo analytics do Vercel já instalado) e se a régua "Carteira" bate com a planilha da Daniela.
- **Celular**: proporção de visitas a `/app/leads?view=quadro` abaixo de 960 px (analytics); se for zero, o quadro no celular pode sumir.
- **Dor do diálogo**: quantos arrastos terminam em "Cancelar" (evento de analytics `board_move_cancelled`); acima de 30 % indica que a coluna bloqueada precisa explicar melhor ou que a ordem manual importa.

## 13. Consequências

- Uma migração (`0003_*`), duas tabelas, quatro colunas em `activities`, uma em `organizations`, um valor de enum (sem reversão; a reversão é da aplicação, 6.4.4), um CHECK alterado, três índices; nenhuma dependência nova em runtime.
- `tests/isolation.test.ts` passa a cobrir `prospecting_lists`, `prospecting_items` e as consultas de tarefas e de busca, inclusive o nome que vem por `leftJoin` (um `lead_id` de outro tenant devolve `leadName = null`: todo `leftJoin` novo restringe o tenant na condição do join, como `orgJoin`/`ownerJoin` de `leads.ts`); `tests/shell-nav.test.ts` passa a esperar oito rótulos na nova ordem; `tests/auth-guard.test.ts` cobre quatro páginas e três arquivos de action novos.
- O design system muda nas seções 0 (D11), 4, 5.2, 6.3, 7, 8, 9 e 10; o modelo de dados ganha duas seções e a regra R-19.
- `docs/playbooks/README.md` passa a dizer onde a lista da semana vive (Prospecção) e como a reunião marcada entra no CRM (botão "Reunião marcada"); um guia curto da equipe nasce em `docs/produto/guia-da-equipe-crm.md` (Fase 3 do plano).
- Primeira revisão (um mês após publicar): as leituras da seção 12 decidem sobre ordem manual, `@dnd-kit` no quadro de Tarefas, quadro no celular, status manual de organização e remoção de contatos.
