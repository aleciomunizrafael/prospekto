# Simulador de incentivo fiscal: especificação funcional

> Especifica o "Simulador de incentivo fiscal" do site (`/simulador`), lead magnet dos segmentos PJ e PF (`docs/estrategia/personas-e-funis.md`, seção 6). As regras de cálculo vêm de `docs/dominio/parametros-simulador.json` (fonte única de percentuais, limites e exemplos); este documento não define percentual nenhum por conta própria. Contexto legal em `docs/dominio/leis-de-incentivo.md`; estrutura do site, formulários e analytics em `docs/site/estrutura-e-copy.md`.
>
> Data de referência: 03/10/2026. O que não foi confirmado está marcado com "[verificar]". Parâmetros do JSON com `status: "verificar"` aparecem na interface com aviso.

## 1. Resumo

- O simulador responde a uma pergunta: "quanto do imposto que eu já vou pagar pode ir para um projeto cultural, e quanto isso me custa de verdade?". Entrada mínima: tipo de contribuinte, regime ou modelo de declaração, imposto devido (ou lucro estimado). Saída: valor máximo por mecanismo, custo líquido e a comparação "pagar imposto" contra "patrocinar".
- Resultado resumido (um número: o teto da cesta cultural) aparece sem cadastro. Resultado detalhado (por mecanismo, comparação, cenários da LC 224/2025, PDF) só depois do formulário de captura.
- Toda regra é lida de `parametros-simulador.json` em tempo de build ou de execução; o código não tem percentual literal. Cada número na tela leva a fonte (lei e artigo) e a data `atualizado_em` do JSON.
- O cálculo é uma função pura (`simulate(input, params)` em `src/lib/simulator/`), testada com os exemplos da seção 9, que reproduzem `exemplos` do JSON e acrescentam casos de borda.
- O simulador estima; o contador apura. A ressalva aparece em todas as telas de resultado.

## 2. Escopo

| Dentro (Fase 1) | Fora (depois ou nunca) |
|---|---|
| PJ no lucro real: cesta cultural de 4% (Rouanet art. 18, art. 26 patrocínio e doação, Audiovisual art. 1º-A; art. 1º como referência) e tetos próprios (esporte, FIA, Idoso, Pronon, Pronas), com e sem o fator da LC 224/2025 | Funcines (status `verificar`; só menção) |
| PF na declaração completa: cesta de 6% (7% com esporte), art. 18, art. 26, Audiovisual, FIA e Idoso na própria declaração | Audiovisual arts. 3º e 3º-A (remessas ao exterior; não é o público) |
| LIC-RS por faixa de ICMS (status `verificar`, com aviso) | LIC de Caxias do Sul e outras leis municipais (parâmetros não cadastrados) |
| Desqualificação de presumido, Simples e declaração simplificada, com oferta alternativa quando existir | Cálculo exato do custo líquido no art. 26 (depende da apuração; mostramos faixa) |
| Captura de lead antes do detalhe; e-mail com o resultado; link de resultado por token | Simulação de carteira para contadores (vários clientes de uma vez; fica para o diagnóstico de carteira) |
| Comissão de captação não aparece: é regra interna do CRM (`captacao` do JSON) | |

## 3. Entradas

### 3.1 Comuns

| Campo | Tipo | Obrigatório | Valores | Observação |
|---|---|---|---|---|
| `taxpayer_type` | enum | sim | `pj`, `pf` | Primeira tela |
| `mechanisms_of_interest` | lista | não (padrão: todos os aplicáveis ao tipo) | PJ: `cesta_cultural`, `esporte`, `fundos` (FIA e Idoso), `saude` (Pronon e Pronas), `lic_rs`; PF: `cultura`, `audiovisual`, `fundos`, `esporte` | Filtra o que aparece em destaque; o resto fica em "outros incentivos" |
| `apply_lc224` | booleano | não (padrão: `regras_gerais.lc_224_2025.aplicar_por_padrao`, hoje `true`) | | Só PJ (`aplica_a_pf: false`); interruptor visível no resultado com aviso |

### 3.2 Pessoa jurídica

| Campo | Tipo | Obrigatório | Valores e validação | Observação |
|---|---|---|---|---|
| `regime` | enum | sim | `lucro_real`, `lucro_presumido`, `simples_nacional`, `lucro_arbitrado`, `nao_sei` | Só `lucro_real` segue para a Rouanet (`regras_gerais.pj_regimes_elegiveis`). `nao_sei` mostra a explicação "pergunte ao contador: se a empresa fatura acima de R$ 78 milhões por ano, é lucro real obrigatório" (`personas-e-funis.md`, seção 3.1) e permite continuar com aviso |
| `input_mode` | enum | sim | `tax_due` (informo o IRPJ devido), `taxable_profit` (informo o lucro real estimado), `tax_band` (sei só a faixa) | |
| `tax_due` | moeda | se `input_mode = tax_due` | número maior que zero; até R$ 1.000.000.000 (acima disso, pedir confirmação) | Rótulo: "IRPJ devido no período, à alíquota de 15%, sem o adicional de 10%". Ajuda: "É o imposto 'normal' do DARF antes dos incentivos. Seu contador tem esse número na apuração." |
| `taxable_profit` | moeda | se `input_mode = taxable_profit` | número maior que zero | Rótulo: "Lucro real estimado do período" |
| `period` | enum | se `input_mode = taxable_profit`; opcional nos demais | `annual` (12 meses), `quarterly` (3 meses) | Define a parcela isenta do adicional: R$ 20.000 por mês (`regras_gerais.pj_base_de_calculo`; Lei 9.249/1995, art. 3º, § 1º via `leis-de-incentivo.md`, seção 2.3) |
| `tax_band` | enum | se `input_mode = tax_band` | `ate_100k`, `100k_500k`, `500k_2500k`, `acima_2500k`, `nao_sei` | Mesmos códigos de `irpj_faixa` do CRM |
| `desired_contribution` | moeda | não | número maior que zero | "Quanto a empresa pensa em destinar?" Usado no custo líquido e na comparação; se vazio, usa o teto |
| `contribution_type` | enum | não (padrão `patrocinio`) | `patrocinio`, `doacao` | Muda o percentual do art. 26 e lembra que doação não dá contrapartida de marca |
| `icms_contributor_rs` | enum | só se regime não for lucro real | `sim`, `nao`, `nao_sei` | Habilita o módulo LIC-RS |
| `icms_prior_year` | moeda | se LIC-RS habilitado | número maior ou igual a zero | "ICMS próprio pago no ano anterior" |
| `lic_rs_segment` | enum | se LIC-RS habilitado (padrão `demais_editais`) | `demais_editais`, `edital_patrimonio_e_espacos_publicos` | Valores iguais às chaves de `P.mecanismos.lic_rs.repasse_adicional_fac_percentual` (10% ou 5%). Rótulos na tela: "Artes, produção e fruição (demais editais)" e "Patrimônio e espaços públicos de cultura". A nomenclatura "artes e economia criativa" / "patrimônio, acervo e espaços" vem do parecer de 2020 e não é mais usada (`leis-de-incentivo.md`, seção 6.1) |

### 3.3 Pessoa física

| Campo | Tipo | Obrigatório | Valores e validação | Observação |
|---|---|---|---|---|
| `declaration_model` | enum | sim | `completa`, `simplificada`, `nao_sei` | Só `completa` deduz (`pf.modelo_declaracao`). `nao_sei`: explicação ("se você usa deduções de saúde, educação e dependentes, provavelmente é a completa; confirme com quem faz sua declaração") e continua com aviso |
| `input_mode` | enum | sim | `tax_due`, `tax_band` | |
| `tax_due` | moeda | se `tax_due` | maior que zero; até R$ 100.000.000 | Rótulo: "Imposto devido na declaração de ajuste anual (antes das deduções de incentivo)". Ajuda: "Está na linha 'Imposto devido' da sua declaração do ano passado; serve como estimativa para este ano." |
| `tax_band` | enum | se `tax_band` | `ate_20k`, `20k_80k`, `acima_80k`, `nao_sei` | Mesmos códigos de `ir_devido_faixa` |
| `includes_sport` | booleano | não (padrão falso) | | Sobe a cesta de 6% para 7% (`pf.limite_percentual_cesta_com_esporte`) |
| `desired_contribution` | moeda | não | maior que zero | Como na PJ |
| `contribution_type` | enum | não (padrão `patrocinio`) | `patrocinio`, `doacao` | Art. 26 PF: 60% ou 80% |

### 3.4 Validação e normalização

- Moeda: aceita "1.234.567,89", "1234567.89" e "R$ 1.234.567"; normaliza para número com duas casas; rejeita negativos, zero (ver estados de erro) e texto.
- Enums: valores fora da lista são erro de validação (nunca tratados como padrão).
- Combinações inválidas: `taxpayer_type = pf` com `regime`; `input_mode = taxable_profit` sem `period`; LIC-RS sem `icms_prior_year`. Erro de formulário, não de cálculo.
- A validação roda no cliente (resposta imediata) e no servidor (Server Action com Zod), com as mesmas mensagens.

## 4. Regras de cálculo

Notação: `P` é o objeto carregado de `parametros-simulador.json`. Percentuais do JSON estão em pontos percentuais (4 significa 4%). Todo valor monetário é arredondado a duas casas, meio para cima (66.666,666... vira 66.666,67, como em `exemplos.pj`), e só no fim de cada fórmula.

### 4.1 Elegibilidade

| Caso | Regra | Resultado |
|---|---|---|
| PJ com `regime` em `P.regras_gerais.pj_regimes_nao_elegiveis` (`lucro_presumido`, `lucro_arbitrado`, `simples_nacional`) | Não calcula incentivos sobre o IR | Estado `disqualified` com `reason = regime`. Se `regime` for presumido ou arbitrado e `icms_contributor_rs` for `sim` ou `nao_sei`, oferece o módulo LIC-RS (`P.mecanismos.lic_rs.quem_pode`). Simples não entra na LIC-RS |
| PJ com `regime = nao_sei` | Calcula como lucro real | Aviso "resultado válido só se a empresa for tributada pelo lucro real" |
| PF com `declaration_model = simplificada` | Não calcula | `disqualified`, `reason = modelo_simplificado`, com texto sobre conferir com o contador qual modelo compensa |
| PF com `nao_sei` | Calcula como completa | Aviso |
| Imposto devido igual a zero | Não calcula | Estado `no_tax` ("sem imposto devido não há dedução; registre seu contato para o próximo período") |

### 4.2 Base de cálculo da PJ

- Se `input_mode = tax_due`: `base = tax_due`.
- Se `input_mode = taxable_profit`: `months = 12` (annual) ou `3` (quarterly); `base = taxable_profit × 0,15`; `surtax = max(0, taxable_profit − 20.000 × months) × 0,10`. O adicional (`surtax`) é mostrado como informação ("recolhido integralmente; não entra na base do incentivo") e nunca entra em `base`. Fonte: `P.regras_gerais.pj_base_de_calculo`; Lei 9.249/1995, art. 3º, § 4º.
- Se `input_mode = tax_band`: `base_min` e `base_max` pelos limites da faixa (`ate_100k`: 0,01 a 100.000; `100k_500k`: 100.000 a 500.000; `500k_2500k`: 500.000 a 2.500.000; `acima_2500k`: 2.500.000 sem teto; `nao_sei`: sem cálculo, mostra a tabela de exemplos do JSON). Todas as saídas viram intervalos "entre X e Y" (ou "acima de X").

Os valores 15% e 10% e a parcela de R$ 20.000 por mês estão descritos em `P.regras_gerais.pj_base_de_calculo` como texto; para o código, acrescentar ao JSON um objeto `pj_apuracao` com `aliquota_irpj: 15`, `aliquota_adicional: 10`, `parcela_isenta_adicional_mensal: 20000` (ver seção 11). Até lá, o código lê esses três números de um módulo de constantes com a mesma fonte, marcado para migração.

### 4.3 Limites da PJ

Para cada grupo `g` em `P.regras_gerais.grupos_de_limite_compartilhado` com sufixo `_pj`:

`limit_g = base × (g.limite_percentual / 100) × factor`, onde `factor = P.regras_gerais.lc_224_2025.fator_pj` (0,9) se `apply_lc224` for verdadeiro, senão 1.

| Grupo | Percentual (JSON) | Membros | Observação na tela |
|---|---|---|---|
| `cesta_cultural_pj` | 4 | Rouanet art. 18, art. 26 (patrocínio e doação), Audiovisual art. 1º e 1º-A, esporte de inclusão social | "Teto único: a soma de tudo isso não passa de 4% (3,6% com a LC 224)". Dentro da cesta, o art. 1º tem limite individual de 3% (`P.mecanismos.audiovisual_art1.limite_percentual`) |
| `esporte_pj` | 2 | esporte | Teto próprio |
| `fia_pj`, `idoso_pj`, `pronon_pj`, `pronas_pj` | 1 cada | | Tetos próprios |

`total_max = soma de todos os limites` (10% sem LC 224; 9% com). Mostrado como "Total máximo em incentivos sobre o IRPJ".

Por mecanismo `m` em `P.mecanismos` com `pj_lucro_real` em `quem_pode` e `limite_percentual` numérico: `limit_m = min(base × limite_percentual_m / 100 × factor, limit_do_grupo_de_m)`. Para os membros da cesta, isso dá 4% (art. 18, 26, 1º-A) e 3% (art. 1º).

### 4.4 Aporte, dedução e custo líquido (PJ)

Para o mecanismo escolhido e um aporte `A` (`desired_contribution`, ou o aporte que atinge o teto quando vazio):

| Mecanismo | Percentual dedutível `d` (JSON, `percentual_dedutivel`) | Dedução | Aporte para atingir o teto | Economia como despesa operacional | Custo líquido |
|---|---|---|---|---|---|
| Rouanet art. 18 | 100 | `min(A × 1,00, limit)` | `limit` | nenhuma (`trata_como_despesa_operacional: false`) | `A − dedução` (zero dentro do teto) |
| Audiovisual art. 1º-A | 100 | idem | `limit` | nenhuma | idem |
| Rouanet art. 26, patrocínio | 30 (`rouanet_art26_patrocinio.percentual_dedutivel.pj`) | `min(A × 0,30, limit)` | `limit / 0,30` | `A × t`, com `t` entre `t_min` e `t_max` (seção 4.5) | `A − dedução − economia` (faixa) |
| Rouanet art. 26, doação | 40 (`rouanet_art26_doacao.percentual_dedutivel.pj`) | `min(A × 0,40, limit)` | `limit / 0,40` | idem | idem |
| Audiovisual art. 1º | 100 | `min(A, limit_art1)` | `limit_art1` | `A × t` | `A − dedução − economia`; lembrar que é investimento em cotas com participação em receita (produto diferente) |
| Esporte, FIA, Idoso, Pronon, Pronas | 100 | `min(A, limit_grupo)` | `limit_grupo` | nenhuma | `A − dedução` |

Se `A` for maior que o aporte que atinge o teto, a tela avisa: "Acima de R$ X o excedente não é dedutível; o custo líquido sobe." O cálculo segue com a dedução travada no teto.

### 4.5 Economia como despesa operacional (art. 26 e art. 1º)

`parametros-simulador.json` diz que o aporte do art. 26 "reduz IRPJ e CSLL" mas não traz as alíquotas. `leis-de-incentivo.md`, seção 8.1, fala em "até 34%". O simulador mostra uma faixa, não um número:

- `t_min = (aliquota_irpj + aliquota_csll) / 100` = 0,24 (empresa cuja parcela do lucro sujeita ao adicional é zero);
- `t_max = (aliquota_irpj + aliquota_adicional + aliquota_csll) / 100` = 0,34 (empresa com lucro integralmente acima da parcela isenta do adicional).

Essas alíquotas precisam entrar no JSON como `pj_apuracao.aliquota_csll: 9` ao lado das demais (seção 11), com fonte (Lei 7.689/1988, art. 3º, para a CSLL de 9% [verificar na fonte primária]) e `status: "verificar"`. Na tela, a faixa aparece com o texto: "A economia exata depende da apuração da empresa (adicional, CSLL, prejuízos). Faixa estimada entre R$ X e R$ Y; o contador confirma."

Simplificação declarada: o simulador não recalcula o IRPJ devido (e, portanto, o teto de 4%) depois de abater o aporte como despesa. O efeito é pequeno e circular; fica fora e é mencionado na nota técnica da tela (seção 7) [verificar com o contador se vale incluir na versão 2].

### 4.6 Pessoa física

- `base = tax_due` (ou intervalo pela faixa: `ate_20k`: 0,01 a 20.000; `20k_80k`: 20.000 a 80.000; `acima_80k`: 80.000 sem teto).
- `factor = 1` sempre (`P.regras_gerais.lc_224_2025.aplica_a_pf: false`; `P.pf.lc_224_aplica: false`). O interruptor da LC 224 não aparece para PF.
- `basket_limit = base × (P.pf.limite_percentual_cesta / 100)` = 6%; se `includes_sport`, usa `P.pf.limite_percentual_cesta_com_esporte` = 7%.
- Por mecanismo, com `d` de `P.pf.percentual_dedutivel`: dedução `min(A × d / 100, basket_limit)`; aporte para o teto `basket_limit / (d / 100)`: art. 18 e 1º-A: `basket_limit`; art. 26 doação: `basket_limit / 0,80`; art. 26 patrocínio: `basket_limit / 0,60`.
- Audiovisual art. 1º: limite individual `base × P.pf.limite_individual_audiovisual_art1 / 100` = 3%, dentro da cesta.
- FIA e Idoso "na própria declaração": `base × P.pf.doacao_na_declaracao.fia / 100` = 3% (e `idoso` = 3%), dentro da cesta de 6%; cultura na declaração: 0 (`doacao_na_declaracao.cultura: 0`), com o texto "para cultura, o depósito precisa acontecer até o último dia útil bancário de dezembro" (`P.pf.prazo_aporte`).
- Custo líquido PF: `A − dedução` (não há despesa operacional para PF). No art. 18 e 1º-A é zero dentro do teto; no art. 26 é 20% (doação) ou 40% (patrocínio) do aporte, dentro do teto.
- Onde declarar: `P.pf.onde_declarar` ("ficha Doações Efetuadas da DIRPF, com o recibo de mecenato").

### 4.7 LIC-RS (ICMS)

Status `verificar` em `P.mecanismos.lic_rs` (`limite_por_faixa_status`); a tela leva o aviso "Tabela de faixas da Lei 13.490/2010, art. 6º (redação da Lei 15.449/2020), regulamentada pelo Decreto 57.531/2024 e pela IN Sedac 1/2026; confirme com a Sedac ou com o contador. [verificar]". O Decreto 55.448/2020 foi revogado pelo Decreto 57.531/2024, art. 24, e não pode aparecer como norma vigente em texto de tela (`leis-de-incentivo.md`, seção 6.1; `P.mecanismos.lic_rs.limite_por_faixa_nota`).

- Elegível: contribuinte de ICMS no RS fora do Simples (`quem_pode`). Lucro presumido pode.
- `annual_limit` pela faixa de `icms_prior_year` em `limite_por_faixa_icms_ano_anterior`: `icms × percentual / 100 + acrescimo`. Faixas: até 600.000: 20%; de 600.000,01 a 1.200.000: 15% + 30.000; de 1.200.000,01 a 2.400.000: 10% + 90.000; acima de 2.400.000: 5% + 210.000. As faixas são contínuas nos limites (600.000 dá 120.000 pelas duas fórmulas).
- `fac_transfer = applied × P.mecanismos.lic_rs.repasse_adicional_fac_percentual[lic_rs_segment] / 100` (`demais_editais`: 10; `edital_patrimonio_e_espacos_publicos`: 5), onde `applied` é o aporte (padrão: `annual_limit`). É custo real da empresa (`observacoes`). O percentual é fixado por edital na IN Sedac do ano (`repasse_adicional_fac_nota`); a hipótese de 25% citada pela CLAEC não é modelada [verificar].
- `icms_credit = applied` (compensação de 100%, `percentual_dedutivel.compensacao_do_valor_aplicado`).
- `total_outlay = applied + fac_transfer`; `net_cost = fac_transfer`.
- Comparação: "pagar ICMS" (recolhe `applied` ao Estado) contra "patrocinar" (recolhe `applied` ao projeto mais `fac_transfer` ao FAC, recupera `applied` como crédito na GIA).

### 4.8 Comparação "pagar imposto" contra "patrocinar"

Para o mecanismo em destaque e aporte `A` (padrão: aporte que atinge o teto):

| Linha | Cenário A: pagar o imposto | Cenário B: patrocinar |
|---|---|---|
| Imposto recolhido ao Tesouro (DARF) | `base` | `base − dedução` |
| Aporte ao projeto | 0 | `A` |
| Economia como despesa operacional (quando houver) | 0 | `−economia` (faixa) |
| Desembolso total | `base` | `base − dedução + A − economia` |
| Custo adicional em relação ao cenário A | 0 | `A − dedução − economia` (zero no art. 18 e 1º-A dentro do teto) |
| O que a empresa recebe | nada específico | recibo de mecenato; contrapartidas de marca (patrocínio); projeto na região |

Para PF, as mesmas linhas sem a economia operacional. Para LIC-RS, "imposto" é o ICMS e a dedução é o crédito na GIA.

### 4.9 Vários mecanismos ao mesmo tempo

A versão 1 não distribui um aporte entre mecanismos. Mostra o teto de cada um, deixa claro quais compartilham a cesta de 4% (ou 6%) e calcula custo líquido e comparação para um mecanismo de cada vez (o visitante alterna por abas). Um "planejador" que distribui o valor entre cesta, esporte e fundos fica para a versão 2 e para o diagnóstico de carteira dos contadores.

## 5. Saídas

### 5.1 Resultado resumido (antes do cadastro)

- Um número grande: "Até R$ [cesta cultural] do IRPJ da sua empresa podem ir para projetos culturais" (PJ) ou "Até R$ [cesta 6%] do seu imposto de renda" (PF). Em PJ com `apply_lc224` ligado, o número exibido é o da LC 224 e, logo abaixo, "R$ [4%] sem a redução da LC 224/2025 [verificar]".
- Uma linha: "Dedução de 100% do aporte no art. 18 da Lei Rouanet e no art. 1º-A da Lei do Audiovisual, dentro do teto. Custo líquido: zero."
- Uma linha: "Somando esporte, fundos da criança e do idoso, Pronon e Pronas, até R$ [total] do IRPJ pode ter outro destino." (só PJ)
- Botão "Ver resultado detalhado" (abre o formulário de captura, seção 6) e botão secundário "Falar no WhatsApp".
- Para faixas: o mesmo bloco com "entre R$ X e R$ Y".

### 5.2 Resultado detalhado (depois do cadastro)

Blocos, na ordem:

1. Base de cálculo: o que foi informado; para `taxable_profit`, a conta aberta (lucro, 15%, adicional recolhido à parte).
2. Tabela por mecanismo (PJ):

| Mecanismo | Base legal | Teto (R$) | Dedução por R$ 1 aportado | Aporte para atingir o teto | Custo líquido no teto | Despesa operacional | Compartilha a cesta de 4%? |
|---|---|---|---|---|---|---|---|
| Rouanet art. 18 | Lei 8.313/1991, art. 18; Lei 9.532/1997, art. 6º | | R$ 1,00 | | R$ 0 | Não | Sim |
| Rouanet art. 26, patrocínio | art. 26, II e § 1º | | R$ 0,30 | | faixa | Sim | Sim |
| Rouanet art. 26, doação | art. 26, I e § 1º | | R$ 0,40 | | faixa | Sim | Sim |
| Audiovisual art. 1º-A | Lei 8.685/1993, art. 1º-A; Lei 15.132/2025 | | R$ 1,00 | | R$ 0 | Não | Sim |
| Audiovisual art. 1º (referência) | art. 1º; Lei 9.323/1996 | 3% | R$ 1,00 | | faixa | Sim | Sim (limite 3%) |
| Esporte | Lei 11.438/2006 | 2% | R$ 1,00 | | R$ 0 | Não | Não (inclusão social: sim) |
| FIA; Fundo do Idoso | ECA, art. 260; Lei 12.213/2010 | 1% cada | R$ 1,00 | | R$ 0 | Não | Não |
| Pronon; Pronas | Lei 12.715/2012 | 1% cada | R$ 1,00 | | R$ 0 | Não | Não |

   Para PF, a tabela tem art. 18, art. 26 (60% e 80%), Audiovisual 1º-A, Audiovisual 1º (3%), FIA e Idoso (inclusive "na própria declaração, até 3%"), esporte (quando marcado, cesta de 7%).

3. Comparação "pagar imposto" contra "patrocinar" (seção 4.8), com o mecanismo em destaque selecionável por abas (art. 18 por padrão; art. 1º-A quando o interesse for audiovisual; art. 26 quando o visitante escolher) e o aporte editável (`desired_contribution`), recalculando na hora.
4. Cenário LC 224/2025 (PJ): a mesma tabela com e sem o fator 0,9, lado a lado, e o aviso da seção 7.
5. LIC-RS (quando aplicável): limite anual, repasse ao FAC, desembolso total, crédito de ICMS.
6. Prazos: "depósito até o último dia útil bancário de dezembro para valer no ano-calendário" (PF: `P.pf.prazo_aporte`); PJ trimestral: "a decisão é por trimestre".
7. Próximo passo: "Agendar diagnóstico gratuito com a Daniela e o seu contador" (formulário já preenchido com os dados do gate) e "Ver projetos em captação" (filtrados pelo mecanismo).
8. Nota técnica e fontes (seção 7) e botão "Baixar esta simulação em PDF" (versão 1.1; na versão 1, o e-mail com o resumo substitui).

### 5.3 Persistência e compartilhamento

- Cada simulação detalhada gera um registro `simulation` ligado ao lead: entradas, saídas, versão dos parâmetros (`P.atualizado_em`), `apply_lc224`, data. Serve para o diagnóstico (a Daniela abre a simulação no CRM) e para medir a aderência das faixas.
- URL do resultado: `/simulador/resultado/[token]`, token assinado e com validade de 30 dias, sem dados sensíveis na URL. O e-mail de confirmação (`estrutura-e-copy.md`, seção 5.6) leva esse link.
- Nada do simulador vai para o analytics com valor exato; só faixas (`tax_band`) e tipo (`estrutura-e-copy.md`, seção 9.2).

## 6. Captura de lead (gate)

Momento: ao clicar em "Ver resultado detalhado". O resumo já ficou visível; o formulário abre abaixo dele, sem esconder o número.

| Campo | PJ | PF | Validação | Destino no CRM |
|---|---|---|---|---|
| `nome` | obrigatório | obrigatório | 2 a 120 caracteres | `nome` |
| `email` | obrigatório | obrigatório | e-mail válido | `email` |
| `empresa` | obrigatório | | 2 a 120 | `empresa` |
| `cargo` | obrigatório | | `dono_ou_socio`, `financeiro`, `contabilidade`, `marketing_esg`, `outro` | `cargo` |
| `cidade`, `uf` | obrigatórios | obrigatórios | padrão | `cidade`, `uf` |
| `telefone` | opcional | opcional | E.164 | `telefone`; habilita WhatsApp |
| `contador_escritorio` | opcional | opcional | 2 a 120 | `contador_escritorio` / `contador_declaracao` |
| `consent_lgpd` | obrigatório | obrigatório | não pré-marcada | consentimento (texto em `estrutura-e-copy.md`, seção 5.1) |
| `consent_marketing` | opcional | opcional | não pré-marcada | |

Campos preenchidos automaticamente a partir da simulação: `segmento` (PJ ou PF), `tipo_pessoa`, `regime_tributario` ou `modelo_declaracao`, `irpj_faixa` ou `ir_devido_faixa` (derivada do valor informado, nunca o valor exato no campo de faixa; o valor exato fica só em `simulation`), `apuracao` (`period`), `interesse` (`rouanet`, `audiovisual` ou `lic_rs` conforme o mecanismo em destaque), `contribuinte_icms_rs`, `origem = simulador`, `source_detail` (UTM e referrer), `consent_version`, `consent_channels`.

Pipeline e estágio: `patrocinadores`, `novo`. Score calculado na criação (`personas-e-funis.md`, seção 5.2; origem `simulador` vale 7 pontos). Leads desqualificados por regime recebem a tag `desqualificado_rouanet` e, quando contribuinte de ICMS no RS, `interesse = lic_rs`; não vão para `perdido` automaticamente.

Depois do envio: o detalhe aparece na mesma página (sem recarregar), o e-mail de resumo é disparado e a página de obrigado não é usada (o resultado é a recompensa). Eventos: `simulator_gate_submit`, `lead_created` ou `lead_updated`, `simulator_detail_view`.

Visitante que já passou pelo gate (cookie de sessão assinado, 30 dias) vê o detalhe direto nas simulações seguintes; o lead é atualizado com a nova simulação.

## 7. Textos explicativos e avisos legais

Textos fixos, em português, exibidos conforme o contexto. Devem ser mantidos junto dos parâmetros (arquivo de textos do simulador), com a mesma data de revisão.

| Chave | Onde | Texto |
|---|---|---|
| `disclaimer_main` | todas as telas de resultado | "Esta simulação é uma estimativa com base na legislação vigente em [P.atualizado_em]. A apuração final do limite e a formalização do aporte são feitas pelo contador da empresa ou de quem declara, conforme as particularidades de cada caso. Conteúdo informativo; não substitui orientação contábil ou jurídica." (reaproveita a nota do guia) |
| `base_pj` | ajuda do campo IRPJ | "O limite é calculado sobre o imposto de renda à alíquota de 15% sobre o lucro real do período. O adicional de 10% (sobre o lucro acima de R$ 20 mil por mês) é recolhido integralmente e não entra na conta (Lei 9.249/1995, art. 3º, § 4º)." |
| `basket_pj` | tabela PJ | "Rouanet (arts. 18 e 26), Lei do Audiovisual (arts. 1º e 1º-A) e esporte de inclusão social dividem um único teto de 4% do imposto devido (Lei 9.532/1997, art. 6º, II; Solução de Consulta Cosit 4/2026). Esporte geral (2%), fundos da criança e do idoso, Pronon e Pronas (1% cada) têm tetos próprios." |
| `lc224_notice` | PJ, junto ao interruptor | "A Lei Complementar 224/2025 determinou redução linear de 10% em incentivos federais a partir de 01/01/2026. Pela leitura da Receita Federal, o limite de cultura passa a 3,6% do imposto devido; o Ministério da Cultura contesta (Parecer Conjur 69/2026). Mostramos os dois cenários. Pessoas físicas não são alcançadas. [verificar]" |
| `art26_notice` | linhas do art. 26 | "No art. 26 a dedução é parcial (30% do patrocínio ou 40% da doação para empresas; 60% ou 80% para pessoas físicas), mas a empresa no lucro real também lança o aporte como despesa operacional, o que reduz IRPJ e CSLL. O custo líquido é maior que zero e depende da apuração; mostramos uma faixa." |
| `donation_notice` | quando `contribution_type = doacao` | "Doação não admite promoção do doador: sem exposição de marca (Lei 8.313/1991, art. 23). Patrocínio permite contrapartidas promocionais." |
| `art1a_notice` | Audiovisual 1º-A | "Patrocínio a obra audiovisual brasileira independente aprovada pela Ancine, com dedução integral dentro do teto de 4% (PJ) ou 6% (PF). Não há participação em receita; vedada a dedução como despesa (Lei 8.685/1993, art. 1º-A, § 3º). Vigente até 2029 (Lei 15.132/2025)." |
| `art1_notice` | Audiovisual 1º | "Investimento em cotas de comercialização da obra (CVM), com participação nas receitas. Limite de 3% dentro da cesta. É um produto diferente do patrocínio; citado como referência." |
| `pf_deadline` | PF | "Para valer no ano-calendário, o depósito identificado com o seu CPF na conta do projeto precisa ocorrer até o último dia útil bancário de dezembro. Para cultura não existe a opção de doar na própria declaração; ela existe só para os fundos da criança e do idoso, até 3%. O valor entra na ficha 'Doações Efetuadas' da declaração do ano seguinte, com o recibo de mecenato." |
| `pf_basket` | PF | "O limite de 6% é compartilhado entre cultura, audiovisual, fundo da criança e fundo do idoso (Lei 9.532/1997, art. 22). Com esporte, o conjunto sobe para 7% (Lei 11.438/2006, art. 1º, § 1º, II)." |
| `pf_no_8pct` | PF, nota técnica | "Não existe limite de 8% para pessoa física na legislação federal vigente." |
| `disqualified_regime` | PJ presumido, arbitrado ou Simples | "A Lei Rouanet e a Lei do Audiovisual só permitem dedução para empresas tributadas pelo lucro real. [Se contribuinte de ICMS no RS fora do Simples:] Sua empresa pode patrocinar cultura pela Lei de Incentivo à Cultura do Rio Grande do Sul (LIC-RS), compensando o valor no ICMS. Veja abaixo." |
| `disqualified_model` | PF simplificada | "O modelo simplificado substitui todas as deduções por um desconto padrão; incentivos não são dedutíveis nele. Vale conferir com quem faz a sua declaração qual modelo compensa mais. Se você tiver deduções de saúde, educação e dependentes, a completa pode valer a pena, e aí o incentivo entra." |
| `no_tax` | imposto zero | "Sem imposto devido no período não há o que deduzir. Se a empresa espera lucro no próximo período, deixe seu contato e falamos antes do fechamento." |
| `lic_rs_notice` | LIC-RS | "Limite anual por faixa do ICMS próprio pago no ano anterior; a empresa compensa 100% do valor aplicado no ICMS a recolher após a Carta de Habilitação de Patrocínio, e repassa ao FAC 10% (demais editais: artes, produção e fruição) ou 5% (Edital para Patrimônio e Espaços Públicos de Cultura) como custo não incentivado (IN Sedac 1/2026, art. 19). Tabela de faixas da Lei 13.490/2010, art. 6º (redação da Lei 15.449/2020); Decreto 57.531/2024; IN Sedac 1/2026. Confirme a tabela vigente com a Sedac ou com o contador. [verificar]" |
| `band_notice` | entrada por faixa | "Resultado em intervalo. Para o número exato, informe o imposto devido ou peça ao contador a apuração do período." |
| `over_cap` | aporte acima do teto | "Acima de R$ [teto] o excedente não é dedutível. Você pode destinar mais, mas o custo líquido sobe no valor que passar do limite." |
| `sources_footer` | nota técnica | Lista de fontes de `P.fontes` relevantes ao resultado, com lei, artigo e link, mais "Parâmetros atualizados em [P.atualizado_em]; ver `docs/dominio/leis-de-incentivo.md`." |
| `no_financial_return` | nota técnica | "Patrocínio incentivado não devolve dinheiro ao patrocinador; devolve dedução e contrapartidas. Qualquer vantagem financeira ao incentivador é vedada." |

## 8. Estados de erro e vazios

| Estado | Gatilho | Comportamento |
|---|---|---|
| `validation_error` | campo vazio, formato inválido, enum fora da lista, combinação inválida | Mensagem sob o campo e resumo no topo; foco no primeiro erro; nada é calculado |
| `no_tax` | imposto devido ou lucro igual a zero | Tela de resultado substituída pelo texto `no_tax` com formulário curto (nome, e-mail, consentimento) e tag `sem_irpj` no lead |
| `disqualified` (`regime`) | presumido, arbitrado ou Simples | Texto `disqualified_regime`; módulo LIC-RS quando aplicável; gate continua disponível ("quero saber de outras formas de apoiar") |
| `disqualified` (`modelo_simplificado`) | PF simplificada | Texto `disqualified_model`; gate disponível |
| `unknown_regime` / `unknown_model` | `nao_sei` | Calcula com faixa amarela "válido se lucro real / declaração completa"; lead marcado `regime_tributario = nao_sei` |
| `band_only` | faixa escolhida | Resultados em intervalo; `tax_band = nao_sei` mostra a tabela de exemplos (`P.exemplos`) em vez de calcular |
| `over_cap` | aporte acima do teto | Aviso `over_cap`; cálculo com dedução travada |
| `too_large` | valor acima de R$ 1 bilhão (PJ) ou R$ 100 milhões (PF) | Pede confirmação ("confirme o valor; parece alto"); segue se confirmado |
| `params_unavailable` | JSON não carregou ou falhou na validação de esquema no build | Build falha (o esquema é verificado em CI); em execução, página mostra "simulador temporariamente indisponível" e o formulário de diagnóstico |
| `params_stale` | `P.atualizado_em` com mais de 180 dias | Faixa discreta "parâmetros revisados em [data]; confirme com o contador" (não bloqueia) |
| `lead_save_failed` | erro ao gravar o lead | Mostra o detalhe mesmo assim (o visitante já preencheu), registra o erro, tenta novamente em segundo plano e avisa a equipe por e-mail |
| `token_invalid` | link de resultado expirado ou inválido | "Esta simulação expirou. Faça uma nova em 1 minuto." com botão |
| `offline` | sem rede durante o gate | Mantém o formulário preenchido e pede para tentar de novo |

## 9. Exemplos de cálculo esperados (testes)

Convenções dos testes: valores em reais com duas casas; `factor` da LC 224 é 0,9 quando "LC 224 = sim"; `t_min = 0,24` e `t_max = 0,34` (seção 4.5). Os casos T-PJ-01 a T-PJ-06, T-PF-01, T-PF-02 e T-LIC-01 a T-LIC-04 reproduzem `P.exemplos`; os demais são casos de borda. Qualquer mudança no JSON que altere estes valores deve atualizar o JSON e os testes juntos.

### 9.1 Pessoa jurídica: limites

| ID | Entrada | LC 224 | Cesta cultural (4%) | Audiovisual art. 1º (3%) | Esporte (2%) | FIA, Idoso, Pronon, Pronas (1% cada) | Total máximo | Aporte art. 26 patrocínio para o teto | Aporte art. 26 doação para o teto |
|---|---|---|---|---|---|---|---|---|---|
| T-PJ-01 | `tax_due = 500.000,00` | não | 20.000,00 | 15.000,00 | 10.000,00 | 5.000,00 cada | 50.000,00 | 66.666,67 | 50.000,00 |
| T-PJ-02 | `tax_due = 500.000,00` | sim | 18.000,00 | 13.500,00 | 9.000,00 | 4.500,00 cada | 45.000,00 | 60.000,00 | 45.000,00 |
| T-PJ-03 | `tax_due = 2.000.000,00` | não | 80.000,00 | 60.000,00 | 40.000,00 | 20.000,00 cada | 200.000,00 | 266.666,67 | 200.000,00 |
| T-PJ-04 | `tax_due = 2.000.000,00` | sim | 72.000,00 | 54.000,00 | 36.000,00 | 18.000,00 cada | 180.000,00 | 240.000,00 | 180.000,00 |
| T-PJ-05 | `tax_due = 10.000.000,00` | não | 400.000,00 | 300.000,00 | 200.000,00 | 100.000,00 cada | 1.000.000,00 | 1.333.333,33 | 1.000.000,00 |
| T-PJ-17 | `tax_due = 123.456,78` | não / sim | 4.938,27 / 4.444,44 | 3.703,70 / 3.333,33 | 2.469,14 / 2.222,22 | 1.234,57 / 1.111,11 cada | 12.345,69 / 11.111,10 | 16.460,90 / 14.814,80 | 12.345,68 / 11.111,10 |

Regra de arredondamento fixada por T-PJ-17: cada limite é arredondado individualmente a duas casas e o total é a soma dos limites arredondados (4.938,27 + 2.469,14 + 4 × 1.234,57 = 12.345,69), não o cálculo direto sobre a base (123.456,78 × 0,10 = 12.345,68). A tela mostra o total somado.

### 9.2 Pessoa jurídica: a partir do lucro real

| ID | Entrada | IRPJ 15% (base) | Adicional 10% (informativo) | Cesta cultural 4% | Cesta com LC 224 |
|---|---|---|---|---|---|
| T-PJ-06 | `taxable_profit = 3.333.333,33`, `period = annual` | 500.000,00 | 309.333,33 | 20.000,00 | 18.000,00 |
| T-PJ-07 | `taxable_profit = 1.000.000,00`, `period = quarterly` | 150.000,00 | 94.000,00 | 6.000,00 | 5.400,00 |
| T-PJ-08 | `taxable_profit = 200.000,00`, `period = annual` | 30.000,00 | 0,00 | 1.200,00 | 1.080,00 |
| T-PJ-18 | `taxable_profit = 240.000,00`, `period = annual` | 36.000,00 | 0,00 | 1.440,00 | 1.296,00 |

### 9.3 Pessoa jurídica: custo líquido e comparação

| ID | Entrada | Mecanismo e aporte | Dedução | Economia operacional (min a max) | Custo líquido (min a max) | DARF no cenário B | Desembolso total B |
|---|---|---|---|---|---|---|---|
| T-PJ-14a | `tax_due = 500.000,00`, LC 224 não | art. 26 patrocínio, `A = 66.666,67` | 20.000,00 | 16.000,00 a 22.666,67 | 24.000,00 a 30.666,67 | 480.000,00 | 524.000,00 a 530.666,67 |
| T-PJ-14b | idem | art. 26 doação, `A = 50.000,00` | 20.000,00 | 12.000,00 a 17.000,00 | 13.000,00 a 18.000,00 | 480.000,00 | 513.000,00 a 518.000,00 |
| T-PJ-15 | idem | art. 18, `A = 20.000,00` (teto) | 20.000,00 | 0,00 | 0,00 | 480.000,00 | 500.000,00 (igual ao cenário A) |
| T-PJ-16 | idem | art. 18, `A = 30.000,00` | 20.000,00 (travada) | 0,00 | 10.000,00 | 480.000,00 | 510.000,00; aviso `over_cap` |
| T-PJ-19 | idem | art. 1º-A, `A = 12.000,00` | 12.000,00 | 0,00 | 0,00 | 488.000,00 | 500.000,00 |
| T-PJ-20 | `tax_due = 500.000,00`, LC 224 sim | art. 18, `A = 20.000,00` | 18.000,00 (travada) | 0,00 | 2.000,00 | 482.000,00 | 502.000,00; aviso `over_cap` |

Para "min a max": `custo_min = A − dedução − A × t_max`; `custo_max = A − dedução − A × t_min`.

### 9.4 Pessoa jurídica: faixas e desqualificação

| ID | Entrada | Esperado |
|---|---|---|
| T-PJ-13 | `tax_band = 500k_2500k`, LC 224 não / sim | Cesta "entre 20.000,00 e 100.000,00" / "entre 18.000,00 e 90.000,00"; total "entre 50.000,00 e 250.000,00" / "entre 45.000,00 e 225.000,00" |
| T-PJ-21 | `tax_band = acima_2500k`, LC 224 não | Cesta "acima de 100.000,00"; sem limite superior |
| T-PJ-22 | `tax_band = nao_sei` | Estado `band_only` com tabela de `P.exemplos.pj`; lead com `irpj_faixa = nao_sei` |
| T-PJ-09 | `regime = lucro_presumido`, `icms_contributor_rs = sim`, `icms_prior_year = 500.000,00` | `disqualified`, `reason = regime`; módulo LIC-RS com T-LIC-01; lead com tag `desqualificado_rouanet` e `interesse = lic_rs` |
| T-PJ-10 | `regime = simples_nacional` | `disqualified`; sem LIC-RS; lead com tag `desqualificado_rouanet` |
| T-PJ-23 | `regime = lucro_arbitrado`, `icms_contributor_rs = nao` | `disqualified`; sem LIC-RS |
| T-PJ-11 | `tax_due = 0` | `no_tax` |
| T-PJ-12 | `tax_due = -1` ou `"abc"` | `validation_error` |
| T-PJ-24 | `regime = nao_sei`, `tax_due = 500.000,00` | Mesmos números de T-PJ-01 com aviso `unknown_regime` |
| T-PJ-25 | `input_mode = taxable_profit` sem `period` | `validation_error` |

### 9.5 Pessoa física

| ID | Entrada | Cesta 6% | Cesta 7% (com esporte) | Aporte art. 18 ou 1º-A para o teto | Aporte art. 26 doação | Aporte art. 26 patrocínio | Audiovisual art. 1º (3%) | FIA ou Idoso na declaração (3%) |
|---|---|---|---|---|---|---|---|---|
| T-PF-01 | `tax_due = 20.000,00` | 1.200,00 | 1.400,00 | 1.200,00 | 1.500,00 | 2.000,00 | 600,00 | 600,00 |
| T-PF-02 | `tax_due = 80.000,00` | 4.800,00 | 5.600,00 | 4.800,00 | 6.000,00 | 8.000,00 | 2.400,00 | 2.400,00 |
| T-PF-09 | `tax_due = 33.333,33` | 2.000,00 | 2.333,33 | 2.000,00 | 2.500,00 | 3.333,33 | 1.000,00 | 1.000,00 |

| ID | Entrada | Esperado |
|---|---|---|
| T-PF-05 | `tax_due = 20.000,00`, art. 26 doação no teto (`A = 1.500,00`) | Dedução 1.200,00; custo líquido 300,00; imposto no cenário B 18.800,00; desembolso total 20.300,00 |
| T-PF-10 | `tax_due = 20.000,00`, art. 26 patrocínio no teto (`A = 2.000,00`) | Dedução 1.200,00; custo líquido 800,00; desembolso total 20.800,00 |
| T-PF-08 | `tax_due = 20.000,00`, art. 18, `A = 1.200,00` | Dedução 1.200,00; custo 0,00; imposto B 18.800,00; desembolso total 20.000,00 |
| T-PF-06 | `tax_due = 20.000,00`, `apply_lc224 = true` (forçado) | Resultado igual a T-PF-01 (fator ignorado para PF); interruptor não exibido |
| T-PF-07 | `tax_band = 20k_80k` | Cesta "entre 1.200,00 e 4.800,00" |
| T-PF-03 | `declaration_model = simplificada` | `disqualified`, `reason = modelo_simplificado`; lead com `modelo_declaracao = simplificada` e tag `fora_do_icp` |
| T-PF-04 | `tax_due = 0` | `no_tax` |
| T-PF-11 | `declaration_model = nao_sei`, `tax_due = 20.000,00` | Números de T-PF-01 com aviso `unknown_model` |

### 9.6 LIC-RS

| ID | `icms_prior_year` | Segmento | Limite anual | Repasse ao FAC | Desembolso total | Crédito de ICMS | Custo líquido |
|---|---|---|---|---|---|---|---|
| T-LIC-01 | 500.000,00 | `demais_editais` (10%) | 100.000,00 | 10.000,00 | 110.000,00 | 100.000,00 | 10.000,00 |
| T-LIC-02 | 1.000.000,00 | `demais_editais` | 180.000,00 | 18.000,00 | 198.000,00 | 180.000,00 | 18.000,00 |
| T-LIC-03 | 2.000.000,00 | `demais_editais` | 290.000,00 | 29.000,00 | 319.000,00 | 290.000,00 | 29.000,00 |
| T-LIC-04 | 5.000.000,00 | `demais_editais` | 460.000,00 | 46.000,00 | 506.000,00 | 460.000,00 | 46.000,00 |
| T-LIC-05 | 600.000,00 | `demais_editais` | 120.000,00 | 12.000,00 | 132.000,00 | 120.000,00 | 12.000,00 |
| T-LIC-06 | 600.000,01 | `demais_editais` | 120.000,00 | 12.000,00 | 132.000,00 | 120.000,00 | 12.000,00 |
| T-LIC-07 | 500.000,00 | `edital_patrimonio_e_espacos_publicos` (5%) | 100.000,00 | 5.000,00 | 105.000,00 | 100.000,00 | 5.000,00 |
| T-LIC-08 | 2.400.000,01 | `demais_editais` | 330.000,00 | 33.000,00 | 363.000,00 | 330.000,00 | 33.000,00 |
| T-LIC-09 | 0,00 | `demais_editais` | 0,00 | 0,00 | 0,00 | 0,00 | Estado `no_tax` (sem ICMS no ano anterior) |

### 9.7 Arredondamento e formatação

| ID | Entrada | Esperado |
|---|---|---|
| T-FMT-01 | `"R$ 1.234.567,89"` | normaliza para 1234567.89 |
| T-FMT-02 | `"1234567.89"` | 1234567.89 |
| T-FMT-03 | `"1.234"` | 1234.00 (ponto como separador de milhar quando não há vírgula) |
| T-FMT-04 | 20.000 / 0,30 | 66.666,67 (meio para cima na segunda casa) |
| T-FMT-05 | 2.000,005 | 2.000,01 |
| T-FMT-06 | saída em tela de 66666.67 | "R$ 66.666,67" (`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`) |

### 9.8 Esquema do JSON

| ID | Verificação |
|---|---|
| T-SCH-01 | `P.regras_gerais.grupos_de_limite_compartilhado.cesta_cultural_pj.limite_percentual` é 4 e inclui `rouanet_art18`, `rouanet_art26_patrocinio`, `rouanet_art26_doacao`, `audiovisual_art1`, `audiovisual_art1A` |
| T-SCH-02 | `P.pf.limite_percentual_cesta` é 6 e `limite_percentual_cesta_com_esporte` é 7 |
| T-SCH-03 | `P.regras_gerais.lc_224_2025.fator_pj` está entre 0 e 1 e `aplica_a_pf` é falso |
| T-SCH-04 | Todo mecanismo usado pelo simulador tem `fonte` e `status` |
| T-SCH-05 | `P.atualizado_em` é uma data válida; teste de alerta se tiver mais de 180 dias em relação à data do build (aviso, não falha) |
| T-SCH-06 | As faixas de `lic_rs.limite_por_faixa_icms_ano_anterior` são contínuas (o limite calculado no fim de uma faixa é igual ao do início da seguinte, com tolerância de R$ 0,01) |
| T-SCH-07 | Contrato de chaves: todo caminho do JSON lido pelo código existe, com o tipo esperado. Lista mínima: `regras_gerais.pj_regimes_elegiveis`, `regras_gerais.pj_regimes_nao_elegiveis`, `regras_gerais.lc_224_2025.{fator_pj, aplicar_por_padrao, aplica_a_pf}`, `regras_gerais.grupos_de_limite_compartilhado.*_pj.limite_percentual`, `mecanismos.*.{quem_pode, limite_percentual, percentual_dedutivel, trata_como_despesa_operacional, fonte, status}`, `mecanismos.lic_rs.{limite_por_faixa_icms_ano_anterior, limite_por_faixa_status, repasse_adicional_fac_percentual, repasse_adicional_incentivado_rai}`, `pf.{limite_percentual_cesta, limite_percentual_cesta_com_esporte, percentual_dedutivel, limite_individual_audiovisual_art1, doacao_na_declaracao, prazo_aporte, onde_declarar, lc_224_aplica}`, `exemplos.{pj, pf, lic_rs}`, `atualizado_em`, `fontes`. O teste falha no build se um caminho faltar ou mudar de tipo (esquema Zod de `params.ts`, seção 12) |
| T-SCH-08 | O enum `lic_rs_segment` do formulário (seção 3.2) é exatamente o conjunto de chaves de `mecanismos.lic_rs.repasse_adicional_fac_percentual`; o teste gera o enum a partir do JSON e compara com os valores aceitos pelo Zod do formulário |

## 10. Layout em telas

Mobile first; os mesmos componentes do site (`estrutura-e-copy.md`, seção 7.4). Progresso indicado por "Passo 1 de 3" em texto, não só por barra. Cada tela cabe sem rolagem horizontal; no celular, os números grandes vêm antes das tabelas.

### Tela 1: Quem está simulando

- Eyebrow: SIMULADOR DE INCENTIVO FISCAL. Título: "Quanto do seu imposto pode virar cultura?"
- Dois cartões grandes, selecionáveis por teclado: "Minha empresa" (ícone textual "PJ"; linha "tributada pelo lucro real") e "Eu, pessoa física" ("PF"; "declaração pelo modelo completo").
- Abaixo: "Não sabe o regime da empresa? Escolha 'Minha empresa' e marque 'não sei' no próximo passo."
- Rodapé da tela: `disclaimer_main` resumido em uma linha e link para a nota técnica.

### Tela 2 (PJ): Dados da empresa

- Campo `regime` (botões de rádio em lista: Lucro real; Lucro presumido; Simples Nacional; Lucro arbitrado; Não sei). Ao escolher presumido, arbitrado ou Simples: aparece `icms_contributor_rs` e, se sim ou não sei, `icms_prior_year` e `lic_rs_segment`; o botão passa a dizer "Ver o que é possível".
- Alternador `input_mode` com três abas: "Sei o IRPJ devido" (padrão), "Sei o lucro estimado", "Sei só a faixa". Um campo de moeda grande (ou a lista de faixas) e, na aba de lucro, o seletor `period` (Anual, Trimestral). Ajuda `base_pj` em texto expansível.
- Opcional, recolhido: "Quanto pensa em destinar?" (`desired_contribution`) e tipo (Patrocínio, Doação).
- Botão "Calcular". Erros inline.

### Tela 2 (PF): Dados da declaração

- `declaration_model` (Completa; Simplificada; Não sei), com ajuda.
- Abas "Sei o imposto devido" e "Sei só a faixa"; campo de moeda ou lista de faixas; caixa "Também quero apoiar esporte" (`includes_sport`).
- Opcional recolhido: aporte desejado e tipo.
- Botão "Calcular".

### Tela 3: Resultado resumido e cadastro

- Número grande em serifa: "Até R$ 18.000,00" com a legenda "do IRPJ da sua empresa podem ir para projetos culturais (3,6% com a LC 224/2025; R$ 20.000,00 sem a redução)". Para PF: "Até R$ 1.200,00 do seu imposto de renda".
- Duas linhas de contexto (seção 5.1) e, para PJ, "até R$ 45.000,00 somando todos os incentivos".
- Estados especiais substituem o número: `disqualified`, `no_tax`, `band_only` (intervalo).
- Bloco "Ver resultado detalhado": lista do que o detalhe traz (tabela por mecanismo, comparação pagar contra patrocinar, cenários da LC 224, prazos, PDF) e o formulário do gate (seção 6), com as duas caixas de consentimento e o botão "Ver resultado detalhado".
- Link secundário: "Prefiro falar agora no WhatsApp" (mensagem pré-preenchida com a faixa, nunca o valor exato, salvo se o visitante editar).

### Tela 4: Resultado detalhado

- Cabeçalho: "Simulação de [Empresa ou Nome], [data]; parâmetros de [P.atualizado_em]". Botões: "Agendar diagnóstico", "Enviar por e-mail" (já enviado; reenvio), "Baixar PDF" (versão 1.1).
- Bloco 1: base de cálculo (conta aberta).
- Bloco 2: interruptor "Aplicar redução da LC 224/2025" (PJ) com `lc224_notice`; a tabela por mecanismo recalcula ao alternar.
- Bloco 3: tabela por mecanismo (seção 5.2). No celular vira uma lista de cartões, um por mecanismo, com o teto em destaque e "ver detalhes" para as demais colunas.
- Bloco 4: comparação "pagar imposto" contra "patrocinar": abas por mecanismo (Art. 18 | Art. 1º-A | Art. 26 patrocínio | Art. 26 doação | LIC-RS quando houver), campo de aporte editável com o teto como valor inicial, duas colunas (cenário A, cenário B) que viram linhas empilhadas no celular; destaque "Custo adicional: R$ 0,00" quando for zero.
- Bloco 5: prazos e próximos passos (depósito até dezembro; trimestral decide por trimestre; "a Prospekto cuida de termo, recibo e prestação de contas").
- Bloco 6: projetos em captação compatíveis (até três cartões) com "Quero patrocinar este projeto".
- Bloco 7: nota técnica (textos da seção 7 pertinentes) e fontes.
- Rodapé fixo no celular: "Agendar diagnóstico" e "WhatsApp".

### Tela 5: Diagnóstico (continuação)

- Ao clicar em "Agendar diagnóstico", o formulário de `/diagnostico` abre já preenchido com os dados do gate e com `simulation_id`; o visitante completa telefone, disponibilidade e, se quiser, o escritório contábil. Após o envio, `/obrigado/diagnostico`.

### Estados visuais

- Carregando: esqueleto do número grande (sem spinner animado quando `prefers-reduced-motion`).
- Aviso (amarelo escuro sobre areia, com ícone textual "Atenção"): `unknown_regime`, `params_stale`, `over_cap`, `lc224_notice`.
- Erro (vermelho-escuro com texto): validação, `token_invalid`, `params_unavailable`.
- Sucesso (verde-escuro): "Resultado enviado para [e-mail]".

## 11. Parâmetros a acrescentar ao JSON (sem editar aqui)

Este documento não altera `parametros-simulador.json`. Para o código não carregar literais, propõe-se acrescentar, em tarefa própria, com fonte e `status`:

| Caminho | Valor proposto | Fonte a citar | Status |
|---|---|---|---|
| `regras_gerais.pj_apuracao.aliquota_irpj` | 15 | Lei 9.249/1995, art. 3º, caput | verificado (já descrito em texto em `pj_base_de_calculo`) |
| `regras_gerais.pj_apuracao.aliquota_adicional` | 10 | Lei 9.249/1995, art. 3º, § 1º | verificado (idem) |
| `regras_gerais.pj_apuracao.parcela_isenta_adicional_mensal` | 20000 | Lei 9.249/1995, art. 3º, § 1º | verificado (idem) |
| `regras_gerais.pj_apuracao.aliquota_csll` | 9 | Lei 7.689/1988, art. 3º | verificar |
| `regras_gerais.faixas_irpj` e `pf.faixas_ir_devido` | limites das faixas da seção 4.2 e 4.6 | `personas-e-funis.md`, seção 9.3 | contrato com o CRM |
| `regras_gerais.limites_entrada` | `pj_max: 1000000000`, `pf_max: 100000000` | decisão de produto | n/a |
| `textos` ou arquivo irmão `textos-simulador.json` | textos da seção 7 com `revisado_em` | este documento | n/a |

## 12. Arquitetura (resumo para a implementação)

- `src/lib/simulator/params.ts`: carrega e valida o JSON (esquema Zod; falha no build se inválido).
- `src/lib/simulator/simulate.ts`: função pura `simulate(input: SimulatorInput, params: SimulatorParams): SimulatorResult`, sem acesso a rede ou banco; cobre PJ, PF e LIC-RS; devolve `status` (`ok`, `disqualified`, `no_tax`, `band_only`) e as estruturas das seções 4 e 5.
- `src/lib/simulator/format.ts`: parse e formatação de moeda pt-BR.
- `src/lib/simulator/simulate.test.ts`: os casos da seção 9, um `it` por ID.
- `src/app/(site)/simulador/page.tsx` e componentes cliente para as telas; Server Action `submitSimulatorLead` para o gate (cria lead, grava `simulation`, dispara e-mail, devolve o detalhe); rota `src/app/(site)/simulador/resultado/[token]/page.tsx`.
- Eventos de analytics conforme `estrutura-e-copy.md`, seção 9.2.

## 13. Decisões registradas e perguntas em aberto

### 13.1 Decisões que mudam o número da primeira tela

Registradas aqui para destravar a implementação; cada uma indica onde fica o registro definitivo e o que faria a decisão ser revista. Um ADR curto (`docs/arquitetura/ADR-002-defaults-simulador.md`, a criar em tarefa própria; este documento não cria arquivos fora de `docs/site/`) deve repetir as duas decisões com data e responsável.

| ID | Decisão | Fundamento | Registro | Revisar quando |
|---|---|---|---|---|
| D1 | A LC 224/2025 é aplicada por padrão na PJ: o número grande da Tela 3 é o de 3,6% (fator 0,9), com "R$ [4%] sem a redução" logo abaixo e o interruptor visível com `lc224_notice`. O JSON já diz `regras_gerais.lc_224_2025.aplicar_por_padrao: true`; o código lê esse campo e não decide por conta própria | A Receita Federal confirmou a redução para a Rouanet (P&R V5, pergunta 21.1, 30/07/2026; `leis-de-incentivo.md`, seção 2.5). Mostrar o número menor primeiro evita prometer um teto que o contador pode não confirmar; o número de 4% continua na tela e nas campanhas como teto legal | `parametros-simulador.json` (`aplicar_por_padrao`, já em `true`); ADR-002; `estrutura-e-copy.md` e `campanhas.md` passam a citar "até 4% (3,6% com a LC 224/2025)" onde hoje citam só "4%" [ajuste nesses arquivos fica para a revisão dos playbooks; não é editado aqui] | PLP 11/2026 aprovado, decisão judicial ou nova versão do P&R da Receita que retire a Rouanet da redução: trocar `aplicar_por_padrao` para `false` no JSON e manter o interruptor |
| D2 | O módulo LIC-RS é publicado na versão 1 com o aviso `lic_rs_notice` e a marca [verificar], e não como "fale conosco" | A tabela de faixas bate em três fontes secundárias independentes, a página oficial da Sedac confirma a amplitude "de 5% a 20%" e o JSON já carrega `limite_por_faixa_status: "verificar"` com a nota de origem (`P.mecanismos.lic_rs.limite_por_faixa_nota`). O aviso na tela e a ressalva `disclaimer_main` cobrem o risco; esconder o módulo deixaria o lead presumido ou arbitrado sem a única alternativa que existe para ele | `parametros-simulador.json` (`limite_por_faixa_status`); ADR-002; seção 4.7 e texto `lic_rs_notice` | Texto da Lei 13.490/2010, art. 6º, conferido na AL-RS ou resposta da Sedac: mudar `limite_por_faixa_status` para `verificado` e retirar a marca. Se a conferência mostrar tabela diferente, corrigir o JSON e os testes T-LIC-01 a T-LIC-09 juntos (seção 9) |

Enquanto o ADR-002 não existir, esta tabela é o registro da decisão; o `aplicar_por_padrao` do JSON continua sendo a fonte lida pelo código.

### 13.2 Perguntas em aberto

1. Comunicação da D1 com a Daniela: confirmar que ela concorda em mostrar o número menor primeiro (3,6%) e em usar "até 4% (3,6% com a LC 224/2025)" nas peças. A decisão técnica já está tomada e registrada em 13.1; só a comunicação externa depende dela.
2. Alíquota de CSLL e tratamento do adicional na faixa de custo líquido do art. 26: validar com um contador parceiro antes de publicar (seção 4.5).
3. Tabela de faixas da LIC-RS: decidido publicar com aviso (seção 13.1, decisão D2). Pendência que resta: abrir o texto da Lei 13.490/2010, art. 6º (redação da Lei 15.449/2020), na AL-RS e conferir com a Sedac; depois disso, trocar `limite_por_faixa_status` para `verificado` no JSON e retirar a marca [verificar] dos textos `lic_rs_notice` e da seção 4.7.
4. PDF da simulação na versão 1 ou só e-mail?
5. O resultado detalhado deve listar projetos reais da carteira desde o lançamento, ou só depois que houver pelo menos três publicáveis?

## 14. Fontes

| Fonte | Uso |
|---|---|
| `docs/dominio/parametros-simulador.json` (atualizado em 03/10/2026) | Todos os percentuais, limites, faixas da LIC-RS, prazos e exemplos |
| `docs/dominio/leis-de-incentivo.md`, seções 2.3, 2.5, 3, 6.1, 7, 8 e 10.2 | Base de cálculo, LC 224, Audiovisual, LIC-RS (base legal vigente: Lei 13.490/2010, Lei 15.449/2020, Decreto 57.531/2024, IN Sedac 1/2026; Decreto 55.448/2020 revogado), tabela comparativa, exemplos, promessas que a lei não sustenta |
| Lei 8.313/1991, arts. 18, 23 e 26; Lei 9.532/1997, arts. 5º, 6º e 22; Lei 9.249/1995, art. 3º; Lei 9.250/1995, art. 12; Lei 8.685/1993, arts. 1º e 1º-A; Lei 15.132/2025; Lei 11.438/2006 (Lei 14.439/2022); ECA, arts. 260 e 260-A; Lei 12.213/2010; Lei 13.797/2019; Lei 12.715/2012; SC Cosit 4/2026; LC 224/2025; Lei 13.490/2010, art. 6º (redação da Lei 15.449/2020); Decreto 57.531/2024; IN Sedac 1/2026 [verificar: texto da Lei 13.490/2010 não aberto na AL-RS em 03/10/2026; o Decreto 55.448/2020 está revogado pelo Decreto 57.531/2024, art. 24, e só pode ser citado como histórico] | Citadas na tela via `P.fontes` e `P.mecanismos[*].fonte`; URLs em `docs/dominio/leis-de-incentivo.md`, seção 11 |
| `docs/estrategia/personas-e-funis.md`, seções 2, 5, 6, 8.1 e 9 | Códigos de faixa, score, pipeline, estágio e campos do lead |
| `docs/site/estrutura-e-copy.md`, seções 5, 7, 9 e 10 | Consentimento, componentes, analytics, e-mail e WhatsApp |
| Guia "Contabilizando Cultura", nota final | Texto base da ressalva |
