# Plano de implementação do redesign do CRM

> Executa a especificação de `crm-design-system.md` em três fases. A Fase 1 é sequencial e bloqueia as demais; a Fase 2 tem sete frentes com arquivos disjuntos, uma por agente, em paralelo; a Fase 3 integra, limpa e faz o QA visual. Cada frente lista os arquivos que pode tocar, o que muda e os critérios de aceite verificáveis. Fora da lista de arquivos de uma frente, nada é editado.

## Regras para todos os agentes

1. Ler `docs/design/crm-design-system.md` inteiro antes de escrever código; em dúvida sobre Next 16 ou base-ui, ler `node_modules/next/dist/docs/` e os `.tsx` existentes em `src/components/ui/` (padrão `render`, `Popup`, `data-open`), nunca copiar snippets Radix da memória.
2. Nenhuma edição em `src/actions/**`, `src/lib/repos/**`, `src/lib/domain/**`, `src/lib/crm/{stage-moves,filters,format,dates,labels,enum-labels,lead-view,activity-text,attributes}.ts`, `src/proxy.ts`, `src/lib/routes.ts`, `src/components/site/**`, `src/components/simulator/**`. Toda regra de negócio continua onde está.
3. Toda `page.tsx` em `src/app/(app)/` começa com `const ctx = await requireSession();` (ou `await requireSession();` quando `ctx` não é usado); `tests/auth-guard.test.ts` cobra.
4. Nenhum `fetch` no cliente; dados só por Server Components e Server Actions existentes. Nenhuma dependência nova em `package.json` além dos componentes shadcn listados (que são arquivos copiados, não pacotes). Se `npx shadcn add` falhar, escrever à mão sobre `@base-ui/react` conforme a seção 5.1 da especificação.
5. Português do Brasil em todo texto visível; identificadores em inglês; nada de id, chave de enum ou código de regra na interface.
6. `"use client"` só nos componentes marcados como Client na especificação; o resto é Server Component.
7. Antes de entregar: `npm run lint && npm run typecheck && npm run format:check && npm run test`; a Fase 3 roda `npm run build` e as capturas.
8. Commits em português; uma frente por branch ou worktree; a Fase 3 integra.

## Fase 1: fundação (um agente, sequencial; ~1 dia)

Dois lotes no mesmo agente, na ordem. O lote 1B depende dos tokens e primitivos do 1A. Nenhuma página muda de aparência além do shell e dos primitivos (as páginas ainda usam os componentes antigos, que continuam compilando).

### Lote 1A: tokens, primitivos, componentes compartilhados e bibliotecas de apresentação

Arquivos (criar ou alterar):

- `src/app/globals.css`: bloco da seção 3.2 (tokens claros e escuros, `@theme inline`, `@custom-variant scripting`, `[data-crm]`, classes `.crm-*`, foco branco sobre fundo escuro, `.row-link`). Nada do site muda.
- `src/app/layout.tsx`: `export const viewport` com `viewportFit: "cover"`.
- `src/components/ui/badge.tsx`: raio `rounded-md`, altura `h-6`, variantes `neutral | info | brand | success | warning | danger` (mantendo `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`).
- `src/components/ui/button.tsx`: `size="touch"` (`h-11 px-4 text-sm`). Nada mais.
- `src/components/ui/card.tsx`: `border border-border` no lugar de `ring-1 ring-foreground/10`; `CardTitle` com `font-heading crm-h2` e prop `as?: "h2" | "h3" | "div"` (padrão `h2`).
- `src/components/ui/dialog.tsx`: "Fechar" nos dois lugares; `DialogTitle` sem serifa; folha inferior abaixo de `sm`; `DialogFooter` `bg-surface-2 sticky bottom-0`.
- `src/components/ui/table.tsx`: cabeçalho `bg-surface-2 crm-eyebrow`, células `px-3 py-2`, linha `group border-divider hover:bg-surface-2 focus-within:bg-primary-soft`, prop `density`.
- Novos `src/components/ui/{sheet,dropdown-menu,tooltip,skeleton,avatar,breadcrumb}.tsx` (seção 5.1).
- Novos `src/lib/crm/{describe-sla,next-step,status-tones,humanize-activity,initials}.ts` com testes `tests/lib/{describe-sla,next-step,status-tones,humanize-activity}.test.ts`.
- Novos `src/components/crm/ui/{page-header,stat-card,data-table,status-badge,sla-indicator,next-step-card,empty-state,toolbar,toolbar-autosubmit,detail-layout,key-value-list,timeline,form-section,form-actions,callout,step-flow,action-bar-mobile,confirm-dialog,meter,date-hint,segmented-control}.tsx` (seção 5.2).
- Primitivos de formulário compartilhados por várias frentes (por isso ficam aqui): `src/components/crm/forms/fields.tsx` (asterisco + `aria-required` no lugar de "(obrigatório)"; `placeholder` "Selecione" em `text-placeholder`; `dateHint`; `FormMessage` com tokens `error-soft`/`success-soft`), `src/components/crm/forms/attribute-fields.tsx` (grupos e `art27`, decisão D4), `src/components/crm/forms/submit-button.tsx` (`Loader2` girando; `size="touch"`; aceita `disabled` e `aria-describedby`), `src/components/crm/project-forms/action-form.tsx` (mesmas regras de rótulo; `Blockers` como checklist; `MoneyField` com prefixo "R$"; tokens no lugar de `amber`/`emerald`), `src/components/crm/project-forms/action-dialog.tsx` (prop `trigger?: ReactNode`, `size="touch"` no celular, `alert?: boolean` que troca para `ConfirmDialog`), `src/components/crm/project-forms/lead-picker.tsx` (resultados como lista de cards de 44 px, rótulos de segmento e estágio traduzidos por `SEGMENT_LABELS`/`stageLabel`).
- Componentes de aporte compartilhados pelas frentes C, E e F (por isso ficam aqui): `src/components/crm/contribution-table.tsx` (`DataTable`, `layout="table" | "cards"`, `ContributionStatusBadge` como reexport de `StatusBadge`) e `src/components/crm/contribution-steps.tsx` (`variant="row" | "flow"`, `nextStepFor`). Os diálogos (`contribution-dialogs.tsx`) ficam para a frente F; nesta fase só o botão visível e o "⋯" mudam.
- Componentes usados por duas frentes: `src/components/crm/whatsapp-button.tsx` (`variant="icon" | "text"`, `size="touch"`, `aria-label` com o nome) e `src/components/crm/forms/task-complete-button.tsx` (`size="sm" | "touch"`, ícone `Check`).
- `tests/tokens-contrast.test.ts`: lê `src/app/globals.css`, extrai os hex de `:root` e dos blocos novos, calcula o contraste dos pares da tabela 3.1 e falha se algum texto ficar abaixo de 4,5 : 1 ou `--input` abaixo de 3 : 1 sobre `#ffffff` e `#f4f1eb`.

Critérios de aceite do lote 1A:

- `npm run lint && npm run typecheck && npm run format:check && npm run test` verdes; o site público renderiza igual (`npm run build` sem erro; capturas de `/` e `/entrar` sem diferença visual além do botão `Button` que não mudou).
- `grep -rn "amber-\|emerald-" src/components/crm/forms src/components/crm/project-forms` devolve zero linhas.
- `grep -n "Close" src/components/ui/dialog.tsx` devolve zero linhas de texto visível.
- `tests/tokens-contrast.test.ts` cobre pelo menos os 18 pares de texto da tabela 3.1 e os dois pares de `--input`.
- `tests/lib/status-tones.test.ts` percorre `STAGES` e `CONTRIBUTION_STATUSES` e garante tom e ícone para todo par.
- `tests/lib/describe-sla.test.ts` cobre as oito situações da tabela da seção 5.2 com datas fixas em `America/Sao_Paulo`.
- `tests/lib/next-step.test.ts` cobre as cinco regras de `nextStepForLead` e um caso de `nextStepForProject` e de `nextStepForContribution`.
- `tests/lib/humanize-activity.test.ts` garante que nenhum id de 32 ou 36 caracteres aparece no texto devolvido para os `data` de `owner`, `score`, estágio e proposta de aporte.
- Nenhum arquivo de `src/app/(app)/app/**/page.tsx` foi editado neste lote.

### Lote 1B: shell, autenticação, estados de carregamento e busca

Arquivos:

- `src/app/(app)/layout.tsx`: `<div data-crm>` com skip link, `TooltipProvider`, `Sidebar` (lê `cookies().get("crm-sidebar")`), `Header`, `<main id="conteudo" className="bg-canvas …">`, `BottomBar`, `Toaster` com posição responsiva, `Shortcuts`. Calcula `overdueCount` com `listOverdueLeads(ctx, now, 20)` e `listOpenTasksWithLead(ctx, { dueTo: now, limit: 20 })` (somados). Remove a importação de `nav.tsx` (o arquivo é apagado na Fase 3).
- Novos `src/components/crm/shell/{sidebar,nav-items,bottom-bar,header,search-form,new-menu,user-menu,shortcuts,fab}.tsx`.
- Novo `src/app/(app)/app/busca/page.tsx` (+ `loading.tsx`): `requireSession`, `q` de `searchParams`, `Promise.all` de `searchLeads(ctx, { search: q, pageSize: 8 })`, `listOrganizationSummaries(ctx, { search: q, limit: 8 })`, `listProjectSummaries(ctx, { search: q, limit: 8, includeArchived: true })`; três grupos em `DataTable` compacta ou `EmptyState`.
- Novos `src/app/(app)/app/{error,not-found,loading}.tsx`, `leads/loading.tsx`, `leads/[id]/loading.tsx`, `organizacoes/loading.tsx`, `organizacoes/[id]/loading.tsx`, `projetos/loading.tsx`, `projetos/[id]/loading.tsx`, `aportes/loading.tsx`, `aportes/[id]/loading.tsx`.
- Novo `src/app/(auth)/layout.tsx` e movimentação com `git mv` de `src/app/(site)/entrar/` e `src/app/(site)/redefinir-senha/` para `src/app/(auth)/` (os arquivos movidos não são editados aqui; a frente G os edita no destino).
- Como `header.tsx` precisa de `breadcrumb`, `title` e `backHref` por página sem que as páginas mudem nesta fase, o layout deriva um breadcrumb padrão do `pathname` (via `headers()` não é possível sem proxy; usar um Client Component `HeaderCrumbs` que lê `usePathname()` e um mapa estático `{"/app": "Hoje", "/app/leads": "Leads", …}`; o nome do registro entra na Fase 2 por `PageHeader`, que renderiza o breadcrumb completo dentro do conteúdo). O header do shell mostra só o módulo; o `PageHeader` mostra o caminho inteiro.
- `tests/shell-nav.test.ts`: `renderToString(<NavItems items activeHref="/app/leads" collapsed={false} overdueCount={3} />)` contém `aria-current="page"` só no item Leads, os seis rótulos e o texto "3 itens vencidos".

Critérios de aceite do lote 1B:

- Em 1440 px: sidebar de 240 px com os seis itens, wordmark, contador em Hoje; "Recolher" grava o cookie e, após `router.refresh()`, a sidebar volta com 64 px sem flash (verificar com recarga da página); header com busca, "Novo ▾" com quatro itens (`/app/leads/novo`, `/app/organizacoes?novo=1`, `/app/projetos/novo`, `/app/aportes?novo=1`; na Fase 1 as duas URLs com `?novo=1` só abrem a lista, e as frentes D e F ligam o parâmetro ao diálogo), avatar com menu "Minha conta" e "Sair" funcionando.
- Em 390 px: barra inferior de cinco itens com rótulo, `aria-current` no ativo, "Mais" abrindo o `Sheet`; header com voltar, título e lupa; nenhuma rolagem horizontal no layout vazio.
- `/entrar` e `/redefinir-senha` continuam respondendo nas mesmas URLs sem cabeçalho e rodapé do site; `tests/proxy.test.ts` e `tests/site/*` verdes.
- `/app/busca?q=vin` devolve os três grupos; `/app/busca` sem `q` mostra o `EmptyState` de orientação; `tests/auth-guard.test.ts` verde com a página nova.
- Todo `loading.tsx` tem `role="status"` e texto `sr-only`.
- `(app)/app/error.tsx` é Client Component com `reset()`; `not-found.tsx` linka para `/app`.
- Teclado: Tab a partir do topo foca o skip link, depois a busca, "Novo", o avatar, os itens da sidebar e o conteúdo; `/` foca a busca e não dispara dentro de um input.
- Capturas de `/app` em 1440 e 390 px salvas em `scratchpad/shots/fase1/` (as páginas ainda têm o conteúdo antigo; só o shell importa aqui).

## Fase 2: páginas, sete frentes em paralelo (um agente por frente)

Pré-condição: Fase 1 integrada no branch base. Cada frente só edita os arquivos listados; componentes compartilhados que precisarem de ajuste viram nota para a Fase 3 (não se edita `src/components/crm/ui/**` nem `src/components/ui/**` nas frentes). Todas as frentes substituem `Row`/`Item`/`Section` locais por `KeyValueList`, `Card` e `FormSection`, trocam `amber-*`/`emerald-*` por tokens e usam `StatusBadge` no lugar de `Badge` cru.

### Frente A: Hoje

Arquivos: `src/app/(app)/app/page.tsx`, `src/components/crm/today.tsx`.

O que muda (seção 7.2): `PageHeader` com saudação e data por extenso; quatro `StatCard` com `href`; fila "Precisa de ação agora" (tarefas vencidas e de hoje, próximas ações vencidas, novos sem contato) ordenada na `page.tsx`, com `StatusBadge`, `SlaIndicator`, "Assumir" (`claimLeadAction`), "Registrar contato" (`/app/leads/[id]?registrar=1`), `TaskCompleteButton`, WhatsApp como ícone; "Próximos 7 dias" agrupado por dia; "Aportes previstos" e "Projetos com alerta" lado a lado com `Meter`; `EmptyState` único quando nada vence. `today.tsx` fica com `ActionQueue`, `UpcomingByDay`, `ContributionsPreview`, `ProjectsAlert` e as linhas; os blocos antigos somem.

Critérios de aceite:

- Em 1440 px a primeira dobra (900 px de altura) mostra os quatro números e pelo menos cinco linhas da fila "Precisa de ação agora".
- Cada `StatCard` é um link com `aria-label` que termina em "abrir lista"; os três hrefs batem com a decisão D15 (`/app/leads?sort=next_action`, `/app/leads?sort=created`, `/app/aportes?janela=15d`) e "Tarefas hoje" rola para `#tarefas`.
- Nenhuma linha usa `flex-wrap` como layout: grid de três colunas no desktop, dois andares no celular; altura mínima 44 px.
- Em 390 px a página com os dados de demonstração tem no máximo 1.800 px de altura (hoje 3.290) e nenhuma rolagem horizontal.
- Não existe "SLA estourado há" nem "sem dono" em texto solto na tela; o lead sem dono mostra o botão "Assumir".
- Com o banco vazio aparece "Nada vencido. Bom dia." e os StatCards com 0.
- `grep -n "border-amber\|border-destructive/40" src/components/crm/today.tsx` devolve zero.

### Frente B: Leads (lista, filtros, tabela e Novo lead)

Arquivos: `src/app/(app)/app/leads/page.tsx`, `src/app/(app)/app/leads/novo/page.tsx`, `src/components/crm/lead-table.tsx`, `src/components/crm/lead-filters.tsx`, `src/components/crm/forms/lead-create-form.tsx`.

O que muda (seções 7.3 e 7.5): `PageHeader` com "Novo lead" e "Importar CSV" desabilitado com `Tooltip`; `PipelineTabs` com rolagem interna no celular; `Toolbar` com busca, quatro selects, ordenação e "⋯ Mais filtros" (temperatura, perdidos), `Sheet` no celular; `LeadTable` vira `DataTable` com as cinco colunas e cards no celular; paginação com botões e `rel`; `EmptyState`s. Novo lead: `SegmentedControl` de segmento, quatro `FormSection` na ordem "Quem é", "De onde veio", "Consentimento (LGPD)", "Mais sobre …" (colapsada, com `count` e abertura automática em erro `attr_*`), `FormActions` sticky, foco no primeiro `[aria-invalid]`. O `AttributeFields` recebe `art27="collapsed"`.

Critérios de aceite:

- Em 390 px: nenhuma rolagem horizontal; o primeiro lead aparece a menos de 420 px do topo com os filtros fechados; "Filtrar (N)" mostra a contagem correta de filtros ativos (sem contar `pipeline` e `sort` padrão).
- Com JavaScript desligado o formulário de filtros ainda funciona pelo botão "Filtrar" (visível sem `scripting`); com JavaScript, mudar um select aplica o filtro sem clique.
- URLs geradas por `leadFiltersToQuery` são idênticas às de hoje para os mesmos filtros (teste manual com três combinações).
- A coluna "Dono" nunca corta o nome (avatar com `title`); lead sem dono mostra "Assumir" e, ao clicar, a navegação cai no detalhe do lead com o dono atribuído.
- O cabeçalho "Próxima ação" tem `aria-sort` quando `sort=next_action`.
- A linha inteira abre o lead com clique e com Enter no link do nome; o botão "Assumir" dentro da linha não abre o lead.
- Novo lead: um lead de evento com nome, e-mail, origem e o consentimento se cria sem abrir "Mais sobre a empresa"; a seção abre sozinha quando a validação devolve erro em `attr_*`; os três campos do art. 27 continuam no `FormData` enviado (conferir no teste existente de `createLeadAction` ou com um `console.log` temporário removido antes do commit); para PF, o checkbox de consentimento tem `required` e `aria-required`.
- Nenhum select mostra "não informado" como valor selecionado.

### Frente C: Lead (detalhe) e diálogos de lead

Arquivos: `src/app/(app)/app/leads/[id]/page.tsx`, `src/components/crm/activity-timeline.tsx` (vira adaptador fino sobre `Timeline`, ou é apagado e a página usa `Timeline` direto), `src/components/crm/forms/activity-form.tsx`, `src/components/crm/forms/lead-edit-dialog.tsx`, `src/components/crm/forms/owner-form.tsx`, `src/components/crm/forms/stage-move-dialog.tsx`, `src/components/crm/badges.tsx` (passa a reexportar `StatusBadge`; apagado na Fase 3).

O que muda (seções 7.4 e 7.12): `DetailLayout` com `PageHeader` (ações WhatsApp, e-mail, Editar, Mover para, "⋯" Marcar perdido), `Callout` para `?existente=1`, `NextStepCard` (`nextStepForLead` com `listOpenTasksWithLead` filtrado por `leadId`, ou `activities` abertas já carregadas), `FormSection id="registrar"` com `SegmentedControl` de tipo e `DateHint`, `Timeline` com `humanizeSystemActivity`; lateral com Resumo (`OwnerForm` inline no `change`), Contato, Aportes (`ContributionTable layout="cards"` + `NewContributionDialog` com os projetos carregados na página e `sponsorOrgs` via `listOrganizations(ctx, { type: "empresa" })`), Empresa (`KeyValueList hideEmpty`), Origem, Consentimentos, Simulações; `ActionBarMobile`. `StageMoveDialog`: destino com sufixo "· próximo/voltar/retorno/reativar", checklist, `Callout warning` para `blockedBy` com `openContributionProjectId`, `SubmitButton disabled` real, modo `lost` via `ConfirmDialog` com "Detalhe" só em "Outro", props `defaultTarget` e `trigger`. `ActivityForm`: lê `autoFocus` (de `searchParams.registrar`) e `#registrar`; toast "Contato registrado. Próxima ação: qui., 9 de out."

Critérios de aceite:

- "Registrar atividade" fica a menos de 600 px do topo em 1440 px (hoje 1.300) e é o segundo bloco da coluna principal.
- A linha do tempo não mostra nenhum id (`grep` visual por sequências de 32 hex na captura) e mostra "Responsável: ninguém → Rafael Teste" e "Proposta de R$ 30.000,00 em Cinema na Praça (Lei do Audiovisual, art. 1º-A)" com os dados de demonstração.
- "Campos do segmento" com 14 vazios mostra só os preenchidos e "Mostrar todos os campos (14 sem valor)".
- `/app/leads/[id]?registrar=1` abre com o foco no campo "O que aconteceu"; a `ActionBarMobile` "Registrar" faz o mesmo em 390 px.
- No diálogo "Mover para" com `blockedBy`, o botão de envio tem o atributo `disabled` (inspecionar o DOM), não só `pointer-events-none`; o `Callout` linka para `/app/projetos/{id}` quando há aporte aberto.
- "Marcar perdido" abre um `role="alertdialog"`; o botão fica desabilitado até escolher o motivo; "Detalhe" só aparece com "Outro"; o lead perdido continua reativável pelo "Mover para" (movimento `reactivate`).
- `datetime-local` tem `DateHint` ao lado nos dois campos do formulário de atividade e no "Mover para".
- Em 390 px a ordem é cabeçalho → Próximo passo → Resumo → Contato → Registrar (fechado) → Aportes → demais em `<details>` → Linha do tempo; altura total com os dados de demonstração ≤ 2.400 px (hoje 3.467).
- `tests/actions/crm-leads.test.ts` continua verde (nenhuma action mudou).

### Frente D: Organizações (lista, detalhe e diálogos)

Arquivos: `src/app/(app)/app/organizacoes/page.tsx`, `src/app/(app)/app/organizacoes/[id]/page.tsx`, `src/components/crm/organization-dialogs.tsx`, `src/components/crm/organization-form.tsx`.

O que muda (seção 7.6): `PageHeader` + `Toolbar` (busca, tipo; parâmetros `q` e `tipo` inalterados) + `DataTable` com cards no celular; FAB e `?novo=1` abrindo `NewOrganizationDialog` (prop `defaultOpen`); `NewOrganizationDialog` ganha `defaultType` (usado pela frente E via `/app/organizacoes?novo=1&tipo=proponente`). Detalhe: `DetailLayout`, contatos e leads como `DataTable`, `KeyValueList hideEmpty` com `hint` do CNPJ, "Projetos deste proponente" (filtro em memória), `EditOrganizationForm` dentro de `Sheet side="right"`, `EmptyState`s com ação, `ActionBarMobile`.

Critérios de aceite:

- Lista: linha inteira clicável; CNPJ em `.crm-code`; zeros viram "—"; em 390 px cards sem rolagem horizontal.
- `/app/organizacoes?novo=1` abre o diálogo de nova organização ao carregar; `&tipo=proponente` pré-seleciona o tipo.
- Detalhe: "Editar" no cabeçalho abre o `Sheet` com o formulário atual; salvar fecha o `Sheet` e atualiza os dados (`router.refresh()` do `ActionDialog`/`ActionForm`).
- E-mail e telefone dos contatos são links `mailto:`/`tel:`; "decisor" tem ícone e texto.
- Organização do tipo proponente mostra o bloco "Projetos deste proponente" com os projetos da demonstração; os outros tipos não mostram o bloco.
- `tests/actions/*organizations*` (se existirem) e `tests/auth-guard.test.ts` verdes.

### Frente E: Projetos (lista, detalhe, novo e diálogos)

Arquivos: `src/app/(app)/app/projetos/page.tsx`, `src/app/(app)/app/projetos/[id]/page.tsx`, `src/app/(app)/app/projetos/novo/page.tsx`, `src/components/crm/project-dialogs.tsx`, `src/components/crm/project-form.tsx`, `src/components/crm/project-badges.tsx` (reexport de `StatusBadge`; apagado na Fase 3).

O que muda (seções 7.7 e 7.8): quatro `StatCard` na lista; `Toolbar` com chips; `DataTable` com `Meter` e alertas como ícone + `sr-only`; detalhe com `PageHeader` (Publicar desabilitado com `Tooltip`, "⋯" Arquivar via `ConfirmDialog`), cinco `StatCard`, `NextStepCard` (`nextStepForProject`), `ContributionTable layout="cards"`, `Timeline`, lateral com `KeyValueList`, Comissão com `Meter` e `Callout danger`, Publicação; `EditProjectForm` em `Sheet`; Novo projeto com `FormSection`s, prefixo "R$", prévia do slug, `EmptyState` sem proponente com link para `/app/organizacoes?novo=1&tipo=proponente`, `FormActions`.

Critérios de aceite:

- Na lista em 1440 px nenhuma badge é cortada (a coluna "Alertas" não existe mais); o alerta aparece como ícone com `sr-only` e `Tooltip` na célula de prazo ou de captado.
- `?alertas=1` continua filtrando; o `StatCard` "Com alerta" leva a essa URL.
- Detalhe: h1 em serifa e títulos de card em serifa (uma voz); a linha do aporte tem 44 px com um botão visível ("Emitir recibo") e "⋯" com "Registrar comissão" e "Cancelar aporte".
- "Publicar no site" fora de Captando está `disabled` com `aria-describedby` explicando; em Captando abre o diálogo.
- "Arquivar" abre `role="alertdialog"`, botão desabilitado até o motivo, "Detalhe" só em "Outro".
- Linha do tempo mostra "Elaboração → Inscrito", nunca `elaboracao`.
- Novo projeto: sem proponente, o formulário não aparece e o botão leva a `/app/organizacoes?novo=1&tipo=proponente`; com proponente, criar um projeto só com proponente, mecanismo e nome funciona; "Aprovação" aparece com o badge "exigido em Autorizado".
- `tests/actions/crm-projects.test.ts` verde.

### Frente F: Aportes (lista, detalhe e diálogos)

Arquivos: `src/app/(app)/app/aportes/page.tsx`, `src/app/(app)/app/aportes/[id]/page.tsx`, `src/components/crm/contribution-dialogs.tsx`.

O que muda (seções 7.9 e 7.12): quatro `StatCard` (previstos com `href="?janela=15d"`), abas de status com contagem, `Toolbar` (busca `q`, `projeto`, chip `janela=15d`; filtros aplicados em memória sobre `listContributionSummaries`), uma `ContributionTable layout="table"`, "Totais por projeto" em `<details>`; `?novo=1` e FAB abrindo `NewContributionDialog`. Detalhe com título "R$ 200.000,00 · Cláudio Bertolini → Festival…", `StepFlow`, `NextStepCard` (`nextStepForContribution`), `KeyValueList hideEmpty`, `Timeline`, "Cancelar aporte" no "⋯". Diálogos: descrições com o efeito do passo, `Blockers` como checklist, `Callout warning` de 5 % em "Confirmar depósito", limites de comissão em `KeyValueList`, "Cancelar aporte" via `ConfirmDialog`.

Critérios de aceite:

- A página tem uma tabela principal (as outras duas viram StatCards e `<details>`); linhas de 44 px; em 390 px cards sem rolagem horizontal.
- `?status=`, `?q=`, `?projeto=` e `?janela=15d` combinam entre si e com as abas; a contagem nas abas bate com `CONTRIBUTION_STATUSES`.
- Detalhe: o `StepFlow` marca `aria-current="step"` no passo atual e mostra as datas dos concluídos; para aporte cancelado, todos os passos em `cancelled` e `Callout danger` com o motivo.
- "Confirmar depósito" com 210.000 sobre 200.000 propostos mostra o `Callout warning` e ainda deixa enviar; com 200.000 não mostra.
- "Cancelar aporte" abre `role="alertdialog"`; a nota é obrigatória quando já depositado.
- `tests/actions/crm-contributions.test.ts` verde.

### Frente G: Exportar, Minha conta, Entrar e Redefinir senha

Arquivos: `src/app/(app)/app/exportar/page.tsx`, `src/app/(app)/app/conta/page.tsx`, `src/app/(app)/app/conta/forms.tsx`, `src/app/(auth)/entrar/page.tsx`, `src/app/(auth)/entrar/login-form.tsx`, `src/app/(auth)/redefinir-senha/page.tsx`, `src/app/(auth)/redefinir-senha/forms.tsx`.

O que muda (seções 7.1, 7.10 e 7.11): Exportar com `Callout warning` LGPD, lista em card com ícone, descrição e "Baixar CSV", `EmptyState size="sm"` da importação; Conta com `Avatar`, `KeyValueList`, `FormSection` "Trocar senha" com mostrar/ocultar e `FormActions`, seção "Atalhos de teclado"; Entrar e Redefinir no cartão do layout `(auth)`, mostrar/ocultar senha, `Callout`s com foco, banner de sessão expirada, "Voltar ao site".

Critérios de aceite:

- `/entrar` em 390 px cabe numa tela (≤ 700 px de altura) e não tem rodapé institucional; em 1440 px o cartão tem 400 px de largura centrado em areia.
- O botão de mostrar senha tem `aria-pressed` e alterna o `type`; o erro de login recebe o foco ao aparecer (`document.activeElement` é o `Callout`).
- `/entrar?next=/app/leads` mostra o banner "continuar em Leads"; `/entrar?reset=1` mostra o `Callout success`.
- `/redefinir-senha?error=INVALID_TOKEN` mostra `Callout danger`; após pedir o link, o formulário some e a frase de confirmação aparece.
- Exportar: oito linhas com botão "Baixar CSV" apontando para `/app/exportar/{table}` com `download`; o aviso LGPD tem `role="note"` ou `status` e ícone.
- Conta: trocar senha com sucesso mostra a mensagem em `success-soft` e esconde os campos (comportamento atual); a tabela de atalhos lista `/`, `Esc`, `Tab`/`Enter`.
- `tests/actions/auth.test.ts`, `tests/actions/account.test.ts`, `tests/proxy.test.ts` verdes.

## Fase 3: integração e QA visual (um agente, depois de todas as frentes)

Arquivos: qualquer um dos listados nas fases anteriores (ajustes de integração), mais `src/components/crm/nav.tsx`, `src/components/crm/badges.tsx`, `src/components/crm/project-badges.tsx` (apagar), `docs/arquitetura/scaffold.md` (atualizar a árvore de `src/components/crm/` e `src/app/(auth)`), `docs/arquitetura/next16-convencoes.md` (nota sobre `[data-crm]`, `(auth)` e `scripting`), `docs/README.md` (já indexa os dois documentos de design).

Tarefas:

1. Integrar as sete frentes no branch base; resolver conflitos só em arquivos compartilhados (não deve haver, pela divisão).
2. Apagar `nav.tsx`, `badges.tsx`, `project-badges.tsx` e todo reexport temporário; `grep -rn "from \"./badges\"\|project-badges\|crm/nav" src` devolve zero.
3. Varredura de resíduos: `grep -rn "amber-\|emerald-\|underline underline-offset-4\|(obrigatório)\|pointer-events-none opacity-50\|não informado</" src/app/(app) src/components/crm` e corrigir o que sobrou (o "não informado" só pode aparecer como `emptyLabel` do `KeyValueList`).
4. Varredura de ids: com os dados de demonstração, abrir lead, projeto e aporte e confirmar que nenhuma sequência de 32 ou 36 caracteres hexadecimais aparece.
5. Regra do vinho: nas 16 capturas, confirmar que nenhum botão sólido é vinho e que o vinho só aparece em foco, badges `brand`, barra do `NextStepCard` e "CRM" do wordmark.
6. Capturas "depois": as mesmas 16 telas × 2 larguras em `scratchpad/shots/depois/` (script existente), comparadas lado a lado com `antes/`; registrar altura de página de Hoje, Leads e Lead em 390 px.
7. Teclado, manual, em 1440 px: Tab do topo ao fim de Hoje (skip link, header, sidebar, StatCards, linhas, ações); "Mover para" inteiro só com teclado (abrir, escolher destino, preencher data, enviar, foco de volta ao gatilho); tabela de Leads (Enter abre a linha, Tab alcança "Assumir"); `Sheet` de filtros no celular (abrir, aplicar, fechar com Esc).
8. Leitor de tela (VoiceOver no Safari ou NVDA): ler os StatCards de Hoje, um badge de estágio, um `SlaIndicator` vencido e um `ConfirmDialog`; confirmar texto e papéis.
9. `npm run check` (lint, typecheck, format:check, test, build) verde; `npm run smoke` se o ambiente permitir.
10. Atualizar `docs/arquitetura/scaffold.md` (seção 4, árvore) e `docs/arquitetura/next16-convencoes.md` (seção "Padrões que vamos seguir": `[data-crm]`, route group `(auth)`, variante `scripting`, cookie `crm-sidebar`).
11. Relatório final em português: o que mudou por tela, medidas antes/depois (altura em 390 px, posição do "Registrar atividade", número de "não informado" visíveis), pendências para uma fase de produto (abaixo).

Critérios de aceite da Fase 3:

- `npm run check` verde; nenhuma dependência nova em `package.json`.
- 16 capturas × 2 larguras em `shots/depois/` sem rolagem horizontal de página em 390 px.
- Hoje em 390 px ≤ 1.800 px de altura; Lead em 390 px ≤ 2.400 px; "Registrar atividade" ≤ 600 px do topo em 1440 px.
- Zero ocorrências de `amber-`, `emerald-`, "Close", "SLA estourado há" e de ids hexadecimais nas telas do CRM.
- `tests/auth-guard.test.ts`, `tests/lint.test.ts`, `tests/tokens-contrast.test.ts`, `tests/shell-nav.test.ts` e os de `tests/lib/` verdes.

## Fase opcional (depois do uso real, não faz parte da entrega)

- `?registrar=1` no `redirect` de `claimLeadAction` (uma linha em `src/actions/crm-leads.ts`) para "Assumir" já abrir o formulário focado.
- Filtro `proponentOrgId` em `listProjectSummaries` (repositório) para substituir o filtro em memória do bloco "Projetos deste proponente".
- Atalho `n` (Novo) lendo `data-new-href` do `PageHeader`.
- "Desfazer" em concluir tarefa e em marcar perdido (exige `reopenTaskAction` e `reactivateLeadAction`, Server Actions novas).
- Contagem de linhas em Exportar e registro da última exportação.
- Paleta de comandos com Server Action de busca.
