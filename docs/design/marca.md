# Marca da Prospekto

Fonte: a assinatura oficial `assinatura_PROSPEKTO_com_CNPJ.psd` entregue pelo dono em 14/10/2026. O logo é a palavra "PROSPEKTO" em caixa alta (cinza-grafite), a tagline "CONSULTORIA & PROJETOS" espaçada abaixo e, à direita, a marca: dois blocos isométricos em "L" invertido, vermelhos, em perspectiva. Este documento fixa os arquivos, as variantes, as cores com os contrastes calculados, as regras de uso no site e no CRM, e como regenerar tudo quando o logo mudar.

## 1. Arquivos

| Arquivo | O que é | Uso |
| --- | --- | --- |
| `src/components/brand/logo.tsx` | componente `<Logo>` (SVG inline) | site e CRM: todo lugar com React |
| `src/components/brand/logo-paths.ts` | caminhos SVG, viewBoxes e cores; **gerado, não editar à mão** | importado só por `logo.tsx` e pelos testes |
| `public/brand/logo.svg` | logo horizontal completo, texto em `#363435` | lugares sem React |
| `public/brand/marca.svg` | só a marca | ícones e avatares quadrados |
| `public/brand/logo.png` | logo horizontal a 3x, fundo transparente | documentos, propostas, assinaturas |
| `public/brand/logo-email.png` | logo 604 × 160 (2x) sobre branco | cabeçalho dos e-mails transacionais (clientes de e-mail não leem SVG) |
| `public/brand/marca-192.png`, `marca-512.png` | marca sobre fundo transparente | manifest, PWA, avatares |
| `src/app/icon.svg`, `apple-icon.png`, `favicon.ico`, `opengraph-image.png` | convenções de arquivo do Next | favicon, ícone do iOS e imagem Open Graph (1200 × 630, logo sobre areia com o domínio) saem sem código |

Dados da assinatura (só da própria empresa): telefone (54) 98403-2180, Avenida Osvaldo Aranha, 945/401, Bento Gonçalves, RS, CNPJ 30.665.797/0001-07.

## 2. Componente `<Logo>`

```tsx
import { Logo } from "@/components/brand/logo";

<Logo variant="compacto" className="h-7 w-auto text-foreground" />
<Logo variant="marca" className="h-7 w-auto" />
<Logo variant="horizontal" className="h-12 w-auto text-foreground" title="Prospekto Consultoria & Projetos" />
```

| `variant` | Conteúdo | viewBox | Proporção | Onde |
| --- | --- | --- | --- | --- |
| `horizontal` (padrão) | "PROSPEKTO", tagline e marca | `36 0 302 80` | 3,78 : 1 | login do CRM, cabeçalho e rodapé do site, Open Graph, e-mails |
| `compacto` | "PROSPEKTO" e marca, sem tagline | `36 0 302 61` | 4,95 : 1 | sidebar do CRM aberta, header compacto do site |
| `marca` | só os dois blocos vermelhos | `296 -1 44 49` | 0,9 : 1 | sidebar recolhida (trilho), favicon, avatares, espaços quadrados |

- **Cor do texto**: o texto e a tagline usam `fill="currentColor"`, então a cor vem do elemento pai. No site (cabeçalho e rodapé) use `text-brand-ink`, o cinza do logo (`#363435`, 12,36 : 1 sobre branco, 10,96 : 1 sobre areia); no CRM use `text-foreground` (grafite `#1E2A32`). No modo escuro (`.dark`) os dois viram `#ECE9E2` (13,18 : 1 sobre a sidebar escura) sem código extra.
- **A marca é fixa**: os quatro polígonos levam `#EB3236` e `#C52E32` fixos e não respondem a `currentColor`. Nunca recolorir a marca (nem em preto, nem na cor do texto, nem em branco sobre vermelho): se o fundo não comportar o vermelho, troque o fundo, não a marca.
- **Acessibilidade**: sem `title` o SVG é decorativo (`aria-hidden="true"`, sem `role`), e o link ou botão que o envolve recebe o nome (`aria-label="Prospekto CRM, ir para o Painel"`). Com `title`, o SVG vira `role="img"` com `aria-label` e deve ser o único nome do lugar. Nunca os dois ao mesmo tempo, para o leitor de tela não dizer "Prospekto" duas vezes.
- **Tamanho**: controle pela altura (`h-7`, `h-12`) com `w-auto`; o SVG mantém a proporção. Nada de `width` e `height` fixos em proporção diferente da do viewBox.

## 3. Cores

| Papel | Valor | Token | Contrastes (WCAG 2.x, luminância relativa) |
| --- | --- | --- | --- |
| vermelho vivo (faces de cima da marca) | `#EB3236` | `--brand-vivid` (claro e escuro) | 4,17 : 1 sobre branco; 3,69 : 1 sobre areia `#F4F1EB`; 4,22 : 1 sobre o fundo escuro `#121A20`; 3,84 : 1 sobre a sidebar escura `#18232B` |
| vermelho escuro (faces laterais) | `#C52E32` | `--brand` / `--ring` no claro | 5,51 : 1 sobre branco; 4,89 : 1 sobre areia; 5,11 : 1 sobre `--surface-2`; 4,58 : 1 sobre `--brand-soft #F7E6E8`; branco sobre ele 5,51 : 1 |
| vermelho claro (modo escuro) | `#F0797C` | `--brand` / `--ring` no `.dark` | 6,47 : 1 sobre `#121A20`; 5,88 : 1 sobre `--card #18232B`; 5,38 : 1 sobre `--sand #1F2A33`; 5,46 : 1 sobre `--brand-soft #3D1F21` |
| cinza do texto do logo | `#363435` | `--brand-ink` no claro (no `.dark` vira o `--foreground` `#ECE9E2`); também em `public/brand/logo.svg` | 12,36 : 1 sobre branco; 10,96 : 1 sobre areia |
| grafite do site e do CRM | `#1E2A32` | `--foreground` | 14,66 : 1 sobre branco; é o `currentColor` do logo inline |

Regras derivadas (crm-design-system.md, seção 3.1 e decisões D5 a D8):

- `--brand` é o acento do site e do CRM: rótulos de seção e números grandes do site, eyebrow "CRM", anel de foco, barra do `NextStepCard`, badge "fechamento" (`--brand-soft`), ícone "decisor", pontos das colunas de fechamento. É o vermelho escuro porque é o único dos dois vermelhos que passa de 4,5 : 1 em texto e de 3 : 1 em bordas e anéis.
- `--brand-vivid` é para a marca e para acentos grandes sem texto (um bloco decorativo, um gráfico, uma faixa com pelo menos 24 px): 4,17 : 1 sobre branco não serve a texto pequeno nem a borda de campo.
- "Um acento por tela": o vermelho não vira cor de botão sólido (`--primary` continua o azul-profundo) nem fundo de áreas grandes. O logo já traz vermelho; onde ele está, não se acrescenta outro vermelho de destaque no mesmo bloco.
- `--destructive #A32D2D` continua o vermelho de erro, "vencido" e "perdido": mais escuro e dessaturado, sempre com ícone e texto, e nunca no mesmo componente que o acento.

## 4. Regras de uso

- **Alturas**: sidebar do CRM 28 px (compacto aberta, marca no trilho); login 48 px (horizontal); header do site 32 a 40 px (compacto no celular, horizontal no desktop); e-mail 80 px de altura a partir de `logo-email.png`.
- **Mínimos**: a marca isolada nunca abaixo de 24 px de altura (abaixo disso as faces laterais somem); o compacto nunca abaixo de 20 px (o "O" fecha); o horizontal nunca abaixo de 40 px (a tagline, com 11,5 px no viewBox de 80, cai para menos de 6 px e vira ruído; abaixo de 40 px use o compacto).
- **Respiro**: espaço livre ao redor de pelo menos metade da altura da marca (14 px para a marca de 28 px); nada encosta no logo, nem borda, nem texto. Na sidebar, o `Link` de 56 px com `mx-4` cumpre isso.
- **Fundos**: branco, areia `#F4F1EB` e os fundos escuros do CRM, com o texto na cor certa. Nunca sobre vermelho, laranja ou rosa (a marca some) nem sobre fotos de contraste médio.
- **Nunca**: recolorir a marca; esticar; girar; aplicar sombra, contorno ou degradê; usar a tagline sozinha; escrever "Prospekto" ao lado do logo (o nome já está nele); colocar o logo com `title` dentro de um link que também tem `aria-label`.
- **Texto solto**: no shell do CRM e no login, "Prospekto" não aparece mais como palavra solta onde o logo está (`tests/shell-nav.test.ts`). Em texto corrido, o nome continua "Prospekto" (só a primeira letra maiúscula); a caixa alta é só do desenho do logo.

## 5. Como regenerar

Os caminhos em `logo-paths.ts` e os arquivos de `public/brand/` e `src/app/` foram gerados por um script Python (`gen-logo.py`) e um script de rasterização com Chromium (`render-assets.mjs`), mantidos fora do repositório (no scratchpad da sessão que criou a marca). O processo, para reproduzir quando o logo mudar:

1. **Medir a marca** no arquivo original (PSD exportado em PNG a 4x). As coordenadas dos quatro polígonos estão em `MARK_POLYGONS` de `logo-paths.ts`, no sistema do original (viewBox `36 0 302 80`; a marca ocupa x 298,5 a 337,5 e y 1 a 45,5). Se a marca mudar, medir de novo os vértices e atualizar os quatro polígonos (dois de "cima", `#EB3236`, dois "laterais", `#C52E32`).
2. **Converter o texto em caminhos**: com `fontTools` e `uharfbuzz`, modelar "PROSPEKTO" (Barlow ExtraBold) e "CONSULTORIA & PROJETOS" (Barlow Medium) com kerning, ajustando o tamanho pela altura das capitais e o tracking pela largura até bater com as caixas medidas no original (palavra: x 37 a 310,5, y 21 a 59,5; tagline: x 37 a 304,5, y 68 a 79,5), e gerar o `d` dos glifos com `SVGPathPen` e `TransformPen` (y invertido). Barlow é SIL Open Font License e a conversão em caminhos dispensa carregar a fonte no site. Os caminhos resultantes viram `WORDMARK_PATH` e `TAGLINE_PATH`.
3. **Montar os SVGs**: `logo.svg` (texto em `#363435`), a versão em `currentColor` (usada pelo componente), `logo-sem-tagline.svg` (viewBox `36 0 302 61`) e `marca.svg` (viewBox `296 -1 44 49`). Conferir a sobreposição com o original num PNG comparativo (original acima, reconstrução abaixo) antes de seguir.
4. **Rasterizar** com o Chromium do playwright-core (render fiel de caminhos): `logo-email.png` (302 × 80 a 2x sobre branco), `logo.png` (3x transparente), `opengraph-image.png` (1200 × 630, fundo `#F4F1EB`, logo com 760 px de largura centrado e o domínio `prospekto.com.br` abaixo em `#5B6670`), `apple-icon.png` (180 × 180, marca de 124 px sobre branco), PNGs da marca em 16, 32, 48, 64, 192 e 512 px transparentes; `favicon.ico` reúne os de 16, 32 e 48.
5. **Copiar** para `public/brand/` e `src/app/` (nomes de convenção do Next: `icon.svg`, `apple-icon.png`, `opengraph-image.png`, `favicon.ico`), regravar `logo-paths.ts` com o cabeçalho "gerado, não editar", e rodar `npx vitest run tests/shell-nav.test.ts tests/tokens-contrast.test.ts`.

As cores de tela em `src/app/globals.css` (`--brand`, `--brand-vivid`, `--brand-soft`, `--ring`) não são geradas: mudam só se as cores da marca mudarem, e `tests/tokens-contrast.test.ts` recalcula os contrastes.
