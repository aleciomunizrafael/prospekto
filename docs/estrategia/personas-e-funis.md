# Personas e funis

> Define quem a Prospekto prospecta, como qualifica e como o CRM deve ser modelado. Deriva de `docs/visao.md` (não repete o que está lá), de `docs/estrategia/mercado-e-posicionamento.md` (números de mercado) e de `docs/dominio/leis-de-incentivo.md` (regras legais). Fontes consultadas em 03/10/2026; o que não foi confirmado está marcado com "[verificar]". Metas numéricas são hipóteses até a Daniela trazer o histórico real da Prospekto.
>
> Os nomes de segmento, de estágio de pipeline e de campo definidos aqui são contrato com o código: o CRM usa estes nomes literalmente.

## 1. Resumo

- Seis personas, em dois lados do mesmo mercado: quem tem imposto para destinar (empresa no lucro real, pessoa física na declaração completa) e quem precisa de dinheiro ou de método (município, proponente, aspirante a captador). O escritório contábil fica no meio como canal: tem a lista de elegíveis e a confiança do empresário.
- O lead que importa na Fase 1 é a empresa no lucro real da Serra Gaúcha com IRPJ devido acima de R$ 500 mil por ano, chegada por indicação de contador. Esse lead vale, dentro do limite de 4%, aportes de R$ 20 mil para cima, a faixa citada pelo sócio nos áudios e compatível com o ticket regional (`mercado-e-posicionamento.md`, seção 3.4).
- O calendário manda no funil: 59% dos aportes de 2025 caíram no 4º trimestre (`mercado-e-posicionamento.md`, seção 3.5). Prospecção de janeiro a agosto, fechamento de setembro a dezembro, renovação em janeiro.
- O CRM tem cinco pipelines com nomes estáveis: `patrocinadores` (PJ e PF), `contadores`, `municipios`, `projetos` e `alunos`. Cada estágio tem critério de entrada, critério de saída e SLA de follow-up (seção 8).
- A qualificação é um score de 0 a 100 por segmento, com desqualificação automática para o que a lei não permite (Simples ou presumido na Rouanet; vinculação entre patrocinador e proponente). O score não substitui a conversa; ordena a fila.
- Todo formulário do site coleta o mínimo, pede consentimento explícito (LGPD, art. 8º) e registra data, versão da política e origem. CPF e CNPJ completos só entram no CRM quando há termo em andamento.

## 2. Convenções

| Código de segmento | Quem | Pipeline do CRM |
|---|---|---|
| `PJ` | Empresa no lucro real (patrocinador pessoa jurídica) | `patrocinadores` |
| `PF` | Pessoa física na declaração completa | `patrocinadores` |
| `CONT` | Escritório de contabilidade (parceiro de canal) | `contadores` |
| `MUN` | Município ou secretaria de cultura | `municipios` |
| `PROP` | Proponente ou produtora cultural (lado da oferta) | `projetos` |
| `ALUNO` | Aspirante a elaborador ou captador (produto digital) | `alunos` |

Temperatura do lead: `frio` (score abaixo de 40), `morno` (40 a 69), `quente` (70 ou mais). Fonte do lead (`origem`): `site`, `guia`, `simulador`, `diagnostico`, `linkedin`, `indicacao_contador`, `indicacao_cliente`, `evento`, `campanha`, `whatsapp`, `outro`.

## 3. ICPs e personas

### 3.1 PJ: empresa no lucro real

**ICP (quem entra na lista).** Empresa tributada pelo lucro real, com IRPJ devido no período (lucro, não prejuízo), sede ou unidade na Serra Gaúcha ou no RS, com interesse em marca, comunidade ou ESG. Obrigadas ao lucro real: receita total acima de R$ 78 milhões no ano anterior, instituições financeiras e outras hipóteses do art. 14 da Lei 9.718/1998 (fonte: https://modeloinicial.com.br/lei/L-9718-1998/lei-9718/art-14); também entram as optantes. Na Serra, o perfil típico é indústria metalmecânica, moveleira, vinícola ou de transporte, além de cooperativas e redes de varejo regionais [verificar com os contadores parceiros quantos clientes têm nesse regime]. Fora do ICP para a Rouanet: Simples Nacional e lucro presumido (`leis-de-incentivo.md`, seção 2.3); essas empresas, se contribuintes de ICMS no RS, vão para a oferta LIC-RS (seção 6.1 do mesmo documento).

**Personas e papéis.**

| Papel | Quem | O que quer ouvir | O que decide |
|---|---|---|---|
| Decisor financeiro | CFO, controller, gerente financeiro ou contador interno | "Quanto do IRPJ posso destinar, qual o custo líquido, como lanço na ECF, qual o risco" | Aprova o valor e o enquadramento; é quem assina o termo em empresas grandes junto com a diretoria |
| Influenciador | Marketing, comunicação, ESG, RH (quando o projeto envolve colaboradores) | "Que projeto, que contrapartida, que visibilidade, que história para contar" | Escolhe o projeto na carteira e defende internamente |
| Dono | Sócio-diretor em médias empresas (familiares, típicas da Serra) | "Isso é seguro? O que a cidade vai ver? Meu contador concorda?" | Decide sozinho; costuma pedir a opinião do contador antes de assinar |

**Dores.** Paga IRPJ cheio sem saber que pode escolher o destino de até 4% (3,6% na leitura da Receita sobre a LC 224/2025, `leis-de-incentivo.md`, seção 2.5); teme fiscalização e burocracia; não tem projeto de confiança; não tem tempo para operar SALIC, termo e recibo; já foi abordado por captadores de fora com projetos sem relação com a região.

**Ganhos.** Marca associada a projeto cultural na própria cidade; relacionamento com comunidade, clientes e poder público local; conteúdo para comunicação interna e externa; narrativa ESG com comprovante oficial (recibo de mecenato); custo líquido zero dentro do teto nos arts. 18 (Rouanet) e 1º-A (Audiovisual) (`leis-de-incentivo.md`, seção 8.1).

**Objeções (mitos do guia, ampliados).** O guia "Contabilizando Cultura" responde a dois mitos (fiscalização e "só grandes artistas"). A prospecção encontra mais; a tabela abaixo é o roteiro de resposta.

| Objeção | Resposta curta | Base |
|---|---|---|
| "Vai dar problema com a Receita" | É dedução prevista em lei, com conta vinculada no Banco do Brasil, depósito identificado e recibo emitido no SALIC; o contador lança no DARF e na ECF | Guia, mito 1; `leis-de-incentivo.md`, seção 2.4 |
| "Isso é coisa de grande empresa ou de artista famoso" | Mais de 6,2 mil CNPJs patrocinaram em 2025 e 75% do valor vem fora das 10 maiores; Caxias do Sul tinha 42 projetos em execução em 2025 | Guia, mito 2; `mercado-e-posicionamento.md`, seções 3.2 e 3.3 |
| "É gasto, não tenho orçamento" | Não é gasto novo: é parte do IRPJ que já seria pago, dentro de 4% do imposto devido; o simulador mostra o valor em reais | Lei 9.532/1997, art. 6º, II (`leis-de-incentivo.md`, seção 2.3) |
| "Meu contador nunca falou disso" | Menos de 3% das empresas no lucro real usam; a Prospekto trabalha com o escritório da empresa, que valida o limite e lança a dedução | `mercado-e-posicionamento.md`, seção 4 |
| "Lei Rouanet é polêmica" | Linguagem fiscal, não política: o projeto é regional, visível e presta contas publicamente; a empresa escolhe o projeto | `mercado-e-posicionamento.md`, seção 8 |
| "Já patrocino esporte ou FIA, não cabe mais" | Esporte geral (2%), FIA e Idoso (1% cada) têm tetos próprios; a cesta cultural de 4% é separada | SC Cosit 4/2026 (`leis-de-incentivo.md`, seção 3.2) |
| "Prefiro doar para a entidade que já apoio" | Possível, desde que a entidade tenha projeto aprovado; a Prospekto pode elaborar e inscrever o projeto dela. Atenção à vedação de vínculo (sócios, parentes) | Lei 8.313/1991, art. 27 |
| "Estamos com prejuízo este ano" | Sem IRPJ devido não há dedução; registrar no CRM e voltar no próximo período de apuração (trimestral ou anual) | Lei 9.430/1996, arts. 1º e 2º |
| "A redução de 10% da LC 224 tirou o sentido" | O limite passa de 4% para 3,6% na leitura da Receita; o MinC contesta; o valor absoluto continua relevante | `leis-de-incentivo.md`, seção 2.5 |
| "Quero retorno financeiro" | Patrocínio não devolve dinheiro; devolve dedução e contrapartidas de imagem. Participação em receita só no art. 1º do Audiovisual, outro produto | Lei 8.313/1991, art. 23; `leis-de-incentivo.md`, seção 10.2 |
| "Fiz pelo outro consultor e deu trabalho" | A Prospekto assume termo, recibo, prestação de contas e contrapartidas; o patrocinador só deposita e lança | Guia, seção 3.1 |
| "Quanto vocês cobram de mim?" | Nada do patrocinador: a remuneração de captação sai do orçamento do projeto, dentro do limite legal. Se a empresa quiser consultoria própria (planejamento, ativação de marca), é contrato separado | IN MinC 29/2026, art. 19 (`leis-de-incentivo.md`, seção 2.8) |

**Gatilhos.** Fechamento do trimestre ou do ano-calendário com lucro acima do previsto; mudança de regime para lucro real; aniversário da empresa, inauguração, lançamento de produto (pede evento ou conteúdo); auditoria ou relatório ESG; convite de prefeitura ou entidade local para apoiar festival; contador parceiro apresentando o diagnóstico de carteira; ver concorrente da região com marca em projeto cultural.

**Quem decide e como.** Até cerca de 200 funcionários: dono decide, contador valida. Acima disso: diretoria financeira aprova valor, marketing ou ESG escolhe projeto, jurídico revisa o termo. Em grupos com política de patrocínio formal (edital interno), a Prospekto inscreve o projeto na política em vez de vender; esse perfil é raro na Serra e não é o alvo da Fase 1 (`mercado-e-posicionamento.md`, seção 3.3).

### 3.2 CONT: escritório de contabilidade

**ICP.** Escritório com carteira de clientes no lucro real (a partir de 5 clientes nesse regime é interessante; a partir de 20, prioritário), sediado na Serra Gaúcha ou no RS, que faz apuração de IRPJ e entrega de ECF para esses clientes, e cuja direção aceite ser parceiro de indicação. Também entram consultorias tributárias e BPOs financeiros. Fora do ICP: escritórios só com Simples e MEI.

**Personas.** Sócio ou diretor técnico (decide a parceria e quer diferenciação); gerente ou analista fiscal (opera a dedução, teme errar na ECF, precisa de material); contador especializado em cultura (atende proponentes, não patrocinadores; é parceiro de outro tipo, `mercado-e-posicionamento.md`, seção 5.3).

**Dores.** Pressão de preço e comoditização; cliente pergunta "o que mais você pode fazer por mim"; não tem tempo nem projeto para oferecer incentivo; medo de responsabilidade se o projeto não prestar contas; já foi procurado por captadores que queriam a lista de clientes.

**Ganhos.** Diferenciação e retenção (guia, seção 5.2); planejamento tributário com uma fatia que pode somar até 10% do IRPJ quando combina cultura, esporte e fundos (`leis-de-incentivo.md`, seção 7); material pronto para apresentar ao cliente; crédito pela ideia perante o cliente; eventualmente remuneração de parceria [verificar modelo lícito com advogado: não pode sair do orçamento do projeto sem contrato de captação; ver `mercado-e-posicionamento.md`, seção 10].

**Objeções.**

| Objeção | Resposta curta |
|---|---|
| "Não vou entregar minha lista de clientes" | Não pedimos a lista: o escritório faz a triagem (regime e IRPJ) e apresenta a Prospekto só a quem quiser; a relação continua do contador |
| "Se o projeto der errado, sobra para mim" | O incentivador de boa-fé mantém a dedução; a prestação de contas é da Prospekto e do proponente; o escritório lança apenas o recibo oficial |
| "Isso muda a cada ano, não quero acompanhar" | A Prospekto manda a atualização normativa (IN 29/2026, SC Cosit 4/2026, LC 224) resumida para o escritório |
| "Meus clientes estão no presumido" | Para contribuintes de ICMS no RS existe a LIC-RS, que não exige lucro real (`leis-de-incentivo.md`, seção 6.1) |
| "Quanto eu ganho?" | Em primeiro lugar, o cliente ganha e o escritório fica com o crédito; modelo de remuneração de parceria [verificar com a Daniela e advogado] |
| "Já fazemos isso internamente" | Não foi encontrado escritório no RS que intermedeie patrocínio cultural como serviço próprio (`mercado-e-posicionamento.md`, seção 5.3); a diferença é a carteira de projetos aprovados e a operação no SALIC |

**Gatilhos.** Planejamento tributário de início de ano (janeiro a março); entrega da ECF (julho) expõe quem pagou IRPJ cheio; revisão de estimativas no 3º trimestre; eventos do CRC-RS e sindicatos de contabilistas; cliente perguntando sobre Rouanet depois de ver notícia.

**Quem decide.** O sócio. O analista fiscal influencia e opera; sem material simples para ele, a parceria não anda.

### 3.3 PF: pessoa física de alta renda

**ICP.** Contribuinte que entrega a declaração pelo modelo completo (deduções legais) com imposto devido anual relevante: a partir de R$ 20 mil de imposto devido o aporte possível (6%) é R$ 1.200; a partir de R$ 80 mil, R$ 4.800 (`leis-de-incentivo.md`, seção 8.2). Perfis típicos: médicos e dentistas com rendimentos de PJ e de pessoa física, advogados, executivos com salário e bônus, empresários com pró-labore e distribuição, profissionais liberais com carnê-leão. Dado da Receita: 44,5% das declarações de 2025 foram no modelo completo (`mercado-e-posicionamento.md`, seção 4); quantos declarantes do RS têm imposto devido acima de R$ 20 mil: [verificar nos Grandes Números da DIRPF].

**Personas.** Contribuinte que já doa (FIA, igreja, ONG) e gosta de ver o destino; contribuinte orientado pelo contador que faz a declaração; executivo da empresa patrocinadora (o patrocínio PJ puxa o PF da diretoria); família ligada a entidade cultural (coral, orquestra, museu).

**Dores.** Valor absoluto pequeno em relação ao esforço percebido; não sabe que precisa depositar até o último dia útil bancário de dezembro, antes da declaração; não existe para cultura a opção de doar na própria declaração (só FIA e Idoso, 3%) (`leis-de-incentivo.md`, seção 2.4); medo de malha fina.

**Ganhos.** Destinar até 6% do imposto devido a um projeto da própria cidade com recibo oficial; reconhecimento nominal quando o projeto prevê (patrocínio, não doação); sensação de agência sobre o imposto.

**Objeções.** "É pouco dinheiro" (resposta: somado a outros, fecha uma cota; e o dinheiro seria pago de qualquer forma); "vou cair na malha" (recibo de mecenato e ficha "Doações Efetuadas"); "meu contador faz minha declaração, não vou mexer" (a Prospekto manda o recibo e a instrução ao contador); "já doei para o FIA" (a cesta de 6% é compartilhada, o que sobrar pode ir para cultura; `leis-de-incentivo.md`, seção 2.3).

**Gatilhos.** Novembro e dezembro (prazo do depósito); recebimento do informe de rendimentos em fevereiro (percepção do imposto); bônus anual; campanha da empresa onde trabalha; evento cultural na cidade.

**Quem decide.** A própria pessoa, com veto do contador. O canal eficiente é o escritório que faz a declaração, não o anúncio.

### 3.4 MUN: município e secretaria de cultura

**ICP.** Municípios da Serra Gaúcha e do RS com secretaria, diretoria ou setor de cultura, que recebem PNAB (R$ 3 bilhões por ano repassados a estados e municípios de 2023 a 2027, `leis-de-incentivo.md`, seção 5), que têm ou querem lei municipal de incentivo e fundo de cultura, e que precisam estruturar editais, comissões, prestação de contas e projetos próprios para LIC-RS e Rouanet (município pode ser proponente na LIC-RS, `leis-de-incentivo.md`, seção 6.1). Caxias do Sul, Bento Gonçalves, Farroupilha, Gramado, Flores da Cunha e Garibaldi estão mapeados no mesmo documento, seção 6.3.

**Personas.** Secretário ou diretor de cultura (decide a contratação e quer entregar editais e eventos); técnico da secretaria (opera o Transferegov e a prestação de contas, está sobrecarregado); prefeito e chefe de gabinete (aprovam gasto e querem resultado visível); conselho municipal de cultura (influencia, legitima); procurador e controle interno (validam contratação).

**Dores.** Equipe pequena e sem formação em fomento; prazos da PNAB (relatório de gestão do 1º ciclo até 02/03/2026, IN MinC 30/2026; fonte: https://aam.org.br/ministerio-da-cultura-prorroga-prazo-de-prestacao-de-contas-da-pnab-para-2-de-marco-de-2026/); editais mal redigidos geram impugnação; eventos tradicionais sem patrocínio privado; não sabe aproximar as empresas locais da cultura.

**Ganhos.** Dinheiro federal e estadual executado sem devolver saldo; editais regulares; projetos municipais aprovados na LIC-RS ou Rouanet; empresas locais patrocinando a agenda cultural; capacitação dos agentes locais (base para o produto digital).

**Objeções.** "Não temos orçamento para consultoria" (resposta: parte do serviço pode ser estruturado dentro do planejamento do fomento [verificar com advogado o que a PNAB admite como despesa]; e o custo de não executar é devolver recursos); "contratação pública é lenta" (planejar pela LDO e LOA; ver timing); "já temos consultoria" (parceria em vez de disputa); "a Prospekto é de outro município" (atuação regional, cases [verificar]).

**Gatilhos.** Abertura de ciclo da PNAB; prazos de prestação de contas; troca de secretário; elaboração da LDO (até 15/04) e da LOA (até 31/08) (ADCT, art. 35, § 2º; fonte secundária: https://aspec.com.br/blog/lei-orcamentaria-anual-prazos-e-vigencia/); edital da LIC-RS; aniversário do município; eleições municipais (próximas em 2028; 2026 é ano de eleição estadual e federal).

**Quem decide.** Secretário propõe, prefeito aprova, procuradoria valida o instrumento (contratação direta por valor, inexigibilidade por notória especialização ou licitação, conforme a Lei 14.133/2021 [verificar enquadramento caso a caso]).

### 3.5 PROP: proponente e produtora cultural

**ICP.** Produtora, coletivo, instituição ou artista com projeto aprovado e portaria de captação vigente (Rouanet, Ancine ou LIC-RS), ou com projeto maduro para inscrever, com saldo a captar compatível com a rede da Prospekto (R$ 100 mil a R$ 1,5 milhão), apelo regional ou elenco e parceiros que reduzam risco, e prestação de contas de projetos anteriores em dia. Exemplo da carteira: "A Tacada Perfeita", Ocotea Filmes, FSA aprovado e captação complementar pelo art. 1º-A (`leis-de-incentivo.md`, seção 3.5).

**Personas.** Produtor executivo (decide o contrato de captação); diretor ou artista proponente (quer o projeto feito, não entende de IRPJ); financeiro da produtora (controla orçamento, rubricas e prestação de contas); contador do proponente (parceiro operacional).

**Dores.** Projeto aprovado parado por falta de patrocinador (22,9 mil propostas inscritas, 6,4 mil captaram em 2025, `mercado-e-posicionamento.md`, seção 3.1); captadores que cobram adiantado ou acima do limite; prazo de captação vencendo (até 36 meses da portaria; arquivamento se não captar 10%, `leis-de-incentivo.md`, seção 2.7 e `mercado-e-posicionamento.md`, seção 6.1); não sabe apresentar o projeto a uma indústria.

**Ganhos.** Rede de empresas e contadores da região; captação dentro da rubrica legal (10%, teto R$ 150 mil, pagamento proporcional); elaboração e gestão por quem conhece o SALIC; cadastro em vitrines complementares (BIP RS da Prosas) [verificar interesse].

**Objeções.** "Já tenho captador" (exclusividade por território ou por patrocinador, não pelo projeto inteiro); "quero pagar só no sucesso" (é a regra legal; elaboração e gestão são à parte); "10% é caro" (é o teto legal e o padrão de mercado, `mercado-e-posicionamento.md`, seção 6.2); "meu projeto é de música popular, não cabe no art. 18" (art. 26 com dedução parcial, ou LIC-RS).

**Gatilhos.** Publicação da portaria de captação; resultado de edital FSA ou LIC-RS; janela do SALIC (1º/02 a 31/10); fim do prazo de captação se aproximando; recusa de patrocinador; necessidade de renovação de plano anual.

**Quem decide.** O proponente legal (quem assina no SALIC). Se for instituição, a diretoria.

### 3.6 ALUNO: aspirante a elaborador ou captador

**ICP.** Pessoa que quer trabalhar com projetos culturais e não sabe por onde começar, ou que já escreve projetos e não consegue captar: produtores iniciantes, servidores de secretarias de cultura, artistas que querem profissionalizar o próprio coletivo, contadores e advogados interessados na vertical cultura, estudantes de produção cultural e gestão pública. Também captadores autônomos (o programa de captadores do Portal do Incentivo mostra que existe oferta, `mercado-e-posicionamento.md`, seção 9.2).

**Personas.** "Quero escrever meu primeiro projeto" (foco em elaboração e SALIC); "tenho projeto, preciso captar" (foco em prospecção, pitch e contrato); "quero uma profissão" (jornada completa, mentoria).

**Dores.** Normas mudam todo ano; cursos genéricos e caros (referência: Squadra cobra de R$ 560 a R$ 5.170, `mercado-e-posicionamento.md`, seção 5.2); falta de prática real e de rede; medo de errar na prestação de contas.

**Ganhos.** Método da Daniela com casos reais da Serra; modelos de projeto e de termo; acompanhamento; porta de entrada para o hub da Fase 2 (indicar projetos, atuar como captador da rede).

**Objeções.** "Preço" (validar com lista de espera antes de produzir); "é só mais um curso" (mentoria com projeto real, não aula gravada); "não tenho tempo" (formato em coortes curtas).

**Gatilhos.** Editais PNAB e LIC-RS abertos; conteúdo da Daniela no LinkedIn e Instagram; palestras em secretarias e universidades; aluno indicando aluno.

**Quem decide.** A própria pessoa. Para servidores, a secretaria pode pagar (vira venda B2G, tratada em `municipios`).

## 4. Sazonalidade e timing

Regras de prazo que sustentam a tabela, com fontes:

| Marco | Data | Fonte |
|---|---|---|
| IRPJ trimestral: períodos encerrados em 31/03, 30/06, 30/09 e 31/12; pagamento até o último dia útil do mês seguinte | trimestral | Lei 9.430/1996, arts. 1º e 5º (https://www2.camara.leg.br/legin/fed/lei/1996/lei-9430-27-dezembro-1996-367738-normaatualizada-pl.html) |
| IRPJ anual por estimativa: saldo apurado em 31/12 pago em quota única até o último dia útil de março do ano seguinte | março | Lei 9.430/1996, art. 6º, § 1º (https://modeloinicial.com.br/lei/L-9430-1996/lei-9430/art-6) |
| ECF do ano anterior: último dia útil de julho (31/07/2026 para o ano-calendário 2025) | julho | IN RFB 2.004/2021 (https://www.contadores.cnt.br/noticias/artigos/2026/07/03/ecf-2026-empresas-tem-ate-31-de-julho-para-envio-de-dados-a-receita.html) |
| Depósito do incentivo para valer no ano-calendário: até o último dia útil bancário de dezembro | dezembro | `leis-de-incentivo.md`, seções 2.4 e 9 |
| DIRPF 2026: entrega de 23/03 a 29/05/2026 | março a maio | Receita Federal (https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/marco/receita-comeca-a-receber-declaracoes-do-irpf-no-dia-23-de-marco-prazo-de-entrega-se-encerra-em-29-de-maio) |
| Janela de propostas no SALIC: 1º/02 a 31/10 | fev a out | IN MinC 29/2026, art. 5º (`leis-de-incentivo.md`, seção 2.7) |
| Editais LIC-RS 2026: fev/mar, abr/mai, jun/jul, ago/set | ano todo | `leis-de-incentivo.md`, seção 6.1 |
| LDO municipal ao Legislativo até 15/04; LOA até 31/08 | abril e agosto | ADCT, art. 35, § 2º (fonte secundária: https://www.crcsc.org.br/uploads/evento/11360/0lmnWVpzzzy4fOHG405F1C82JkIwhDQs.pdf) |
| PNAB: relatório de gestão do 1º ciclo até 02/03/2026; ciclos seguintes com cadastro de plano de ação no Transferegov | anual [verificar cronograma do ciclo 2026/2027] | IN MinC 30/2026 (https://aam.org.br/ministerio-da-cultura-prorroga-prazo-de-prestacao-de-contas-da-pnab-para-2-de-marco-de-2026/); CNM (https://cnm.org.br/comunicacao/noticias/politica-nacional-aldir-blanc-nota-tecnica-orienta-sobre-os-novos-recursos) |

Calendário por persona (o que a Prospekto faz em cada bloco):

| Período | PJ | CONT | PF | MUN | PROP | ALUNO |
|---|---|---|---|---|---|---|
| Jan | Agradecer e renovar quem aportou em dezembro; empresas anuais fecham o IRPJ | Planejamento tributário do ano: webinar e diagnóstico de carteira | Enviar recibos e instrução para a declaração | Prestação de contas PNAB; planejar editais do ano | Fechar contas do ano; preparar propostas para a janela do SALIC | Abrir lista de espera e turma de início de ano |
| Fev e mar | Trimestrais: decisão do 1º trimestre até 31/03; anuais: pagam saldo até fim de março (momento de dor) | Reunião de parceria; material para o analista fiscal | Campanha "Doações Efetuadas" (DIRPF abre em 23/03) | Apoio à LDO (até 15/04) com previsão de cultura | Inscrever propostas (SALIC abre 1º/02); edital LIC-RS eventos 2º semestre | Conteúdo sobre edital e SALIC |
| Abr a jun | Prospecção com projeção de lucro; trimestrais: 2º trimestre até 30/06 | Visitas conjuntas a clientes selecionados | Pausa (DIRPF até 29/05); coletar leads de "não sabia" para novembro | Edital LIC-RS patrimônio; estruturar editais PNAB | Portarias publicadas; início da captação; montar decks | Turma 1 [verificar] |
| Jul a set | Fechar contratos para o 4º trimestre; trimestrais: 3º trimestre até 30/09; ECF em julho expõe IRPJ pago cheio | Pós-ECF: "quanto seu cliente deixou no DARF"; segunda rodada de diagnóstico | Preparar campanha de dezembro com os escritórios | LOA (até 31/08): dotação para cultura e para consultoria; edital LIC-RS produção | Carteira completa para a campanha; renovar planos anuais | Conteúdo e webinar; captar lista para turma de outubro |
| Out | Campanha de fechamento de ano; anuais definem valor | Lista final de clientes elegíveis e valores | Disparo da campanha PF via contadores | Planejar editais do ano seguinte | Fim da janela do SALIC (31/10); últimas inscrições | Turma 2 [verificar] |
| Nov e dez | Fechamento: termo, depósito até o último dia útil bancário, recibo | Suporte ao lançamento no DARF | Depósito até o último dia útil bancário de dezembro | Encerramento do exercício | Emitir recibos em até dias; registrar contrapartidas | Pausa comercial; preparar janeiro |

Consequência operacional: a equipe trabalha a prospecção de PJ e CONT de janeiro a agosto e o fechamento de setembro a dezembro. O `next_action_at` do CRM em setembro deve ser semanal para todo lead `quente` de `PJ`.

## 5. Qualificação e score

### 5.1 Regras de desqualificação (antes do score)

| Regra | Segmento | Ação no CRM |
|---|---|---|
| Simples Nacional ou lucro presumido e interesse em Rouanet ou Audiovisual | PJ | Marcar `desqualificado_rouanet`; se contribuinte de ICMS no RS, reclassificar interesse para `lic_rs` e seguir |
| Declaração simplificada (ou não sabe e renda baixa) | PF | Marcar `fora_do_icp`; manter em lista de conteúdo se houver consentimento |
| Vínculo entre patrocinador e proponente (sócios, parentes até 3º grau, empresas com sócios comuns) | PJ, PF, PROP | Bloquear a combinação patrocinador x projeto (Lei 8.313/1991, art. 27); o lead pode seguir com outro projeto |
| Projeto sem portaria vigente e sem intenção de inscrever | PROP | Marcar `sem_projeto`; oferecer elaboração |
| Município sem setor de cultura e sem PNAB | MUN | `fora_do_icp` |
| Pedido de "retorno financeiro" ou de vantagem ao patrocinador | PJ, PF | Explicar a vedação; se insistir, `perdido` com motivo `vantagem_indevida` |

### 5.2 Score por segmento (0 a 100)

PJ:

| Critério | Pontos | Como medir |
|---|---|---|
| Regime tributário confirmado lucro real | 30 | Informado no formulário e confirmado pelo contador ou pela ECF |
| IRPJ devido estimado (a 15%, sem adicional) | até 25 | Até R$ 100 mil: 5; R$ 100 a 500 mil: 12; R$ 500 mil a 2,5 mi: 20; acima: 25 |
| Decisor identificado e em contato | 15 | Nome, cargo e canal confirmados |
| Histórico de uso de incentivos (cultura, esporte, FIA) | 10 | Já usou qualquer um: 10; nunca usou, mas conhece: 5 |
| Timing | 10 | Dentro de 90 dias do fechamento do período de apuração: 10; 90 a 180 dias: 5 |
| Origem | 10 | `indicacao_contador` ou `indicacao_cliente`: 10; `simulador` ou `diagnostico`: 7; `guia`, `linkedin`, `evento`: 4; demais: 2 |

PF:

| Critério | Pontos |
|---|---|
| Declaração pelo modelo completo | 30 |
| Imposto devido estimado: até R$ 20 mil: 5; R$ 20 a 80 mil: 15; acima: 25 | até 25 |
| Contador ou escritório que faz a declaração identificado | 15 |
| Já doa com incentivo (FIA, Idoso) ou já patrocinou | 10 |
| Mês atual entre setembro e dezembro: 10; demais: 3 | até 10 |
| Origem (indicação ou empresa patrocinadora: 10; simulador: 7; demais: 3) | até 10 |

CONT:

| Critério | Pontos |
|---|---|
| Clientes no lucro real: 1 a 4: 10; 5 a 19: 20; 20 ou mais: 30 | até 30 |
| Sócio ou diretor em contato | 20 |
| Já lançou dedução de incentivo para algum cliente | 15 |
| Sede na Serra Gaúcha: 10; RS: 5 | até 10 |
| Aceitou reunião de apresentação ou webinar | 15 |
| Origem (indicação, evento CRC ou sindicato: 10; demais: 4) | até 10 |

MUN:

| Critério | Pontos |
|---|---|
| Secretaria ou setor de cultura com responsável nomeado | 15 |
| Plano de ação PNAB ativo ou saldo a executar | 20 |
| Dotação ou possibilidade de contratar consultoria no exercício | 20 |
| Secretário ou prefeito em contato | 20 |
| Dentro de 60 dias de LDO, LOA ou prazo PNAB | 10 |
| Relação prévia da Daniela com o município | 15 |

PROP:

| Critério | Pontos |
|---|---|
| Portaria de captação vigente (SALIC, Ancine ou CHP LIC-RS) | 30 |
| Saldo a captar entre R$ 100 mil e R$ 1,5 mi e prazo acima de 6 meses | 20 |
| Enquadramento art. 18 ou art. 1º-A (dedução integral) | 10 |
| Proponente regular (cadastro, prestações de contas anteriores aprovadas) | 15 |
| Apelo regional, contrapartidas claras, parceiros (FSA, distribuidor, elenco) | 15 |
| Rubrica de captação prevista no orçamento aprovado | 10 |

ALUNO:

| Critério | Pontos |
|---|---|
| Objetivo declarado (primeiro projeto, captar, profissão) | 20 |
| Já tem projeto ou atua em cultura | 25 |
| Disposição a investir (faixa informada, opcional) | 20 |
| Respondeu à pesquisa da lista de espera | 20 |
| Origem (indicação ou aula aberta: 15; demais: 5) | até 15 |

### 5.3 Uso do score

- `quente` (70 ou mais): contato humano em até 1 dia útil, entra em pipeline com dono definido.
- `morno` (40 a 69): sequência de nutrição (e-mail, WhatsApp com consentimento) e revisão mensal; sobe quando um critério muda (por exemplo, confirmação de regime pelo contador).
- `frio` (abaixo de 40): só conteúdo; revisão trimestral.
- O score é recalculado a cada alteração de campo e guarda histórico (`score_history`), para medir quais critérios de fato predizem fechamento após o primeiro ciclo.

## 6. Lead magnets e ofertas

| Persona | Lead magnet (topo) | Oferta de meio | Oferta de fundo (serviço) |
|---|---|---|---|
| PJ | Guia "Contabilizando Cultura" (existe; revisar números antes de publicar, `mercado-e-posicionamento.md`, seção 4); simulador de dedução (4% do IRPJ, com aviso LC 224 e cesta compartilhada) | Diagnóstico gratuito de 30 minutos com a Daniela e o contador da empresa; carteira de projetos da região (resumo por projeto: lei, artigo, saldo, contrapartidas) | Patrocínio com operação completa: termo, depósito, recibo, prestação de contas, ativação de contrapartidas |
| CONT | Webinar "Incentivo cultural no planejamento tributário 2027" (IRPJ, cesta de 4%, LC 224, ECF); tabela comparativa de incentivos (seção 7 de `leis-de-incentivo.md`) em PDF | Diagnóstico de carteira: o escritório informa quantos clientes no lucro real e faixas de IRPJ, recebe o potencial em reais; kit do analista fiscal (passo a passo DARF e ECF) | Programa de parceria com material co-assinado, reunião conjunta com clientes e atualização normativa |
| PF | Simulador PF (6% do imposto devido; lembrete do prazo de dezembro); artigo "Como destinar parte do seu IR para cultura sem cair na malha" | Lista de projetos da cidade abertos a pessoa física; lembrete de dezembro por WhatsApp (com consentimento) | Aporte assistido: cálculo, depósito identificado, recibo e instrução ao contador |
| MUN | Checklist "PNAB sem devolver recurso" e modelo de calendário de editais; nota sobre LIC municipal (Caxias como referência) | Diagnóstico do fomento municipal (PNAB, fundo, lei de incentivo, projetos próprios) | Consultoria: editais, comissões, prestação de contas, projetos municipais na LIC-RS e Rouanet, aproximação com empresas locais |
| PROP | Checklist de projeto "captável" (portaria, art. 18 ou 26, saldo, contrapartidas, deck); modelo de deck inspirado em "A Tacada Perfeita" | Avaliação do projeto pela Daniela (parecer de captabilidade em 1 página) | Contrato de captação dentro da IN 29/2026; elaboração e gestão à parte |
| ALUNO | Aula aberta gravada "Como se escreve um projeto na Lei Rouanet"; lista de espera da mentoria | Pesquisa da lista de espera (objetivo, experiência, faixa de preço); mini-curso por e-mail em 5 partes | Mentoria ou curso da Daniela (validar formato e preço pela lista de espera antes de produzir, `docs/visao.md`) |

Os lead magnets de PJ e PF dependem do simulador, cujos parâmetros ficam em `docs/dominio/` com data de verificação e fonte.

## 7. Funis por persona

Cada linha: canal, conteúdo, CTA e próximo passo no CRM.

### 7.1 PJ

| Etapa | Canal | Conteúdo | CTA | Próximo passo |
|---|---|---|---|---|
| Topo | Indicação de contador; LinkedIn da Daniela (posts sobre IRPJ e cultura na Serra); eventos (CIC Caxias, sindicatos, CRC-RS); site | Guia; simulador; caso de projeto regional | "Simule quanto do seu IRPJ pode virar cultura" | Lead criado em `patrocinadores`, estágio `novo`, score calculado |
| Meio | E-mail e WhatsApp (com consentimento); reunião | Diagnóstico de 30 minutos com o contador presente; carteira de projetos; respostas às objeções da seção 3.1 | "Agende o diagnóstico" | `qualificado` e depois `diagnostico` |
| Fundo | Reunião presencial; proposta em PDF; termo | Proposta com valor, projeto, artigo, contrapartidas e cronograma; minuta do termo; checklist do depósito | "Assine o termo e deposite até dia X" | `proposta`, `termo`, `aporte`, `recibo` |
| Pós | E-mail; evento do projeto | Recibo de mecenato; relatório de contrapartidas; convite a eventos; renovação em janeiro | "Renove para o próximo período" | `renovacao` |

### 7.2 CONT

| Etapa | Canal | Conteúdo | CTA | Próximo passo |
|---|---|---|---|---|
| Topo | Rede do sócio e da Daniela; CRC-RS e sindicatos; LinkedIn; site (página "Para contadores") | Webinar; tabela comparativa de incentivos; guia | "Participe do webinar" ou "Baixe a tabela" | Lead em `contadores`, `novo` |
| Meio | Reunião; e-mail | Diagnóstico de carteira (potencial em reais); kit do analista fiscal; divisão de competências (guia, seção 5.1) | "Faça o diagnóstico da sua carteira" | `contato`, `apresentacao` |
| Fundo | Reunião presencial com sócio | Acordo de parceria (escopo, material, remuneração se houver, LGPD sobre dados dos clientes) | "Formalize a parceria" | `parceria` |
| Pós | Reuniões conjuntas com clientes; atualização normativa trimestral | Lista de clientes indicados; resultados | "Indique os próximos 3 clientes" | `ativo`; cada indicação cria lead `PJ` com `origem = indicacao_contador` e `contador_id` |

### 7.3 PF

| Etapa | Canal | Conteúdo | CTA | Próximo passo |
|---|---|---|---|---|
| Topo | Contadores parceiros; empresas patrocinadoras (diretoria); Instagram e LinkedIn da Daniela; site | Simulador PF; artigo sobre malha fina e recibo | "Veja quanto do seu IR pode ir para um projeto da sua cidade" | Lead em `patrocinadores` com `tipo_pessoa = PF`, `novo` |
| Meio | WhatsApp e e-mail (consentimento) | Lista de projetos; passo a passo do depósito; lembrete de novembro | "Escolha o projeto" | `qualificado`, `diagnostico` (aqui o diagnóstico é uma ligação de 15 minutos) |
| Fundo | WhatsApp; e-mail | Dados para depósito identificado; confirmação; recibo | "Deposite até o último dia útil de dezembro" | `termo` (para PF, o termo pode ser carta de patrocínio ou doação simples [verificar modelo]), `aporte`, `recibo` |
| Pós | E-mail em fevereiro | Instrução para a ficha "Doações Efetuadas"; convite ao evento | "Renove em novembro" | `renovacao` |

### 7.4 MUN

| Etapa | Canal | Conteúdo | CTA | Próximo passo |
|---|---|---|---|---|
| Topo | Rede da Daniela com secretarias; associações de municípios (Amesne, Famurs) [verificar relação]; palestras; site (página "Para municípios") | Checklist PNAB; calendário de editais; casos | "Peça o diagnóstico do fomento municipal" | Lead em `municipios`, `novo` |
| Meio | Reunião com secretário | Diagnóstico; proposta de escopo alinhada à LDO e LOA | "Inclua a consultoria no planejamento" | `contato`, `diagnostico` |
| Fundo | Proposta formal; procuradoria | Proposta técnica e de preço; instrumento de contratação | "Formalize" | `proposta`, `contrato` |
| Pós | Execução | Editais, comissões, prestação de contas, projetos próprios | "Renove para o próximo exercício" | `execucao`, `encerrado` |

### 7.5 PROP

| Etapa | Canal | Conteúdo | CTA | Próximo passo |
|---|---|---|---|---|
| Topo | Rede cultural da Daniela; mapeamento de agentes culturais de Caxias; SALIC e Pró-Cultura RS (projetos com portaria e saldo a captar na região); site (página "Para proponentes") | Checklist de projeto captável; modelo de deck | "Envie seu projeto para avaliação" | Lead em `projetos`, `prospeccao` |
| Meio | Reunião; e-mail | Parecer de captabilidade; proposta de contrato de captação (e de elaboração, se preciso) | "Assine o contrato de captação" | `avaliacao` |
| Fundo | Contrato; onboarding | Deck final, cotas, lista de contrapartidas, cadastro na carteira do CRM | "Entre na carteira" | `elaboracao` ou `inscrito` ou `autorizado`, conforme o estado real do projeto |
| Execução | Operação | Captação, recibos, execução, prestação de contas | | `captando`, `execucao`, `prestacao_contas`, `encerrado` |

### 7.6 ALUNO

| Etapa | Canal | Conteúdo | CTA | Próximo passo |
|---|---|---|---|---|
| Topo | Instagram e LinkedIn da Daniela; palestras; secretarias; YouTube | Aula aberta; posts sobre editais | "Entre na lista de espera" | Lead em `alunos`, `lista_espera` |
| Meio | E-mail | Pesquisa; mini-curso por e-mail | "Responda à pesquisa" | `pesquisado` |
| Fundo | E-mail e WhatsApp | Abertura de turma, preço, vagas | "Garanta sua vaga" | `inscrito`, `aluno` |
| Pós | Comunidade | Alumni; convite ao hub (Fase 2) | | `alumni` |

## 8. Estágios de pipeline

Nomes em minúsculas e sem acento, usados literalmente no CRM (`stage`). Todo pipeline tem o estágio terminal `perdido`, com `lost_reason` obrigatório. SLA de follow-up é o prazo máximo para a próxima atividade registrada (`next_action_at`); o CRM destaca o que está vencido.

### 8.1 `patrocinadores` (PJ e PF)

| Estágio | Entrada | Saída | SLA de follow-up |
|---|---|---|---|
| `novo` | Lead criado por formulário, importação ou indicação | Primeiro contato registrado e score calculado | 1 dia útil |
| `qualificado` | Regime (PJ) ou modelo de declaração (PF) confirmado; decisor identificado; score 40 ou mais | Reunião de diagnóstico agendada | 3 dias úteis |
| `diagnostico` | Reunião realizada (PJ: com contador; PF: ligação) com valor potencial calculado | Projeto escolhido e valor indicativo acordado | 5 dias úteis |
| `proposta` | Proposta enviada (projeto, valor, artigo, contrapartidas, cronograma) | Aceite verbal ou escrito | 5 dias úteis; 2 dias úteis em novembro e dezembro |
| `termo` | Minuta do termo enviada; checagem de vínculo (art. 27) feita | Termo assinado | 3 dias úteis |
| `aporte` | Termo assinado; dados da conta vinculada enviados | Depósito identificado confirmado na conta do projeto | 2 dias úteis até a data prevista; diário a partir de 10 de dezembro |
| `recibo` | Depósito confirmado | Recibo de mecenato emitido no SALIC (ou Ancine ou CHP) e enviado ao patrocinador e ao contador | 5 dias úteis [verificar prazo de emissão por mecanismo] |
| `renovacao` | Recibo entregue; contrapartidas em execução | Novo aporte no período seguinte (volta a `proposta`) ou `perdido` | Contato em janeiro; depois trimestral |
| `perdido` | Qualquer estágio, com motivo | | |

Motivos de perda (`lost_reason`): `sem_irpj`, `regime_inelegivel`, `sem_decisor`, `sem_interesse`, `prazo_perdido`, `escolheu_outro_captador`, `escolheu_outro_incentivo`, `vinculo_art27`, `vantagem_indevida`, `sem_resposta`, `outro`.

Campos de estágio obrigatórios: em `proposta`, `projeto_id` e `valor_proposto`; em `termo`, `tipo_aporte` (patrocinio ou doacao) e `mecanismo` (rouanet_18, rouanet_26, audiovisual_1a, lic_rs, lic_municipal); em `aporte`, `data_deposito` e `valor_depositado`; em `recibo`, `numero_recibo` e `data_envio_contador`.

### 8.2 `contadores`

| Estágio | Entrada | Saída | SLA |
|---|---|---|---|
| `novo` | Escritório identificado com nome do sócio | Primeiro contato registrado | 2 dias úteis |
| `contato` | Conversa realizada; interesse declarado; nº aproximado de clientes no lucro real | Apresentação ou webinar agendado | 5 dias úteis |
| `apresentacao` | Apresentação feita (webinar ou reunião); diagnóstico de carteira oferecido | Diagnóstico de carteira devolvido ou acordo proposto | 7 dias úteis |
| `parceria` | Acordo de parceria enviado | Acordo assinado (ou aceite por e-mail) e kit entregue | 7 dias úteis |
| `ativo` | Acordo vigente | Pelo menos uma indicação registrada nos últimos 90 dias | Contato mensal de fevereiro a outubro; quinzenal em novembro e dezembro |
| `inativo` | Parceiro sem indicação há mais de 180 dias ou que pediu pausa | Reativado (volta a `ativo`) | Trimestral |
| `perdido` | Recusou ou escritório sem clientes elegíveis | | |

Métrica por parceiro: indicações, leads qualificados, aportes fechados e valor captado por `contador_id`.

### 8.3 `municipios`

| Estágio | Entrada | Saída | SLA |
|---|---|---|---|
| `novo` | Município mapeado com responsável de cultura | Contato registrado | 5 dias úteis |
| `contato` | Conversa com secretário ou técnico; dor identificada | Diagnóstico aceito | 10 dias úteis |
| `diagnostico` | Diagnóstico do fomento municipal entregue | Escopo de consultoria definido | 15 dias úteis |
| `proposta` | Proposta técnica e de preço enviada | Aceite da secretaria e encaminhamento à procuradoria | 15 dias úteis; alinhado a LDO e LOA |
| `contrato` | Instrumento em tramitação (dispensa, inexigibilidade, licitação) | Contrato assinado e ordem de início | 30 dias; acompanhar semanalmente |
| `execucao` | Contrato vigente | Entregas concluídas e relatório final | Mensal |
| `encerrado` | Serviço entregue | Renovação (volta a `proposta`) ou arquivamento | Contato em janeiro e em julho |
| `perdido` | Sem orçamento, sem interesse ou contratação inviável | | |

### 8.4 `projetos` (proponentes e carteira)

Este pipeline acompanha o projeto, da prospecção do proponente até a prestação de contas. O registro é o projeto (`project`), ligado ao proponente (`proponent`) e aos aportes (`contribution`).

| Estágio | Entrada | Saída | SLA |
|---|---|---|---|
| `prospeccao` | Proponente ou projeto identificado | Projeto recebido para avaliação | 5 dias úteis |
| `avaliacao` | Material recebido (projeto, orçamento, status no SALIC ou Pró-Cultura) | Parecer de captabilidade entregue e decisão (seguir ou recusar) | 10 dias úteis |
| `elaboracao` | Contrato de elaboração assinado (quando o projeto não existe ou precisa de reescrita) | Proposta inscrita no sistema | Semanal; respeitar a janela 1º/02 a 31/10 |
| `inscrito` | Proposta protocolada (SALIC, Ancine ou edital LIC-RS) | Portaria de autorização ou CHP publicada | Quinzenal; verificar diligências |
| `autorizado` | Portaria ou habilitação vigente; conta de captação aberta; contrato de captação assinado | Deck, cotas e contrapartidas prontos; projeto publicado na carteira do site | 10 dias úteis |
| `captando` | Projeto na carteira com saldo a captar | 20% captados e liberação para execução (Rouanet) ou meta do edital atingida | Semanal; registrar cada aporte em `contribution` |
| `execucao` | Recursos liberados; execução iniciada | Objeto concluído; contrapartidas entregues | Mensal; recibos emitidos a cada depósito |
| `prestacao_contas` | Fim da vigência | Relatório final entregue no prazo (60 dias no Rouanet) e aprovado | Semanal até a entrega; depois acompanhar análise (até 6 meses no MinC) |
| `encerrado` | Prestação de contas aprovada | Nova edição ou plano seguinte (volta a `elaboracao`) | Anual |
| `arquivado` | Projeto recusado, não aprovado, sem captação mínima ou prazo vencido | | |

Campos obrigatórios por estágio: em `autorizado`, `mecanismo`, `numero_processo` (Pronac, Ancine ou Pró-Cultura), `artigo` (18, 26, 1A, lic_rs), `valor_aprovado`, `prazo_captacao`, `rubrica_captacao_valor`; em `captando`, `saldo_a_captar` (calculado); em `prestacao_contas`, `data_limite_relatorio`.

Regras legais que o pipeline impõe: comissão de captação registrada por aporte, limitada à rubrica aprovada (10%, teto R$ 150 mil), paga só após depósito confirmado (IN MinC 29/2026, art. 19); checagem de vínculo antes de `termo` no pipeline de patrocinadores; alerta quando faltar 6 meses para o fim do prazo de captação e quando o projeto estiver abaixo de 10% captado (`mercado-e-posicionamento.md`, seção 6.1).

### 8.5 `alunos`

| Estágio | Entrada | Saída | SLA |
|---|---|---|---|
| `lista_espera` | Cadastro na lista | Pesquisa enviada | automático |
| `pesquisado` | Pesquisa respondida | Convite para turma | Quando abrir turma |
| `inscrito` | Vaga reservada | Pagamento confirmado | 3 dias úteis |
| `aluno` | Turma em andamento | Conclusão | Semanal |
| `alumni` | Concluiu | | Trimestral (comunidade, hub) |
| `perdido` | Saiu da lista ou não converteu em duas turmas | | |

## 9. Campos de lead

### 9.1 Princípios

- Coletar o mínimo necessário para qualificar (LGPD, art. 6º, III, necessidade). CPF não é coletado no site; CNPJ é opcional no site (ajuda a enriquecer) e obrigatório só em `termo`.
- Consentimento específico, destacado e registrado (Lei 13.709/2018, art. 5º, XII, art. 7º, I e art. 8º; fonte: https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-publicacaooriginal-156212-pl.html). Guardar `consent_at`, `consent_version`, `consent_ip` [verificar necessidade do IP com advogado] e `consent_channels` (e-mail, WhatsApp, telefone).
- Prospecção ativa B2B (LinkedIn, listas de empresas) usa a base do legítimo interesse (art. 7º, IX e art. 10, I) com opt-out simples em toda mensagem; dados de PF de alta renda só com consentimento ou por intermédio do contador (art. 18, VI e IX: eliminação e revogação) [verificar política com advogado].
- Dados de contato de pessoas na empresa (decisor) são dados pessoais; registrar origem (`source_detail`) para atender pedidos de acesso.

### 9.2 Campos comuns (formulário e CRM)

| Campo | Tipo | Site | CRM | Observação |
|---|---|---|---|---|
| `nome` | texto | obrigatório | obrigatório | |
| `email` | e-mail | obrigatório | obrigatório | único por lead e segmento |
| `telefone` | texto (E.164) | opcional, obrigatório quando pede WhatsApp | opcional | |
| `segmento` | enum PJ, PF, CONT, MUN, PROP, ALUNO | obrigatório (definido pela página) | obrigatório | |
| `interesse` | enum rouanet, audiovisual, lic_rs, lic_municipal, pnab_editais, consultoria, mentoria, nao_sei | obrigatório | obrigatório | |
| `cidade` e `uf` | texto, enum | obrigatório | obrigatório | prioriza Serra Gaúcha |
| `mensagem` | texto longo | opcional | opcional | |
| `origem` | enum (seção 2) | automático (utm e página) | obrigatório | |
| `source_detail` | texto | automático (utm_source, utm_campaign, referrer, página) | opcional | |
| `consent_lgpd` | booleano | obrigatório (não pré-marcado) | obrigatório | texto com finalidade e link para a política |
| `consent_marketing` | booleano | opcional, separado | opcional | newsletter e campanhas |
| `consent_at`, `consent_version` | data-hora, texto | automático | obrigatório | |
| `owner_id` | referência | | obrigatório ao sair de `novo` | quem cuida do lead |
| `stage`, `score`, `temperatura` | enum, inteiro, enum | | obrigatório | `temperatura` derivada do score |
| `next_action_at`, `last_contact_at` | data-hora | | obrigatório ao sair de `novo` | base dos SLAs |
| `lost_reason` | enum | | obrigatório em `perdido` | |
| `tags` | lista | | opcional | |
| `tenant_id` | referência | | obrigatório (Fase 1: um só tenant) | requisito multi-tenant de `docs/visao.md` |

### 9.3 Campos por segmento

PJ (página "Para empresas", simulador e diagnóstico):

| Campo | Site | CRM |
|---|---|---|
| `empresa` (razão social ou nome fantasia) | obrigatório | obrigatório |
| `cnpj` | opcional | obrigatório em `termo` |
| `cargo` | obrigatório (enum: dono ou socio, financeiro, contabilidade, marketing_esg, outro) | obrigatório |
| `regime_tributario` | obrigatório (lucro_real, lucro_presumido, simples, nao_sei) | obrigatório, com `regime_confirmado_por` (contador, ecf, declarado) |
| `irpj_faixa` | obrigatório no simulador e no diagnóstico (ate_100k, 100k_500k, 500k_2500k, acima_2500k, nao_sei) | obrigatório |
| `apuracao` | opcional (trimestral, anual, nao_sei) | obrigatório em `qualificado` |
| `usa_incentivos` | opcional (nenhum, cultura, esporte, fia_idoso, outros) | opcional |
| `contador_escritorio` e `contador_id` | opcional | obrigatório em `diagnostico` |
| `contribuinte_icms_rs` | opcional | obrigatório quando regime não é lucro real |
| `setor` | opcional | opcional |
| `numero_funcionarios_faixa` | opcional | opcional |

PF (página "Para pessoas físicas", simulador PF):

| Campo | Site | CRM |
|---|---|---|
| `modelo_declaracao` | obrigatório (completa, simplificada, nao_sei) | obrigatório |
| `ir_devido_faixa` | obrigatório no simulador (ate_20k, 20k_80k, acima_80k, nao_sei) | obrigatório |
| `profissao` | opcional (enum curto: saude, juridico, executivo, empresario, outro) | opcional |
| `contador_declaracao` | opcional | obrigatório em `diagnostico` |
| `cpf` | não coletar | obrigatório em `termo` ou `aporte` (depósito identificado) |
| `empresa_vinculada_id` | | opcional (quando vem de patrocinador PJ) |

CONT (página "Para contadores", webinar, diagnóstico de carteira):

| Campo | Site | CRM |
|---|---|---|
| `escritorio` | obrigatório | obrigatório |
| `cnpj` | opcional | opcional |
| `cargo` | obrigatório (socio, gerente_fiscal, analista, outro) | obrigatório |
| `clientes_lucro_real_faixa` | obrigatório (nenhum, 1_4, 5_19, 20_mais) | obrigatório |
| `ja_lancou_incentivo` | opcional | obrigatório em `apresentacao` |
| `registro_crc` | opcional | opcional |
| `acordo_assinado_em`, `modelo_remuneracao` | | obrigatório em `parceria` [verificar modelo] |

MUN (página "Para municípios"):

| Campo | Site | CRM |
|---|---|---|
| `municipio` | obrigatório | obrigatório |
| `orgao` (secretaria, diretoria, fundação) | obrigatório | obrigatório |
| `cargo` | obrigatório (secretario, diretor, tecnico, prefeito_gabinete, conselho, outro) | obrigatório |
| `pnab_status` | opcional (ciclo ativo, saldo a executar, nao_aderiu, nao_sei) | obrigatório em `diagnostico` |
| `lei_incentivo_municipal` | opcional (sim, nao, em_tramitacao, nao_sei) | opcional |
| `necessidade` | obrigatório (editais, prestacao_contas, projetos_proprios, lei_incentivo, capacitacao, outro) | obrigatório |
| `populacao_faixa` | | opcional |

PROP (página "Para proponentes", avaliação de projeto):

| Campo | Site | CRM |
|---|---|---|
| `proponente` (nome ou razão social) e `tipo_proponente` (pf, mei, pj, instituicao, municipio) | obrigatório | obrigatório |
| `projeto_nome` | obrigatório | obrigatório |
| `mecanismo` | obrigatório (rouanet, audiovisual, lic_rs, lic_municipal, pnab, nao_sei) | obrigatório |
| `status_projeto` | obrigatório (ideia, em_elaboracao, inscrito, aprovado_captando, em_execucao) | obrigatório |
| `numero_processo` | opcional | obrigatório em `autorizado` |
| `valor_aprovado`, `saldo_a_captar`, `prazo_captacao` | opcional | obrigatório em `autorizado` |
| `segmento_cultural` | obrigatório (enum do art. 18 e demais) | obrigatório |
| `link_material` (deck, site) | opcional | opcional |
| `prestacao_contas_anterior` | opcional (nunca_teve, aprovada, pendente, reprovada) | obrigatório em `avaliacao` |

ALUNO (lista de espera):

| Campo | Site | CRM |
|---|---|---|
| `objetivo` | obrigatório (primeiro_projeto, captar, profissao, atualizar) | obrigatório |
| `experiencia` | obrigatório (nenhuma, ja_escrevi, ja_captei, atuo_em_secretaria) | obrigatório |
| `faixa_investimento` | opcional | opcional |
| `instagram_ou_linkedin` | opcional | opcional |

### 9.4 Entidades do CRM além do lead

| Entidade | Campos mínimos |
|---|---|
| `account` (empresa, escritório, município, proponente) | nome, tipo, cnpj, cidade, uf, setor, contador_id, dono |
| `contact` | nome, cargo, e-mail, telefone, account_id, consentimentos |
| `project` | nome, proponent_id, mecanismo, artigo, numero_processo, valor_aprovado, captado, saldo_a_captar, prazo_captacao, rubrica_captacao_valor, comissao_percentual, stage, cidade, segmento_cultural, contrapartidas |
| `contribution` (aporte) | lead_id ou account_id, project_id, tipo (patrocinio, doacao), mecanismo, valor_previsto, valor_depositado, data_deposito, numero_recibo, data_recibo, data_envio_contador, comissao_devida, comissao_paga_em, contrapartidas_entregues |
| `activity` | tipo (ligacao, reuniao, email, whatsapp, visita, tarefa), data, resumo, lead_id ou account_id, owner_id |
| `partner_referral` | contador_id, lead_id, data, resultado |

## 10. KPIs do funil

Todas as metas abaixo são hipóteses para o primeiro ciclo (outubro de 2026 a dezembro de 2027) e devem ser substituídas pelo histórico da Prospekto assim que a Daniela informar quantos patrocinadores e quanto captou nos últimos três anos (`mercado-e-posicionamento.md`, seção 10). Os sinais de Fase 2 no mesmo documento (seção 9.4) servem de teto de ambição.

| KPI | Definição | Meta inicial (hipótese) | Frequência |
|---|---|---|---|
| Leads por canal | Leads criados por `origem` e por segmento | 40 leads por mês no total até março de 2027; 50% PJ e CONT | semanal |
| Taxa de qualificação | Leads que chegam a `qualificado` sobre leads criados, por segmento | PJ 35%; PF 25%; CONT 50%; MUN 40%; PROP 40% | mensal |
| Reuniões de diagnóstico | Leads em `diagnostico` por mês | 8 PJ por mês de maio a outubro; 16 por mês em setembro e outubro | mensal |
| Taxa diagnóstico para proposta | `proposta` sobre `diagnostico` | 50% | mensal |
| Taxa proposta para termo | `termo` assinado sobre `proposta` | 40% | mensal |
| Aportes fechados | Aportes com depósito confirmado | 12 PJ e 20 PF no ciclo de fim de ano 2026; 25 PJ e 60 PF em 2027 | mensal |
| Valor captado | Soma de `valor_depositado` por mecanismo | R$ 600 mil em 2026 (out a dez); R$ 2 milhões em 2027 | mensal |
| Ticket médio | Valor captado por aporte PJ | R$ 50 mil | trimestral |
| Receita de captação | Comissão devida sobre aportes confirmados, dentro da rubrica | 10% do captado, limitado por projeto (IN MinC 29/2026, art. 19) | mensal |
| Ciclo de venda PJ | Dias de `novo` a `aporte` | 60 dias fora da temporada; 30 dias em outubro a dezembro | trimestral |
| Parceiros contábeis ativos | `contadores` em `ativo` com indicação nos últimos 90 dias | 5 até março de 2027; 12 até dezembro de 2027 | mensal |
| Participação do canal contábil | Aportes PJ com `origem = indicacao_contador` | 30% em 2027 | trimestral |
| Renovação | Patrocinadores do ano anterior que aportam de novo | 60% | anual |
| Concentração | Maior patrocinador sobre o total captado no ano | abaixo de 20% [verificar meta com a Daniela] | anual |
| Carteira | Projetos em `captando` e saldo total a captar | 6 projetos e R$ 2 milhões de saldo em setembro de 2027 | mensal |
| Prazos legais | Recibos emitidos no prazo; prestações de contas entregues em até 60 dias | 100% | mensal |
| SLA de follow-up | Atividades vencidas sobre atividades previstas | abaixo de 10% | semanal |
| Lista de espera | Cadastros em `alunos` | 200 até junho de 2027 (sinal de Fase 2) | mensal |
| Municípios | Contratos de consultoria vigentes | 2 em 2027 | trimestral |
| Consentimento | Leads com `consent_lgpd` e `consent_version` registrados | 100% dos leads de site | semanal |

Como ler: o produto de 40 leads por mês, 35% de qualificação, 50% para proposta e 40% para termo dá cerca de 3 aportes por mês fora da temporada; a meta de 25 aportes PJ em 2027 depende do pico de setembro a dezembro e do canal contábil. Se o histórico da Daniela mostrar ticket médio acima de R$ 50 mil, as metas de valor sobem sem mudar o funil.

## 11. Perguntas para a Daniela

1. Quantos patrocinadores (PJ e PF) e quanto a Prospekto captou em 2023, 2024 e 2025, por mecanismo e por cidade? Qual o ticket médio e o maior patrocinador?
2. Quais projetos estão em carteira hoje, com mecanismo, artigo, número de processo, valor aprovado, saldo a captar e prazo? Quais têm rubrica de captação orçada?
3. Que escritórios contábeis da Serra já indicaram clientes? Existe acordo ou remuneração combinada? Qual modelo de remuneração de parceria é aceitável e lícito (precisa de advogado)?
4. Quem assina e opera hoje: a Daniela faz prospecção, reunião, termo e SALIC sozinha? Há equipe para cumprir os SLAs da seção 8?
5. Quais municípios a Prospekto já atendeu (consultoria, PNAB, editais) e com que instrumento de contratação?
6. Para pessoa física: qual o instrumento usado (termo, carta, só depósito)? Já houve patrocinadores PF de diretorias de empresas patrocinadoras?
7. Tempo real de emissão de recibo por mecanismo (SALIC, Ancine, CHP da LIC-RS) para fixar o SLA de `recibo`.
8. Qual formato de produto digital a Daniela consegue entregar (mentoria em coorte, curso gravado, consultoria em grupo) e com que preço de referência?
9. As mensagens de LinkedIn e WhatsApp podem sair em nome da Daniela? Quem responde?
10. A Prospekto aceita cadastrar a carteira em vitrines complementares (BIP RS da Prosas, Incentiv.me)?

## 12. Fontes

| # | Fonte | URL ou documento | Uso |
|---|---|---|---|
| 1 | `docs/visao.md` | documento interno | Negócio, fases, modelo de receita |
| 2 | `docs/estrategia/mercado-e-posicionamento.md` | documento interno | Números de mercado, sazonalidade (59% no 4º trimestre), concorrentes, remuneração, sinais de Fase 2 |
| 3 | `docs/dominio/leis-de-incentivo.md` | documento interno | Limites de dedução, art. 18 e 26, art. 1º-A, LIC-RS, IN MinC 29/2026, calendário do incentivo, vedações |
| 4 | Guia e apresentação "Contabilizando Cultura" (Prospekto) | `docs/fontes/materiais/` | Mitos 1 e 2, roteiro operacional, divisão de competências com contadores, contato público |
| 5 | Transcrição dos áudios de 03/10/2026 | `docs/fontes/transcricao-audios-2026-10-03.md` | Faixa de aportes (R$ 20 mil a R$ 1 milhão), personas iniciais, produto digital |
| 6 | Deck "A Tacada Perfeita" (Ocotea Filmes) | `docs/fontes/materiais/exemplo-projeto-a-tacada-perfeita-deck.txt` | Modelo de deck e de projeto na carteira |
| 7 | Apresentação fomento.ai | `docs/fontes/materiais/referencia-fomento-ai-apresentacao.txt` | Modelo de parceria com consultorias e escritórios |
| 8 | Lei 9.430/1996, arts. 1º, 5º e 6º | https://www2.camara.leg.br/legin/fed/lei/1996/lei-9430-27-dezembro-1996-367738-normaatualizada-pl.html ; https://modeloinicial.com.br/lei/L-9430-1996/lei-9430/art-6 | Apuração trimestral e anual do IRPJ, prazos de pagamento |
| 9 | Lei 9.718/1998, art. 14 | https://modeloinicial.com.br/lei/L-9718-1998/lei-9718/art-14 | Obrigatoriedade do lucro real (R$ 78 milhões) |
| 10 | Receita Federal, prazo da DIRPF 2026 | https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/marco/receita-comeca-a-receber-declaracoes-do-irpf-no-dia-23-de-marco-prazo-de-entrega-se-encerra-em-29-de-maio | 23/03 a 29/05/2026 |
| 11 | IN RFB 2.004/2021 e prazo da ECF 2026 | https://www.contadores.cnt.br/noticias/artigos/2026/07/03/ecf-2026-empresas-tem-ate-31-de-julho-para-envio-de-dados-a-receita.html | ECF até o último dia útil de julho |
| 12 | Lei 13.709/2018 (LGPD), arts. 5º, 7º, 8º, 10 e 18 | https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-publicacaooriginal-156212-pl.html ; https://www.direitohd.com/lgpd | Consentimento, legítimo interesse, direitos do titular |
| 13 | ADCT, art. 35, § 2º (prazos de LDO e LOA) | https://www.crcsc.org.br/uploads/evento/11360/0lmnWVpzzzy4fOHG405F1C82JkIwhDQs.pdf ; https://aspec.com.br/blog/lei-orcamentaria-anual-prazos-e-vigencia/ | Timing de municípios (fontes secundárias; texto constitucional em planalto.gov.br indisponível na consulta) |
| 14 | IN MinC 30/2026 (prazo PNAB) | https://aam.org.br/ministerio-da-cultura-prorroga-prazo-de-prestacao-de-contas-da-pnab-para-2-de-marco-de-2026/ | Relatório de gestão do 1º ciclo até 02/03/2026 |
| 15 | CNM, nota técnica sobre a PNAB; MinC, cadastro de planos de ação | https://cnm.org.br/comunicacao/noticias/politica-nacional-aldir-blanc-nota-tecnica-orienta-sobre-os-novos-recursos ; https://www.gov.br/cultura/pt-br/assuntos/noticias/pnab-estados-municipios-e-df-podem-cadastrar-planos-de-acao-a-partir-de-amanha-31 | Fluxo PNAB no Transferegov |
| 16 | Lei 8.313/1991, arts. 23 e 27; IN MinC 29/2026, arts. 5º, 19, 53, 54, 69 | via `docs/dominio/leis-de-incentivo.md`, seção 11 | Vedações e prazos usados nos pipelines |
