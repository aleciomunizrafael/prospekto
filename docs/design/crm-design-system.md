# Sistema de design do CRM Prospekto: "Mesa de trabalho"

> Especificação final do redesign do CRM de captação (`src/app/(app)/**`), consolidada a partir da proposta vencedora do painel (#0, "Mesa de trabalho") com os enxertos aprovados das propostas #1 ("Ateliê") e #2 ("Centro de comando"). Vale como fonte de verdade para quem implementa; o plano por fases e por agente está em `crm-redesign-plano.md`. Base: `docs/visao.md`, `docs/estrategia/personas-e-funis.md` (seção 8), `docs/arquitetura/modelo-de-dados.md`, `docs/arquitetura/scaffold.md`, o código atual e as 32 capturas de `scratchpad/shots/antes/` (1440 px e 390 px) feitas em 06/10/2026.

Quem usa é a Daniela: consultora experiente em leis de incentivo, sozinha, não técnica, no notebook e no celular. O CRM precisa responder em cinco segundos "o que eu faço agora?" e deixar a ação certa a um toque. Nada do que o sistema faz hoje é removido: estágios, SLAs, campos obrigatórios por movimento (regras R-3, R-4, R-6 a R-11), consentimentos LGPD, exportação CSV, comissões e checagem do art. 27 continuam onde estão, em `src/lib/domain/`, `src/lib/repos/` e `src/actions/`. O redesign é de apresentação, navegação e microinteração.

## 0. Decisões que resolvem as contradições do painel

As propostas e os dois pareceres divergem em alguns pontos. A tabela abaixo fecha cada um; o resto do documento assume estas decisões.

| # | Tema | Decisão final | Por quê |
| --- | --- | --- | --- |
| D1 | Onde fica o `NextStepCard` do lead | Coluna principal, primeiro bloco, acima de "Registrar atividade"; no celular logo após o cabeçalho compacto. Também existe no projeto e no aporte. | Enxerto do juiz 1 é explícito; é o que tira a Daniela de "ler campos" para "agir". O juiz 2 aceitou a derivação de `stageMovePlans`; a posição lateral que ele sugeriu perderia o bloco no celular. |
| D2 | Onde o próximo passo é calculado | Arquivo novo e puro `src/lib/crm/next-step.ts` (`nextStepForLead`, `nextStepForProject`, `nextStepForContribution`), com testes em `tests/lib/next-step.test.ts`. Ordem para o lead: tarefa vencida > próxima ação vencida > "registrar primeiro contato" (estágio inicial sem `lastContactAt`) > "próximo estágio: X, exige Y" (de `stageMovePlans`). | Função de apresentação nova; nenhuma função existente de `src/lib/crm/` ou `src/lib/domain/` muda (restrição dos dois juízes). A ordem da fila "Precisa de ação agora" de Hoje fica na própria `page.tsx`, sem `priorities.ts`. |
| D3 | Frases humanas de SLA | Função nova `describeSla(info, nextActionAt, now)` em `src/lib/crm/describe-sla.ts`, usada só por `SlaIndicator` e pelo `NextStepCard`. `stageInfo`, `describeOverdue` e `dates.ts` não mudam. Nunca "SLA estourado há 151 h" na tela. | Enxerto dos dois juízes; preserva as funções cobertas por `tests/lib/deadline.test.ts`. |
| D4 | Campos do art. 27 no formulário "Novo lead" | Os três campos continuam enviados e gravados (nada funcional muda), mas `AttributeFields` passa a agrupar em "Empresa e regime", "Qualificação" e "Checagem do art. 27 (só antes de Termo)"; na criação, o grupo do art. 27 fica num `<details>` fechado dentro da seção colapsada "Mais sobre a empresa". Em "Editar" e no diálogo "Mover para Termo" os campos aparecem abertos. | Juiz 1 queria tirá-los da criação; juiz 2 vetou por ser mudança funcional. Esconder atrás de dois níveis de `<details>` atende aos dois: a Daniela não os vê ao cadastrar e nada deixa de existir. |
| D5 | Cor da ação primária | Azul-profundo (`--primary`) é a única cor de botão sólido. Não existe `variant="brand"` em `button.tsx`. Vinho (`--brand`) fica reservado a: anel de foco, fundo `--brand-soft` dos badges de fechamento, barra de 3 px à esquerda do `NextStepCard` e o rótulo "CRM" do wordmark. | Rejeição do juiz 1 (vinho = urgência e vinho = ação no mesmo viewport confundem) prevalece sobre o enxerto do juiz 2; a regra "um acento por viewport" fica garantida por construção. |
| D6 | Canvas areia | Escopado em `[data-crm]` no `(app)/layout.tsx`: o `<main>` do CRM usa `bg-canvas` (`--canvas: #F4F1EB`) e os cartões são brancos com `border border-border`. `--background` continua branco (inputs, popovers, sheets e cards dependem dele). O site público não muda. | Enxerto do juiz 1 com a restrição de escopo dos dois juízes. |
| D7 | Serifa | `CardTitle` mantém `font-heading`; h1 28/34 serif, h2 (título de seção e de card) 18/24 serif, KPI 32/36 serif. Só `DialogTitle` passa a sans 16/600. | Enxerto do juiz 1: a inconsistência de `projeto-detalhe-desktop.png` se resolve pondo o h1 em serif, não apagando a serif dos cards. |
| D8 | Borda de campo (`--input`) | `#8F8A80` dentro de `[data-crm]`: 3,43 : 1 sobre branco e 3,05 : 1 sobre areia. O `#9A958B` da proposta #0 dá 2,98 : 1 sobre branco (calculado), abaixo de 3 : 1. | WCAG 1.4.11. |
| D9 | Tabelas no celular | `DataTable` renderiza `<ul>` de cards com as três colunas prioritárias abaixo de `md` (960 px). Nenhuma rolagem horizontal de página. | Rejeição de `stickyFirstColumn` pelos dois juízes. |
| D10 | Linha clicável | Link real no nome, com `relative` no primeiro `<td>` e `after:absolute after:inset-0` no link; botões e outros links da linha com `relative z-10`. Nunca `onClick` na `<tr>`. | Juiz 2 apontou o suporte irregular de `position: relative` em `<tr>`. |
| D11 | Atalhos de teclado | **Revisada em 13/10/2026 pelo ADR-004 (seção 6.7).** `/` foca o campo de busca do header; **Ctrl+K (Cmd+K no Mac) abre a paleta de busca em qualquer tela**, inclusive com o foco em um campo de texto, mas nunca sobre outro diálogo, `alertdialog` ou menu aberto. Nenhum outro atalho de letra solta entra (`n`, `g h/l/o/p/a`, `j/k` e o diálogo `?` continuam fora). O botão "Buscar…" da sidebar, a lupa do header no celular e a própria paleta mostram o atalho como `<kbd>`: a pessoa descobre o atalho olhando, não decorando. `/app/busca` continua existindo como a página de "ver todos os resultados" e como destino sem JavaScript do formulário do header. A tabela de atalhos de "Minha conta" ganha a linha do Ctrl K. | Texto original (juiz 1: treinamento disfarçado para usuária não técnica; juiz 2: custo sem ganho medido) mantido para letras soltas. Ctrl+K convive porque é um acorde com modificador (não dispara ao digitar), é o atalho que a Daniela já conhece de outros programas e é o gesto do Trilis que motivou o pedido. |
| D12 | Estado da sidebar | Cookie `crm-sidebar=rail` lido com `cookies()` no `(app)/layout.tsx`; sem `localStorage`. | Sem flash na hidratação. |
| D13 | Testes de interface | `tests/tokens-contrast.test.ts` (lê `globals.css`, calcula os pares da seção 3.1) e `tests/shell-nav.test.ts` (renderiza o componente puro `NavItems` com `renderToString` e checa `aria-current` e rótulos). Sem `@testing-library/react`, sem Playwright, sem axe. | "Nada de bibliotecas pesadas novas". |
| D14 | "Assumir" em Hoje | `claimLeadAction` não muda: já redireciona para `/app/leads/[id]`, onde o formulário "Registrar atividade" agora é o segundo bloco (depois do `NextStepCard`). O parâmetro `?registrar=1` é lido pelo detalhe do lead para focar o formulário e é usado pelos links "Registrar contato" de Hoje (leads que já têm dono) e pela `ActionBarMobile`. Acrescentar `?registrar=1` ao `redirect` da action é uma linha fora do escopo do redesign, anotada no plano como opcional. | Zero edição em `src/actions/`. |
| D15 | `StatCard` de Hoje com link | Só filtros que já existem: `/app/leads?sort=next_action`, `/app/projetos?alertas=1` (o parâmetro atual chama-se `alertas`), `/app/aportes?janela=15d` (parâmetro novo lido só em `aportes/page.tsx`, filtrando em memória por `expectedCloseAt`). | Nenhum repositório novo. |
| D16 | Marcar perdido, Cancelar aporte, Arquivar | Diálogo com `role="alertdialog"` (`ConfirmDialog`, sobre `@base-ui/react/alert-dialog`), motivo em `<select>`, campo "Detalhe" só quando o motivo é "Outro", botão de confirmação `disabled` até o motivo ser escolhido. | Enxertos do juiz 1 e rejeição do `RadioGroup` de 11 itens. |
| D17 | Filtros no celular | `Sheet side="bottom"` com gatilho "Filtrar (2)" mostrando a contagem de filtros ativos; no desktop, `Toolbar` em linha com aplicação no `change`. | Enxerto dos dois juízes. |
| D18 | Busca global | Página `/app/busca` (Server Component) com `Promise.all` sobre `searchLeads`, `listOrganizationSummaries({ search })` e `listProjectSummaries({ search })`, 8 resultados por grupo. Sem repositório novo. | Proposta #0, confirmada pelos juízes. |
| D19 | O CRM exige JavaScript (sem fallback "sem script") | As páginas chegam por streaming com `loading.tsx`: sem JavaScript o navegador fica no esqueleto, então um botão "Filtrar" ou "Atribuir" visível só sem script nunca seria alcançado. Não há variante `scripting` nem botões de fallback; a `Toolbar` aplica os filtros no `change` dos `<select>` e a busca envia com Enter; o `OwnerForm` envia no `change`. Os formulários continuam `<form method="get">`/Server Actions normais, o que mantém a semântica e o teclado. | Fiel ao que o App Router entrega (revisão da Fase 3); menos código morto. |
| D20 | Entrar e Redefinir senha | Saem de `(site)` para um route group novo `src/app/(auth)/` com layout próprio (sem cabeçalho e rodapé do site). URLs `/entrar` e `/redefinir-senha` não mudam; `src/proxy.ts` e `src/lib/routes.ts` intactos. | As três propostas e os dois juízes. |

## 1. Diagnóstico do estado atual (nas capturas)

| Tela | O que a captura mostra | Consequência |
| --- | --- | --- |
| `hoje-desktop.png` | Sete blocos com a mesma moldura; urgência só pela cor da borda; cada linha mistura nome, empresa, pipeline, SLA, origem, data, temperatura e dono em `flex-wrap`. | Sem leitura de relance; informação só por cor (WCAG 1.4.1). |
| `hoje-mobile.png` | Navegação em três linhas (110 px); "Assumir" cai órfão; 3.290 px de altura para 26 itens. | Tela principal inutilizável no celular. |
| `leads-desktop.png` | Painel de 8 filtros e botão "Filtrar" (150 px) antes do primeiro lead; coluna "Dono" cortada ("Rafael T"); badge "Frio" em todas as linhas; só o nome é clicável. | Filtro é ruído, temperatura é ruído, tabela não é "excelente". |
| `leads-mobile.png` | Filtros ocupam 600 px; a tabela mostra só Nome e Empresa com rolagem lateral. | Estágio e próxima ação, o que importa, ficam fora da tela. |
| `lead-detalhe-desktop.png` | Oito cards iguais; "Campos do segmento" com 19 "não informado"; linha do tempo com ids crus (`contributionId: 68921684-…`, "de ninguém para 4z3JXEAc…"); "Registrar atividade" a 1.300 px do topo; `datetime-local` em "01:10 PM". | A ação mais frequente é a mais distante; a tela diz "faltam dados" em vez de "o que eu sei". |
| `lead-novo-desktop.png` | 24 campos de uma vez, 14 selects "não informado", art. 27 na criação. | Cadastrar um lead de evento parece um censo. |
| `organizacoes-*.png` / `organizacao-detalhe-*.png` | "0 / 0" sem convite a agir; CNPJ em fonte proporcional; "Editar dados" é um `<details>` com link sublinhado. | Padrão de edição diferente em cada tela. |
| `projetos-desktop.png` | Badges de alerta cortadas ("menos de", "abaixo de"); percentual em `text-xs`; sem barra. | O dado mais importante da carteira não se lê de relance. |
| `projeto-detalhe-desktop.png` | Título de card em serif, h1 em sans; linha de 130 px porque "Passos" empilha três botões; nove linhas "sistema" com rótulo cru. | Duas vozes tipográficas; ações de aporte competem com a ação do projeto. |
| `aportes-desktop.png` | Três tabelas na mesma página; linhas de 130 px; pílulas de status parecem botões. | A tela principal de dinheiro é a mais pesada. |
| `aporte-detalhe-desktop.png` | Doze pares rótulo/valor, sete "—"; o fluxo proposta → termo → depósito → recibo → contador não aparece como etapas. | Ela não vê "em que passo estou e o que falta". |
| `entrar-*.png` / `redefinir-senha-*.png` | Formulário dentro do layout do site; no celular o rodapé institucional é quatro vezes maior que o formulário. | Página de trabalho com cara de página institucional. |
| Navegação (todas) | Só texto; "Sair" é o botão mais visível; sem busca; sem indicador além do fundo areia. | Nenhum caminho para "achar a Marina" sem ir em Leads e filtrar. |

## 2. Princípios

1. **A primeira tela responde "o que eu faço agora?".** Hoje ganha quatro `StatCard` clicáveis e uma fila "Precisa de ação agora" ordenada por urgência; cada detalhe (lead, projeto, aporte) abre com um `NextStepCard` com o botão do passo.
2. **Hierarquia por peso e espaço; cor só quando significa algo.** Serifa em h1, h2 e números grandes; badges em cinco famílias semânticas sempre com texto; temperatura "frio" some da tabela; azul-profundo em uma única ação primária por tela; vinho como acento raro (D5).
3. **Tudo a um clique, nada a quatro.** Linha inteira clicável; "Registrar atividade" no topo do lead; "Mover para" fixo no cabeçalho; "Novo" no header para criar qualquer coisa de qualquer tela; busca global; filtros aplicam no `change`.
4. **Mostrar o que existe, esconder o que não existe.** `KeyValueList` omite vazios e oferece "Mostrar todos (14 sem valor)"; "Novo lead" mostra 7 campos e dobra o resto; a linha do tempo traduz dados do sistema em frases.
5. **Celular é um modo, não uma degradação.** Barra inferior de cinco destinos; tabelas viram cards; `ActionBarMobile` fixa nos detalhes; diálogos viram folha inferior; alvos de 44 px; nenhuma rolagem horizontal de página.
6. **Linguagem humana, zero jargão de sistema.** "Sem contato há 6 dias (prazo: 1 dia útil)" em vez de "SLA estourado há 151 h"; nunca id, chave de enum ou nome interno na interface.

## 3. Tokens

Tudo entra em `src/app/globals.css`. Os valores abaixo são finais; os contrastes foram calculados pela fórmula de luminância relativa do WCAG 2.x (script em `tests/tokens-contrast.test.ts`).

### 3.1 Cores (modo claro)

| Token | Valor | Papel | Contraste calculado |
| --- | --- | --- | --- |
| `--background` | `#FFFFFF` (mantido) | fundo de cards, tabelas, inputs, popovers, sheets | |
| `--canvas` (novo) | `#F4F1EB` | fundo do `<main>` do CRM (areia) | texto `--foreground` 13,00 : 1 |
| `--surface-2` (novo) | `#F8F6F2` | cabeçalho de tabela, fundo da `Toolbar`, rodapé de diálogo, hover de linha | `--muted-foreground` 5,44 : 1 |
| `--foreground` | `#1E2A32` (mantido) | texto principal | 14,66 : 1 sobre branco |
| `--muted-foreground` | `#5B6670` (mantido) | metadados, rótulos de `dt`, eyebrow | 5,87 : 1 branco; 5,20 : 1 areia |
| `--placeholder` (novo) | `#6B7680` | placeholder de inputs e opção "Selecione" | 4,64 : 1 sobre branco |
| `--border` | `#D9D6CF` (mantido) | borda de card, separador de seções | decorativa |
| `--divider` (novo) | `#ECE9E2` | linhas entre linhas de tabela e de timeline | decorativa |
| `--input` | `#8F8A80` **só em `[data-crm]`** | borda de campos de formulário | 3,43 : 1 branco; 3,05 : 1 areia |
| `--primary` | `#163B5C` (mantido) | ação primária, item ativo, links, barra de progresso | 11,58 : 1; branco sobre ele 11,58 : 1 |
| `--primary-soft` (novo) | `#E6EEF5` | badge "meio de funil", linha selecionada | `--primary` sobre ele 9,87 : 1 |
| `--brand` / `--ring` | `#7A2230` (mantido) | anel de foco, barra do `NextStepCard`, rótulo "CRM" do wordmark | 10,00 : 1 branco; 8,87 : 1 areia |
| `--brand-soft` (novo) | `#F7E6E8` | badge "fechamento" | `--brand` sobre ele 8,31 : 1 |
| `--success` | `#2F6B3A` (mantido) | depositado, recibo, consentimento válido, concluído | 6,39 : 1 branco; 5,67 : 1 areia |
| `--success-soft` (novo) | `#E4F1E6` | badge e `Callout` de sucesso | `--success` sobre ele 5,49 : 1 |
| `--warning` (novo) | `#7A4A00` | prazo < 6 meses, SLA perto do fim, avisos | 7,48 : 1 branco; 6,64 : 1 areia |
| `--warning-soft` (novo) | `#FBF0DA` | fundo de aviso e badge "atenção" | `--warning` sobre ele 6,62 : 1 |
| `--destructive` / `--error` | `#A32D2D` (mantido) | vencido, perdido, cancelado, erro | 7,07 : 1 branco; 6,27 : 1 areia |
| `--error-soft` (novo) | `#FBE7E7` | fundo de erro e de vencido | `--error` sobre ele 5,95 : 1 |
| `--sand` / `--sidebar` | `#F4F1EB` (mantido) | sidebar, blocos secundários | |
| `--shadow-pop` (novo) | `0 8px 24px rgb(30 42 50 / 0.12)` | dialog, sheet, dropdown, FAB | |
| `--shadow-raise` (novo) | `0 1px 2px rgb(30 42 50 / 0.06)` | tooltip, popover pequeno | |

Regras:

- Badges e estados usam texto escuro sobre fundo `*-soft`, nunca texto branco sobre cor saturada (exceto o botão primário e o FAB).
- Substituir todo uso de `amber-50/300/500/700/900/950` e `emerald-50/300/600/700/900` em `src/` (hoje em `stage-move-dialog.tsx`, `fields.tsx`, `today.tsx`, `exportar/page.tsx`, `projetos/novo/page.tsx`, `(site)/entrar/page.tsx`, `project-forms/action-form.tsx`, `leads/[id]/page.tsx`) pelos tokens `warning*`, `success*` e `error*`: as cores Tailwind avulsas não têm par no modo escuro e `amber-700` dá só 4,52 : 1.
- `:focus-visible` em botões de fundo `--primary` ou em qualquer fundo escuro usa `outline-color: #fff` (vinho sobre azul-profundo dá 1,16 : 1); nos fundos claros o anel é vinho.

Modo escuro (`.dark`): acrescentar `--canvas: #121A20`, `--surface-2: #16202A`, `--divider: #28333C`, `--placeholder: #8E98A1`, `--primary-soft: #1D3147`, `--brand-soft: #3A1F25`, `--success-soft: #1C3322`, `--warning: #E6B566`, `--warning-soft: #332A14`, `--error-soft: #3A1F1F`. Não é prioridade e não há UI para alternar; fica coerente para o caso de alguém ativar a classe.

### 3.2 Bloco CSS a acrescentar em `src/app/globals.css`

```css
/* --- CRM (docs/design/crm-design-system.md, seção 3) ---------------------------------- */
@theme inline {
  --color-canvas: var(--canvas);
  --color-surface-2: var(--surface-2);
  --color-divider: var(--divider);
  --color-placeholder: var(--placeholder);
  --color-primary-soft: var(--primary-soft);
  --color-brand-soft: var(--brand-soft);
  --color-success-soft: var(--success-soft);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-error-soft: var(--error-soft);
  --shadow-pop: var(--shadow-pop);
  --shadow-raise: var(--shadow-raise);
}

:root {
  --canvas: #f4f1eb;
  --surface-2: #f8f6f2;
  --divider: #ece9e2;
  --placeholder: #6b7680;
  --primary-soft: #e6eef5;
  --brand-soft: #f7e6e8;
  --success-soft: #e4f1e6;
  --warning: #7a4a00;
  --warning-soft: #fbf0da;
  --error-soft: #fbe7e7;
  --shadow-pop: 0 8px 24px rgb(30 42 50 / 0.12);
  --shadow-raise: 0 1px 2px rgb(30 42 50 / 0.06);
}

.dark {
  --canvas: #121a20;
  --surface-2: #16202a;
  --divider: #28333c;
  --placeholder: #8e98a1;
  --primary-soft: #1d3147;
  --brand-soft: #3a1f25;
  --success-soft: #1c3322;
  --warning: #e6b566;
  --warning-soft: #332a14;
  --error-soft: #3a1f1f;
}

@layer components {
  /* Escopo do CRM: corpo 14px, borda de campo com 3:1, placeholder com 4,5:1. */
  [data-crm] {
    --input: #8f8a80;
    font-size: 14px;
    line-height: 1.43;
  }
  .dark [data-crm] {
    --input: #6b7680;
  }
  [data-crm] ::placeholder {
    color: var(--placeholder);
  }
  /* Escala tipográfica do CRM (seção 3.3). */
  .crm-h1,
  .crm-h2,
  .crm-kpi {
    font-family: var(--font-heading);
    font-weight: 600;
    letter-spacing: -0.01em;
    text-wrap: balance;
  }
  .crm-h1 {
    font-size: 1.5rem;
    line-height: 1.875rem;
  }
  @media (min-width: 960px) {
    .crm-h1 {
      font-size: 1.75rem;
      line-height: 2.125rem;
    }
  }
  .crm-h2 {
    font-size: 1.125rem;
    line-height: 1.5rem;
  }
  .crm-kpi {
    font-size: 2rem;
    line-height: 2.25rem;
    font-variant-numeric: tabular-nums;
  }
  .crm-eyebrow {
    font-size: 0.6875rem;
    line-height: 1rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted-foreground);
  }
  .crm-meta {
    font-size: 0.75rem;
    line-height: 1rem;
    color: var(--muted-foreground);
  }
  .crm-code {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
  }
  /* Foco visível sobre fundos escuros (botão primário, FAB, barra inferior ativa). */
  [data-crm] .bg-primary:focus-visible,
  [data-crm] .bg-foreground:focus-visible {
    outline-color: #fff;
  }
  /* Linha de tabela clicável: o link do nome cobre a linha; demais controles ficam por cima. */
  [data-crm] .row-link::after {
    content: "";
    position: absolute;
    inset: 0;
  }
}
```

`src/app/layout.tsx` ganha `export const viewport: Viewport = { viewportFit: "cover", width: "device-width", initialScale: 1 }` (enxerto do juiz 2), sem mudar fontes nem pesos: Inter 400/500/600 e Source Serif 4 600 já carregados bastam.

### 3.3 Escala tipográfica (base 14 px no CRM; inputs 16 px no celular)

| Papel | Classe | Tamanho / entrelinha | Peso | Fonte |
| --- | --- | --- | --- | --- |
| Título de página e nome do registro (h1) | `.crm-h1` | 28/34 desktop; 24/30 celular | 600 | Source Serif 4 |
| Título de seção e de card (h2, `CardTitle`) | `.crm-h2` | 18/24 | 600 | Source Serif 4 |
| Número de KPI | `.crm-kpi` | 32/36, `tabular-nums` | 600 | Source Serif 4 |
| Título de diálogo (`DialogTitle`) | padrão do `dialog.tsx` | 16/20 | 600 | Inter |
| Título de item (nome em tabela, card mobile) | `text-sm font-medium` | 14/20 | 500 | Inter |
| Corpo, células, formulários | padrão | 14/20 | 400 | Inter |
| Inputs no celular | `text-base md:text-sm` (já é) | 16 (< 960) / 14 | 400 | Inter |
| Metadado | `.crm-meta` | 12/16 | 400 | Inter, `--muted-foreground` |
| Eyebrow (rótulo de grupo, cabeçalho de tabela, `dt`) | `.crm-eyebrow` | 11/16, caixa alta, `tracking 0.08em` | 600 | Inter, `--muted-foreground` |
| CNPJ, nº de processo, recibo, slug | `.crm-code` | 13 | 400 | mono |
| Rótulo da barra inferior | `text-[11px]` | 11/14 | 500 (ativo 600) | Inter |

Nada abaixo de 11 px, e 11 px só em caixa alta com espaçamento (eyebrow e barra inferior). `CardTitle` continua `font-heading` e passa a `.crm-h2`; `DialogTitle` perde `font-heading`.

### 3.4 Espaçamento, raios, bordas, sombras, foco, movimento

| Grupo | Valor |
| --- | --- |
| Escala | base 4 px: `gap-1/2/3/4/6/8`. Gutter de página 16 px (celular) / 24 px (desktop). Entre seções 24 px. Padding de card 16 px (`p-4`), 20 px em detalhes no desktop (`md:p-5`). Célula de tabela `px-3 py-2`; altura de linha 44 px (`min-h-11`) sempre, para servir ao toque e ao mouse. |
| Largura | Conteúdo `mx-auto w-full max-w-[80rem]`; listas de Leads, Projetos e Aportes usam `max-w-none`; formulários (Novo lead, Novo projeto, Conta, Exportar) `max-w-3xl`; detalhes `max-w-[80rem]` com grid `lg:grid-cols-[minmax(0,1fr)_20rem]`. |
| Raios | `--radius: 0.5rem` (mantido). Card, dialog e sheet `rounded-xl`; input, botão e card mobile `rounded-lg`; badge `rounded-md` (não `rounded-4xl`: pílula totalmente redonda lê como botão, ver `aportes-desktop.png`); avatar e FAB `rounded-full`. |
| Bordas | Card `border border-border` (substitui `ring-1 ring-foreground/10`); cabeçalho de tabela `border-b border-border`; linhas `border-b border-divider`. Bloco urgente usa barra de 3 px à esquerda **e** ícone **e** rótulo, nunca só borda colorida. |
| Sombras | Cards sem sombra. `shadow-raise` em tooltip e popover; `shadow-pop` em dialog, sheet, dropdown e FAB. |
| Foco | `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }` (já existe); branco sobre fundos escuros (3.2); linha de tabela `focus-within:bg-primary-soft`. |
| Estados de linha | hover `bg-surface-2`; `focus-within` `bg-primary-soft`; vencida: célula de data em `text-destructive` com `CircleAlert` 14 px. |
| Movimento | 120 ms em hover e fundo; `prefers-reduced-motion` já zera animações; skeleton `animate-pulse` respeita o mesmo. |

## 4. Shell da aplicação

### 4.1 Desktop (≥ 960 px, breakpoint `md` do projeto)

```
┌──────────────┬──────────────────────────────────────────────────────────────────────┐
│ Prospekto    │ Pipeline › Rodrigo Pasqualotto  [🔍 Buscar leads, organizações… /]  │
│ CRM          │                                                      [+ Novo ▾]      │  ← header 56px, sticky, branco, sem avatar
│ [🔍 Buscar…  ├──────────────────────────────────────────────────────────────────────┤
│       Ctrl K]│                                                                      │
│ ▌ Painel  3  │   ┌ PageHeader ────────────────────────────────────────────────┐     │
│   Pipeline   │   │ eyebrow                                                     │     │
│   Prospecção │   │ H1 serif 28                  [Secundária] [Primária ●]      │     │
│   Organiza…  │   └─────────────────────────────────────────────────────────────┘     │
│   Projetos   │                                                                      │
│   Aportes    │   conteúdo sobre canvas areia (max-w 80rem, gutter 24px)             │
│   Tarefas    │   cards brancos border-border                                        │
│ ──────────   │                                                                      │
│   Exportar   │                                                                      │
│ (DS) Daniela │                                                                      │
│  daniela@… ⇅ │                                                                      │
│ ‹ Recolher   │                                                                      │
└──────────────┴──────────────────────────────────────────────────────────────────────┘
  240px (15rem), areia         flex-1, overflow-y-auto, bg-canvas
  colapsa p/ 64px (trilho)
```

- **Wordmark** (lockup do site): "Prospekto" em Source Serif 4 600 20 px cor `--foreground` e, abaixo, "CRM" em Inter 11 px caixa alta `tracking-[0.08em]` cor `--brand`. Link para `/app`.
- **Sidebar** (`src/components/crm/shell/sidebar.tsx`, Client Component mínimo só para `usePathname` e o toggle; a lista de itens é o componente puro `nav-items.tsx`, testável com `renderToString`): fundo `bg-sidebar` (areia), `border-r border-sidebar-border`. Acima dos itens, o botão **"Buscar…"** (`sidebar-search.tsx`): 40 px, `border-border bg-background`, lupa 18 px à esquerda e `<kbd>Ctrl K</kbd>` à direita (`bg-surface-2`, 11 px), `aria-keyshortcuts="Control+K Meta+K"`; abre a paleta (seção 5.2, `CommandPalette`); no trilho, só a lupa com `Tooltip` "Buscar Ctrl K". Item: 40 px de altura, ícone lucide 18 px + rótulo 14 px/500, `rounded-lg mx-2`; ativo ("moldura", padrão estrutural do Trilis já expresso nos tokens): fundo branco, `ring-1 ring-border` e barra de 3 px à esquerda em `--primary` (`before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-primary`), `aria-current="page"`; hover: `bg-white/60`. Módulos e ícones, na ordem do ADR-004, seção 6.1: `LayoutDashboard` (Painel), `SquareKanban` (Pipeline; o ADR escreve `KanbanSquare`, nome antigo do mesmo glifo no lucide-react), `PhoneOutgoing` (Prospecção), `Building2` (Organizações), `Clapperboard` (Projetos), `HandCoins` (Aportes), `SquareCheck` (Tarefas), separador, `Download` (Exportar). O contador em "Painel" é `overdueCount` (próximas ações vencidas + tarefas vencidas, consultas já usadas pelo Painel com `limit: 20`, somadas no layout) e leva `<span class="sr-only">N itens vencidos</span>`; some quando zero. No rodapé, o **bloco do usuário** (`sidebar-user.tsx`): botão de 48 px com `Avatar` 32 px, nome 14 px/500 e e-mail 12 px em `muted`, truncados com o texto completo em `title`, `ChevronsUpDown` 16 px; `DropdownMenu` abrindo para cima (`side="top" align="start"`) com o rótulo (nome e e-mail), Minha conta, separador, Sair (`useSignOut`, em `use-sign-out.ts`). No trilho, só o avatar com `Tooltip` do nome e o mesmo menu. O e-mail é o do próprio usuário da sessão e nunca vai ao log. Ordem do Tab: skip link, caminho, campo de busca, "Novo", "Buscar…", oito itens, usuário, "Recolher", conteúdo.
- **Recolher**: cookie `crm-sidebar=rail` (path `/app`, 1 ano) lido com `cookies()` no `(app)/layout.tsx` e passado como `collapsed`; o toggle grava `document.cookie` e chama `router.refresh()`. No trilho (64 px), rótulos ficam `sr-only` e cada ícone ganha `Tooltip side="right"`.
- **Header** (56 px, `sticky top-0 z-30 bg-background border-b`): `Breadcrumb` à esquerda (módulo › registro; só o módulo nas listas; na empresa de prospecção, módulo › Lista › registro, porque `describePath` devolve a página pai); `SearchForm` ao centro-direita; botão "Novo" (`DropdownMenu`, `min-w-56`: Novo lead, Nova organização, Novo projeto, Novo aporte, Nova tarefa, Nova lista de prospecção) à direita. **Sem avatar**: o menu do usuário vive no rodapé da sidebar (dois menus iguais na mesma tela foram rejeitados pelo ADR-004, seção 11). "Sair" deixa de ser o botão mais visível do sistema.
- **Busca global**: `<form role="search" method="get" action="/app/busca">` com `Input` de 280 px (`name="q"`, `type="search"`, rótulo `sr-only` "Buscar"), ícone `Search` à esquerda e `<kbd>/</kbd>` à direita. A tecla `/` apenas foca o campo (`shell/shortcuts.tsx`, 12 linhas, ignora quando o foco está em input/textarea/select/contenteditable); **Ctrl+K** abre a paleta (D11 revisada; `CommandPalette` na seção 5.2). `/app/busca` (D18, ampliada pelo ADR-004, 6.7) é o "ver todos os resultados" da paleta e o destino sem JavaScript do formulário: seis grupos ("Leads", "Organizações", "Projetos", "Aportes", "Tarefas", "Prospecção") com os mesmos repositórios da `searchAllAction`, no máximo 8 resultados cada, link "ver todos em Leads" com `?q=` só onde a lista aceita busca e `EmptyState` quando nada bate.
- **Skip link**: primeiro elemento do `(app)/layout.tsx`: `<a href="#conteudo" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 …">Ir para o conteúdo</a>`; `<main id="conteudo" tabIndex={-1}>`.
- **Landmarks**: `<header>`, `<nav aria-label="Principal">` (sidebar), `<nav aria-label="Principal">` (barra inferior; só uma das duas está no DOM visível por breakpoint, mas ambas existem: a inferior é `md:hidden`, a lateral `hidden md:flex`), `<main>`, `<aside aria-label="Dados do lead">` nos detalhes. Um `h1` por página.
- **Toaster**: `position="bottom-center"` com `offset` de 144 px no celular (acima da barra inferior, do FAB em `bottom-20` + 56 px e da `ActionBarMobile` em `bottom-16` + 56 px: com 80 px o toast de 4 s cobria o FAB e interceptava o toque), `top-right` no desktop; implementar com `Toaster` recebendo a posição por um `useMediaQuery` de 6 linhas (`unstable-use-media-query` do base-ui não é usado; `window.matchMedia("(min-width: 60rem)")` basta).

### 4.2 Celular (< 960 px)

```
┌──────────────────────────────────────┐
│ ‹  Rodrigo Pasqualotto           🔍  │  ← header 52px: voltar (página pai), título truncado, lupa (abre a paleta)
├──────────────────────────────────────┤
│                                      │
│  conteúdo (gutter 16px, pb-28)       │
│                                      │
│                              ┌─────┐ │
│                              │  +  │ │  ← FAB 56px só nas listas (Novo lead / organização / projeto / aporte / tarefa)
│                              └─────┘ │
├──────────────────────────────────────┤
│ [ Registrar ] [ Mover para ]   ⋯     │  ← ActionBarMobile 56px, só nos detalhes, fixed bottom-16
├──────────────────────────────────────┤
│  ▦       ▥       ☏       ☑      ≡    │  ← barra inferior 64px + env(safe-area-inset-bottom)
│ Painel Pipeline Prosp. Tarefas  Mais │
└──────────────────────────────────────┘
```

- **Barra inferior** (`shell/bottom-bar.tsx`): `nav aria-label="Principal"`, cinco alvos de 64 px de largura mínima e 56 px de altura, ícone 22 px + rótulo 11 px sempre visível; ativo em `--primary` com rótulo 600 e `aria-current="page"`; `padding-bottom: env(safe-area-inset-bottom)`. Os cinco (ADR-004, 6.1): Painel, Pipeline, Prospecção, Tarefas e "Mais" (Projetos e Aportes saem dos alvos porque são trabalho de mesa; Prospecção e Tarefas entram porque são o que a Daniela faz com o telefone na mão). "Mais" abre `Sheet side="bottom"` com Organizações, Projetos, Aportes, Exportar, Minha conta, Atalhos de teclado (link para `/app/conta#atalhos`), Sair.
- **Header mobile** (`shell/header.tsx`, mesma peça do desktop com classes responsivas): botão voltar (`ChevronLeft`, 44 px, `aria-label="Voltar para Pipeline"`) nas páginas de detalhe e de criação apontando para a página pai (href fixo, nunca `history.back()`: o módulo, ou a lista no caso da empresa de prospecção); título truncado com `title` completo; lupa que **abre a paleta** (`PaletteTrigger` de `sidebar-search.tsx`; deixou de ser link para `/app/busca`).
- **FAB** nas listas: `fixed right-4 bottom-20 size-14 rounded-full bg-primary text-primary-foreground shadow-pop md:hidden`, `aria-label="Novo lead"`. Nas listas cujo "Novo" é um diálogo (Organizações, Aportes, Tarefas), o FAB é o gatilho do mesmo diálogo. A lista de prospecção não tem FAB: "Adicionar", "Colar lista" e "⋯" ficam no `PageHeader` com `actionsOnMobile`, porque "Colar lista" não teria outro caminho no celular.
- **`ActionBarMobile`** nos detalhes: até dois botões (`size="touch"`, primário + `outline`) e "⋯" com o resto; `fixed inset-x-0 bottom-16 md:hidden border-t bg-background p-3`, com `padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))`.
- `main` ganha `pb-28 md:pb-6` para a barra e a `ActionBarMobile` não cobrirem o último card; `scroll-padding-bottom: 8rem` no `html` dentro de `[data-crm]` para o foco não ficar escondido (WCAG 2.4.11).

## 5. Componentes

### 5.1 Primitivos `src/components/ui/` (shadcn base-nova sobre `@base-ui/react` 1.8)

Tentar `npx shadcn add sheet dropdown-menu tooltip skeleton avatar breadcrumb`; se a rede ou o estilo falharem, escrever à mão seguindo o padrão de `dialog.tsx` (`render` em vez de `asChild`, `Popup` em vez de `Content`, `data-open`/`data-closed` em vez de `data-state`). Os arquivos de `ui/` importam `cn` de `"cn"`, como os existentes.

| Arquivo | Base | Especificação mínima |
| --- | --- | --- |
| `sheet.tsx` (novo) | `@base-ui/react/dialog` | `Sheet`, `SheetTrigger`, `SheetContent side="bottom" \| "right"`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose`. `bottom`: `fixed inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] overflow-y-auto shadow-pop data-open:slide-in-from-bottom`; `right`: `fixed inset-y-0 right-0 w-full sm:max-w-md overflow-y-auto`. Botão fechar com `sr-only` "Fechar". |
| `dropdown-menu.tsx` (novo) | `@base-ui/react/menu` | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent` (`Portal > Positioner sideOffset=4 > Popup className="min-w-44 rounded-lg bg-popover p-1 shadow-pop ring-1 ring-border"`), `DropdownMenuItem` (`flex h-9 items-center gap-2 rounded-md px-2 text-sm data-highlighted:bg-surface-2`; `variant="destructive"` em `text-destructive`), `DropdownMenuSeparator`, `DropdownMenuLabel`. Item com `render={<Link href />}` quando navega. |
| `tooltip.tsx` (novo) | `@base-ui/react/tooltip` | `TooltipProvider` (uma vez no `(app)/layout.tsx`), `Tooltip`, `TooltipTrigger`, `TooltipContent` (`rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-raise`), `delay={300}`. Só complementa: todo gatilho só com ícone tem `aria-label` próprio. |
| `skeleton.tsx` (novo) | div | `<div className={cn("animate-pulse rounded-md bg-surface-2", className)} aria-hidden />`. |
| `avatar.tsx` (novo) | `@base-ui/react/avatar` ou div | `Avatar size="sm" \| "md"` (24 / 32 px) `rounded-full bg-primary text-primary-foreground text-[11px]/xs font-semibold uppercase`, `initials(name)` em `src/lib/crm/initials.ts` (duas letras); `title` com o nome completo e `aria-label`. |
| `breadcrumb.tsx` (novo) | nav | `<nav aria-label="Caminho"><ol className="flex items-center gap-1 text-sm text-muted-foreground">` com `ChevronRight` 14 px `aria-hidden`; último item em `text-foreground` com `aria-current="page"`. |
| `badge.tsx` (ajuste) | existente | `rounded-md h-6 gap-1 px-2 text-xs font-medium`; novas variantes `neutral` (`bg-muted text-foreground`), `info` (`bg-primary-soft text-primary`), `brand` (`bg-brand-soft text-brand`), `success` (`bg-success-soft text-success`), `warning` (`bg-warning-soft text-warning`), `danger` (`bg-error-soft text-destructive`); `outline` mantida; `default` e `secondary` mantidas para o site. Ícone `[&>svg]:size-3.5`. |
| `button.tsx` (ajuste aditivo) | existente | `size="touch"` = `h-11 px-4 text-sm` (celular e `ActionBarMobile`); nada mais muda (o site usa `Button`). |
| `card.tsx` (ajuste) | existente | `ring-1 ring-foreground/10` → `border border-border`; `CardTitle` → `font-heading crm-h2` (mantém a serifa). |
| `dialog.tsx` (ajuste) | existente | `sr-only` "Close" e botão "Close" → "Fechar"; `DialogTitle` sem `font-heading`, `text-base font-semibold`; `DialogContent` abaixo de `sm`: `inset-x-0 top-auto bottom-0 translate-x-0 translate-y-0 max-w-none rounded-b-none rounded-t-xl max-h-[92dvh] overflow-y-auto` (folha inferior); `DialogFooter` `bg-surface-2` com `sticky bottom-0`. |
| `table.tsx` (ajuste) | existente | `TableHead`: `h-10 px-3 bg-surface-2 crm-eyebrow text-left align-middle`; `TableCell`: `px-3 py-2 align-middle`; `TableRow`: `group border-b border-divider hover:bg-surface-2 focus-within:bg-primary-soft`; `Table` ganha `density?: "default" \| "compact"` (compact: `py-1`). |

### 5.2 Componentes do CRM (`src/components/crm/ui/`)

Server Components por padrão; os com `"use client"` estão marcados e são mínimos. Todos aceitam `className`. Importam `cn` de `@/lib/utils`.

**`PageHeader`** — `{ title, eyebrow?, description?, breadcrumb?: {label, href}[], primary?: ReactNode, secondary?: ReactNode[], meta?: ReactNode, backHref?: string, backLabel?: string }`.
Recipe: `header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"`; `eyebrow` em `.crm-eyebrow`; título `h1.crm-h1`; `description` em `text-sm text-muted-foreground max-w-prose`; `meta` (badges, SLA) em `flex flex-wrap items-center gap-2`; ações em `flex gap-2`: `primary` com `variant="default"`, `secondary` com `outline`, mais de três secundárias vão para `DropdownMenu` com `Ellipsis`. No celular as ações somem do header e vão para a `ActionBarMobile` (prop `actionsMobile` do `DetailLayout`). `backHref` alimenta o botão "voltar" do header mobile.

**`StatCard`** — `{ label, value: string, hint?, tone?: "neutral" | "warning" | "danger" | "success", href?, icon?: LucideIcon, ariaLabel?, variant?: "card" | "ruler", title?, hintHref?, hintTone? }`.
Recipe (`variant="card"`, padrão): `Link | div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 hover:bg-surface-2 focus-visible:outline"`; `label` em `.crm-eyebrow` com ponto de 8 px na cor do `tone` (`aria-hidden`) à esquerda quando `tone !== "neutral"`; `value` em `.crm-kpi`; `hint` em `.crm-meta`; `icon` 16 px à direita em `--muted-foreground`. Com `href` o card inteiro é link com `aria-label` ("3 próximas ações vencidas, abrir lista"). Grid pai: `grid grid-cols-2 gap-3 md:grid-cols-4`.
`variant="ruler"` (ADR-004, 6.8; célula de uma `StatRuler`): sem borda, canto nem sombra próprios; `div.group.relative` com o link principal envolvendo rótulo e valor e cobrindo a célula por `after:absolute after:inset-0` (não é um `<Link>` inteiro porque o hint pode ser outro link, e `<a>` dentro de `<a>` é inválido); anel de foco `focus-visible:after:ring-2 after:ring-inset` (a régua tem `overflow-hidden`, um anel externo seria cortado nas pontas, WCAG 2.4.7); seta `↗` ao passar o mouse; `title` com o valor por extenso ("R$ 1.350.000,00 em 3 aportes propostos e assinados"); `hintHref` faz do hint um segundo link `relative z-10` ("2 atrasadas" → `?atrasadas=1`) com `hintTone` e alvo de 24 px (`min-h-6 py-1 -my-1`, WCAG 2.5.8): o círculo de 24 px em volta dele cai sobre o link principal, então a exceção de espaçamento não vale; a margem negativa devolve o padding ao fluxo e a célula não muda de altura.

**`StatRuler`** (Server, `stat-ruler.tsx`) — `{ label: string, children, className? }`: régua de medidores com hairlines (padrão estrutural do Trilis, ADR-004, 6.8). `div role="group" aria-label` em `grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card md:grid-cols-4`; as hairlines são do grupo, não das células: `[&>*]:border-divider [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(even)]:border-l md:[&>*]:border-b-0 md:[&>*+*]:border-l` (desktop: linhas verticais entre as quatro; celular: 2 × 2 com uma horizontal sob as duas de cima e uma vertical entre as colunas; `divide-y` foi rejeitado porque põe borda no terceiro filho e sobra uma linha solta no fundo). Filhos: `StatCard variant="ruler"`. Usada duas vezes no Painel ("Hoje" e "Carteira").

**`DataTable<T>`** (Server) — `{ caption: string, columns: Column<T>[], rows: T[], rowHref: (row) => string, rowKey: (row) => string, mobile: { primary: (row) => ReactNode, secondary: (row) => ReactNode, trailing?: (row) => ReactNode, action?: (row) => ReactNode }, empty: ReactNode, density?: "default" | "compact", footer?: ReactNode }` com `Column<T> = { key: string, header: ReactNode, cell: (row) => ReactNode, align?: "left" | "right", width?: string, priority?: 1 | 2 | 3, sort?: { param: string, value: string, active?: "asc" | "desc" } }`.

- Desktop (`hidden md:block`): `Card p-0 overflow-hidden` > `Table` com `caption` em `sr-only`; `th scope="col"`, `aria-sort="ascending|descending"` quando `sort.active`; cabeçalho ordenável é `<Link href="?sort=…">` com `ArrowUpDown` 14 px; `align="right"` dá `tabular text-right`; `priority 2` → `hidden md:table-cell`, `priority 3` → `hidden xl:table-cell`.
- Linha clicável (D10): o primeiro `<td>` é `relative`; o link do nome tem `className="row-link font-medium"` (o `::after` cobre a linha); qualquer outro link ou botão na linha recebe `relative z-10`. Teclado: Tab chega ao link, Enter abre; a linha mostra `focus-within:bg-primary-soft`.
- Celular (`md:hidden`): `<ul className="flex flex-col gap-2">` de `<li>` com `relative flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3`; `primary` (nome 500 + link `row-link`), `secondary` (`.crm-meta`), `trailing` (badge ou valor alinhado à direita), `action` (botão `size="touch"` visível, `relative z-10`, nunca gesto escondido).
- `footer` recebe a paginação. `empty` recebe um `EmptyState`.

**`StatusBadge`** (Server) — `{ kind: "stage" | "contribution" | "temperature" | "orgType" | "prospecting" | "priority", value: string, pipeline?: Pipeline, size?: "sm" | "md" }`. Mapa em `src/lib/crm/status-tones.ts` (tabela completa na seção 6; `prospectingTone` e `priorityTone` para os dois tipos novos, com `priority` nula tratada como média); texto sempre visível, ícone `aria-hidden`. `kind="temperature"` devolve `null` para `frio` quando `size="sm"` (tabelas) e o texto "Frio" com `Snowflake` no detalhe. Substitui `badges.tsx`, `project-badges.tsx` e `ContributionStatusBadge`.

**`SlaIndicator`** (Server) — `{ info: StageInfo, nextActionAt: Date | null, now: Date, variant?: "inline" | "block" }`. Usa `describeSla` (abaixo). Recipe: `span className="inline-flex items-center gap-1 text-xs"`; vencido → `text-destructive font-medium` + `CircleAlert` 14 px; < 24 h → `text-warning` + `Clock`; resto → `text-muted-foreground` + `Circle` 10 px; `aria-label` com a frase completa.

**`describeSla(info: StageInfo, nextActionAt: Date | null, now: Date): { text: string, tone: "danger" | "warning" | "neutral", kind: "next_action" | "sla" | "none" }`** em `src/lib/crm/describe-sla.ts`. Frases:

| Situação | Texto |
| --- | --- |
| `nextActionAt` vencida há N dias | "Ação atrasada há 3 dias" (1: "há 1 dia"; 0: "Ação vence hoje") |
| `nextActionAt` nas próximas 24 h | "Ação em 5 h" |
| `nextActionAt` futura | "Próxima ação sex., 9 de out." |
| sem `nextActionAt`, `slaOverdue` (estágio inicial) | "Sem contato há 6 dias (prazo: 1 dia útil)" |
| sem `nextActionAt`, `slaOverdue` (outros estágios) | "Prazo do estágio vencido há 2 dias (prazo: 5 dias úteis)" |
| sem `nextActionAt`, SLA em < 24 h | "Faltam 17 h para o primeiro contato" / "Faltam 17 h no prazo do estágio" |
| sem `nextActionAt`, SLA em N dias | "3 dias no prazo do estágio" |
| sem SLA em dias (`businessDays: null`) | a `note` do estágio ("contato em janeiro; depois trimestral") |

Os dias úteis do prazo vêm de `stageSla(pipeline, stage)` já exportado por `pipelines.ts`; os cálculos de atraso reutilizam `daysBetween` e `hoursBetween` de `dates.ts`.

**`NextStepCard`** (Server) — `{ step: NextStep, action?: ReactNode }` com `NextStep = { title: string, reason: string, tone: "danger" | "warning" | "info", checklist?: { label: string, done: boolean }[], href?: string }` calculado por `src/lib/crm/next-step.ts` (D2). Recipe: `section aria-labelledby className="flex flex-col gap-3 rounded-xl border border-border border-l-[3px] border-l-brand bg-card p-4"`; eyebrow "Próximo passo"; `title` em `text-base font-semibold`; `reason` em `text-sm text-muted-foreground`; `checklist` com `CircleCheck` (`--success`) / `Circle` e texto; `action` recebe o botão do passo (o `StageMoveDialog` com `defaultTarget`, o `TaskCompleteButton`, o link `#registrar` que foca o formulário, ou o diálogo do passo do aporte).

Regras de `nextStepForLead(lead, tasks, plans, now)`:

1. Há tarefa aberta vencida → "Concluir: {assunto}" / "Atrasada há 3 dias" / botão Concluir.
2. `nextActionOverdue` → "Fazer a próxima ação" / "Atrasada há 3 dias (sex., 3 de out.)" / botão "Registrar contato" (`#registrar`).
3. Estágio inicial e `lastContactAt` nulo → "Fazer o primeiro contato" / `describeSla` / botões "WhatsApp" e "Registrar contato".
4. Senão, o `plans[0]` de `stageMovePlans` com `kind === "next"` → "Próximo estágio: Diagnóstico" / "SLA de 5 dias úteis" / checklist com `requirements` (`done` = o que o formulário atual já satisfaz: `owner_user_id` e `next_action_at` preenchidos; `lead.attributes.vinculo_art27_checado === true`; `organization.cnpj_when_pj` quando `lead.orgCnpj`; itens `contribution.*` e `project.*` ficam `done: false` com texto "registre no projeto") / botão "Mover para".
5. Terminal → "Lead perdido" / motivo / botão "Reativar" (é o `StageMoveDialog` com o movimento `reactivate` já permitido).

`nextStepForProject(project, contributions, destinations)`: aporte com passo pendente (primeiro não cancelado cujo status não é `recibo_emitido` com `receiptSentToAccountantAt`) → "Emitir o recibo de Helena Zanotto" com o diálogo do passo; senão alerta R-13 (`alerts`) → "Prazo em 70 dias com 16 % captado" e botão "Novo aporte"; senão destino `next` com `missing` como checklist e botão "Mover para". `nextStepForContribution(c, blockers)`: o passo atual do `StepFlow` com seus bloqueios como checklist.

**`EmptyState`** — `{ icon: LucideIcon, title, description?, action?: ReactNode, size?: "sm" | "md" }`. Recipe: `div className="flex flex-col items-center gap-2 py-12 text-center"` (`sm`: `py-6`), ícone 32 px `--muted-foreground`, título `text-sm font-medium`, descrição `text-sm text-muted-foreground max-w-prose`, ação `outline size="sm"`.

**`Toolbar`** (Server + Client wrapper `toolbar-autosubmit.tsx` de 20 linhas) — `{ action: string, search?: { name, placeholder, value }, filters: FilterDef[], hidden?: Record<string, string>, chips: { label, removeHref }[], clearHref?, sort?: FilterDef, extra?: ReactNode, mobileTitle?: string }` com `FilterDef = { name, label, value, options: { value, label }[], allLabel?: string }`.

- Desktop: `form method="get" className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-2"`; busca com `Search` 240 px; cada filtro é `<select class="h-9 rounded-lg border border-input bg-background px-2 text-sm">` com `<label class="sr-only">`, primeira opção "Estágio: todos"; `sort` idem; chips abaixo em `Badge outline` com `X` e `aria-label="Remover filtro Origem: Site"`; "Limpar" só com filtro ativo; sem botão "Filtrar" (a busca envia com Enter; o CRM exige JavaScript, D19).
- `toolbar-autosubmit.tsx`: `onChange` em `select` → `form.requestSubmit()`; input de busca envia no Enter (nativo).
- Celular (`md:hidden`): linha com a busca e um botão `outline size="touch"` "Filtrar (2)" (`SlidersHorizontal`) que abre `Sheet side="bottom"` com o mesmo `<form>` (os selects em coluna, `size="touch"`), botão "Aplicar" `size="touch"` largura total e "Limpar". Chips ativos aparecem abaixo da busca nos dois tamanhos.

**`DetailLayout`** — `{ header: ReactNode, main: ReactNode, aside: ReactNode, asideLabel: string, actionsMobile?: ReactNode, mobileOrder?: "main-first" | "aside-first" }`. Recipe: `div className="flex flex-col gap-6"` > `header` > `div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"`; `aside aria-label className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start"`. No celular, `aside` vai depois de `main`; cada card do `aside` pode ser um `<details>` (`FormSection collapsible` em modo leitura) para não empurrar a linha do tempo. `actionsMobile` renderiza a `ActionBarMobile`.

**`KeyValueList`** — `{ items: { label, value: ReactNode | null | undefined, code?: boolean, href?: string, hint?: string }[], columns?: 1 | 2 | 3, hideEmpty?: boolean (default true), emptyLabel?: string (default "não informado") }`. Recipe: `dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2"`; `dt` em `.crm-eyebrow`; `dd` em `text-sm break-words` (`.crm-code` quando `code`); itens vazios omitidos e um `<details className="sm:col-span-2">` ao fim com `summary` "Mostrar todos os campos (14 sem valor)" que lista os vazios com `emptyLabel` em `text-muted-foreground`. Substitui os `Row`/`Item` duplicados em lead, organização, projeto e aporte.

**`Timeline`** (Server) — `{ activities: Activity[], users: Map<string, string>, projects?: Map<string, string>, now: Date, limit?: number }`. Recipe: `ol className="relative flex flex-col gap-4 border-l border-divider pl-6"`; cada `li` com ícone de 24 px em círculo (`absolute -left-3 top-0 flex size-6 items-center justify-center rounded-full border border-border bg-background`) por tipo (`Phone`, `Users`, `Mail`, `MessageCircle`, `MapPin`, `StickyNote`, `CheckSquare`, `FileText`, `Download`, `Settings2`); assunto em `text-sm font-medium`; `body` em `text-sm whitespace-pre-line`; meta "30/09/2026, 07:00 · Rafael" em `.crm-meta`; tarefas abertas com `TaskCompleteButton` à direita e, vencidas, "vence 03/10 · atrasada há 3 dias" em `text-destructive`. Eventos `sistema` em `text-muted-foreground`, com o ícone `Settings2` e agrupados quando consecutivos: "3 mudanças automáticas · mostrar" (`<details>`), exceto quando é o único item do dia. Agrupamento por dia com cabeçalho `.crm-eyebrow` "Hoje", "Ontem", "30 de setembro" (`Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" })`).

`humanizeSystemActivity(a, users, projects)` em `src/lib/crm/humanize-activity.ts` (novo, com testes): `{reason:"owner", from, to}` → "Responsável: ninguém → Rafael Teste" (ids por `users`); `{reason:"score"}` → "Score: 2 → 41"; `{from, to}` de estágio → "Novo → Qualificado" (+ "motivo: Sem resposta"); `{contributionId, proposedAmount, mechanism, projectId?}` → "Proposta de R$ 30.000,00 em Cinema na Praça (Lei do Audiovisual, art. 1º-A)" (nome por `projects`; sem `projectId`, só "Proposta de R$ 30.000,00"); chaves desconhecidas → "ver detalhes" em `<details>` com `k: v`; nunca um id de 32 ou 36 caracteres na tela. `formActivityText` e `formActivitySubject` existentes continuam para `formulario`.

**`FormSection`** — `{ title, description?, collapsible?: boolean, defaultOpen?: boolean, badge?: string, count?: string, id?, children }`. Recipe: `fieldset className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-5"` com `legend` em `.crm-h2` (padding `px-1`); `description` em `text-sm text-muted-foreground`; `badge` ("exigido em Autorizado") em `Badge warning`; `count` ("0 de 17 preenchidos") em `.crm-meta`. Quando `collapsible`, a casca vira `<details open={defaultOpen}>` com `<summary className="cursor-pointer list-none crm-h2 flex items-center gap-2">` e `ChevronRight` que gira com `group-open:rotate-90`; funciona sem JS. Campos internos continuam `TextField`, `SelectField` etc.

**`FormActions`** — `{ children, cancelHref?: string, cancelLabel?: string, note?: ReactNode }`. Recipe: `div className="sticky bottom-20 md:bottom-0 z-10 -mx-4 md:-mx-5 flex items-center justify-end gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:px-5"`; `cancelHref` vira `Button variant="ghost"` com `Link`; `note` ("* obrigatório") à esquerda em `.crm-meta`. Usado em Novo lead, Novo projeto, Trocar senha.

**`Callout`** — `{ tone: "info" | "warning" | "danger" | "success", title?, icon?: LucideIcon, children, role?: "status" | "alert" | "note" }`. Recipe: `div className="flex gap-3 rounded-lg border px-3 py-2 text-sm"` com `border-{tone}/30 bg-{tone}-soft text-{tone}` (`info` usa `border-primary/30 bg-primary-soft text-foreground`); ícone fixo por tom (`Info`, `TriangleAlert`, `OctagonAlert`, `CircleCheck`) 16 px `aria-hidden shrink-0 mt-0.5`; `role` padrão: `status` para `info`/`success`, `alert` para `warning`/`danger`. Usos: aviso LGPD de Exportar, `?existente=1` do lead, estouro de comissão, bloqueio dependente de aporte em "Mover para", "Confirmar depósito" com valor fora de 5 %, "Ainda não há proponente".

**`StepFlow`** (Server) — `{ steps: { key, label, state: "done" | "current" | "todo" | "blocked" | "cancelled", date?: string, detail?: string }[], action?: ReactNode, blockers?: string[] }`. Recipe: `ol className="grid gap-2 md:grid-cols-5"` (vertical no celular com `border-l`); cada `li` com círculo de 28 px: `done` = `Check` em `bg-success text-white`; `current` = número em `bg-primary text-primary-foreground`; `todo` = número em `border border-input text-muted-foreground`; `blocked` = `Lock` em `bg-warning-soft text-warning`; `cancelled` = `X` em `bg-muted`; `aria-current="step"` no atual; rótulo `text-sm`; `date` em `.crm-meta`. Abaixo do passo atual, `action` (o diálogo do passo) e `blockers` como lista "falta: …" em `text-warning`. Substitui a coluna "Passos".

**`ContributionTable`** (`src/components/crm/contribution-table.tsx`, Server, já existe) — passa a `{ ctx, rows, showProject?, layout?: "table" | "cards" }`. `table`: `DataTable` com colunas Patrocinador / projeto (`priority 1`), Status (`StatusBadge contribution`), Proposto (`right`), Depositado (`right`, `priority 2`, data em meta), Previsão (`priority 2`, `CalendarClock` + `text-warning` quando nos próximos 15 dias), Recibo (`priority 3`, `.crm-code`), Comissão (`right`, `priority 3`), Próximo passo (só o botão do passo atual em `outline sm`, demais no "⋯"). `cards` (bloco do projeto e do lead): `ul` de cards de uma linha "Helena Zanotto · Móveis Colonial — ✓ Depositado — R$ 50.000 em 21/09 — [Emitir recibo] ⋯". `ContributionSteps` continua calculando `contributionStepBlockers`; ganha `variant?: "row" | "flow"`: `row` = um botão + `DropdownMenu` "⋯" (Registrar comissão, Cancelar aporte); `flow` = a `StepFlow` do detalhe. A escolha do passo visível é `nextStepFor(status, receiptSentToAccountantAt)`: `proposta` → Assinar termo; `termo_assinado` → Confirmar depósito; `depositado` → Emitir recibo; `recibo_emitido` sem envio → Enviar ao contador; `recibo_emitido` enviado → Registrar comissão. `ContributionStatusBadge` continua exportado como reexport de `StatusBadge kind="contribution"`.

**`ActionBarMobile`** (Client, 20 linhas) — `{ primary: ReactNode, secondary?: ReactNode, more?: { label, href?, onSelect?, tone? }[] }`. Recipe da seção 4.2; `more` abre `DropdownMenu` ou, com mais de quatro itens, `Sheet bottom`.

**`ConfirmDialog`** (Client) — `{ trigger: ReactNode, title, description, confirmLabel, tone: "danger" | "default", action: FormAction, children?: ReactNode (campos), requireField?: string }`. Sobre `@base-ui/react/alert-dialog` (`AlertDialog.Root/Trigger/Portal/Backdrop/Popup/Title/Description/Close`) com as mesmas classes do `DialogContent`; `role="alertdialog"` vem do primitivo. O botão de confirmação fica `disabled` enquanto o campo `requireField` (ex.: `lostReason`) estiver vazio (um `onChange` no `<form>` lê `form.elements`). Usa `ActionForm` por dentro. Usos: Marcar perdido (modo `lost` do `StageMoveDialog`, que passa a renderizar este componente), Cancelar aporte, Arquivar projeto, Despublicar.

**`Meter`** (Server) — `{ value: number, max: number, label: string, text?: string, tone?: "neutral" | "warning" | "danger", size?: "sm" | "md" }`. Recipe: `div role="progressbar" aria-valuenow aria-valuemin={0} aria-valuemax aria-label className="h-1.5 md:h-2 w-24 overflow-hidden rounded-full bg-muted"` > barra `bg-primary` (`bg-warning` quando `tone`) com `width: %`; `text` ("16 %") sempre ao lado em `tabular`. Em Projetos (coluna Captado), no detalhe do projeto (Captado e Comissão) e em Hoje (Projetos com alerta).

**`DateHint`** (Client, 15 linhas) — `{ inputId: string, initial?: string }`. Lê o `<input type="datetime-local">` ou `date` pelo `id`, escuta `input` e mostra ao lado "sex., 9 de out., 14:10" (`Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })`) em `.crm-meta`, com `aria-live="polite"`. `TextField` ganha a prop `dateHint?: boolean` que renderiza o `DateHint` e o `placeholder="dd/mm/aaaa hh:mm"`. O payload (`occurredAt`, `nextActionAt`, `dueAt`) não muda.

**`SegmentedControl`** (Client, 30 linhas) — `{ name, options: { value, label, icon?, disabled?, describedBy? }[], value, onChange, label }`. `div role="radiogroup" aria-label` com botões `role="radio" aria-checked` em `outline size="sm"` (`data-active` → `bg-primary-soft text-primary border-primary/40`), setas esquerda/direita movem a seleção pulando as opções desabilitadas, e um `<input type="hidden" name>` alimenta a Server Action. Opção desabilitada fica visível e focável (`focusableWhenDisabled`, `aria-disabled`, esmaecida) e aponta a explicação por `aria-describedby` (`describedBy`). Usado para o tipo de atividade, em Novo lead para o segmento e, na Resposta sugerida, para o canal (WhatsApp desabilitado sem telefone).

**Loading** — `loading.tsx` por rota com `Skeleton`: `app/loading.tsx` (quatro `StatCard` + dois blocos de 5 linhas), `leads/loading.tsx` (abas + toolbar + 8 linhas de 44 px), `leads/[id]/loading.tsx` (cabeçalho + `NextStepCard` + duas colunas), `organizacoes/loading.tsx`, `organizacoes/[id]/loading.tsx`, `projetos/loading.tsx`, `projetos/[id]/loading.tsx`, `aportes/loading.tsx`, `aportes/[id]/loading.tsx`, `busca/loading.tsx`. Cada um com `<div role="status"><span className="sr-only">Carregando…</span>` e a silhueta.

**`AutosaveField`** (Client, `autosave-field.tsx`; ADR-004 e plano, P8) — `{ name, label, defaultValue, action: (prev: CrmActionState, formData: FormData) => Promise<CrmActionState>, hidden?: Record<string, string>, multiline?, rows?, placeholder?, help?, maxLength?, className? }`. `<textarea>` (ou `<input>`) que salva **ao perder o foco** e só quando o valor mudou; nunca por tecla, sem debounce, sem concorrência otimista (último a gravar vence). Estado num `<span role="status">`: "Salvo às 14:32", "Salvando…", "Não foi possível salvar; tente de novo". Usado pela ficha do item de prospecção (abertura e "Sobre a empresa", `hidden = { itemId, field }`) e pelo card "Notas" da organização (`OrgNotesForm`, com o label em `sr-only` porque o card já tem o título e o status alinhado à direita acima da textarea).

**`CommandPalette`** (Client, `shell/command-palette.tsx`; ADR-004, 6.7) — paleta Ctrl+K sobre o `Dialog` do base-ui, sem `trigger` (abre por atalho, pelo botão "Buscar…", pela lupa do header no celular ou pelo evento `prospekto:paleta`), `finalFocus` apontando para o elemento ativo anterior (sem isso o foco cairia no `body`, WCAG 2.4.3), `DialogTitle` "Buscar" em `sr-only`, `showCloseButton={false}` (o X padrão ficaria sobre o campo). Cabeçalho com lupa e `Input` de 40 px sem borda (`role="combobox"`, `aria-expanded`, `aria-controls="paleta-lista"`, `aria-activedescendant`, `aria-autocomplete="list"`), `<kbd>Esc</kbd>` a partir de `sm` e um botão "Fechar" (X, 36 px) abaixo de `sm`; lista `max-h-80 overflow-y-auto`; `role="status" aria-live="polite"` em `sr-only` com "Buscando…", "N resultados", "Nenhum resultado" ou o erro. Largura `sm:max-w-lg` (512 px) centralizada no desktop; no celular, folha **superior** (`max-sm:inset-x-0 max-sm:top-0 max-sm:bottom-auto max-sm:rounded-t-none max-sm:rounded-b-xl`), porque a folha inferior padrão ficaria espremida pelo teclado virtual. Regras: Ctrl+K com a paleta aberta fecha (toggle); nunca abre sobre `[role="dialog"][data-open]`, `alertdialog` ou menu de outro componente (regra `OVERLAY` de `shortcuts.tsx`); a partir de 2 caracteres, 250 ms depois da última tecla, chama `searchAllAction(query)` (`src/actions/search.ts`, `requireSession`, `safeParse`, só campos de tela, nunca e-mail nem telefone) com número de sequência que invalida a resposta em voo; sem efeito com `setState` (regra `react-hooks/set-state-in-effect`); navegação fecha a paleta no `Enter` e por delegação de clique em qualquer `a[href]` dentro do diálogo. Constantes (`SEARCH_KINDS`, `SEARCH_KIND_LABELS`, `SEARCH_GROUP_LABELS`, `PALETTE_EVENT`) em `shell/modules.ts`, porque `search.ts` é `"use server"`.

**`PaletteResults`** (puro, `shell/palette-results.tsx`; testado com `renderToString`) — `role="listbox"` com `role="group"` por grupo (título em `crm-eyebrow`, `role="presentation"`, ligado por `aria-labelledby`); opção = `Link` com `role="option"`, 40 px mínimo, `aria-selected="true"` e `bg-primary-soft` só na ativa (`data-active`), hover `bg-muted`; opção de resultado: título 14 px/500, meta 12 px `muted`, chip `Badge variant="outline"` à direita com o tipo (Lead, Organização, Projeto, Aporte, Tarefa, Prospecção); opção de navegação: ícone 18 px `muted` + rótulo. Consulta vazia: "Ir para" (os módulos da sidebar e Minha conta) e "Novo…" (os itens do "Novo ▾") com a dica "Digite para buscar leads, organizações, projetos, aportes, tarefas e empresas de prospecção."; rodapé "ver todos os resultados em Busca ›" (link `text-primary`) acima de uma `border-t`; nada: "Nada encontrado para "x". Tente parte do nome ou o CNPJ." em 14 px; erro: "Não foi possível buscar. Tente de novo." em `text-destructive`. Grupos vazios não voltam da action.

**`ViewToggle`** (Client, `leads/view-toggle.tsx`; ADR-004, 6.2; plano, P4 e P19) — par de links "Lista" / "Quadro" (`?view=lista` / `?view=quadro`, demais filtros preservados; o link para o quadro descarta `stage`, `sort` e `page`), `<a>` com `aria-current="true"` no ativo (nunca `aria-pressed`, válido só em `role="button"`), ícones `List` e `SquareKanban`, links `h-11 md:h-7` (44 px no celular; 28 px no desktop, num `nav` de 34 px). Ao clicar grava o cookie `crm-leads-view` (`path=/app`, 1 ano, `samesite=lax`); com `rememberOnMount` (primeira visita, resolução `"ambas"`), grava em silêncio ao montar `lista` quando `matchMedia("(max-width: 59.99rem)")` casa, senão `quadro`, sem `router.refresh()`. Links de conveniência para `?view=lista` (o "ver todos em Lista ›" da coluna) não gravam o cookie.

**`LeadBoard`** (Client, `leads/lead-board.tsx` + `lead-board-columns.tsx` + `lead-card.tsx` + `lead-board-dialogs.tsx`; ADR-004, 6.3) — quadro de leads por pipeline. Layout em palavras: uma `section relative` com rolagem horizontal própria (`overflow-x-auto snap-x`, a única rolagem horizontal admitida além das abas); uma coluna por estágio de `STAGES[pipeline]` (o terminal só com "Mostrar perdidos"), `section aria-labelledby="coluna-{estágio}"` `w-64 shrink-0 snap-start relative rounded-xl border border-border bg-surface-2` com cabeçalho (rótulo em `h2 id="coluna-{estágio}"` 14/600, logo abaixo do h1 da página e como o quadro de tarefas; contagem total da coluna em `tabular` e, só em Patrocinadores e quando maior que zero, o subtotal "R$ 350 mil em propostas"), lista de cartões `p-2 gap-2` com teto de 50 e rodapé "ver todos os N em Lista ›" quando há mais; a coluna terminal aparece como zona de soltura "Marcar perdido" `sticky right-0` durante o arrasto. **Cartão** (`article`, `rounded-lg border border-border bg-card p-3`): nome como link real (`row-link`, D10) com `StatusBadge temperature size="sm"` (só morno e quente), empresa · segmento em `.crm-meta`, `SlaIndicator` sem `truncate` (duas linhas cabem em 256 px), `Avatar` do dono ou `ClaimButton` "Assumir" (`h-11 md:h-7`: 44 px no celular), valor do aporte aberto em `tabular`, e o botão "Mover para ▾" (`ArrowRightLeft`, `aria-label="Mover {nome} para"`, `relative z-10`, `size-11 md:size-7`: 44 px no celular, onde o menu é o único caminho para mover) com `DropdownMenu` dos destinos de `stageTargets` mais "Marcar perdido". **Arrasto** (HTML5 nativo, ADR-004, 6.11): `draggable` nasce falso e só vira verdadeiro depois da montagem com `useMediaQuery("(pointer: fine)")` por `useSyncExternalStore` (a hidratação não diverge; no celular não há arrasto); links e botões internos com `draggable={false}`; `onDragStart` chama `dataTransfer.setData("text/plain", id)`; ao iniciar, as colunas fora de `allowedStageMoves` recebem `data-blocked`, lista de cartões em opacidade 0,5 e a frase "Avance um estágio por vez" (ou "Reative pelo Mover para" no perdido) no cabeçalho em opacidade plena (esmaecer a coluna inteira derrubava a frase a 2:1; ela existe para ser lida durante o arrasto); `onDragOver` faz `preventDefault` em toda coluna (também nas bloqueadas, para o `drop` disparar e o toast explicar); `<span role="status" class="sr-only">` anuncia "Arrastando {nome}. Solte em: Qualificado, Perdido.". **Soltar nunca grava**: abre o `StageMoveDialog` (`trigger={null}`, `defaultTarget`, `origin="board"`) ou o `MarkLostDialog`, sempre montados com `key={`${lead.id}:${target}`}` (os dois guardam destino ou motivo em `useState` só na montagem); sucesso faz `router.refresh()` dentro do diálogo; soltura em coluna bloqueada só mostra o toast. `stageMovePlans` é calculado no cliente com o `now` do servidor (ISO) e a sugestão de próxima ação segue `stageMovePlansWithSuggestion` de `stage-moves.ts`, a mesma da página do lead. Celular com `?view=quadro`: colunas `w-[85vw] snap-center max-h-none` (a página rola; sem rolagem aninhada). Padrão registrado: texto `sr-only` (absoluto) dentro de contêiner com `overflow-x-auto` precisa de um ancestral `relative` entre ele e o contêiner, senão alarga o documento e cria rolagem horizontal da página.

**`TaskBoard`** (Client, `tasks/task-board.tsx` + `task-board-columns.tsx` + `task-card.tsx`; ADR-004, 6.5) — `grid gap-3 md:grid-cols-3`; coluna `rounded-xl border border-border bg-surface-2` com ponto de 8 px (A fazer `bg-muted-foreground`, Em andamento `bg-primary`, Concluída `bg-success`), rótulo 14/600 e contagem em `.crm-meta` com `sr-only` "tarefas"; lista `p-2 gap-2`, com `md:max-h-[70vh] md:overflow-y-auto` só no desktop (no celular as colunas empilham sem altura máxima). Coluna sob o ponteiro: `ring-2 ring-primary/40`; alvo da soltura: `border-t-2 border-t-primary` no cartão alvo ou `border-b-2` no último; cartão arrastado: `opacity-50`; o índice da soltura é calculado na coluna (`insertIndexFromPointer` sobre os `getBoundingClientRect` dos cartões); o quadro envia `{ activityId, status, index, beforeId?, afterId? }` (as âncoras são os cartões visíveis em volta do movido, porque com filtro ativo o índice é o de um recorte da coluna) e o repositório calcula a posição fracionária na transação (P3). Concluída mostra "as 20 mais recentes" em `.crm-meta` quando `total > rows`. **Cartão** (`article` com `aria-label` do assunto): assunto como `<button aria-label="Editar tarefa: …">` (14/500; `line-through text-muted-foreground` quando concluída) + `StatusBadge kind="priority" size="sm"` + menu "⋯" (`aria-label="Mais ações da tarefa: …"`, `size-11 md:size-7`) com "Editar" e "Mover para <coluna>" para as outras duas colunas (o caminho sem arrasto, por teclado); vínculo como link real (`.crm-meta`) ou "sem vínculo"; descrição `line-clamp-2 text-xs`; prazo (`describeTaskDue`; `text-destructive font-medium` quando vencida e aberta), `TaskCompleteButton size="responsive"` (44 px no celular, 28 px no desktop) nas colunas abertas, `Avatar size="sm"` do dono ou "sem dono". Links e botões com `draggable={false}` e `relative z-10`. Região viva `<p role="status" aria-live="polite" class="sr-only">` sempre montada: "Movendo "X" para Em andamento." e depois a mensagem da action. **`TaskFilters`**: `nav aria-label="Filtros"` de chips-link `rounded-full border h-11 md:h-8 px-3` ("Só as minhas" `?dono=eu`, "Só atrasadas" `?atrasadas=1`, "Vencem hoje" `?vencem=hoje`), ativo `border-primary/40 bg-primary-soft text-primary font-medium` com `aria-current="true"` (P19); "Limpar" como link `text-muted-foreground underline`. Cabeçalho "N abertas · M atrasadas" com M vindo de um `count` próprio (as linhas param no teto de 100 por coluna). **`TaskDialog`** na seção 7.12.

**Prospecção** (`prospecting/`; ADR-004, 6.6): `ListTable` (`DataTable` do índice), `ItemFilters` (`nav` de chips-link por status com `aria-current` e contagens reais de `countItemsByStatus`, chips `h-11 md:h-7` como os de `TaskFilters`, mais busca GET por nome), `ItemCards`/`ItemCard` (artigos agrupados por grupo da lista, com `row-link` no nome e ações `relative z-10`), `ItemActionBar` ("Ligar (54) 3000-0000" `tel:` e "WhatsApp"; "⋯" com os resultados), `ResultButtons` (grupo `aria-busy` enquanto grava; `ConfirmDialog` no descarte, com o motivo, e no "Voltar para a ligar" de quem pediu para não ser contatado), `WhatsappDialog`, `ConvertDialog` ("Reunião marcada"), `PasteDialog` ("Colar lista", prévia em `role="status"`; o botão desabilitado é descrito pela prévia), `AddItemDialog`, `NewListDialog`/`EditListSheet`/`DeleteListDialog`/`ListMoreMenu`, `ItemMoreMenu` e os blocos da ficha em `item-detail.tsx`. Detalhe tela a tela na seção 7.13.

**Painel** (`dashboard/`): `RecentActivities` ("Últimas atividades": linha de três colunas com ícone de 32 px por tipo, assunto, "Autor · Empresa ou lead · hoje, 14:10" por `relativeDayTime`, link para o lead, a organização, o projeto, o aporte ou a empresa de prospecção; dois andares no celular) e `MyTasks` ("Minhas tarefas": assunto, pill de prioridade com texto, prazo humano e "Concluir"; dois andares no celular, a pill duas vezes no DOM com `hidden md:inline-flex` / `md:hidden`, como a fila). **Organização** (`organizations/`): `OrgLeadsCard` ("Leads e aportes"), `OrgContactsCard` ("Contatos") e `OrgNotesForm` ("Notas" com `AutosaveField`). Seções 7.2 e 7.6.

**`Shortcuts`** (Client, 12 linhas, no layout) — só `/` (D11); o Ctrl+K é tratado na própria paleta.

**`shell/`**: `sidebar.tsx` (client), `nav-items.tsx` (puro: `{ items, activeHref, collapsed, overdueCount }`), `sidebar-search.tsx` (client: `SidebarSearch`, `PaletteTrigger`, `openPalette`), `sidebar-user.tsx` (client), `use-sign-out.ts` (client: `useSignOut`, compartilhado com a folha "Mais"), `command-palette.tsx` (client), `palette-results.tsx` (puro), `bottom-bar.tsx` (client), `header.tsx` (server, recebe `breadcrumb`, `backHref`, `title`), `header-crumbs.tsx` (client; lê o `h1` da página e a página pai de `describePath`), `search-form.tsx` (server), `new-menu.tsx` (client), `shortcuts.tsx` (client), `toaster.tsx` (client), `fab.tsx` (server), `modules.ts` (puro). `nav.tsx` e `user-menu.tsx` foram removidos.

## 6. Badges semânticos

Mapa em `src/lib/crm/status-tones.ts` (`stageTone(pipeline, stage)`, `contributionTone(status)`, `temperatureTone`, `orgTypeTone`), consumido só por `StatusBadge`. Famílias: `neutral` (início), `info` (meio de funil, `--primary-soft`), `brand` (fechamento, `--brand-soft`), `success` (concluído ou ativo), `warning` (pausa ou atenção), `outline` + ícone (terminal). O mesmo nome de estágio pode ter tom diferente por pipeline (`inscrito` é meio em projetos e fechamento em alunos; `execucao` é sucesso nos dois; `encerrado` é sucesso), por isso a chave é `(pipeline, stage)`, nunca só `stage`.

### 6.1 Estágios (`STAGES` de `src/lib/domain/pipelines.ts`)

| Pipeline | Estágio | Rótulo | Família | Ícone lucide |
| --- | --- | --- | --- | --- |
| patrocinadores | `novo` | Novo | neutral | `Circle` |
| patrocinadores | `qualificado` | Qualificado | info | `CircleDot` |
| patrocinadores | `diagnostico` | Diagnóstico | info | `Search` |
| patrocinadores | `proposta` | Proposta | brand | `FileText` |
| patrocinadores | `termo` | Termo | brand | `FileSignature` |
| patrocinadores | `aporte` | Aporte | brand | `HandCoins` |
| patrocinadores | `recibo` | Recibo | success | `Receipt` |
| patrocinadores | `renovacao` | Renovação | success | `RotateCw` |
| patrocinadores | `perdido` | Perdido | outline | `CircleX` |
| contadores | `novo` | Novo | neutral | `Circle` |
| contadores | `contato` | Contato | info | `Phone` |
| contadores | `apresentacao` | Apresentação | info | `Presentation` |
| contadores | `parceria` | Parceria | brand | `Handshake` |
| contadores | `ativo` | Ativo | success | `CircleCheck` |
| contadores | `inativo` | Inativo | warning | `CirclePause` |
| contadores | `perdido` | Perdido | outline | `CircleX` |
| municipios | `novo` | Novo | neutral | `Circle` |
| municipios | `contato` | Contato | info | `Phone` |
| municipios | `diagnostico` | Diagnóstico | info | `Search` |
| municipios | `proposta` | Proposta | brand | `FileText` |
| municipios | `contrato` | Contrato | brand | `FileSignature` |
| municipios | `execucao` | Execução | success | `Play` |
| municipios | `encerrado` | Encerrado | success | `Flag` |
| municipios | `perdido` | Perdido | outline | `CircleX` |
| projetos | `prospeccao` | Prospecção | neutral | `Circle` |
| projetos | `avaliacao` | Avaliação | info | `Search` |
| projetos | `elaboracao` | Elaboração | info | `PenLine` |
| projetos | `inscrito` | Inscrito | info | `Send` |
| projetos | `autorizado` | Autorizado | brand | `BadgeCheck` |
| projetos | `captando` | Captando | brand | `HandCoins` |
| projetos | `execucao` | Execução | success | `Play` |
| projetos | `prestacao_contas` | Prestação de contas | warning | `ClipboardList` |
| projetos | `encerrado` | Encerrado | success | `Flag` |
| projetos | `arquivado` | Arquivado | outline | `Archive` |
| alunos | `lista_espera` | Lista de espera | neutral | `Circle` |
| alunos | `pesquisado` | Pesquisado | info | `ClipboardCheck` |
| alunos | `inscrito` | Inscrito | brand | `Ticket` |
| alunos | `aluno` | Aluno | success | `GraduationCap` |
| alunos | `alumni` | Alumni | success | `Award` |
| alunos | `perdido` | Perdido | outline | `CircleX` |

Rótulos vêm de `STAGE_LABELS` (`src/lib/crm/labels.ts`); `status-tones.ts` só guarda família e ícone. Um teste (`tests/lib/status-tones.test.ts`) percorre `STAGES` e garante que todo par `(pipeline, stage)` tem tom e que `CONTRIBUTION_STATUSES` está completo.

### 6.2 Status de aporte (`CONTRIBUTION_STATUSES` de `src/lib/domain/enums.ts`)

| Status | Rótulo | Família | Ícone |
| --- | --- | --- | --- |
| `proposta` | Proposta | neutral | `FileText` |
| `termo_assinado` | Termo assinado | info | `FileSignature` |
| `depositado` | Depositado | success | `Banknote` |
| `recibo_emitido` | Recibo emitido | success | `Receipt` |
| `cancelado` | Cancelado | outline | `CircleX` |

### 6.3 Temperatura, tipo de organização, alertas e atividades

| Tipo | Valor | Família | Ícone | Observação |
| --- | --- | --- | --- | --- |
| temperatura | `quente` | danger | `Flame` | texto "Quente" |
| temperatura | `morno` | warning | `Thermometer` | texto "Morno" |
| temperatura | `frio` | neutral | `Snowflake` | `null` em tabelas (`size="sm"`); "Frio" no detalhe |
| organização | `empresa` | info | `Building2` | |
| organização | `contabilidade` | neutral | `Calculator` | |
| organização | `municipio` | neutral | `Landmark` | |
| organização | `proponente` | brand | `Theater` | |
| organização | `outro` | neutral | `CircleHelp` | |
| alerta de projeto | `prazo` | warning | `TriangleAlert` | texto "menos de 6 meses"; na tabela vira ícone + `sr-only` + `Tooltip` |
| alerta de projeto | `captacao` | warning | `TriangleAlert` | texto "abaixo de 10 %" |
| contato | `isDecisionMaker` | brand | `Crown` | texto "decisor" |
| publicado | `publishedOnSite` | success | `Globe` | ícone ao lado do nome com `aria-label="Publicado no site"` |
| atividade | `ligacao` / `reuniao` / `email` / `whatsapp` / `visita` / `nota` / `tarefa` / `formulario` / `download` / `sistema` | — | `Phone` / `Users` / `Mail` / `MessageCircle` / `MapPin` / `StickyNote` / `CheckSquare` / `FileText` / `Download` / `Settings2` | só ícone na `Timeline`; rótulo em `ACTIVITY_TYPE_LABELS` |
| prospecção (`kind="prospecting"`, ADR-004) | `a_ligar` | neutral | `Phone` | texto "A ligar" |
| prospecção | `sem_resposta` | warning | `PhoneMissed` | texto "Sem resposta" |
| prospecção | `retornar` | info | `CalendarClock` | texto "Retornar" |
| prospecção | `reuniao_marcada` | success | `CalendarCheck` | texto "Reunião marcada" |
| prospecção | `descartado` | outline | `Ban` | texto "Descartado" |
| prioridade da tarefa (`kind="priority"`) | `alta` | warning | `ArrowUp` | texto "Alta"; nunca só um ponto colorido |
| prioridade da tarefa | `media` | neutral | `Minus` | texto "Média"; `null` (dado antigo) é tratado como média |
| prioridade da tarefa | `baixa` | outline | `ArrowDown` | texto "Baixa" |
| estado da tarefa (`TASK_STATUS_LABELS`, derivado, nunca gravado) | `a_fazer` / `em_andamento` / `concluida` | — | ponto de 8 px no cabeçalho da coluna | "A fazer" / "Em andamento" / "Concluída"; texto, não badge |

Se o `lucide-react` instalado não exportar um nome (ex.: `CircleX` versus `XCircle`), usar o alias existente; nunca baixar outra biblioteca de ícones.

## 7. Tela por tela

Convenções de leitura dos wireframes: `[ ]` botão, `▾` abre menu ou diálogo, `●` vencido, `◐` perto do prazo, `○` no prazo, `☐` tarefa, `▣` badge.

### 7.1 Entrar (`src/app/(auth)/entrar/`) e Redefinir senha (`src/app/(auth)/redefinir-senha/`)

```
┌──────────────── canvas areia, min-h-dvh, centrado ────────────────┐
│                                                                   │
│                      Prospekto            (serif 600 24)          │
│                      CRM                  (eyebrow vinho)         │
│          ┌──────────────────────────────────────────┐             │
│          │ Entrar                      (serif 24)   │             │
│          │ Acesso restrito à equipe da Prospekto.   │             │
│          │                                          │             │
│          │ E-mail                                   │             │
│          │ [__________________________________]     │             │
│          │ Senha                    Esqueci a senha │             │
│          │ [______________________________] [👁]    │             │
│          │ [             Entrar               ]     │  h-11       │
│          └──────────────────────────────────────────┘             │
│                       ‹ Voltar ao site                            │
└───────────────────────────────────────────────────────────────────┘
```

- `src/app/(auth)/layout.tsx`: `<div data-crm className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">`, wordmark, `<main className="w-full max-w-sm">`, card branco `rounded-xl border border-border bg-card p-6 sm:p-8`, link "Voltar ao site" em `text-sm text-muted-foreground`. Sem `SiteHeader`, sem `SiteFooter`.
- `login-form.tsx`: campos `h-11` no celular; botão mostrar/ocultar senha (`Eye`/`EyeOff`, `aria-pressed`, `aria-label="Mostrar senha"`); erro em `Callout danger role="alert"` acima do botão com `tabIndex={-1}` e foco programático; `autoComplete="email"`/`"current-password"` (já é); botão "Entrar" largura total `h-11`; estado "Entrando…".
- `reset=1` → `Callout success` "Senha redefinida. Entre com a nova senha." Banner de sessão expirada quando `next` está presente: `Callout info` "Sua sessão expirou. Entre de novo para continuar em {módulo}" (módulo derivado de `next`: `/app/leads/…` → "Leads").
- Redefinir: mesmo cartão; sem token, após enviar, o estado de sucesso substitui o formulário: "Se esse e-mail tiver acesso, o link chega em até um minuto e vale por uma hora."; `error=INVALID_TOKEN` → `Callout danger`.
- Celular: card com `px-4`, sem rodapé.

Melhorias: sem rodapé institucional (1.800 px a menos no celular); serifa e wordmark; mostrar senha; foco no erro; rótulo "Esqueci a senha" ao lado do campo.

### 7.2 Painel (`src/app/(app)/app/page.tsx`, `src/components/crm/today.tsx`, `src/components/crm/dashboard/`)

O módulo chama-se "Painel" (ADR-004, 6.1; `<title>` "Painel"); a tela continua sendo a fila de trabalho (R-13) e ganha o retrato da empresa: duas réguas de medidores e dois blocos novos.

```
┌ Painel ────────────────────────────────────────── segunda-feira, 6 de outubro ──┐
│ Bom dia, Daniela.                                                 (crm-h1)      │
│ ┌ Hoje ─────────┬────────────────┬───────────────┬──────────────────────────┐   │
│ │ ● VENCIDAS    │ ● SEM CONTATO  │ TAREFAS HOJE  │ APORTES 15 DIAS          │   │
│ │ 3             │ 5              │ 4             │ R$ 350.000,00            │   │
│ │ próximas ações│ 2 fora do prazo│ 2 atrasadas   │ 3 previstos              │   │
│ └───────────────┴────────────────┴───────────────┴──────────────────────────┘   │
│   → ?sort=next_action  → ?sort=created  → /app/tarefas?vencem=hoje  → /app/aportes?janela=15d │
│ ┌ Carteira ─────┬────────────────┬───────────────┬──────────────────────────┐   │
│ │ ORG. ATIVAS   │ APORTES ABERTOS│ DEPOSITADO ANO│ PROJETOS CAPTANDO        │   │
│ │ 4             │ R$ 1.350.000,00│ R$ 150.000,00 │ 1                        │   │
│ │ 12 meses      │ 3 propostos    │ 2026          │ 1 com alerta             │   │
│ └───────────────┴────────────────┴───────────────┴──────────────────────────┘   │
│                                                                                 │
│ ▌⚠ Precisa de ação agora (12)                                                   │
│ ┃ ☐ Reenviar material da LIC-RS · Rodrigo Pasqualotto   ● atrasada há 3 dias  [Concluir] │
│ ┃ ○ Rodrigo Pasqualotto · Rede Farmácias Vale  ▣ Qualificado  ● ação atrasada há 3 dias  [💬] [Registrar contato] │
│ ┃ ○ Mateus Fontana · Alunos  ▣ Lista de espera  ● sem contato há 6 dias (prazo: automático)  [💬] [Assumir] │
│ ┃ …                                                             ver todos os 12 › │
│                                                                                 │
│ ▌◷ Próximos 7 dias (9)                                                          │
│ ┃ TER., 7 DE OUT.                                                               │
│ ┃ ○ Marina Tedesco · Vinícola Monte Belo   ▣ Proposta        07:00              │
│ ┃ QUA., 8 DE OUT.                                                               │
│ ┃ ○ Coletivo Teatro da Serra               ▣ Avaliação       07:00              │
│ ┃ ☐ Fechar cronograma de contrapartidas    qui., 9           [Concluir]         │
│                                                                                 │
│ ▌$ Aportes previstos (3)                 ▌▲ Projetos com alerta (2)             │
│ ┃ Cláudio Bertolini → Festival de Inverno ┃ Orquestra Jovem   ▓▓░░░░ 16 %  70 d │
│ ┃ R$ 200.000,00 · 12/10 · Termo assinado  ┃ Festival Inverno  ░░░░░░  0 %  170 d│
│                                                                                 │
│ ▌◷ Últimas atividades                    ▌☑ Minhas tarefas          ver todas › │
│ ┃ ☏ Ligação: retornar em 17/10           ┃ Preparar o roteiro  [Alta] vence amanhã [Concluir] │
│ ┃   Daniela · Adega Fictícia · hoje, 14:10┃ Enviar proposta     [Média] em 3 dias  [Concluir] │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Cabeçalho**: `PageHeader` com `eyebrow` = data por extenso (`Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "America/Sao_Paulo" })`, primeira letra maiúscula) e `title` = "Bom dia, Daniela." / "Boa tarde" / "Boa noite" pelo horário em São Paulo (`session.user.name` primeiro nome). Sem botão "Novo lead" no header da página: o "Novo ▾" do shell cobre.
- **Régua "Hoje"** (`StatRuler label="Hoje"` com quatro `StatCard variant="ruler"`, D15 e ADR-004, 6.8): Vencidas (`overdue.length`, `tone="danger"` quando > 0, hint "próximas ações", `/app/leads?sort=next_action`), Sem contato (`newLeads.length`, hint "N fora do prazo" contando `stageInfo(l).slaOverdue`, `/app/leads?sort=created`), Tarefas hoje (vencidas mais as de hoje, `/app/tarefas?vencem=hoje`; o hint "N atrasadas" é um segundo link, `hintHref="/app/tarefas?atrasadas=1"`, porque `?atrasadas=1` mostraria menos do que o medidor diz), Aportes 15 dias (soma de `proposedAmount` em `formatBRL`, hint "3 previstos", `/app/aportes?janela=15d`). `aria-label` completo e `title` por extenso em cada célula.
- **Régua "Carteira"** (`getPortfolioTotals(ctx, now)` em `repos/dashboard.ts`: quatro agregados no banco, nunca em JavaScript sobre linhas carregadas): Organizações ativas (com aporte `depositado` ou `recibo_emitido` nos últimos 12 meses; `/app/organizacoes`), Aportes em aberto (soma de `proposed_amount` em `proposta` e `termo_assinado`; `/app/aportes`), Depositado no ano (soma de `deposited_amount` no ano civil de São Paulo; `/app/aportes?status=depositado`), Projetos captando (contagem; `/app/projetos?estagio=captando`, hint "N com alerta" vindo de `projectsAlert.length`, que a página já carrega). Vazio: zeros.
- **Fila "Precisa de ação agora"** (`section aria-labelledby`, barra de 3 px `border-l-destructive`, ícone `TriangleAlert`, contagem): junta tarefas vencidas e de hoje, próximas ações vencidas e leads novos sem contato; ordenação na própria `page.tsx`: tarefas vencidas por `dueAt` crescente, depois leads por `nextActionAt` crescente, depois leads novos por `stageInfo.slaDeadline` crescente (vencidos primeiro, sem SLA por último). Máximo de 8 linhas visíveis; "ver todos os N ›" expande via `<details>` (não precisa de nova consulta: o teto de 20 por consulta permanece). Linha = grid `grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1fr)_14rem_auto]` de 44 px: quem (ícone `☐`/`○` + nome link + empresa em meta), estado (`StatusBadge stage` + `SlaIndicator`), ação (`TaskCompleteButton` `size="sm"` / `form action={claimLeadAction}` "Assumir" `size="sm"` / "Registrar contato" link `outline sm` para `/app/leads/[id]?registrar=1` / WhatsApp como ícone `MessageCircle` com `aria-label="Abrir WhatsApp com Rodrigo"` e `Tooltip`).
- **Próximos 7 dias**: leads com próxima ação e tarefas futuras, agrupados por dia com cabeçalho `.crm-eyebrow`; sem "ver todos".
- **Aportes previstos / Projetos com alerta** lado a lado (`md:grid-cols-2`): aportes com valor em `tabular`, data e `StatusBadge contribution`; projetos com `Meter` e dias restantes (`text-warning` quando < 183 dias).
- **Últimas atividades / Minhas tarefas** lado a lado (`md:grid-cols-2`, `RecentActivities` e `MyTasks`, ADR-004, 6.8): as 8 atividades mais recentes do tenant exceto `sistema`, `download` e `formulario` (`listRecentActivities`), com ícone por tipo, assunto, "Autor · Empresa ou lead · hoje, 14:10" e link para o registro; as 8 tarefas abertas com `owner_user_id` do usuário da sessão por vencimento (`listOpenTasksForOwner`), pill de prioridade com texto, prazo humano, "Concluir" e "ver todas ›" para `/app/tarefas?dono=eu`. Vazios: "Nenhuma atividade registrada ainda. Ligações, reuniões e notas aparecem aqui." e "Nenhuma tarefa atribuída a você." + "Nova tarefa" (`/app/tarefas?novo=1`).
- **Vazio**: quando as três filas de urgência estão vazias, um único `EmptyState` com `Sun`: "Nada vencido. Bom dia." + "Veja os próximos 7 dias ›"; as réguas ficam com 0.
- **Celular**: réguas 2×2 com as hairlines da `StatRuler`; linhas em dois andares (nome + empresa / badge + SLA + ação `size="touch"`); "Minhas tarefas" em dois andares (assunto + Concluir; pill + prazo embaixo); filas inferiores empilham.
- **Some**: os sete blocos iguais, a descrição longa, o badge "Frio" em cada linha, "sem dono" em texto solto (vira "Assumir"), a cor da borda como único sinal.

### 7.3 Pipeline: Lista e Quadro (`leads/page.tsx`, `lead-filters.tsx`, `lead-table.tsx`, `leads/lead-board*.tsx`, `leads/view-toggle.tsx`)

O módulo chama-se "Pipeline" (ADR-004, 6.1; a rota `/app/leads` não muda; `<title>` e H1 "Pipeline"). A página tem duas visões, **Lista** e **Quadro**, escolhidas pela `ViewToggle` ao lado da toolbar.

**Alternância e cookie** (ADR-004, 6.2; plano, P4): `?view=lista|quadro` na URL vence o cookie `crm-leads-view`, que vence o padrão; `resolveLeadsView(param, cookie)` (`src/lib/crm/leads-view.ts`) devolve `"lista"`, `"quadro"` ou `"ambas"`. Em `"ambas"` (primeira visita, sem cookie e sem `?view=`) a página carrega as duas consultas e renderiza o quadro em `hidden md:block` e a lista em `md:hidden`; a `LeadToolbar` é uma só (`mode: "ambas"`: a metade desktop em modo quadro e a metade celular em modo lista, cada uma com a sua `ViewToggle` e o `aria-current` certo; duas toolbars duplicariam ids), e só a `ViewToggle` do desktop grava o cookie em silêncio ao montar (`lista` abaixo de 960 px, senão `quadro`), sem troca de tela. Com cookie ou `?view=`, uma visão só. `parseLeadFilters` lê `view` e `leadFiltersToQuery` o serializa: a lista aberta pelo "ver todos em Lista ›" preserva `view=lista` na paginação, nos chips e nos formulários (campo oculto), sem gravar o cookie.

**Lista** (a tela abaixo, como antes). Em **Quadro**, o filtro "Estágio" e a ordenação somem da `Toolbar` (as colunas são os estágios; a ordem é fixa por urgência: `next_action_at` ascendente com nulos por último, depois `stage_entered_at`); busca, segmento, origem, dono, temperatura e "Mostrar perdidos" valem para as duas visões; `page` é ignorado. O quadro em si (colunas, cartão, arrasto, soltura que abre o "Mover para", teclado, celular) está na seção 5.2, `LeadBoard`; os estados, na seção 8.

```
┌ Pipeline ──────────────────────────────────────────── [Lista] [Quadro] [+ Novo lead] ┐
│ Patrocinadores 8 │ Contadores 3 │ Municípios 2 │ Projetos 1 │ Alunos 2    (abas, link) │
│ ───────────────────                                                                   │
│ [🔍 Nome, e-mail ou empresa] [Estágio: todos ▾] [Segmento ▾] [Origem ▾] [Dono ▾] [Ordenar: próxima ação ▾] [⋯ Mais] │
│ Temperatura: Quente ✕    Mostrar perdidos ✕    Limpar                                 │
│ ┌────────────────────────────┬────────────────┬──────────────────────────┬───────┬─────┐│
│ │ NOME                       │ ESTÁGIO        │ PRÓXIMA AÇÃO ▲           │ ORIGEM│ DONO││
│ ├────────────────────────────┼────────────────┼──────────────────────────┼───────┼─────┤│
│ │ Rodrigo Pasqualotto        │ ▣ Qualificado  │ ● Ação atrasada há 3 dias│ Site  │ RT  ││
│ │ Rede Farmácias Vale · PJ   │                │                          │       │     ││
│ │ Beatriz Maggioni  🔥       │ ▣ Diagnóstico  │ ● Ação vence hoje        │ Simul.│ RT  ││
│ │ Fernanda Lorenzi           │ ▣ Novo         │ ● Sem contato há 1 dia   │ Simul.│[Assumir]│
│ └────────────────────────────┴────────────────┴──────────────────────────┴───────┴─────┘│
│ 1–8 de 8                                                       [‹ Anterior] [Próxima ›] │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

- **Abas de pipeline** (`PipelineTabs`, continuam links): `nav aria-label="Pipelines"` com `border-b`, item ativo `border-b-2 border-primary font-medium`, contagem em `tabular text-muted-foreground`; no celular `-mx-4 px-4 overflow-x-auto snap-x` (a única rolagem horizontal permitida, dentro do elemento).
- **Toolbar** (seção 5.2): busca + Estágio + Segmento (só patrocinadores) + Origem + Dono + Ordenar; "Temperatura" e "Mostrar perdidos" no menu "⋯ Mais filtros" (um `DropdownMenu` com os dois controles no desktop; no `Sheet` do celular todos aparecem). `parseLeadFilters` e `leadFiltersToQuery` não mudam.
- **Colunas**: Nome (`priority 1`; empresa · segmento em `.crm-meta` abaixo; `StatusBadge temperature size="sm"` ao lado do nome só para morno/quente), Estágio (`priority 1`, `StatusBadge stage pipeline`), Próxima ação (`priority 1`, `SlaIndicator`; ordenável por `sort=next_action`), Origem (`priority 3`), Dono (`priority 2`; `Avatar size="sm"` com `Tooltip` do nome; sem dono → `form action={claimLeadAction}` com botão "Assumir" `outline sm relative z-10`). Somem as colunas Empresa, Segmento (absorvidas) e Temperatura.
- **Celular**: card com `primary` = nome + temperatura, `secondary` = empresa · estágio (badge), `trailing` = `SlaIndicator`, `action` = "Assumir" quando sem dono.
- **Paginação**: "1–25 de 83" + `outline sm` com `ChevronLeft/Right`, `aria-label="Página anterior"`, `rel="prev|next"`; `Pagination` continua em `lead-filters.tsx`.
- **Importar CSV**: botão `outline` desabilitado no `PageHeader` com `Tooltip` "Chega na próxima etapa" e `aria-describedby`; some o parágrafo do rodapé.
- **Vazio**: com filtro → `EmptyState SearchX` "Nenhum lead com esses filtros." + "Limpar filtros"; sem filtro → ícone do módulo, "Ainda não há leads de contadores." + "Cadastrar lead" + "Os formulários do site entram sozinhos."
- Perdidos (com "Mostrar perdidos"): linha em `opacity-70` com badge `outline`.

### 7.4 Lead (`leads/[id]/page.tsx`)

```
┌ Leads › Rodrigo Pasqualotto ──────────────────────────────────────────────────────────┐
│ PATROCINADORES · EMPRESA (PJ)                                                         │
│ Rodrigo Pasqualotto                      [💬 WhatsApp] [✉] [Editar] [Mover para ▾] [⋯] │
│ Rede Farmácias Vale › · Garibaldi/RS                                                  │
│ ▣ Qualificado  ○ 3 dias no prazo do estágio  🔥 Quente · score 72   (RT) Rafael        │
├───────────────────────────────────────────────┬───────────────────────────────────────┤
│ ┃ PRÓXIMO PASSO                               │ ┌ Resumo ─────────────────────────┐   │
│ ┃ Fazer a próxima ação                        │ │ Próxima ação  ● atrasada há 3 d  │   │
│ ┃ Atrasada há 3 dias (sex., 3 de out., 07:00) │ │ Último contato  06/10, 13:07     │   │
│ ┃ [Registrar contato] [💬 WhatsApp]           │ │ Responsável  [Rafael Teste ▾]    │   │
│                                               │ │ Interesse  Não sabe ainda        │   │
│ ┌ Registrar atividade ──────────── id=registrar┐│ └─────────────────────────────────┘   │
│ │ (Ligação)(Reunião)(E-mail)(WhatsApp)(Visita)││ ┌ Contato ────────────────────────┐   │
│ │ (Nota)(Tarefa)                               ││ │ ✉ rodrigo@exemplo.com.br        │   │
│ │ O que aconteceu [________________________]   ││ │ ☎ não informado · Editar        │   │
│ │ Assunto [______________]                     ││ │ Garibaldi / RS                  │   │
│ │ Data e hora [06/10/2026 13:10] seg., 6 out.  ││ └─────────────────────────────────┘   │
│ │ Próxima ação [09/10/2026 13:10] qui., 9 out. ││ ┌ Aportes (1) ─────────── [+ Novo]┐  │
│ │                                  [Registrar] ││ │ Cinema na Praça  R$ 30.000,00   │  │
│ └──────────────────────────────────────────────┘│ │ ▣ Proposta · prev. 20/10 [Assinar termo] │
│                                               │ └─────────────────────────────────┘   │
│ ┌ Linha do tempo (6) ──────────────────────────┐│ ┌ Empresa ───── Rede Farmácias Vale ›┐ │
│ │ HOJE                                         ││ │ CNPJ  55.667.788/0001-86 (code)  │ │
│ │ ◉ Proposta de R$ 30.000,00 em Cinema na Praça││ │ Regime  não informado            │ │
│ │ ◉ Tarefa  Reenviar material LIC-RS           ││ │ Mostrar todos (14 sem valor) ›   │ │
│ │   vence 03/10 ● atrasada há 3 dias [Concluir]││ └─────────────────────────────────┘ │
│ │ ◌ 2 mudanças automáticas · mostrar           ││ ┌ Origem ──────┐ ┌ Consentimentos ─┐│
│ │ 30 DE SETEMBRO                               ││ │ Site · 27/09 │ │ ✓ Contato comerc.││
│ │ ◉ Ligação  Sem resposta, deixar recado       ││ └──────────────┘ │ – Marketing      ││
│ └──────────────────────────────────────────────┘│                  └──────────────────┘│
└───────────────────────────────────────────────┴───────────────────────────────────────┘
```

- **Cabeçalho**: `PageHeader` com `eyebrow` (pipeline · segmento), `title` (nome), linha de contexto (empresa como link para a organização quando `orgId`, cidade/UF), `meta` com `StatusBadge stage`, `SlaIndicator` (frase de `describeSla`), `StatusBadge temperature size="md"` + "score 72", `Avatar` do dono. Ações: WhatsApp (ícone + texto; `LeadWhatsappButton` ganha `variant="icon"`), e-mail (ícone, `aria-label="Enviar e-mail"`), Editar (`LeadEditDialog`), "Mover para" (primário, `ChevronDown`), "⋯" com "Marcar perdido" (`tone="danger"`). "Marcar perdido" sai do grupo primário (longe do azul).
- **`?existente=1`**: `Callout info role="status"` abaixo do cabeçalho: "Esse e-mail já existia neste segmento: os dados foram atualizados em vez de criar outro lead." (sem toast, sem `router.replace`).
- **Coluna principal** (`main`): `NextStepCard` (seção 5.2) → `FormSection id="registrar"` "Registrar atividade" com `SegmentedControl` de tipo, campo "O que aconteceu" primeiro, Assunto, data e hora com `DateHint`, próxima ação com `DateHint` e `help` "Sugerida pelo prazo do estágio. Deixe em branco para manter a atual."; o `ActivityForm` lê `searchParams.registrar === "1"` (prop `autoFocus`) e `location.hash === "#registrar"` para focar o textarea → `Timeline`.
- **Coluna lateral** (`aside aria-label="Dados do lead"`, sticky): Resumo (`KeyValueList`: próxima ação com `SlaIndicator`, último contato, responsável como `OwnerForm` inline com `<select>` que submete no `change` e "Salvando…" ao lado enquanto envia (sem botão "Atribuir", D19), interesse, motivo de perda quando terminal, tags), Contato (e-mail `mailto:`, telefone `tel:` ou "não informado · Editar" abrindo o `LeadEditDialog`, cidade, mensagem, e-mail devolvido em `Badge danger`), Aportes (só patrocinadores; `ContributionTable layout="cards"` + "Novo aporte" abrindo `NewContributionDialog` com `projects` carregados na página; some o link "registrar em Projetos"), Empresa (`KeyValueList hideEmpty` dos campos do segmento com CNPJ em `code`; título é o nome da organização com link; quando PJ sem organização, `Callout warning` "Para chegar a Termo, cadastre a empresa com CNPJ em Organizações ›"), Origem (`KeyValueList`: origem · detalhe, UTM, referência, página de entrada, versão do guia, indicado por, projeto de interesse, criado em), Consentimentos (`ShieldCheck` em `text-success` + "Contato comercial autorizado em 06/10/2026 por e-mail (política 2026-10)"; "Marketing: nunca registrado" em muted; texto integral em `<details>`), Simulações (`<details>` como hoje).
- **Celular** (ordem): cabeçalho compacto → `NextStepCard` → Resumo → Contato → `FormSection` "Registrar atividade" (fechado; a `ActionBarMobile` "Registrar" abre e foca) → Aportes → Empresa, Origem, Consentimentos, Simulações em `<details>` → Linha do tempo. `ActionBarMobile`: "Registrar" (primário, `href="#registrar"`), "Mover para" (`outline`), "⋯" com Editar, WhatsApp, E-mail, Marcar perdido.
- **Some**: card "Atribuir dono"; a frase "Organização vinculada: … (CNPJ …)"; ids crus na timeline (`humanizeSystemActivity`); 19 linhas "não informado"; `Row`/`Section` locais (viram `KeyValueList`/`Card`).

### 7.5 Novo lead (`leads/novo/page.tsx`, `forms/lead-create-form.tsx`, `forms/attribute-fields.tsx`)

```
┌ Leads › Novo lead ──────────────────────────────────────────────────────┐
│ Novo lead                                                 * obrigatório  │
│ ┌ Quem é ──────────────────────────────────────────────────────────┐    │
│ │ Segmento  (Empresa PJ)(Pessoa física)(Contador)(Município)(Proponente)(Aluno) │
│ │ Nome *  [__________________]   E-mail *  [______________________] │    │
│ │ Telefone (WhatsApp) [___________]  Cidade [__________] UF [RS ▾]  │    │
│ └──────────────────────────────────────────────────────────────────┘    │
│ ┌ De onde veio ────────────────────────────────────────────────────┐    │
│ │ Origem * [Selecione ▾]   Detalhe [Quem indicou, evento, campanha] │    │
│ │ Interesse [Não sabe ainda ▾]   Observações [___________________]  │    │
│ │ ℹ Formulários do site entram sozinhos.                            │    │
│ └──────────────────────────────────────────────────────────────────┘    │
│ ┌ Consentimento (LGPD) ────────────────────────────────────────────┐    │
│ │ ☐ A pessoa autorizou o contato comercial (verbalmente ou por escrito) │
│ │ ℹ Para pessoa física é obrigatório; para empresas, contadores,    │    │
│ │   municípios e proponentes vale o legítimo interesse.             │    │
│ └──────────────────────────────────────────────────────────────────┘    │
│ › Mais sobre a empresa (opcional · 0 de 17 preenchidos)                 │
│ ─────────────────────────────────────────────────────────────────────── │
│                                              [Cancelar]  [Criar lead]   │  ← FormActions sticky
└─────────────────────────────────────────────────────────────────────────┘
```

- Quatro `FormSection`: "Quem é" (segmento como `SegmentedControl`; nome; e-mail; telefone; cidade/UF), "De onde veio" (origem, detalhe, interesse, observações; `Callout info` curto), "Consentimento (LGPD)" (sobe para antes da seção colapsada; `CheckboxField` com `help`; para PF o checkbox recebe `required` e `aria-required` e o erro "Para pessoa física o consentimento é obrigatório" vem da validação atual do servidor; ao marcar aparecem "Como foi dado" e os canais, como hoje), "Mais sobre a empresa" (`collapsible`, fechada; título muda por segmento: "Mais sobre a pessoa", "Mais sobre o escritório", "Mais sobre o município", "Mais sobre o proponente", "Mais sobre o aluno"; `count` "0 de 17 preenchidos"; abre com `open` quando `state.fieldErrors` tem chave `attr_*`).
- `AttributeFields` ganha `groups` (D4): PJ → "Empresa e regime" (`empresa`, `cnpj`, `cargo`, `regime_tributario`, `regime_confirmado_por`, `irpj_faixa`, `apuracao`, `contador_escritorio`), "Qualificação" (`usa_incentivos`, `contribuinte_icms_rs`, `setor`, `numero_funcionarios_faixa`, `contador_participa`, `disponibilidade`, `decisor_em_contato`, `conhece_incentivos`), "Checagem do art. 27 (só antes de Termo)" (`vinculo_art27_checado`, `_em`, `_por`); PF → "Declaração" (todos menos art. 27) e "Checagem do art. 27"; demais segmentos um grupo só. Prop `art27?: "open" | "collapsed"`: `collapsed` na criação (sub-`<details>` fechado), `open` no `LeadEditDialog`. A ordem e as chaves de `ATTRIBUTE_FIELDS` não mudam; o agrupamento é uma lista de chaves em `attribute-fields.tsx`.
- Selects de atributos: primeira opção "Selecione" em `text-placeholder` (valor vazio continua enviado e tratado como ausente por `attributesFromForm`); booleanos "Selecione / Sim / Não".
- Obrigatório: asterisco (`<span aria-hidden>*</span>`) + `aria-required` + nota "* obrigatório" no `PageHeader`/`FormActions`; some o "(obrigatório)" repetido. `FieldShell` e o `Shell` de `action-form.tsx` passam a renderizar assim.
- Campos `date` com `placeholder="dd/mm/aaaa"` e `DateHint`.
- `FormActions` sticky com "Cancelar" (`/app/leads`) e "Criar lead"; `max-w-3xl`. Após criar: `redirect` (já existe) e `toast.success("Lead criado.")` disparado pela página de destino? Não: o redirect vem do servidor; a tela do lead é a confirmação. Sem toast.
- Erro de validação: `FormMessage` em `error-soft` no topo + erro sob o campo + foco no primeiro `[aria-invalid]` (`useEffect` de 5 linhas no formulário).

### 7.6 Organizações (`organizacoes/page.tsx`) e Organização (`organizacoes/[id]/page.tsx`)

```
┌ Organizações ──────────────────────────────────────── [+ Nova organização] ┐
│ [🔍 Nome, nome fantasia ou CNPJ] [Tipo: todos ▾]                            │
│ ┌──────────────────────────────┬────────────┬────────────────────┬───────────┬──────┬─────┐
│ │ NOME                         │ TIPO       │ CNPJ               │ CIDADE/UF │ CONT.│LEADS│
│ │ Rede Farmácias Vale          │ ▣ Empresa  │ 55.667.788/0001-86 │ Garibaldi/RS │ 0 │  1  │
│ │ Associação Orquestra Jovem   │ ▣ Proponente│ —                 │ Caxias/RS │ — │  —  │
│ └──────────────────────────────┴────────────┴────────────────────┴───────────┴──────┴─────┘
```

- `PageHeader` + `Toolbar` (busca, tipo) + `DataTable`: Nome (`priority 1`, nome fantasia em meta), Tipo (`priority 1`, `StatusBadge orgType`), CNPJ (`priority 2`, `.crm-code`, "—" com `aria-label="sem CNPJ"`), Cidade/UF (`priority 2`), Contatos e Leads (`right`, `priority 3`; `0` vira "—" em muted). Celular: nome + tipo / cidade / CNPJ. FAB abre o `NewOrganizationDialog`.
- Vazio: `EmptyState Building2` "Nenhuma organização ainda. Empresas patrocinadoras precisam de CNPJ antes do termo." + "Nova organização".

```
┌ Organizações › Associação Orquestra Jovem ────── [Editar] [+ Contato] [Vincular lead] ┐
│ Associação Orquestra Jovem de Caxias    ▣ Proponente                                   │
│ Caxias do Sul/RS · quem cuida: (RT) Rafael                                             │
├───────────────────────────────────────────────┬────────────────────────────────────────┤
│ Contatos (0)                                  │ Dados                                  │
│ [EmptyState Users: Nenhum contato ainda.      │ CNPJ  —  · necessário para o termo     │
│  "Cadastre quem decide e quem assina."        │ Regime tributário  não informado       │
│  [+ Novo contato]]                            │ Mostrar todos (6 sem valor) ›          │
│ Leads vinculados (0)                          │ Projetos deste proponente (1)          │
│ [EmptyState: Nenhum lead vinculado…]          │ Orquestra Jovem ▣ Captando  saldo 270k │
└───────────────────────────────────────────────┴────────────────────────────────────────┘
```

- **Ficha no padrão do Trilis** (ADR-004, 6.9), sobre o `DetailLayout`:
  - Cabeçalho como antes (nome, tipo, cidade, quem cuida); primário "Novo contato"; secundários "Editar" (`Sheet`) e "Vincular lead"; novo: botão `outline` **"Ligar (54) 3000-0000"** como link `tel:` (padrão D-G, seção 6.10 do ADR) com o telefone do contato decisor, na falta o do primeiro contato com telefone, na falta `organizations.phone`.
  - Coluna principal: `FormSection` **"Registrar atividade"** com o `ActivityForm` em modo organização (`target: { orgId }`: ligação, reunião, e-mail, WhatsApp, visita, nota e tarefa; sem "próxima ação" nem IA, que são do lead; `registerActivityAction` aceita `orgId` e grava `activities.org_id`), depois **"Histórico"** com a `Timeline` de `listOrganizationActivities(ctx, orgId, { limit: 300 })`: atividades com `org_id` da organização **ou** `lead_id` em um lead dela (toda ligação da Daniela é registrada no lead, com `org_id` nulo; sem isso o histórico ficaria quase vazio); cada linha vinda de um lead mostra "· Rodrigo" (nome do lead) depois do assunto. Vazio: "Nenhuma atividade registrada."
  - Lateral, nesta ordem: **"Leads e aportes"** (`OrgLeadsCard`: leads vinculados com `StatusBadge` do estágio, `SlaIndicator` e o valor do aporte aberto quando houver; "ver no quadro ›" para `/app/leads?pipeline=patrocinadores&view=quadro`; "Vincular lead" no vazio), **"Contatos"** (`OrgContactsCard`, lista compacta: nome com `Crown` de decisor, cargo, e-mail `mailto:` e telefone `tel:` como links; "Editar" por contato; "+ Novo contato"; sem remoção de contato nesta entrega: dado pessoal com origem registrada), **"Dados"** (`KeyValueList hideEmpty`, com o telefone da empresa como link `tel:` e sem o item "Notas"; CNPJ `code` com `hint` "necessário para o termo" quando `empresa` sem CNPJ), **"Notas"** (`OrgNotesForm`: `AutosaveField` com label `sr-only`, salva ao perder o foco por `updateOrganizationNotesAction`, status "Salvo às 14:32" / "Salvando…" / "Não foi possível salvar; tente de novo" alinhado à direita acima da textarea; último a gravar vence) e, para proponentes, "Projetos deste proponente" (como antes: `listProjectSummaries(ctx, { includeArchived: true, limit: 500 })` filtrado em memória por `proponentName === org.name`).
- "Editar" abre `Sheet side="right"` (celular: `bottom`) com `OrganizationFields`, que agora inclui o campo "Telefone da empresa" (também em "Nova organização"; E.164 por `phoneSchema`; ajuda: "Central ou recepção, com DDD… O telefone de cada pessoa fica no contato.").
- Celular: `ActionBarMobile` "Novo contato" + "Ligar" (quando há telefone), "⋯" com Vincular lead (`?vincular=1`, que abre o `LinkLeadDialog` com `defaultOpen`) e Editar organização (`?editar=1`); ordem: cabeçalho, Registrar atividade, Leads e aportes, Contatos, Histórico, Dados, Notas.
- Status derivado da organização (lead/ativa/inativa) **não** entra: a régua "Carteira" já conta as ativas.

### 7.7 Projetos (`projetos/page.tsx`) e Projeto (`projetos/[id]/page.tsx`)

```
┌ Projetos ───────────────────────────────────────────────────── [+ Novo projeto] ┐
│ ┌ APROVADO ────┐ ┌ CAPTADO ───┐ ┌ SALDO A CAPTAR ┐ ┌ ▲ COM ALERTA ───┐          │
│ │ R$ 1.170.000 │ │ R$ 50.000  │ │ R$ 1.120.000   │ │ 2  → ?alertas=1 │          │
│ [🔍 Projeto ou proponente] [Estágio: todos ▾] [Mecanismo ▾]  Só com alerta ✕      │
│ ┌──────────────────────┬────────────┬───────────┬────────────┬────────────────┬────────────┐
│ │ PROJETO              │ ESTÁGIO    │ MECANISMO │ APROVADO (R$)│ CAPTADO      │ PRAZO      │
│ │ Orquestra Jovem… 🌐  │ ▣ Captando │ LIC-RS    │ 320.000,00 │ ▓▓░░░░ 16 %  │ ⚠ 15/12 · 70 d │
│ │ Assoc. Orquestra Jovem│           │           │            │              │            │
│ │ Festival de Inverno… │ ▣ Captando │ Rouanet 18│ 850.000,00 │ ░░░░░░  0 % ⚠│ 25/03 · 170 d │
│ └──────────────────────┴────────────┴───────────┴────────────┴────────────────┴────────────┘
```

- Quatro `StatCard` acima (somas das linhas já carregadas: aprovado, captado, saldo, com alerta com `href="/app/projetos?alertas=1"` e `tone="warning"`).
- `Toolbar`: busca, estágio, mecanismo; "Só com alerta" e "Mostrar arquivados" como chips toggle (checkbox no `Sheet` do celular). Parâmetros `q`, `estagio`, `mecanismo`, `arquivados`, `alertas` não mudam.
- Colunas: Projeto (`priority 1`, proponente em meta, `Globe` quando publicado com `aria-label`), Estágio (`priority 1`), Mecanismo (`priority 3`), Aprovado (`right`, `priority 2`, "R$" só no cabeçalho), Captado (`priority 1`: `Meter` 96 px + percentual; valor em R$ no `title` e no card mobile; `TriangleAlert` + `sr-only` "abaixo de 10 % captado" quando `alerts` inclui `captacao`), Saldo (`right`, `priority 2`), Prazo (`priority 1`: data + dias em meta; `TriangleAlert text-warning` + `sr-only` "menos de 6 meses de prazo" quando `alerts` inclui `prazo`; `text-destructive` quando vencido). Some a coluna "Alertas" (badges cortadas) e a coluna "Site".
- Celular: nome + estágio / proponente / `Meter` + prazo.
- Vazio: `EmptyState Clapperboard` "Nenhum projeto na carteira." + "Novo projeto".

```
┌ Projetos › Orquestra Jovem de Caxias ──────── [Ver no site] [Editar] [Publicar] [Mover para ▾] [⋯] ┐
│ ASSOCIAÇÃO ORQUESTRA JOVEM · LIC-RS (PRÓ-CULTURA RS)                                                │
│ Orquestra Jovem de Caxias: Temporada 2027     ▣ Captando  ⚠ menos de 6 meses                        │
│ ┌ APROVADO ─┐ ┌ CAPTADO ──────────┐ ┌ SALDO ─────┐ ┌ PRAZO ───────┐ ┌ COMISSÃO ─────┐              │
│ │ 320.000   │ │ 50.000  ▓▓░░ 16 % │ │ 270.000    │ │ 15/12 · 70 d │ │ 0 de 32.000   │              │
├─────────────────────────────────────────────────────┬───────────────────────────────────────────────┤
│ ┃ PRÓXIMO PASSO                                     │ Dados do projeto                              │
│ ┃ Emitir o recibo do aporte de Helena Zanotto       │ Processo  LIC 2026/0457 (code)                │
│ ┃ Depositado em 21/09. Depois, registrar a comissão.│ Cidade  Caxias do Sul/RS · Música             │
│ ┃ [Emitir recibo]                                   │ Responsável  (RT) Rafael                      │
│                                                     │ Endereço no site  /projetos/orquestra-… (code)│
│ Aportes (1)                         [+ Novo aporte] │ Mostrar todos (5 sem valor) ›                 │
│ ┌ Helena Zanotto · Móveis Colonial ──────────────┐  │ Comissão                                      │
│ │ ✓ Depositado  R$ 50.000 em 21/09  [Emitir recibo] ⋯│ ▓░░░░░░░ R$ 0 de R$ 32.000 (0 %) · 10 %       │
│ └────────────────────────────────────────────────┘  │ Publicação                                    │
│ Linha do tempo (9)                                  │ Não publicado · só em Captando               │
│ ◌ 7 mudanças automáticas · mostrar                  │                                               │
└─────────────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

- `PageHeader`: eyebrow (proponente · mecanismo), título serif, `meta` com `StatusBadge stage` + alertas (`Badge warning` com texto); ações: "Ver no site" (`outline`, só publicado), "Editar" (abre `Sheet right` com `EditProjectForm`), "Publicar no site" (`outline`, `disabled` com `Tooltip` "Só com o projeto em Captando" e `aria-describedby`; some a frase ao lado) ou "Despublicar" (`ConfirmDialog`), "Mover para" (primário), "⋯" com "Arquivar" (`ConfirmDialog tone="danger"`, motivo em select, detalhe só em "Outro").
- Cinco `StatCard` (`md:grid-cols-5`): aprovado, captado (com `Meter`), saldo, prazo (`tone="warning"` quando < 6 meses), comissão (registrada de rubrica).
- Principal: `NextStepCard` (`nextStepForProject`) → Aportes (`ContributionTable layout="cards"`: patrocinador · empresa, `StatusBadge contribution`, valores, **um** botão do passo atual, "⋯" com Registrar comissão e Cancelar aporte) → `Timeline` (rótulos de estágio humanizados: "Elaboração → Inscrito").
- Lateral: Dados do projeto (`KeyValueList hideEmpty columns=1`: processo `code`, cidade · segmento, responsável, data limite do relatório, deck e SALIC como links `ExternalLink`, endereço no site `code`, no estágio desde, resumo público, contrapartidas), Comissão (`Meter` registrado ÷ rubrica, percentual contratado; estouro em `Callout danger role="alert"` com o texto atual da IN MinC 29/2026), Publicação (estado, autorizado por, data).
- Celular: `ActionBarMobile` "Novo aporte" + "Mover para", "⋯" Editar, Publicar/Despublicar, Ver no site, Arquivar.

### 7.8 Novo projeto (`projetos/novo/page.tsx`, `project-form.tsx`, `project-dialogs.tsx`)

- `FormSection`s: "Identificação" (proponente, nome, slug com prévia `prospekto.com.br/projetos/{slug}` em `.crm-code` atualizada no `input` por um Client de 10 linhas, mecanismo), "Aprovação" (`collapsible`, `badge="exigido em Autorizado"`, `defaultOpen` no desktop: processo, valor aprovado, prazo, rubrica, comissão %), "Captação e texto público" (`collapsible`: resumo, contrapartidas, segmento, cidade/UF), "Links e responsável" (`collapsible`: deck, SALIC, data limite do relatório, responsável). Todas abertas no desktop e fechadas no celular, exceto a primeira.
- `MoneyField` com prefixo "R$" fixo (`relative` + `pl-9`, `inputMode="decimal"`); percentual com sufixo "%".
- Sem proponente: `EmptyState Theater` no lugar do formulário: "Ainda não há organização do tipo proponente." + botão "Cadastrar proponente" que abre `NewOrganizationDialog` com `defaultType="proponente"` (prop nova, só pré-seleciona o select), em vez de deixar preencher tudo para falhar no fim.
- `FormActions` sticky com "Cancelar" (`/app/projetos`) e "Criar projeto".

### 7.9 Aportes (`aportes/page.tsx`) e Aporte (`aportes/[id]/page.tsx`)

```
┌ Aportes ───────────────────────────────────────────────────────── [+ Novo aporte] ┐
│ ┌ EM ABERTO ───┐ ┌ PREVISTO 15 DIAS ┐ ┌ DEPOSITADO ──┐ ┌ COMISSÃO A RECEBER ┐      │
│ │ R$ 350.000   │ │ R$ 350.000 · 3   │ │ R$ 50.000    │ │ R$ 0               │      │
│ Todos 4 │ Proposta 2 │ Termo assinado 1 │ Depositado 1 │ Recibo emitido 0 │ Cancelado 0 │
│ [🔍 Patrocinador ou projeto] [Projeto: todos ▾]   Previstos em 15 dias ✕             │
│ ┌────────────────────────────────┬────────────────┬──────────┬──────────┬──────────┬─────────────────────┐
│ │ PATROCINADOR / PROJETO         │ STATUS         │ PROPOSTO │ DEPOSITADO│ PREVISÃO │ PRÓXIMO PASSO       │
│ │ Cláudio Bertolini · Metalúrgica│ ▣ Termo assinado│ 200.000 │ —        │ ◐ 12/10  │ [Confirmar depósito]⋯│
│ │ → Festival de Inverno 2027     │                │          │          │          │                     │
│ └────────────────────────────────┴────────────────┴──────────┴──────────┴──────────┴─────────────────────┘
│ › Totais por projeto                                                                 │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- Uma tabela só. `StatCard`s: em aberto (soma `proposedAmount` de `proposta` + `termo_assinado`), previstos em 15 dias (`href="/app/aportes?janela=15d"`), depositado (soma de `depositedAmount`), comissão a receber (`commissionDue` sem `commissionPaidAt`), tudo a partir de `contributionTotalsByProject` e das linhas carregadas.
- Abas de status com contagem (links `?status=`), `Toolbar` com busca (`q`, filtra em memória por `leadName`/`projectName`/`orgName`) e projeto (`projeto=<id>`, filtra em memória por `projectId`), chip "Previstos em 15 dias" (`janela=15d`). "Totais por projeto" vira `<details>` abaixo da tabela, com a tabela atual dentro.
- Colunas na seção 5.2 (`ContributionTable layout="table"`); linha de 44 px, não 130. Celular: patrocinador + status / projeto / proposto + previsão / botão do passo `size="touch"`.
- Vazio: `EmptyState HandCoins` "Nenhum aporte proposto. Quando um patrocinador aceitar a proposta, registre aqui." + "Novo aporte".

```
┌ Aportes › R$ 200.000,00 · Cláudio Bertolini ─────────────────────── [Ver lead] [Ver projeto] [⋯] ┐
│ APORTE EM FESTIVAL DE INVERNO DA SERRA 2027 · PATROCÍNIO · ROUANET, ART. 18                       │
│ R$ 200.000,00 · Cláudio Bertolini → Festival de Inverno da Serra 2027   ▣ Termo assinado          │
│ ┌ ✓ Proposta ─┬ ✓ Termo assinado ─┬ ② Depositado ──┬ ③ Recibo emitido ─┬ ④ Enviado ao contador ┐  │
│ │ 06/10        │ 06/10            │ previsto 12/10 │                  │                       │  │
│ └──────────────┴──────────────────┴────────────────┴──────────────────┴───────────────────────┘  │
│ ┃ PRÓXIMO PASSO  Confirmar o depósito previsto para 12/10 (em 6 dias)     [Confirmar depósito]    │
├──────────────────────────────────────────────────┬────────────────────────────────────────────────┤
│ Histórico (4)                                    │ Dados                                          │
│ ◉ Termo assinado  06/10 · Rafael                 │ Empresa  Metalúrgica Serrana S.A. ›            │
│ ◉ Proposta de aporte criada                      │ Previsão  12/10/2026                           │
│                                                  │ Dados bancários enviados  06/10/2026           │
│                                                  │ Mostrar todos (6 sem valor) ›                  │
│                                                  │ Comissão  — · [Registrar comissão] (após depósito) │
│                                                  │ Contrapartidas  não entregues                  │
└──────────────────────────────────────────────────┴────────────────────────────────────────────────┘
```

- Título com o valor primeiro; `StepFlow` com cinco passos (datas de `createdAt`, `termSignedAt`, `depositedAt`, `receiptIssuedAt`, `receiptSentToAccountantAt`; `cancelled` em todos quando `cancelado`, com `Callout danger` do motivo); `NextStepCard` com o diálogo do passo atual (`ContributionSteps variant="flow"`); `KeyValueList hideEmpty` com comissão (valor, paga em, botão "Registrar comissão" só quando permitido), contrapartidas, notas, motivo do cancelamento; "Cancelar aporte" no "⋯" (`ConfirmDialog`). Histórico via `Timeline` (sem badge cru `a.type`).

### 7.10 Exportar (`exportar/page.tsx`)

- `PageHeader` + `Callout warning` LGPD com `ShieldAlert` no topo (texto atual) + um `Card` com lista: cada linha = `FileSpreadsheet` 20 px, nome de `EXPORT_TABLE_LABELS`, descrição de uma linha (mapa local `EXPORT_TABLE_DESCRIPTIONS`, ex.: "Leads de todos os pipelines, com estágio, dono e próxima ação"), botão "Baixar CSV" `outline sm` com `Download` (`download` no `<a>`, como hoje). Sem contagem de linhas (consulta extra sem valor na Fase 1).
- Rodapé: `EmptyState size="sm" Upload` "Importação de planilha chega na próxima etapa." (duas linhas, sem o parágrafo longo).

### 7.11 Minha conta (`conta/page.tsx`, `conta/forms.tsx`)

- `PageHeader` + card "Dados de acesso" com `Avatar size="md"`, `KeyValueList` (nome, e-mail, papel) e a frase "Para mudar o nome ou o e-mail, fale com quem administra a conta."
- `FormSection` "Trocar senha": três campos com botão mostrar/ocultar, `help` de 12 caracteres, `Callout info` com o aviso de desconexão dos outros aparelhos, `FormActions` com "Trocar senha"; sucesso em `FormMessage` `success-soft` substituindo os campos (já é).
- `FormSection id="atalhos"` "Atalhos de teclado": tabela `kbd` com `Ctrl K` / `Cmd K` "Abrir a busca em qualquer tela" (dispara também dentro de campos), `/` "Focar o campo de busca" (não dispara dentro de campos), `Esc` "Fechar diálogo ou menu", `Tab`/`Enter` "Navegar e abrir". Sem "Aparência".

### 7.12 Diálogos

**Mover para** (`forms/stage-move-dialog.tsx`, modo `move`):

```
┌ Mover Rodrigo para outro estágio ─────────────────────── ✕ Fechar ┐
│ Hoje em ▣ Qualificado (há 3 dias)                                 │
│ Destino                                                           │
│ [Diagnóstico · próximo ▾]   (opções: "Novo · voltar", "Proposta · retorno") │
│ ┌ Para entrar em Diagnóstico o pipeline exige ──────────────────┐ │
│ │ ✓ Responsável definido                                        │ │
│ │ ○ Data da próxima ação                                        │ │
│ └───────────────────────────────────────────────────────────────┘ │
│ Próxima ação  [13/10/2026 09:00]  seg., 13 de out., 09:00         │
│ Sugerido: hoje + 5 dias úteis. Pode alterar.                      │
│ ─────────────────────────────────────────────────────────────────  │
│                              [Cancelar]  [Mover para Diagnóstico] │
└───────────────────────────────────────────────────────────────────┘
```

- Destino continua `<select>` (um controle; descrição do tipo no texto da opção: "· próximo", "· voltar", "· retorno", "· reativar") com `help` da descrição.
- `requirements` viram checklist `CircleCheck`/`Circle` (o `done` segue as mesmas regras do `NextStepCard`); `blockedBy` vira `Callout warning` com link direto para o projeto do aporte aberto quando a página passar `openContributionProjectId` (prop nova, opcional; a página do lead já carrega `contributions`), senão para `/app/projetos`. `orgBlock` vira item do checklist com link para a organização do lead ou para `/app/organizacoes`.
- `SubmitButton` fica realmente `disabled` quando `blocked.length > 0` (hoje `pointer-events-none opacity-50`, que não comunica a leitores de tela) com `aria-describedby` apontando para o `Callout`.
- Art. 27: `fieldset` atual mantido, com os três campos.
- `DialogFooter` com fundo `surface-2`; no celular o diálogo é folha inferior com rodapé fixo.
- Prop nova `defaultTarget?: string` para o `NextStepCard` abrir já no destino sugerido; prop `trigger?: ReactNode` para renderizar o gatilho na `ActionBarMobile`.

**Marcar perdido** (mesmo arquivo, modo `lost`, renderizado com `ConfirmDialog`): título "Marcar Rodrigo como perdido"; descrição "Nada é apagado: o lead pode ser reativado depois."; motivo em `<select>` (`LOST_REASONS` com `LOST_REASON_LABELS`); "Detalhe" só quando o motivo é `outro` (`required`); quando `currentIsInitial`, o campo "Data de referência" permanece; botão `destructive` "Marcar perdido" `disabled` até escolher o motivo.

**Diálogos de aporte** (`contribution-dialogs.tsx`): mantêm `ActionDialog`; `description` ganha o efeito do passo ("Confirma o depósito, recalcula o captado do projeto e libera o recibo."); `Blockers` vira checklist (`Circle` em `text-warning`) com o mesmo texto; "Confirmar depósito" mostra `Callout warning` "O valor difere do proposto em mais de 5 %" quando `|depositedAmount − proposedAmount| / proposedAmount > 0,05` (só apresentação, no `onChange`, sem bloquear); "Registrar comissão" mostra os limites em `KeyValueList columns=2` acima do campo; "Cancelar aporte" vira `ConfirmDialog tone="danger"` com motivo em select, nota obrigatória quando `wasDeposited` (`Callout warning role="alert"`).

**Diálogos de projeto** (`project-dialogs.tsx`): "Mover para" idem ao do lead (select de destino, `missing` como checklist e os campos editáveis abaixo, como hoje); "Arquivar" vira `ConfirmDialog tone="danger"` (motivo em select, detalhe só em "Outro"); "Publicar" ganha `Callout info` com a regra R-11; "Despublicar" vira `ConfirmDialog`.

**Editar lead** (`lead-edit-dialog.tsx`): `DialogContent sm:max-w-2xl` com `FormSection`s "Dados" e os grupos de `AttributeFields` com `art27="open"`; rodapé sticky.

**Mover para a partir do quadro** (`leads/lead-board-dialogs.tsx`, ADR-004, 6.3; plano, P5): o mesmo `StageMoveDialog` e o mesmo `MarkLostDialog`, controlados (`trigger={null}`, `open`, `onOpenChange`, `defaultTarget` = coluna da soltura ou destino do menu, `origin="board"` como campo oculto que vai para `data.origin` da atividade "Estágio alterado", métrica da seção 12 do ADR), sempre montados com `key={`${lead.id}:${target}`}`. Erro de campos obrigatórios vira a lista "Antes de mover, preencha:"; cancelar deixa o cartão onde estava.

**Nova tarefa / Editar tarefa** (`tasks/task-dialog.tsx`, ADR-004, 6.5): `Dialog` + `ActionForm footer="dialog"` em `sm:max-w-lg`; abre por "Nova tarefa", pelo assunto do cartão, por `?novo=1` e por `?task=<id>`. Campos: Título*, Descrição (3 linhas), Responsável (`SelectField` com placeholder "Ninguém" = `""`, que a action converte em `null`; `undefined` = usuário da sessão), Prioridade e Status em `<select>` sem opção vazia, Prazo (`DateTimeField` com `DateHint`, ajuda "Opcional."; trocar o status pelo diálogo põe a tarefa no fim da coluna nova), "Vínculo (opcional)" com `SegmentedControl` Nenhum / Lead (`LeadPicker`) / Organização / Projeto. Rodapé: "Excluir" (`ghost text-destructive`, `sm:mr-auto`; no celular `flex-col-reverse` põe Salvar em cima e Excluir embaixo) · "Cancelar" · "Salvar tarefa". Excluir passa por `ConfirmDialog` (seção 8).

**Nova lista de prospecção** (`prospecting/list-dialogs.tsx`): `ActionDialog` com Nome*, Região, "De onde vieram os dados"* (LGPD, art. 18; ajuda com exemplos: busca pública, associação, indicação), Quem liga (`SelectField` dos usuários), Instruções para quem liga; abre também por `/app/prospeccao?nova=1` (item do "Novo ▾"). Sucesso faz `redirect` para a lista vazia (o `EmptyState` com "Colar lista" e "Adicionar" é o feedback). "Editar lista" é uma `Sheet`; "Excluir lista" é `ConfirmDialog`.

**Colar lista** (`prospecting/paste-dialog.tsx`): `Dialog` com um `<textarea>` de 10 linhas e a ajuda "Uma empresa por linha: Nome | Telefone | Abertura (separadores |, ; ou tabulação). Uma linha que começa com # define o grupo das seguintes."; a prévia é um cálculo puro no cliente (`parseProspectingPaste`, sem consultar o banco), em `role="status"`: "37 empresas reconhecidas · 2 telefones não reconhecidos · N além do limite de 500 por colagem (ignoradas)"; botão primário "Adicionar 37", desabilitado (e descrito pela prévia) quando nada foi reconhecido. Depois de gravar, o toast avisa dos telefones já descartados em outra lista.

**Adicionar empresa** (`prospecting/add-item-dialog.tsx`): Nome*, Grupo, Telefone, Abertura, Localização, Porte, Informações; uma por vez.

**WhatsApp** (`prospecting/whatsapp-dialog.tsx`): título "WhatsApp · Vinícola Exemplo"; "Mensagem (revise antes de enviar)" num `<textarea>` com uma das três variações de `prospecting-messages.ts` (escolhida por hash estável do id do item; "outra versão" avança; toda primeira mensagem termina com "Responda SAIR se não quiser mensagens por aqui."); dica "Mensagem hoje; sem resposta, ligue em 2 dias úteis: a ligação deixa de ser fria."; primário "Abrir no WhatsApp" é um `<a href="https://wa.me/…" target="_blank" rel="noopener noreferrer">` real com o texto editado (nunca `window.open`) que, no mesmo clique, grava `whatsapp_sent_at` e uma `activities.whatsapp`; aviso quando o telefone é fixo: "O telefone desta empresa não serve para WhatsApp: confira o número na ficha."

**Reunião marcada** (`prospecting/convert-dialog.tsx`, ADR-004, 6.6): título "Reunião marcada · Vinícola Exemplo"; texto "A empresa vira organização, a pessoa vira lead em Patrocinadores (Qualificado) e a reunião fica no histórico."; campos: Nome de quem vai à reunião*, E-mail* (ajuda "Peça o e-mail na ligação: o convite da reunião e o CRM precisam dele."), Telefone de quem vai à reunião (opcional; ajuda "O telefone da empresa já fica na organização."), Cargo, Data e hora da reunião* (`DateHint`), Tipo (simulação 20 min / diagnóstico 30 min), Regime tributário (se soube), Interesse; botão "Confirmar reunião". Toast "Reunião marcada. Lead criado em Qualificado." com link "abrir lead"; organização de mesmo nome já cadastrada: "Reunião marcada. Lead criado em Qualificado e vinculado à organização já cadastrada com este nome; confira a ficha."; e-mail já existente: aviso dentro do diálogo "Já existe um lead com este e-mail; a reunião foi registrada nele." (sucesso); lead que estava perdido: "Lead reativado em Qualificado."; falha ao avançar: "Reunião registrada; não foi possível avançar o estágio: abra o lead e use Mover para."

**Descartar** e **Voltar para a ligar** (`prospecting/result-buttons.tsx`): seção 8.

### 7.13 Prospecção (`prospeccao/page.tsx`, `prospeccao/[listId]/page.tsx`, `prospeccao/[listId]/[itemId]/page.tsx`, `src/components/crm/prospecting/`)

Módulo novo (ADR-004, 6.6; D-D): listas de empresas para ligar, cadência por telefone e WhatsApp, e a conversão "Reunião marcada" que cria organização, contato e lead. Três rotas, índice → lista → empresa.

- **Índice** (`/app/prospeccao`): `PageHeader` "Prospecção" com primário "Nova lista"; `ListTable` (`DataTable`): Lista (nome como `row-link`, região em meta), Progresso (`Meter` "contatadas de total" + "N reuniões"), Quem liga (`Avatar` + nome ou "sem responsável"), Criada em (`priority 3`); celular: nome + região / progresso / avatar. Vazio: `EmptyState PhoneOutgoing` "Nenhuma lista de prospecção ainda. Cole uma lista de empresas e comece a ligar." + "Nova lista".
- **Lista** (`/app/prospeccao/[listId]`): `PageHeader` com eyebrow "Prospecção" (link), título = nome da lista, descrição = região, meta "quem liga: Daniela" (`Avatar`) e "criada em dd/mm/aaaa", primário "Adicionar", secundário "Colar lista", "⋯" (Editar lista, Excluir lista), todos visíveis também no celular (`actionsOnMobile`); `Meter` em largura total com "12 de 48 contatadas · 3 reuniões"; `Callout info` "Instruções para quem liga" quando a lista tem notas; `ItemFilters` (chips por status com as contagens reais, "Todas" primeiro, e busca por nome); `Callout warning role="status"` "Mostrando as 1000 primeiras empresas…" quando a leitura bate no teto (`LIST_ITEMS_LIMIT`); `ItemCards` agrupados pelo grupo da lista (`# Vinícolas`), cada **cartão** (`article`): nome como `row-link` para a ficha + `StatusBadge kind="prospecting"`, abertura em `text-sm`, meta "última tentativa há 2 d" / "retornar sex., 17 de out." / "WhatsApp aberto há 2 d" / anotação, `ItemActionBar` com "Ligar (54) 3000-0000" (`outline`, `tel:`; na ficha é a ação primária sólida: D5, para não haver 50 botões sólidos numa tela) e "WhatsApp" (`outline`), e os `ResultButtons` (Sem resposta, Retornar com data, Reunião marcada só enquanto a empresa não tem lead (depois, "Ver lead ›"), Descartar com motivo; "Voltar para a ligar" nos já ligados; "Anotação" grava `notes` e uma `activities.nota`), grupo `aria-busy` enquanto grava. Sem telefone: "sem telefone" no lugar de "Ligar" e do WhatsApp; os resultados continuam. Vazio sem filtro: "A lista está vazia. Use Colar lista para adicionar várias empresas de uma vez (nome, telefone e abertura), ou Adicionar para incluir uma por uma." com os dois botões; com filtro: "Nenhuma empresa com esse status." / "…com esse nome." + "Ver todas".
- **Ficha da empresa** (`/app/prospeccao/[listId]/[itemId]`): cabeçalho com nome, `StatusBadge`, grupo, meta de tentativas, primário "Ligar", secundário "WhatsApp", "⋯" (`ItemMoreMenu`: resultados, editar, remover); blocos "Abertura" e "Sobre a empresa" (localização, porte, informações) com `AutosaveField` (status "Salvo" / "Salvando…" / "Não foi possível salvar" ao lado do título do bloco); "Resultado da ligação" com os mesmos botões; "Histórico" com a `Timeline` de `listActivities({ prospectingItemId })` (ligações, WhatsApp, notas, e, depois da conversão, link para o lead e a organização criados). O caminho do header mostra "Prospecção › Lista › Empresa" e o "voltar" do celular leva à lista.
- **Regras visíveis**: `Descartar` pede o motivo (Sem interesse / Pediu para não contatar / Número errado / Outro) e a empresa continua na lista como descartada; "Voltar para a ligar" de quem pediu para não ser contatado passa por `ConfirmDialog`; ao colar o mesmo telefone já descartado em outra lista, o item nasce com a anotação "Descartada em {lista} ({motivo})" e o toast avisa; "Reunião marcada" só pelo diálogo (a action de resultado recusa `reuniao_marcada`). Nada de telefone na paleta nem no log.
- **Celular**: cartões empilhados com "Ligar" e "WhatsApp" em `size="touch"`; a ficha ganha `ActionBarMobile` "Ligar" + "WhatsApp" e "⋯" com os resultados.

### 7.14 Tarefas (`tarefas/page.tsx`, `src/components/crm/tasks/`)

Módulo novo (ADR-004, 6.5; D-E): quadro de três colunas sobre `activities.type = 'tarefa'`, com o estado derivado de `started_at` e `done_at` (`taskStatusOf`), prioridade com texto e posição fracionária.

- `PageHeader` "Tarefas" com a descrição "N abertas · M atrasadas" e primário "Nova tarefa" (FAB no celular); `TaskFilters` ("Só as minhas", "Só atrasadas", "Vencem hoje", "Limpar"); `TaskBoard` (seção 5.2) com A fazer, Em andamento e Concluída (as 20 mais recentes); no celular as colunas empilham e o caminho para mover é o menu "⋯" do cartão ou o campo "Status" do diálogo.
- Deep links na URL (D17 e D19): `?task=<id>` abre "Editar tarefa"; `?novo=1` abre "Nova tarefa"; `?dono=eu`, `?atrasadas=1` (`due_at < now`) e `?vencem=hoje` (`due_at <= fim de hoje`, o recorte do medidor "Tarefas hoje" do Painel) filtram.
- Mover: A fazer limpa `started_at` e `done_at`; Em andamento grava `started_at`; Concluída grava `done_at`; Concluída → A fazer reabre (toast "Tarefa reaberta."). "Concluir" do cartão reaproveita o `TaskCompleteButton` e a `completeTaskAction` do lead.
- Excluir: só `tarefa`, pelo diálogo, com `ConfirmDialog` (seção 8); quando a tarefa tem vínculo, o repositório grava uma `activities.sistema` "Tarefa excluída: {assunto}" no mesmo registro.
- E-mail diário: seção "Tarefas atribuídas a você" (até 10 abertas do destinatário: vencidas, que vencem em 7 dias ou sem prazo; "sem prazo" quando `due_at` é nulo; "(nova)" nas criadas nas últimas 24 h); o link da tarefa sem lead nem projeto leva a `/app/tarefas?task=<id>`.
- Vazio: `EmptyState SquareCheck` "Nenhuma tarefa aberta." + "Crie a primeira ou registre uma tarefa num lead." + "Nova tarefa"; com filtro, `EmptyState SearchX size="sm"` "Nenhuma tarefa sua atrasada." / "Nenhuma tarefa atrasada." / "Nenhuma tarefa vence hoje." / "Nenhuma tarefa sua aberta." + "Limpar filtros"; coluna vazia: "Nenhuma tarefa em a fazer." em `.crm-meta`.

## 8. Estados

| Estado | Padrão | Microcopy |
| --- | --- | --- |
| Vazio em lista com filtro | `EmptyState SearchX size="sm"` | "Nenhum lead com esses filtros." + "Limpar filtros" |
| Vazio em lista sem filtro | `EmptyState` com ícone do módulo | "Ainda não há leads de contadores." + "Cadastrar lead" · "Nenhuma organização ainda." · "Nenhum projeto na carteira." · "Nenhum aporte proposto." |
| Vazio em busca global | `EmptyState SearchX` | "Nada encontrado para "vinícola". Tente parte do nome ou o CNPJ." |
| Vazio em Hoje | StatCards zerados + um `EmptyState Sun` | "Nada vencido. Bom dia." + "Veja os próximos 7 dias ›" |
| Vazio em bloco de detalhe | linha única `text-sm text-muted-foreground` com ação | "Nenhum aporte proposto ainda." · "Nenhum contato ainda. Cadastre quem decide e quem assina." · "Nenhuma atividade registrada." |
| Carregando página | `loading.tsx` com `Skeleton` | `sr-only` "Carregando leads…" |
| Carregando ação | `SubmitButton` com `Loader2 animate-spin` + rótulo | "Registrando…", "Movendo…", "Salvando…", "Entrando…", "Criando…" |
| Sucesso em diálogo | fecha + `toast.success` 4 s | "Lead movido para Diagnóstico." · "Depósito confirmado." · "Contato registrado. Próxima ação: qui., 9 de out." (o `ActivityForm` monta a frase com `nextActionAt` do formulário) |
| Sucesso em página | `FormMessage` `success-soft` `role="status"` | "Senha trocada. Os outros aparelhos foram desconectados." |
| Erro de validação | `FormMessage` `error-soft` `role="alert"` + erro sob o campo + foco no primeiro `[aria-invalid]` | "Antes de mover, preencha:" + lista · "Informe um e-mail válido." |
| Erro de rede/servidor | `(app)/app/error.tsx` com `Callout danger` e botão "Tentar de novo" (`reset()`) | "Não foi possível carregar esta tela. Tente de novo em instantes." |
| Não encontrado | `(app)/app/not-found.tsx` | "Este registro não existe ou foi movido." + "Voltar para o Painel" |
| Ação bloqueada por regra | botão `disabled` + checklist + `Callout warning` | "Depende do aporte: registre o termo assinado em Projetos ›" |
| Dado vencido | `CircleAlert` + `text-destructive` | "Ação atrasada há 3 dias", "Sem contato há 6 dias (prazo: 1 dia útil)" |
| Dado quase vencido | `Clock` + `text-warning` | "Ação em 17 h", "70 dias de prazo" |
| Confirmação destrutiva | `ConfirmDialog` `role="alertdialog"`, botão `destructive` com o verbo | "Marcar perdido" · "Cancelar aporte" · "Arquivar projeto"; nunca "Sim/Não" |
| Sessão expirada | `requireSession` redireciona (já) para `/entrar?next=` | `Callout info` "Sua sessão expirou. Entre de novo para continuar em Pipeline." |
| Quadro de leads, coluna vazia (ADR-004, 6.12) | `.crm-meta` na coluna, sem botão | "Nenhum lead em Diagnóstico." |
| Quadro de leads, pipeline vazio | o mesmo `EmptyState` da lista | "Nenhum lead de patrocinadores ainda." + "Cadastrar lead" |
| Quadro de leads, coluna com mais de 50 | rodapé da coluna | "ver todos os 73 em Lista ›" |
| Quadro de leads, arrasto | `role="status"` em `sr-only` + colunas bloqueadas esmaecidas | "Arrastando Rodrigo. Solte em: Diagnóstico, Perdido." · na coluna bloqueada: "Avance um estágio por vez" / "Reative pelo Mover para" |
| Quadro de leads, soltura bloqueada | `toast` informativo | "Não dá para mover direto para Termo: avance um estágio por vez." |
| Quadro de leads, sucesso | `toast.success` (o do diálogo) + `router.refresh()` | "Lead movido para Diagnóstico." |
| Alternância Lista/Quadro | links com `aria-current="true"` no ativo (nunca `aria-pressed`) | "Lista" / "Quadro"; a primeira visita grava a visão do aparelho sem troca de tela |
| Tarefas, quadro vazio | `EmptyState SquareCheck` | "Nenhuma tarefa aberta." + "Crie a primeira ou registre uma tarefa num lead." + "Nova tarefa" |
| Tarefas, filtro sem resultado | `EmptyState SearchX size="sm"` | "Nenhuma tarefa sua atrasada." / "Nenhuma tarefa atrasada." / "Nenhuma tarefa vence hoje." + "Limpar filtros" |
| Tarefas, mover | `toast` + `role="status"` do quadro | "Tarefa em andamento." / "Tarefa concluída." / "Tarefa reaberta." / "Tarefa de volta para A fazer." / "Ordem atualizada." |
| Tarefas, salvar | `toast.success` | "Tarefa criada. Vence sex., 17 de out." / "Tarefa criada." / "Tarefa salva." |
| Tarefas, excluir | `ConfirmDialog`, botão `destructive` | "Excluir tarefa "Enviar proposta"?" · "Ela some da linha do tempo do lead; isso não pode ser desfeito." (ajusta "da organização" / "do projeto" / "do aporte"; sem vínculo: "Isso não pode ser desfeito.") · botão "Excluir tarefa" |
| Tarefas, filtros | chips-link com `aria-current="true"` no ativo | "Só as minhas" / "Só atrasadas" / "Vencem hoje" |
| Prospecção, índice vazio | `EmptyState PhoneOutgoing` | "Nenhuma lista de prospecção ainda. Cole uma lista de empresas e comece a ligar." + "Nova lista" |
| Prospecção, lista vazia | `EmptyState PhoneOutgoing` com dois botões | "A lista está vazia. Use Colar lista para adicionar várias empresas de uma vez (nome, telefone e abertura), ou Adicionar para incluir uma por uma." |
| Prospecção, lista no teto de leitura | `Callout warning role="status"` | "Mostrando as 1000 primeiras empresas de 1.240. Use a busca ou os chips de status para encontrar as demais." |
| Prospecção, colar | prévia em `role="status"` + botão | "37 empresas reconhecidas · 2 telefones não reconhecidos" · "Adicionar 37" |
| Prospecção, colar com descartados | `toast` | "37 empresas adicionadas; 2 já foram descartadas em outra lista (veja a anotação)." |
| Prospecção, descartar | `ConfirmDialog` com o motivo em `<select>` | "Descartar "Vinícola Exemplo"? Ela continua na lista como descartada." · Sem interesse / Pediu para não contatar / Número errado / Outro · botão "Descartar" |
| Prospecção, voltar para a ligar (quem pediu para não ser contatado) | `ConfirmDialog` | "Esta empresa pediu para não ser contatada." |
| Prospecção, remover empresa | `ConfirmDialog` | "Remover "Vinícola Exemplo" desta lista? O histórico da ligação some com ela; lead e organização já criados continuam no CRM." |
| Prospecção, excluir lista | `ConfirmDialog` | "Excluir a lista "Vinícolas" e suas 48 empresas? Leads e organizações já criados continuam no CRM." · botão "Excluir lista" |
| Prospecção, resultado | `toast` | "Registrado: sem resposta." / "Retorno marcado para sex., 17 de out." / "Empresa descartada." / "De volta para a ligar." |
| Prospecção, WhatsApp | modal e, depois, cartão e ficha | "WhatsApp · Vinícola Exemplo"; "Mensagem (revise antes de enviar)"; "outra versão"; "Abrir no WhatsApp"; telefone fixo: "O telefone desta empresa não serve para WhatsApp: confira o número na ficha."; depois: "WhatsApp aberto há 2 d" (nunca "enviado": o CRM só sabe que abriu com o texto) |
| Prospecção, reunião marcada | diálogo + `toast` com link | "Reunião marcada. Lead criado em Qualificado." · "abrir lead"; e-mail já existente: "Já existe um lead com este e-mail; a reunião foi registrada nele."; lead perdido: "Lead reativado em Qualificado."; falha ao avançar: "Reunião registrada; não foi possível avançar o estágio: abra o lead e use Mover para." |
| Prospecção, autosave na ficha | `role="status"` ao lado do título do bloco | "Salvo" / "Salvando…" / "Não foi possível salvar" |
| Organização, notas | `role="status"` acima da textarea | "Salvo às 14:32" / "Salvando…" / "Não foi possível salvar; tente de novo" |
| Organização, histórico vazio | linha única `text-sm text-muted-foreground` | "Nenhuma atividade registrada." |
| Painel, blocos novos vazios | linha única + ação | "Nenhuma atividade registrada ainda. Ligações, reuniões e notas aparecem aqui." · "Nenhuma tarefa atribuída a você." + "Nova tarefa" |
| Paleta, vazia | lista "Ir para" e "Novo…" + dica | "Digite para buscar leads, organizações, projetos, aportes, tarefas e empresas de prospecção." |
| Paleta, buscando | `role="status"` `sr-only` | "Buscando…" (só quando ainda não há resultado anterior; uma consulta nova mantém a lista anterior até a resposta chegar) · depois "N resultados" |
| Paleta, nada | texto 14 px | "Nada encontrado para "vinícola". Tente parte do nome ou o CNPJ." |
| Paleta, erro | `text-destructive`, sem fechar | "Não foi possível buscar. Tente de novo." |

Convenções de texto: verbo no infinitivo nos botões ("Registrar", "Mover para Diagnóstico"); frases completas nas ajudas; datas por extenso quando há espaço ("sex., 9 de out.") e numéricas em tabelas; moeda sempre `formatBRL`; números com `tabular`; nada de jargão de código ("R-3", "source_page", `audiovisual_art1A`) na interface: ids de regra ficam em comentários; nunca "Submit", "Close", "Loading".

## 9. Checklist de acessibilidade (WCAG 2.2 AA) e de celular

Acessibilidade:

- [ ] Contraste ≥ 4,5 : 1 em todo texto e ≥ 3 : 1 em ícones informativos e bordas de campo, conforme a tabela 3.1; `tests/tokens-contrast.test.ts` verde.
- [ ] Nenhuma informação só por cor: todo badge tem texto; todo vencido tem ícone + texto; todo bloco urgente tem rótulo e ícone; `Meter` tem percentual em texto.
- [ ] Foco visível em tudo que é interativo (anel vinho; branco sobre fundos escuros); linhas de tabela com `focus-within`; ordem de tabulação: skip link → header → sidebar → conteúdo; `scroll-padding-bottom` para a barra fixa não cobrir o foco (2.4.11).
- [ ] Teclado: diálogos, sheets e menus prendem o foco e devolvem ao gatilho (base-ui); `Esc` fecha; `/` nunca intercepta campos de texto; `SegmentedControl` navega com setas.
- [ ] Rótulos: todo input com `<label>` ou `aria-label`; selects da `Toolbar` com rótulo `sr-only`; botões só com ícone com `aria-label` (+ `Tooltip`); tabelas com `caption sr-only`, `th scope="col"` e `aria-sort`; `StatCard` com `aria-label` completo.
- [ ] Mensagens: `role="alert"` para erros e bloqueios, `role="status"` para sucesso e carregando; toasts do sonner já são `aria-live`.
- [ ] Landmarks e títulos: `<header>`, `<nav aria-label="Principal">`, `<main id="conteudo">`, `<aside aria-label>`; um só `h1` por página; `h2` por seção (`CardTitle` renderiza `h2` via prop `as`).
- [ ] Alvos ≥ 44 × 44 px no celular (`size="touch"`, FAB 56 px, itens da barra 64 × 56 px) com ≥ 8 px entre alvos adjacentes (2.5.8).
- [ ] Zoom 200 % sem perda: larguras em `rem`, `max-h-[92dvh] overflow-y-auto` nos diálogos, nada com altura fixa que corte texto; `text-wrap: balance` nos títulos.
- [ ] `prefers-reduced-motion` respeitado (já); `prefers-color-scheme` não força o escuro.
- [ ] Idioma `pt-BR` (já); datas via `Intl` em `America/Sao_Paulo`; `DateHint` ao lado de todo `datetime-local`/`date`.
- [ ] Diálogos destrutivos com `role="alertdialog"`, título e descrição ligados, botão com o verbo.
- [ ] Arrastar e soltar sempre tem caminho equivalente por menu ou campo (menu "Mover para ▾" do cartão de lead; menu "⋯" e campo "Status" da tarefa), e o arrasto é anunciado em `role="status"` (ADR-004, 6.11). `draggable` nasce falso no HTML e só liga com `pointer: fine`.
- [ ] Ctrl+K nunca abre a paleta sobre outro diálogo, `alertdialog` ou menu; ao fechar, o foco volta ao elemento anterior (`finalFocus`); os gatilhos têm `aria-keyshortcuts`.
- [ ] Texto `sr-only` (absoluto) dentro de um contêiner com rolagem horizontal fica sob um ancestral `relative`; senão alarga o documento e cria rolagem horizontal da página (visto no quadro de leads).
- [ ] Chips e alternâncias que navegam são `<a>` com `aria-current="true"`, nunca `aria-pressed` (válido só em `role="button"`): `grep -rn "aria-pressed" src/components/crm` vazio.
- [ ] Testes: `tests/auth-guard.test.ts` continua verde (toda `page.tsx` nova, incluindo `/app/busca`, chama `requireSession`); `tests/lint.test.ts` (nenhum componente importa `db`); `tests/shell-nav.test.ts` novo.

Celular (390 px real):

- [ ] Barra inferior de 5 itens com rótulo e `env(safe-area-inset-bottom)`; `viewport-fit=cover`.
- [ ] `main` com `px-4 pb-28`; nenhuma rolagem horizontal de página (tabelas viram cards; só as abas de pipeline rolam dentro do próprio elemento).
- [ ] Filtros em `Sheet` com "Filtrar (N)"; chips ativos visíveis.
- [ ] `ActionBarMobile` nos detalhes e `FormActions` acima da barra (`bottom-20`) nos formulários longos; diálogos como folha inferior.
- [ ] Inputs a 16 px (`text-base md:text-sm`) para não dar zoom no iOS; `inputMode` correto (`tel`, `email`, `decimal`, `numeric` para CNPJ).
- [ ] Linhas em dois andares (nome / meta), nunca seis itens em `flex-wrap`; KPIs em 2 × 2.
- [ ] Nada abaixo de 11 px; corpo 14 px; h1 24 px.
- [ ] Capturas das 16 telas em 390 px e 1440 px em `scratchpad/shots/depois/` comparadas com `antes/` ao fim de cada frente (script de captura já existente).

## 10. Inventário de arquivos novos e alterados (referência rápida)

Novos: `src/app/(auth)/layout.tsx`; `src/app/(app)/app/busca/page.tsx`; `src/app/(app)/app/{error,not-found,loading}.tsx` e os `loading.tsx` por rota; `src/components/ui/{sheet,dropdown-menu,tooltip,skeleton,avatar,breadcrumb}.tsx`; `src/components/crm/shell/{sidebar,nav-items,bottom-bar,header,search-form,new-menu,user-menu,shortcuts,fab}.tsx`; `src/components/crm/ui/{page-header,stat-card,data-table,status-badge,sla-indicator,next-step-card,empty-state,toolbar,toolbar-autosubmit,detail-layout,key-value-list,timeline,form-section,form-actions,callout,step-flow,action-bar-mobile,confirm-dialog,meter,date-hint,segmented-control}.tsx`; `src/lib/crm/{describe-sla,next-step,status-tones,humanize-activity,initials}.ts`; `tests/tokens-contrast.test.ts`, `tests/shell-nav.test.ts`, `tests/lib/{describe-sla,next-step,status-tones,humanize-activity}.test.ts`.

Alterados: `src/app/globals.css`, `src/app/layout.tsx` (viewport), `src/app/(app)/layout.tsx`, `src/components/ui/{badge,button,card,dialog,table}.tsx`, todas as `page.tsx` de `(app)`, `src/components/crm/**` (exceto os de `simulator`), `(site)/entrar/**` e `(site)/redefinir-senha/**` movidos para `(auth)`.

Removidos (Fase 3): `src/components/crm/nav.tsx`, `src/components/crm/badges.tsx`, `src/components/crm/project-badges.tsx`.

Intocados: `src/actions/**`, `src/lib/repos/**`, `src/lib/domain/**`, `src/lib/crm/{stage-moves,filters,format,dates,labels,enum-labels,lead-view,activity-text,attributes}.ts`, `src/proxy.ts`, `src/lib/routes.ts`, `src/components/site/**`, `src/components/simulator/**`.

**Estrutura no padrão do Trilis (ADR-004, 13/10/2026).** Novos: `src/lib/db/schema/prospecting.ts`, `drizzle/0003_*.sql`; `src/lib/validation/{tasks,prospecting}.ts`; `src/lib/repos/{tasks,prospecting,dashboard}.ts`; `src/lib/crm/{task-status,task-due,leads-view,task-board,prospecting-paste,prospecting-messages,prospecting-view}.ts`; `src/actions/{tasks,prospecting,search}.ts`; `src/components/crm/ui/{autosave-field,stat-ruler}.tsx`; `src/components/crm/leads/{lead-board,lead-board-columns,lead-card,lead-board-dialogs,view-toggle}.tsx`; `src/components/crm/tasks/{task-board,task-board-columns,task-card,task-dialog,task-filters,task-record-picker}.tsx`; `src/components/crm/prospecting/{list-table,list-dialogs,item-cards,item-filters,result-buttons,whatsapp-dialog,convert-dialog,paste-dialog,add-item-dialog,item-detail}.tsx`; `src/components/crm/dashboard/{recent-activities,my-tasks}.tsx`; `src/components/crm/organizations/{org-notes-form,org-contacts-card,org-leads-card}.tsx`; `src/components/crm/shell/{sidebar-search,sidebar-user,palette-results,command-palette}.tsx`, `shell/use-sign-out.ts`; `src/app/(app)/app/tarefas/{page,loading}.tsx`, `prospeccao/{page,loading}.tsx`, `prospeccao/[listId]/{page,loading}.tsx`, `prospeccao/[listId]/[itemId]/{page,loading}.tsx`; testes `tests/{isolation,lead-board,task-board,prospecting-cards,dashboard-blocks,command-palette}.test.ts`, `tests/repos/{tasks,prospecting,leads-board,dashboard,organizations}.test.ts`, `tests/actions/{tasks,prospecting,search,organizations}.test.ts`, `tests/lib/{leads-view,task-board,prospecting-paste,prospecting-messages}.test.ts`.

Alterados: `src/lib/db/schema/{activities,organizations,index}.ts`, `src/lib/domain/enums.ts`, `src/lib/validation/{activities,leads,organizations}.ts`, `src/lib/repos/{activities,contributions,leads,organizations,digest,export}.ts`, `src/lib/crm/{labels,status-tones,filters,stage-moves,digest}.ts`, `src/components/crm/ui/{status-badge,stat-card,timeline}.tsx`, `src/components/crm/{today,lead-filters,organization-dialogs,organization-form}.tsx`, `src/components/crm/forms/{stage-move-dialog,activity-form}.tsx`, `src/components/crm/shell/{modules.ts,nav-items,sidebar,header,header-crumbs,bottom-bar,new-menu,toaster}.tsx`, `src/actions/{crm-leads,organizations}.ts`, `src/app/(app)/layout.tsx`, `src/app/(app)/app/{page,loading,not-found}.tsx`, `leads/{page,loading}.tsx`, `leads/[id]/page.tsx`, `organizacoes/[id]/page.tsx`, `conta/page.tsx`, `busca/page.tsx`, `exportar/page.tsx`, `src/app/api/cron/daily/route.ts`, `src/lib/email/templates/digest.ts`, `scripts/seed.ts`.

Removidos: `src/components/crm/shell/user-menu.tsx` (o menu do usuário vive em `sidebar-user.tsx`; `useSignOut` em `use-sign-out.ts`).
