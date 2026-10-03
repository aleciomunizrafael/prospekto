# Visão e modelo de negócio — Prospekto

> Documento-âncora do projeto. Tudo o que está em `docs/` deriva daqui. Fonte: áudios de briefing de 03/10/2026 e materiais da Prospekto (ver `docs/fontes/`).

## Quem

**Prospekto Consultoria & Projetos** — empresa de Daniela Sandrin Copat, na Serra Gaúcha (RS). Atua em projetos culturais e economia criativa:

- elabora, inscreve e gerencia projetos culturais em leis de incentivo (federal: Lei Rouanet / Pronac via SALIC; audiovisual: Lei do Audiovisual art. 1º-A e FSA/BRDE; estadual: leis do RS);
- capta patrocínio para esses projetos junto a empresas tributadas pelo lucro real (dedução de até 4% do IRPJ devido) e pessoas físicas na declaração completa (6% do IR devido, até 8% em casos específicos — a confirmar em `docs/dominio/`);
- presta consultoria em cultura e economia criativa para empresas e municípios;
- tem material educacional pronto: guia "Contabilizando Cultura", cursos, conteúdo.

Rafael (desenvolvedor) e seu sócio (filho da Daniela) vão construir a estrutura digital e comercial. Repositório: `aleciomunizrafael/prospekto`.

## O problema

- Mais de 545 mil empresas no lucro real são elegíveis; cerca de 5% usam a Lei Rouanet. Entre pessoas físicas, 0,03%.
- O dinheiro já vai ser pago como imposto; o patrocínio só muda o destino. O gargalo não é dinheiro, é informação, confiança e processo.
- Para os projetos (proponentes), o gargalo é captação: um projeto costuma precisar de vários patrocinadores (aportes de R$ 20 mil a R$ 1 milhão).

## O que vamos construir

### Fase 1 — estrutura de captação para a Prospekto

1. **Site institucional + captura de leads**: páginas para empresas, contadores, pessoas físicas, municípios e proponentes; lead magnets (guia gratuito, simulador de dedução, diagnóstico); formulários com LGPD.
2. **CRM de captação**: pipeline por segmento (PJ, PF, escritórios contábeis, municípios, proponentes), carteira de projetos (status no SALIC, valor aprovado, saldo a captar), patrocínios e aportes, atividades e follow-ups.
3. **Máquina de prospecção**: playbooks de LinkedIn, networking (Serra Gaúcha), campanhas sazonais (fechamento do ano-calendário) e programa de parceria com escritórios contábeis.
4. **Produto digital**: mentoria/curso da Daniela para quem quer aprender a escrever e captar projetos culturais; validação por lista de espera no site.

### Fase 2 — hub de captação (produto vendável)

Empacotar a estrutura (site + CRM + playbooks + conteúdo) como modelo/plataforma para outros consultores, produtoras e proponentes, com a Daniela como autoridade e rosto da marca. Multi-tenant / white-label é um requisito de arquitetura desde já, mas não da Fase 1.

## Modelo de receita

| Fonte | Como | Observação |
|---|---|---|
| Comissão de captação | percentual sobre cada patrocínio trazido | limites legais de custo de captação precisam ser respeitados (ver `docs/dominio/`) |
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

1. fomento.ai é marca-irmã, parceiro de canal ou só referência de posicionamento?
2. O "CRM que a gente fez" — qual stack? Vale reaproveitar algo?
3. Quais projetos estão em carteira hoje (nome, lei, status, valor aprovado, saldo a captar)?
4. Domínio `prospekto.com.br`: já existe site? Onde está hospedado o e-mail?
5. Quem opera o CRM no dia a dia: só a Daniela, ou há equipe?
