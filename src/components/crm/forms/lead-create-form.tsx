"use client";

import { useActionState, useState } from "react";
import { createLeadAction } from "@/actions/crm-leads";
import { initialCrmActionState } from "@/lib/crm/action-state";
import { INTEREST_LABELS, SEGMENT_LABELS, SOURCE_LABELS } from "@/lib/crm/labels";
import {
  LEAD_INTERESTS,
  LEAD_SEGMENTS,
  LEAD_SOURCES,
  UFS,
  type LeadSegment,
} from "@/lib/domain/enums";
import { AttributeFields } from "./attribute-fields";
import { CheckboxField, FormMessage, SelectField, TextField, TextareaField } from "./fields";
import { SubmitButton } from "./submit-button";

// "Novo lead" manual (proposta-c, seção 9.1): campos comuns, origem obrigatória com detalhe,
// campos do segmento escolhido e consentimento registrado com source_page = crm.
export function LeadCreateForm() {
  const [state, action] = useActionState(createLeadAction, initialCrmActionState);
  const v = state.values ?? {};
  const [segment, setSegment] = useState<LeadSegment>((v.segment as LeadSegment) || "PJ");
  const [consent, setConsent] = useState(v.consentGiven === "on");
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="segment"
          label="Segmento"
          required
          error={e.segment}
          placeholder={null}
          options={LEAD_SEGMENTS.map((s) => ({ value: s, label: SEGMENT_LABELS[s] }))}
          value={segment}
          onChange={(ev) => setSegment(ev.target.value as LeadSegment)}
        />
        <SelectField
          name="interest"
          label="Interesse"
          required
          error={e.interest}
          options={LEAD_INTERESTS.map((i) => ({ value: i, label: INTEREST_LABELS[i] }))}
          defaultValue={v.interest ?? "nao_sei"}
        />
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
        <div className="grid grid-cols-[1fr_6rem] gap-3">
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
        <SelectField
          name="source"
          label="Origem"
          required
          error={e.source}
          options={LEAD_SOURCES.filter(
            (s) => !["site", "guia", "simulador", "diagnostico"].includes(s),
          ).map((s) => ({ value: s, label: SOURCE_LABELS[s] }))}
          defaultValue={v.source}
          help="Formulários do site entram sozinhos; aqui ficam LinkedIn, indicações, eventos e campanhas."
        />
        <TextField
          name="sourceDetail"
          label="Detalhe da origem"
          error={e.sourceDetail}
          defaultValue={v.sourceDetail}
          help="Quem indicou, nome do evento ou da campanha."
        />
      </div>
      <TextareaField
        name="message"
        label="Observações"
        error={e.message}
        defaultValue={v.message}
        rows={3}
      />
      <AttributeFields segment={segment} values={attributeValues(v)} errors={e} />
      <fieldset className="flex flex-col gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Consentimento para contato</legend>
        <CheckboxField
          name="consentGiven"
          label="A pessoa autorizou o contato comercial (verbalmente ou por escrito)"
          defaultChecked={consent}
          onChange={(ev) => setConsent(ev.target.checked)}
          help="Para empresas, contadores, municípios e proponentes vale o legítimo interesse; para pessoa física o consentimento é obrigatório."
        />
        {consent ? (
          <>
            <TextareaField
              name="consentText"
              label="Como foi dado o consentimento"
              required
              error={e.consentText}
              defaultValue={v.consentText}
              rows={2}
              help="Exemplo: autorizou por telefone em 03/10/2026 que eu enviasse a proposta por WhatsApp."
            />
            <div className="flex flex-wrap gap-4 text-sm">
              {(["email", "whatsapp", "telefone"] as const).map((c) => (
                <label key={c} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="consentChannels"
                    value={c}
                    className="accent-primary size-4"
                    defaultChecked
                  />
                  {c === "email" ? "E-mail" : c === "whatsapp" ? "WhatsApp" : "Telefone"}
                </label>
              ))}
            </div>
          </>
        ) : null}
      </fieldset>
      <div>
        <SubmitButton pendingLabel="Criando...">Criar lead</SubmitButton>
      </div>
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
