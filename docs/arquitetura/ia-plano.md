# Plano de implementação: IA no CRM

> Executa o `ADR-003-ia-no-crm.md` em três fases. A **Fundação** é sequencial e bloqueia as demais; depois, três frentes com arquivos **disjuntos** (A Briefing, B Ditar e organizar, C Resposta sugerida e envio), uma por agente, em paralelo; por fim a **Integração e QA**. Cada frente lista os arquivos que pode tocar, o comportamento exato, o esquema da saída estruturada, os prompts, os critérios de aceite e os testes. Fora da lista de arquivos de uma frente, nada é editado; o que precisar de ajuste em arquivo de outra frente vira nota para a Integração.

## Regras para todos os agentes

1. Ler `AGENTS.md`, `docs/arquitetura/ADR-003-ia-no-crm.md` inteiro, `docs/arquitetura/next16-convencoes.md` e `docs/design/crm-design-system.md` (seções 5.2 e 7.4) antes de escrever código. Antes de escrever qualquer chamada ao SDK, ler a referência da Claude API embutida no ambiente (`claude-api/typescript/claude-api/README.md`, `tool-use.md` seção "Structured Outputs", `shared/prompt-caching.md`, `shared/model-migration.md` seção "Migrating to Claude Opus 5.5"). Nunca escrever uma chamada de memória.
2. Toda `page.tsx` de `src/app/(app)/` e toda Server Action em `src/actions/` começa com `const ctx = await requireSession();` (`tests/auth-guard.test.ts`). `db` só em `src/lib/repos/`, `src/lib/auth.ts`, `scripts/` e `tests/` (R-15). Logs só por `src/lib/log.ts`, com `kind`, `leadId`, modelo e tokens, nunca conteúdo (R-16).
3. Nenhuma chamada ao modelo fora de `runStructured` (`src/lib/ai/client.ts`). Nenhum teste chama a rede: `vi.mock("@anthropic-ai/sdk")` em todo teste que passa por `runStructured`. Não há chave nesta máquina.
4. Nunca `thinking` no corpo da chamada, nunca mensagem `assistant`, nunca `temperature`. Modelo `claude-opus-5-5` por padrão, `max_tokens` 8000 (teto, não alvo: o pensamento do Opus 5.5 conta nele), `output_config.effort` (`medium` para briefing e organizar, `low` para resposta), `betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`, `cache_control` no último bloco do `system`.
5. Só o contexto montado por `src/lib/ai/redact.ts` vai ao modelo (ADR-003, seção 5). Nenhuma frente monta contexto por conta própria.
6. Interface em português do Brasil; identificadores em inglês; nada de id, chave de enum ou nome interno na tela; uma ação primária sólida por tela (D5): nos cartões de IA só "Enviar por e-mail" é sólido.
7. `"use client"` só nos cartões e nas ferramentas de ditado; a página do lead continua Server Component e nunca chama o modelo.
8. Antes de entregar: `npx prettier --write` nos arquivos tocados; `npm run lint && npm run typecheck && npm run format:check && npx vitest run`. Commits em português terminando com as linhas `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` e `Claude-Session: https://claude.ai/code/session_018Cn2BqtAy8gSDPyFtvsYLp`; sem push.
9. Nada de dado pessoal de terceiros em fixtures, prompts de exemplo ou capturas: nomes fictícios e e-mails `@example.test`.

## Decisões fechadas que as frentes precisam saber

| # | Decisão |
|---|---|
| P1 | `AiResult<T>` é a união `{ ok: true; data: T; runId: string; model: string } \| { ok: false; reason: "disabled" \| "quota" \| "refusal" \| "max_tokens" \| "invalid_output" \| "error"; message: string }`. A `message` já vem em português e pronta para a tela (ADR-003, 7.4). As Server Actions devolvem `AiActionState<T> = { status: "idle" } \| { status: "ok"; data: T; runId: string } \| { status: "error"; reason; message }`, compatível com `useActionState`. |
| P2 | O briefing e o rascunho são carregados pela página ao abrir (`getLatestAiRun`) e passados como `initial` aos cartões; os cartões só chamam a action no clique. "Gerar de novo" sempre faz nova chamada. |
| P3 | Os esquemas Zod das saídas ficam em `src/lib/ai/{brief,notes,reply}.ts` junto com os prompts e as funções puras de pós-processamento; as actions só orquestram. Esquemas sem `min`, `max`, `minLength`, `regex` (subconjunto de JSON Schema das saídas estruturadas); limites no prompt e no código. |
| P4 | Mensagem de usuário sempre começa com `Hoje é [dia da semana], [dd/mm/aaaa].` e termina com a instrução do recurso; o system prompt nunca contém data, nome ou id. |
| P5 | A data de "próxima ação" nunca vem pronta do modelo: vem como `em_dias` (inteiro) ou como um dos horários que o código propôs; o código converte para `Date` em `America/Sao_Paulo` às 09:00. |
| P6 | Consentimento para enviar e-mail: `hasConsent(ctx, leadId, "contato_comercial")` e `lead.emailStatus === "ok"`; sem os dois, o botão fica desabilitado e um `Callout warning` explica. WhatsApp: só com `lead.phone` válido (`whatsappHrefFor` não nulo). |
| P7 | A frente B grava atributos da empresa com `updateLead(ctx, { leadId, attributes })` (o repositório mescla com os atuais e revalida por segmento). Só chaves de `ATTRIBUTE_FIELDS[segment]`, nunca as de `vinculo_art27_*`. |
| P8 | `src/config/ai.ts` concentra `AI_DEFAULT_MODEL`, `AI_DAILY_LIMIT = 200`, `AI_MAX_TOKENS = 8_000`, as janelas de horário e o fuso. `site.ts` só muda na Integração (texto de privacidade). |
| P9 | Ordem no celular na página do lead: `AiPanel` recebe `max-lg:order-4` e fica **antes** de `FormSection id="registrar"` no código; os demais `order-*` não mudam. |

## Fase 1: Fundação (um agente, sequencial; cerca de 1 dia)

### Arquivos (criar ou alterar)

- `package.json`: `"@anthropic-ai/sdk": "0.133.0"` em `dependencies` (versão fixa; `npm install` atualiza o `package-lock.json`).
- `.env.example`: `ANTHROPIC_API_KEY=` e `AI_MODEL=` com o comentário "IA (opcional): sem a chave, os recursos de IA aparecem desabilitados; AI_MODEL padrão claude-opus-5-5".
- `src/env.ts`: `ANTHROPIC_API_KEY: z.string().min(1).optional()` e `AI_MODEL: z.string().min(1).optional()`; `tests/lib/env.test.ts` ganha um caso de que as duas são opcionais e de que string vazia em `AI_MODEL` falha (ou é normalizada para `undefined` com `preprocess`, como `EMAIL_FROM`).
- `src/config/ai.ts` (novo):

  ```ts
  export const AI_DEFAULT_MODEL = "claude-opus-5-5";
  export const AI_DAILY_LIMIT = 200;
  export const AI_MAX_TOKENS = 8_000;
  export const AI_TIMEZONE = "America/Sao_Paulo";
  // Janelas em que a Daniela aceita reunião (dias ISO 1 = segunda … 5 = sexta; horas locais).
  export const AI_MEETING_WINDOWS = [
    { days: [1, 2, 3, 4, 5], start: "09:00", end: "11:30" },
    { days: [1, 2, 3, 4, 5], start: "14:00", end: "17:00" },
  ] as const;
  export const AI_SLOT_MINUTES = 30;
  export const AI_SLOT_LEAD_BUSINESS_DAYS = 1; // primeiro horário a partir do próximo dia útil
  ```

- `src/lib/ai/client.ts` (novo, `import "server-only"`): `isAiEnabled()`, `aiModel()`, `runStructured(ctx, input)` conforme ADR-003, 7.2 e 7.4. Cliente criado uma vez (`let client: Anthropic | null`) com `new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 55_000, maxRetries: 2 })`. Importa `betaZodOutputFormat` de `@anthropic-ai/sdk/helpers/beta/zod`. Trata `Anthropic.APIError` por `instanceof` (401 e 403 viram `reason: "error"` com log `warn` "chave da IA inválida"; 429 e 5xx viram `reason: "error"`; nunca string matching). Mede `durationMs` com `performance.now()`. Detecta fallback por `response.usage.iterations?.some((i) => i.type === "fallback_message")`. Reserva a linha em `ai_runs` **antes** da chamada (`reserveAiRun`, `status = "pending"`, atômico por tenant dentro do teto) e a completa **depois** (`finishAiRun`), inclusive em recusa e erro (`status`); nunca grava quando `disabled` ou `quota`.
- `src/lib/ai/redact.ts` (novo, puro): `scrubText(text, { keepCnpj?: boolean })`, `buildLeadContext(input): LeadContext` e `renderLeadContext(ctx: LeadContext, mode: "brief" | "notes" | "reply"): string` (texto em blocos rotulados, uma linha por campo, "não informado" quando vazio). `input` é um tipo próprio (`LeadContextInput`) com os pedaços que a página já tem: `lead: LeadDetail`, `activities: Activity[]`, `consents: Consent[]`, `simulations: Simulation[]`, `contributions: ContributionSummary[]`, `ownerName: string | null`, `projectNames: Map<string, string>`, `now: Date`. Lista fechada de campos conforme ADR-003, 5.1 e 5.2.
- `src/lib/ai/qualification.ts` (novo, puro): `qualificationQuestions(segment, attributes): string[]`, `proposeSlots(now, config?): { iso: string; label: string }[]` (dois horários, dias diferentes, por extenso: "terça-feira, 13 de outubro, às 10h"), `qualificationRules(): string` (texto fixo dos mecanismos, desqualificações, objeções e ressalvas) e o tipo `QualificationOutcome` (ADR-003, 10.3). `proposeSlots` pula sábados e domingos e nunca propõe o dia de hoje; feriados ficam para depois (nota no código).
- `src/lib/ai/types.ts` (novo): `AiKind`, `AiResult<T>`, `AiActionState<T>`, `AiFailureReason` e as mensagens por motivo (`AI_FAILURE_MESSAGES`).
- `src/lib/db/schema/ai-runs.ts` (novo) e a linha `export * from "./ai-runs";` em `src/lib/db/schema/index.ts`; tabela conforme ADR-003, seção 8 (`pgTable("ai_runs", …)`, `check` nos dois `text` enumerados, dois índices). Migração: `npm run db:generate` gera `drizzle/0001_<nome>.sql` e atualiza `drizzle/meta/`; commitar os dois. Aplicar localmente com `npm run db:migrate` (o servidor `next dev` em execução não é reiniciado; a tabela nova não quebra as telas atuais).
- `src/lib/repos/ai-runs.ts` (novo): `reserveAiRun(ctx, { kind, leadId, model, limit, now })` (transação com `pg_advisory_xact_lock` por tenant: conta o dia e insere `pending`, ou devolve `null`), `finishAiRun(ctx, id, input)` (update por id e tenant), `insertAiRun(ctx, input)`, `countAiRunsToday(ctx, now)` (início do dia civil em `America/Sao_Paulo`, calculado com `Intl.DateTimeFormat` como em `src/lib/crm/dates.ts`), `getLatestAiRun(ctx, { leadId, kind })` (só `status = "ok"`), `listAiRuns(ctx, { leadId, limit })`. Todas filtram por `tenant_id`.
- `src/components/crm/ai/ai-panel.tsx` (novo, Server Component): recebe `{ enabled: boolean, lead: AiPanelLead, initialBrief, initialReply, slots, canEmail, emailBlockReason, whatsappHref }` e renderiza `BriefCard` e `ReplyCard` em uma `<section aria-label="Assistente de IA">` com `className="flex flex-col gap-4 max-lg:order-4"`. Quando `enabled` é falso, renderiza um único `Callout tone="info"` "IA não configurada. Cadastre ANTHROPIC_API_KEY nas variáveis do projeto no Vercel e faça Redeploy." e os cartões com os botões desabilitados.
- `src/components/crm/ai/brief-card.tsx` e `src/components/crm/ai/reply-card.tsx` (novos, `"use client"`, **stubs**): cada um renderiza um `Card` com `CardTitle` ("Preparar ligação" e "Resposta sugerida"), uma frase de descrição e um botão `outline` desabilitado ("Gerar briefing" e "Gerar rascunho") com `title="Em construção"`; aceitam já as props finais (seções das frentes A e C) para a página não mudar depois.
- `src/components/crm/ai/dictation.tsx` (novo, `"use client"`, **stub**): `DictationTools({ leadId, segment, enabled, textareaId, onOrganized })` renderiza um `<div>` vazio com `data-ai-dictation`; a frente B preenche.
- `src/components/crm/forms/activity-form.tsx`: só duas linhas: importa `DictationTools` e o renderiza entre `FormMessage` e o `SegmentedControl`, com `textareaId={ids("body").id}`, `leadId`, `segment` (prop nova em `ActivityForm`, passada pela página: `lead.segment`) e `enabled` (prop nova `aiEnabled: boolean`); `onOrganized` fica para a frente B (o stub ignora).
- `src/app/(app)/app/leads/[id]/page.tsx`: `export const maxDuration = 60;` logo após `metadata`; `Promise.all` ganha `getLatestAiRun(ctx, { leadId, kind: "brief" })` e `getLatestAiRun(ctx, { leadId, kind: "reply" })` e `hasConsent(ctx, lead.id, "contato_comercial")`; calcula `slots = proposeSlots(now)` e `aiEnabled = isAiEnabled()`; monta `<AiPanel …/>` no `main` entre o `NextStepCard` e a `FormSection id="registrar"` (P9); passa `segment` e `aiEnabled` ao `ActivityForm`. Nada mais muda na página.
- `tests/lib/ai-client.test.ts`, `tests/lib/ai-redact.test.ts`, `tests/lib/ai-qualification.test.ts`, `tests/repos/ai-runs.test.ts` e um bloco novo em `tests/isolation.test.ts`.

### Comportamento de `runStructured` (contrato que as frentes assumem)

```ts
import { z } from "zod";
export async function runStructured<S extends z.ZodObject<z.ZodRawShape>>(
  ctx: Ctx,
  input: { kind: AiKind; leadId: string | null; system: string; user: string; schema: S; effort: "low" | "medium" },
): Promise<AiResult<z.infer<S>>>;
```

1. `!isAiEnabled()` → `{ ok: false, reason: "disabled", message: "IA não configurada." }`.
2. `await reserveAiRun(ctx, { kind, leadId, model, limit: AI_DAILY_LIMIT, now: new Date() })` devolve `null` → `reason: "quota"`; senão a linha `pending` já existe e conta no teto.
3. Chamada exatamente como no ADR-003, 7.2. `system` é `[{ type: "text", text: input.system, cache_control: { type: "ephemeral" } }]`.
4. `stop_reason === "refusal"` → `reason: "refusal"`; `"max_tokens"` → `reason: "max_tokens"`; sem bloco `text`, JSON inválido ou `schema.safeParse` reprovado → `reason: "invalid_output"`; senão `ok` (a chamada é `create`, não `parse`: ADR-003, 7.1).
5. Em qualquer saída da etapa 3 em diante (inclusive exceção do SDK), `finishAiRun(ctx, runId, …)` completa a linha reservada com `status`, tokens de `response.usage` (zero em exceção), `model` (`response.model` ou o modelo pedido em exceção), `output` (só em `ok`), `data: { effort, fallback, stopDetailsCategory, httpStatus }`, `createdBy: ctx.userId`.
6. `log("info", "ia executada", { kind, leadId, model, status, inputTokens, outputTokens, cacheReadInputTokens, durationMs, fallback })`; em exceção, `log("error", "falha na ia", { kind, leadId, httpStatus })` sem a mensagem bruta.

### Testes da fundação

- `tests/lib/ai-client.test.ts`: `vi.mock("@anthropic-ai/sdk", () => ({ default: class { beta = { messages: { parse: parseMock } } ; static APIError = class extends Error { status = 500 } } }))` (ajustar ao formato de exportação do pacote; conferir em `node_modules/@anthropic-ai/sdk/index.d.ts`) e `vi.mock("@anthropic-ai/sdk/helpers/beta/zod", () => ({ betaZodOutputFormat: (s) => ({ type: "json_schema", schema: s }) }))`. Casos: (1) sem `ANTHROPIC_API_KEY`, devolve `disabled`, `parseMock` não é chamado e `ai_runs` fica vazia; (2) com `vi.stubEnv("ANTHROPIC_API_KEY", "test")`, a chamada recebe `model: "claude-opus-5-5"`, `max_tokens: 8000`, `betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`, `system[0].cache_control.type === "ephemeral"`, `output_config.effort` igual ao pedido, **sem** chave `thinking` e **sem** mensagem `assistant`; (3) `stop_reason: "refusal"` → `reason: "refusal"` e linha `status = "refusal"`; (4) `stop_reason: "max_tokens"` → `max_tokens`; (5) `parsed_output: null` → `invalid_output`; (6) 200 linhas de hoje no tenant → `quota` sem chamada; linhas de ontem não contam; (7) exceção `APIError` 429 → `reason: "error"`, linha `status = "error"` e log sem a mensagem; (8) `AI_MODEL=claude-sonnet-5-5` troca o `model` enviado; (9) `usage.iterations` com `fallback_message` grava `data.fallback = true` e `model` igual ao `response.model`.
- `tests/lib/ai-redact.test.ts`: `scrubText` mascara e-mail, telefone em três formatos, CPF e CNPJ (e preserva CNPJ com `keepCnpj`); `buildLeadContext` com um `LeadDetail` completo **não** contém `email`, `phone`, `cnpj`, `ipHash`, valores de `simulations.inputs` nem ids de 36 caracteres (`expect(JSON.stringify(context)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/)`); limita atividades a 20 e `body` a 600 caracteres; `source_detail` com `?` é omitido; chave desconhecida em `attributes` é omitida; `renderLeadContext(…, "notes")` traz só o primeiro nome.
- `tests/lib/ai-qualification.test.ts`: `proposeSlots` em uma sexta-feira às 16h devolve segunda e terça seguintes dentro das janelas; numa segunda às 10h devolve terça e quarta; nunca sábado ou domingo; rótulos em português com fuso `America/Sao_Paulo`; `qualificationQuestions("PJ", { regime_tributario: "lucro_real" })` não pergunta o regime; cada segmento devolve entre 3 e 6 perguntas.
- `tests/repos/ai-runs.test.ts`: inserção, `countAiRunsToday` na virada do dia em São Paulo (23h50 e 00h10 locais), `getLatestAiRun` ignora `status != "ok"`.
- `tests/isolation.test.ts`: dois tenants, uma `ai_run` em cada; `getLatestAiRun` e `countAiRunsToday` de um não enxergam o outro.

### Critérios de aceite da fundação

- `npm run lint && npm run typecheck && npm run format:check && npx vitest run` verdes; `tests/auth-guard.test.ts` continua verde (nenhuma action nova ainda).
- `grep -rn "new Anthropic(" src` devolve só `src/lib/ai/client.ts`; `grep -rn "thinking" src/lib/ai` devolve zero linhas de código (comentário permitido).
- `drizzle/0001_*.sql` cria `ai_runs` com os dois `CHECK`, as FKs e os dois índices; `npm run db:migrate` aplica no PGlite local sem erro.
- A página do lead renderiza com `ANTHROPIC_API_KEY` ausente: `Callout` "IA não configurada", botões desabilitados, `maxDuration` exportado, nenhuma linha em `ai_runs` ao abrir (conferir com `npm run db:studio` ou um teste de página futuro).
- Capturas de `/app/leads/[id]` em 1440 e 390 px em `scratchpad/shots/ia-fundacao/` mostrando o painel desabilitado abaixo do `NextStepCard`.

## Fase 2: três frentes em paralelo (um agente por frente)

Pré-condição: fundação integrada no branch base. Cada frente edita só os arquivos listados. Os cartões recebem `initial` (P2) e usam `useActionState`; estado de carregamento com `aria-busy` e `Skeleton`; erro com `Callout warning`; o texto do erro é a `message` do `AiActionState`.

### Frente A: Preparar ligação (briefing)

Arquivos: `src/lib/ai/brief.ts`, `src/actions/ai-brief.ts`, `src/components/crm/ai/brief-card.tsx`, `tests/lib/ai-brief.test.ts`, `tests/actions/ai-brief.test.ts`.

**Comportamento.** O cartão "Preparar ligação" abre com o último briefing gravado (se houver) e a linha "Gerado em 09/10, 14:10 · modelo Claude" em `.crm-meta`, ou vazio com o botão `outline` "Gerar briefing". Ao clicar, a action monta o contexto (`buildLeadContext` com tudo o que a página já carrega, por isso a action **recarrega** os dados pelos repositórios a partir do `leadId`: `getLeadDetail`, `listActivities`, `listConsents`, `listSimulations`, `listContributionSummaries`, `listTenantUsers`, `listProjects`), chama `runStructured` com `effort: "medium"` e devolve o briefing. O cartão mostra: Resumo (parágrafo); Gancho de abertura (citação em `border-l-[3px] border-l-brand`, com botão "Copiar"); Pontos de atenção (lista com `TriangleAlert`); Perguntas a fazer (lista numerada, com `<input type="checkbox">` só visual para marcar durante a ligação, sem persistência); Objeções prováveis (`<details>` por objeção com a resposta curta); Próximo passo sugerido (frase e prazo) e "O que falta saber" (lista). Rodapé: "Gerar de novo" (`outline`, `size="sm"`) e a nota "Sugestão da IA a partir do histórico do CRM. Confira antes de usar." em `.crm-meta`. Nada do briefing é gravado em `activities`.

**Esquema da saída** (`briefSchema` em `brief.ts`):

```ts
export const briefSchema = z.object({
  resumo: z.string().describe("Três a cinco frases: quem é, o que pediu, em que ponto está."),
  gancho_abertura: z.string().describe("Uma ou duas frases para abrir a ligação, na voz da Daniela, citando um fato do histórico."),
  pontos_atencao: z.array(z.string()).describe("Até seis itens: riscos, prazos, desqualificação possível, pendências."),
  perguntas: z.array(z.string()).describe("Três a sete perguntas de qualificação ainda não respondidas, na ordem."),
  objecoes_provaveis: z.array(z.object({ objecao: z.string(), resposta: z.string() })).describe("Até cinco."),
  proximo_passo: z.object({
    acao: z.string().describe("Uma frase imperativa."),
    prazo: z.enum(["hoje", "amanha", "esta_semana", "proxima_semana"]),
  }),
  lacunas: z.array(z.string()).describe("Até seis dados que faltam no CRM e que mudariam a abordagem."),
});
```

Pós-processamento puro `normalizeBrief(raw)`: corta as listas nos limites (6, 7, 5, 6), remove itens vazios e duplicados, `trim`. `BRIEF_SYSTEM` é a constante com o prompt abaixo seguido de `qualificationRules()`.

**System prompt** (`BRIEF_SYSTEM`):

> Você prepara a Daniela Sandrin Copat, consultora da Prospekto Consultoria & Projetos (Serra Gaúcha, RS), para uma ligação ou reunião com um lead do CRM. A Prospekto capta patrocínio incentivado para projetos culturais (Lei Rouanet art. 18 e 26, Lei do Audiovisual art. 1º-A, LIC-RS), elabora projetos e presta consultoria a empresas, escritórios contábeis, municípios e proponentes.
>
> Sua tarefa: a partir dos dados do CRM que vêm na mensagem, devolver um briefing curto e útil, em português do Brasil, só com o que está nos dados. Regras: 1) Nunca invente fato, número, nome ou data; quando faltar, escreva "não informado" e inclua o item em "lacunas". 2) Nunca prometa dedução, valor ou prazo: use "até 4% do IRPJ devido (3,6% com a LC 224/2025); o cálculo final é do contador" para PJ e "até 6% do IR devido, declaração completa" para PF. 3) Respeite as regras de desqualificação: Simples Nacional ou lucro presumido não usam Rouanet nem Audiovisual (ofereça LIC-RS se contribuinte de ICMS no RS); PF com declaração simplificada está fora. 4) Patrocínio não devolve dinheiro ao patrocinador; vínculo entre patrocinador e proponente (art. 27) bloqueia a combinação. 5) Tom: direto, cordial, sem jargão, sem adjetivos vazios; frases curtas. 6) As perguntas devem ser as que ainda não foram respondidas no CRM, na ordem em que a Daniela faria numa conversa de 15 a 30 minutos. 7) O gancho de abertura cita um fato concreto do histórico (o formulário preenchido, a simulação, a última conversa) e termina com uma pergunta aberta. 8) Responda só com o JSON pedido.
>
> [qualificationRules()]

**Mensagem de usuário** (`briefUserMessage(context: LeadContext, now: Date)`):

> Hoje é [dia da semana], [dd/mm/aaaa].
>
> DADOS DO LEAD
> [renderLeadContext(context, "brief")]
>
> Com base só nesses dados, prepare o briefing para a próxima ligação ou reunião. Estágio atual e prazo do estágio importam para o próximo passo.

**Action** (`src/actions/ai-brief.ts`): `generateBriefAction(prev: AiActionState<Brief>, formData: FormData)`: `requireSession`; valida `leadId` com `uuidSchema`; carrega os dados pelos repositórios (404 lógico vira `status: "error"` "Lead não encontrado."); `runStructured(ctx, { kind: "brief", leadId, system: BRIEF_SYSTEM, user, schema: briefSchema, effort: "medium" })`; devolve `{ status: "ok", data: normalizeBrief(result.data), runId }` ou o erro. Sem `refresh()` (o cartão já tem o dado).

**Critérios de aceite.**

- Com `vi.mock`, `tests/actions/ai-brief.test.ts` prova que: a action começa com `requireSession` (teste de guarda já cobre); a mensagem de usuário enviada ao `parseMock` contém o nome do lead, a empresa, o rótulo do estágio em português e "Hoje é", e **não** contém o e-mail, o telefone, o CNPJ nem nenhum uuid; o `system` enviado é byte a byte igual a `BRIEF_SYSTEM` em duas chamadas seguidas (cache); `effort` é `medium`; recusa devolve `status: "error"` com a mensagem do ADR; sucesso grava uma linha `ai_runs` com `kind = "brief"`, `lead_id` e `output` igual ao normalizado.
- `tests/lib/ai-brief.test.ts`: `normalizeBrief` corta listas, remove vazios e duplicados; `briefSchema` aceita o JSON de exemplo e recusa `prazo` fora do enum.
- Na tela (1440 e 390 px, capturas em `scratchpad/shots/ia-A/`): o cartão vazio tem um único botão; durante a geração o botão fica `disabled` com "Gerando…" e o cartão `aria-busy="true"`; o resultado mostra as sete seções; "Copiar" copia só o gancho (`navigator.clipboard`) e mostra toast "Copiado."; ao recarregar a página o briefing continua lá (vem de `ai_runs`); com a chave ausente aparece "IA não configurada" e nenhum botão habilitado.
- Nenhuma string do briefing aparece em `console` (conferir no teste que o `log` recebe só os campos permitidos).

### Frente B: Ditar e organizar

Arquivos: `src/lib/ai/notes.ts`, `src/actions/ai-notes.ts`, `src/components/crm/ai/dictation.tsx`, `src/components/crm/forms/activity-form.tsx`, `tests/lib/ai-notes.test.ts`, `tests/actions/ai-notes.test.ts`.

**Comportamento do ditado** (`dictation.tsx`): ao montar, detecta `window.SpeechRecognition ?? window.webkitSpeechRecognition`; sem suporte, o botão "Ditar" não renderiza e aparece "Ditado disponível no Chrome e no Edge." em `.crm-meta`. Com suporte: botão `outline` "Ditar" com ícone `Mic`, `aria-pressed`; ao ligar, cria `recognition` com `lang = "pt-BR"`, `continuous = true`, `interimResults = true`; resultados finais são anexados ao `textarea` (pelo `textareaId`, com espaço e disparando `input` para o React e o `DateHint` não perderem o estado); resultado parcial aparece em um `<span aria-live="polite">` ao lado do botão; "Parar" desliga; `error` do tipo `not-allowed` mostra "Permita o microfone no navegador."; o reconhecimento é encerrado no `unmount`. Aviso fixo ao lado: "O reconhecimento de voz é do navegador." Nenhum áudio vai ao servidor.

**Comportamento do organizar.** Botão `outline` "Organizar com IA" (ícone `Sparkles`), desabilitado quando `!enabled` (`Tooltip` "IA não configurada") ou quando o textarea tem menos de 20 caracteres. Ao clicar, chama `organizeNotesAction` com `leadId`, `segment` e o texto; enquanto roda, "Organizando…". O resultado aparece em um `Callout tone="info"` com título "Sugestão da IA" e: tipo de atividade proposto (`Badge`), assunto, resumo (em `<p className="whitespace-pre-line">`), próxima ação proposta ("Enviar proposta · em 3 dias"), tarefas detectadas (lista), campos da empresa detectados (lista "Regime tributário: Lucro real") e incertezas ("Não ficou claro se o contador participa"). Dois botões: "Aplicar ao formulário" (`outline`), que chama `onOrganized(result)` e o `ActivityForm` aplica: `setType(tipo)`, assunto no `TextField name="subject"`, resumo **substitui** o conteúdo do textarea (o texto ditado original fica guardado em `useRef` e um link "Desfazer" o restaura), próxima ação no `nextActionAt` (data calculada por P5) e, se houver tarefas, elas vão para o fim do resumo como "Combinados: …" (tarefas como atividades separadas ficam para depois; nota); e "Salvar campos da empresa" (`outline`, só quando há campos), que chama `applyLeadAttributesAction` e mostra toast "Campos salvos." seguido de `refresh()` pela própria action. A sugestão nunca é gravada sozinha: o registro continua pelo botão "Registrar" existente.

**Esquema da saída** (`notesSchemaFor(segment)` em `notes.ts`, dinâmico por segmento):

```ts
const attributeKeysFor = (segment: LeadSegment) =>
  ATTRIBUTE_FIELDS[segment].map((f) => f.key).filter((k) => !k.startsWith("vinculo_art27"));

export const notesSchemaFor = (segment: LeadSegment) =>
  z.object({
    tipo: z.enum(["ligacao", "reuniao", "email", "whatsapp", "visita", "nota"]),
    assunto: z.string().describe("Até 80 caracteres, sem ponto final."),
    resumo: z.string().describe("O que aconteceu, em primeira pessoa da Daniela, até 8 frases, em parágrafos curtos."),
    proxima_acao: z
      .object({ descricao: z.string(), em_dias: z.number().int().describe("0 = hoje, 1 = amanhã; dias corridos.") })
      .nullable(),
    tarefas: z.array(z.string()).describe("Compromissos assumidos por qualquer das partes, um por item."),
    campos_extraidos: z.array(
      z.object({
        chave: z.enum(attributeKeysFor(segment) as [string, ...string[]]),
        valor: z.string().describe("Para campos de escolha, exatamente um dos valores permitidos; para sim/não, 'true' ou 'false'."),
      }),
    ),
    incertezas: z.array(z.string()).describe("O que ficou ambíguo no relato."),
  });
```

Pós-processamento puro `normalizeNotes(raw, segment)`: corta `assunto` em 80, listas em 8; converte `campos_extraidos` para `Record<string, unknown>` passando cada valor por `parseAttributes(segment, { [chave]: valor })` dentro de `try` e descartando o que não valida (o que foi descartado volta em `incertezas` como "Valor não reconhecido para Regime tributário: 'real'"); `em_dias` fora de 0 a 60 vira `null`.

**System prompt** (`NOTES_SYSTEM`):

> Você organiza as anotações que a Daniela Sandrin Copat, consultora da Prospekto (captação de patrocínio cultural incentivado e consultoria em leis de incentivo, Serra Gaúcha, RS), ditou ou colou depois de uma conversa com um lead. O relato é falado: pode ter repetições, hesitações, frases incompletas e erros de reconhecimento de voz.
>
> Sua tarefa: devolver, em português do Brasil, o registro pronto para o CRM. Regras: 1) Só o que está no relato; nada de inferir dados que não foram ditos. Dúvida vai em "incertezas". 2) "tipo" é o canal da conversa (ligação, reunião, e-mail, WhatsApp, visita); use "nota" quando não houve contato com o lead. 3) "assunto" resume em poucas palavras ("Ligação: contador confirma lucro real"). 4) "resumo" é escrito na voz da Daniela, em primeira pessoa, sem floreio, mantendo nomes, valores e datas exatamente como ditos; não corrija números. 5) "proxima_acao" é a ação seguinte combinada ou implícita, com o prazo em dias corridos a partir de hoje; se nada foi combinado, null. 6) "campos_extraidos" só com informação explícita da conversa, usando as chaves e os valores permitidos; nunca invente. CNPJ só se foi dito, com 14 dígitos. 7) Nunca escreva e-mail, telefone ou CPF no resumo; se aparecerem no relato, escreva "[contato informado]". 8) Responda só com o JSON pedido.
>
> Chaves e valores permitidos de "campos_extraidos" para este segmento: [tabela gerada de ATTRIBUTE_FIELDS[segment] com rótulo, chave e opções; é parte do system porque é estável por segmento]

Como o system varia por segmento, há seis prefixos de cache; aceitável (ADR-003, 7.1).

**Mensagem de usuário** (`notesUserMessage(context, text, now)`):

> Hoje é [dia da semana], [dd/mm/aaaa].
>
> LEAD (só para contexto; não repita o que já está preenchido)
> [renderLeadContext(context, "notes")]
>
> RELATO DITADO OU COLADO
> """
> [scrubText(text, { keepCnpj: true })]
> """
>
> Organize o relato no formato pedido.

**Actions** (`src/actions/ai-notes.ts`): `organizeNotesAction(prev: AiActionState<Notes>, formData)` (campos `leadId`, `text`; `text` entre 20 e 8.000 caracteres; carrega `getLeadDetail` e as 5 últimas atividades; `runStructured` com `kind: "notes"`, `effort: "medium"`, `schema: notesSchemaFor(lead.segment)`); `applyLeadAttributesAction(prev: CrmActionState, formData)` (campos `leadId` e `attributes` em JSON string; valida que toda chave está em `attributeKeysFor(segment)`; `updateLead(ctx, { leadId, attributes })`; `refresh()`; devolve `{ status: "ok", message: "Campos salvos." }`). As duas começam com `requireSession`.

**Critérios de aceite.**

- `tests/actions/ai-notes.test.ts` (com `vi.mock` do SDK): o texto enviado ao modelo tem o e-mail e o telefone ditados mascarados e o CNPJ preservado; o `system` para `PJ` contém "regime_tributario" e "lucro_real" e não contém data; `effort` é `medium`; a resposta com `campos_extraidos: [{ chave: "regime_tributario", valor: "lucro real" }]` (valor inválido) chega à tela com o campo em `incertezas` e sem o campo; `applyLeadAttributesAction` com `{ regime_tributario: "lucro_real" }` atualiza o lead e recalcula o score (ver `activities.sistema` com `reason: "score"`); chave `vinculo_art27_checado` é recusada.
- `tests/lib/ai-notes.test.ts`: `normalizeNotes` corta e valida; `notesSchemaFor("CONT")` não aceita `chave: "regime_tributario"`; `em_dias: 90` vira `null`.
- Na tela (capturas em `scratchpad/shots/ia-B/`; o Chromium do Playwright não tem reconhecimento de voz, então o ditado é testado à mão no Chrome e o botão "Ditar" não aparece na captura, o que é o comportamento esperado para "sem suporte"): colar um relato de 300 palavras e clicar em "Organizar com IA" mostra o `Callout` em menos de 30 s; "Aplicar ao formulário" muda o `SegmentedControl` para o tipo proposto, preenche assunto, substitui o texto e preenche "Próxima ação" às 09:00 do dia calculado, com o `DateHint` atualizado; "Desfazer" restaura o texto original; "Registrar" grava a atividade pelo fluxo existente com toast "Contato registrado. Próxima ação: …"; com a chave ausente o botão está desabilitado com o tooltip.
- `grep -n "fetch(" src/components/crm/ai/dictation.tsx` devolve zero (nenhum áudio ou texto sai por outro caminho além da Server Action).

### Frente C: Resposta sugerida e envio

Arquivos: `src/lib/ai/reply.ts`, `src/actions/ai-reply.ts`, `src/actions/lead-email.ts`, `src/lib/email/templates/lead-reply.ts`, `src/components/crm/ai/reply-card.tsx`, `tests/lib/ai-reply.test.ts`, `tests/lib/lead-reply-template.test.ts`, `tests/actions/ai-reply.test.ts`, `tests/actions/lead-email.test.ts`.

**Comportamento.** Cartão "Resposta sugerida" com `SegmentedControl` (E-mail, WhatsApp; padrão E-mail quando o lead tem e-mail com status `ok`, senão WhatsApp). Botão `outline` "Gerar rascunho". O resultado: para e-mail, `TextField` "Assunto" e `TextareaField` "Mensagem" (8 linhas) editáveis; para WhatsApp, só a mensagem. Abaixo, "Horários propostos: terça-feira, 13 de outubro, às 10h · quinta-feira, 15 de outubro, às 15h" em `.crm-meta` (os mesmos que estão no texto). Ações: e-mail → botão sólido "Enviar por e-mail" dentro de um `ConfirmDialog` ("Enviar este e-mail para [primeiro nome]? Ele sai do endereço da Prospekto e fica registrado na linha do tempo."); WhatsApp → `outline` "Abrir no WhatsApp" (link `wa.me` com o texto atual do textarea, `target="_blank"`), e depois do clique aparece "Enviou? [Registrar no histórico]" (`outline`, `size="sm"`) que chama `recordWhatsappReplyAction`. Rodapé: "Gerar de novo" e a nota "Rascunho da IA na voz da Daniela. Edite antes de enviar.". Quando `canEmail` é falso, a opção E-mail continua selecionável para gerar o texto (pode ser copiado), mas "Enviar por e-mail" fica desabilitado com `Callout warning` "Sem consentimento de contato comercial registrado para este lead" ou "O e-mail deste lead foi devolvido", conforme `emailBlockReason`. Sem telefone, a opção WhatsApp fica desabilitada ("sem telefone").

**Esquema da saída** (`replySchema` em `reply.ts`):

```ts
export const replySchema = z.object({
  assunto: z.string().nullable().describe("Só para e-mail; até 70 caracteres. null no WhatsApp."),
  texto: z.string().describe("A mensagem completa, pronta para enviar, com saudação e assinatura."),
  perguntas_incluidas: z.array(z.string()).describe("As perguntas de qualificação que entraram no texto, para conferência."),
  horarios_incluidos: z.array(z.string()).describe("Os dois horários propostos, exatamente como escritos no texto."),
});
```

Pós-processamento puro `normalizeReply(raw, { channel, slots, isFirstContact })`: garante que os dois `slots[i].label` aparecem em `texto` (se faltar um, acrescenta o parágrafo "Tenho horários [a] e [b]. Qual prefere?" antes da assinatura); no WhatsApp, garante que o texto termina com `Responda SAIR se não quiser mensagens por aqui.` em parágrafo próprio, depois da assinatura, quando é a primeira mensagem (`isFirstContact`: estágio inicial e sem `lastContactAt`), remove a frase quando não é, e limita a 900 caracteres; no e-mail, `assunto` obrigatório (padrão "Sobre o seu contato com a Prospekto") e sem quebras de linha; remove qualquer e-mail, telefone ou URL que o modelo tenha inventado, do texto e do assunto (`scrubText` e regex de URL com caminho, TLD conhecido ou de país, inclusive encurtadores como `bit.ly/x`; exceto `prospekto.com.br`).

**System prompt** (`REPLY_SYSTEM`):

> Você escreve a resposta da Daniela Sandrin Copat, da Prospekto Consultoria & Projetos (Serra Gaúcha, RS), a um lead que chegou pelo site, por indicação, por evento ou pelo LinkedIn (a mensagem de usuário diz se é o PRIMEIRO CONTATO; só nele cabem a apresentação e a frase do que a Prospekto faz). A Prospekto capta patrocínio incentivado para projetos culturais da região (Lei Rouanet art. 18 e 26, Lei do Audiovisual art. 1º-A, LIC-RS), elabora projetos e presta consultoria a empresas, escritórios contábeis, municípios e proponentes.
>
> Voz da Daniela: cordial e direta, primeira pessoa, frases curtas, nada de "espero que este e-mail o encontre bem", nada de superlativos, nada de promessa que a lei não sustenta. Números sempre com ressalva: "até 4% do IRPJ devido (3,6% com a LC 224/2025); o cálculo final é do seu contador" para empresa no lucro real; "até 6% do IR devido, na declaração completa" para pessoa física. Simples Nacional e lucro presumido não usam Rouanet nem Audiovisual: para esses, ofereça a LIC-RS se a empresa recolhe ICMS no RS, ou diga com franqueza que não há dedução federal. Patrocínio não devolve dinheiro.
>
> Estrutura: saudação com o primeiro nome; uma frase que cita o que a pessoa fez (formulário, simulação, guia, conversa); uma frase do que a Prospekto faz por esse perfil; as perguntas de qualificação (as da mensagem de usuário, no máximo três no WhatsApp e quatro no e-mail, em lista no e-mail e em frases corridas no WhatsApp); a proposta dos dois horários que vêm na mensagem, escritos exatamente como recebidos, com "Qual prefere?"; assinatura só "Daniela" no e-mail (o CRM acrescenta nome completo, empresa e contatos) e "Daniela, da Prospekto" no WhatsApp. No WhatsApp, quando PRIMEIRO CONTATO é sim, a mensagem termina com "Responda SAIR se não quiser mensagens por aqui.". No WhatsApp o texto cabe em 900 caracteres. Nunca escreva e-mail, telefone ou link; o CRM acrescenta a assinatura completa. Só o que está nos dados; nada inventado. Responda só com o JSON pedido.
>
> [qualificationRules()]

**Mensagem de usuário** (`replyUserMessage(context, { channel, questions, slots, now, isFirstContact })`):

> Hoje é [dia da semana], [dd/mm/aaaa].
>
> CANAL: [e-mail | WhatsApp]
>
> PRIMEIRO CONTATO: [sim | não: já houve conversa (veja Último contato e ÚLTIMAS ATIVIDADES); não se apresente de novo nem explique o que a Prospekto faz; retome do último contato e não use a frase de saída]
>
> DADOS DO LEAD
> [renderLeadContext(context, "reply")]
>
> PERGUNTAS DE QUALIFICAÇÃO A INCLUIR (nesta ordem; use as primeiras)
> [qualificationQuestions(segment, attributes), uma por linha]
>
> HORÁRIOS A PROPOR (escreva exatamente assim)
> 1. [slots[0].label]
> 2. [slots[1].label]
>
> Escreva a resposta.

**Actions.** `src/actions/ai-reply.ts`: `generateReplyAction(prev: AiActionState<Reply>, formData)` com `leadId` e `channel` (`email` | `whatsapp`); `requireSession`; carrega o lead e o contexto; `slots = proposeSlots(now)`; `runStructured` com `kind: "reply"`, `effort: "low"`; devolve `normalizeReply` mais `slots`. `recordWhatsappReplyAction(prev: CrmActionState, formData)` com `leadId`, `text` e `slotIso`: `recordLeadActivity(ctx, { leadId, activity: { type: "whatsapp", subject: "Primeira resposta pelo WhatsApp", body: text, data: { ai: true } }, touchLastContact: true, nextActionAt: new Date(slotIso) })`; `refresh()`. `src/actions/lead-email.ts`: `sendLeadReplyAction(prev: CrmActionState, formData)` com `leadId`, `subject` (1 a 150), `text` (20 a 8.000), `slotIso`, `runId` (opcional): `requireSession`; `getLeadDetail`; exige `hasConsent(ctx, leadId, "contato_comercial")` e `emailStatus === "ok"` (senão `fail` com a mesma frase do `Callout`); renderiza com `renderLeadReply`; `sendEmail({ to: lead.email, subject, text, html, replyTo: site.email, templateId: "lead-reply", leadId })`; se `delivered` for falso em modo `error`, `fail("Não foi possível enviar o e-mail. Tente de novo em instantes.")` sem gravar atividade; em modo `log` (sem `RESEND_API_KEY`, local) grava a atividade mesmo assim com `data.mode = "log"` para o fluxo ser testável; `recordLeadActivity` com `type: "email"`, `subject`, `body: text`, `data: { ai: true, runId, mode }`, `touchLastContact: true`, `nextActionAt: new Date(slotIso)`; `refresh()`; `{ status: "ok", message: "E-mail enviado e registrado." }`. O e-mail do lead nunca aparece no `log` (a `sendEmail` já cuida).

**Template** (`src/lib/email/templates/lead-reply.ts`): `renderLeadReply({ subject, body }): RenderedEmail`. Texto: `body` como veio (já tem saudação e assinatura curta), linha em branco, bloco de assinatura `site.owner` / `site.name` / `site.email · WhatsApp site.whatsappDisplay` / `site.city`, linha em branco, `site.disclaimer`. HTML: `<p>` por parágrafo com `escapeHtml` (reutilizar de `layout.ts`), mesma assinatura, sem `List-Unsubscribe` (não é marketing). Não usa `renderEmail` porque não é resposta automática (não tem "você recebe este e-mail porque").

**Critérios de aceite.**

- `tests/actions/ai-reply.test.ts`: a mensagem de usuário contém as duas linhas de horário e as perguntas do segmento, e não contém e-mail, telefone nem uuid; `effort` é `low`; resposta sem um dos horários recebe o parágrafo acrescentado por `normalizeReply`; no WhatsApp para lead `novo` sem contato o texto termina com a frase de saída; texto com e-mail inventado sai mascarado.
- `tests/actions/lead-email.test.ts` (com `vi.spyOn(console, "log")` e sem `RESEND_API_KEY`, como `tests/lib/email.test.ts`): sem consentimento devolve erro e não grava atividade; com consentimento e e-mail `ok`, grava `activities.email` com `body` igual ao texto, atualiza `last_contact_at` e `next_action_at` para o horário escolhido, e o log traz `templateId = "lead-reply"` e `leadId` sem o endereço; `emailStatus = "bounced"` bloqueia; `recordWhatsappReplyAction` grava `activities.whatsapp`.
- `tests/lib/lead-reply-template.test.ts`: texto e HTML contêm a assinatura com cidade e a ressalva; HTML escapa `<`; não contém "você recebe este e-mail".
- `tests/lib/ai-reply.test.ts`: `replySchema` e `normalizeReply` (limite de 900 no WhatsApp, assunto padrão, remoção de URL inventada, preservação de `prospekto.com.br`).
- Na tela (capturas em `scratchpad/shots/ia-C/`): gerar, editar o texto, confirmar no `ConfirmDialog`, ver o toast "E-mail enviado e registrado." e a atividade "E-mail" no topo da linha do tempo com a próxima ação igual ao primeiro horário; na aba WhatsApp o link `wa.me` leva o texto **editado** (conferir o `href` após editar); lead sem consentimento mostra o `Callout` e o botão desabilitado; lead sem telefone mostra a aba desabilitada.

## Fase 3: Integração e QA (um agente)

Arquivos: tudo o que as frentes anotaram, mais `src/config/site.ts`, `src/app/(site)/privacidade/page.tsx`, `docs/arquitetura/deploy.md`, `docs/README.md`, `README.md` (seção de variáveis, se existir), `.env.example` (se alguma frente precisou de variável nova, o que não é esperado).

1. Integrar os três branches sobre a fundação; resolver conflitos só em `activity-form.tsx` (frente B) e nos stubs substituídos.
2. Privacidade (ADR-003, 6.4): `site.consent.footer` passa a citar "inteligência artificial para apoio ao atendimento"; `/privacidade`, item 6, ganha o provedor, a frase sobre revisão humana, retenção de até 30 dias, não uso em treinamento, reconhecimento de voz do navegador e a transferência internacional [verificar com o advogado]; `site.policyVersion` passa para a data da publicação; `tests/site/*` e `tests/lib/copy-rules.test.ts` ajustados se citarem o texto antigo.
3. `docs/arquitetura/deploy.md`: `ANTHROPIC_API_KEY` (opcional) e `AI_MODEL` (opcional) na tabela de variáveis; frase "sem a chave, os recursos de IA aparecem desabilitados"; passo "Redeploy" depois de cadastrar.
4. QA de ponta a ponta no servidor de demonstração (`http://localhost:3000`, que não tem chave): a página do lead com os três cartões desabilitados e o formulário com "Ditar" (no Chrome) e "Organizar com IA" desabilitado; capturas em `scratchpad/shots/ia-integracao/` em 1440 e 390 px; nenhuma rolagem horizontal; `Tab` percorre `NextStepCard` → cartões de IA → formulário; cada botão desabilitado tem `Tooltip` ou texto explicando o motivo.
5. QA com chave (só se o dono do projeto fornecer uma chave de teste em `.env.local` de uma árvore separada; nunca commitar): um briefing, um organizar e um rascunho por canal; conferir em `ai_runs` que `cache_read_input_tokens` é maior que zero a partir da segunda chamada do mesmo recurso em 5 minutos; conferir no log que não há conteúdo.
6. `npm run lint && npm run typecheck && npm run format:check && npx vitest run && npm run build`; `tests/auth-guard.test.ts` cobre as quatro actions novas (`ai-brief.ts`, `ai-notes.ts`, `ai-reply.ts`, `lead-email.ts`).
7. Atualizar `docs/README.md` (já feito na entrega dos docs) e o `README.md` da raiz se listar variáveis; commit "feat(crm): IA no CRM: briefing, ditar e organizar, resposta sugerida (ADR-003)".
8. Orientar o dono do projeto: onde cadastrar a chave no Vercel, como acompanhar o custo (painel da Anthropic e `select kind, count(*), sum(input_tokens), sum(output_tokens) from ai_runs where created_at >= date_trunc('month', now()) group by kind`) e o que revisar em um mês (ADR-003, seção 13).

## Inventário de arquivos por fase (referência rápida)

| Fase ou frente | Novos | Alterados |
|---|---|---|
| Fundação | `src/config/ai.ts`, `src/lib/ai/{client,redact,qualification,types}.ts`, `src/lib/db/schema/ai-runs.ts`, `drizzle/0001_*.sql` (+ `meta`), `src/lib/repos/ai-runs.ts`, `src/components/crm/ai/{ai-panel,brief-card,reply-card,dictation}.tsx`, `tests/lib/{ai-client,ai-redact,ai-qualification}.test.ts`, `tests/repos/ai-runs.test.ts` | `package.json`, `package-lock.json`, `.env.example`, `src/env.ts`, `src/lib/db/schema/index.ts`, `src/components/crm/forms/activity-form.tsx` (duas linhas), `src/app/(app)/app/leads/[id]/page.tsx`, `tests/isolation.test.ts`, `tests/lib/env.test.ts` |
| A | `src/lib/ai/brief.ts`, `src/actions/ai-brief.ts`, `tests/lib/ai-brief.test.ts`, `tests/actions/ai-brief.test.ts` | `src/components/crm/ai/brief-card.tsx` |
| B | `src/lib/ai/notes.ts`, `src/actions/ai-notes.ts`, `tests/lib/ai-notes.test.ts`, `tests/actions/ai-notes.test.ts` | `src/components/crm/ai/dictation.tsx`, `src/components/crm/forms/activity-form.tsx` |
| C | `src/lib/ai/reply.ts`, `src/actions/ai-reply.ts`, `src/actions/lead-email.ts`, `src/lib/email/templates/lead-reply.ts`, `tests/lib/{ai-reply,lead-reply-template}.test.ts`, `tests/actions/{ai-reply,lead-email}.test.ts` | `src/components/crm/ai/reply-card.tsx` |
| Integração | | `src/config/site.ts`, `src/app/(site)/privacidade/page.tsx`, `docs/arquitetura/deploy.md`, testes de copy do site, o que as frentes anotarem |

Nenhum arquivo aparece em duas frentes da Fase 2.
