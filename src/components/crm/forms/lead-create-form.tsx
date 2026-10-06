"use client";

import {
  Building2,
  Calculator,
  GraduationCap,
  Landmark,
  Theater,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { createLeadAction } from "@/actions/crm-leads";
import { Callout } from "@/components/crm/ui/callout";
import { FormActions } from "@/components/crm/ui/form-actions";
import { FormSection } from "@/components/crm/ui/form-section";
import { SegmentedControl } from "@/components/crm/ui/segmented-control";
import { initialCrmActionState, type CrmActionState } from "@/lib/crm/action-state";
import { ATTRIBUTE_FIELDS } from "@/lib/crm/attributes";
import { INTEREST_LABELS, SEGMENT_LABELS, SOURCE_LABELS } from "@/lib/crm/labels";
import {
  LEAD_INTERESTS,
  LEAD_SEGMENTS,
  LEAD_SOURCES,
  UFS,
  type LeadSegment,
} from "@/lib/domain/enums";
import { AttributeFields, countFilledAttributes } from "./attribute-fields";
import {
  CheckboxField,
  FormMessage,
  RequiredMark,
  SelectField,
  TextField,
  TextareaField,
} from "./fields";
import { SubmitButton } from "./submit-button";

// "Novo lead" manual (crm-design-system.md, seção 7.5): quatro seções na ordem "Quem é",
// "De onde veio", "Consentimento (LGPD)" e "Mais sobre …" (dobrada, com a contagem de campos
// preenchidos; abre sozinha quando a validação devolve erro em attr_*). Origem obrigatória com
// detalhe; consentimento registrado com source_page = crm. Os campos do art. 27 continuam no
// FormData (decisão D4): ficam num <details> fechado dentro da seção dobrada.
const MORE_TITLES: Record<LeadSegment, string> = {
  PJ: "Mais sobre a empresa",
  PF: "Mais sobre a pessoa",
  CONT: "Mais sobre o escritório",
  MUN: "Mais sobre o município",
  PROP: "Mais sobre o proponente",
  ALUNO: "Mais sobre o aluno",
};

const SEGMENT_ICONS: Record<LeadSegment, LucideIcon> = {
  PJ: Building2,
  PF: UserRound,
  CONT: Calculator,
  MUN: Landmark,
  PROP: Theater,
  ALUNO: GraduationCap,
};

const MANUAL_SOURCES = LEAD_SOURCES.filter(
  (s) => !["site", "guia", "simulador", "diagnostico"].includes(s),
);

const CONSENT_CHANNELS = [
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telefone", label: "Telefone" },
] as const;

export function LeadCreateForm() {
  const [state, action] = useActionState(createLeadAction, initialCrmActionState);
  // Cada resposta da action remonta os campos (`key`) com os valores devolvidos, no mesmo commit:
  // evita o aviso do base-ui sobre `defaultValue` mudando num campo já inicializado.
  const [seenState, setSeenState] = useState<CrmActionState>(state);
  const [attempt, setAttempt] = useState(0);
  if (seenState !== state) {
    setSeenState(state);
    setAttempt((n) => n + 1);
  }
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const [segment, setSegment] = useState<LeadSegment>((v.segment as LeadSegment) || "PJ");
  const [consent, setConsent] = useState(v.consentGiven === "on");
  const [filled, setFilled] = useState(
    () => countFilledAttributes(segment, attributeValues(v)).filled,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const attributeFields = ATTRIBUTE_FIELDS[segment];
  const total = attributeFields.length;
  // A validação do formulário devolve `attr_<chave>`; a do domínio (createLead) devolve a chave
  // crua: os dois abrem a seção dobrada.
  const hasAttrError = Object.keys(e).some(
    (key) => key.startsWith("attr_") || attributeFields.some((f) => f.key === key),
  );

  // Erro de validação: foco no primeiro campo inválido (seção 8 da especificação).
  useEffect(() => {
    if (state.status !== "error") return;
    formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);

  function changeSegment(next: string) {
    const seg = next as LeadSegment;
    setSegment(seg);
    setFilled(countFilledAttributes(seg, attributeValues(v)).filled);
  }

  function recount(form: HTMLFormElement) {
    let n = 0;
    for (const [key, value] of new FormData(form)) {
      if (key.startsWith("attr_") && typeof value === "string" && value.trim() !== "") n += 1;
    }
    setFilled(n);
  }

  return (
    <form
      key={attempt}
      ref={formRef}
      action={action}
      onChange={(event) => recount(event.currentTarget)}
      className="flex flex-col gap-6"
      noValidate
    >
      <FormMessage status={state.status} message={state.message} />

      <FormSection title="Quem é" contentClassName="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm leading-none font-medium">
            Segmento
            <RequiredMark />
          </span>
          <SegmentedControl
            name="segment"
            label="Segmento"
            value={segment}
            onChange={changeSegment}
            options={LEAD_SEGMENTS.map((s) => ({
              value: s,
              label: SEGMENT_LABELS[s],
              icon: SEGMENT_ICONS[s],
            }))}
          />
          {e.segment ? (
            <p role="alert" className="text-sm text-destructive">
              {e.segment}
            </p>
          ) : null}
        </div>
        <TextField
          name="name"
          label="Nome"
          required
          error={e.name}
          defaultValue={v.name}
          autoComplete="off"
        />
        <TextField
          name="email"
          label="E-mail"
          type="email"
          inputMode="email"
          required
          error={e.email}
          defaultValue={v.email}
          autoComplete="off"
        />
        <TextField
          name="phone"
          label="Telefone (WhatsApp)"
          error={e.phone}
          defaultValue={v.phone}
          help="Com DDD, por exemplo (54) 98403-2180."
          inputMode="tel"
        />
        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
          <TextField name="city" label="Cidade" error={e.city} defaultValue={v.city} />
          <SelectField
            name="uf"
            label="UF"
            error={e.uf}
            options={UFS.map((u) => ({ value: u, label: u }))}
            placeholder="UF"
            defaultValue={v.uf ?? "RS"}
          />
        </div>
      </FormSection>

      <FormSection title="De onde veio" contentClassName="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="source"
          label="Origem"
          required
          error={e.source}
          options={MANUAL_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] }))}
          defaultValue={v.source}
        />
        <TextField
          name="sourceDetail"
          label="Detalhe da origem"
          error={e.sourceDetail}
          defaultValue={v.sourceDetail}
          placeholder="Quem indicou, evento, campanha"
        />
        <SelectField
          name="interest"
          label="Interesse"
          required
          error={e.interest}
          placeholder={null}
          options={LEAD_INTERESTS.map((i) => ({ value: i, label: INTEREST_LABELS[i] }))}
          defaultValue={v.interest ?? "nao_sei"}
        />
        <div className="sm:col-span-2">
          <TextareaField
            name="message"
            label="Observações"
            error={e.message}
            defaultValue={v.message}
            rows={3}
          />
        </div>
        <Callout tone="info" role="note" className="sm:col-span-2">
          Formulários do site entram sozinhos. Aqui ficam LinkedIn, indicações, eventos e campanhas.
        </Callout>
      </FormSection>

      <FormSection title="Consentimento (LGPD)">
        <CheckboxField
          name="consentGiven"
          label="A pessoa autorizou o contato comercial (verbalmente ou por escrito)"
          required={segment === "PF"}
          error={e.consentGiven}
          defaultChecked={consent}
          onChange={(ev) => setConsent(ev.target.checked)}
          help="Para pessoa física é obrigatório; para empresas, contadores, municípios e proponentes vale o legítimo interesse."
        />
        {consent ? (
          <>
            <TextareaField
              name="consentText"
              label="Como foi dado"
              required
              error={e.consentText}
              defaultValue={v.consentText}
              rows={2}
              help="Exemplo: autorizou por telefone em 03/10/2026 que eu enviasse a proposta por WhatsApp."
            />
            <fieldset className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <legend className="mb-1 text-sm font-medium">Canais autorizados</legend>
              {CONSENT_CHANNELS.map((c) => (
                <label
                  key={c.value}
                  className="flex min-h-11 items-center gap-2 md:min-h-0 md:py-1"
                >
                  <input
                    type="checkbox"
                    name="consentChannels"
                    value={c.value}
                    className="accent-primary size-4"
                    defaultChecked
                  />
                  {c.label}
                </label>
              ))}
            </fieldset>
          </>
        ) : null}
      </FormSection>

      {total > 0 ? (
        <FormSection
          title={MORE_TITLES[segment]}
          collapsible
          defaultOpen={hasAttrError}
          count={`opcional · ${filled} de ${total} preenchidos`}
          description="Ajuda na qualificação e em alguns movimentos de estágio. Pode preencher depois, no detalhe do lead."
        >
          <AttributeFields
            segment={segment}
            values={attributeValues(v)}
            errors={e}
            art27="collapsed"
          />
        </FormSection>
      ) : null}

      <FormActions
        cancelHref="/app/leads"
        note="* obrigatório"
        className="mx-0 rounded-xl border border-border md:mx-0"
      >
        <SubmitButton pendingLabel="Criando…" size="touch" className="md:h-9">
          Criar lead
        </SubmitButton>
      </FormActions>
    </form>
  );
}

function attributeValues(values: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (!k.startsWith("attr_")) continue;
    out[k.slice(5)] = v === "sim" ? true : v === "nao" ? false : v;
  }
  return out;
}
