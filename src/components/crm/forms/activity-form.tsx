"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { registerActivityAction } from "@/actions/crm-leads";
import { initialCrmActionState } from "@/lib/crm/action-state";
import { toDateTimeLocal } from "@/lib/crm/format";
import { ACTIVITY_TYPE_LABELS, MEETING_KINDS } from "@/lib/crm/labels";
import { FormMessage, SelectField, TextField, TextareaField } from "./fields";
import { SubmitButton } from "./submit-button";

const TYPES = ["ligacao", "reuniao", "email", "whatsapp", "visita", "nota", "tarefa"] as const;

// "Registrar atividade" (proposta-c, seção 9.1): contato atualiza last_contact_at; a nova próxima
// ação é sugerida pelo SLA do estágio e pode ser alterada; tarefa pede vencimento.
export function ActivityForm({
  leadId,
  suggestedNextActionAt,
}: {
  leadId: string;
  suggestedNextActionAt: string | null;
}) {
  const [state, action] = useActionState(registerActivityAction, initialCrmActionState);
  const [type, setType] = useState<(typeof TYPES)[number]>("ligacao");
  const formRef = useRef<HTMLFormElement>(null);
  const e = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "ok") {
      toast.success(state.message ?? "Atividade registrada.");
      formRef.current?.reset();
    }
  }, [state]);

  const isContact = ["ligacao", "reuniao", "email", "whatsapp", "visita"].includes(type);
  const suggested = suggestedNextActionAt ? toDateTimeLocal(new Date(suggestedNextActionAt)) : "";

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="leadId" value={leadId} />
      <FormMessage status={state.status} message={state.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="type"
          label="Tipo"
          required
          placeholder={null}
          error={e.type}
          options={TYPES.map((t) => ({ value: t, label: ACTIVITY_TYPE_LABELS[t] }))}
          value={type}
          onChange={(ev) => setType(ev.target.value as (typeof TYPES)[number])}
        />
        {type === "reuniao" ? (
          <SelectField
            name="meetingKind"
            label="Tipo de reunião"
            required
            placeholder={null}
            error={e.meetingKind}
            options={MEETING_KINDS.map((m) => ({ value: m.value, label: m.label }))}
          />
        ) : (
          <TextField
            name="subject"
            label="Assunto"
            required={type === "tarefa"}
            error={e.subject}
            placeholder={
              type === "tarefa" ? "O que precisa ser feito" : "Resumo em poucas palavras"
            }
          />
        )}
        <TextField
          name="occurredAt"
          label={type === "tarefa" ? "Criada em" : "Data e hora"}
          type="datetime-local"
          error={e.occurredAt}
          defaultValue={toDateTimeLocal(new Date())}
        />
        {type === "tarefa" ? (
          <TextField
            name="dueAt"
            label="Vencimento"
            type="datetime-local"
            required
            error={e.dueAt}
          />
        ) : (
          <TextField
            name="nextActionAt"
            label="Nova próxima ação"
            type="datetime-local"
            error={e.nextActionAt}
            defaultValue={isContact ? suggested : ""}
            help={
              isContact
                ? "Sugerida pelo prazo do estágio. Deixe em branco para manter a atual."
                : "Opcional."
            }
          />
        )}
      </div>
      {type === "reuniao" ? (
        <TextField name="subject" label="Assunto" error={e.subject} placeholder="Opcional" />
      ) : null}
      <TextareaField name="body" label="O que aconteceu" error={e.body} rows={3} />
      <div>
        <SubmitButton pendingLabel="Registrando...">
          {type === "tarefa" ? "Criar tarefa" : "Registrar"}
        </SubmitButton>
      </div>
    </form>
  );
}
