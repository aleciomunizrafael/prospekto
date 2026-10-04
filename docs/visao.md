# Visão e modelo de negócio: Prospekto

> Documento-âncora do projeto. Tudo o que está em `docs/` deriva daqui. Fonte: áudios de briefing de 03/10/2026 e materiais da Prospekto (ver `docs/fontes/`). Revisado em 03/10/2026 após a verificação dos números em `docs/dominio/` e `docs/estrategia/` (ver "Nota de revisão").

## Quem

**Prospekto Consultoria & Projetos**, empresa de Daniela Sandrin Copat, na Serra Gaúcha (RS). Atua em projetos culturais e economia criativa:

- elabora, inscreve e gerencia projetos culturais em leis de incentivo (federal: Lei Rouanet / Pronac via SALIC; audiovisual: Lei do Audiovisual art. 1º-A e FSA/BRDE; estadual: leis do RS);
- capta patrocínio para esses projetos junto a empresas tributadas pelo lucro real (dedução de até 4% do IRPJ devido, teto conjunto com o audiovisual; Lei 9.532/1997, art. 6º, II) e pessoas físicas na declaração completa (até 6% do imposto devido, 7% apenas quando o conjunto inclui esporte; Lei 9.532/1997, art. 22, e Lei 11.438/2006, art. 1º, § 1º, II; detalhes em `docs/dominio/leis-de-incentivo.md`, seção 2.3);
- presta consultoria em cultura e economia criativa para empresas e municípios;
- tem material educacional pronto: guia "Contabilizando Cultura", cursos, conteúdo.

Rafael (desenvolvedor) e seu sócio (filho da Daniela) vão construir a estrutura digital e comercial. Repositório: `aleciomunizrafael/prospekto`.

## O problema

- Cerca de 220 mil a 230 mil empresas estão no lucro real, segundo fontes secundárias que citam a Receita Federal [verificar contagem direta nos Dados Abertos CNPJ]; com 6.252 CNPJs patrocinando pela Lei Rouanet em 2025, a adesão fica abaixo de 3%. Entre pessoas físicas, 0,03% (13.580 incentivadoras sobre 43,3 milhões de declarações). Fontes e cálculo em `docs/estrategia/mercado-e-posicionamento.md`, seção 4.
- O dinheiro já vai ser pago como imposto; o patrocínio só muda o destino. O gargalo não é dinheiro, é informação, confiança e processo.
- Para os projetos (proponentes), o gargalo é captação: um projeto costuma precisar de vários patrocinadores (aportes de R$ 20 mil a R$ 1 milhão).

## Nota de revisão (03/10/2026)

Os números abaixo apareciam no briefing e no guia "Contabilizando Cultura" e foram checados nos documentos derivados. Esta tabela registra o que vale a partir de agora; nenhum documento, página de site ou material deve usar a versão antiga.

| Afirmação original | Versão revisada | Onde está a verificação |
|---|---|---|
| PF deduz 6% do IR devido, "até 8% em casos específicos" (artes cênicas e música) | PF deduz até 6% do imposto devido, limite conjunto com FIA, Fundo do Idoso e audiovisual; 7% apenas quando o conjunto inclui esporte. Não existe teto de 8% para cultura: os 2 pontos extras são do Pronon e do Pronas/PCD (saúde), e para PF valeram só até o ano-calendário 2025. O que é específico de artes cênicas e música é a dedução integral do art. 18 da Lei 8.313, que não altera o teto | `docs/dominio/leis-de-incentivo.md`, seção 2.3 e nota após a tabela; `docs/estrategia/mercado-e-posicionamento.md`, seção 4 |
| "Mais de 545 mil empresas no lucro real" | Entre cerca de 220 mil e 230 mil empresas no lucro real [verificar contagem direta nos Dados Abertos CNPJ da Receita Federal]. O 545 mil não foi encontrado em nenhuma fonte; pode ter vindo do total de entregas de ECF, que soma outros regimes | `docs/estrategia/mercado-e-posicionamento.md`, seção 4 |
| "Cerca de 5% usam a Lei Rouanet" | Menos de 3% (6.252 CNPJs patrocinadores em 2025 sobre 220 mil a 230 mil empresas), o que fortalece o argumento | `docs/estrategia/mercado-e-posicionamento.md`, seção 4 |
| "0,03% das pessoas físicas" | Confirmado: 13.580 PF incentivadoras em 2025 sobre 43.344.108 declarações DIRPF 2025 (0,031%) | `docs/estrategia/mercado-e-posicionamento.md`, seção 4 |
| "Até 4% do IRPJ devido" | Correto, com ressalva: o teto de 4% é conjunto com o audiovisual e com o esporte de inclusão social (SC Cosit 4/2026), e o adicional de 10% do IRPJ não entra na base | `docs/dominio/leis-de-incentivo.md`, seção 2.3 |

Consequência prática: o guia e a apresentação "Contabilizando Cultura" só voltam a ser distribuídos depois de corrigidos (ver `docs/site/estrutura-e-copy.md`, página `/guia`).

## O que vamos construir

### Fase 1: estrutura de captação para a Prospekto

1. **Site institucional + captura de leads**: páginas para empresas, contadores, pessoas físicas, municípios e proponentes; lead magnets (guia gratuito, simulador de dedução, diagnóstico); formulários com LGPD.
2. **CRM de captação**: pipeline por segmento (PJ, PF, escritórios contábeis, municípios, proponentes), carteira de projetos (status no SALIC, valor aprovado, saldo a captar), patrocínios e aportes, atividades e follow-ups.
3. **Máquina de prospecção**: playbooks de LinkedIn, networking (Serra Gaúcha), campanhas sazonais (fechamento do ano-calendário) e programa de parceria com escritórios contábeis.
4. **Produto digital**: mentoria/curso da Daniela para quem quer aprender a escrever e captar projetos culturais; validação por lista de espera no site.

### Fase 2: hub de captação (produto vendável)

Empacotar a estrutura (site + CRM + playbooks + conteúdo) como modelo/plataforma para outros consultores, produtoras e proponentes, com a Daniela como autoridade e rosto da marca. Multi-tenant / white-label é um requisito de arquitetura desde já, mas não da Fase 1.

## Modelo de receita

| Fonte | Como | Observação |
|---|---|---|
| Comissão de captação | percentual sobre cada patrocínio trazido | limite legal: até 10% do valor do projeto, teto de R$ 150 mil, paga proporcionalmente ao captado (IN MinC 29/2026, art. 19; ver `docs/dominio/leis-de-incentivo.md`) |
| Elaboração e gestão de projetos | honorários por projeto | já existe hoje |
| Consultoria a empresas e municípios | honorários | já existe hoje |
| Produto digital | mentoria / curso | novo; validar demanda antes de produzir |
| Hub de captação (Fase 2) | assinatura / licença | futuro |

## Princípios

- Linguagem e UI em português do Brasil; código em inglês.
- Nada de dado inventado: contatos e números só os que estão nas fontes ou verificados com referência.
- Toda afirmação legal/tributária carrega a fonte e a data de verificação.
- Fase 1 roda com infraestrutura mínima e custo próximo de zero.

## Perguntas em aberto (para Rafael e sócio)

As decisões provisórias abaixo valem até que Rafael e o sócio registrem outra coisa aqui. Os documentos derivados seguem a decisão provisória.

| # | Pergunta | Decisão provisória (03/10/2026) | Status |
|---|---|---|---|
| 1 | fomento.ai é marca-irmã, parceiro de canal ou só referência de posicionamento? | Só referência: de estrutura editorial e tom para o site (`docs/site/estrutura-e-copy.md`, seção 7.1) e de modelo de parceria com contadores e consultorias (`docs/estrategia/personas-e-funis.md`, fonte 7). Nenhum playbook, página ou material cita a fomento.ai como parceira, marca-irmã ou canal. A fonte é a apresentação institucional em `docs/fontes/materiais/referencia-fomento-ai-apresentacao.txt`; a relação comercial, se existir, não consta das fontes [verificar com o sócio] | Provisória |
| 2 | O "CRM que a gente fez": qual stack? Vale reaproveitar algo? | O código antigo não é reaproveitado. O CRM da Fase 1 nasce na stack decidida em `docs/arquitetura/ADR-001-stack.md`. Do CRM antigo aproveitam-se apenas as lições (telas que a equipe usou de verdade, campos que ninguém preencheu) e, se existirem, estágios e campos que a Daniela já usa, que entram no seed (`propostas/proposta-c-simplicidade.md`, seção 3; `propostas/proposta-b-hub.md`, seção 15, item 6). Stack e estado do CRM antigo: [verificar com o sócio] | Provisória |
| 3 | Quais projetos estão em carteira hoje (nome, lei, status, valor aprovado, saldo a captar)? | Nenhuma. Único exemplo documentado: "A Tacada Perfeita" (`docs/fontes/materiais/exemplo-projeto-a-tacada-perfeita-deck.txt`) | Aberta |
| 4 | Domínio `prospekto.com.br`: já existe site? Onde está hospedado o e-mail? | Nenhuma. O e-mail `projetos@prospekto.com.br` consta dos materiais, logo o domínio existe; hospedagem do site e do e-mail [verificar] | Aberta |
| 5 | Quem opera o CRM no dia a dia: só a Daniela, ou há equipe? | Premissa de arquitetura: a Daniela opera sozinha, sem suporte (ADR-001, seção 1) | Provisória |
