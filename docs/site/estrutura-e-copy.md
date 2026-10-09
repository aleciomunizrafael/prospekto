# Site institucional: estrutura e copy

> Especificação do site público da Prospekto (Fase 1, item 1 de `docs/visao.md`). Define objetivos, públicos, sitemap, copy das páginas principais, formulários, SEO, design, analytics e integrações. Deriva de `docs/visao.md` (não repete), de `docs/estrategia/personas-e-funis.md` (personas, campos de lead, pipelines e estágios do CRM), de `docs/estrategia/mercado-e-posicionamento.md` (números e posicionamento), de `docs/dominio/leis-de-incentivo.md` (regras legais), de `docs/arquitetura/ADR-001-stack.md` e `docs/arquitetura/scaffold.md` (ferramentas e rotas) e dos materiais da própria Prospekto em `docs/fontes/materiais/`. O simulador tem especificação própria em `docs/site/simulador-spec.md`.
>
> Data de referência: 03/10/2026. Páginas de gov.br estavam restritas na consulta ("conteúdo restrito", período eleitoral); os números oficiais foram confirmados em espelhos de imprensa e estão na tabela de fontes (seção 13). O que não foi confirmado está marcado com "[verificar]".
>
> Convenções: textos de interface em português do Brasil; identificadores de código, rotas internas de API e nomes de eventos em inglês (`docs/arquitetura/next16-convencoes.md`). Nomes de segmento, origem, pipeline e estágio são os de `personas-e-funis.md`, usados literalmente.

## 1. Resumo

- O site tem um trabalho: transformar visitantes em leads qualificados no CRM, por segmento, com consentimento registrado. Tudo o mais (autoridade da Daniela, carteira de projetos, conteúdo) existe para sustentar esse trabalho.
- Três lead magnets puxam o funil: o guia "Contabilizando Cultura" (já existe; precisa de revisão de números antes de ir ao ar), o simulador de incentivo fiscal e o diagnóstico gratuito. A lista de espera da mentoria valida o produto digital.
- A copy reaproveita a linguagem do guia, que a Daniela já aprovou: "Transforme impostos em impacto cultural", "você decide onde o seu imposto é investido", os dois mitos respondidos e o roteiro em seis passos. Os números do guia que não se sustentam ("545 mil empresas", "5% utilizam", "até 8% para PF") não entram no site; a correção está em `mercado-e-posicionamento.md`, seção 4.
- Toda página de segmento segue a mesma espinha: título com a promessa, prova com fonte, como funciona, objeções respondidas, CTA primário (diagnóstico ou simulador) e CTA secundário (WhatsApp).
- Formulários coletam o mínimo, têm caixa de consentimento não pré-marcada e criam o lead no pipeline certo com `origem` e estágio inicial definidos aqui.
- Design sóbrio e institucional, no espírito da apresentação da fomento.ai e do guia: muito espaço em branco, rótulos em caixa alta, listas numeradas, blocos de número grande, sem ilustração genérica.

## 2. Objetivos e públicos

### 2.1 Objetivos (por ordem)

| # | Objetivo | Métrica no site | Meta inicial (hipótese, `personas-e-funis.md`, seção 10) |
|---|---|---|---|
| 1 | Gerar leads de empresas no lucro real e de escritórios contábeis | Leads criados com `segmento` PJ ou CONT | 50% dos 40 leads mensais até março de 2027 |
| 2 | Dar à Daniela e à Prospekto uma presença que sustente a prospecção por LinkedIn, networking e contadores | Visitas vindas de LinkedIn e de indicação; tempo na página "Sobre" | Acompanhar (sem meta no primeiro ciclo) |
| 3 | Expor a carteira de projetos com saldo a captar | Visualizações de projeto; cliques em "Quero patrocinar este projeto" | Acompanhar |
| 4 | Captar pessoas físicas na campanha de dezembro | Leads PF entre outubro e dezembro | 20 aportes PF no ciclo 2026 |
| 5 | Validar a mentoria | Cadastros na lista de espera | 200 até junho de 2027 |
| 6 | Atender municípios e proponentes com formulário próprio | Leads MUN e PROP | Acompanhar |

### 2.2 Públicos e o que cada um precisa encontrar

| Público (código) | Chega por | Quer saber em 10 segundos | Página de entrada | Próximo passo esperado |
|---|---|---|---|---|
| Empresa no lucro real: dono, financeiro, controller (`PJ`) | Indicação do contador, LinkedIn, evento, busca | "Quanto do meu IRPJ posso destinar, é seguro, o que a cidade vai ver" | `/empresas` | Simulador ou diagnóstico |
| Escritório contábil: sócio, gerente fiscal (`CONT`) | Rede do sócio, CRC-RS, LinkedIn, busca | "O que ganho, o que preciso operar, qual a base legal" | `/contadores` | Diagnóstico de carteira ou webinar |
| Pessoa física na declaração completa (`PF`) | Contador, empresa patrocinadora, Instagram | "Quanto posso destinar, até quando, como declaro" | `/pessoa-fisica` | Simulador PF |
| Município e secretaria de cultura (`MUN`) | Rede da Daniela, palestras | "O que a Prospekto faz por uma secretaria e quanto custa" | `/municipios` | Diagnóstico do fomento municipal |
| Proponente e produtora (`PROP`) | Rede cultural, SALIC, Pró-Cultura | "Vocês captam para o meu projeto? Em que condições?" | `/proponentes` e `/projetos` | Enviar projeto para avaliação |
| Interessado na mentoria (`ALUNO`) | Conteúdo da Daniela, palestras | "O que vou aprender, quando abre, quanto custa" | `/mentoria` | Lista de espera |
| Imprensa, parceiros, curiosos | Busca | "Quem é a Prospekto" | `/sobre`, `/contato` | Contato |

## 3. Sitemap

Rotas públicas vivem no route group `src/app/(site)` (`docs/arquitetura/next16-convencoes.md`). Rotas em português, curtas, sem acento. Todas as páginas têm o mesmo cabeçalho (logo, menu com Empresas, Contadores, Pessoa física, Projetos, Sobre, botão "Simular") e o mesmo rodapé (contato, política de privacidade, ressalva legal, CNPJ [verificar]).

| Rota | Página | Objetivo | CTA principal | CTA secundário | Lead magnet | Pipeline e estágio do lead | `origem` |
|---|---|---|---|---|---|---|---|
| `/` | Home | Explicar o que a Prospekto faz e mandar cada público para a sua página | "Simule quanto do seu imposto pode virar cultura" | "Falar no WhatsApp" | Guia (bloco no meio da página) | conforme o formulário usado | `site` |
| `/empresas` | Para empresas | Converter decisor de empresa no lucro real | "Agendar diagnóstico gratuito" | "Simular agora" | Simulador PJ; guia | `patrocinadores`, `novo`, `tipo_pessoa = PJ` | `diagnostico` ou `simulador` |
| `/contadores` | Para contadores | Converter escritório contábil em parceiro | "Pedir o diagnóstico da carteira" | "Baixar o guia" | Guia; webinar; tabela comparativa de incentivos (PDF) | `contadores`, `novo` | `site` (formulário), `guia` (download) |
| `/pessoa-fisica` | Para pessoas físicas | Converter contribuinte da declaração completa | "Simular meu limite" | "Ver projetos da minha cidade" | Simulador PF; artigo "sem cair na malha" | `patrocinadores`, `novo`, `tipo_pessoa = PF` | `simulador` |
| `/municipios` | Para municípios | Converter secretaria de cultura em cliente de consultoria | "Pedir diagnóstico do fomento municipal" | "Falar no WhatsApp" | Checklist "PNAB sem devolver recurso" (PDF) | `municipios`, `novo` | `site` |
| `/proponentes` | Para proponentes | Receber projetos para avaliação e captação | "Enviar meu projeto para avaliação" | "Ver a carteira" | Checklist de projeto captável (PDF) | `projetos`, `prospeccao` | `site` |
| `/projetos` | Projetos em captação | Mostrar a carteira com saldo a captar | "Quero patrocinar este projeto" (por cartão) | "Simular" | nenhum | `patrocinadores`, `novo`, com `projeto_id` de interesse | `site` |
| `/projetos/[slug]` | Página do projeto | Vender um projeto específico | "Quero patrocinar este projeto" | "Baixar apresentação" (PDF, se autorizado) | Deck do projeto | idem | `site` |
| `/sobre` | Sobre a Daniela e a Prospekto | Construir confiança | "Agendar uma conversa" | "LinkedIn da Daniela" | nenhum | conforme o formulário | `site` |
| `/guia` | Guia gratuito (captura) | Capturar lead em troca do PDF | "Baixar o guia" | nenhum | Guia "Contabilizando Cultura" | `patrocinadores` (PJ ou PF) ou `contadores`, conforme o campo `perfil`; `novo` | `guia` |
| `/simulador` | Simulador de incentivo fiscal | Capturar lead qualificado com valor em reais | "Ver resultado detalhado" (formulário de captura) | "Agendar diagnóstico" (no resultado) | O próprio simulador | `patrocinadores`, `novo`, com `irpj_faixa` ou `ir_devido_faixa` | `simulador` |
| `/diagnostico` | Diagnóstico gratuito | Agendar o diagnóstico: 30 minutos com o contador (PJ) ou ligação de 15 minutos (PF); quem ainda não quer envolver o contador escolhe a simulação de 20 minutos | "Pedir meu diagnóstico" | "Falar no WhatsApp" | A reunião | `patrocinadores`, `novo` (vai a `qualificado` quando a reunião é marcada) | `diagnostico` |
| `/mentoria` | Mentoria (lista de espera) | Validar demanda do produto digital | "Entrar na lista de espera" | nenhum | Aula aberta gravada (quando existir) | `alunos`, `lista_espera` | `site` |
| `/conteudo` e `/conteudo/[slug]` | Conteúdo | Trazer busca orgânica e nutrir leads | Bloco "Baixe o guia" ao fim de cada artigo | "Simular" | Guia | `patrocinadores` ou `contadores`, `novo` | `guia` |
| `/contato` | Contato | Receber qualquer pedido | "Enviar" | "WhatsApp" | nenhum | pipeline conforme `assunto` (seção 5.5); tag `triagem` só para imprensa e outro | `site` |
| `/privacidade` | Política de privacidade | Cumprir a LGPD e fundamentar o consentimento | nenhum | nenhum | nenhum | | |
| `/obrigado/[tipo]` | Confirmação | Confirmar o envio e indicar o próximo passo | WhatsApp ou agenda | | | | |

Páginas de campanha (por exemplo `/empresas/ultima-chance`, `docs/playbooks/campanhas.md`, seção 3.1) são variações de `/empresas` com prazo visível e contador de dias úteis; não entram no menu.

## 4. Copy das páginas principais

Regras da copy, válidas em todas as páginas:

- Números só com fonte; a fonte aparece em nota de rodapé na própria página (lista na seção 13).
- Nunca "545 mil empresas", "5% usam" nem "8% para PF". Usar "menos de 3% das empresas elegíveis [verificar]" e "6% do imposto devido (7% quando inclui esporte)".
- Nunca prometer retorno financeiro, "custo zero" no art. 26, dedução no presumido ou Simples pela Rouanet, nem aprovação garantida (`leis-de-incentivo.md`, seção 10.2).
- Ressalva legal em toda página com número: "O cálculo final do limite é feito pelo contador, conforme a legislação vigente. Conteúdo informativo; não substitui orientação contábil ou jurídica."
- Depoimentos só com autorização por escrito. Até lá, o bloco de depoimentos não existe; a prova é institucional (recibo, SALIC, estudos, números oficiais).
- Linguagem fiscal, não política: SALIC, recibo de mecenato, DARF, ECF; nunca "polêmica", "governo", "esquerda ou direita".
- Duas reuniões de fundo de funil, com nome e duração fixos em todo o site, nos playbooks (`docs/playbooks/`) e no CRM (estágio `diagnostico` de `personas-e-funis.md`, seção 8.1):

| Reunião | Duração | Quem participa | O que acontece | Quando oferecer |
|---|---|---|---|---|
| Simulação | 20 minutos | Daniela e o decisor da empresa; sem o contador | Conta do limite com o IRPJ projetado, dois ou três projetos da carteira, lista de documentos para o contador | Primeiro passo depois do simulador, do guia, do LinkedIn ou de um evento |
| Diagnóstico | 30 minutos (PJ); 15 minutos por ligação (PF) | Daniela, o decisor e o contador da empresa (PF: só a pessoa) | Limite confirmado com quem apura o imposto, projeto escolhido, valor indicativo, próximos passos com data | CTA primário de `/empresas` e `/diagnostico`; conclui o estágio `diagnostico` |

Na copy: "simulação" é sempre a reunião curta sem contador; "diagnóstico" é sempre a reunião com o contador (ou a ligação de 15 minutos para PF). Não usar "reunião de 20 minutos" sem o nome.

### 4.1 Home (`/`)

**Rótulo:** PROSPEKTO CONSULTORIA & PROJETOS · SERRA GAÚCHA

**Título:** Transforme o imposto da sua empresa em cultura na Serra Gaúcha, sem burocracia.

**Subtítulo:** Empresas tributadas pelo lucro real podem destinar até 4% do imposto de renda devido a projetos culturais aprovados pelo Ministério da Cultura. O valor sai do imposto que já seria pago; a diferença é que ele vira um projeto com a sua marca, aqui na região. A Prospekto cuida do processo. O seu contador só lança a dedução.

**CTAs do topo:** [Simular quanto cabe na minha empresa] (primário, para `/simulador`) · [Falar com a Daniela no WhatsApp] (secundário, link `wa.me`, seção 10.1)

**Barra de confiança (abaixo do topo):** "Projetos aprovados pelo Ministério da Cultura (SALIC) e pela Ancine" · "Recibo de mecenato oficial" · "Operação completa: termo, depósito, recibo e prestação de contas" · "Atuação na Serra Gaúcha e no RS"

**Bloco "Para quem é" (quatro cartões, cada um leva à sua página):**

| Cartão | Título | Texto | Link |
|---|---|---|---|
| 1 | Empresas no lucro real | Até 4% do IRPJ devido pode ir para um projeto cultural da sua região, com recibo oficial. Veja quanto cabe na sua empresa. | `/empresas` |
| 2 | Escritórios contábeis | Ofereça incentivo cultural aos seus clientes sem operar nada: a Prospekto traz os projetos e faz o processo; o escritório fica com o crédito. | `/contadores` |
| 3 | Pessoas físicas | Quem declara pelo modelo completo pode destinar até 6% do imposto devido a um projeto da sua cidade, até dezembro. | `/pessoa-fisica` |
| 4 | Municípios e proponentes | Consultoria para secretarias de cultura e captação para projetos aprovados com saldo a captar. | `/municipios` e `/proponentes` |

**Bloco "Como funciona" (rótulo: GUIA PRÁTICO; seis passos numerados, reaproveitados do guia, seção 3.1):**

1. Confirmar a elegibilidade: a empresa é tributada pelo lucro real e apura imposto de renda devido no período.
2. Escolher o projeto: um projeto com portaria de autorização vigente no SALIC (Ministério da Cultura) ou despacho da Ancine.
3. Formalizar: termo de patrocínio com o proponente, com valor, cronograma e contrapartidas.
4. Depositar: transferência identificada para a conta vinculada do projeto, aberta no Banco do Brasil.
5. Receber o recibo: o recibo de mecenato é emitido no SALIC e enviado à empresa e ao contador.
6. Deduzir: o contador abate o valor do IRPJ no DARF do período e informa na ECF.

Linha abaixo dos passos: "A Prospekto assume a gestão burocrática, a emissão dos recibos no SALIC e a prestação de contas exigida pela lei. O patrocinador deposita e lança." (guia, seção 3.1, "Responsabilidade operacional")

**Bloco "Números" (rótulo: O QUE OS DADOS MOSTRAM; quatro blocos de número grande):**

| Número | Legenda | Fonte (nota de rodapé) |
|---|---|---|
| R$ 3,41 bilhões | captados pela Lei Rouanet em 2025, recorde pelo terceiro ano | MinC, jan/2026 (fonte 1) |
| R$ 203,4 milhões | movimentados pela Lei Rouanet no Rio Grande do Sul em 2025 | MinC, mai/2026 (fonte 2) |
| R$ 9,81 | gerados na economia do Sul para cada R$ 1 incentivado (R$ 7,59 na média nacional) | FGV para o MinC, jan/2026 (fonte 3) |
| menos de 3% | das empresas no lucro real usam o incentivo [verificar] | `mercado-e-posicionamento.md`, seção 4 (fonte 4) |

**Bloco "Mito e fato" (rótulo: DESMISTIFICANDO; dois cartões lado a lado, texto do guia, seção 1.1):**

- Mito 1: "Patrocinar via Lei Rouanet atrai fiscalização ou gera problema com a Receita Federal." Fato: o incentivo cultural é um benefício expressamente previsto em lei (Lei 8.313/1991 e Lei 9.532/1997). Todo o fluxo ocorre no SALIC, com conta bancária vinculada e monitorada pelo Ministério da Cultura e pelo Banco do Brasil. Não é brecha fiscal nem manobra; é um ato declaratório alinhado às normas contábeis e fiscais.
- Mito 2: "Só grandes artistas consagrados ou multinacionais usam a lei." Fato: a lei contempla iniciativas de todos os portes e linguagens: música, teatro, dança, patrimônio, literatura, circo, museus, artes visuais. Em 2025, mais de 6,2 mil CNPJs patrocinaram projetos; só em Caxias do Sul havia 42 projetos em execução. Qualquer empresa no lucro real e qualquer pessoa física na declaração completa pode participar. (fontes 5 e 2)

**Bloco "Projetos em captação" (três cartões da carteira, puxados do CRM; ver `/projetos`):** título, cidade, mecanismo e artigo, saldo a captar, botão "Ver projeto". Se a carteira tiver menos de três projetos publicáveis, o bloco mostra um só cartão e o texto "Novos projetos entram na carteira ao longo do ano. Quer ser avisado? [Deixe seu e-mail]".

**Bloco "Guia gratuito" (captura curta):** "Contabilizando Cultura: guia prático para empresas e contadores. Entenda, com segurança jurídica e clareza operacional, como direcionar parte do imposto de renda devido para projetos culturais." Formulário de três campos (seção 5.2) e botão "Baixar o guia".

**Bloco "Sobre a Daniela" (foto, três linhas, link para `/sobre`):** "Daniela Sandrin Copat elabora, inscreve, capta e presta contas de projetos culturais em leis de incentivo federais e estaduais, e presta consultoria em cultura e economia criativa para empresas e municípios da Serra Gaúcha. [Conheça a Prospekto]" [verificar: anos de atuação, formação e projetos que podem ser citados]

**CTA final:** "Quanto do imposto da sua empresa pode virar cultura este ano?" [Simular agora] [Agendar diagnóstico gratuito]

**Rodapé:** Prospekto Consultoria & Projetos · Responsável: Daniela Sandrin Copat · projetos@prospekto.com.br · WhatsApp (54) 98403-2180 · Serra Gaúcha, RS [verificar cidade e endereço] · CNPJ [verificar] · Política de privacidade · Ressalva legal · Fontes dos números.

### 4.2 Para empresas (`/empresas`)

**Rótulo:** PARA EMPRESAS NO LUCRO REAL

**Título:** Até 4% do seu IRPJ já tem destino. Você escolhe qual.

**Subtítulo:** A Lei Federal de Incentivo à Cultura (Lei 8.313/1991) permite que empresas tributadas pelo lucro real destinem até 4% do imposto de renda devido a projetos culturais aprovados pelo Ministério da Cultura. Não é gasto adicional: é a prerrogativa legal de direcionar uma parcela do imposto que já seria recolhido. (guia, seção 1)

**CTAs:** [Agendar diagnóstico gratuito de 30 minutos, com o seu contador] (primário) · [Simular agora] (secundário)

**Bloco "O que a sua empresa ganha" (rótulo: POR QUE INVESTIR EM CULTURA; três colunas, texto da apresentação do guia):**

| Título | Texto |
|---|---|
| Visibilidade e reputação | O marketing cultural posiciona a marca em contextos de alto valor simbólico, perto de públicos engajados e formadores de opinião, na cidade onde a empresa está. |
| Compromisso com a comunidade | Associar a marca a um projeto cultural da região fortalece o vínculo com clientes, colaboradores e poder público, e gera conteúdo para a comunicação interna e externa. |
| Comprovante oficial | O recibo de mecenato emitido no SALIC comprova o aporte perante a Receita Federal e serve de evidência para relatórios de ESG e de responsabilidade social. |

**Bloco "Quanto cabe" (rótulo: A CONTA; exemplo numérico e simulador embutido):**

"Uma indústria com R$ 2 milhões de IRPJ devido (15% sobre o lucro real, sem contar o adicional de 10%) pode destinar até R$ 80 mil a projetos culturais. Com R$ 500 mil de IRPJ, até R$ 20 mil. Se a empresa também usar esporte (2%) e os fundos da criança, do idoso, Pronon e Pronas (1% cada), chega a 10% do IRPJ com outro destino." (`leis-de-incentivo.md`, seções 7 e 8.1; `parametros-simulador.json`, `exemplos.pj`)

Aviso abaixo: "A Lei Complementar 224/2025 prevê redução de 10% nos incentivos federais a partir de 2026. Se prevalecer a leitura da Receita Federal, o limite de cultura fica em 3,6% do IRPJ devido; o Ministério da Cultura contesta. O simulador mostra os dois cenários. [verificar]" (`leis-de-incentivo.md`, seção 2.5)

Botão: [Simular com os números da minha empresa]

**Bloco "Como funciona" (os seis passos da Home, com um sétimo):** 7. Ativar as contrapartidas: marca no material do projeto, cotas de ingressos, ações de relacionamento, acompanhadas pela Prospekto. (guia, seção 3.1, passo 7)

**Bloco "Quem faz o quê" (tabela, guia seção 5.1):**

| Sua empresa e seu contador | Prospekto |
|---|---|
| Confirmam o regime (lucro real) e projetam o IRPJ do período | Apresenta projetos com portaria vigente e saldo a captar |
| Escolhem o projeto e aprovam o valor | Formaliza o termo de patrocínio com o proponente |
| Fazem o depósito identificado na conta vinculada | Acompanha o depósito e emite o recibo de mecenato no SALIC |
| Lançam a dedução no DARF e na ECF | Executa a prestação de contas perante o Ministério da Cultura |
| Usufruem das contrapartidas | Entrega e comprova as contrapartidas |

**Bloco "Objeções respondidas" (rótulo: PERGUNTAS QUE OUVIMOS; acordeão; respostas de `personas-e-funis.md`, seção 3.1, e do guia, seção 1.1):**

| Pergunta | Resposta |
|---|---|
| Isso dá problema com a Receita Federal? | Não. É dedução prevista em lei (Lei 8.313/1991 e Lei 9.532/1997), com conta vinculada no Banco do Brasil, depósito identificado e recibo emitido no SALIC. O contador lança no DARF e informa na ECF. Não é brecha nem manobra: é um ato declaratório. |
| Isso é coisa de grande empresa? | Em 2025, mais de 6,2 mil CNPJs patrocinaram projetos pela Lei Rouanet, e cerca de 75% do valor veio de fora das dez maiores empresas. Em Caxias do Sul havia 42 projetos em execução. (fontes 5 e 2) |
| É gasto? Não tenho orçamento para isso. | Não é gasto novo. O valor sai do IRPJ que a empresa já vai pagar, dentro de 4% do imposto devido. No art. 18 da Lei Rouanet e no art. 1º-A da Lei do Audiovisual, a dedução é de 100% do aporte dentro do limite; o custo líquido é zero. |
| Meu contador nunca falou disso. | Menos de 3% das empresas no lucro real usam o incentivo [verificar]. A Prospekto trabalha com o escritório da sua empresa: ele valida o limite e lança a dedução; nós fazemos o resto. O contador pode participar do diagnóstico. |
| Já patrocino esporte ou doo para o fundo da criança. Ainda cabe? | Cabe. Esporte (2%), fundo da criança e do idoso (1% cada) têm tetos próprios. A cesta cultural de 4% (Rouanet, Audiovisual e esporte de inclusão social) é separada. (Solução de Consulta Cosit 4/2026) |
| Minha empresa está no lucro presumido. | A Rouanet exige lucro real. Mas empresas contribuintes de ICMS no RS, fora do Simples, podem patrocinar pela Lei de Incentivo à Cultura do estado (LIC-RS), compensando o valor no ICMS. Fale conosco para avaliar. |
| Quanto a Prospekto cobra da minha empresa? | Nada. A remuneração de captação sai do orçamento do projeto, dentro do limite legal (IN MinC 29/2026, art. 19). Se a empresa quiser consultoria própria (planejamento, ativação de marca), é contrato separado. |
| Quero retorno financeiro. | Patrocínio incentivado não devolve dinheiro ao patrocinador; devolve dedução e contrapartidas de imagem. É vedação legal. Participação em receita existe só no art. 1º da Lei do Audiovisual (investimento em cotas), outro produto. |
| Já tentei com outro consultor e deu trabalho. | A Prospekto assume termo, recibo, prestação de contas e contrapartidas. O patrocinador só deposita e lança. |
| Estamos com prejuízo este ano. | Sem IRPJ devido não há dedução. Deixe seu contato e voltamos no próximo período de apuração. |

**Bloco "Prazo" (destaque):** "Para valer na apuração do ano, o depósito precisa acontecer até o último dia útil bancário de dezembro. Empresas com apuração trimestral decidem a cada trimestre." (`leis-de-incentivo.md`, seção 9)

**Bloco "Projetos em captação":** mesmos cartões da Home, filtrados por mecanismo PJ.

**CTA final:** "Faça a conta com o seu contador presente." [Agendar diagnóstico gratuito] [Falar no WhatsApp]

**Ressalva:** texto padrão (seção 4).

### 4.3 Para contadores (`/contadores`)

**Rótulo:** PARA ESCRITÓRIOS CONTÁBEIS E CONSULTORIAS TRIBUTÁRIAS

**Título:** Ofereça incentivo cultural aos seus clientes sem operar nada.

**Subtítulo:** Para o escritório, a Lei Rouanet é uma ferramenta de planejamento fiscal e de agregação de valor aos clientes no lucro real. A Prospekto traz os projetos aprovados, formaliza o patrocínio, emite o recibo no SALIC e presta contas. O escritório identifica os clientes elegíveis, calcula o limite e lança a dedução. E fica com o crédito pela ideia. (guia, seções 4 e 5)

**CTAs:** [Pedir o diagnóstico da minha carteira] (primário) · [Baixar o guia Contabilizando Cultura] (secundário)

**Bloco "Fundamentação técnica" (rótulo: BASE LEGAL; tabela do guia, seção 4, corrigida):**

| Contribuinte | Regime ou modalidade | Limite de dedução | Base de cálculo | Fonte |
|---|---|---|---|---|
| Pessoa jurídica | Lucro real (trimestral ou anual) | Até 4% do IRPJ devido, em cesta compartilhada entre Rouanet (arts. 18 e 26), Lei do Audiovisual (arts. 1º e 1º-A) e esporte de inclusão social | Imposto à alíquota de 15% sobre o lucro real. O adicional de 10% não entra na base e não admite dedução. | Lei 9.532/1997, art. 6º, II; Lei 9.249/1995, art. 3º, § 4º; SC Cosit 4/2026 |
| Pessoa física | Declaração de ajuste anual pelo modelo completo | Até 6% do imposto devido, somando cultura, audiovisual, fundo da criança e fundo do idoso; 7% quando inclui esporte | Imposto devido apurado na declaração | Lei 9.532/1997, art. 22; Lei 9.250/1995, art. 12; Lei 14.439/2022 |

Nota em destaque: "Não existe limite de 8% para pessoa física na legislação federal vigente. O art. 18 da Lei Rouanet dá dedução integral do aporte para artes cênicas, música erudita ou instrumental e outros segmentos, mas não altera o teto de 6%." (`leis-de-incentivo.md`, seção 2.3)

**Bloco "Art. 18 e art. 26" (tabela curta):**

| | Art. 18 (dedução integral) | Art. 26 (dedução parcial) |
|---|---|---|
| Quanto do aporte vira dedução | 100% | PJ: 40% da doação, 30% do patrocínio |
| Despesa operacional | Não (art. 18, § 2º) | Sim (art. 26, § 1º): reduz também a base do IRPJ e da CSLL |
| Custo líquido para a PJ, dentro do teto | Zero | Maior que zero; depende da apuração da empresa |

**Bloco "Planejamento em conjunto" (rótulo: TODOS OS INCENTIVOS SOBRE O IR; tabela resumida de `leis-de-incentivo.md`, seção 7, com link para o PDF completo):**

| Incentivo | PJ lucro real | PJ com LC 224 [verificar] | Despesa operacional | PF (modelo completo) |
|---|---|---|---|---|
| Rouanet art. 18 | 4% | 3,6% | Não | 6% (cesta PF) |
| Rouanet art. 26 | 4% (40% doação, 30% patrocínio) | 3,6% | Sim | 6% (80% doação, 60% patrocínio) |
| Audiovisual art. 1º-A | 4% (mesma cesta) | 3,6% | Não | 6% (cesta PF) |
| Audiovisual art. 1º | 3% (mesma cesta) | 2,7% | Sim | 3% |
| Esporte | 2% (teto próprio) | 1,8% | Não | 7% em conjunto |
| FIA | 1% | 0,9% | Não | 6% (cesta PF); 3% na própria declaração |
| Fundo do Idoso | 1% | 0,9% | Não | 6% (cesta PF); 3% na própria declaração |
| Pronon e Pronas | 1% cada | 0,9% | Não | sem dedução em 2026 [verificar] |

Linha: "Soma máxima teórica para uma PJ no lucro real: 10% do IR devido (9% na leitura da LC 224/2025). Cultura é a fatia maior e a mais simples de ativar."

**Bloco "Divisão de competências" (guia, seção 5.1):**

| Escritório contábil | Prospekto |
|---|---|
| Identificar os clientes elegíveis no lucro real | Disponibilizar projetos chancelados pelo Ministério da Cultura e pela Ancine |
| Calcular o limite nominal de dedução (4% do IRPJ) | Conduzir a formalização do patrocínio |
| Registrar a dedução na apuração do DARF e na ECF | Emitir o recibo de mecenato no SALIC |
| Orientar o cliente sobre conformidade | Executar a prestação de contas e garantir as contrapartidas |

**Bloco "Vantagens para o escritório" (guia, seção 5.2):** Diferenciação competitiva (posicionar o escritório como parceiro estratégico, acima da concorrência por preço); Valor institucional (economia tributária com impacto social concreto fortalece o vínculo com o cliente); Expansão de relacionamento (acesso a empresas e projetos engajados em governança).

**Bloco "Retorno econômico" (guia, seção 4.1, atualizado):** "Pesquisa da FGV para o Ministério da Cultura, divulgada em janeiro de 2026, mostra que cada R$ 1 incentivado pela Lei Rouanet em 2024 devolveu R$ 7,59 em atividade econômica; no Sul, R$ 9,81. A cadeia dos projetos gerou ou manteve 228 mil postos de trabalho e R$ 1,39 em tributos por R$ 1 de renúncia." (fonte 3)

**Bloco "Objeções respondidas" (`personas-e-funis.md`, seção 3.2):**

| Pergunta | Resposta |
|---|---|
| Vou ter de entregar minha lista de clientes? | Não. O escritório faz a triagem (regime e IRPJ) e apresenta a Prospekto só a quem quiser. A relação continua do contador. |
| Se o projeto der errado, sobra para mim? | O incentivador de boa-fé mantém a dedução; a prestação de contas é da Prospekto e do proponente. O escritório lança apenas o recibo oficial. |
| A norma muda todo ano. | A Prospekto manda ao escritório a atualização resumida (IN MinC 29/2026, SC Cosit 4/2026, LC 224/2025). |
| Meus clientes estão no presumido. | Para contribuintes de ICMS no RS existe a LIC-RS, que não exige lucro real. |
| O que o escritório ganha? | Não trabalhamos com comissão para o escritório: a norma limita e fiscaliza o que sai do orçamento do projeto (IN MinC 29/2026, art. 19, § 3º) e o contador tem o próprio código de ética (NBC PG 01/2019). O programa é de co-marketing e formação: kit do analista fiscal, webinar e treinamento da equipe, atendimento prioritário aos clientes indicados, menção como escritório parceiro no site e nos materiais, evento anual para os seus clientes. O ganho do escritório é na relação com o cliente: planejamento tributário mais completo e retenção. (`docs/playbooks/parceiros-contadores.md`, seção 3) |
| Já fazemos isso internamente. | A diferença é a carteira de projetos aprovados e a operação no SALIC. Nenhum escritório precisa assumir prestação de contas de projeto cultural. |

**Bloco "Diagnóstico de carteira" (como funciona):** "O escritório informa quantos clientes estão no lucro real e em que faixa de IRPJ. Em até 5 dias úteis, devolvemos o potencial de destinação em reais, por cliente (sem nomes), e uma proposta de reunião conjunta com os três clientes mais aderentes." [verificar prazo com a Daniela]

**Bloco "Kit do analista fiscal" (lista do que o escritório recebe):** passo a passo do lançamento no DARF e na ECF; modelo de memória de cálculo do limite; modelo de termo de patrocínio; checklist do depósito identificado; calendário fiscal do incentivo.

**CTA final:** "Junte-se aos escritórios contábeis que já estão transformando a forma como seus clientes investem o IR: com cultura, estratégia e impacto social." (apresentação do guia) [Pedir o diagnóstico da carteira] [Baixar o guia]

### 4.4 Para pessoas físicas (`/pessoa-fisica`)

**Rótulo:** PARA QUEM DECLARA PELO MODELO COMPLETO

**Título:** Até 6% do seu imposto de renda pode virar um projeto cultural na sua cidade.

**Subtítulo:** Pessoas físicas que entregam a declaração pelo modelo completo podem destinar parte do imposto devido a projetos culturais aprovados. O procedimento é direto: simular o imposto, transferir o valor para a conta do projeto até o último dia útil bancário de dezembro e informar na declaração do ano seguinte. (guia, seção 3.2, com o limite corrigido)

**CTAs:** [Simular meu limite] (primário) · [Ver projetos abertos a pessoa física] (secundário)

**Bloco "Quanto é" (dois exemplos, `parametros-simulador.json`, `exemplos.pf`):**

| Imposto devido na declaração | Limite (6%) | Com esporte (7%) |
|---|---|---|
| R$ 20.000 | R$ 1.200 | R$ 1.400 |
| R$ 80.000 | R$ 4.800 | R$ 5.600 |

Linha: "O limite de 6% é compartilhado entre cultura, audiovisual, fundo da criança e fundo do idoso (Lei 9.532/1997, art. 22). Se você já doa para o fundo da criança, o que sobrar pode ir para cultura."

**Bloco "Como funciona" (três passos):**

1. Calcule: estime o imposto devido do ano (holerites, carnê-leão, ganhos) e aplique 6%. O simulador faz isso para você.
2. Deposite: transferência identificada com o seu CPF para a conta vinculada do projeto, até o último dia útil bancário de dezembro. A Prospekto envia os dados e confirma o depósito.
3. Declare: você recebe o recibo de mecenato e informa o valor na ficha "Doações Efetuadas" da declaração do ano seguinte. Enviamos a instrução para o seu contador.

**Bloco "Objeções respondidas" (`personas-e-funis.md`, seção 3.3):**

| Pergunta | Resposta |
|---|---|
| É pouco dinheiro. Vale a pena? | O valor sai do imposto, não do bolso. Somado a outros apoiadores, fecha uma cota de um projeto da sua cidade, com o seu nome quando o projeto prevê reconhecimento. |
| Vou cair na malha fina? | O recibo de mecenato é o documento oficial que comprova o aporte. Ele vai na ficha "Doações Efetuadas", no código de incentivo à cultura. Enviamos o recibo e a instrução ao seu contador. |
| Meu contador faz minha declaração; não quero mexer. | Não precisa. Mandamos o recibo e o passo a passo direto para quem faz a sua declaração. |
| Posso doar na hora de declarar, como no fundo da criança? | Para cultura, não. A opção de doar na própria declaração existe só para os fundos da criança e do idoso (até 3%). Para cultura, o depósito precisa acontecer até dezembro do ano-calendário. |
| Declaro pelo modelo simplificado. | O modelo simplificado não permite deduzir incentivos. Vale conferir com o contador qual modelo compensa mais no seu caso. |

**Bloco "Só 0,03%" (número grande):** "Apenas 0,03% dos contribuintes usam esse benefício: 13.580 pessoas físicas em 2025, entre 43,3 milhões de declarações." (fontes 5 e 6; guia, seção 3.2)

**Bloco "Prazo" (destaque com contador em novembro e dezembro):** "Depósito até o último dia útil bancário de dezembro de [ano]."

**CTA final:** [Simular meu limite] [Falar no WhatsApp]

### 4.5 Sobre a Daniela e a Prospekto (`/sobre`)

**Rótulo:** QUEM FAZ

**Título:** Projetos culturais que saem do papel, prestam contas e dão certo.

**Subtítulo:** A Prospekto Consultoria & Projetos elabora, inscreve, capta e gerencia projetos culturais em leis de incentivo federais (Lei Rouanet, Lei do Audiovisual) e estaduais (LIC-RS), e presta consultoria em cultura e economia criativa para empresas e municípios. Responsável: Daniela Sandrin Copat. Base: Serra Gaúcha, Rio Grande do Sul.

**Bloco "Daniela Sandrin Copat" (foto, biografia):** [verificar com a Daniela: formação, anos de atuação, projetos elaborados e aprovados, municípios atendidos, cursos ministrados, participação em conselhos ou comissões]. Até a biografia aprovada, o bloco publica só o que está nas fontes: responsável pela Prospekto; autora do guia "Contabilizando Cultura"; atuação em elaboração, captação e gestão de projetos culturais e em consultoria para empresas e municípios.

**Bloco "O que fazemos" (quatro itens):**

| Serviço | Para quem | O que entrega |
|---|---|---|
| Captação de patrocínio incentivado | Projetos aprovados com saldo a captar; empresas e pessoas físicas que querem destinar imposto | Apresentação do projeto, termo, depósito identificado, recibo, contrapartidas |
| Elaboração e gestão de projetos | Proponentes, produtoras, instituições, municípios | Projeto inscrito no SALIC, na Ancine ou no Pró-Cultura RS; execução e prestação de contas |
| Consultoria em cultura e economia criativa | Empresas e municípios | Planejamento, editais, PNAB, leis municipais de incentivo, aproximação entre empresas e cultura local |
| Formação | Quem quer escrever e captar projetos | Guia, conteúdo e, em breve, mentoria (lista de espera) |

**Bloco "Como trabalhamos" (rótulo: COMO TRABALHAMOS; três passos no estilo da fomento.ai):**

1. Entendimento: conhecemos a empresa, o escritório ou o projeto, o momento e o que se quer realizar. Ponto de partida: regime tributário, IRPJ projetado ou imposto devido, cidade, interesse.
2. Análise: cruzamos o perfil com a carteira e com os mecanismos (Rouanet art. 18 ou 26, Audiovisual art. 1º-A, LIC-RS). Resultado: alternativas compatíveis, valor possível e pontos a confirmar com o contador.
3. Operação: termo, depósito, recibo, prestação de contas, contrapartidas. Próximos passos sempre com data.

**Bloco "Princípios" (quatro linhas):** Informação com origem (toda regra citada tem lei, artigo e data); Zero burocracia para o patrocinador; Projetos da região, visíveis e com prestação de contas pública; Nada de promessa que a lei não sustenta.

**Bloco "Carteira e histórico":** [verificar com a Daniela: quantidade de projetos elaborados, aprovados e captados; valor captado por ano; patrocinadores que autorizam citação]. Até lá, o bloco mostra apenas os projetos publicáveis em `/projetos`.

**Bloco "Contato":** projetos@prospekto.com.br · WhatsApp (54) 98403-2180 · LinkedIn da Daniela [verificar URL] · Instagram [verificar].

**CTA final:** [Agendar uma conversa] [Falar no WhatsApp]

### 4.6 Demais páginas: estrutura e título

| Página | Título | Estrutura (blocos, na ordem) |
|---|---|---|
| `/municipios` | Fomento cultural executado sem devolver recurso. | Rótulo PARA SECRETARIAS DE CULTURA; subtítulo (PNAB, editais, leis municipais de incentivo, projetos do município na LIC-RS e na Rouanet; `leis-de-incentivo.md`, seções 5 e 6); "O que resolvemos" em três perguntas no estilo fomento.ai (quais recursos existem para o município; o que precisa estar pronto; como organizar o calendário); serviços (plano de ação PNAB, editais e comissões, prestação de contas, projetos próprios, lei municipal de incentivo com Caxias do Sul como referência, aproximação com empresas locais); calendário (LDO até 15/04, LOA até 31/08, prazos PNAB, editais LIC-RS); objeções (orçamento, contratação pública, "já temos consultoria"); formulário de diagnóstico; lead magnet "Checklist PNAB sem devolver recurso" (PDF) [a produzir]. |
| `/proponentes` | Projeto aprovado precisa de patrocinador. Nós buscamos. | Rótulo PARA PROPONENTES E PRODUTORAS; subtítulo (captação dentro do limite legal: até 10% do projeto, teto R$ 150 mil, paga só sobre o captado; IN MinC 29/2026, art. 19); "Quem entra na carteira" (portaria vigente, saldo entre R$ 100 mil e R$ 1,5 milhão, apelo regional, prestação de contas em dia); como funciona (envio, parecer de captabilidade em 1 página, contrato, deck, cotas, captação, recibos); "Ainda não tem projeto?" (elaboração e inscrição à parte, janela do SALIC de 1º/02 a 31/10); objeções ("já tenho captador", "10% é caro", "música popular não cabe no art. 18"); formulário; checklist de projeto captável (PDF) [a produzir]. |
| `/projetos` | Projetos aprovados, com saldo a captar, na sua região. | Filtros (cidade, mecanismo, segmento cultural, aceita pessoa física); cartões puxados do CRM (estágio `captando`): título, proponente, cidade, mecanismo e artigo, valor aprovado, saldo a captar, prazo de captação, contrapartidas principais, selo "dedução integral" quando art. 18 ou 1º-A; botão "Quero patrocinar este projeto" (abre o formulário de diagnóstico com `projeto_id`); ressalva ("Valores e prazos conforme portaria publicada; sujeitos a atualização"). Exemplo publicável: "A Tacada Perfeita" (seção 4.7). |
| `/projetos/[slug]` | [Nome do projeto] | Rótulo (mecanismo e artigo, número do processo), título, logline ou resumo, status (aprovado, autorizado a captar, em execução), valor aprovado e saldo, quem já apoia (só com autorização), por que patrocinar (quatro cartões), contrapartidas por cota (ouro, prata, bronze) [verificar por projeto], cronograma, proponente, documentos (portaria ou despacho, deck em PDF se autorizado), formulário "Quero patrocinar", projetos relacionados. Sem telefones nem e-mails de terceiros. |
| `/guia` | Contabilizando Cultura: transforme impostos em impacto cultural. | Capa do guia; para quem é (empresários, gestores financeiros, contadores); o que tem dentro (seis tópicos do sumário); formulário curto; nota "edição revisada em [data], com fontes"; depois do envio, página `/obrigado/guia` com link de download e sugestão do simulador. Até a edição revisada ser aprovada (seção 10.3), a página publica só o bloco "em breve" com captura de e-mail. |
| `/simulador` | Quanto do seu imposto pode virar cultura? | Ver `docs/site/simulador-spec.md`. |
| `/diagnostico` | Faça a conta com a Daniela e com o seu contador. | Rótulo DIAGNÓSTICO GRATUITO; o que é (PJ: 30 minutos com o contador presente, IRPJ projetado, dois ou três projetos da carteira, checklist para o contador; PF: ligação de 15 minutos); opção "Ainda não quero envolver o contador? Comece pela simulação de 20 minutos" (mesmo formulário, campo `formato`, seção 5.4); o que você sai sabendo (valor possível, projetos aderentes, prazo, próximos passos); formulário (seção 5.4); "Prefere falar agora?" com WhatsApp; ressalva. |
| `/mentoria` | Aprenda a escrever, inscrever e captar projetos culturais com quem faz isso todo dia. | Rótulo MENTORIA DA DANIELA · LISTA DE ESPERA; subtítulo (`docs/produto/mentoria-e-curso.md`, seção 1: coorte de 8 semanas, projeto real do aluno como entregável); para quem (três públicos da coorte); o que você sai com (projeto inscrito, orçamento, deck, plano de captação); formato e período previsto [verificar datas]; "sem preço ainda: a lista de espera define o formato"; formulário da lista de espera; FAQ (quando abre, preço, carga horária, certificado). |
| `/conteudo` | Guias e artigos sobre incentivo fiscal à cultura. | Lista de artigos com data e tempo de leitura; categorias (empresas, contadores, pessoa física, municípios, proponentes); bloco do guia; artigos iniciais sugeridos na seção 6.3. |
| `/contato` | Conte o que você quer realizar. | Três caminhos (WhatsApp, e-mail, formulário); formulário curto; endereço e horário [verificar]; nota de que respostas em até 1 dia útil [verificar com a Daniela]. |
| `/privacidade` | Política de privacidade | Estrutura na seção 5.7. |
| `/obrigado/[tipo]` | Recebemos. Próximo passo: | Mensagem por tipo (guia: link de download; simulador: resultado; diagnóstico: "a Daniela entra em contato em até 1 dia útil"; mentoria: "você está na lista; responda à pesquisa"); botão WhatsApp com mensagem pré-preenchida do contexto. |

### 4.7 Projeto exemplo na carteira: "A Tacada Perfeita"

Dados publicáveis, extraídos de `docs/fontes/materiais/exemplo-projeto-a-tacada-perfeita-deck.txt` e de `leis-de-incentivo.md`, seção 3.5. Sem telefones ou e-mails de terceiros; contato é sempre o da Prospekto.

| Campo | Valor |
|---|---|
| Nome | A Tacada Perfeita |
| Tipo | Longa-metragem, comédia, Brasil |
| Proponente | Ocotea Filmes Ltda (mais de 25 anos de mercado; "Uma Carta para Ferdinand", "Christabel: Sol e o Sonho") |
| Distribuição | Pandora Filmes |
| Mecanismo | Lei do Audiovisual, art. 1º-A (patrocínio; dedução de 100% do aporte dentro de 4% do IRPJ devido para PJ e 6% do imposto devido para PF; vigente até 2029) |
| Recurso já aprovado | R$ 2 milhões, Chamada Pública BRDE/FSA Produção Seletivo Cinema 2024 (ata de 23/12/2025) |
| Captação complementar | Autorizada pela Ancine [verificar valor e despacho no DOU: notícia de 02/09/2026 cita R$ 2,4 milhões, Despacho 127-E/2026] |
| Logline | Dois artistas esquecidos tentam enganar um ao outro por dinheiro e descobrem a única coisa que ainda não sabiam interpretar: a verdade. |
| Elenco confirmado (conforme o deck) | Werner Schünemann, Clarisse Abujamra, Clemente Vascaino, Evandro Mesquita, Eliane Jardim, Toni Ramos, Luciano Quirino, Irene Ravache [verificar autorização de uso dos nomes na página] |
| Locação | Balneário Camboriú (SC) |
| Por que patrocinar (quatro cartões) | Risco mitigado (FSA aprovado, elenco confirmado); Incentivo fiscal (art. 1º-A, dedução prevista em lei); Visibilidade (comédia popular, elenco de prestígio, quatro janelas: cinema, streaming, TV, internacional); Parceiros sólidos (Ocotea e Pandora) |
| O que não dizer | Participação em receita (isso é art. 1º, não 1º-A); "retorno financeiro"; garantia de estreia ou de prazo |
| Contrapartidas | [verificar com a Ocotea e a Prospekto: cotas, crédito em tela, ingressos, pré-estreia regional] |
| Aviso de publicação | Publicar só com autorização por escrito da Ocotea Filmes (`docs/playbooks/campanhas.md`, seção 1.1) |

## 5. Formulários

### 5.1 Regras comuns

- Implementação: Server Actions com validação Zod no servidor e `useActionState` no cliente (`docs/arquitetura/next16-convencoes.md`). Toda submissão cria ou atualiza um lead no CRM com `segmento`, `origem`, `source_detail` (utm_source, utm_medium, utm_campaign, referrer, página), `consent_lgpd`, `consent_at`, `consent_version`, `consent_channels` e `tenant_id` (`personas-e-funis.md`, seção 9.2).
- Deduplicação: `email` é único por lead e segmento. Reenvio atualiza o lead existente, acrescenta uma `activity` do tipo `formulario` e não rebaixa o estágio.
- Antispam: campo honeypot oculto; limite de 5 envios por IP por hora; verificação de e-mail descartável opcional [verificar ferramenta]. Sem CAPTCHA visual (acessibilidade); se o spam exigir, usar desafio invisível com alternativa acessível.
- Validações padrão: `nome` 2 a 120 caracteres; `email` válido (RFC 5322 simplificado) e normalizado em minúsculas; `telefone` opcional, aceito com máscara brasileira e armazenado em E.164 (`+55DDDNNNNNNNNN`), obrigatório quando a pessoa marca WhatsApp como canal; `cidade` 2 a 80 caracteres; `uf` enum das 27 UFs; `cnpj` opcional com dígitos verificadores; `mensagem` até 2.000 caracteres; enums exatamente como em `personas-e-funis.md`, seção 9.3.
- Erros: inline sob o campo, com `aria-describedby`, e um resumo no topo do formulário com foco após a submissão falhar. Mensagens em português, concretas ("Informe um e-mail válido, por exemplo nome@empresa.com.br").
- Campos marcados como obrigatórios com texto "(obrigatório)", não só com asterisco.
- CPF nunca é coletado no site. CNPJ só opcional.
- Consentimento: duas caixas separadas, nenhuma pré-marcada (LGPD, Lei 13.709/2018, art. 5º, XII, art. 7º, I, art. 8º, §§ 1º e 4º, e art. 9º; `docs/playbooks/campanhas.md`, seção 1.2):

Caixa 1 (obrigatória), `consent_lgpd`: "Li a Política de Privacidade e autorizo a Prospekto Consultoria & Projetos a usar meus dados para responder a esta solicitação e entrar em contato por e-mail ou telefone sobre ela."

Caixa 2 (opcional), `consent_marketing`: "Quero receber materiais da Prospekto sobre incentivo fiscal à cultura por e-mail e WhatsApp. Posso cancelar quando quiser."

Texto fixo abaixo das caixas: "Seus dados ficam no CRM da Prospekto e não são vendidos nem compartilhados com terceiros, exceto os provedores necessários ao serviço (hospedagem, e-mail, WhatsApp e inteligência artificial para apoio ao atendimento). Você pode pedir acesso, correção ou exclusão pelo e-mail projetos@prospekto.com.br."

- Registro: `consent_version` recebe a versão da política (por exemplo `2026-10-09`); `consent_channels` recebe `["email"]` ou `["email","whatsapp"]` conforme a caixa 2 e o telefone informado; IP é registrado só se o advogado confirmar a necessidade [verificar].
- Depois do envio: redirecionar para `/obrigado/[tipo]`, disparar e-mail transacional (seção 5.6) e registrar o evento de analytics (seção 9).

### 5.2 Guia gratuito (`/guia`, bloco da Home e fim dos artigos)

| Campo | Tipo | Obrigatório | Validação | Destino no CRM |
|---|---|---|---|---|
| `nome` | texto | sim | padrão | `nome` |
| `email` | e-mail | sim | padrão | `email` |
| `perfil` | enum: empresa, contador, pessoa_fisica, outro | sim | enum | define `segmento` (PJ, CONT, PF; outro vai para PJ com tag `perfil_outro`) e o pipeline (`patrocinadores` ou `contadores`) |
| `empresa_ou_escritorio` | texto | não | 2 a 120 | `empresa` ou `escritorio` |
| `cidade`, `uf` | texto, enum | sim | padrão | `cidade`, `uf` |
| `consent_lgpd`, `consent_marketing` | booleano | caixa 1 sim | não pré-marcadas | consentimentos |

Estágio inicial: `novo`. `origem = guia`. `interesse = rouanet`. Score calculado na criação (origem `guia` vale 4 pontos na tabela de PJ).

Entrega: link assinado para o PDF, válido por 72 horas, na página de obrigado e no e-mail. O PDF é o de `docs/fontes/materiais/contabilizando-cultura-guia-gratuito.pdf` só depois da edição revisada (seção 10.3).

### 5.3 Simulador (`/simulador`)

Campos, validações e formulário de captura em `docs/site/simulador-spec.md`, seção 6. Resumo: PJ coleta `nome`, `email`, `empresa`, `cargo`, `regime_tributario`, `irpj_faixa` (derivada do valor informado), `apuracao`, `cidade`, `uf`, `telefone` (opcional), consentimentos; PF coleta `nome`, `email`, `modelo_declaracao`, `ir_devido_faixa` (derivada), `cidade`, `uf`, `telefone` (opcional), consentimentos. `origem = simulador`; pipeline `patrocinadores`; estágio `novo`; `interesse` conforme os mecanismos marcados (rouanet, audiovisual, lic_rs). Regime presumido ou Simples: lead criado com tag `desqualificado_rouanet` e `interesse = lic_rs` quando contribuinte de ICMS no RS.

### 5.4 Diagnóstico gratuito (`/diagnostico`, "Quero patrocinar este projeto" e CTA de `/empresas`)

| Campo | Tipo | Obrigatório | Validação | Destino |
|---|---|---|---|---|
| `tipo_pessoa` | enum: PJ, PF | sim | | `tipo_pessoa`; define os campos abaixo |
| `nome` | texto | sim | padrão | `nome` |
| `email` | e-mail | sim | padrão | `email` |
| `telefone` | telefone | sim (a reunião é marcada por WhatsApp ou ligação) | E.164 | `telefone` |
| `empresa` (PJ) | texto | sim | 2 a 120 | `empresa` |
| `cnpj` (PJ) | texto | não | dígitos verificadores | `cnpj` |
| `cargo` (PJ) | enum: dono_ou_socio, financeiro, contabilidade, marketing_esg, outro | sim | enum | `cargo` |
| `regime_tributario` (PJ) | enum: lucro_real, lucro_presumido, simples, nao_sei | sim | enum | `regime_tributario`, `regime_confirmado_por = declarado` |
| `irpj_faixa` (PJ) | enum: ate_100k, 100k_500k, 500k_2500k, acima_2500k, nao_sei | sim | enum | `irpj_faixa` |
| `apuracao` (PJ) | enum: trimestral, anual, nao_sei | não | enum | `apuracao` |
| `contador_escritorio` (PJ) | texto | não | 2 a 120 | `contador_escritorio` |
| `formato` (PJ) | enum: diagnostico, simulacao | sim (padrão `diagnostico`) | enum | `activity` de agendamento; `simulacao` cria a tag `simulacao_primeiro` e a Daniela oferece o diagnóstico com o contador na própria reunião |
| `contador_participa` (PJ) | booleano | não (obrigatório `true` quando `formato = diagnostico`; o formulário explica que o diagnóstico é com o contador) | | tag `contador_na_reuniao` |
| `modelo_declaracao` (PF) | enum: completa, simplificada, nao_sei | sim | enum | `modelo_declaracao` |
| `ir_devido_faixa` (PF) | enum: ate_20k, 20k_80k, acima_80k, nao_sei | sim | enum | `ir_devido_faixa` |
| `projeto_id` | oculto | não | existe e está em `captando` | `projeto_interesse_id`, tag `projeto:[slug]` |
| `cidade`, `uf` | texto, enum | sim | padrão | |
| `disponibilidade` | enum: manha, tarde, qualquer | não | enum | `activity` de agendamento |
| `mensagem` | texto longo | não | até 2.000 | `mensagem` |
| consentimentos | | caixa 1 sim | | |

Estágio inicial: `novo`; a Daniela move para `qualificado` ao marcar a reunião (SLA de 1 dia útil, `personas-e-funis.md`, seção 8.1). `origem = diagnostico`. Regime presumido ou Simples: mensagem na página de obrigado explica a LIC-RS e o lead recebe `interesse = lic_rs`.

### 5.5 Demais formulários

| Formulário | Campos obrigatórios | Campos opcionais | Pipeline, estágio, `origem` |
|---|---|---|---|
| Contadores: diagnóstico de carteira (`/contadores`) | `escritorio`, `nome`, `cargo` (socio, gerente_fiscal, analista, outro), `email`, `telefone`, `clientes_lucro_real_faixa` (nenhum, 1_4, 5_19, 20_mais), `cidade`, `uf`, consentimento | `cnpj`, `ja_lancou_incentivo` (sim, nao), `registro_crc`, `mensagem` | `contadores`, `novo`, `site`; `clientes_lucro_real_faixa = nenhum` cria o lead com tag `fora_do_icp` e resposta automática sugerindo a LIC-RS |
| Contadores: inscrição no webinar | `nome`, `email`, `escritorio`, consentimento | `clientes_lucro_real_faixa` | `contadores`, `novo`, `site` com `source_detail = webinar:[data]` |
| Municípios (`/municipios`) | `municipio`, `orgao` (secretaria, diretoria, fundacao, outro), `cargo` (secretario, diretor, tecnico, prefeito_gabinete, conselho, outro), `nome`, `email`, `telefone`, `necessidade` (editais, prestacao_contas, projetos_proprios, lei_incentivo, capacitacao, outro), consentimento | `pnab_status` (ciclo_ativo, saldo_a_executar, nao_aderiu, nao_sei), `lei_incentivo_municipal` (sim, nao, em_tramitacao, nao_sei), `mensagem` | `municipios`, `novo`, `site` |
| Proponentes (`/proponentes`) | `proponente`, `tipo_proponente` (pf, mei, pj, instituicao, municipio), `nome`, `email`, `telefone`, `projeto_nome`, `mecanismo` (rouanet, audiovisual, lic_rs, lic_municipal, pnab, nao_sei), `status_projeto` (ideia, em_elaboracao, inscrito, aprovado_captando, em_execucao), `segmento_cultural`, `cidade`, `uf`, consentimento | `numero_processo`, `valor_aprovado`, `saldo_a_captar`, `prazo_captacao`, `link_material` (URL), `prestacao_contas_anterior` (nunca_teve, aprovada, pendente, reprovada), `mensagem` | `projetos`, `prospeccao`, `site`; sem upload de arquivo na Fase 1 (link externo) |
| Mentoria: lista de espera (`/mentoria`) | `nome`, `email`, `objetivo` (primeiro_projeto, captar, profissao, atualizar), `experiencia` (nenhuma, ja_escrevi, ja_captei, atuo_em_secretaria), consentimento | `telefone`, `cidade`, `uf`, `faixa_investimento` (ate_500, 500_1500, acima_1500, prefiro_nao_dizer), `instagram_ou_linkedin` | `alunos`, `lista_espera`, `site` |
| Contato (`/contato`) | `nome`, `email`, `assunto` (patrocinar, contador, pessoa_fisica, municipio, proponente, mentoria, imprensa, outro), `mensagem`, consentimento | `telefone`, `empresa` | pipeline conforme `assunto` (patrocinar e pessoa_fisica: `patrocinadores`; contador: `contadores`; municipio: `municipios`; proponente: `projetos`; mentoria: `alunos`; imprensa e outro: `patrocinadores` com tag `triagem`), estágio inicial do pipeline, `site` |
| Aviso de novos projetos (Home, quando a carteira está vazia) | `email`, consentimento | `cidade` | `patrocinadores`, `novo`, `site`, tag `avisar_projetos` |

### 5.6 Respostas automáticas

E-mail transacional (remetente "Daniela Sandrin Copat · Prospekto <projetos@prospekto.com.br>" [verificar se o envio sairá desse endereço ou de um subdomínio como `envio.prospekto.com.br`]), enviado em até 1 minuto. Todo e-mail tem: motivo do envio ("você recebe este e-mail porque [ação] em [data]"), cidade no rodapé, link de descadastro quando houver `consent_marketing`, ressalva legal.

| Formulário | Assunto | Corpo (resumo) |
|---|---|---|
| Guia | "Seu guia Contabilizando Cultura" | Link de download (72 h); três coisas para olhar primeiro (mitos, passo a passo, tabela de limites); convite ao simulador; "responda a este e-mail se quiser que eu faça a conta com você". |
| Simulador | "Sua simulação: até R$ [valor] para cultura" | Resumo do resultado (limite por mecanismo, cenário com e sem LC 224 para PJ); link para o resultado detalhado (token); próximo passo: diagnóstico; ressalva. |
| Diagnóstico | "Recebi seu pedido de diagnóstico" | "Entro em contato em até 1 dia útil pelo WhatsApp ou telefone informado para marcar o diagnóstico: 30 minutos com o seu contador (PJ) ou uma ligação de 15 minutos (PF). Se quiser adiantar, responda com dois horários." Quando `formato = simulacao`: "... para marcar a simulação de 20 minutos. O contador não precisa participar desta primeira conversa." |
| Contadores | "Diagnóstico da carteira: próximos passos" | O que a Prospekto devolve (potencial em reais) e em quanto tempo; link do guia; convite ao webinar quando houver. |
| Municípios | "Recebemos o pedido de diagnóstico do fomento municipal" | Prazo de retorno; o que será pedido na conversa (plano de ação PNAB, editais vigentes, lei municipal). |
| Proponentes | "Seu projeto foi recebido para avaliação" | Prazo do parecer de captabilidade (10 dias úteis, `personas-e-funis.md`, seção 8.4); o que ajuda a avaliação (portaria, orçamento, deck); lembrete de que a captação é remunerada dentro do limite legal, só sobre o captado. |
| Mentoria | "Você está na lista de espera da mentoria" | Agradecimento; link da pesquisa (3 minutos); o que vem a seguir (aula aberta, abertura de turma). |
| Contato | "Recebemos sua mensagem" | Prazo de resposta; WhatsApp para urgência. |

WhatsApp: na Fase 1 não há envio automático por API (custo e aprovação de templates; `docs/visao.md`, princípio de custo próximo de zero). O fluxo é: o CRM gera, para cada lead novo, um botão "Abrir WhatsApp" com a mensagem pré-preenchida abaixo; a Daniela envia manualmente dentro do SLA. Só para leads com telefone informado e, para conteúdo promocional, com `consent_marketing`. Primeira mensagem sempre identifica a Prospekto e oferece saída ("responda SAIR"). Quando houver volume, migrar para a API do WhatsApp Business com templates aprovados [verificar custo por conversa].

| Contexto | Mensagem que a Daniela envia (modelo) |
|---|---|
| Diagnóstico PJ | "Olá, [Nome]. Aqui é a Daniela, da Prospekto. Recebi seu pedido de diagnóstico para a [Empresa]. São 30 minutos com o seu contador na conversa. Tenho horários [dia] às [hora] e [dia] às [hora]. Qual prefere? Se não quiser receber mensagens por aqui, responda SAIR." |
| Simulação PJ | "Olá, [Nome]. Aqui é a Daniela, da Prospekto. Recebi seu pedido de simulação para a [Empresa]: 20 minutos, eu levo a conta e dois ou três projetos. Tenho horários [dia] às [hora] e [dia] às [hora]. Qual prefere? Responda SAIR se não quiser mensagens por aqui." |
| Simulador PJ | "Olá, [Nome]. Daniela, da Prospekto. Vi que você simulou: até R$ [valor] do IRPJ da [Empresa] pode ir para um projeto cultural da região. Quer uma simulação de 20 minutos, em que eu mostro dois ou três projetos e deixo a conta pronta para o seu contador? Responda SAIR se não quiser mensagens por aqui." |
| Guia | "Olá, [Nome]. Daniela, da Prospekto. O guia já está no seu e-mail. Se quiser, marcamos uma simulação de 20 minutos e eu faço a conta de quanto cabe na sua empresa. Responda SAIR se não quiser mensagens por aqui." |
| PF | "Olá, [Nome]. Daniela, da Prospekto. Você simulou até R$ [valor] para cultura. O depósito precisa ser feito até o último dia útil bancário de dezembro. Quer a lista de projetos da sua cidade que aceitam pessoa física? Responda SAIR se não quiser mensagens por aqui." |

### 5.7 Política de privacidade (`/privacidade`): estrutura

Base: Lei 13.709/2018 (LGPD). Seções: 1. Quem somos (controladora: Prospekto Consultoria & Projetos, CNPJ [verificar], endereço [verificar]); 2. Encarregada ou encarregado de dados (nome e e-mail: Daniela ou o sócio [verificar]); 3. Dados que coletamos (formulários: nome, e-mail, telefone, empresa ou escritório, cargo, cidade, UF, regime tributário e faixa de imposto declarados, mensagem; navegação: páginas visitadas, origem, dispositivo, de forma agregada); 4. Para que usamos (responder solicitações; marcar reuniões; enviar materiais quando autorizado; calcular estimativas no simulador; operar patrocínios contratados); 5. Bases legais (consentimento, art. 7º, I; execução de contrato, art. 7º, V; legítimo interesse para contato profissional B2B, art. 7º, IX, com opção de saída); 6. Com quem compartilhamos (provedores de hospedagem, e-mail transacional, WhatsApp/Meta, analytics e inteligência artificial para apoio ao atendimento, com revisão humana, sem uso em treinamento, retenção de até 30 dias, reconhecimento de voz do navegador e transferência internacional, conforme `docs/arquitetura/ADR-003-ia-no-crm.md`, seção 6.4; nunca venda de dados; patrocinador e proponente só na etapa de termo); 7. Por quanto tempo (leads sem contrato: 24 meses após o último contato [verificar com advogado]; documentos de patrocínio: 5 anos após a prestação de contas, pela guarda exigida ao projeto); 8. Seus direitos (art. 18: confirmação, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento, revogação do consentimento) e como exercê-los (projetos@prospekto.com.br, resposta em até 15 dias [verificar prazo adotado]); 9. Cookies e analytics (seção 9.1: ferramenta sem cookies ou com consentimento prévio); 10. Segurança (acesso restrito ao CRM, criptografia em trânsito e em repouso); 11. Alterações (versão e data; versões anteriores arquivadas); 12. Versão: `2026-10-09` (texto da IA incluído; antes `2026-10-03`) [verificar revisão por advogado antes de publicar].

## 6. SEO

### 6.1 Palavras-chave por página

Volumes não verificados (sem acesso a ferramenta de busca nesta tarefa) [verificar volumes antes de priorizar conteúdo]. Prioridade pela intenção e pela aderência ao ICP.

| Página | Palavra-chave principal | Secundárias |
|---|---|---|
| Home | consultoria projetos culturais caxias do sul | lei de incentivo à cultura rs; patrocínio cultural serra gaúcha; prospekto consultoria |
| `/empresas` | lei rouanet empresas lucro real | patrocinar projeto cultural dedução ir; incentivo fiscal cultura empresa; dedução irpj lei rouanet 4%; marketing cultural lei rouanet |
| `/contadores` | lei rouanet contador | incentivo fiscal cultura planejamento tributário; dedução lei rouanet ecf; limite dedução incentivos irpj; lei rouanet lucro real contabilidade |
| `/pessoa-fisica` | doação lei rouanet pessoa física imposto de renda | destinar 6% imposto de renda cultura; recibo de mecenato declaração; doações efetuadas cultura |
| `/municipios` | consultoria pnab municípios | lei de incentivo à cultura municipal; editais cultura prefeitura; consultoria cultura rs |
| `/proponentes` | captação de recursos lei rouanet | captador lei rouanet; captação patrocínio projeto cultural; lei de incentivo à cultura rs proponente |
| `/projetos` | projetos lei rouanet para patrocinar | projetos aprovados lei rouanet rs; patrocinar filme lei do audiovisual |
| `/simulador` | simulador lei rouanet | calcular dedução lei rouanet; quanto posso destinar imposto de renda cultura |
| `/guia` | guia lei rouanet para empresas | lei rouanet passo a passo empresas; contabilizando cultura |
| `/mentoria` | curso elaboração de projetos culturais | mentoria lei rouanet; como escrever projeto lei rouanet; curso captação de recursos cultura |
| `/sobre` | daniela sandrin copat | prospekto consultoria e projetos |

### 6.2 Títulos e descrições

Títulos até 60 caracteres; descrições até 155. Sufixo " · Prospekto" nos títulos internos.

| Página | `<title>` | `meta description` |
|---|---|---|
| Home | Incentivo fiscal à cultura na Serra Gaúcha · Prospekto | Transforme o imposto da sua empresa em cultura na Serra Gaúcha. Até 4% do IRPJ devido para projetos aprovados, com recibo oficial e sem burocracia. |
| `/empresas` | Lei Rouanet para empresas no lucro real · Prospekto | Até 4% do IRPJ devido pode virar um projeto cultural na sua região. Veja como funciona, o que a empresa ganha e simule com os números da sua empresa. |
| `/contadores` | Lei Rouanet para contadores: base legal e parceria · Prospekto | Ofereça incentivo cultural aos seus clientes no lucro real sem operar nada. Limites, base legal, divisão de competências e diagnóstico de carteira. |
| `/pessoa-fisica` | Destine até 6% do seu IR para cultura · Prospekto | Quem declara pelo modelo completo pode destinar até 6% do imposto devido a projetos culturais. Simule, deposite até dezembro e declare com o recibo. |
| `/municipios` | Consultoria em fomento cultural para municípios · Prospekto | PNAB, editais, prestação de contas e leis municipais de incentivo. Consultoria para secretarias de cultura da Serra Gaúcha e do RS. |
| `/proponentes` | Captação para projetos culturais aprovados · Prospekto | Projeto com portaria vigente e saldo a captar? A Prospekto capta junto a empresas e contadores da região, dentro do limite legal. Envie para avaliação. |
| `/projetos` | Projetos culturais em captação · Prospekto | Carteira de projetos aprovados pelo Ministério da Cultura e pela Ancine, com saldo a captar, abertos a empresas e pessoas físicas. |
| `/simulador` | Simulador de incentivo fiscal à cultura · Prospekto | Calcule quanto do IRPJ da sua empresa ou do seu imposto de renda pode ser destinado a projetos culturais, por mecanismo, com a base legal. |
| `/guia` | Guia gratuito Contabilizando Cultura · Prospekto | Guia prático para empresas e contadores: como funciona a Lei Rouanet, mitos, passo a passo e limites de dedução. Baixe grátis. |
| `/diagnostico` | Diagnóstico gratuito de incentivo fiscal · Prospekto | Em 30 minutos, com o seu contador, veja quanto do IRPJ pode ir para cultura e quais projetos da região cabem. Ou comece pela simulação de 20 minutos. |
| `/mentoria` | Mentoria em projetos culturais com Daniela Sandrin Copat | Aprenda a escrever, inscrever e captar projetos culturais com quem faz isso todo dia. Entre na lista de espera. |
| `/sobre` | Sobre a Prospekto e Daniela Sandrin Copat | Consultoria da Serra Gaúcha em projetos culturais, leis de incentivo e economia criativa. Elaboração, captação, gestão e prestação de contas. |
| `/conteudo` | Conteúdo sobre incentivo fiscal à cultura · Prospekto | Artigos e guias sobre Lei Rouanet, Lei do Audiovisual, LIC-RS e editais, para empresas, contadores, pessoas físicas e municípios. |
| `/contato` | Contato · Prospekto Consultoria & Projetos | Fale com a Prospekto por WhatsApp, e-mail ou formulário. Serra Gaúcha, RS. |

### 6.3 Técnico e conteúdo

- Uma H1 por página, igual ou próximo do título da página; hierarquia H2 e H3 sem pulos.
- URLs estáveis e curtas; `canonical` em todas; `sitemap.xml` e `robots.txt` gerados pelo Next; `lang="pt-BR"`.
- Dados estruturados (JSON-LD): `Organization` e `LocalBusiness` na Home (nome, e-mail, telefone, área atendida; endereço só quando confirmado [verificar]); `Person` em `/sobre`; `FAQPage` nos blocos de objeções; `Article` nos artigos; `BreadcrumbList` nas páginas internas.
- Open Graph e Twitter Card com imagem padrão sóbria (marca e frase) e imagem própria por projeto.
- Desempenho: Core Web Vitals verdes no celular; imagens em `next/image` com tamanhos definidos; fontes com `next/font`; sem scripts de terceiros além de analytics.
- Artigos iniciais (um por mês, a partir do lançamento): "Lei Rouanet para empresas no lucro real: a conta em 5 minutos"; "O que muda com a IN MinC 29/2026 para quem patrocina"; "LC 224/2025: o limite de cultura ficou em 3,6%?"; "Como destinar parte do seu IR para cultura sem cair na malha"; "LIC-RS: como empresas no lucro presumido patrocinam cultura via ICMS"; "Cultura e esporte no mesmo IRPJ: o que diz a SC Cosit 4/2026"; "Como um contador apresenta a Lei Rouanet ao cliente"; "Lei do Audiovisual art. 1º-A: patrocinar um filme com dedução integral"; "PNAB no município: checklist para não devolver recurso". Cada artigo cita lei e artigo, traz a data de verificação e termina com o bloco do guia.

## 7. Direção de design

### 7.1 Princípio

Sóbrio, institucional, confiável: o site precisa passar pelo crivo de um controller e de um contador. Referências: a apresentação da fomento.ai (`docs/fontes/materiais/referencia-fomento-ai-apresentacao.txt`) pela estrutura editorial (rótulo em caixa alta acima do título, títulos curtos em duas linhas, listas numeradas 01 a 05, três perguntas como blocos, paginação discreta, muito espaço em branco, uma só cor de destaque) e o guia e a apresentação "Contabilizando Cultura" pelos blocos de número grande (3,11%, 7,4M), pelos cartões "mito e fato" e pelo passo a passo numerado. O que não copiar: emojis e ícones genéricos dos slides.

### 7.2 Paleta (sugestão; validar com a identidade existente da Prospekto [verificar logotipo e cores atuais])

| Uso | Nome | Hex | Observação |
|---|---|---|---|
| Texto e títulos | Grafite | `#1E2A32` | Contraste 15:1 sobre branco |
| Primária (botões, links, destaques) | Azul-profundo | `#163B5C` | Contraste 10:1 sobre branco; remete a instituição e a confiança |
| Acento (números grandes, rótulos de seção, um detalhe por tela) | Vinho da Serra | `#7A2230` | Contraste 9:1 sobre branco; uso parcimonioso |
| Fundo | Branco | `#FFFFFF` | |
| Fundo alternado de seções | Areia | `#F4F1EB` | Separação de blocos sem linhas |
| Bordas e divisores | Cinza-claro | `#D9D6CF` | |
| Texto secundário | Cinza-médio | `#5B6670` | Contraste 5,6:1 sobre branco |
| Sucesso | Verde-escuro | `#2F6B3A` | Mensagens de confirmação |
| Erro | Vermelho-escuro | `#A32D2D` | Mensagens de erro; sempre com texto, nunca só cor |

Modo escuro: não é prioridade na Fase 1; se implementado, inverter fundo para `#121A20` e texto para `#ECE9E2`, mantendo os mesmos acentos clareados e contraste mínimo de 4,5:1.

### 7.3 Tipografia

| Uso | Fonte (Google Fonts, via `next/font`) | Alternativa |
|---|---|---|
| Títulos | Source Serif 4 (600) | Fraunces |
| Texto e interface | Inter (400, 500, 600) | IBM Plex Sans |
| Números grandes e tabelas | Inter com `font-variant-numeric: tabular-nums` | |

Escala: corpo 18px no desktop e 17px no celular, entrelinha 1,6; H1 44/36px; H2 32/28px; H3 22/20px; rótulo 13px, caixa alta, espaçamento de 0,08em, cor de acento. Largura máxima de texto 68 caracteres.

### 7.4 Componentes recorrentes

| Componente | Descrição |
|---|---|
| Rótulo + título + subtítulo | Abre toda seção; rótulo em caixa alta na cor de acento |
| Bloco de número | Número em serifa grande (56px), legenda curta, nota de fonte em 13px com link |
| Cartão mito e fato | Duas colunas: "Mito" em cinza riscado leve, "Fato" em grafite; sem ícones |
| Lista numerada 01 a 07 | Número em acento, título em negrito, texto curto; vertical no celular |
| Tabela de competências | Duas colunas, cabeçalho em areia; vira lista empilhada no celular |
| Cartão de projeto | Imagem 16:9 opcional, rótulo com mecanismo, título, cidade, saldo a captar em número tabular, selo "dedução integral", botão |
| Acordeão de objeções | Pergunta como botão com `aria-expanded`; resposta com fonte quando houver número |
| Formulário | Campos empilhados, rótulos acima, erros abaixo, caixa de consentimento com texto completo visível (sem "li e aceito" genérico) |
| Faixa de prazo | Fundo areia, número de dias úteis restantes em acento, texto do prazo e fonte |
| Rodapé | Quatro colunas: contato, páginas, legal, fontes; ressalva legal em texto corrido |

### 7.5 Imagens

Fotos reais da Daniela, de projetos da carteira (com autorização) e da Serra Gaúcha; nada de banco de imagens com "pessoas de negócios apertando mãos". Enquanto não houver fotos aprovadas, usar composições tipográficas e a paleta. Logotipos de patrocinadores só com autorização escrita.

### 7.6 Acessibilidade (WCAG 2.1 nível AA)

- Contraste mínimo 4,5:1 em texto e 3:1 em componentes; nenhuma informação transmitida só por cor.
- Navegação completa por teclado, foco visível (contorno de 2px em acento), link "pular para o conteúdo".
- Formulários com `label` associado, `aria-describedby` para ajuda e erro, resumo de erros com foco, campos obrigatórios anunciados.
- Acordeões e menus com `aria-expanded` e `aria-controls`.
- `alt` descritivo em imagens informativas; vazio em decorativas.
- Texto redimensionável até 200% sem perda; alvos de toque de 44px.
- `prefers-reduced-motion` respeitado (contador de prazo sem animação).
- Ordem de títulos lógica; linguagem simples; siglas explicadas na primeira ocorrência (SALIC, ECF, DARF).
- PDFs (guia, checklists) com texto selecionável e marcação de títulos.
- Meta: Lighthouse acessibilidade 95 ou mais em todas as páginas antes do lançamento; teste manual com leitor de tela (NVDA ou VoiceOver) nos formulários e no simulador.

## 8. Responsividade e desempenho

- Mobile first; breakpoints em 640, 960 e 1200px. Menu vira lista em tela cheia abaixo de 960px; o botão "Simular" e o atalho de WhatsApp ficam visíveis em qualquer largura.
- Botão flutuante de WhatsApp só no celular, discreto, com rótulo acessível "Falar no WhatsApp".
- Páginas estáticas por padrão; `/projetos` revalida por tag quando o CRM muda um projeto (`updateTag`, `docs/arquitetura/next16-convencoes.md`).
- Orçamento de peso: até 250 KB de JavaScript na Home; o simulador carrega seu código só em `/simulador`.

## 9. Analytics

### 9.1 Ferramenta

Decidido em `docs/arquitetura/ADR-001-stack.md`: Vercel Web Analytics (`@vercel/analytics` 2.0.1), sem cookies, com o componente `<Analytics />` no `layout.tsx` raiz (`docs/arquitetura/scaffold.md`). Umami e Plausible foram avaliados e rejeitados no ADR (um login a mais; o UTM já fica gravado no lead). Ferramenta sem cookies e com dados agregados dispensa banner de consentimento para analytics [verificar com o advogado à luz da LGPD e do guia de cookies da ANPD]. GA4 só se houver necessidade de integração com anúncios, e então com consentimento prévio. Os eventos de produto (`lead_created`, `simulator_*`, funil por origem) são gravados pelo servidor na tabela `events` do CRM, por tenant, e os relatórios de origem saem do CRM, não do painel da Vercel (ADR-001, seção de analytics de produto). Eventos abaixo são nomes de código (inglês), com propriedades em snake_case. Nunca enviar nome, e-mail, telefone ou valores exatos informados no simulador; faixas são aceitáveis.

### 9.2 Eventos

| Evento | Quando | Propriedades |
|---|---|---|
| `page_view` | toda página | `path`, `referrer`, `utm_source`, `utm_medium`, `utm_campaign` |
| `cta_click` | clique em qualquer botão de CTA | `cta_id` (por exemplo `home_hero_simulate`), `path` |
| `whatsapp_click` | clique em link `wa.me` | `context` (hero, footer, floating, thanks_page, project), `path` |
| `email_click`, `phone_click` | clique em `mailto:` ou `tel:` | `path` |
| `form_start` | primeiro foco em um campo | `form_id` (guide, simulator_pj, simulator_pf, diagnostic, accountant, municipality, proponent, waitlist, contact) |
| `form_submit` | envio aceito | `form_id`, `segment`, `origin` |
| `form_error` | envio recusado | `form_id`, `field`, `error_code` |
| `lead_created` | lead novo no CRM (servidor) | `segment`, `origin`, `pipeline`, `score_band` (frio, morno, quente) |
| `lead_updated` | lead existente atualizado | `segment`, `origin` |
| `consent_marketing` | caixa 2 marcada ou não no envio | `form_id`, `value` |
| `guide_download` | link do PDF acessado (servidor) | `lead_segment`, `source` (thanks_page, email) |
| `simulator_start` | escolha PJ ou PF | `taxpayer_type` |
| `simulator_step` | avanço de etapa | `taxpayer_type`, `step` |
| `simulator_summary_view` | resultado resumido exibido | `taxpayer_type`, `regime`, `tax_band`, `mechanisms` |
| `simulator_disqualified` | regime ou modelo inelegível | `taxpayer_type`, `reason` (presumido, simples, simplificada, no_tax) |
| `simulator_gate_submit` | formulário de captura do simulador enviado | `taxpayer_type`, `tax_band` |
| `simulator_detail_view` | resultado detalhado exibido | `taxpayer_type`, `lc224_applied` |
| `simulator_pdf_download` | PDF da simulação baixado | `taxpayer_type` |
| `diagnostic_requested` | formulário de diagnóstico aceito | `taxpayer_type`, `regime`, `tax_band`, `has_project` |
| `project_view` | página de projeto aberta | `project_slug`, `mechanism` |
| `project_sponsor_click` | "Quero patrocinar este projeto" | `project_slug` |
| `project_deck_download` | deck do projeto baixado | `project_slug` |
| `waitlist_join` | lista de espera aceita | `goal`, `experience` |
| `article_read` | 60% de rolagem em artigo | `slug` |
| `scroll_depth` | 25, 50, 75, 100% | `path`, `depth` |
| `outbound_click` | link externo | `host` |
| `deadline_banner_view` | faixa de prazo visível (nov e dez) | `days_left_band` |

### 9.3 Painéis mínimos

Leads por `origin` e `segment` por semana; conversão `page_view` para `form_submit` por página; funil do simulador (`simulator_start` até `simulator_detail_view`); cliques de WhatsApp por contexto; projetos mais vistos. Os mesmos números alimentam os KPIs de `personas-e-funis.md`, seção 10.

## 10. Integrações

### 10.1 WhatsApp

- Número público: (54) 98403-2180, o mesmo do guia. Formato do link: `https://wa.me/5554984032180?text=` seguido da mensagem codificada em URL. Abre o aplicativo no celular e o WhatsApp Web no desktop.
- Mensagens pré-preenchidas por contexto (o visitante pode editar antes de enviar):

| Contexto | Mensagem |
|---|---|
| Home e rodapé | "Olá, Daniela. Vi o site da Prospekto e quero entender como minha empresa pode destinar parte do imposto para cultura." |
| `/empresas` | "Olá, Daniela. Minha empresa é [nome], tributada pelo lucro real, de [cidade]. Quero saber quanto do IRPJ pode ir para um projeto cultural." |
| `/contadores` | "Olá, Daniela. Sou do escritório [nome], em [cidade]. Quero entender a parceria para clientes no lucro real." |
| `/pessoa-fisica` | "Olá, Daniela. Declaro pelo modelo completo e quero destinar parte do meu IR para um projeto cultural. Como faço?" |
| `/municipios` | "Olá, Daniela. Sou da [secretaria] de [município]. Quero conversar sobre fomento cultural e editais." |
| `/proponentes` | "Olá, Daniela. Tenho um projeto cultural [aprovado ou em elaboração] e quero conversar sobre captação." |
| Página de projeto | "Olá, Daniela. Tenho interesse em patrocinar o projeto [nome]. Pode me explicar as cotas e o processo?" |
| Página de obrigado | "Olá, Daniela. Acabei de [baixar o guia / simular / pedir o diagnóstico] no site e quero adiantar a conversa." |

- A conta deve ser WhatsApp Business com nome "Prospekto Consultoria & Projetos", horário de atendimento e mensagem de ausência configurados (`docs/playbooks/campanhas.md`, seção 1.2).
- O CRM registra o clique (`whatsapp_click`) mas não a conversa; a Daniela registra o resultado como `activity` do tipo `whatsapp`.

### 10.2 E-mail transacional

- Provedor decidido em `docs/arquitetura/ADR-001-stack.md`: Resend 6.32.0, atrás de uma função `sendEmail()` própria (trocar de provedor é reescrever dez linhas); webhooks de bounce e descadastro em `src/app/api/webhooks/resend/route.ts` (`docs/arquitetura/scaffold.md`). Envio a partir do domínio `prospekto.com.br` com SPF, DKIM e DMARC configurados antes do lançamento; até a verificação do domínio, `onboarding@resend.dev` só para testes [verificar onde o DNS e o e-mail estão hospedados; pergunta 4 de `docs/visao.md`].
- Templates em português, texto simples com uma versão HTML leve, mesmo remetente em tudo, link de descadastro de um clique nos e-mails promocionais, nenhum rastreio de abertura por pixel sem consentimento [verificar].
- Webhooks de bounce e de descadastro atualizam o lead (`email_invalido`, `consent_marketing = false`).
- Cópia interna: toda submissão gera notificação para projetos@prospekto.com.br com link para o lead no CRM.

### 10.3 Guia em PDF

- Origem: `docs/fontes/materiais/contabilizando-cultura-guia-gratuito.pdf`. Antes de publicar, produzir a edição revisada. Tarefa registrada (a mesma de `docs/playbooks/networking.md`, seção 5, e `docs/playbooks/parceiros-contadores.md`, seção 5):

| Item | Definição |
|---|---|
| Responsável pelo texto | Daniela revisa, item a item, com `docs/estrategia/mercado-e-posicionamento.md`, seção 4 |
| Responsável pela diagramação e pelo PDF | Sócio (diagramação, rodapé com fontes, exportação do PDF com texto selecionável) |
| Prazo | Antes da Mercopar: PDF aprovado até 16/10/2026 (sexta), para impressão de 20 cópias e publicação em `/guia` até 19/10/2026; a feira é de 20 a 23/10/2026 (`networking.md`, seção 4) |
| Lista de alterações (consolidada em `mercado-e-posicionamento.md`, seção 4) | 1. Trocar "mais de 545 mil empresas no lucro real" por "entre cerca de 220 mil e 230 mil empresas no lucro real, segundo fontes que citam a Receita Federal [verificar contagem direta nos Dados Abertos CNPJ]". 2. Trocar "apenas cerca de 5% utilizam" por "menos de 3% das empresas elegíveis" (6.252 CNPJs em 2025). 3. Manter "0,03% dos contribuintes PF" com a base explícita (13.580 PF sobre 43,3 milhões de declarações de 2025). 4. Trocar "de 6% a 8%" e "8% para artes cênicas e música" por "até 6% do imposto devido, na cesta conjunta com fundos da criança e do idoso e audiovisual; 7% quando inclui esporte" e explicar que o art. 18 dá dedução integral do aporte sem alterar o teto (Lei 9.532/1997, art. 22). 5. Em "até 4% do IRPJ", acrescentar a ressalva da cesta compartilhada com audiovisual e esporte de inclusão social (SC Cosit 4/2026) e a ressalva da LC 224/2025 (3,6% na leitura da Receita) [verificar]. 6. Atualizar a FGV para o estudo de 2024: R$ 7,59 por R$ 1 (Sul R$ 9,81), 228 mil postos, R$ 1,39 em tributos; retirar "68 segmentos" até confirmar [verificar]. 7. CNI: "7,5 milhões" vira "7,4 milhões de trabalhadores"; "130 mil empresas" vira o número e a definição do estudo [verificar]. 8. Incluir a tabela da cesta de incentivos (cultura 4%, esporte 2%, FIA, Idoso, Pronon e Pronas 1% cada). 9. Rodapé com as fontes (lei, artigo, URL e data de consulta) e a data da edição; ressalva legal padrão (seção 4). 10. Contato público só o da Prospekto. |
| Versão com espaço para logotipo do parceiro | Mesmo arquivo, segunda variante, para o kit de contadores (`parceiros-contadores.md`, seção 5) |
| Critério de pronto | Daniela aprova por escrito; o sócio confere os dez itens contra `mercado-e-posicionamento.md`, seção 4, e sobe o PDF ao armazenamento privado com `guide_version = 2026-10` |

- Até a edição revisada estar aprovada, a página `/guia` vai ao ar com o formulário desligado e a mensagem "Edição revisada em breve. Deixe seu e-mail e avisamos quando estiver disponível" (campo `email` e consentimento; lead em `patrocinadores` ou `contadores` conforme `perfil`, estágio `novo`, `origem = guia`, tag `avisar_guia`). A edição antiga não é distribuída pelo site.
- Entrega: arquivo em armazenamento privado; rota `src/app/api/downloads/guia/route.ts` (nome de `docs/arquitetura/scaffold.md`; ADR-001) valida um token assinado (lead e validade de 72 horas), registra `guide_download` e responde com o PDF (`Content-Disposition: attachment; filename="contabilizando-cultura-prospekto.pdf"`). Tamanho-alvo abaixo de 5 MB.
- Versão: o nome do arquivo e o rodapé do PDF trazem a data da edição; o CRM guarda `guide_version` no lead para saber quem recebeu a versão antiga.

### 10.4 CRM e agenda

- O site grava no mesmo banco do CRM (`docs/arquitetura/`), pela camada `src/lib/`; não há API externa entre os dois na Fase 1.
- Agendamento do diagnóstico: na Fase 1, manual pela Daniela (WhatsApp ou ligação). Se o volume justificar, link de agenda (Cal.com ou Google Agenda) na página de obrigado [verificar preferência da Daniela].

### 10.5 Dados da carteira

- `/projetos` lê a entidade `project` do CRM com `stage = captando` e `publicavel = true` (campo a acrescentar na entidade: autorização por escrito do proponente, data e quem autorizou). Campos exibidos na seção 4.6.

## 11. Perguntas em aberto

1. O domínio `prospekto.com.br` já tem site e e-mail hospedados? Onde está o DNS? (`docs/visao.md`, pergunta 4)
2. Existe identidade visual (logotipo, cores) que o site deve seguir?
3. Quais fotos da Daniela e de projetos podem ser usadas? Há autorização da Ocotea Filmes para publicar "A Tacada Perfeita" com elenco e valores?
4. Biografia da Daniela: formação, anos de atuação, números de projetos e municípios atendidos, cursos ministrados.
5. CNPJ, endereço e cidade-sede para o rodapé, a política de privacidade e os dados estruturados.
6. Quem é o encarregado de dados (LGPD) e qual advogado revisa a política e o texto de consentimento?
7. Resolvido: a edição revisada do guia tem responsáveis (Daniela revisa; sócio diagrama), prazo (PDF aprovado até 16/10/2026, publicação até 19/10/2026, antes da Mercopar) e lista de alterações na seção 10.3. Pendente só a confirmação da Daniela de que o prazo cabe na agenda [verificar].
8. A Daniela aceita responder leads por WhatsApp a partir do CRM dentro dos SLAs (1 dia útil para `novo`)?
9. Links do LinkedIn e do Instagram da Daniela e da Prospekto.
10. Resolvido: a parceria com contadores é de co-marketing, sem comissão (`docs/playbooks/parceiros-contadores.md`, seção 3, modelo A). Um honorário de indicação pago com receita própria (modelo B) só entra com parecer jurídico escrito; até lá, o site não menciona nenhuma remuneração ao escritório.

## 12. Termos usados neste documento

Textos de interface e copy ficam em português. Alguns termos de mercado sem equivalente direto aparecem neste documento e nos playbooks; o significado é o do `docs/dominio/glossario.md`:

| Termo | Uso aqui |
|---|---|
| Lead magnet | Material gratuito (guia, simulador, diagnóstico) oferecido em troca do contato |
| Webinar | Apresentação ao vivo por vídeo, com inscrição; usada com contadores |
| Deck | Apresentação em PDF de um projeto da carteira |
| Pitch | Fala curta de apresentação, em evento ou reunião |
| Checklist | Lista de verificação em PDF (PNAB, projeto captável, depósito identificado) |
| Landing | Página de campanha com um só objetivo e um só formulário (`docs/playbooks/campanhas.md`) |
| Follow-up | Contato de retomada previsto no SLA de cada estágio (`personas-e-funis.md`, seção 8) |
| CTA | Botão ou link de chamada para a ação |

Os termos "eyebrow", "headline", "subheadline", "gate" e "break-up" não são usados: o site fala em rótulo, título, subtítulo, formulário de captura e mensagem de encerramento.

## 13. Fontes

| # | Fonte | URL ou documento | Uso neste documento | Consulta |
|---|---|---|---|---|
| 1 | MinC, "Lei Rouanet alcança R$ 3,41 bilhões em captação" (jan/2026); espelhos ABC do ABC e Folha JF | https://www.gov.br/cultura/pt-br/assuntos/noticias/lei-rouanet-alcanca-r-3-41-bilhoes-em-captacao-e-consolida-politica-de-nacionalizacao-do-incentivo-cultural ; https://abcdoabc.com.br/lei-rouanet-atinge-3-41-bilhoes-bate-recorde-3-ano/ | R$ 3,41 bi em 2025; +45,1% desde 2023 (o valor do Sul em 2025 citado nos espelhos não foi reconciliado com `mercado-e-posicionamento.md`, seção 3.2, que marca o destino do Sul em 2025 como [verificar]; não usar no site) | 03/10/2026 (gov.br restrito; número confirmado nos espelhos) |
| 2 | MinC, "Com R$ 203,4 milhões movimentados pela Lei Rouanet no RS em 2025, Caxias do Sul recebe comissão" (mai/2026); MinC, "Em Caxias do Sul, CNIC aprova 238 projetos" (espelho Plantão News) | https://www.gov.br/cultura/pt-br/assuntos/noticias/com-r-203-4-milhoes-movimentados-pela-lei-rouanet-no-rs-em-2025-caxias-do-sul-recebe-comissao-que-avalia-projetos ; https://plantaonews.com.br/em-caxias-do-sul-cnic-aprova-238-projetos-culturais-e-autoriza-r-2972-milhoes-por-meio-da-lei-rouanet/ | RS R$ 203,4 mi em 2025 (R$ 160,1 mi em 2023); projetos aprovados no RS de 626 para 981 (`mercado-e-posicionamento.md`, seção 3.2); Caxias: 42 projetos em execução, mais de R$ 12,4 mi captados em 2025; CNIC em 07/05/2026 | 03/10/2026 |
| 3 | FGV para o MinC, Pesquisa de Impacto Econômico da Lei Rouanet 2024 (divulgada em 13 e 14/01/2026); espelhos CUT e Poder360 | https://www.cut.org.br/noticias/lei-rouanet-gerou-e-manteve-mais-de-228-mil-postos-de-trabalho-em-2024-diz-fgv-58b5 ; https://www.poder360.com.br/poder-cultura/lei-rouanet-movimentou-r-257-bilhoes-na-economia-em-2024-diz-fgv/ ; https://www.gov.br/cultura/pt-br/assuntos/noticias/lei-rouanet-movimenta-r-25-7-bilhoes-e-gera-228-mil-empregos-em-2024-aponta-estudo-da-fgv | R$ 7,59 por R$ 1; Sul R$ 9,81; R$ 25,7 bi; 228.069 postos; R$ 1,39 em tributos | 03/10/2026 |
| 4 | `docs/estrategia/mercado-e-posicionamento.md`, seção 4 | documento interno | "Menos de 3%" (6.252 CNPJs sobre 220 a 250 mil empresas no lucro real [verificar fonte primária da Receita]); correções do guia | 03/10/2026 |
| 5 | Times Brasil/CNBC com dados do SALIC, "Quais empresas mais patrocinaram a Lei Rouanet em 2025" | https://timesbrasil.com.br/entretenimento/cinema-e-tv/quais-empresas-mais-patrocinaram-lei-rouanet-2025-veja-ranking/ | 6.252 CNPJs; 13.580 PF; 75% fora das 10 maiores (cálculo em `mercado-e-posicionamento.md`, seção 3.3) | 03/10/2026 |
| 6 | Receita Federal, balanço final do IRPF 2025 (espelho Agência Gov) | https://agenciagov.ebc.com.br/noticias/202505/receita-federal-divulga-balanco-final-do-imposto-de-renda-de-2025 | 43.344.108 declarações; 55,5% simplificado (44,5% completo); base do 0,03% | 03/10/2026 |
| 7 | Blog Prosas, balanço 2025 | https://blog.prosas.com.br/lei-rouanet-2025-recorde-incentivo-cultural/ | 59% dos aportes no 4º trimestre | 03/10/2026 |
| 8 | Lei 8.313/1991, arts. 18, 23, 26 e 27; Lei 9.532/1997, arts. 5º, 6º e 22; Lei 9.249/1995, art. 3º, § 4º; Lei 9.250/1995, art. 12 | via `docs/dominio/leis-de-incentivo.md`, seções 2.1 a 2.3 e 11 | Limites de 4% e 6%, base de cálculo, art. 18 e 26, vedações | 03/10/2026 |
| 9 | Lei 8.685/1993, art. 1º-A; Lei 15.132/2025 | via `docs/dominio/leis-de-incentivo.md`, seção 3 | Audiovisual art. 1º-A, vigência até 2029 | 03/10/2026 |
| 10 | Solução de Consulta Cosit 4/2026 | https://chambarelli.com.br/solucao-de-consulta-cosit-no-4-2026-como-ficam-os-limites-de-deducao-no-irpj-para-esporte-cultura-e-audiovisual/ | Cesta compartilhada de 4%; esporte geral fora | 03/10/2026 |
| 11 | LC 224/2025; IN RFB 2.305/2025 e 2.307/2026 | via `docs/dominio/leis-de-incentivo.md`, seção 2.5 | Aviso de 3,6% [verificar] | 03/10/2026 |
| 12 | IN MinC 29/2026, arts. 5º, 19, 53, 54 e 69 | https://www.gov.br/cultura/pt-br/acesso-a-informacao/legislacao-e-normativas/instrucao-normativa-minc-no-29-de-29-de-janeiro-de-2026 ; https://www.legisweb.com.br/legislacao/?id=499251 | Remuneração de captação (10%, R$ 150 mil), janela do SALIC, depósito e recibo, prestação de contas | 03/10/2026 |
| 13 | Lei 13.709/2018 (LGPD), arts. 5º, 7º, 8º, 9º e 18 | https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-publicacaooriginal-156212-pl.html ; `docs/playbooks/campanhas.md`, seção 1.2 | Consentimento, bases legais, direitos do titular | 03/10/2026 |
| 14 | Guia e apresentação "Contabilizando Cultura" (Prospekto) | `docs/fontes/materiais/contabilizando-cultura-guia-gratuito.txt` e `-apresentacao.txt` | Linguagem aprovada, mitos, passo a passo, divisão de competências, contato público | documento interno |
| 15 | Apresentação institucional fomento.ai | `docs/fontes/materiais/referencia-fomento-ai-apresentacao.txt` | Referência de estrutura editorial e de tom | documento interno |
| 16 | Deck "A Tacada Perfeita" (Ocotea Filmes); ata BRDE/FSA de 23/12/2025; notícia Atlas Público de 02/09/2026 | `docs/fontes/materiais/exemplo-projeto-a-tacada-perfeita-deck.txt` ; via `docs/dominio/leis-de-incentivo.md`, seção 3.5 | Projeto exemplo da carteira | 03/10/2026 |
| 17 | FIESC/CNI, economia criativa | https://fiesc.com.br/pt-br/imprensa/economia-criativa-vai-criar-1-milhao-de-novos-empregos-ate-2030-aponta-cni | 3,11% do PIB; 7,4 milhões de trabalhadores; 8,4 milhões até 2030 (para a edição revisada do guia) | 03/10/2026 |
| 18 | `docs/estrategia/personas-e-funis.md`, seções 2, 3, 8 e 9 | documento interno | Segmentos, objeções, pipelines, estágios, campos de lead e consentimento | 03/10/2026 |
| 19 | `docs/playbooks/campanhas.md`, seções 1.1 a 1.3 e 9 | documento interno | Regras de números e promessas, LGPD operacional, estrutura de landing, textos curtos | 03/10/2026 |
| 20 | `docs/produto/mentoria-e-curso.md` | documento interno | Página da mentoria e lista de espera | 03/10/2026 |
| 21 | `docs/arquitetura/next16-convencoes.md` | documento interno | Route groups, Server Actions, revalidação | 03/10/2026 |
