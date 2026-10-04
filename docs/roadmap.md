# Roadmap

> Plano de execução do projeto descrito em `docs/visao.md` (não repetido aqui). Deriva da ordem de construção de `docs/arquitetura/scaffold.md` (seção 8), do calendário operacional de `docs/playbooks/README.md` ("Próximos 90 dias"), do plano de validação de `docs/produto/mentoria-e-curso.md` (seção 6), dos KPIs de `docs/estrategia/personas-e-funis.md` (seção 10) e dos sinais de Fase 2 de `docs/estrategia/mercado-e-posicionamento.md` (seção 9.4). Data de referência: 03/10/2026 (sábado); os sprints começam na segunda-feira 05/10/2026 e duram duas semanas. Todas as metas numéricas são hipóteses dos documentos de origem até a Daniela trazer o histórico real (pergunta A3 de `../README.md`). As perguntas em aberto citadas como "A1", "F1" etc. estão consolidadas em `../README.md`.

## 1. Fases

| Fase | Período | Objetivo | Critério de saída |
|---|---|---|---|
| 0. Kickoff | 03/10/2026 (concluída) | Entender o negócio, verificar os números, decidir a stack, especificar site, simulador, CRM, playbooks e produto | Documentos em `docs/` revisados; ADR-001 aceito; scaffold planejado |
| 1. Estrutura de captação da Prospekto | 05/10/2026 a 21/03/2027 (12 sprints) | Site, simulador e CRM no ar; playbooks em operação na campanha de fechamento do ano e na campanha de planejamento tributário; mentoria validada por pré-venda | Marcos M3, M6, M8 e M9 decididos (seção 9); a Daniela opera o CRM sem o Rafael; conversão medida por estágio |
| 2. Hub de captação | A partir do 2º semestre de 2027 [hipótese], só com os sinais da seção 9.4 de `mercado-e-posicionamento.md` | Empacotar site, CRM, playbooks e conteúdo como produto multi-tenant para outros consultores e produtoras | Segundo tenant operando; cobrança ativa; contrato de operador LGPD assinado |

## 2. Fase 0: kickoff (concluída em 03/10/2026)

Entregas, todas em `docs/` (índice em `README.md` desta pasta):

| Entrega | Documento | Observação |
|---|---|---|
| Visão, modelo de negócio e decisões provisórias | `visao.md` | Inclui a nota de revisão: 6% para PF (7% com esporte), 220 a 230 mil empresas no lucro real [verificar], menos de 3% de adesão, 0,03% das PF, ressalvas sobre os 4% |
| Briefing e materiais-fonte | `fontes/` | Guia e apresentação só circulam na edição revisada |
| Referência legal verificada | `dominio/leis-de-incentivo.md`, `glossario.md`, `parametros-simulador.json` | 9 parâmetros confirmados, 7 parciais, 0 refutados (`parametros-simulador.json`, campo `verificacao`) |
| Mercado, posicionamento, personas, funis, KPIs | `estrategia/` | Pipelines, estágios e campos são contrato com o código |
| Especificação do site e do simulador | `site/` | Decisões D1 (LC 224 por padrão) e D2 (LIC-RS com aviso) registradas em `simulador-spec.md`, seção 13.1 |
| Playbooks e rotina semanal | `playbooks/` | Valem a partir de 05/10/2026; planilha-CRM até o CRM existir |
| Estratégia do produto digital | `produto/mentoria-e-curso.md` | Validação em janeiro e fevereiro de 2027; turma em 09/03/2027 |
| Arquitetura | `arquitetura/` | ADR-001 aceito; modelo de dados; scaffold executável; três propostas julgadas |

O que a Fase 0 não resolveu está nas perguntas em aberto de `../README.md`. As que bloqueiam sprints específicos aparecem na seção 6.

## 3. Fase 1: calendário de sprints

Sprints de duas semanas, de segunda a domingo. Cada sprint tem um foco de desenvolvimento (Rafael) e um foco de operação (Daniela e sócio), porque a campanha de fechamento do ano não espera o software.

| Sprint | Datas | Foco de desenvolvimento | Foco de operação | Marco |
|---|---|---|---|---|
| S1 | 05/10 a 18/10/2026 | Scaffold, simulador puro e página, `/empresas`, `/guia` (em breve), `/contato`, `/privacidade`, preview no Vercel | Guia revisado até 16/10; LinkedIn semanas 1 e 2; Feira do Livro de Caxias (até 18/10); kit da Mercopar; planilha-CRM; respostas às perguntas A1, A6, F1, F2 | M1 (16/10): guia aprovado |
| S2 | 19/10 a 01/11/2026 | Deploy público e Vercel Pro, domínio e Resend, demais páginas e formulários, `/mentoria`, `/empresas/ultima-chance`, login e tela "Hoje" do CRM | Mercopar 20 a 23/10; e-mail 1 PJ da campanha 1 na semana de 19/10; webinar de contadores 28/10; LinkedIn semanas 3 e 4 | M2 (19/10): primeiro formulário público no ar |
| S3 | 02/11 a 15/11/2026 | CRM: lista e detalhe de leads, "Mover para", atividades, score, e-mail diário, exportação CSV; projetos (carteira); `/projetos`; CI e backup | E-mail 1 PF (02/11); simulações e reuniões a três; LinkedIn semanas 5 e 6; revisão das metas após 4 semanas (01/11) | M3 (fim de S2 ou início de S3): a Daniela registra lead e follow-up sem ajuda; M4 (01/11): metas recalibradas |
| S4 | 16/11 a 29/11/2026 | Aportes com recibo e comissão, organizações e contatos, importação CSV, relatório de sexta, webhook do Resend, `/conteudo` | E-mail 4 PJ (23/11); webinar 25/11; LinkedIn semanas 7 e 8 (encerra 29/11); propostas e termos | |
| S5 | 30/11 a 13/12/2026 | Correções de uso real; alertas de prazo e de 10% captado; ajustes de UX com a Daniela; congelamento de funcionalidades em 11/12 | Fechamento: termos, dados de depósito, follow-up diário a partir de 10/12 nos leads em `aporte` | |
| S6 | 14/12 a 27/12/2026 | Só correções; smoke diário; preparar `/contadores/planejamento` | Prazo interno de termo 23/12; depósitos até 30/12 [verificar último dia útil bancário]; recibos; agradecimentos | M5 (23/12 e 30/12): fechamento; M6 (fim de dezembro): balanço da campanha 1 |
| S7 | 28/12/2026 a 10/01/2027 | Sprint reduzido (festas): balanço técnico, `npm outdated`, dívida de UX, e-mail de boas-vindas da lista de espera | Recibos emitidos; agenda de janeiro; proposta de Café com Estudos ao SESCON Serra; 50 cadastros na lista de espera até 11/01 | |
| S8 | 11/01 a 24/01/2027 | `/contadores/planejamento` no ar; renovação de patrocinadores por e-mail; página do webinar da mentoria | Campanha 2 (planejamento tributário) começa; renovação de quem aportou; mentoria semanas 1 e 2 (conteúdo, aula aberta) | M7 (24/01): lista de espera com 150 ou mais |
| S9 | 25/01 a 07/02/2027 | Pesquisa da lista de espera; segmentação no CRM; preparar checkout e webhook da plataforma | Webinar da mentoria (25 a 31/01); pesquisa (01 a 07/02); webinar de planejamento para contadores; SALIC reabre em 01/02 | |
| S10 | 08/02 a 21/02/2027 | Webhook da plataforma de venda alimentando `alunos`; página de vendas | Pré-venda (08 a 14/02) e fechamento (15 a 21/02) da coorte; renovações | M8 (21/02): seguir ou parar a mentoria |
| S11 | 22/02 a 07/03/2027 | Área de membros e materiais da coorte (se M8 aprovou); mini-campanha trimestral (2 semanas antes de 31/03) | 5 escritórios parceiros ativos até março; preparar turma; DIRPF abre em 23/03 (campanha PF de março) | |
| S12 | 08/03 a 21/03/2027 | Balanço da Fase 1: conversão por estágio, estabilidade do CRM, custo; proposta de Fase 2 ou de segundo ciclo | Turma da coorte começa em 09/03; campanha PF; balanço com a Daniela | M9 (21/03): investir no hub ou rodar o segundo ciclo da Fase 1 |

Fontes das datas: `docs/playbooks/README.md` ("Próximos 90 dias"), `docs/playbooks/linkedin.md` (seção 4), `docs/playbooks/campanhas.md` (seções 2 e 3), `docs/site/estrutura-e-copy.md` (seção 10.3), `docs/produto/mentoria-e-curso.md` (seção 6), `docs/estrategia/personas-e-funis.md` (seção 4).

## 4. Épicos

| Épico | Objetivo | Documentos de referência | Sprints |
|---|---|---|---|
| E0. Fundação | Scaffold, banco, autenticação, CI, deploy, domínio, e-mail, backup | `arquitetura/scaffold.md`, `ADR-001-stack.md`, `modelo-de-dados.md` | S1 a S3 |
| E1. Site e captura | Páginas públicas, formulários por segmento com consentimento LGPD, guia por link assinado, carteira pública, páginas de campanha, analytics | `site/estrutura-e-copy.md` | S1 a S4, S8 |
| E2. Simulador | Biblioteca pura com testes, página com gate de captura, resultado detalhado, ADR-002 | `site/simulador-spec.md`, `dominio/parametros-simulador.json` | S1 e S2 |
| E3. CRM | Login, "Hoje", leads, estágios com regras, atividades, score, e-mail diário, projetos, aportes com comissão, CSV, relatório semanal | `estrategia/personas-e-funis.md` (seções 5, 8 e 9), `arquitetura/modelo-de-dados.md`, `propostas/proposta-c-simplicidade.md` (seção 9) | S2 a S5 |
| E4. Prospecção e playbooks em operação | Guia revisado, LinkedIn, networking, campanha 1 (fechamento), parceria com contadores, fechamento de dezembro, campanha 2 (planejamento) | `playbooks/*` | S1 a S12 |
| E5. Produto digital e validação | Lista de espera, conteúdo, webinar, pesquisa, pré-venda, decisão de abrir a coorte, operação da turma | `produto/mentoria-e-curso.md` | S2, S7 a S12 |

## 5. Histórias de usuário priorizadas

Prioridade: P1 (sem isso a campanha 1 ou o CRM não funcionam), P2 (necessário no primeiro ciclo), P3 (depois da validação). Critérios de aceite citam a seção que os define; o teste automatizado correspondente, quando existe, está indicado.

### E0. Fundação

| ID | História | P | Sprint | Critérios de aceite |
|---|---|---|---|---|
| US-01 | Como Rafael, quero o scaffold aplicado conforme `scaffold.md` para começar a programar sem serviço externo | P1 | S1 | Os seis critérios da seção 7 do scaffold: `npm run check` verde sem `DATABASE_URL`; `npm run dev` sobe a home mínima e `/app` redireciona para `/entrar`; cabeçalho `x-tenant-id` é apagado pelo proxy; `drizzle/0000_*.sql` revisado com as tabelas de `modelo-de-dados.md` e os `CHECK` de pipeline e estágio; `tests/isolation.test.ts` passa com dois tenants; `simulate.test.ts` cobre T-SCH-01 a T-SCH-06; `.env.example` completo e `.env.local` fora do git |
| US-02 | Como Rafael, quero um preview no Vercel Hobby com Neon Free (São Paulo, Postgres 17) e Resend em modo teste para validar o fluxo de ponta a ponta | P1 | S1 | `/api/health` responde 200 no preview; um lead de teste enviado por `/empresas` aparece no banco e chega por e-mail (`onboarding@resend.dev`); `scripts/smoke.ts` verde; variáveis da seção 9 do scaffold definidas no projeto |
| US-03 | Como Prospekto, quero o site em `prospekto.com.br` com e-mail autenticado para que a campanha 1 saia do domínio próprio | P1 | S2 | Domínio e `www` apontando para o Vercel; domínio verificado no Resend (SPF e DKIM) e DMARC publicado [verificar com quem administra o DNS]; e-mail de aviso de lead sai de `projetos@prospekto.com.br` sem fallback; plano Pro ativo no dia em que o primeiro formulário público é publicado (ADR-001, "Hospedagem"). Depende de F1 e F2 |
| US-04 | Como Rafael, quero CI e backup semanal para não depender de memória | P2 | S2 (CI), S3 (backup) | `ci.yml` verde em PR e em `main` com lint, typecheck, format:check, migrate, test, build; `backup.yml` executado uma vez por `workflow_dispatch` com artefato `db-dump-*` listado; uma restauração de teste feita em branch do Neon e registrada no PR; majors das actions confirmadas (G4) |

### E1. Site e captura

| ID | História | P | Sprint | Critérios de aceite |
|---|---|---|---|---|
| US-10 | Como decisor de uma empresa no lucro real, quero a página `/empresas` com o formulário de diagnóstico para pedir a conversa com a Daniela e meu contador | P1 | S1 | Copy da seção 4.2 e campos da seção 5.4 de `estrutura-e-copy.md`; `consent_lgpd` não pré-marcado, com `consent_at`, `consent_version` e canais gravados em `consents`; `origem`, UTM, `referrer` e `landing_path` gravados no lead; honeypot, tempo mínimo assinado, deduplicação por e-mail e segmento e limite de 5 envios por IP por hora (`form_attempts`); lead criado em `patrocinadores`, estágio `novo`, `tipo_pessoa = PJ`; e-mail de aviso a `LEAD_NOTIFY_EMAIL` e resposta automática da seção 5.6; `/obrigado/diagnostico` com botão WhatsApp pré-preenchido; teste da Server Action `createLead` contra PGlite |
| US-11 | Como visitante, quero baixar o guia "Contabilizando Cultura" em troca do meu e-mail, e a Prospekto quer que só a edição revisada circule | P1 | S1 (em breve), S2 (download) | Até a aprovação de M1: `/guia` publica só o bloco "edição revisada em breve" com e-mail, consentimento e tag `avisar_guia` (seção 10.3); depois: link assinado HMAC com validade de 72 h na rota `api/downloads/guia`, `activity` do tipo `download` registrada, `guide_version = 2026-10` no lead, PDF abaixo de 5 MB com `Content-Disposition: attachment`; a edição antiga nunca é servida; teste do token expirado |
| US-12 | Como visitante, quero a home, `/sobre`, `/contato`, `/privacidade` e `/obrigado/[tipo]` com o botão flutuante de WhatsApp | P1 | S1 e S2 | Copy das seções 4.1, 4.5 e 4.6; textos `wa.me` por página de `src/config/site.ts` (seção 10.1); títulos e descrições da seção 6.2; `lang="pt-BR"`; política de privacidade com a estrutura da seção 5.7, incluindo transferência internacional [verificar com advogado, B3]; contraste e foco conforme a seção 7.6; dados de rodapé (CNPJ, endereço) marcados [verificar] até A5 ser respondida |
| US-13 | Como contador, pessoa física, secretário de cultura ou proponente, quero a página do meu segmento com o formulário certo | P1 | S2 | `/contadores` cria lead em `contadores`/`novo`; `/pessoa-fisica` em `patrocinadores`/`novo` com `tipo_pessoa = PF`; `/municipios` em `municipios`/`novo`; `/proponentes` em `projetos`/`prospeccao`; campos por segmento da seção 9.3 de `personas-e-funis.md`; mesmas regras anti-spam e de consentimento de US-10; `/contadores` não menciona remuneração ao escritório até B2 ter parecer (seção 11, item 10) |
| US-14 | Como aspirante a captador, quero entrar na lista de espera da mentoria em `/mentoria` | P1 | S2 | Lead em `alunos`, estágio `lista_espera`, com `objetivo` e `experiencia`; consentimento separado para a lista; e-mail de boas-vindas (`mentoria-e-curso.md`, seção 6, semana 0); sem preço na página; FAQ da seção 4.6 |
| US-15 | Como patrocinador, quero ver em `/projetos` a carteira com saldo a captar e pedir para patrocinar um projeto específico | P2 | S3 | Lê `cultural_projects` com `stage = captando` e `publicavel = true`; cartões com os campos da seção 4.6; selo "dedução integral" em art. 18 e art. 1º-A; "Quero patrocinar este projeto" abre o diagnóstico com `project_id`; ressalva de portaria; `/projetos/[slug]` sem telefones ou e-mails de terceiros; só estreia com pelo menos um projeto autorizado (A1, A2) |
| US-16 | Como leitor vindo de busca, quero `/conteudo` com os artigos iniciais e o bloco do guia ao fim | P2 | S4 | Lista com data e tempo de leitura; categorias por público; artigos iniciais da seção 6.3; sitemap e `robots`; bloco "Baixe o guia" cria lead com `origem = guia` |
| US-17 | Como sócio, quero as páginas de campanha `/empresas/ultima-chance` (S2) e `/contadores/planejamento` (S8) fora do menu, com UTM | P2 | S2, S8 | Textos das seções 3.1 e 4.1 de `campanhas.md`; estrutura mínima da seção 1.3; formulário com consentimento e campo de origem `campanha`; não aparecem no menu nem no sitemap |
| US-18 | Como sócio, quero os eventos de analytics e a origem do lead para a métrica de sexta-feira | P2 | S2 | Eventos nomeados da seção 9.2 de `estrutura-e-copy.md` no Vercel Web Analytics; UTM no lead; relatório de origem sai do CRM (US-41), não do painel |

### E2. Simulador

| ID | História | P | Sprint | Critérios de aceite |
|---|---|---|---|---|
| US-20 | Como Rafael, quero a biblioteca pura `src/lib/simulator` que lê `parametros-simulador.json` e passa todos os exemplos da spec | P1 | S1 | Um `it` por ID da seção 9 de `simulador-spec.md`; `aplicar_por_padrao` da LC 224 lido do JSON, nunca decidido no código (D1); módulo LIC-RS respeita `limite_por_faixa_status` (D2); arredondamento e formatação da seção 9.7; sem importar Next nem banco; JSON validado com Zod no build |
| US-21 | Como empresa ou pessoa física, quero simular quanto do meu imposto pode virar cultura e ver o resultado detalhado depois de me cadastrar | P1 | S1 (telas 1 a 3), S2 (telas 4 e 5) | Telas da seção 10; resultado resumido antes do cadastro e detalhado depois (seções 5.1 e 5.2); `simulations` persistida com token e `/simulador/resultado/[token]`; lead em `patrocinadores`/`novo` com `irpj_faixa` ou `ir_devido_faixa` e `origem = simulador`; textos legais da seção 7 com `revisado_em`; estados da seção 8; interruptor da LC 224 visível com `lc224_notice`; `lic_rs_notice` com a marca [verificar] enquanto B6 não for respondida; CTA "Agendar diagnóstico" |
| US-22 | Como equipe, queremos o `ADR-002-defaults-simulador.md` registrando D1 e D2 | P1 | S1 | Repete as duas decisões com data e responsável, aponta para os campos do JSON e lista o que faria cada uma ser revista (seção 13.1); C1 registrada como comunicação pendente |
| US-23 | Como lead, quero receber o resultado por e-mail com o link do resultado detalhado | P2 | S2 | E-mail da seção 5.6 de `estrutura-e-copy.md` com link do token; PDF da simulação fica fora da versão 1 (seção 13.2, pergunta 4) |

### E3. CRM

| ID | História | P | Sprint | Critérios de aceite |
|---|---|---|---|---|
| US-30 | Como Daniela, quero entrar no CRM com e-mail e senha e redefinir a senha por e-mail | P1 | S2 | Usuários do seed (`SEED_USERS`) entram; cadastro público desligado; `/app/*` sem cookie redireciona para `/entrar`; toda Server Action do CRM chama `requireSession()`; redefinição por e-mail via Resend; papéis `owner` e `operator` gravados (sem diferença de permissão na Fase 1) |
| US-31 | Como Daniela, quero a tela "Hoje" com o que vence, o que é novo e o que fazer a seguir | P1 | S2 | Leads `novo` sem contato; `next_action_at` vencidos em destaque; próximos 7 dias; botão "Abrir WhatsApp" com a mensagem do playbook por estágio; ordenação por `next_action_at`; `proposta-c-simplicidade.md`, seção 9.1 |
| US-32 | Como Daniela, quero a lista e o detalhe de leads com filtros por pipeline, estágio, temperatura e origem | P1 | S2 | Filtros e busca por nome, e-mail e empresa; DTOs sem expor `attributes` inteiro; score, temperatura, origem, consentimentos e atividades visíveis no detalhe; paginação |
| US-33 | Como Daniela, quero "Mover para" que exige os campos de cada estágio e calcula o próximo follow-up | P1 | S3 | Estágios, critérios e SLAs das seções 8.1 a 8.5 de `personas-e-funis.md`; campos obrigatórios por estágio (`modelo-de-dados.md`, seção 6); `lost_reason` obrigatório em `perdido`; `next_action_at` em dias úteis com a regra de novembro e dezembro (`sla.ts`); checagem de vínculo do art. 27 registrada antes de `termo`; `CHECK` no banco; testes de `moveLeadStage` |
| US-34 | Como Daniela, quero registrar atividades (ligação, reunião, e-mail, WhatsApp, visita, tarefa) e a reunião marcada | P1 | S3 | Tipos da seção 4.7 do modelo; atividade `reuniao` com canal, tipo (simulação 20 min, contador 30 min, PF 15 min) e data; `last_contact_at` e `next_action_at` atualizados; regra de `playbooks/README.md` ("Registro da reunião marcada") |
| US-35 | Como sócio, quero o score por segmento recalculado a cada alteração, com histórico | P2 | S3 | Tabelas da seção 5.2 e desqualificações da seção 5.1 de `personas-e-funis.md`; temperatura derivada (frio, morno, quente); histórico de score; testes em `scoring.ts` |
| US-36 | Como Daniela, quero o e-mail diário das 7h com pendências, SLAs vencidos e alertas | P1 | S3 | Cron do `vercel.json` com `CRON_SECRET`; conteúdo da seção 9.3 de `proposta-c-simplicidade.md`; alerta de "zero leads" em campanha ativa; limpeza de `form_attempts` e tokens |
| US-37 | Como sócio, quero exportar e importar CSV (planilha do playbook) | P1 (exportar), P2 (importar) | S3, S4 | Exportação de todas as tabelas de negócio do tenant; importação com as colunas da seção 9 de `linkedin.md`, deduplicação por e-mail e segmento, consentimento com origem e data por linha, relatório de erros por linha (`proposta-c-simplicidade.md`, seções 9.4 e 9.5) |
| US-38 | Como Daniela, quero organizações e contatos ligados aos leads | P2 | S4 | Entidades das seções 3.3 e 3.4 do modelo; lead vinculado a organização; `contador_id` em leads PJ; indicação de contador cria lead com `origem = indicacao_contador` |
| US-39 | Como Daniela, quero a carteira de projetos com saldo a captar, prazo e rubrica de captação, com alertas | P1 | S3 | Campos obrigatórios em `autorizado` (seção 8.4 de personas); `saldo_a_captar` calculado; `publicavel` com data e quem autorizou; alerta no e-mail diário a 6 meses do fim do prazo e abaixo de 10% captado; primeiro registro real depende de A1 |
| US-40 | Como Daniela, quero registrar aportes com recibo e a comissão devida dentro da rubrica | P1 | S4 | `assertCommissionWithinLimits`: até 10% do projeto, teto R$ 150 mil, proporcional ao captado, devida só após depósito confirmado (IN MinC 29/2026, art. 19, via `leis-de-incentivo.md`, seção 2.8); `numero_recibo`, `data_recibo`, `data_envio_contador`; saldo do projeto atualizado; valor por `contador_id` para a métrica de parceiros; depende de B1 para o percentual praticado |
| US-41 | Como sócio, quero o relatório de sexta-feira dentro do CRM | P2 | S4 | KPIs da seção 10 de `personas-e-funis.md` com os mesmos nomes: leads por origem e segmento, taxa de qualificação, reuniões, taxa diagnóstico para proposta, termos, SLA vencidos, consentimento; período selecionável; exportável em CSV |
| US-42 | Como sistema, quero processar bounce e descadastro do Resend | P2 | S4 | Webhook assinado; `emailStatus` atualizado; lead descadastrado não recebe campanha |
| US-43 | Como sócio, quero que a compra da mentoria mova o lead para `inscrito` e depois `aluno` | P3 | S10 | Webhook da plataforma escolhida (E4) com validação de assinatura; idempotente; depende de E4 |

### E4. Prospecção e playbooks em operação

| ID | História | P | Sprint | Critérios de aceite |
|---|---|---|---|---|
| US-50 | Como equipe, queremos o checklist "Antes de começar" de `playbooks/README.md` concluído | P1 | S1 e S2 | Todos os itens marcados com responsável e data: guia revisado, carteira listada, perfil e página do LinkedIn, planilha-CRM, landing do guia, respostas rápidas de WhatsApp, WhatsApp Business, SPF/DKIM/DMARC, termo e acordo revisados por advogado [verificar], decisão sobre Sales Navigator |
| US-51 | Como Daniela, quero a edição revisada do guia aprovada até 16/10/2026 e publicada até 19/10 | P1 | S1 | Os dez itens da lista de alterações da seção 10.3 de `estrutura-e-copy.md` conferidos pelo sócio contra `mercado-e-posicionamento.md`, seção 4; aprovação por escrito da Daniela; rodapé com fontes e data; variante com espaço para logotipo do parceiro; 20 cópias impressas para a Mercopar; `guide_version = 2026-10` |
| US-52 | Como Daniela, quero o LinkedIn operando o calendário de 8 semanas (05/10 a 29/11) com a cadência de convites | P1 | S1 a S4 | Perfil e página otimizados (seções 2 e 3 de `linkedin.md`); 3 publicações por semana no perfil e 2 na página; 15 convites por dia com nota; métricas semanais da seção 8; registro em planilha ou CRM em até 24 h; depende de D3 |
| US-53 | Como Daniela, quero a Feira do Livro (até 18/10) e a Mercopar (20 a 23/10) convertidas em reuniões | P1 | S1 e S2 | Lista de 10 pessoas por evento preparada 2 a 5 dias antes; kit da seção 5 de `networking.md`; follow-up em 24 h; contatos no CRM ou na planilha com origem `evento`; 1,5 reunião por semana vinda de networking |
| US-54 | Como Prospekto, queremos a campanha 1 "Última chance de destinar" rodando de 19/10 a 23/12 | P1 | S2 a S6 | E-mail 1 PJ na semana de 19/10, e-mail 1 PF em 02/11, e-mail 4 PJ em 23/11 (`campanhas.md`, seções 3.2 a 3.4); WhatsApp só com opt-in; anúncios de teste por 14 dias com relatório semanal de custo por lead qualificado e pausa do que não gera lead em 7 dias (depende de D6); todas as peças com "até 4% (3,6% com a LC 224/2025)" e a ressalva do contador; base de envio só com consentimento (D4) |
| US-55 | Como Prospekto, queremos o programa de parceria com contadores em operação | P1 | S2 a S11 | Webinar mensal na última quarta (28/10, 25/11, janeiro e fevereiro); 2 visitas a escritórios novos por mês; diagnóstico de carteira entregue (seção 4.1 de `parceiros-contadores.md`); kit da seção 5; acordo de co-marketing sem comissão até parecer (seção 3); registro no CRM por `contador_id`; depende de B2 |
| US-56 | Como Daniela, quero fechar dezembro sem perder prazo | P1 | S5 e S6 | Prazo interno de termo em 23/12; follow-up diário em `aporte` a partir de 10/12; depósitos até 30/12 [verificar último dia útil bancário na Febraban e no Banco do Brasil]; 100% dos recibos emitidos no SLA; balanço do ano com os KPIs da seção 8 |
| US-57 | Como Prospekto, queremos a campanha 2 "Planejamento tributário" de janeiro a março de 2027 | P1 | S8 a S12 | Webinar de planejamento; e-mail de renovação em janeiro (seção 4.3 de `campanhas.md`); sequência para contadores (seção 4.2); Café com Estudos proposto ao SESCON Serra; `/contadores/planejamento` no ar; campanha PF de março (DIRPF abre em 23/03) |
| US-58 | Como equipe, queremos substituir as metas-hipótese pelas médias reais após 4 semanas | P1 | S3 (01/11) | Métricas das 4 primeiras semanas consolidadas; metas de `playbooks/README.md` e da seção 10 de `personas-e-funis.md` reescritas com as médias; mudanças registradas nos próprios documentos |

### E5. Produto digital e validação

| ID | História | P | Sprint | Critérios de aceite |
|---|---|---|---|---|
| US-60 | Como Daniela, quero a lista de espera aberta com o site e crescendo com o conteúdo | P1 | S2 a S7 | US-14 no ar; e-mail de boas-vindas; 50 cadastros até 11/01/2027 (`mentoria-e-curso.md`, seção 6, semana 0) |
| US-61 | Como sócio, quero conteúdo de carreira e a aula aberta gravada nas semanas 1 e 2 (11 a 24/01/2027) | P2 | S8 | 2 publicações por semana sobre carreira de elaborador e captador; aula aberta "Como se escreve um projeto na Lei Rouanet" como lead magnet; +40 cadastros por semana; convite ao webinar; depende de E1 e E2 |
| US-62 | Como Daniela, quero o webinar de 60 minutos (25 a 31/01) com a pré-venda aberta ao vivo | P2 | S9 | 60 inscritos; 40% de presença; gravação; participantes marcados no CRM; 3 pré-vendas ao vivo |
| US-63 | Como sócio, quero a pesquisa da lista (01 a 07/02) e a segmentação | P2 | S9 | Pesquisa com objetivo, experiência, projeto em mãos, faixa de preço (três faixas, Van Westendorp simplificado), formato e horário; 30% de resposta; 10 entrevistas de 15 minutos; relatório segmentado |
| US-64 | Como Prospekto, queremos a pré-venda (08 a 21/02) com página, checkout, sequência de 5 mensagens e garantia | P2 | S10 | 10 vagas de fundador a R$ 1.497 e vagas 11 a 20 a R$ 1.997 (hipóteses, seção 5.2); plataforma escolhida (E4); garantia de devolução se a turma não abrir; 7 vendas na semana 5 e 10 acumuladas na semana 6; compradores em `alunos`/`inscrito` (US-43) |
| US-65 | Como Daniela, quero a decisão de seguir ou parar registrada em 21/02/2027 e, se aprovada, a turma em 09/03/2027 | P2 | S10 a S12 | Critérios da seção 6.1 aplicados (seção 9 deste roadmap, M8); turma marcada; Zoom, área de membros, suporte e certificado conforme a seção 7; depende de E2 e E3 |

## 6. Dependências

| Item bloqueado | Depende de | Consequência se a dependência atrasar |
|---|---|---|
| US-03 (domínio, e-mail, Pro) e M2 | F1 (DNS e e-mail), F2 (Vercel Pro) | Publicar no subdomínio `*.vercel.app` do plano Pro e apontar o domínio depois; envio de e-mail por `onboarding@resend.dev` só em teste, ou SMTP do provedor atual via Nodemailer (`proposta-c-simplicidade.md`, seção 4.6); a campanha 1 não dispara e-mail sem domínio autenticado |
| US-11 (download do guia), US-51, kit da Mercopar | A6 (aprovação da edição revisada), M1 | `/guia` fica em "em breve"; Mercopar sem guia impresso; LinkedIn semanas 3 e 4 sem CTA de guia |
| US-15 (`/projetos`), US-39 (primeiro projeto real), e-mail 3 da campanha 1, one-pages | A1, A2 (carteira e autorização da Ocotea) | Carteira pública não estreia; campanha 1 sem projeto nomeado (só "projetos da região") |
| US-30 (seed de usuários) | D1 (quem opera) | Seed só com a Daniela como `owner` |
| US-40 (comissão) | B1 (como a Prospekto cobra) | Comissão registrada com o percentual do contrato de cada projeto, limitado por lei; relatório de receita de captação só depois |
| US-55 e página `/contadores` | B2 (modelo de parceria, advogado) | Programa segue como co-marketing sem remuneração; site não cita ganho do escritório |
| US-12 (`/privacidade`), `consents.ip_hash` | B3 (advogado, encarregado) | Política publicada com cláusulas marcadas [verificar]; `ip_hash` gravado até parecer contrário (G5) |
| US-21 (módulo LIC-RS), campanha 6 | B6 (Sedac) | Módulo publicado com `lic_rs_notice` e marca [verificar] (decisão D2) |
| US-54 (campanha 1) | US-10, US-11, US-21, US-03, D4 (base com consentimento), D6 (verba) | Sem base com consentimento, a campanha 1 sai só por LinkedIn, eventos e site |
| US-52 (LinkedIn) | D3 (conta, autoria das mensagens) | Cadência começa com a conta atual; Sales Navigator só no segundo mês |
| US-43, US-64 (checkout e webhook) | E4 (plataforma, tributação) | Pré-venda por link externo sem webhook; alunos registrados à mão no CRM |
| US-65 (turma) | E1, E2, E3 (formato, agenda, casos reais) | Turma adiada em 4 semanas (regra da seção 6.1 da mentoria) |
| Fase 2 | Sinais 1, 2 e 4 da seção 9.4 de `mercado-e-posicionamento.md`; F5 | Segundo ciclo da Fase 1 em vez de hub |

Dependências entre histórias de código: US-01 precede tudo; US-20 precede US-21; US-10 e US-21 precedem US-02; US-30 precede US-31 a US-41; US-33 e US-34 precedem US-36; US-39 precede US-40 e US-15; US-14 precede US-60.

## 7. Definição de pronto

Para histórias de código (E0 a E3):

1. `npm run check` verde (lint, typecheck, format:check, test, build), igual à CI.
2. Teste automatizado para a regra de negócio tocada: Server Action ou repositório contra PGlite em memória; simulador com os IDs da spec; `tests/isolation.test.ts` continua verde.
3. Toda consulta passa por `src/lib/repos/` com `ctx` (regra de lint); nenhuma Server Action do CRM sem `requireSession()`.
4. UI, mensagens de erro e e-mails em português do Brasil; identificadores em inglês; nenhum dado pessoal em log.
5. Nenhum número legal ou tributário escrito no código: percentuais vêm de `parametros-simulador.json` ou de `src/lib/domain/` com a seção de `leis-de-incentivo.md` citada em comentário.
6. Preview no Vercel revisado pelo sócio (fluxo público) ou pela Daniela (tela do CRM) antes do merge em `main`.
7. Documento de origem atualizado quando a implementação divergir da spec (ou ADR novo), nunca o contrário em silêncio.

Para histórias de operação (E4 e E5):

1. Todo contato registrado no CRM (ou na planilha provisória) em até 24 horas, com origem, persona, próxima ação e data.
2. Consentimento registrado antes de qualquer e-mail ou WhatsApp; opt-out em toda mensagem.
3. Peça publicada só com os números de `leis-de-incentivo.md` e a ressalva "o cálculo final do limite é do contador".
4. Métrica da história medida na sexta-feira seguinte e comparada com a meta.

## 8. Métricas por sprint

Totais vêm de `personas-e-funis.md` (seção 10), `playbooks/README.md` ("Metas do primeiro ciclo"), `campanhas.md` (seção 3.6) e `mentoria-e-curso.md` (seções 6 e 9). A divisão por sprint é hipótese deste roadmap para dar ritmo; depois de M4 (01/11), as metas são reescritas com as médias reais. Valores acumulados desde 05/10/2026, salvo indicação.

| Sprint | Leads com consentimento (acum.) | Simulações PJ / PF (acum.) | Reuniões ou simulações por semana | Termos assinados (acum.) | Escritórios contábeis | Lista de espera (acum.) | SLA de follow-up vencido | Marco técnico |
|---|---|---|---|---|---|---|---|---|
| S1 | 10 (planilha; eventos e LinkedIn) | 0 (site em preview) | 2 | 0 | 2 visitados | 0 | não medido | `npm run check` verde; preview com lead de teste |
| S2 | 40 | 8 / 4 | 3 (LinkedIn) + 1,5 (networking) | 1 | 4 em `contato`; webinar 28/10 | 10 | não medido | Site público no domínio; login e "Hoje" |
| S3 | 80 | 16 / 10 | 4,5 | 3 | 6 em contato, 2 em `parceria` | 20 | abaixo de 10% (primeira medição) | "Mover para", atividades, e-mail diário, CSV |
| S4 | 120 | 24 / 16 | 4,5 | 6 | 3 `ativo` | 30 | abaixo de 10% | Aportes e comissão; relatório de sexta |
| S5 | 140 | 30 / 20 | 4,5 | 9 | 4 `ativo` | 40 | abaixo de 10% | Congelamento em 11/12 |
| S6 | 150 (meta da campanha 1) | 30 / 20 | fechamento | 10 (meta da campanha 1); 12 aportes PJ e 20 PF confirmados até 30/12 (hipótese da seção 10 de personas); R$ 600 mil captados em out a dez (hipótese) | 4 `ativo` | 50 (até 11/01) | abaixo de 10% | 100% dos recibos no SLA |
| S7 | 160 | | pausa comercial | renovação em preparo | 4 `ativo` | 50 | | `npm outdated`; backup restaurado em teste |
| S8 | 190 | | 3 | | 5 em contato para o programa | 150 até 24/01 (critério M7) | abaixo de 10% | `/contadores/planejamento` |
| S9 | 220 | | 3 | | webinar de planejamento | 200 até a pré-venda; 30% de resposta na pesquisa; 60 inscritos e 40% de presença no webinar | abaixo de 10% | Pesquisa no CRM |
| S10 | 250 | | 3 | | | 7 vendas (semana 5) e 10 acumuladas (semana 6) | abaixo de 10% | Webhook da plataforma |
| S11 | 280 | | 3 | mini-campanha trimestral | 5 `ativo` até março (meta do primeiro ciclo) | turma marcada | abaixo de 10% | |
| S12 | 40 leads por mês em ritmo (meta de março de 2027); 50% PJ e CONT | | 3 | renovação de 60% dos patrocinadores de 2026 (meta anual) | 5 `ativo`; 30% do captado por indicação (meta 2027) | turma iniciada em 09/03 | abaixo de 10% | Balanço da Fase 1 |

Métricas permanentes, medidas toda sexta-feira a partir de S2: taxa de aceite de convites no LinkedIn acima de 30%; 50% das simulações PJ com o contador presente; custo por lead qualificado em anúncios abaixo de R$ 60 [hipótese]; 100% dos leads de site com `consent_lgpd` e `consent_version`; concentração do maior patrocinador abaixo de 20% do captado no ano [verificar com a Daniela, B8].

## 9. Marcos de decisão

| Marco | Data | Decisão | Critério | Quem decide | Se não atingido |
|---|---|---|---|---|---|
| M1 | 16/10/2026 | Guia revisado aprovado para impressão e publicação | Dez itens da seção 10.3 de `estrutura-e-copy.md` conferidos; aprovação por escrito | Daniela | `/guia` continua em "em breve"; Mercopar sem guia impresso; nova data em até uma semana |
| M2 | 19/10/2026 | Primeiro formulário público no ar e upgrade para o Vercel Pro | `/empresas` e `/simulador` publicados; e-mail de lead chegando; F1 e F2 respondidas | Sócio e Rafael | Publicar em `*.vercel.app` no Pro; apontar domínio quando o DNS estiver acessível |
| M3 | 01/11/2026 (fim de S2) | O CRM substitui a planilha | A Daniela registra um lead real e um follow-up sem ajuda; "Hoje" e lista de leads em uso | Daniela | Simplificar telas antes de construir organizações, projetos e aportes; planilha continua até passar |
| M4 | 01/11/2026 | Recalibrar metas com 4 semanas de dados | Métricas de LinkedIn, networking, campanhas e parceiros consolidadas (US-58) | Sócio e Daniela | Manter hipóteses por mais 2 semanas e registrar o motivo |
| M5 | 23/12 e 30/12/2026 | Fechamento do ano-calendário | Termos assinados até 23/12; depósitos até o último dia útil bancário [verificar 30/12] | Daniela | O que não depositou vai para `renovacao` com contato em janeiro |
| M6 | Fim de dezembro de 2026 | Balanço da campanha 1 e intensidade da campanha 2 | 150 leads com consentimento, 10 termos, 30 simulações PJ e 20 PF; decisão sobre Sales Navigator e verba de anúncios de 2027 | Daniela e sócio | Campanha 2 com foco em contadores e renovação; revisar canais que não geraram reunião |
| M7 | 24/01/2027 | Seguir com a pré-venda da mentoria | Lista de espera com 150 ou mais (`mentoria-e-curso.md`, seção 6.1) | Daniela e sócio | 80 a 149: adiar a pré-venda em 4 semanas e reforçar conteúdo; abaixo de 80: voltar a conteúdo por 3 meses |
| M8 | 21/02/2027 | Seguir ou parar: abrir a coorte em 09/03/2027 | 10 ou mais vendas acumuladas; pesquisa com 30% de resposta e metade disposta a pagar acima de R$ 1.000 | Daniela | 6 a 9 vendas: piloto que cobre o custo direto, decisão da Daniela; abaixo de 6: turma não abre e o dinheiro é devolvido |
| M9 | 21/03/2027 (fim da Fase 1) | Investir no hub (Fase 2) ou rodar o segundo ciclo da Fase 1 | Sinais da seção 9.4 de `mercado-e-posicionamento.md`: 5 escritórios ativos e 30% dos patrocínios por indicação; pedidos de captação de proponentes de fora (10 qualificados em 12 meses, medido parcialmente); lista de 200 e turma vendida; CRM operado sem o Rafael com conversão medida; interesse espontâneo de consultores | Daniela, sócio e Rafael | Sem os sinais 1, 2 e 4: segundo ciclo (prospecção de abril a agosto, fechamento de setembro a dezembro de 2027) com a arquitetura multi-tenant mantida como requisito, sem produto |

## 10. Primeiras duas semanas (05/10 a 18/10/2026)

Sprint 1 concreto. Rafael constrói; o sócio opera e prepara; a Daniela revisa, responde e aparece. A rotina semanal fixa (convites, posts, cafés) de `playbooks/README.md` roda por baixo desta tabela e não se repete aqui.

| Dia | Rafael (desenvolvimento) | Sócio (operação) | Daniela (rosto e voz) | Pronto quando |
|---|---|---|---|---|
| Seg 05/10 | Scaffold, passos 2.1 a 2.6 de `scaffold.md` (create-next-app, dependências fixas, shadcn) | Planilha-CRM com as colunas de `linkedin.md`, seção 9; abrir as perguntas A1, A6, F1, F2, D1 com a Daniela | Responder F1 (DNS e e-mail) e F2 (Vercel Pro); listar a carteira (A1) | `package.json` com os scripts da seção 3; respostas de F1 e F2 registradas em `visao.md` |
| Ter 06/10 | Arquivos de base da seção 5 (`env.ts`, `db`, `auth.ts`, `proxy.ts`, `site.ts`, Vitest); `auth generate`; primeira migração; seed | Perfil da Daniela e página da Prospekto no LinkedIn (seções 2 e 3 de `linkedin.md`); lista de prospects da semana | Post de terça (semana 1 do calendário); aprovar headline e "Sobre" do perfil | `npm run db:migrate && npm run db:seed` funcionam; perfil publicado |
| Qua 07/10 | Esquema Drizzle completo de `modelo-de-dados.md`; `tests/isolation.test.ts`; `npm run check` verde | Começar a diagramação do guia revisado com a lista de 10 itens da seção 10.3 de `estrutura-e-copy.md`; abrir conta WhatsApp Business | Revisar o texto do guia, item a item, contra `mercado-e-posicionamento.md`, seção 4 | Critérios 1, 3, 4 e 6 da seção 7 do scaffold atendidos |
| Qui 08/10 | `src/lib/simulator`: `params.ts` com Zod sobre o JSON, `simulate.ts`, testes T-SCH e T-PJ da seção 9 da spec | Respostas rápidas de WhatsApp (dois horários; simulação de 20 min e conversa de 30 min); lista de 10 pessoas da Feira do Livro | Post de quinta (carrossel "Rouanet em 6 passos"); 2 simulações ou reuniões | Testes de PJ verdes; respostas rápidas salvas |
| Sex 09/10 | Testes T-PF, T-LIC, T-FMT; `texts.ts` com `revisado_em`; `ADR-002-defaults-simulador.md` (US-22) | Métricas da semana 1 (aceite de convites, respostas, contatos); planejar semana 2 | Café com pessoa-chave; revisão de 20 min das métricas com o sócio | Todos os IDs da seção 9 da spec cobertos; ADR-002 commitável |
| Sáb 10/10 e dom 11/10 | Folga | Folga | Post pessoal agendado | |
| Seg 12/10 | Página `/simulador`, telas 1 a 3 (gate de captura), `simulations` com token, `createLead` para `origem = simulador` | Feira do Livro de Caxias: abordagens e follow-ups em 24 h; disparo nenhum ainda (base sem consentimento) | 15 convites com nota; responder comentários | Simulação de ponta a ponta no ambiente local cria lead e simulação |
| Ter 13/10 | `/empresas` com formulário de diagnóstico (US-10): consentimento, anti-spam, `form_attempts`, e-mail de aviso, `/obrigado/diagnostico` | Kit da Mercopar: one-page da Prospekto, cartões, QR do simulador com UTM (`networking.md`, seção 5) | Post de terça (mitos); visita a escritório contábil | Lead de `/empresas` no banco com `consents` e `form_attempts` registrados |
| Qua 14/10 | `/guia` em modo "em breve" (US-11), `/contato`, `/privacidade` (estrutura 5.7, cláusulas [verificar]), `/obrigado/[tipo]`, botão flutuante de WhatsApp | Revisão final do guia diagramado; cotação de 20 cópias impressas (D6) | Reunião-almoço da CIC ou evento do mês; aprovar política de privacidade para publicação com marcas [verificar] | Páginas renderizam com a copy de `estrutura-e-copy.md`; `wa.me` por página |
| Qui 15/10 | Home (US-12), `layout` do `(site)`, SEO da seção 6.2, `error.tsx` em português; deploy em preview no Vercel Hobby com Neon Free e Resend em teste (US-02) | Testar o preview como visitante: formulário, e-mail, obrigado; registrar bugs | Post de quinta (vídeo "Só grande empresa usa a Rouanet?"); 2 simulações | Preview no ar; lead de teste chega por e-mail; `scripts/smoke.ts` verde |
| Sex 16/10 | Correções do teste do sócio; `ci.yml` (US-04) com majors das actions confirmadas; preparar US-03 (domínio, Resend) para segunda | Guia revisado aprovado e enviado para impressão; `guide_version = 2026-10` | **M1**: aprovar por escrito a edição revisada; métricas da semana 2 | CI verde; guia aprovado (M1) |
| Sáb 17/10 e dom 18/10 | Folga; se F1 e F2 estiverem respondidas, deixar DNS e Vercel Pro prontos para segunda | Feira do Livro termina em 18/10: follow-ups pendentes | Post pessoal agendado | Lista de follow-ups da Feira zerada até segunda |
| Seg 19/10 (início de S2) | **M2**: publicar `/empresas`, `/simulador`, `/guia`, `/contato`, `/privacidade` no domínio; upgrade para o Pro; Resend com domínio verificado (ou fallback da seção 6) | E-mail 1 PJ da campanha 1 sai nesta semana só para contatos com consentimento; impressão do guia retirada | Preparar a Mercopar (20 a 23/10): pitch de 30 segundos e de 2 minutos (`networking.md`, seção 4) | Site público no ar; primeiro lead real registrado |

## 11. Fase 2 em alto nível

A Fase 1 não constrói nada disto; ela só não fecha a porta (ADR-001, seção 7). A Fase 2 começa depois de M9, com os sinais da seção 9.4 de `mercado-e-posicionamento.md`, e segue a Proposta B como plano, não como entrega.

| Etapa | O que entra | Pré-requisito | Fonte |
|---|---|---|---|
| 1. Isolamento forte | RLS com papel `app_user` e `set_config('app.tenant_id')` por transação; `embedded-postgres` local para testar políticas; plugin `organization` do Better Auth (membros, convites, papéis `owner`, `admin`, `operator`, `viewer`); `tenants.settings` substituindo `src/config/site.ts` | Segundo tenant real decidido (fomento.ai? pergunta F5) | ADR-001, seção 7; `proposta-b-hub.md`, seções 4.4 e 4.5 |
| 2. Site por tenant | Resolução por `Host` em `proxy.ts`; `tenant_domains` com API do Vercel; wildcard no domínio do hub (subzona `hub.prospekto.com.br` ou domínio novo, F5); onboarding de tenant com seed por tenant e status `trial`, `active`, `suspended` | Etapa 1 | `proposta-b-hub.md`, seções 4.6 e 7 |
| 3. Operação em escala | Inngest (ou `outbox` + cron) com `tenantId` em todo evento; Vercel Blob ou R2 com prefixo por tenant e tabela `files`; Sentry com tag `tenant_id`; `/admin/status`; pipelines e estágios editáveis por tenant | Etapas 1 e 2 | ADR-001, seção 7 |
| 4. Cobrança e contrato | `plans` e `subscriptions`; Stripe ou Asaas [verificar, F5]; contrato de operador LGPD entre hub e tenants; exclusão e anonimização por titular | Advogado (B3) | ADR-001, seção 7; `proposta-b-hub.md`, seção 15 |
| 5. Produto e conteúdo | Rede de captadores credenciados e proponentes vindos da coorte (contrato tripartite a validar, B3); curso gravado montado a partir das gravações das coortes 1 e 2; comunidade de alumni com atualização normativa mensal; WhatsApp pela Cloud API por tenant | M8 aprovado; duas coortes | `mentoria-e-curso.md`, seções 3 e 8 |

Modelo de receita da Fase 2: assinatura ou licença (`visao.md`, "Modelo de receita"). Comparação com Prosas, Incentiv.me e Portal do Incentivo em `mercado-e-posicionamento.md`, seção 9.3.

## 12. Riscos do calendário

| Risco | Efeito | Mitigação |
|---|---|---|
| F1 e F2 sem resposta até 16/10 | M2 atrasa; campanha 1 sem e-mail do domínio | Publicar no `*.vercel.app` do Pro; e-mail só por WhatsApp e LinkedIn na primeira semana; cobrar a resposta no dia 05/10 |
| Guia não aprovado até 16/10 | Mercopar sem lead magnet impresso; `/guia` em "em breve" | Kit com QR do simulador e one-page; guia publicado na semana seguinte |
| Carteira (A1) não listada | `/projetos` vazio; campanha 1 sem projeto nomeado | Campanha fala de "projetos da região" até a lista existir; A Tacada Perfeita entra se a Ocotea autorizar (A2) |
| A Daniela não absorve a rotina de 10 a 12 h semanais (D1) | SLAs vencem; metas caem | Sócio assume cadência e registro; Daniela só reuniões e posts; revisão em M4 |
| Validação da mentoria concorre com a campanha 1 se antecipada (E2) | As duas perdem | Manter janeiro e fevereiro de 2027 como no plano; lista de espera passiva até lá |
| Drizzle 1.0 ou Better Auth mudam API durante a Fase 1 | Retrabalho | Versões fixas; `npm outdated` mensal em S7; major só com nota de versão lida (ADR-001, seção 6) |
| Neon Free pausa após 5 minutos sem uso | Primeiro formulário do dia lento | Páginas públicas estáticas; estado "enviando"; Launch quando o volume exigir |

## 13. Fontes

| Assunto | Documento |
|---|---|
| Fases, receita, decisões provisórias | `docs/visao.md` |
| Ordem de construção, critério de pronto do scaffold, deploy | `docs/arquitetura/scaffold.md`, seções 7, 8 e 10; `docs/arquitetura/ADR-001-stack.md`, seções 4, 6 e 7 |
| Calendários alternativos que este roadmap consolida | `docs/arquitetura/propostas/proposta-a-velocidade.md`, seção 10; `proposta-c-simplicidade.md`, seção 10 |
| Pipelines, estágios, SLAs, KPIs | `docs/estrategia/personas-e-funis.md`, seções 4, 5, 8, 9 e 10 |
| Sinais de Fase 2 | `docs/estrategia/mercado-e-posicionamento.md`, seção 9.4 |
| Rotina, 90 dias, metas do primeiro ciclo, checklist | `docs/playbooks/README.md` |
| Calendário de conteúdo (05/10 a 29/11/2026) | `docs/playbooks/linkedin.md`, seção 4 |
| Datas da campanha 1 e 2, métricas, último dia útil bancário | `docs/playbooks/campanhas.md`, seções 2, 3 e 4 |
| Eventos (Mercopar 20 a 23/10, Feira do Livro, CIC) | `docs/playbooks/networking.md`, seções 2 e 4 |
| Prazo do guia revisado (16/10 e 19/10) | `docs/site/estrutura-e-copy.md`, seção 10.3 |
| Decisões D1 e D2, testes do simulador | `docs/site/simulador-spec.md`, seções 9 e 13 |
| Plano de validação da mentoria, critérios de seguir ou parar, datas de 2027 | `docs/produto/mentoria-e-curso.md`, seções 5, 6 e 9 |
| Limite de captação (10%, R$ 150 mil, proporcional) | IN MinC 29/2026, art. 19, via `docs/dominio/leis-de-incentivo.md`, seção 2.8 |
| LC 224/2025 (3,6%) | `docs/dominio/leis-de-incentivo.md`, seção 2.5 |
