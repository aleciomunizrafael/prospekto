# Playbooks de prospecção

> Índice dos playbooks operacionais da Prospekto e rotina semanal consolidada para a Daniela e o sócio. Contexto e modelo de negócio em `docs/visao.md`; regras legais em `docs/dominio/leis-de-incentivo.md`; mercado e posicionamento em `docs/estrategia/mercado-e-posicionamento.md`.
>
> Data de referência: 03/10/2026. Os playbooks começam a valer na semana de 05/10/2026, dentro da campanha de fechamento do ano.

## Os quatro playbooks

| Playbook | Para quê | Arquivo |
|---|---|---|
| LinkedIn | Perfil e página, calendário de conteúdo de 8 semanas, busca de contas, cadência e modelos de mensagem por persona, limites de uso, métricas, registro no CRM | `linkedin.md` |
| Networking | Mapa de entidades e eventos da Serra e do RS, roteiro de abordagem, pitches de 30 segundos e 2 minutos, kit de materiais, conversão de contato em reunião, rotina mensal | `networking.md` |
| Campanhas | Calendário anual (fechamento do ano, planejamento tributário, lançamento de projetos, municípios, trimestrais, LIC-RS), sequências de e-mail e WhatsApp prontas, landing pages, LGPD e consentimento, métricas | `campanhas.md` |
| Parceiros contadores | Programa de parceria com escritórios contábeis: proposta de valor, modelo de co-marketing (sem comissão até parecer jurídico), onboarding, kit, webinar mensal, acordo, FAQ, métricas | `parceiros-contadores.md` |

## Regras comuns

- Números e prazos só os de `docs/dominio/leis-de-incentivo.md`; não usar "545 mil empresas", "5% usam" nem "8% para PF" (`docs/estrategia/mercado-e-posicionamento.md`, seção 4).
- Sem promessa de retorno financeiro ao patrocinador, sem comissão a contador, sem contato sem consentimento (e-mail e WhatsApp).
- Contador do prospect sempre na conversa.
- Todo contato vira registro no CRM em até 24 horas, com origem, persona, próxima ação e data. Enquanto o CRM não existe, planilha com as mesmas colunas (`linkedin.md`, seção 9).
- Toda peça traz a fonte do número e a ressalva "o cálculo final do limite é do contador".
- Agendamento de reuniões (decisão única, válida para os quatro playbooks): na Fase 1 não há página de agendamento. A Daniela marca a simulação ou o diagnóstico por WhatsApp, oferecendo dois horários na própria mensagem, e o sócio registra no CRM (`docs/site/estrutura-e-copy.md`, seção 10.4). Onde `linkedin.md`, `networking.md` e `campanhas.md` escrevem "[link de agendamento]" ou "página de agendamento", ler "dois horários por WhatsApp" até esta decisão mudar. Regra de revisão: se, em um mês, o número de reuniões marcadas passar de 20 ou a resposta aos horários demorar mais de 24 horas úteis, o sócio propõe uma ferramenta (Cal.com ou Google Agenda [verificar preferência da Daniela]) com os dois tipos de reunião e registra a troca aqui e na seção 10.4 de `estrutura-e-copy.md`.
- Registro da reunião marcada no CRM: atividade do tipo `reuniao` com data e hora, canal (`whatsapp` ou `ligacao`), tipo (simulação para empresa, 20 minutos; conversa com contador, 30 minutos; ligação PF, 15 minutos) e `next_action_at` na data da reunião; o lead sobe a `qualificado` quando a reunião está marcada e o regime (PJ) ou o modelo de declaração (PF) está confirmado (`linkedin.md`, seção 9, item 4; `docs/arquitetura/modelo-de-dados.md`, seção 4.7). A disponibilidade informada no formulário do site (`disponibilidade`: manhã, tarde, qualquer) orienta os dois horários oferecidos (`estrutura-e-copy.md`, seção 5.4).

## Divisão de trabalho

| Daniela (rosto e voz) | Sócio (operação) |
|---|---|
| Publica e responde no LinkedIn em nome próprio | Monta listas, rascunhos, carrosséis e vídeos cortados |
| Reuniões, simulações, palestras, visitas, webinar | Agenda, kit, landing pages, UTM, disparos de e-mail |
| Decide o que entra na carteira e nas peças | CRM, métricas de sexta-feira, mapa de entidades |
| Relação com escritórios e entidades | Follow-ups administrativos e registro de consentimento |

## Rotina semanal consolidada

Carga estimada: Daniela 10 a 12 horas por semana; sócio 8 a 10 horas. Ajustar após 4 semanas com as métricas.

| Dia | Daniela | Sócio |
|---|---|---|
| Segunda | 15 convites LinkedIn com nota; cadência de mensagens do CRM (30 min); responder comentários; revisar a peça da campanha da semana (30 min) | Lista de prospects da semana por persona; peça da campanha pronta e revisada; landing e UTM testadas; disparo do e-mail da campanha pela manhã |
| Terça | Post no LinkedIn (texto); 15 convites e cadência; 1 visita a escritório contábil ou reunião a três (quinzenal) | Repost com comentário na página da Prospekto; registro no CRM dos aceites e respostas; follow-ups administrativos |
| Quarta | Reunião-almoço da CIC (ou evento do mês); 15 convites e cadência; webinar na última quarta do mês | Preparar lista das 10 pessoas do evento; follow-ups de evento em 24 h; inscrições do webinar |
| Quinta | Post no LinkedIn (carrossel ou vídeo); 15 convites e cadência; 2 simulações ou reuniões; respostas de WhatsApp (opt-in) | Post institucional na página; carteira atualizada (saldos a captar); envio de simulações preparadas |
| Sexta | 15 convites e cadência; 1 café individual com pessoa-chave (quinzenal); revisão das métricas com o sócio (20 min) | Métricas de LinkedIn, campanhas, networking e parceiros; limpeza de convites pendentes; planejamento da semana seguinte |
| Sábado | Post pessoal ou bastidor (agendado) | Nada |
| Diário (15 min) | Comentários em 5 posts de prospects e entidades | Caixa de entrada: respostas em até 2 horas úteis, registro no CRM |

## Rotina mensal

| Semana | Ação |
|---|---|
| 1 | Lista mensal de contas (busca gratuita ou Sales Navigator); agenda de eventos do mês; proposta de palestra ou café a uma entidade (rodízio: SESCON Serra, CIC, SIMECS, Sindilojas, Sebrae, CRC-RS) |
| 2 | Visita a 2 escritórios contábeis novos; reunião de 20 minutos com cada escritório ativo |
| 3 | Evento principal do mês; reunião com 1 secretaria de cultura ou conselho |
| 4 | Webinar de contadores; balanço mensal (métricas dos quatro playbooks); revisar o mapa de entidades e resolver itens [verificar]; trocar o destaque do perfil |

## Próximos 90 dias (outubro a dezembro de 2026)

| Mês | Prioridade | Marcos |
|---|---|---|
| Outubro | Preparar e abrir a campanha 1 (fechamento do ano); perfil e página no ar; guia revisado; kit pronto para a Mercopar | Mercopar 20 a 23/10; Feira do Livro de Caxias até 18/10; e-mail 1 da campanha PJ na semana de 19/10 |
| Novembro | Fechamento: simulações e termos; webinar PF para contadores; Natal Luz para contatos | E-mail 4 da sequência PJ (23/11); e-mail 1 PF (02/11); prazo interno de termo 23/12 anunciado |
| Dezembro | Só fechamento e depósitos; agradecimentos; agenda de janeiro | Depósitos até 30/12/2026 [verificar último dia útil bancário]; recibos emitidos; balanço do ano |
| Janeiro de 2027 | Campanha 2 (planejamento tributário); renovação de patrocinadores; proposta de Café com Estudos ao SESCON Serra | Webinar de planejamento; 5 escritórios no programa até março |

## Metas do primeiro ciclo (até março de 2027)

| Indicador | Meta |
|---|---|
| Reuniões ou simulações por semana | 3 (LinkedIn) + 1,5 (networking) |
| Termos assinados na campanha de fechamento | 10 |
| Escritórios parceiros ativos | 5 |
| Participação de indicações de contadores no captado | 30% |
| Leads com consentimento no CRM | 150 na campanha 1 |
| Taxa de aceite de convites no LinkedIn | Acima de 30% |

As metas são hipóteses para calibrar; depois de 4 semanas de dados, substituir pelas médias reais. Os sinais que justificam a Fase 2 estão em `docs/estrategia/mercado-e-posicionamento.md`, seção 9.4.

## Antes de começar (uma vez)

- [ ] Guia "Contabilizando Cultura" revisado com os números corrigidos e as fontes no rodapé.
- [ ] Carteira de projetos listada: nome, lei e artigo, portaria e prazo, valor aprovado, saldo a captar, contrapartidas [verificar com a Daniela].
- [ ] Perfil da Daniela e página da Prospekto otimizados (`linkedin.md`, seções 2 e 3).
- [ ] Planilha-CRM com as colunas de `linkedin.md`, seção 9, até o CRM existir.
- [ ] Landing do guia com formulário e caixa de consentimento; política de privacidade publicada; encarregado nomeado.
- [ ] Modelos de WhatsApp para marcar reunião (dois horários, um para cada tipo: simulação para empresa de 20 minutos e conversa com contador de 30 minutos) salvos como respostas rápidas no WhatsApp Business; sem página de agendamento na Fase 1 (regra em "Regras comuns").
- [ ] Conta WhatsApp Business no nome da Prospekto; domínio de e-mail autenticado (SPF, DKIM, DMARC) [verificar].
- [ ] Modelo de termo de patrocínio e acordo de parceria revisados por advogado [verificar].
- [ ] Decisão sobre Sales Navigator (a partir do segundo mês, se a cadência se mantiver).
