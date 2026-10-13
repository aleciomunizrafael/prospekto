# Guia da equipe: o CRM da Prospekto

> Para a Daniela e o sócio. Um tópico por módulo, do jeito que a tela aparece em `https://prospekto.com.br/app`. O que mudou em 13/10/2026 (ADR-004): os módulos ganharam a organização do Trilis (Painel, Pipeline em quadro, Prospecção, Tarefas, busca por Ctrl+K), e nada do que o CRM já fazia foi perdido: os estágios continuam pedindo os campos obrigatórios, o consentimento continua valendo, os aportes continuam com termo, depósito, recibo e comissão. Capturas de referência (1440 px) em `scratchpad/shots/estrutura-guia/` do ambiente de desenvolvimento; o repositório não versiona imagens, por isso este guia descreve as telas em texto. Regras de operação em `docs/playbooks/README.md`; decisões e motivos em `docs/arquitetura/ADR-004-estrutura-trilis.md`.

## O que mudou de nome e de lugar

| Antes | Agora | Onde |
|---|---|---|
| "Hoje" | **Painel** (mesma tela, mais os medidores da carteira) | primeiro item do menu, `/app` |
| "Leads" | **Pipeline** (mesma lista, mais a visão em quadro) | `/app/leads` (os links antigos continuam valendo) |
| não existia | **Prospecção** (listas de empresas para ligar) | `/app/prospeccao` |
| não existia | **Tarefas** (quadro A fazer, Em andamento, Concluída) | `/app/tarefas` |
| busca só na página | **Ctrl+K** (Cmd+K no Mac) abre a busca em qualquer tela | botão "Buscar…" no alto do menu |
| avatar no canto superior direito | o seu nome e e-mail ficam no **rodapé do menu**, com "Minha conta" e "Sair" | rodapé da coluna da esquerda |
| no celular: Hoje, Leads, Projetos, Aportes, Mais | no celular: **Painel, Pipeline, Prospecção, Tarefas, Mais** (Organizações, Projetos, Aportes, Exportar, Minha conta, Atalhos e Sair ficam em "Mais") | barra inferior |

Na primeira vez que a pessoa abre o Pipeline em um aparelho, o CRM escolhe a visão sozinho e guarda a escolha: **Quadro** no computador, **Lista** no celular. Depois disso, "Lista" e "Quadro" ao lado dos filtros trocam quando quiser; a escolha fica guardada naquele aparelho.

## Painel

É a primeira tela e continua sendo a fila de trabalho: "Precisa de ação agora" lista as próximas ações vencidas, os leads novos sem contato e as tarefas vencidas, com "Assumir" ou "Registrar contato" ao lado de cada linha. Acima da fila, duas réguas de medidores:

- **Hoje**: Vencidas (próximas ações atrasadas), Sem contato (leads novos; o número menor diz quantos já passaram do prazo de 1 dia útil), Tarefas hoje (vencidas mais as que vencem hoje; "N atrasadas" abre só as atrasadas) e Aportes 15 dias (soma dos aportes previstos para fechar nas próximas duas semanas). Clicar numa célula abre a lista correspondente.
- **Carteira**: Organizações ativas (com aporte depositado nos últimos 12 meses), Aportes em aberto (soma dos propostos e dos com termo assinado), Depositado no ano e Projetos captando (com "N com alerta" quando o prazo ou a captação preocupam).

Abaixo, lado a lado: **Últimas atividades** (as oito mais recentes de toda a equipe: ligações, reuniões, notas, WhatsApp, com quem fez e quando; clicar abre o lead, a organização, o projeto ou a empresa de prospecção) e **Minhas tarefas** (as suas oito tarefas abertas, por vencimento, com a prioridade escrita, "Concluir" e "ver todas"). "Próximos 7 dias", "Aportes previstos" e "Projetos com alerta" continuam como eram.

## Pipeline: Lista e Quadro

As abas em cima (Patrocinadores, Contadores, Municípios, Projetos, Alunos) e os filtros (busca, segmento, origem, dono, temperatura, perdidos) são os mesmos nas duas visões.

**Lista** é a tabela de sempre: nome, estágio, próxima ação, origem, dono, com paginação e ordenação.

**Quadro** mostra uma coluna por estágio do pipeline escolhido, com a contagem no cabeçalho e, em Patrocinadores, o total em propostas da coluna. Cada cartão traz o nome (clique para abrir o lead), a empresa, o prazo ("Ação atrasada há 2 dias", "Faltam 23 h para o primeiro contato"), quem cuida (ou "Assumir") e o valor do aporte quando existe. A coluna "Perdido" só aparece com "Mostrar perdidos". A ordem dentro da coluna é por urgência (quem tem ação vencida primeiro, depois quem está há mais tempo no estágio); não dá para reordenar à mão, de propósito.

**O que acontece ao soltar um cartão.** Arrastar um lead para outra coluna **não grava nada sozinho**: abre o mesmo diálogo "Mover para" da página do lead, já no estágio de destino, pedindo o que aquele estágio exige (responsável e próxima ação ao sair de Novo; a checagem do art. 27 antes de Termo; o aporte registrado antes de Aporte e Recibo). "Cancelar" deixa o cartão onde estava. Enquanto você arrasta, as colunas para onde não dá para ir ficam apagadas com a explicação ("Avance um estágio por vez"); soltar numa delas só mostra um aviso. Soltar na zona "Marcar perdido", à direita, abre o diálogo de perda, que pede o motivo. Sem mouse (teclado ou celular), o caminho é o botão "Mover para" (setas) de cada cartão, que abre o mesmo diálogo. No celular o quadro rola de lado, uma coluna por vez.

## Prospecção: do "Colar lista" à reunião marcada

É o módulo da lista de ligações da semana (`docs/playbooks/README.md`, "Regras comuns"). Três telas: as listas, uma lista, uma empresa.

1. **Nova lista** ("Nova lista" ou "Novo ▾ › Nova lista de prospecção"): nome ("Vinícolas do Vale"), região, **de onde vieram os dados** (obrigatório: "busca pública", "associação das vinícolas", "indicação do contador X"; é a origem que a LGPD manda registrar), quem liga e as instruções para quem liga (horário bom, abertura). A lista nasce vazia.
2. **Colar lista**: cole as empresas de uma vez, uma por linha, no formato `Nome | Telefone | Abertura` (vale também `;` ou tabulação entre os campos; uma linha começando com `#` define o grupo das seguintes, por exemplo `# Vinícolas`). O CRM reconhece o telefone sozinho (com ou sem DDD, com ou sem o zero), o resto da linha vira a abertura da ligação. Antes de gravar, a prévia diz "37 empresas reconhecidas · 2 telefones não reconhecidos" (as sem telefone entram mesmo assim, com o texto guardado em "Informações"). Até 500 por colagem. Se um telefone já foi descartado em outra lista, a empresa entra com a anotação "Descartada em {lista} ({motivo})" e o aviso aparece ao gravar. "Adicionar" inclui uma empresa por vez.
3. **Ligar pela lista**: cada empresa é um cartão com a abertura em destaque, "Ligar (54) 3000-0000" (abre o telefone do computador ou do celular), "WhatsApp" e os botões de resultado: **Sem resposta**, **Retornar** (pede a data), **Reunião marcada**, **Descartar** (pede o motivo: sem interesse, pediu para não contatar, número errado, outro) e **Anotação**. Cada resultado fica registrado com data no histórico da empresa; os chips no alto (Todas, A ligar, Sem resposta, Retornar, Reunião marcada, Descartado) filtram, e a barra de progresso mostra "12 de 48 contatadas · 3 reuniões". "Voltar para a ligar" reabre uma empresa; se ela pediu para não ser contatada, o CRM confirma antes.
4. **WhatsApp**: abre uma mensagem pronta na voz da Daniela (três variações; "outra versão" troca; o texto é editável) e, ao clicar em "Abrir no WhatsApp", abre o aplicativo com o texto e anota "WhatsApp aberto há 2 d" no cartão. O CRM só sabe que a mensagem foi aberta, não que foi enviada. Toda primeira mensagem termina com "Responda SAIR se não quiser mensagens por aqui." Se o telefone é fixo, o botão avisa que não serve para WhatsApp. Cadência sugerida: mensagem hoje; sem resposta, ligar em 2 dias úteis.
5. **Reunião marcada**: o botão abre o diálogo que pede o **nome e o e-mail de quem vai à reunião** (peça o e-mail na ligação: o convite e o CRM precisam dele), o telefone da pessoa (opcional; o da empresa já fica na organização), cargo, **data e hora**, tipo (simulação de 20 min ou diagnóstico de 30 min), regime tributário se soube e interesse. Ao confirmar, o CRM cria a **organização** (ou reaproveita uma com o mesmo nome), o **contato**, o **lead em Patrocinadores** e registra a reunião no histórico; o lead vai direto para **Qualificado**, mesmo sem o regime confirmado (a reunião marcada basta nesse caminho; o regime se confirma na reunião). Se já existe um lead com aquele e-mail, a reunião é registrada nele; se ele estava perdido, volta para Qualificado. A empresa fica como "Reunião marcada" na lista, com o link para o lead.

A ficha da empresa (clique no nome) guarda a abertura e "Sobre a empresa" (localização, porte, informações), que salvam sozinhos ao sair do campo, mais o histórico completo. Excluir uma lista apaga as empresas e o histórico das ligações, mas não os leads e organizações já criados; o CRM pergunta antes.

## Organizações

A lista é a mesma. A ficha de cada organização ficou mais completa: no alto, "Novo contato", "Editar", "Vincular lead" e, quando há telefone, **"Ligar (54) 3000-0000"** (o do contato que decide; na falta, o primeiro contato com telefone; na falta, o telefone da empresa, campo novo em "Editar"). Na coluna principal, **Registrar atividade** (ligação, reunião, e-mail, WhatsApp, visita, nota ou tarefa, direto na organização) e o **Histórico**, que junta o que foi registrado na organização e o que foi registrado nos leads dela (cada linha diz de qual lead veio). Na lateral: **Leads e aportes** (com o estágio, o prazo e o valor do aporte aberto, e "ver no quadro"), **Contatos** (nome, cargo, e-mail e telefone clicáveis; quem decide tem a coroa), **Dados** e **Notas**, que salvam sozinhas ao sair do campo ("Salvo às 14:32"). Organizações não são apagadas: o histórico e a LGPD pedem que fiquem.

## Tarefas

Quadro com três colunas: **A fazer**, **Em andamento** e **Concluída** (as 20 mais recentes). Cada cartão tem o título, a prioridade escrita (Alta, Média, Baixa), o vínculo (lead, organização ou projeto, ou "sem vínculo"), o prazo e "Concluir". Arraste entre colunas ou use o menu "⋯" do cartão ("Mover para…"); no celular as colunas empilham e o caminho é o menu ou o campo "Status" ao editar. Mover de volta de Concluída para A fazer reabre a tarefa.

"Nova tarefa" (ou "Novo ▾ › Nova tarefa") pede título, descrição, responsável ("Ninguém" é uma opção de verdade), prioridade, status, prazo (opcional) e vínculo (opcional). Uma tarefa pode existir sem lead: é a diferença em relação às tarefas criadas na página do lead, que continuam funcionando igual e aparecem aqui também. Filtros no alto: "Só as minhas", "Só atrasadas", "Vencem hoje". Excluir é possível, com confirmação; quando a tarefa estava ligada a um lead, fica um registro "Tarefa excluída" no histórico dele.

O e-mail diário ganhou a seção **"Tarefas atribuídas a você"**: as suas tarefas vencidas, as que vencem nos próximos 7 dias e as sem prazo, com "(nova)" nas criadas no dia anterior.

## Busca Ctrl+K

Em qualquer tela, **Ctrl+K** (Cmd+K no Mac), o botão "Buscar…" no alto do menu ou a lupa do celular abrem a busca. Antes de digitar, ela lista "Ir para" (os módulos) e "Novo…" (lead, organização, projeto, aporte, tarefa, lista de prospecção). A partir de duas letras, busca em leads, organizações, projetos, aportes, tarefas e empresas de prospecção (cinco de cada, com a etiqueta do tipo e uma linha de contexto: empresa e estágio, cidade, valor e status, prazo, lista). Setas e Enter abrem; Esc fecha e devolve o foco onde estava. "Ver todos os resultados" abre a página Busca, com os mesmos seis grupos e oito de cada. A tecla `/` continua levando ao campo de busca do alto. Telefones nunca aparecem na busca, e o que você digita não é registrado em lugar nenhum.

## Como medir em um mês

Revisão prevista para 13/11/2026 (`ADR-004-estrutura-trilis.md`, seção 12). As consultas abaixo rodam no console SQL do Neon (ou num `psql`) e assumem o tenant `prospekto`; nenhuma mostra nome, e-mail ou telefone. Cada uma lê os últimos 30 dias.

**1. Quadro ou lista: de onde saem as mudanças de estágio.** Meta: mais da metade pelo quadro em Patrocinadores.

```sql
select
  count(*) filter (where a.data->>'origin' = 'board') as pelo_quadro,
  count(*) filter (where a.data->>'origin' is distinct from 'board') as pela_pagina_do_lead_ou_prospeccao,
  count(*) as total
from activities a
join leads l on l.id = a.lead_id and l.tenant_id = a.tenant_id
where a.tenant_id = 'prospekto'
  and a.type = 'sistema'
  and a.subject like 'Estágio alterado%'
  and l.pipeline = 'patrocinadores'
  and a.occurred_at >= now() - interval '30 days';
```

**2. Prospecção: listas, empresas, ligações por semana, taxa de reunião e o que virou lead.** Referência do funil: 8 reuniões de diagnóstico PJ por mês (`docs/estrategia/personas-e-funis.md`, seção 11).

```sql
-- listas criadas e empresas coladas, por semana
select date_trunc('week', i.created_at)::date as semana,
       count(distinct i.list_id) as listas,
       count(*) as empresas
from prospecting_items i
where i.tenant_id = 'prospekto' and i.created_at >= now() - interval '30 days'
group by 1 order by 1;

-- ligações registradas por semana
select date_trunc('week', a.occurred_at)::date as semana, count(*) as ligacoes
from activities a
where a.tenant_id = 'prospekto' and a.type = 'ligacao'
  and a.prospecting_item_id is not null
  and a.occurred_at >= now() - interval '30 days'
group by 1 order by 1;

-- taxa de reunião marcada sobre as empresas já contatadas
select count(*) filter (where status = 'reuniao_marcada') as reunioes,
       count(*) filter (where status <> 'a_ligar') as contatadas,
       round(100.0 * count(*) filter (where status = 'reuniao_marcada')
             / nullif(count(*) filter (where status <> 'a_ligar'), 0), 1) as taxa_pct
from prospecting_items
where tenant_id = 'prospekto';

-- leads nascidos da prospecção e em que estágio estão hoje
select stage, count(*)
from leads
where tenant_id = 'prospekto' and source = 'prospeccao'
group by stage order by 2 desc;
```

**3. WhatsApp: mensagens abertas e quantas viraram reunião em até 7 dias.**

```sql
select count(*) filter (where i.whatsapp_sent_at is not null) as whatsapp_abertos,
       count(*) filter (
         where i.whatsapp_sent_at is not null and exists (
           select 1 from activities a
           where a.tenant_id = i.tenant_id and a.prospecting_item_id = i.id
             and a.type = 'sistema' and a.subject like 'Lead criado pela prospecção%'
             and a.created_at <= i.whatsapp_sent_at + interval '7 days'
         )
       ) as viraram_reuniao_em_7_dias
from prospecting_items i
where i.tenant_id = 'prospekto';
```

**4. Tarefas: soltas e vinculadas, tempo em andamento, vencidas por responsável.** O CRM não marca se a tarefa nasceu no quadro ou no formulário do lead; a aproximação é "sem vínculo" (só o quadro cria assim) contra "com vínculo".

```sql
select count(*) filter (where lead_id is null and org_id is null and project_id is null and contribution_id is null) as soltas,
       count(*) filter (where lead_id is not null or org_id is not null or project_id is not null or contribution_id is not null) as vinculadas,
       avg(done_at - started_at) filter (where started_at is not null and done_at is not null) as tempo_medio_em_andamento
from activities
where tenant_id = 'prospekto' and type = 'tarefa'
  and created_at >= now() - interval '30 days';

-- vencidas hoje por responsável (o mesmo recorte do e-mail diário; o id do usuário não é dado pessoal)
select owner_user_id, count(*) as vencidas
from activities
where tenant_id = 'prospekto' and type = 'tarefa' and done_at is null and due_at < now()
group by 1 order by 2 desc;
```

**5. Busca Ctrl+K.** Não está no banco: cada busca grava uma linha de log `"msg":"busca global"` com as contagens por tipo (nunca o termo). Nos logs da Vercel, filtrar por `busca global` e contar por dia; comparar com os acessos a `/app/busca` no Vercel Analytics. Se a paleta é usada e a página quase não é, o campo de busca do alto pode virar só um atalho.

**6. Painel, celular e cancelamentos no quadro.** Leituras do Vercel Analytics (já instalado): cliques em "Últimas atividades" e "Minhas tarefas"; proporção de visitas a `/app/leads?view=quadro` abaixo de 960 px (se for zero, o quadro no celular pode sair). Quantos arrastos terminam em "Cancelar" **ainda não é medido**: o evento `board_move_cancelled` previsto no ADR não foi instrumentado nesta entrega; entra na revisão de um mês se a conversa com a Daniela apontar que o diálogo depois do arrasto incomoda.

**7. Conferência da régua "Carteira".** Os quatro números do Painel contra a planilha da Daniela: organizações com aporte depositado nos últimos 12 meses, soma dos aportes em proposta e termo assinado, depositado no ano civil e projetos em captação. Qualquer diferença é bug ou aporte não registrado; as duas coisas interessam.

O que a revisão decide com essas leituras: ordem manual dos cartões, arrastar tarefas pelo toque no celular, quadro no celular, status manual de organização e remoção de contatos na ficha (ADR-004, seção 13).
