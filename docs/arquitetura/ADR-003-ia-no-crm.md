# ADR-003: inteligência artificial no CRM, com a pessoa no comando

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data | 09/10/2026 |
| Decide | Dono do projeto (Rafael), com a Daniela como usuária de referência |
| Contexto de negócio | `docs/visao.md` (não repetido aqui); operação em `docs/playbooks/README.md` |
| Convenções de código | `docs/arquitetura/next16-convencoes.md`, `AGENTS.md`, `docs/design/crm-design-system.md` |
| Documento derivado | `ia-plano.md` (plano de implementação em fases e frentes) |
| Fontes técnicas lidas em 09/10/2026 | Referência da Claude API embutida no ambiente (`claude-api/typescript/claude-api/README.md`, `tool-use.md`, `shared/prompt-caching.md`, `shared/model-migration.md`, `shared/models.md`); `@anthropic-ai/sdk` 0.133.0 (tipos conferidos no pacote); Vercel, "Configuring Maximum Duration" (https://vercel.com/docs/functions/configuring-functions/duration, atualizada em 24/08/2026); Anthropic, "How long do you store personal data?" (https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-personal-data); Anthropic Commercial Terms of Service (https://www.anthropic.com/legal/commercial-terms, versão de 17/06/2025) |

## 1. Pergunta

Como a Daniela ganha tempo em três momentos repetitivos do dia (preparar uma ligação, registrar o que aconteceu, responder pela primeira vez a um lead) sem que o CRM passe a falar com leads por conta própria, sem expor dados pessoais além do necessário e sem custo que fuja do controle?

Decisões já dadas pelo projeto e fora de discussão aqui: stack do ADR-001 (Next 16, Drizzle, Better Auth, Resend, Vitest); regras R-15 (`db` só em `src/lib/repos/`) e R-16 (logs sem e-mail, telefone, CPF ou CNPJ); português do Brasil na interface; custo mensal próximo de zero na Fase 1.

## 2. Decisão em uma frase

A Prospekto usa a Claude API (SDK oficial `@anthropic-ai/sdk`, modelo `claude-opus-5-5`) em três recursos do CRM que **sugerem** texto e estrutura para a Daniela **revisar**; nada chega ao lead sem um clique dela; o agente de voz e o WhatsApp automático ficam fora do código agora e entram como plano documentado (seção 10).

## 3. Princípios que valem para toda frente

1. **A pessoa no comando.** A IA escreve rascunho, resumo e sugestão; a Daniela lê, edita e decide. Os botões "Enviar por e-mail" e "Abrir no WhatsApp" são ações explícitas dela; "Organizar com IA" devolve campos para revisar, e só "Registrar" grava pelo fluxo que já existe.
2. **Só o necessário vai ao modelo.** O contexto é montado por `src/lib/ai/redact.ts` a partir de uma lista fechada de campos (seção 5); e-mail, telefone, CPF, senha e dados bancários nunca vão. Nenhum dos três recursos precisa de e-mail ou telefone no texto, então nenhum os envia.
3. **Tudo fica registrado e limitado.** Toda execução grava uma linha em `ai_runs` (seção 8); há um teto de 200 execuções por tenant por dia; os logs trazem `kind`, `leadId`, modelo e tokens, nunca o conteúdo.
4. **Sem chave, nada quebra.** Sem `ANTHROPIC_API_KEY` os recursos aparecem desabilitados com a frase "IA não configurada" e nenhuma chamada é feita (seção 9). Nenhum teste chama a rede: o SDK é substituído por `vi.mock`.
5. **Nada de pré-preenchimento de resposta do assistente, nada de parâmetro `thinking`, nada de shim.** As chamadas seguem a referência oficial lida em 09/10/2026 (seção 7).

## 4. As quatro frentes e onde cada uma aparece

| # | Frente | Entra em código agora | Onde aparece | Componentes reaproveitados |
|---|---|---|---|---|
| 1 | **Preparar ligação** (briefing do lead) | Sim | Página do lead (`/app/leads/[id]`), coluna principal, cartão "Preparar ligação" dentro do painel `AiPanel`, logo abaixo do `NextStepCard`; no celular, depois de "Contato" e antes de "Registrar atividade" | `Card`, `CardHeader`, `CardTitle`, `CardAction`, `Callout`, `KeyValueList`, `Button`, `Skeleton`, `Tooltip` |
| 2 | **Ditar e organizar** (no "Registrar atividade") | Sim | Dentro do `ActivityForm`, acima do campo "O que aconteceu": botão "Ditar" (microfone do navegador) e botão "Organizar com IA"; a revisão aparece em um `Callout` com os campos propostos e os botões "Aplicar ao formulário" e "Salvar campos da empresa" | `Callout`, `SegmentedControl` (o tipo é aplicado nele), `TextField`, `TextareaField`, `Badge`, `Button` |
| 3 | **Resposta sugerida** (e-mail ou WhatsApp) | Sim | Página do lead, cartão "Resposta sugerida" no mesmo `AiPanel`, abaixo de "Preparar ligação": `SegmentedControl` E-mail / WhatsApp, rascunho editável, dois horários propostos, botões "Enviar por e-mail" e "Abrir no WhatsApp" | `Card`, `SegmentedControl`, `TextareaField`, `TextField` (assunto), `Callout` (consentimento), `ConfirmDialog` (confirmação do envio), `Button` |
| 4 | **Agente de voz para retorno** e **WhatsApp automático** | Não | Plano na seção 10; o núcleo de qualificação (`src/lib/ai/qualification.ts`) nasce reutilizável por eles | |

Uma única cor de ação primária por tela continua valendo (decisão D5 do sistema de design): nos cartões de IA o botão sólido é só "Enviar por e-mail"; "Gerar", "Gerar de novo", "Organizar com IA" e "Abrir no WhatsApp" são `outline`.

## 5. O que vai ao modelo e o que nunca vai

A montagem do contexto é uma função pura, `buildLeadContext(detail, extras)` em `src/lib/ai/redact.ts`, testada em `tests/lib/ai-redact.test.ts`. Ela recebe os DTOs que a página do lead já carrega e devolve um objeto com chaves fixas; o que não está na lista abaixo não existe para o modelo.

### 5.1 Vai (por recurso)

| Dado | Origem | Briefing | Organizar | Resposta | Forma |
|---|---|---|---|---|---|
| Nome do lead | `leads.name` | sim | só o primeiro nome | sim | texto |
| Empresa, escritório, município ou proponente | `organizations.name` ou `attributes.empresa` etc. (`leadCompany`) | sim | sim | sim | texto |
| Cidade e UF | `leads.city`, `leads.uf` | sim | não | sim | texto |
| Segmento, pipeline, estágio, dias no estágio | `leads.segment`, `pipeline`, `stage`, `stage_entered_at` | sim | sim | sim | rótulos em português (`SEGMENT_LABELS`, `stageLabel`) |
| Interesse, origem (sem `source_detail` quando contém URL com parâmetros), temperatura e score | `leads.*` | sim | não | sim | rótulos |
| Tags | `leads.tags` | sim | não | sim | rótulos (`tagLabel`) |
| Campos do segmento | `leads.attributes`, **exceto** `cnpj`, `vinculo_art27_checado_por` e qualquer chave fora de `ATTRIBUTE_FIELDS[segment]` | sim | só os já preenchidos, para o modelo não repetir | sim | rótulo e valor traduzidos (`ATTRIBUTE_VALUE_LABELS`) |
| Mensagem do formulário | `leads.message` | sim, depois de `scrubText` | não | sim, depois de `scrubText` | texto com e-mails, telefones, CPFs e CNPJs mascarados por regex |
| Atividades | `activities` dos últimos 180 dias, no máximo 20, tipos `ligacao`, `reuniao`, `email`, `whatsapp`, `visita`, `nota`, `tarefa`, `formulario` | sim | só as 5 últimas (assunto e data) | só as 5 últimas | data, tipo, assunto e `body` (até 600 caracteres cada, depois de `scrubText`); `formulario` entra só como "preencheu o formulário X em [data]"; `sistema` e `download` resumidos como contagem |
| Simulações | `simulations.outputs` | a mais recente | não | a mais recente | mecanismo em destaque e valor estimado arredondado para milhar ("cerca de R$ 12 mil"); nunca `inputs` (valores exatos de IRPJ, renda) |
| Consentimentos | estado vigente por finalidade | sim | não | sim | "contato comercial: autorizado em 06/10/2026 por e-mail; marketing: nunca registrado" (sem o texto integral) |
| Aportes abertos | `contributions` do lead | sim | não | não | projeto, status e valor proposto |
| Nome do responsável | `users.name` | primeiro nome | não | não | texto |
| Próxima ação marcada e último contato | `leads.next_action_at`, `leads.last_contact_at` | sim | não | não | data e hora (`formatDateTime`) |
| Data de hoje e dia da semana | servidor | sim | sim | sim | sempre na mensagem de usuário, nunca no system prompt (cache) |
| Horários propostos | `proposeSlots()` em `qualification.ts` | não | não | sim | dois horários prontos, por extenso |
| Texto ditado ou colado | textarea | não | sim, depois de `scrubText` com CNPJ **preservado** | não | texto |

### 5.2 Nunca vai

E-mail e telefone do lead ou de contatos; CPF; CNPJ no briefing e na resposta (só no ditado, porque a Daniela pode ditar o CNPJ da empresa e querer que ele vire campo); senhas, tokens, hashes de IP; `simulations.inputs`; dados bancários da conta vinculada do projeto; número de recibo; `consent_text` integral; ids de tenant, de usuário e de lead; nomes de outros leads; `source_detail` quando contém `?`; qualquer chave de `attributes` desconhecida.

`scrubText(text)` em `redact.ts` substitui por `[e-mail]`, `[telefone]`, `[CPF]` e `[CNPJ]` os padrões correspondentes (regex já usadas em `src/lib/validation/common.ts` para validar; aqui servem para mascarar) e corta em 8.000 caracteres. É a última barreira; a primeira é a lista fechada de campos.

### 5.3 Reconhecimento de fala

O ditado usa a Web Speech API do navegador (`SpeechRecognition`, `lang = "pt-BR"`), sem fornecedor novo e sem chamada ao nosso servidor. Atenção: no Chrome e no Edge o reconhecimento é feito pelo serviço do fabricante do navegador (o áudio sai do computador da Daniela para a Google ou a Microsoft) [verificar na documentação atual de cada navegador]. O que é ditado são as **notas da própria Daniela** sobre a conversa, não a gravação do lead; ainda assim o texto pode conter nome e empresa do lead. Por isso: o ditado é um recurso de conveniência, desligável, com aviso "O reconhecimento de voz é do navegador" ao lado do botão, e a política de privacidade cita o uso de inteligência artificial e de reconhecimento de voz como apoio ao atendimento (seção 6.4). Navegador sem a API (Firefox): o botão "Ditar" não aparece e "Organizar com IA" continua funcionando com texto colado.

## 6. LGPD

### 6.1 Papéis

A Prospekto é a **controladora** (Lei 13.709/2018, art. 5º, VI); a Anthropic é **operadora** (art. 5º, VII) quando processa o conteúdo enviado pela API, assim como Vercel (hospedagem), Neon (banco), Resend (e-mail) e Meta (WhatsApp) já são. Os Commercial Terms of Service da Anthropic (versão de 17/06/2025, seção C) remetem o tratamento ao Data Processing Addendum da Anthropic [verificar com o advogado se o DPA padrão basta ou se a Prospekto precisa assiná-lo em separado]. A conta da API é da Prospekto, não do desenvolvedor.

### 6.2 O que a Anthropic faz com os dados (fontes lidas em 09/10/2026)

| Tema | O que a fonte diz | Consequência para nós |
|---|---|---|
| Treinamento | Commercial Terms, seção B: "Anthropic may not train models on Customer Content from Services"; o cliente retém os direitos sobre as entradas e é dono das saídas | Nada do que vai ao modelo alimenta treinamento |
| Retenção | "For Anthropic API users, we automatically delete inputs and outputs on our backend within 30 days of receipt or generation", com exceções (retenção maior quando o cliente usa um serviço de retenção própria, por exigência legal, ou por sinalização de violação da política de uso, caso em que entradas e saídas podem ficar até 2 anos) | Até 30 dias na Anthropic; o que a Prospekto guarda está em `ai_runs`, sob a nossa regra de retenção (6.5) |
| Retenção zero | Existe mediante acordo ("zero data retention agreement") | Não é necessário na Fase 1; reavaliar se um patrocinador exigir |
| Transferência internacional | O processamento ocorre fora do Brasil | LGPD, art. 33, II, c: cláusulas-padrão contratuais do operador conforme a Resolução CD/ANPD 19/2024 [verificar com o advogado se o DPA da Anthropic as incorpora]; registrar na política de privacidade (6.4) |

### 6.3 Base legal

Os três recursos não criam uma finalidade nova: continuam a servir a "responder solicitações, marcar reuniões e operar patrocínios" (política de privacidade, item 4). A base legal é a mesma do contato que já acontece: consentimento da caixa 1 (`contato_comercial`, art. 7º, I) para quem veio pelo site, e legítimo interesse para contato profissional B2B (art. 7º, IX, com saída fácil) para leads cadastrados pela Daniela a partir de LinkedIn, eventos e indicações. O envio da resposta por e-mail exige consentimento `contato_comercial` vigente (`hasConsent`), e-mail com status `ok` e o clique da Daniela; sem isso o botão fica desabilitado com a explicação. A IA é um **meio** de tratamento (art. 6º, I e III: finalidade e necessidade): por isso a lista fechada da seção 5.

Decisão automatizada: nenhuma. Nenhum lead muda de estágio, recebe score, é descartado ou recebe mensagem por decisão do modelo (art. 20 não se aplica, e queremos que continue assim).

### 6.4 Transparência: texto da política e do rodapé dos formulários

`src/config/site.ts`, `consent.footer`, hoje: "… exceto os provedores necessários ao serviço (hospedagem, e-mail, WhatsApp) …". Passa a: "… exceto os provedores necessários ao serviço (hospedagem, e-mail, WhatsApp e **inteligência artificial para apoio ao atendimento**) …". A página `/privacidade` (`src/app/(site)/privacidade/page.tsx`), item 6 "Com quem compartilhamos", ganha o mesmo provedor e a frase: "Usamos inteligência artificial (Anthropic, fornecedor da Claude API) para resumir o histórico de contato e preparar rascunhos de resposta que são sempre revisados por uma pessoa antes do envio; esses dados não são usados para treinar modelos e são apagados pelo fornecedor em até 30 dias. O ditado de notas usa o reconhecimento de voz do navegador." O item 6 também cita a transferência internacional (6.2). O texto publicado enumera, na linguagem da pessoa, a lista fechada da seção 5 (nome, empresa, cidade, segmento e etapa, origem e classificação interna, campos de qualificação do segmento, resultado arredondado do simulador, mensagem e conversas registradas, estado das autorizações, aportes em andamento, CNPJ só no ditado) e o que nunca vai (5.2); quem mudar `redact.ts` ou `notes.ts` revê a frase, coberta por `tests/site/privacidade.test.ts`. `site.policyVersion` passa para a data da publicação do texto novo; os consentimentos já gravados continuam válidos (finalidade inalterada), e o CRM mostra a versão de cada um, como hoje.

### 6.5 Retenção do que a Prospekto guarda

`ai_runs.output` guarda o JSON gerado (contém nome e empresa do lead e o resumo do histórico). Segue a regra R-17: 24 meses após `leads.last_contact_at` [verificar com o advogado], apagada pelo cron da Fase 2 junto com o lead; a Fase 1 só registra. O pedido de eliminação (art. 18, VI) inclui as linhas de `ai_runs` do lead, e o pedido de acesso (art. 18, II) inclui o conteúdo de `output`.

### 6.6 Direitos de quem é citado nas notas

O ditado pode citar terceiros (o contador da empresa, um sócio). São dados de contato profissional, tratados com a mesma base do lead; `scrubText` mascara e-mails e telefones ditados antes de qualquer envio ao modelo, e a nota gravada é a que a Daniela revisou.

## 7. Modelo, parâmetros e forma da chamada

### 7.1 Escolhas

| Item | Decisão | Fonte e motivo |
|---|---|---|
| SDK | `@anthropic-ai/sdk` 0.133.0 (dependência nova em `package.json`, fixada); `zod` 4.6.5 já instalado atende ao peer `^3.25.0 \|\| ^4.0.0` | Único SDK oficial; nada de cliente HTTP próprio |
| Modelo padrão | `claude-opus-5-5`, substituível por `AI_MODEL` | `shared/model-migration.md`, seção "Migrating to Claude Opus 5.5": alvo padrão da linha Opus; US$ 4 / US$ 20 por milhão de tokens; cache lido a US$ 0,20 por milhão; contexto de 1 M e 128 K de saída |
| Pensamento | Nunca enviar `thinking`: nesse modelo ele está sempre ligado e `disabled` ou `budget_tokens` devolvem 400. O controle é `output_config.effort` | Mesma seção: "thinking is always on; omit `thinking`; control depth with `output_config.effort`" |
| Esforço | `medium` no briefing e no organizar; `low` nos rascunhos curtos de resposta | O padrão do modelo é `medium`; `low` reduz latência e custo em texto curto. Rever com uso real |
| `max_tokens` | 4000 em todas as chamadas | Cabe a maior saída (briefing com cerca de 900 tokens de JSON) mais o pensamento, que **conta em `max_tokens`** mesmo sem ser devolvido. `stop_reason = "max_tokens"` é tratado (7.4) |
| Saída estruturada | `client.beta.messages.create` com `output_config.format = betaZodOutputFormat(schema)` (`@anthropic-ai/sdk/helpers/beta/zod`) e o beta `structured-outputs-2025-12-15` (o mesmo cabeçalho que `parse` acrescentaria); a validação do JSON pelo esquema é feita no código (`JSON.parse` + `schema.safeParse` do primeiro bloco `text`) | `tool-use.md`, "Structured Outputs": substitui o antigo pré-preenchimento de JSON, que é proibido aqui. Não usamos `client.beta.messages.parse` porque ele lança `AnthropicError` (que não é `APIError`) quando a saída vem truncada por `max_tokens` ou fora do esquema, o que perderia `stop_reason` e `usage` (7.4). Os esquemas evitam `minItems`, `maxItems` e `minLength` (subconjunto de JSON Schema do recurso); limites ficam no prompt e no código (`slice`) |
| Fallback de recusa | `client.beta.messages` com `betas: ["server-side-fallback-2026-07-01"]` e `fallbacks: "default"` | `model-migration.md`: forma escalar `"default"` escolhe o modelo substituto por categoria de recusa; o cabeçalho é exatamente esse (a forma em array usa outro). O tipo `BetaFallbacksParam = Array<BetaFallbackParam> \| 'default'` existe no SDK 0.133.0 |
| Prompt caching | `system` como array com um bloco de texto estável por recurso e `cache_control: { type: "ephemeral" }` no último bloco; data, nome e contexto do lead vão só na mensagem de usuário | `shared/prompt-caching.md`: cache é prefixo; nada volátil no system; mínimo de 512 tokens cacheáveis nesse modelo (os três system prompts têm entre 700 e 1.200 tokens) |
| Pré-preenchimento | Nunca há mensagem `assistant` na chamada | Regra do projeto; no Opus 5.5 o prefill não existe |
| Tempo | `timeout: 55_000` e `maxRetries: 2` no cliente; `export const maxDuration = 60` no segmento `src/app/(app)/app/leads/[id]/page.tsx` | Vercel com Fluid compute (padrão): Hobby tem padrão e máximo de 300 s; Pro, padrão 300 s e máximo 800 s. 60 s cabe nos dois planos e cobre uma geração de 10 a 30 s. Em Next 16, `maxDuration` na página vale para as Server Actions usadas nela (`route-segment-config/maxDuration.md`) |
| Streaming | Não | Saída estruturada curta; a tela mostra "Gerando…" com `Skeleton` e `aria-busy` |

### 7.2 Forma única da chamada (`runStructured`)

Toda chamada passa por `runStructured` em `src/lib/ai/client.ts`:

```ts
runStructured(ctx, {
  kind: "brief" | "notes" | "reply",
  leadId: string | null,
  system: string,          // estável por kind; sem data, sem nome
  user: string,            // contexto do lead + data de hoje + instrução
  schema: z.ZodObject,     // esquema da saída
  effort: "low" | "medium",
}) => Promise<AiResult<T>>
```

Por dentro, na ordem: `isAiEnabled()` (sem chave devolve `{ ok: false, reason: "disabled" }` sem tocar o banco); teto diário (`countAiRunsToday(ctx) >= AI_DAILY_LIMIT` devolve `reason: "quota"`); a chamada:

```ts
const response = await client.beta.messages.create({
  model: aiModel(),
  max_tokens: 4000,
  betas: ["server-side-fallback-2026-07-01", "structured-outputs-2025-12-15"],
  fallbacks: "default",
  system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
  messages: [{ role: "user", content: user }],
  output_config: { effort, format: betaZodOutputFormat(schema) },
});
```

Depois: classificação por `stop_reason` e validação do JSON do bloco `text` pelo esquema (7.4; nenhum ramo lança), gravação em `ai_runs` (seção 8), log com `kind`, `leadId`, `model: response.model`, `inputTokens`, `outputTokens`, `cacheReadInputTokens`, `durationMs` e `fallback` (verdadeiro quando `usage.iterations` contém uma entrada `fallback_message`), nunca o conteúdo.

### 7.3 Prompts

Os textos completos estão em `ia-plano.md`, por frente. Regras comuns: português do Brasil; tom da Prospekto (`docs/site/estrutura-e-copy.md`, seções 4 e 5.6; `docs/playbooks/linkedin.md`, seção 6.2): direto, cordial, sem jargão, sem promessa que a lei não sustenta, números sempre com a ressalva ("até 4% do IRPJ devido; 3,6% com a LC 224/2025; o cálculo final é do contador"); nunca inventar dado que não esteja no contexto, e quando faltar dizer "não informado"; a Daniela assina como "Daniela, da Prospekto"; mensagens iniciais de WhatsApp oferecem saída ("Responda SAIR…"). O system prompt de cada recurso traz um resumo fixo dos mecanismos (Rouanet art. 18 e 26, Audiovisual art. 1º-A, LIC-RS), das regras de desqualificação (`personas-e-funis.md`, seção 5.1) e das objeções com resposta curta (seção 3.1 do mesmo documento), que é o que torna o cache útil.

### 7.4 Estados de parada e erros

| Situação | Detecção | O que a tela mostra | O que grava |
|---|---|---|---|
| Sucesso | `stop_reason = "end_turn"` e o JSON do bloco `text` valida pelo esquema | O cartão com o resultado | `ai_runs.status = "ok"` com `output` |
| Recusa | `stop_reason = "refusal"` (inclusive depois do fallback) | `Callout warning`: "A IA não conseguiu gerar este conteúdo. Escreva manualmente." Sem botão de repetir automático | `status = "refusal"`, `output = null`, `stop_details.category` em `data` |
| Corte por tamanho | `stop_reason = "max_tokens"`; ou bloco `text` ausente, JSON inválido ou fora do esquema (`safeParse` reprova) | `Callout warning`: "A resposta veio incompleta. Tente de novo." com "Gerar de novo" | `status = "max_tokens"` ou `"invalid_output"`, sempre com os tokens de `usage` (a chamada foi cobrada) |
| Sem chave | `isAiEnabled() = false` | Botões desabilitados e a frase "IA não configurada" | nada |
| Teto diário | contagem ≥ 200 | "Limite diário de IA atingido (200 execuções). Volta a funcionar amanhã." | nada |
| Erro da API (`Anthropic.APIError`: 401, 429, 5xx, timeout) | `instanceof` das classes do SDK | "A IA está indisponível agora. Tente em instantes." | `status = "error"` com `data.status` (código HTTP) e sem mensagem de erro bruta |

Em nenhum caso a página do lead deixa de renderizar: os cartões de IA são Client Components que chamam Server Actions; a página em si nunca chama o modelo.

## 8. Tabela `ai_runs`

`src/lib/db/schema/ai-runs.ts`, exportada por `schema/index.ts`; migração gerada por `npm run db:generate` (`drizzle/0001_*.sql`). Convenções de `modelo-de-dados.md`, seção 1.

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid PK | sim | |
| `tenant_id` | text FK `tenants` | sim | Isolamento (R-15) |
| `kind` | text CHECK (`brief`, `notes`, `reply`) | sim | Recurso |
| `lead_id` | uuid FK `leads` | não | Nulo quando o organizar roda sem lead (não acontece na Fase 1, mas o núcleo de qualificação da seção 10 vai precisar) |
| `model` | text | sim | Modelo que **respondeu** (`response.model`, que muda quando há fallback) |
| `status` | text CHECK (`ok`, `refusal`, `max_tokens`, `invalid_output`, `error`) | sim | Seção 7.4 |
| `input_tokens`, `output_tokens` | integer | sim, padrão 0 | `usage` da resposta |
| `cache_read_input_tokens` | integer | sim, padrão 0 | Para conferir se o cache está funcionando |
| `duration_ms` | integer | não | Tempo da chamada |
| `output` | jsonb | não | A saída validada pelo esquema e normalizada (`normalize` do recurso); nula fora de `ok` |
| `data` | jsonb | não | Metadados sem conteúdo: `{ effort, fallback, stopDetailsCategory, httpStatus, channel }` |
| `created_by` | text FK `users` | não | Quem clicou |
| `created_at` | timestamptz | sim | |

Índices: `(tenant_id, created_at desc)` para o teto diário; `(tenant_id, lead_id, kind, created_at desc)` para carregar o último briefing e o último rascunho ao abrir a página. Nunca `DELETE` na Fase 1 (regra de exclusão da seção 1 do modelo). Repositório: `src/lib/repos/ai-runs.ts` com `insertAiRun`, `countAiRunsToday` (dia civil em `America/Sao_Paulo`) e `getLatestAiRun(ctx, { leadId, kind })`; `tests/isolation.test.ts` passa a cobrir `getLatestAiRun` e `countAiRunsToday` com dois tenants.

## 9. Estados sem chave e variáveis

| Variável | Obrigatória | Padrão | Efeito |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | não | ausente | Ausente: `isAiEnabled()` é `false`; os cartões mostram "IA não configurada" em `Callout info` com a instrução "Cadastre ANTHROPIC_API_KEY nas variáveis do projeto no Vercel e faça Redeploy"; "Organizar com IA" fica desabilitado com `Tooltip`; "Ditar" continua funcionando (é do navegador). Nenhuma chamada, nenhuma linha em `ai_runs` |
| `AI_MODEL` | não | `claude-opus-5-5` | Troca o modelo sem deploy de código (por exemplo, para testar `claude-sonnet-5-5` se o custo pesar) |

`src/env.ts` valida as duas como `z.string().min(1).optional()`; `.env.example` ganha as duas linhas com comentário. O cliente do SDK é criado uma vez por processo e só quando há chave (`new Anthropic({ apiKey, timeout: 55_000, maxRetries: 2 })`); nunca `new Anthropic()` sem argumento, para não ler credencial de perfil local por acidente.

Como os testes rodam sem chave e com `vi.mock("@anthropic-ai/sdk")`, o teste de `runStructured` injeta a chave por `vi.stubEnv` só no próprio arquivo e confere a forma exata da chamada (modelo, `max_tokens`, `betas`, `fallbacks`, `cache_control`, `output_config`, ausência de `thinking` e de mensagem `assistant`).

## 10. O que fica fora agora e por quê

### 10.1 Agente de voz para retorno de leads

**O que seria.** O CRM liga para o lead que pediu diagnóstico, se apresenta como assistente da Prospekto, faz três ou quatro perguntas de qualificação e propõe dois horários; a Daniela recebe o resumo e a reunião marcada.

**Por que não agora.** Depende de (a) conta de telefonia com voz em tempo real e número brasileiro (Twilio com ConversationRelay ou similar [verificar disponibilidade de número 0800 ou local no RS e custo por minuto]); (b) parecer jurídico: a Anatel regula telemarketing ativo (Resolução 765/2024 e o prefixo 0303 obrigatório para chamadas ativas de oferta [verificar se o retorno a quem pediu contato é "ativo"]), a LGPD exige informar que a voz é sintética e que a chamada é tratada por IA, e o PL 2338/2023 (marco da IA) pode classificar atendimento automatizado com decisão sobre pessoa como risco a documentar [verificar o texto vigente]; (c) consentimento específico: a caixa 1 autoriza "contato por e-mail ou telefone", não diz "por assistente automático" [verificar com o advogado se basta ou se é nova finalidade]; (d) horário: só dentro de janelas comerciais, nunca sábado, domingo ou feriado; (e) gravação e transcrição: onde ficam, por quanto tempo, quem ouve.

**Pré-requisitos antes de uma linha de código.** Contrato de telefonia; parecer jurídico escrito; texto de abertura aprovado pela Daniela ("Olá, aqui é a assistente virtual da Prospekto, da Daniela Copat. Você pediu um diagnóstico no site. Posso fazer três perguntas rápidas para a Daniela preparar a conversa? Se preferir falar direto com ela, é só dizer."); número publicado no site; política de privacidade atualizada; decisão de produto sobre o que o agente **não** faz (não fala de valor, não promete limite, não agenda sem confirmar por e-mail).

### 10.2 WhatsApp automático

**O que seria.** Primeira resposta automática ao lead que chega pelo site com telefone e consentimento, com as mesmas perguntas de qualificação e os mesmos dois horários, e passagem para a Daniela ao primeiro sinal de dúvida.

**Por que não agora.** Depende da WhatsApp Business Platform (conta Meta Business verificada, número dedicado, templates aprovados para mensagens iniciadas pela empresa, custo por conversa [verificar tabela da Meta para o Brasil]); da janela de 24 horas (fora dela só template); e do mesmo parecer jurídico (primeira mensagem identifica a empresa e oferece saída, como já fazemos à mão; `docs/playbooks/campanhas.md`, seção 1.2). O ADR-001 decidiu `wa.me` na Fase 1 justamente por custo e aprovação de templates; a decisão continua.

### 10.3 Como o núcleo de qualificação será reutilizado

`src/lib/ai/qualification.ts` nasce na fundação, puro (sem Next, sem banco, sem SDK), e é a única fonte de:

- `qualificationQuestions(segment, attributes)`: as perguntas certas para o segmento, já descontando o que o lead informou (PJ: regime e quem confirma, faixa de IRPJ e apuração, quem decide, contador na conversa, já usa incentivos; PF: modelo de declaração, imposto devido estimado, contador, já doa com incentivo; CONT: clientes no lucro real, já lançou incentivo, sócio em contato; MUN: setor de cultura, PNAB, dotação; PROP: portaria vigente, saldo e prazo, enquadramento, rubrica de captação; ALUNO: objetivo, experiência). Fonte: `personas-e-funis.md`, seções 5.1, 5.2 e 8.
- `proposeSlots(now, config)`: dois horários dentro das janelas de `src/config/ai.ts`, em dias diferentes, a partir do próximo dia útil, por extenso em português.
- `qualificationRules`: o texto fixo (desqualificações, objeções e respostas curtas, ressalvas legais) que entra no system prompt dos três recursos de hoje e entraria no do agente de voz e do WhatsApp.
- `QualificationOutcome` (tipo): `{ perguntas_respondidas, campos_extraidos, horario_escolhido, encaminhar_para_pessoa }`, o que qualquer agente futuro devolve e o que o CRM gravaria como atividade.

O agente de voz e o de WhatsApp seriam, portanto, um canal novo (voz em tempo real ou mensagens) sobre o mesmo núcleo: as perguntas, as janelas, as regras e a forma do resultado já existem e são testadas em `tests/lib/ai-qualification.test.ts`. O que eles acrescentam é o transporte, a conversa de várias rodadas (hoje é uma chamada só) e as integrações.

## 11. Custo

Preços de `claude-opus-5-5` lidos em `shared/model-migration.md` e `shared/models.md` em 09/10/2026: entrada US$ 4 por milhão de tokens; saída US$ 20; escrita de cache de 5 minutos US$ 5; leitura de cache US$ 0,20. Estimativas por execução (tokens arredondados; o pensamento conta como saída):

| Recurso | System (cache) | Usuário | Saída + pensamento | Custo com cache quente | Custo com cache frio |
|---|---|---|---|---|---|
| Preparar ligação (`medium`) | 1.200 | 2.500 | 2.500 | US$ 0,060 | US$ 0,066 |
| Organizar (`medium`) | 1.000 | 800 | 1.500 | US$ 0,033 | US$ 0,038 |
| Resposta (`low`) | 1.200 | 1.200 | 900 | US$ 0,023 | US$ 0,029 |

Conta do briefing com cache quente: 2.500 × 4 + 1.200 × 0,20 + 2.500 × 20, tudo dividido por 1 milhão, dá US$ 0,0602. Uso esperado (10 a 20 execuções por dia útil, mistas): US$ 0,40 a 0,90 por dia, cerca de **US$ 10 a 20 por mês**. Pior caso com o teto: 200 execuções por dia só de briefing, US$ 12 por dia, US$ 260 por mês de 22 dias úteis, o que é o motivo do teto. Câmbio e a fatura real ficam para a primeira revisão mensal; o painel da Anthropic e a soma de `ai_runs` por mês (`select kind, sum(input_tokens), sum(output_tokens)`) são a conferência. Modo rápido (`speed: "fast"`, dobro do preço) não é usado.

## 12. Alternativas rejeitadas

| Alternativa | Por que não |
|---|---|
| Chamar o modelo direto no Server Component da página | Toda abertura do lead custaria dinheiro e segundos; o briefing é sob demanda e fica gravado em `ai_runs` para reabrir sem gerar de novo |
| Transcrição de áudio por API (Whisper ou similar) | Fornecedor novo, custo, upload de áudio da Daniela para um terceiro a mais; a Web Speech API resolve o caso de uso (ditado curto) sem nada disso |
| Enviar o e-mail de resposta automaticamente quando o lead chega | Viola o princípio 1; a resposta automática do formulário (seção 5.6 de `estrutura-e-copy.md`) já existe e é fixa |
| Modelo menor por padrão (`claude-haiku-5-5`) | O briefing exige leitura cuidadosa de histórico e regras tributárias; o custo por execução no Opus 5.5 já cabe. `AI_MODEL` permite testar outro sem código |
| Guardar os rascunhos em `activities` | Rascunho não é atividade; só vira atividade quando a Daniela envia. `ai_runs` separa o que a máquina sugeriu do que a pessoa fez |
| Agente de voz e WhatsApp automático nesta entrega | Seção 10: dependem de contas, custo e parecer jurídico que não existem hoje |

## 13. Consequências

- Dependência nova em runtime (`@anthropic-ai/sdk`), duas variáveis opcionais, uma tabela e uma migração; os testes continuam sem rede.
- `src/config/site.ts` e `/privacidade` mudam de texto e `policyVersion` avança na publicação (fase de integração do plano).
- O segmento da página do lead passa a exportar `maxDuration = 60`.
- `docs/arquitetura/deploy.md` ganha a variável `ANTHROPIC_API_KEY` na tabela de segredos (opcional) e o aviso de que, sem ela, a IA aparece desabilitada.
- Primeira revisão (um mês após publicar): custo real, taxa de recusa e de corte (`ai_runs.status`), proporção de cache lido, e se a Daniela usa os três recursos; só então decidir sobre esforço `low` no briefing, modelo menor ou o teto.
