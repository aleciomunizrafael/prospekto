# Playbook de campanhas sazonais

> Calendário anual de campanhas da Prospekto, alinhado ao calendário fiscal e aos editais, com textos prontos para e-mail, WhatsApp, LinkedIn e anúncios. Contexto em `docs/visao.md`; prazos e limites em `docs/dominio/leis-de-incentivo.md` (seção 9 traz o calendário do incentivo); posicionamento e mensagens em `docs/estrategia/mercado-e-posicionamento.md`. Rotina semanal consolidada em `README.md` desta pasta.
>
> Data de referência: 03/10/2026. Hoje a campanha ativa é a de fechamento do ano (campanha 1). Tudo o que não foi confirmado está marcado com "[verificar]".

## 1. Regras que valem para todas as campanhas

### 1.1 Números e promessas

- Usar só os limites e prazos de `docs/dominio/leis-de-incentivo.md`: PJ no lucro real até 4% do IR devido (alíquota de 15%, sem o adicional), com a ressalva da LC 224/2025 (possível 3,6%) [verificar]; PF até 6% do imposto devido na declaração completa; depósito até o último dia útil bancário de dezembro; cesta compartilhada entre Rouanet, Audiovisual e esporte de inclusão (SC Cosit 4/2026).
- Não usar "545 mil empresas", "5% usam" nem "até 8% para PF" (`docs/estrategia/mercado-e-posicionamento.md`, seção 4). Usar "menos de 3% das empresas elegíveis".
- Não prometer retorno financeiro, "custo zero" no art. 26, aprovação garantida nem dedução no lucro presumido ou Simples pela Rouanet (`docs/dominio/leis-de-incentivo.md`, seção 10.2). Para presumido, a oferta é a LIC-RS.
- Toda peça leva uma frase de ressalva: "O cálculo final do limite é feito pelo contador da empresa, conforme a legislação vigente."
- Nome, valor e logotipo de patrocinador ou proponente só com autorização por escrito.

### 1.2 LGPD e consentimento (e-mail e WhatsApp)

Base legal: Lei 13.709/2018 (LGPD). Artigos usados: art. 5º, XII (definição de consentimento: manifestação livre, informada e inequívoca); art. 7º, I (consentimento) e IX (legítimo interesse); art. 8º (consentimento por escrito ou por outro meio que demonstre a manifestação de vontade; ônus da prova é do controlador; cláusula destacada); art. 9º (informação clara sobre finalidade); art. 10 (legítimo interesse e teste de balanceamento); art. 18 (direitos do titular, inclusive revogação); art. 46 (segurança). Texto da lei: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm (planalto costuma falhar; espelho em https://www.gov.br/anpd). Guia da ANPD sobre legítimo interesse (fev/2024): https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf

Regras operacionais da Prospekto:

| Situação | Base legal | O que fazer |
|---|---|---|
| Pessoa baixou o guia, usou o simulador ou se inscreveu em webinar pelo site | Consentimento (art. 7º, I) | Caixa de marcação não pré-marcada: "Quero receber materiais da Prospekto sobre incentivo fiscal à cultura por e-mail e WhatsApp. Posso cancelar quando quiser." Guardar data, hora, IP, origem e texto da caixa no CRM |
| Pessoa deu cartão em evento ou pediu "me manda" | Consentimento verbal registrado | Registrar no CRM data, evento e frase; primeira mensagem lembra o contexto e oferece sair ("responda NÃO") |
| Cliente ou patrocinador atual | Legítimo interesse (art. 7º, IX) para comunicações sobre o serviço contratado (recibo, prestação de contas, renovação) | Fazer e guardar um teste de balanceamento (LIA) de uma página, conforme o guia da ANPD; manter opção de sair para o que for promocional |
| Contato profissional público (site da empresa, LinkedIn) para primeiro contato B2B | Legítimo interesse, com cautela: um e-mail individual, pertinente ao cargo, com opção de não receber mais | Nunca em massa; nunca a e-mail pessoal; sem WhatsApp |
| Lista comprada ou alugada | Sem base legal adequada | Não usar |
| WhatsApp | Consentimento prévio exigido também pela política da Meta (opt-in com o nome da empresa; o número tem de ter sido fornecido pela própria pessoa) | Só enviar a quem marcou a caixa ou pediu; primeira mensagem identifica a Prospekto e oferece "SAIR". Fonte: https://whatsapp.serpro.gov.br/api-docs/conceitos-negocio/politicas/ e política de mensagens da Meta [verificar versão vigente] |
| Menores, dados sensíveis | Não coletar | Formulários pedem só nome, e-mail, empresa, cargo, cidade, telefone (opcional) e faixa de imposto (opcional) |

Obrigatório em toda peça:

- E-mail: remetente identificado (Prospekto Consultoria & Projetos, projetos@prospekto.com.br), endereço físico ou cidade no rodapé, link de descadastro de um clique que funciona em até 48 horas, motivo do envio ("você recebe este e-mail porque baixou o guia em [data]").
- WhatsApp: usar conta WhatsApp Business com o nome Prospekto; mensagem inicial com identificação e "responda SAIR para não receber mais"; sem listas de transmissão para quem não deu opt-in; sem envio fora do horário comercial (8h às 19h, dias úteis); respeitar o pedido de saída na hora e registrar no CRM.
- Política de privacidade publicada no site antes do primeiro formulário; nomeação de um encarregado (pode ser a Daniela ou o sócio) com e-mail de contato.
- Registro de consentimento e de descadastro no CRM, por canal (e-mail e WhatsApp são consentimentos separados).
- Dados de CPF e CNPJ de incentivadores só entram no CRM na etapa de termo, nunca em campanha.

Boas práticas de entrega (não são lei): autenticar o domínio prospekto.com.br com SPF, DKIM e DMARC antes de qualquer disparo [verificar com o provedor de e-mail]; enviar de uma ferramenta de e-mail marketing com descadastro automático; aquecer a lista com volumes pequenos; limpar devoluções.

### 1.3 Landing pages: estrutura mínima

Toda campanha aponta para uma página do site (`docs/visao.md`, Fase 1, item 1) com: título com a promessa e o prazo; três bullets de "como funciona"; simulador ou exemplo numérico; prova (projeto da carteira, recibo anonimizado, depoimento autorizado); formulário curto com caixa de consentimento; FAQ de 5 perguntas; rodapé com ressalva e política de privacidade. Parâmetros `utm_source`, `utm_medium` e `utm_campaign` em todos os links.

### 1.4 Métricas padrão por canal

| Canal | Métricas | Referência inicial |
|---|---|---|
| E-mail | Entregues, abertura, cliques, descadastros, respostas, reuniões | Abertura acima de 35% para lista própria pequena; cliques acima de 4%; descadastro abaixo de 0,5% |
| WhatsApp | Entregues, respostas, pedidos de saída, reuniões | Resposta acima de 20%; saída abaixo de 3% |
| LinkedIn | Ver `linkedin.md`, seção 8 | |
| Anúncios | Impressões, cliques, custo por lead, leads qualificados (lucro real ou contador), custo por reunião | Definir após 2 semanas de teste com verba pequena |
| Landing | Visitas, conversão do formulário, origem | Conversão acima de 15% para o guia; acima de 5% para simulação |
| Resultado | Reuniões, termos assinados, valor captado por campanha | Comparar com a meta de cada campanha |

Os valores de referência são hipóteses de mercado para listas pequenas e próprias, não dados da Prospekto [verificar após a primeira campanha].

## 2. Calendário anual

| Campanha | Período | Público | Gatilho fiscal ou de edital |
|---|---|---|---|
| 1. Última chance de destinar | Setembro a dezembro (pico de 20/10 a 20/12) | PJ lucro real anual e trimestral (4º trimestre), PF, contadores | IRPJ anual fecha em 31/12; depósito até o último dia útil bancário de dezembro; 59% dos aportes do país caem no 4º trimestre |
| 2. Planejamento tributário do ano | Janeiro a março | Escritórios contábeis; patrocinadores do ano anterior (renovação); PJ trimestral | Apuração do IRPJ anual e ECF em preparação; 1º trimestre fecha em 31/03; DIRPF de março a maio (PF usa os recibos) |
| 3. Lançamento de projetos | Quando sai portaria de captação (geralmente abril a julho) e ao longo do ano por projeto | PJ e PF já em nutrição; patrocinadores anteriores | Portaria de autorização publicada no SALIC; prazo de captação; janela de propostas de 01/02 a 31/10 |
| 4. Municípios e editais | Fevereiro a setembro, seguindo os editais da LIC-RS e do PNAB | Secretarias de cultura, prefeituras, conselhos; proponentes locais | Editais LIC-RS 2026: fev e mar (eventos do 2º semestre), abr e mai (patrimônio), jun e jul (produção e fruição), ago e set (eventos do 1º semestre seguinte); calendário 2027 [verificar] |
| 5. Trimestrais (mini-campanhas) | Duas semanas antes de 31/03, 30/06 e 30/09 | PJ no lucro real trimestral | Dedução no período de apuração em que ocorre o aporte |
| 6. LIC-RS para lucro presumido | Conforme calendário de habilitação dos projetos LIC-RS [verificar] | Contribuintes de ICMS no RS fora do Simples | Compensação no ICMS após a Carta de Habilitação de Patrocínio |

Fontes: `docs/dominio/leis-de-incentivo.md`, seção 9; sazonalidade em `docs/estrategia/mercado-e-posicionamento.md`, seção 3.5; LIC-RS em `docs/dominio/leis-de-incentivo.md`, seção 6.1.

Data crítica de 2026: 31/12/2026 é quinta-feira, mas normalmente não há expediente bancário em 31 de dezembro; o último dia útil bancário tende a ser 30/12/2026 [verificar na Febraban e com o Banco do Brasil]. Usar 30/12 como prazo de segurança em todas as peças e 23/12 como prazo interno para o termo assinado.

## 3. Campanha 1: Última chance de destinar (setembro a dezembro)

### 3.1 Objetivo, público, oferta

| Item | Definição |
|---|---|
| Objetivo | Fechar os aportes do ano: meta em reais definida pela carteira (soma dos saldos a captar com portaria vigente) [verificar com a Daniela]; meta de processo: 30 simulações, 10 termos |
| Público PJ | Decisores financeiros e donos de empresas no lucro real na Serra e no RS (personas A e B de `linkedin.md`); contadores desses clientes |
| Público PF | Pessoas com IR devido alto na declaração completa (persona D), sobretudo via contadores que fazem a declaração |
| Oferta PJ | Simulação gratuita de 20 minutos com o IRPJ projetado, dois ou três projetos da carteira e o checklist de documentos; Prospekto cuida do termo, recibo e prestação de contas |
| Oferta PF | Conta do limite em 15 minutos, lista de projetos da cidade e instrução para o depósito e para a declaração |
| Prazo visível | "Depósito até 30/12/2026" [verificar] e "termo até 23/12" |
| Landing | `/empresas/ultima-chance` (PJ) e `/pessoa-fisica` (PF), com contador de dias úteis restantes e simulador |
| Canais | E-mail (base com consentimento), WhatsApp (opt-in), LinkedIn (calendário de `linkedin.md`, semanas 4 a 8), anúncios (Meta e Google, verba de teste), eventos (Mercopar e Natal Luz, em `networking.md`) |

### 3.2 Sequência PJ (e-mail)

Lista: leads com consentimento das personas A e B, mais contatos de eventos. Um e-mail a cada 7 a 10 dias; quem responde ou marca reunião sai da sequência.

E-mail 1 (semana de 19/10). Assunto: "4% do IRPJ da [Empresa] já tem destino. Qual?"

> Olá, [Nome],
>
> Empresas tributadas pelo lucro real podem destinar até 4% do imposto de renda devido a projetos culturais aprovados pelo Ministério da Cultura (Lei 8.313/1991 e Lei 9.532/1997). O valor sai do imposto que a empresa já vai pagar; a diferença é que ele vira um projeto com a marca da [Empresa], aqui na região, com recibo oficial.
>
> Para valer na apuração de 2026, o depósito precisa acontecer até o último dia útil bancário de dezembro.
>
> Em 20 minutos eu faço a conta com o IRPJ projetado da empresa, mostro dois ou três projetos da Serra com saldo a captar e deixo o checklist para o seu contador. Ele pode participar da conversa.
>
> Quer marcar? [link de agendamento]
>
> Daniela Sandrin Copat
> Prospekto Consultoria & Projetos
> projetos@prospekto.com.br
>
> O cálculo final do limite é feito pelo contador da empresa, conforme a legislação vigente. Você recebe este e-mail porque [baixou o guia / nos conheceu na Mercopar] em [data]. Para não receber mais: [descadastrar].

E-mail 2 (7 dias depois). Assunto: "Um exemplo com números: R$ 2 milhões de IRPJ"

> [Nome], um exemplo para deixar concreto:
>
> Uma indústria com R$ 2 milhões de IRPJ devido (15% sobre o lucro real, sem contar o adicional) pode destinar até R$ 80 mil a cultura. Esse valor deixa de ir ao DARF e vai para a conta vinculada de um projeto aprovado. A empresa recebe o recibo de mecenato pelo SALIC e lança a dedução. Se somar esporte (2%) e os fundos da criança, do idoso, Pronon e Pronas (1% cada), chega a 10% do IRPJ com outro destino.
>
> Observação: há uma discussão sobre a redução de 10% nos incentivos federais a partir de 2026 (LC 224/2025); se prevalecer a leitura da Receita, o limite de cultura fica em 3,6%. A simulação já considera os dois cenários.
>
> Na [Empresa], quanto seria? Posso fazer a conta com vocês: [link].
>
> Daniela
>
> [rodapé padrão]

Fonte dos números: `docs/dominio/leis-de-incentivo.md`, seções 2.5, 7 e 8.

E-mail 3 (7 dias depois). Assunto: "Projetos da Serra com saldo a captar em 2026"

> [Nome], estes são projetos com portaria vigente e saldo a captar neste ano:
>
> - [Projeto 1]: [segmento], [cidade], saldo de R$ [valor], contrapartidas: [resumo]
> - [Projeto 2]: ...
> - [Projeto 3]: ...
>
> Todos no art. 18 da Lei Rouanet (dedução de 100% do aporte dentro do limite) ou no art. 1º-A da Lei do Audiovisual [ajustar por projeto]. Eu envio a apresentação de uma página do que interessar.
>
> Qual deles combina com a [Empresa]? [link]
>
> Daniela
>
> [rodapé padrão]

E-mail 4 (semana de 23/11). Assunto: "Faltam [N] dias úteis para o depósito"

> [Nome], passo a lista do que precisa estar pronto para a dedução valer em 2026:
>
> 1. Confirmação do regime e do IRPJ projetado (contador).
> 2. Projeto escolhido e termo de patrocínio assinado (eu preparo).
> 3. Depósito identificado na conta do projeto no Banco do Brasil até [30/12] [verificar].
> 4. Recibo de mecenato emitido no SALIC (eu emito e envio ao contador).
>
> Do seu lado, são dois passos: escolher e depositar. Se quiser, fechamos a conversa nesta semana: [link].
>
> Daniela
>
> [rodapé padrão]

E-mail 5 (semana de 07/12). Assunto: "Última semana para decidir"

> [Nome], esta é a última mensagem desta série. Se a decisão ficar para 2027, tudo bem: em janeiro eu envio o calendário do ano e os projetos novos. Se ainda der tempo este ano, respondo em até 2 horas em dias úteis.
>
> Obrigada pela atenção.
>
> Daniela
>
> [rodapé padrão]

### 3.3 Sequência PJ (WhatsApp, só com opt-in)

Mensagem 1 (após a reunião ou o pedido de material):

> Oi, [Nome], aqui é a Daniela, da Prospekto. Como combinamos, segue a simulação da [Empresa] e os projetos: [link]. Se não quiser mais receber mensagens minhas por aqui, responda SAIR.

Mensagem 2 (5 dias depois, se não houve retorno):

> Oi, [Nome]. Faltam [N] dias úteis para o depósito valer em 2026. Conseguiu olhar a simulação com o contador? Se ajudar, falo com ele direto.

Mensagem 3 (prazo interno, 23/12):

> [Nome], hoje é o prazo interno para assinar o termo e garantir o depósito dentro do ano. Me avise se seguimos ou se deixamos para 2027. Qualquer das duas respostas me ajuda a organizar. Obrigada.

### 3.4 Sequência PF (e-mail)

Lista: pessoas físicas com consentimento; contadores encaminham para clientes (ver `parceiros-contadores.md`).

E-mail 1 (semana de 02/11). Assunto: "Até 6% do seu IR pode virar cultura na sua cidade"

> Olá, [Nome],
>
> Quem declara o Imposto de Renda pelo modelo completo pode destinar até 6% do imposto devido a projetos culturais aprovados pelo Ministério da Cultura (Lei 9.532/1997, art. 22). O valor é transferido para a conta do projeto até o último dia útil bancário de dezembro, você recebe o recibo e informa na declaração de 2027. O valor sai do imposto, não do seu bolso.
>
> Só 0,03% dos contribuintes usam isso.
>
> Exemplo: com R$ 30 mil de imposto devido, dá para destinar até R$ 1.800. Com R$ 100 mil, até R$ 6 mil.
>
> Os projetos da Serra que estão captando: [link]. Eu faço a conta com você em 15 minutos: [link de agendamento].
>
> Daniela Sandrin Copat
> Prospekto Consultoria & Projetos
>
> O limite de 6% é compartilhado com doações ao FIA, ao Fundo do Idoso e ao audiovisual (7% se incluir esporte). Confirme com quem faz a sua declaração. [rodapé padrão]

E-mail 2 (semana de 23/11). Assunto: "Como fazer em 3 passos (prazo: dezembro)"

> [Nome], o passo a passo:
>
> 1. Estime o imposto devido de 2026 (seu contador ou o simulador do site).
> 2. Escolha um projeto e transfira o valor para a conta vinculada dele no Banco do Brasil, com identificação, até [30/12] [verificar].
> 3. Guarde o recibo que eu envio e informe na ficha "Doações Efetuadas" da declaração de 2027 [verificar o nome do campo e o código do incentivo].
>
> Quer que eu faça a conta com você? [link]
>
> Daniela
>
> [rodapé padrão]

E-mail 3 (semana de 14/12). Assunto: "Última chamada: depósito até [30/12]"

> [Nome], última mensagem do ano. Se quiser destinar parte do IR de 2026, o depósito precisa ser feito até [30/12] [verificar]. Me responda com o valor estimado do seu imposto e eu te mando os dados do projeto e as instruções em 1 hora útil.
>
> Daniela
>
> [rodapé padrão]

### 3.5 Anúncios (verba de teste)

- Meta (Instagram e Facebook): público por localização (Caxias do Sul, Bento Gonçalves, Farroupilha, Garibaldi, Gramado, Canela, Flores da Cunha, raio de 40 km), idade 30 a 65, interesses "contabilidade", "gestão financeira", "empreendedorismo", cargos "diretor", "proprietário" [verificar disponibilidade de segmentação por cargo]. Criativo: vídeo de 30 s da Daniela com o texto "O imposto que sua empresa já paga pode virar cultura aqui na Serra. Simule em 2 minutos." Objetivo: conversão na landing. Verba de teste: R$ 30 por dia por 14 dias [hipótese].
- Google Ads (pesquisa): palavras "lei rouanet patrocínio", "incentivo fiscal cultura empresa", "dedução irpj cultura", "patrocinar projeto cultural", "lei rouanet pessoa física", com segmentação geográfica RS. Anúncio: "Lei Rouanet na Serra Gaúcha | Até 4% do IRPJ vira cultura | Simulação gratuita com a Prospekto". Verba de teste: R$ 30 por dia [hipótese].
- LinkedIn Ads: só se houver verba acima de R$ 3 mil por mês; o custo por clique é alto. Preferir conteúdo orgânico (`linkedin.md`).
- Regra para todos: landing com consentimento; nenhum anúncio promete retorno financeiro; relatório semanal de custo por lead qualificado.

### 3.6 Métricas da campanha 1

| Métrica | Meta |
|---|---|
| Simulações realizadas | 30 (PJ) e 20 (PF) |
| Termos assinados | 10 |
| Valor captado | Meta da carteira [verificar] |
| Reuniões com contador presente | 50% das simulações PJ |
| Leads com consentimento criados | 150 |
| Custo por lead qualificado (anúncios) | Abaixo de R$ 60 [hipótese] |

## 4. Campanha 2: Planejamento tributário do ano (janeiro a março)

### 4.1 Objetivo, público, oferta

| Item | Definição |
|---|---|
| Objetivo | Entrar no planejamento tributário dos escritórios e das empresas antes do 2º trimestre; renovar os patrocinadores do ano anterior; preparar a PF para a DIRPF |
| Público | Escritórios contábeis (persona C) e seus clientes no lucro real; patrocinadores do ano anterior; PF que destinou em dezembro |
| Oferta para contadores | Webinar "Incentivos fiscais no planejamento de 2027: cultura, esporte, FIA, Idoso, Pronon e Pronas" (40 minutos), guia revisado, modelo de planilha de limites, programa de parceria (`parceiros-contadores.md`) |
| Oferta para patrocinadores | Relatório de contrapartidas entregues e proposta de renovação com projetos novos |
| Oferta para PF | Lembrete e orientação para informar o recibo na declaração |
| Landing | `/contadores/planejamento` com inscrição no webinar e download da planilha |
| Canais | E-mail, LinkedIn (calendário "planejamento"), visitas a escritórios, Café com Estudos do SESCON Serra (propor para fevereiro), WhatsApp para quem tem opt-in |

### 4.2 Sequência para contadores (e-mail)

E-mail 1 (2ª semana de janeiro). Assunto: "Planejamento 2027: 10% do IRPJ dos seus clientes com outro destino"

> Olá, [Nome],
>
> No planejamento tributário deste ano vale incluir uma linha que quase nunca entra: os incentivos fiscais sobre o IRPJ dos clientes no lucro real. Cultura e audiovisual, até 4% (cesta compartilhada); esporte, 2%; FIA, Fundo do Idoso, Pronon e Pronas, 1% cada. Somados, 10% do imposto devido podem ser direcionados, sem custo adicional para a empresa (Lei 9.532/1997; Solução de Consulta Cosit 4/2026).
>
> A parte da cultura é a maior e a mais simples de ativar: eu trago o projeto aprovado, faço o termo, o recibo no SALIC e a prestação de contas; o escritório calcula o limite e lança na ECF.
>
> Preparei um webinar de 40 minutos para equipes fiscais em [data]: [inscrição]. E uma planilha de limites para usar com os clientes: [download].
>
> Daniela Sandrin Copat
> Prospekto Consultoria & Projetos
>
> [rodapé padrão]

E-mail 2 (10 dias depois). Assunto: "Quais clientes seus são lucro real? Uma pergunta e uma oferta"

> [Nome], uma forma prática de começar: o escritório lista os clientes no lucro real com IRPJ projetado acima de R$ 500 mil (limite de cultura a partir de R$ 20 mil). Eu preparo uma simulação para cada um, com projetos da região, e vocês apresentam ao cliente como parte do planejamento. Quem faz a apresentação é o escritório; eu entro quando o cliente quiser conhecer os projetos.
>
> Posso passar aí para alinhar? [link]
>
> Daniela
>
> [rodapé padrão]

E-mail 3 (fevereiro, após o webinar). Assunto: "Gravação do webinar e o que mudou nas regras"

> [Nome], segue a gravação [link] e o resumo das mudanças: IN MinC 29/2026 (nova norma do SALIC), SC Cosit 4/2026 (cesta de 4%) e o status da LC 224/2025 (redução de 10%, ainda em discussão para a Rouanet). O material tem as fontes.
>
> Se quiser que eu apresente para a equipe do escritório ou para um cliente específico, é só marcar: [link].
>
> Daniela
>
> [rodapé padrão]

### 4.3 Renovação de patrocinadores (e-mail, janeiro)

Assunto: "Obrigada por 2026: o que o seu patrocínio realizou"

> [Nome], o patrocínio da [Empresa] ao projeto [nome] em 2026 resultou em: [entregas e contrapartidas, com fotos e números]. O recibo de mecenato foi enviado ao [escritório] em [data] para a ECF.
>
> Para 2027, separei [dois projetos] que combinam com a [Empresa]. Se quiser decidir cedo, o 1º trimestre já permite o aporte (empresas no lucro real trimestral deduzem no próprio trimestre) e garante as melhores contrapartidas.
>
> Posso apresentar em 20 minutos? [link]
>
> Daniela
>
> [rodapé padrão]

### 4.4 PF, março (e-mail)

Assunto: "Seu recibo e como informar na declaração"

> [Nome], segue novamente o recibo do seu aporte ao projeto [nome], feito em [data]. Na declaração de 2027, informe na ficha de doações e incentivos [verificar nome do campo] o valor e o CNPJ do projeto. Se o seu contador tiver dúvida, pode falar comigo.
>
> E obrigada: o projeto [resultado curto].
>
> Daniela
>
> [rodapé padrão]

### 4.5 Métricas da campanha 2

| Métrica | Meta |
|---|---|
| Escritórios inscritos no webinar | 30 |
| Escritórios que entram no programa de parceria | 5 |
| Listas de clientes recebidas de escritórios | 5 |
| Simulações para clientes de escritórios | 20 |
| Patrocinadores do ano anterior renovados | 70% |
| PF orientadas na declaração | 100% das que depositaram |

## 5. Campanha 3: Lançamento de projetos (ao longo do ano)

### 5.1 Objetivo, público, oferta

| Item | Definição |
|---|---|
| Gatilho | Publicação da portaria de autorização de captação (SALIC), aprovação na Ancine (art. 1º-A) ou habilitação na LIC-RS |
| Objetivo | Vender cotas do projeto específico; cada lançamento tem meta própria (saldo a captar dividido em cotas) |
| Público | Base em nutrição segmentada por afinidade (segmento cultural, cidade, porte); patrocinadores anteriores; empresas da cidade do projeto |
| Oferta | Cotas com contrapartidas definidas (nome da cota, valor, o que inclui); prazo; apresentação de uma página; visita ao projeto ou encontro com o artista |
| Landing | `/projetos/[slug]` com portaria, saldo, cotas, cronograma, contrapartidas, galeria e formulário "quero conhecer" |
| Canais | E-mail segmentado, LinkedIn (post da semana 7 do calendário), WhatsApp para opt-in, visita presencial, imprensa local (release) |

Exemplo de projeto da carteira para modelo de peça: "A Tacada Perfeita" (Ocotea Filmes), longa-metragem com R$ 2 milhões aprovados no FSA/BRDE e captação complementar via art. 1º-A da Lei do Audiovisual (`docs/fontes/materiais/exemplo-projeto-a-tacada-perfeita-deck.txt`; detalhes legais em `docs/dominio/leis-de-incentivo.md`, seção 3.5). Confirmar com a produtora os valores de cota, o prazo de captação e a autorização de uso dos nomes do elenco antes de publicar [verificar].

### 5.2 Sequência (e-mail)

E-mail 1 (dia da portaria). Assunto: "Novo projeto em captação: [nome], [cidade]"

> [Nome], saiu a autorização de captação do projeto [nome] ([lei e artigo], Pronac ou processo nº [número]). É [descrição em duas linhas], em [cidade], com [resultado esperado: público, apresentações, obra].
>
> Saldo a captar: R$ [valor]. Cotas a partir de R$ [valor], com [contrapartida principal]. Prazo: [data].
>
> Apresentação de uma página: [link]. Quer conhecer o projeto com a equipe? [link]
>
> Daniela
>
> [rodapé padrão]

E-mail 2 (10 dias depois). Assunto: "[Nome do projeto]: quem já entrou e o que falta"

> [Nome], o projeto [nome] já tem [X]% do valor captado [só com autorização dos patrocinadores para citar nomes]. Faltam R$ [valor] para liberar a execução [a liberação ocorre com 20% captado, IN MinC 29/2026, art. 56, salvo exceções].
>
> Para a [Empresa], a cota [nome] daria [contrapartida concreta] e caberia no limite de 4% do IRPJ. Fazemos a conta? [link]
>
> Daniela
>
> [rodapé padrão]

E-mail 3 (30 dias antes do prazo). Assunto: "Últimas cotas de [nome do projeto]"

> [Nome], restam [N] cotas e [N] dias de prazo. Depois disso o projeto segue com o que captou, e as contrapartidas de marca ficam com quem entrou. Se a [Empresa] quiser, eu seguro uma cota por 5 dias úteis enquanto o contador confirma o limite.
>
> Daniela
>
> [rodapé padrão]

### 5.3 Release para imprensa local (modelo)

> Título: Projeto [nome] é aprovado para captação pela Lei [Rouanet / do Audiovisual / LIC-RS] e busca patrocinadores na Serra
>
> [Cidade], [data]. O projeto [nome], [descrição], recebeu [portaria / aprovação] e está autorizado a captar R$ [valor] junto a empresas e pessoas físicas por meio de incentivo fiscal. A captação é conduzida pela Prospekto Consultoria & Projetos, de [cidade], com apoio de escritórios contábeis da região. Empresas tributadas pelo lucro real podem destinar até 4% do imposto de renda devido; pessoas físicas, até 6%. Informações: projetos@prospekto.com.br.

### 5.4 Métricas da campanha 3

Por projeto: cotas vendidas por semana, percentual captado, dias até 20% (liberação), origem de cada patrocinador (canal), contrapartidas entregues.

## 6. Campanha 4: Municípios e editais (fevereiro a setembro)

### 6.1 Objetivo, público, oferta

| Item | Definição |
|---|---|
| Objetivo | Vender consultoria a municípios (estruturação de projetos e aproximação com empresas locais) e alimentar a carteira com proponentes municipais |
| Público | Secretários de cultura, prefeitos, conselhos municipais de cultura e proponentes dos municípios da Serra (Caxias, Bento, Farroupilha, Garibaldi, Flores da Cunha, Gramado, Canela e os da CICS Serra) |
| Oferta | Diagnóstico gratuito de 1 hora: quais mecanismos o município e seus proponentes podem usar (LIC-RS, FAC-RS, Rouanet, PNAB, Financiarte e LIC Caxias), calendário de editais e plano de 12 meses; depois, proposta de consultoria |
| Gatilhos | Editais LIC-RS (fev e mar, abr e mai, jun e jul, ago e set); editais PNAB municipais; janela do SALIC (01/02 a 31/10); eleições municipais em 2028 (planejamento dos novos governos) [verificar] |
| Landing | `/municipios` com o calendário de editais e o formulário de diagnóstico |
| Canais | E-mail institucional e carta (ofício) ao secretário, visita, AMESNE e conselhos (`networking.md`), LinkedIn |

### 6.2 Carta ou e-mail ao secretário (modelo)

Assunto: "Diagnóstico gratuito: incentivos e editais de cultura para [município] em 2027"

> Prezado(a) Secretário(a) [Nome],
>
> A Prospekto Consultoria & Projetos, de [cidade], atua na elaboração, inscrição e captação de projetos culturais em leis de incentivo (Lei Rouanet, Lei do Audiovisual, LIC-RS) e em consultoria de cultura e economia criativa para empresas e municípios.
>
> Oferecemos ao município de [nome] um diagnóstico gratuito de uma hora, com: os mecanismos que o município e seus proponentes podem acessar; o calendário de editais do ano (LIC-RS em [meses], FAC-RS, PNAB); e um plano de 12 meses para aproximar as empresas locais tributadas pelo lucro real dos projetos da cidade.
>
> Em 2025 o Rio Grande do Sul movimentou R$ 203,4 milhões pela Lei Rouanet, e Caxias do Sul captou mais de R$ 12,4 milhões (Ministério da Cultura). Há espaço para os demais municípios da Serra.
>
> Posso apresentar em [datas]? Contato: projetos@prospekto.com.br.
>
> Daniela Sandrin Copat

Fonte dos números: `docs/estrategia/mercado-e-posicionamento.md`, seção 3.2.

### 6.3 E-mail para proponentes do município (após o diagnóstico)

Assunto: "Oficina: como preparar seu projeto para os editais de 2027"

> [Nome], a Secretaria de Cultura de [município] e a Prospekto vão realizar uma oficina gratuita em [data] sobre como preparar projetos para a LIC-RS, o FAC-RS e a Lei Rouanet, com o calendário de editais e os erros mais comuns. Vagas: [N]. Inscrição: [link].
>
> Quem tiver projeto aprovado com saldo a captar pode trazer o número para conversarmos sobre captação.
>
> Daniela
>
> [rodapé padrão]

A oficina também alimenta a lista de espera do produto digital (`docs/visao.md`, Fase 1, item 4).

### 6.4 Métricas da campanha 4

| Métrica | Meta anual |
|---|---|
| Municípios com diagnóstico realizado | 6 |
| Contratos de consultoria com municípios | 2 |
| Oficinas realizadas | 3 |
| Proponentes novos na carteira ou na lista de espera | 30 |

## 7. Campanha 5: mini-campanhas trimestrais

Duas semanas antes de 31/03, 30/06 e 30/09, para empresas no lucro real trimestral já em nutrição (campo "apuração: trimestral" no CRM). Um e-mail e uma mensagem de LinkedIn.

Assunto: "Fechamento do [1º/2º/3º] trimestre: dá tempo de destinar"

> [Nome], a [Empresa] apura o IRPJ por trimestre. O aporte feito até [data] entra na dedução deste trimestre (até 4% do imposto devido no período). Tenho [projeto] com saldo a captar e termo pronto. Fazemos a conta até [data]? [link]
>
> Daniela
>
> [rodapé padrão]

Métrica: termos assinados por trimestre fora do 4º (meta: 2 por trimestre no primeiro ano).

## 8. Campanha 6: LIC-RS para lucro presumido

Para empresas que não podem usar a Rouanet (presumido) mas recolhem ICMS no RS. A oferta depende da carteira de projetos habilitados na LIC-RS e do calendário de habilitação (Carta de Habilitação de Patrocínio) [verificar prazos e faixas de limite em `docs/dominio/leis-de-incentivo.md`, seção 6.1].

Assunto: "Sua empresa é lucro presumido? Ainda assim pode incentivar cultura (pelo ICMS)"

> [Nome], a Lei de Incentivo à Cultura do RS permite que empresas contribuintes de ICMS, fora do Simples, compensem no imposto estadual o patrocínio a projetos habilitados, dentro de um limite anual calculado sobre o ICMS do ano anterior. Há um repasse adicional não incentivado ao FAC (10% em projetos de artes). Tenho projetos habilitados em [cidades]. Fazemos a conta com o seu contador? [link]
>
> Daniela
>
> Faixas de limite e condições conforme o Decreto 55.448/2020 e alterações; confirmação pelo contador. [rodapé padrão]

Métrica: simulações LIC-RS e patrocínios habilitados (CHP) por ano.

## 9. Textos curtos para LinkedIn e WhatsApp (reutilizáveis)

| Uso | Texto |
|---|---|
| Post de abertura da campanha 1 | "Outubro é o mês em que as empresas no lucro real fecham a conta do IRPJ do ano. Até 4% desse imposto pode virar um projeto cultural na Serra, com recibo oficial. O depósito vale até o último dia útil bancário de dezembro. Menos de 3% das empresas usam. Quer saber quanto cabe na sua? Comente 'simulação'." |
| Post de contagem regressiva | "Faltam [N] dias úteis. O que precisa estar pronto: termo assinado, depósito identificado na conta do projeto, recibo no SALIC. O contador lança a dedução. Eu faço o resto." |
| Post PF | "Você declara pelo modelo completo? Até 6% do seu imposto devido pode ir para um projeto da sua cidade, até dezembro. O valor sai do imposto, não do bolso. Só 0,03% das pessoas usam." |
| Post de agradecimento (dezembro) | "Em 2026, [N] empresas e [N] pessoas da Serra destinaram R$ [valor] a [N] projetos culturais da região [só com autorização]. Obrigada. Em 2027 tem mais." |
| WhatsApp de confirmação de depósito | "Oi, [Nome]. Recebemos o depósito identificado da [Empresa] no projeto [nome] em [data]. O recibo de mecenato será emitido no SALIC e enviado ao [escritório] em até [N] dias úteis. Obrigada." |

## 10. Fontes

| Fonte | URL ou documento |
|---|---|
| Limites, prazos e calendário do incentivo | `docs/dominio/leis-de-incentivo.md`, seções 2.3, 2.5, 6.1, 7, 8 e 9 |
| Sazonalidade (59% no 4º trimestre) e números do RS | `docs/estrategia/mercado-e-posicionamento.md`, seções 3.2 e 3.5 |
| Correções do guia (545 mil, 5%, 8%) | `docs/estrategia/mercado-e-posicionamento.md`, seção 4 |
| LGPD, Lei 13.709/2018 | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm |
| Guia da ANPD sobre legítimo interesse | https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf |
| Política de mensagens do WhatsApp (opt-in) | https://whatsapp.serpro.gov.br/api-docs/conceitos-negocio/politicas/ |
| IN MinC 29/2026 (janela de propostas, liberação com 20%, custos) | https://www.gov.br/cultura/pt-br/acesso-a-informacao/legislacao-e-normativas/instrucao-normativa-minc-no-29-de-29-de-janeiro-de-2026 |
| Projeto exemplo (A Tacada Perfeita) | `docs/fontes/materiais/exemplo-projeto-a-tacada-perfeita-deck.txt` |

## Checklist da semana

- [ ] Qual campanha está ativa esta semana e qual e-mail da sequência sai (ver seções 3 a 8); peça revisada contra a seção 1.1 (números e ressalva).
- [ ] Lista de envio filtrada por consentimento válido e por canal; descadastros da semana anterior aplicados.
- [ ] Landing da campanha no ar, formulário testado, UTM nos links, caixa de consentimento não pré-marcada.
- [ ] Disparo de e-mail feito em dia útil pela manhã; WhatsApp só para opt-in, em horário comercial, com "SAIR".
- [ ] Respostas de e-mail e WhatsApp atendidas em até 2 horas úteis e registradas no CRM.
- [ ] Anúncios: verba, custo por lead e leads qualificados conferidos; pausar o que não gera lead qualificado em 7 dias.
- [ ] Métricas da campanha atualizadas na sexta-feira (seção 1.4 e metas da campanha).
- [ ] Prazo visível da campanha conferido (dias úteis até 30/12/2026 [verificar]; datas de editais do mês).
