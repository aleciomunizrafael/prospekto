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
| D11 | Atalhos de teclado | Só `/` foca a busca. Uma tabela estática de atalhos fica em "Minha conta". `n` (Novo) é fase opcional; `g h/l/o/p/a`, `j/k` e o diálogo `?` não entram. | Juiz 1: treinamento disfarçado para usuária não técnica; juiz 2: custo sem ganho medido. |
| D12 | Estado da sidebar | Cookie `crm-sidebar=rail` lido com `cookies()` no `(app)/layout.tsx`; sem `localStorage`. | Sem flash na hidratação. |
| D13 | Testes de interface | `tests/tokens-contrast.test.ts` (lê `globals.css`, calcula os pares da seção 3.1) e `tests/shell-nav.test.ts` (renderiza o componente puro `NavItems` com `renderToString` e checa `aria-current` e rótulos). Sem `@testing-library/react`, sem Playwright, sem axe. | "Nada de bibliotecas pesadas novas". |
| D14 | "Assumir" em Hoje | `claimLeadAction` não muda: já redireciona para `/app/leads/[id]`, onde o formulário "Registrar atividade" agora é o segundo bloco (depois do `NextStepCard`). O parâmetro `?registrar=1` é lido pelo detalhe do lead para focar o formulário e é usado pelos links "Registrar contato" de Hoje (leads que já têm dono) e pela `ActionBarMobile`. Acrescentar `?registrar=1` ao `redirect` da action é uma linha fora do escopo do redesign, anotada no plano como opcional. | Zero edição em `src/actions/`. |
| D15 | `StatCard` de Hoje com link | Só filtros que já existem: `/app/leads?sort=next_action`, `/app/projetos?alertas=1` (o parâmetro atual chama-se `alertas`), `/app/aportes?janela=15d` (parâmetro novo lido só em `aportes/page.tsx`, filtrando em memória por `expectedCloseAt`). | Nenhum repositório novo. |
| D16 | Marcar perdido, Cancelar aporte, Arquivar | Diálogo com `role="alertdialog"` (`ConfirmDialog`, sobre `@base-ui/react/alert-dialog`), motivo em `<select>`, campo "Detalhe" só quando o motivo é "Outro", botão de confirmação `disabled` até o motivo ser escolhido. | Enxertos do juiz 1 e rejeição do `RadioGroup` de 11 itens. |
| D17 | Filtros no celular | `Sheet side="bottom"` com gatilho "Filtrar (2)" mostrando a contagem de filtros ativos; no desktop, `Toolbar` em linha com aplicação no `change`. | Enxerto dos dois juízes. |
| D18 | Busca global | Página `/app/busca` (Server Component) com `Promise.all` sobre `searchLeads`, `listOrganizationSummaries({ search })` e `listProjectSummaries({ search })`, 8 resultados por grupo. Sem repositório novo. | Proposta #0, confirmada pelos juízes. |
| D19 | Fallback sem JavaScript da `Toolbar` | O botão "Filtrar" continua renderizado e some com a variante `scripting:hidden` (`@custom-variant scripting (@media (scripting: enabled))`). Navegadores antigos que não entendem a media query mostram o botão, o que é inofensivo. Sem script inline nem `data-js`. | Mais simples e sem risco de aviso de hidratação. |
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

/* Variante para esconder o fallback sem JavaScript (botão "Filtrar" da Toolbar). */
@custom-variant scripting (@media (scripting: enabled));

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
│ Prospekto    │ Leads › Rodrigo Pasqualotto        [🔍 Buscar leads, empresas…  /]  │
│ CRM          │                                              [+ Novo ▾]  (RT) ▾      │  ← header 56px, sticky, branco
│              ├──────────────────────────────────────────────────────────────────────┤
│ ▌ Hoje    3  │                                                                      │
│   Leads      │   ┌ PageHeader ────────────────────────────────────────────────┐     │
│   Organiza…  │   │ eyebrow                                                     │     │
│   Projetos   │   │ H1 serif 28                  [Secundária] [Primária ●]      │     │
│   Aportes    │   └─────────────────────────────────────────────────────────────┘     │
│              │                                                                      │
│ ──────────   │   conteúdo sobre canvas areia (max-w 80rem, gutter 24px)             │
│   Exportar   │   cards brancos border-border                                        │
│              │                                                                      │
│              │                                                                      │
│ ‹ Recolher   │                                                                      │
└──────────────┴──────────────────────────────────────────────────────────────────────┘
  240px (15rem), areia         flex-1, overflow-y-auto, bg-canvas
  colapsa p/ 64px (trilho)
```

- **Wordmark** (lockup do site): "Prospekto" em Source Serif 4 600 20 px cor `--foreground` e, abaixo, "CRM" em Inter 11 px caixa alta `tracking-[0.08em]` cor `--brand`. Link para `/app`.
- **Sidebar** (`src/components/crm/shell/sidebar.tsx`, Client Component mínimo só para `usePathname` e o toggle; a lista de itens é o componente puro `nav-items.tsx`, testável com `renderToString`): fundo `bg-sidebar` (areia), `border-r border-sidebar-border`. Item: 40 px de altura, ícone lucide 18 px + rótulo 14 px/500, `rounded-lg mx-2`; ativo: fundo branco, barra de 3 px à esquerda em `--primary` (`before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-primary`), `aria-current="page"`; hover: `bg-white/60`. Ícones: `Sun` (Hoje), `Users` (Leads), `Building2` (Organizações), `Clapperboard` (Projetos), `HandCoins` (Aportes), `Download` (Exportar). O contador em "Hoje" é `overdueCount` (próximas ações vencidas + tarefas vencidas, consultas já usadas pela página Hoje com `limit: 20`, somadas no layout) e leva `<span class="sr-only">N itens vencidos</span>`; some quando zero.
- **Recolher**: cookie `crm-sidebar=rail` (path `/app`, 1 ano) lido com `cookies()` no `(app)/layout.tsx` e passado como `collapsed`; o toggle grava `document.cookie` e chama `router.refresh()`. No trilho (64 px), rótulos ficam `sr-only` e cada ícone ganha `Tooltip side="right"`.
- **Header** (56 px, `sticky top-0 z-30 bg-background border-b`): `Breadcrumb` à esquerda (módulo › registro; só o módulo nas listas); `SearchForm` ao centro-direita; botão "Novo" (`DropdownMenu`: Novo lead, Nova organização, Novo projeto, Novo aporte) e avatar de iniciais (`Avatar` 32 px `bg-primary text-primary-foreground`) com `DropdownMenu` (Minha conta, separador, Sair) à direita. "Sair" deixa de ser o botão mais visível do sistema.
- **Busca global**: `<form role="search" method="get" action="/app/busca">` com `Input` de 280 px (`name="q"`, `type="search"`, rótulo `sr-only` "Buscar"), ícone `Search` à esquerda e `<kbd>/</kbd>` à direita. `/app/busca` (D18) devolve três grupos ("Leads", "Organizações", "Projetos") com no máximo 8 resultados cada, link "ver todos em Leads" com `?q=` e `EmptyState` quando nada bate. A tecla `/` apenas foca o campo (`shell/shortcuts.tsx`, 12 linhas, ignora quando o foco está em input/textarea/select/contenteditable).
- **Skip link**: primeiro elemento do `(app)/layout.tsx`: `<a href="#conteudo" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 …">Ir para o conteúdo</a>`; `<main id="conteudo" tabIndex={-1}>`.
- **Landmarks**: `<header>`, `<nav aria-label="Principal">` (sidebar), `<nav aria-label="Principal">` (barra inferior; só uma das duas está no DOM visível por breakpoint, mas ambas existem: a inferior é `md:hidden`, a lateral `hidden md:flex`), `<main>`, `<aside aria-label="Dados do lead">` nos detalhes. Um `h1` por página.
- **Toaster**: `position="bottom-center"` com `offset` de 80 px no celular (acima da barra), `top-right` no desktop; implementar com `Toaster` recebendo a posição por um `useMediaQuery` de 6 linhas (`unstable-use-media-query` do base-ui não é usado; `window.matchMedia("(min-width: 60rem)")` basta).

### 4.2 Celular (< 960 px)

```
┌──────────────────────────────────────┐
│ ‹  Rodrigo Pasqualotto           🔍  │  ← header 52px: voltar (lista pai), título truncado, lupa (/app/busca)
├──────────────────────────────────────┤
│                                      │
│  conteúdo (gutter 16px, pb-28)       │
│                                      │
│                              ┌─────┐ │
│                              │  +  │ │  ← FAB 56px só nas listas (Novo lead / organização / projeto / aporte)
│                              └─────┘ │
├──────────────────────────────────────┤
│ [ Registrar ] [ Mover para ]   ⋯     │  ← ActionBarMobile 56px, só nos detalhes, fixed bottom-16
├──────────────────────────────────────┤
│  ☀       ⚇       ▣       $      ≡    │  ← barra inferior 64px + env(safe-area-inset-bottom)
│ Hoje   Leads  Projetos Aportes  Mais │
└──────────────────────────────────────┘
```

- **Barra inferior** (`shell/bottom-bar.tsx`): `nav aria-label="Principal"`, cinco alvos de 64 px de largura mínima e 56 px de altura, ícone 22 px + rótulo 11 px sempre visível; ativo em `--primary` com rótulo 600 e `aria-current="page"`; `padding-bottom: env(safe-area-inset-bottom)`. "Mais" abre `Sheet side="bottom"` com Organizações, Exportar, Minha conta, Atalhos (link para `/app/conta#atalhos`), Sair.
- **Header mobile** (`shell/header.tsx`, mesma peça do desktop com classes responsivas): botão voltar (`ChevronLeft`, 44 px, `aria-label="Voltar para Leads"`) nas páginas de detalhe e de criação apontando para a lista pai (href fixo, nunca `history.back()`); título truncado com `title` completo; lupa que leva a `/app/busca`.
- **FAB** nas listas: `fixed right-4 bottom-20 size-14 rounded-full bg-primary text-primary-foreground shadow-pop md:hidden`, `aria-label="Novo lead"`. Nas listas cujo "Novo" é um diálogo (Organizações, Aportes), o FAB é o gatilho do mesmo diálogo.
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

**`StatCard`** — `{ label, value: string, hint?, tone?: "neutral" | "warning" | "danger" | "success", href?, icon?: LucideIcon, ariaLabel? }`.
Recipe: `Link | div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 hover:bg-surface-2 focus-visible:outline"`; `label` em `.crm-eyebrow` com ponto de 8 px na cor do `tone` (`aria-hidden`) à esquerda quando `tone !== "neutral"`; `value` em `.crm-kpi`; `hint` em `.crm-meta`; `icon` 16 px à direita em `--muted-foreground`. Com `href` o card inteiro é link com `aria-label` ("3 próximas ações vencidas, abrir lista"). Grid pai: `grid grid-cols-2 gap-3 md:grid-cols-4`.

**`DataTable<T>`** (Server) — `{ caption: string, columns: Column<T>[], rows: T[], rowHref: (row) => string, rowKey: (row) => string, mobile: { primary: (row) => ReactNode, secondary: (row) => ReactNode, trailing?: (row) => ReactNode, action?: (row) => ReactNode }, empty: ReactNode, density?: "default" | "compact", footer?: ReactNode }` com `Column<T> = { key: string, header: ReactNode, cell: (row) => ReactNode, align?: "left" | "right", width?: string, priority?: 1 | 2 | 3, sort?: { param: string, value: string, active?: "asc" | "desc" } }`.

- Desktop (`hidden md:block`): `Card p-0 overflow-hidden` > `Table` com `caption` em `sr-only`; `th scope="col"`, `aria-sort="ascending|descending"` quando `sort.active`; cabeçalho ordenável é `<Link href="?sort=…">` com `ArrowUpDown` 14 px; `align="right"` dá `tabular text-right`; `priority 2` → `hidden md:table-cell`, `priority 3` → `hidden xl:table-cell`.
- Linha clicável (D10): o primeiro `<td>` é `relative`; o link do nome tem `className="row-link font-medium"` (o `::after` cobre a linha); qualquer outro link ou botão na linha recebe `relative z-10`. Teclado: Tab chega ao link, Enter abre; a linha mostra `focus-within:bg-primary-soft`.
- Celular (`md:hidden`): `<ul className="flex flex-col gap-2">` de `<li>` com `relative flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3`; `primary` (nome 500 + link `row-link`), `secondary` (`.crm-meta`), `trailing` (badge ou valor alinhado à direita), `action` (botão `size="touch"` visível, `relative z-10`, nunca gesto escondido).
- `footer` recebe a paginação. `empty` recebe um `EmptyState`.

**`StatusBadge`** (Server) — `{ kind: "stage" | "contribution" | "temperature" | "orgType", value: string, pipeline?: Pipeline, size?: "sm" | "md" }`. Mapa em `src/lib/crm/status-tones.ts` (tabela completa na seção 6); texto sempre visível, ícone `aria-hidden`. `kind="temperature"` devolve `null` para `frio` quando `size="sm"` (tabelas) e o texto "Frio" com `Snowflake` no detalhe. Substitui `badges.tsx`, `project-badges.tsx` e `ContributionStatusBadge`.

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

- Desktop: `form method="get" className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-2"`; busca com `Search` 240 px; cada filtro é `<select class="h-9 rounded-lg border border-input bg-background px-2 text-sm">` com `<label class="sr-only">`, primeira opção "Estágio: todos"; `sort` idem; chips abaixo em `Badge outline` com `X` e `aria-label="Remover filtro Origem: Site"`; "Limpar" só com filtro ativo; botão "Filtrar" (`outline sm`) com `scripting:hidden` (D19).
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

**`SegmentedControl`** (Client, 30 linhas) — `{ name, options: { value, label, icon? }[], value, onChange, label }`. `div role="radiogroup" aria-label` com botões `role="radio" aria-checked` em `outline size="sm"` (`data-active` → `bg-primary-soft text-primary border-primary/40`), setas esquerda/direita movem a seleção, e um `<input type="hidden" name>` alimenta a Server Action. Usado para o tipo de atividade e, em Novo lead, para o segmento.

**Loading** — `loading.tsx` por rota com `Skeleton`: `app/loading.tsx` (quatro `StatCard` + dois blocos de 5 linhas), `leads/loading.tsx` (abas + toolbar + 8 linhas de 44 px), `leads/[id]/loading.tsx` (cabeçalho + `NextStepCard` + duas colunas), `organizacoes/loading.tsx`, `organizacoes/[id]/loading.tsx`, `projetos/loading.tsx`, `projetos/[id]/loading.tsx`, `aportes/loading.tsx`, `aportes/[id]/loading.tsx`, `busca/loading.tsx`. Cada um com `<div role="status"><span className="sr-only">Carregando…</span>` e a silhueta.

**`Shortcuts`** (Client, 12 linhas, no layout) — só `/` (D11).

**`shell/`**: `sidebar.tsx` (client), `nav-items.tsx` (puro: `{ items, activeHref, collapsed, overdueCount }`), `bottom-bar.tsx` (client), `header.tsx` (server, recebe `breadcrumb`, `backHref`, `title`), `search-form.tsx` (server), `new-menu.tsx` (client), `user-menu.tsx` (client; "Sair" reaproveita `authClient.signOut()` do `nav.tsx` atual), `shortcuts.tsx` (client), `fab.tsx` (server). O `nav.tsx` atual é removido.

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

### 7.2 Hoje (`src/app/(app)/app/page.tsx`, `src/components/crm/today.tsx`)

```
┌ Hoje ──────────────────────────────────────────── segunda-feira, 6 de outubro ──┐
│ Bom dia, Daniela.                                                 (crm-h1)      │
│ ┌ ● VENCIDAS ──┐ ┌ ● SEM CONTATO ┐ ┌ TAREFAS HOJE ┐ ┌ APORTES 15 DIAS ────┐     │
│ │ 3            │ │ 5             │ │ 4            │ │ R$ 350.000,00       │     │
│ │ próximas ações│ │ 2 fora do prazo│ │ 2 atrasadas │ │ 3 previstos         │     │
│ └──────────────┘ └───────────────┘ └──────────────┘ └─────────────────────┘     │
│   → /app/leads?sort=next_action   → /app/leads?sort=created  → #tarefas  → /app/aportes?janela=15d │
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
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Cabeçalho**: `PageHeader` com `eyebrow` = data por extenso (`Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "America/Sao_Paulo" })`, primeira letra maiúscula) e `title` = "Bom dia, Daniela." / "Boa tarde" / "Boa noite" pelo horário em São Paulo (`session.user.name` primeiro nome). Sem botão "Novo lead" no header da página: o "Novo ▾" do shell cobre.
- **StatCards** (grid 2×2 no celular, 4 no desktop), todos com `href` (D15): Vencidas (`overdue.length`, `tone="danger"` quando > 0, hint "próximas ações"), Sem contato (`newLeads.length`, hint "N fora do prazo" contando `stageInfo(l).slaOverdue`), Tarefas hoje (`dueTasks.length`, hint "N atrasadas", `href="#tarefas"` que rola até a fila), Aportes 15 dias (soma de `proposedAmount` em `formatBRL`, hint "3 previstos"). `aria-label` completo em cada um.
- **Fila "Precisa de ação agora"** (`section aria-labelledby`, barra de 3 px `border-l-destructive`, ícone `TriangleAlert`, contagem): junta tarefas vencidas e de hoje, próximas ações vencidas e leads novos sem contato; ordenação na própria `page.tsx`: tarefas vencidas por `dueAt` crescente, depois leads por `nextActionAt` crescente, depois leads novos por `stageInfo.slaDeadline` crescente (vencidos primeiro, sem SLA por último). Máximo de 8 linhas visíveis; "ver todos os N ›" expande via `<details>` (não precisa de nova consulta: o teto de 20 por consulta permanece). Linha = grid `grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1fr)_14rem_auto]` de 44 px: quem (ícone `☐`/`○` + nome link + empresa em meta), estado (`StatusBadge stage` + `SlaIndicator`), ação (`TaskCompleteButton` `size="sm"` / `form action={claimLeadAction}` "Assumir" `size="sm"` / "Registrar contato" link `outline sm` para `/app/leads/[id]?registrar=1` / WhatsApp como ícone `MessageCircle` com `aria-label="Abrir WhatsApp com Rodrigo"` e `Tooltip`).
- **Próximos 7 dias**: leads com próxima ação e tarefas futuras, agrupados por dia com cabeçalho `.crm-eyebrow`; sem "ver todos".
- **Aportes previstos / Projetos com alerta** lado a lado (`md:grid-cols-2`): aportes com valor em `tabular`, data e `StatusBadge contribution`; projetos com `Meter` e dias restantes (`text-warning` quando < 183 dias).
- **Vazio**: quando as três filas de urgência estão vazias, um único `EmptyState` com `Sun`: "Nada vencido. Bom dia." + "Veja os próximos 7 dias ›"; StatCards ficam com 0.
- **Celular**: StatCards 2×2; linhas em dois andares (nome + empresa / badge + SLA + ação `size="touch"`); filas inferiores empilham.
- **Some**: os sete blocos iguais, a descrição longa, o badge "Frio" em cada linha, "sem dono" em texto solto (vira "Assumir"), a cor da borda como único sinal.

### 7.3 Leads (`leads/page.tsx`, `lead-filters.tsx`, `lead-table.tsx`)

```
┌ Leads ─────────────────────────────────────────────────────────────── [+ Novo lead] ┐
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
- **Coluna lateral** (`aside aria-label="Dados do lead"`, sticky): Resumo (`KeyValueList`: próxima ação com `SlaIndicator`, último contato, responsável como `OwnerForm` inline com `<select>` que submete no `change` e botão "Atribuir" `scripting:hidden`, interesse, motivo de perda quando terminal, tags), Contato (e-mail `mailto:`, telefone `tel:` ou "não informado · Editar" abrindo o `LeadEditDialog`, cidade, mensagem, e-mail devolvido em `Badge danger`), Aportes (só patrocinadores; `ContributionTable layout="cards"` + "Novo aporte" abrindo `NewContributionDialog` com `projects` carregados na página; some o link "registrar em Projetos"), Empresa (`KeyValueList hideEmpty` dos campos do segmento com CNPJ em `code`; título é o nome da organização com link; quando PJ sem organização, `Callout warning` "Para chegar a Termo, cadastre a empresa com CNPJ em Organizações ›"), Origem (`KeyValueList`: origem · detalhe, UTM, referência, página de entrada, versão do guia, indicado por, projeto de interesse, criado em), Consentimentos (`ShieldCheck` em `text-success` + "Contato comercial autorizado em 06/10/2026 por e-mail (política 2026-10)"; "Marketing: nunca registrado" em muted; texto integral em `<details>`), Simulações (`<details>` como hoje).
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

- `DetailLayout`: principal = Contatos (`DataTable`: nome + `Crown` "decisor", cargo, e-mail `mailto:`, telefone `tel:`, origem do dado em meta, "Editar" `relative z-10`; celular: nome + cargo / e-mail / telefone) e Leads vinculados (`DataTable`: nome + e-mail, segmento, `StatusBadge stage pipeline`, `SlaIndicator`; "Desvincular" no "⋯"); lateral = `KeyValueList hideEmpty` (CNPJ `code` com `hint` "necessário para o termo" quando `empresa` sem CNPJ, cidade, setor, regime, confirmado por, IRPJ estimado, ICMS, escritório contábil, quem cuida, notas) e, quando `type === "proponente"`, bloco "Projetos deste proponente" com `listProjectSummaries(ctx, { includeArchived: true, limit: 500 })` filtrado em memória por `proponentName === org.name` (não há filtro por id no repo; anotar como melhoria futura de repositório) mostrando nome, `StatusBadge stage`, saldo.
- "Editar dados" deixa de ser `<details>`: o botão "Editar" do `PageHeader` abre `Sheet side="right"` (celular: `bottom`) com o `EditOrganizationForm` atual dentro.
- Celular: `ActionBarMobile` "Novo contato" + "Vincular lead", "⋯" Editar.

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
- `FormSection id="atalhos"` "Atalhos de teclado": tabela `kbd` com `/` "Buscar", `Esc` "Fechar diálogo ou menu", `Tab`/`Enter` "Navegar e abrir". Sem "Aparência".

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
| Não encontrado | `(app)/app/not-found.tsx` | "Este registro não existe ou foi movido." + "Voltar para Hoje" |
| Ação bloqueada por regra | botão `disabled` + checklist + `Callout warning` | "Depende do aporte: registre o termo assinado em Projetos ›" |
| Dado vencido | `CircleAlert` + `text-destructive` | "Ação atrasada há 3 dias", "Sem contato há 6 dias (prazo: 1 dia útil)" |
| Dado quase vencido | `Clock` + `text-warning` | "Ação em 17 h", "70 dias de prazo" |
| Confirmação destrutiva | `ConfirmDialog` `role="alertdialog"`, botão `destructive` com o verbo | "Marcar perdido" · "Cancelar aporte" · "Arquivar projeto"; nunca "Sim/Não" |
| Sessão expirada | `requireSession` redireciona (já) para `/entrar?next=` | `Callout info` "Sua sessão expirou. Entre de novo para continuar em Leads." |

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
