# Server Actions

Convenções: toda Server Action do CRM começa com `const ctx = await requireSession();` (AGENTS.md; `tests/auth-guard.test.ts`). As exceções são `leads.ts` e `simulator.ts`, públicas de propósito, marcadas com o comentário `// public-action: ...` que o teste reconhece. O núcleo comum das duas (IP e user agent, antispam, limite por IP, consentimentos, e-mails) fica em `src/lib/leads/submit.ts`.

## Gate do simulador: `submitSimulatorLead`

`src/actions/simulator.ts` exporta `submitSimulatorLead(prev, formData)` (usada com `useActionState` por `src/components/simulator/gate-form.tsx`) e `recordReturningSimulation(inputJson, sourcePage)` (visitante com o cookie assinado do gate). Diferente de `createLeadFromForm`, devolvem o resultado detalhado (`SimulatorGateState`, em `src/components/simulator/state.ts`) sem redirecionar: criam ou atualizam o lead, gravam a `simulation` com o hash do token do link `/simulador/resultado/[token]` (30 dias, `src/lib/simulation-token.ts`), definem o cookie `prospekto_simulador_gate` e enviam o e-mail `simulador`. Campos e mapeamento em `src/lib/validation/forms/simulator.ts` (fora do registro `FORMS`). Testes em `tests/actions/simulator.test.ts`.

## Captura de leads: `createLeadFromForm`

`src/actions/leads.ts` exporta:

- `createLeadFromForm(prev: LeadFormState, formData: FormData): Promise<LeadFormState>`: usada com `useActionState`. Em sucesso **redireciona** para `/obrigado/[tipo]?f=<form_id>&s=<segmento>&o=<origem>` (e `&t=<token>` no guia) e nunca devolve; em erro devolve `{ status: "error", errorCode, message, fieldErrors?, values? }` (`src/lib/validation/forms/state.ts`). Códigos: `validation`, `token`, `rate_limited`, `storage`, `unknown_form`.
- `issueFormToken(): Promise<string>`: carimbo de tempo assinado (HMAC com `FORM_SECRET`), pedido pelo `LeadForm` ao montar.

O que a action faz, nesta ordem: lê o `form_id`, escolhe o formulário em `src/lib/validation/forms/index.ts`, valida com o schema Zod, aplica o antispam (honeypot `website`, carimbo com mínimo de 3 s, 5 envios por IP por hora em `form_attempts`), grava com `createLead` de `src/lib/repos/leads.ts` (lead + consentimentos + `activities.formulario` na mesma transação; dedup de 10 minutos; nunca rebaixa estágio), envia a resposta automática e o aviso interno (`src/lib/email/`), e redireciona. A resposta nunca revela se o e-mail já existia.

## Como criar um formulário novo (próxima onda)

1. **Schema e mapeamento** em `src/lib/validation/forms/<nome>.ts`:

   ```ts
   import { z } from "zod";
   import { consentFields, defineForm, emailField, hiddenFields, nameField, phoneField, cityField, ufField, type LeadDraft } from "./common";

   export const diagnosticoFormSchema = z.object({
     ...hiddenFields,          // form_id, utm_*, referrer, landing_path, source_page, form_ts, website
     nome: nameField,
     email: emailField,
     telefone: phoneField,     // opcional em E.164; use phoneSchema de validation/common.ts se for obrigatório
     cidade: cityField,
     uf: ufField,
     tipo_pessoa: z.enum(["PJ", "PF"], { error: "Escolha pessoa jurídica ou física." }),
     ...consentFields,         // consent_lgpd (obrigatório) e consent_marketing
   });

   export const diagnosticoForm = defineForm({
     id: "diagnostic",         // valor de form_id e do evento form_start (estrutura-e-copy.md, 9.2)
     schema: diagnosticoFormSchema,
     toLead: (d): LeadDraft => ({
       segment: d.tipo_pessoa, interest: "rouanet", source: "diagnostico",
       sourceDetail: d.source_page || "/diagnostico",
       name: d.nome, email: d.email, phone: d.telefone, city: d.cidade, uf: d.uf,
       tags: [], attributes: { /* chaves de personas-e-funis.md, 9.3; validadas por lead-attributes.ts */ },
       consentMarketing: d.consent_marketing,
       formData: { ...d, form_ts: undefined, website: undefined }, // vai para activities.formulario
       thanksType: "diagnostico",
       actionLabel: "pediu o diagnóstico gratuito",                 // "você recebe este e-mail porque ..."
       emailTemplate: { id: "diagnostico", data: { formato: "diagnostico", tipoPessoa: d.tipo_pessoa } },
     }),
   });
   ```

   Mensagens de erro em português e concretas. Campos opcionais: `optionalText(min, max, "Rótulo")`. Campo `projeto_id`: valide que existe e está em `captando` (repo de projetos) e preencha `projectInterestId` e a tag `projeto:[slug]`.

2. **Registre** o formulário em `FORMS` (`src/lib/validation/forms/index.ts`). A chave é o `form_id`.

3. **Template de e-mail**: `src/lib/email/templates/index.ts` já tem `guia`, `simulador`, `diagnostico`, `contadores`, `municipios`, `proponentes`, `mentoria`, `contato` e `aviso-projetos` (seção 5.6). Para um novo, acrescente a chave em `EmailTemplateData` e o renderer em `EMAIL_TEMPLATES`, usando `renderEmail(ctx, assunto, blocos)` de `layout.ts` (blocos `paragraph`, `list`, `cta`). A moldura já põe motivo do envio, assinatura com cidade, descadastro (só com marketing) e ressalva legal.

4. **Página de obrigado**: os tipos são `guia`, `contato`, `diagnostico`, `contadores`, `municipios`, `proponentes`, `mentoria` e `aviso-projetos` (`THANKS_TYPES` em `forms/common.ts`; conteúdo em `src/app/(site)/obrigado/[tipo]/page.tsx`). Um tipo novo exige entrada em `THANKS_TYPES` e em `CONTENT` da página.

5. **Componente do formulário** (cliente), em `src/components/site/lead-forms/<nome>-form.tsx`:

   ```tsx
   "use client";
   import { ConsentFields, LeadForm, RadioGroupField, SelectField, SubmitButton, TextField, TextareaField } from "@/components/site/form";

   export function DiagnosticoForm({ titleId }: { titleId: string }) {
     return (
       <LeadForm formId="diagnostic" ariaLabelledBy={titleId} fieldLabels={{ nome: "Nome", email: "E-mail" /* ... */ }}>
         <RadioGroupField name="tipo_pessoa" label="Quem vai patrocinar" required options={[{ value: "PJ", label: "Minha empresa" }, { value: "PF", label: "Eu, pessoa física" }]} />
         <TextField name="nome" label="Nome" required autoComplete="name" />
         {/* ... */}
         <ConsentFields />
         <SubmitButton>Pedir meu diagnóstico</SubmitButton>
       </LeadForm>
     );
   }
   ```

   `LeadForm` cuida dos campos ocultos, do honeypot, do carimbo assinado, do resumo de erros com foco e dos eventos `form_start`, `form_error` e `consent_marketing`; `form_submit` dispara na página de obrigado (`ThanksTracker`). Os campos leem erro e valor enviado pelo `name` (`useLeadField`). O atributo `name` de cada campo precisa ser igual à chave do schema.

6. **Teste** em `tests/actions/` ou `tests/lib/`: siga `tests/actions/leads.test.ts` (mocks de `next/headers` e `next/navigation`, `submit()` que captura o redirect).

## Campos ocultos (convenção)

| Campo | Origem | Destino |
|---|---|---|
| `form_id` | `LeadForm` | escolhe o schema; gravado em `activities.formulario.data.form_id` |
| `utm_source`, `utm_medium`, `utm_campaign` | `captureAttribution()` (`src/lib/analytics.ts`; URL ou sessionStorage) | `leads.utm_*` |
| `referrer` | referrer externo da primeira página | `leads.referrer` |
| `landing_path` | primeira página da sessão | `leads.landing_path` |
| `source_page` | `usePathname()` | `consents.source_page` e `source_detail` padrão |
| `form_ts` | `issueFormToken()` | checagem de 3 s / 24 h; nunca gravado |
| `website` | honeypot, sempre vazio | descarta o envio silenciosamente |
