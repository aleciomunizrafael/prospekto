"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { registerActivityAction } from "@/actions/crm-leads";
import type { Notes } from "@/lib/ai/notes";
import { initialCrmActionState, type CrmActionState } from "@/lib/crm/action-state";
import { formatShortDay } from "@/lib/crm/describe-sla";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/crm/format";
import { ACTIVITY_TYPE_LABELS, MEETING_KINDS } from "@/lib/crm/labels";
import { ACTIVITY_ICONS } from "@/lib/crm/status-tones";
import type { LeadSegment } from "@/lib/domain/enums";
import { DictationTools } from "../ai/dictation";
import { SegmentedControl } from "../ui/segmented-control";
import { FormMessage, SelectField, TextField, TextareaField, ids } from "./fields";
import { SubmitButton } from "./submit-button";

const TYPES = ["ligacao", "reuniao", "email", "whatsapp", "visita", "nota", "tarefa"] as const;
type ActivityKind = (typeof TYPES)[number];
const CONTACT_TYPES: ReadonlySet<string> = new Set([
  "ligacao",
  "reuniao",
  "email",
  "whatsapp",
  "visita",
]);

// Evento que abre e foca o formulário de qualquer lugar da página (ActionBarMobile "Registrar").
const OPEN_EVENT = "prospekto:registrar";

export function openActivityForm() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

// Mensagem do toast (crm-design-system.md, seção 8): "Contato registrado. Próxima ação: qui., 9 de out."
function successMessage(type: ActivityKind, formData: FormData): string {
  const dateOf = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value ? fromDateTimeLocal(value) : null;
  };
  if (type === "tarefa") {
    const due = dateOf("dueAt");
    return due ? `Tarefa criada. Vence ${formatShortDay(due)}` : "Tarefa criada.";
  }
  if (type === "nota") return "Nota registrada.";
  const next = dateOf("nextActionAt");
  return next ? `Contato registrado. Próxima ação: ${formatShortDay(next)}` : "Contato registrado.";
}

// Valores do formulário guardados antes de "Aplicar ao formulário", para o "Desfazer" (frente B).
type FormSnapshot = { type: ActivityKind; subject: string; body: string; nextActionAt: string };

type FormField = HTMLInputElement | HTMLTextAreaElement;

function fieldOf(form: HTMLFormElement, name: string): FormField | null {
  const el = form.elements.namedItem(name);
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el : null;
}

// Escreve num campo não controlado e dispara `input`: o DateHint e as DictationTools escutam.
function writeField(form: HTMLFormElement, name: string, value: string) {
  const el = fieldOf(form, name);
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// Texto que vai para "O que aconteceu": o resumo e, se houver, os combinados ao fim.
export function notesBody(notes: Pick<Notes, "resumo" | "tarefas">): string {
  if (!notes.tarefas.length) return notes.resumo;
  return `${notes.resumo}\n\nCombinados: ${notes.tarefas.join("; ")}`;
}

// "Registrar atividade" (crm-design-system.md, seção 7.4): tipo em SegmentedControl, "O que
// aconteceu" primeiro, datas com DateHint. Contato atualiza last_contact_at; a próxima ação é
// sugerida pelo prazo do estágio e pode ser alterada; tarefa pede vencimento. `autoFocus` vem de
// `?registrar=1`; `#registrar` na URL e o evento da ActionBarMobile também abrem a seção dobrada
// (<details> do FormSection no celular) e focam o campo. As DictationTools (ditar e organizar com
// IA) só sugerem: "Aplicar ao formulário" preenche os campos para revisão e o registro continua
// pelo botão "Registrar" (registerActivityAction).
export function ActivityForm({
  leadId,
  segment,
  aiEnabled,
  suggestedNextActionAt,
  now,
  autoFocus = false,
}: {
  leadId: string;
  // Segmento do lead e estado da IA: alimentam "Ditar" e "Organizar com IA" (DictationTools).
  segment: LeadSegment;
  aiEnabled: boolean;
  suggestedNextActionAt: string | null;
  // Instante do servidor (ISO): o "Data e hora" padrão e o DateHint usam o mesmo valor no SSR e
  // na hidratação. `new Date()` no cliente mudava de minuto entre os dois e quebrava a hidratação.
  now: string;
  autoFocus?: boolean;
}) {
  const [state, action] = useActionState(async (prev: CrmActionState, formData: FormData) => {
    const kind = String(formData.get("type") ?? "ligacao") as ActivityKind;
    const result = await registerActivityAction(prev, formData);
    if (result.status === "ok") toast.success(successMessage(kind, formData));
    return result;
  }, initialCrmActionState);
  const [type, setType] = useState<ActivityKind>("ligacao");
  // Fixo por montagem: um defaultValue que muda a cada render faz o base-ui avisar e não ajuda.
  const [nowLocal] = useState(() => toDateTimeLocal(new Date(now)));
  const formRef = useRef<HTMLFormElement>(null);
  // Remonta as DictationTools depois de registrar, para a sugestão anterior sumir com o formulário.
  const [toolsKey, setToolsKey] = useState(0);
  const snapshot = useRef<FormSnapshot | null>(null);
  const e = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status !== "ok") return;
    const form = formRef.current;
    if (!form) return;
    form.reset();
    snapshot.current = null;
    setToolsKey((k) => k + 1);
    // Depois do reset, "Data e hora" volta para agora (sem trocar o defaultValue no React).
    const occurred = form.elements.namedItem("occurredAt");
    if (occurred instanceof HTMLInputElement) occurred.value = toDateTimeLocal(new Date());
    // O reset não dispara `input`: avisa os DateHint para refletirem os valores padrão.
    form.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]').forEach((input) => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }, [state]);

  const focusBody = useCallback(() => {
    const field = document.getElementById(ids("body").id);
    if (!(field instanceof HTMLTextAreaElement)) return;
    // No celular a seção vem dobrada: abre todos os <details> acima do campo antes de focar.
    let fold = field.closest("details");
    while (fold) {
      fold.open = true;
      fold = fold.parentElement?.closest("details") ?? null;
    }
    field.focus();
    field.scrollIntoView({ block: "center" });
  }, []);

  useEffect(() => {
    if (autoFocus || window.location.hash === "#registrar") focusBody();
    const onHash = () => {
      if (window.location.hash === "#registrar") focusBody();
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener(OPEN_EVENT, focusBody);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener(OPEN_EVENT, focusBody);
    };
  }, [autoFocus, focusBody]);

  // "Aplicar ao formulário": guarda o que estava preenchido, troca o tipo e escreve assunto, texto
  // e próxima ação (09:00 do dia calculado no servidor, decisão P5). O tipo muda com flushSync
  // porque o campo "Próxima ação" remonta ao alternar entre contato e nota.
  const applyNotes = useCallback(
    (notes: Notes) => {
      const form = formRef.current;
      if (!form) return;
      snapshot.current ??= {
        type,
        subject: fieldOf(form, "subject")?.value ?? "",
        body: fieldOf(form, "body")?.value ?? "",
        nextActionAt: fieldOf(form, "nextActionAt")?.value ?? "",
      };
      flushSync(() => setType(notes.tipo));
      writeField(form, "subject", notes.assunto);
      writeField(form, "body", notesBody(notes));
      if (notes.proximaAcao) {
        writeField(form, "nextActionAt", toDateTimeLocal(new Date(notes.proximaAcao.at)));
      }
      fieldOf(form, "body")?.focus();
    },
    [type],
  );

  // "Desfazer": restaura o texto ditado ou colado e os demais campos como estavam.
  const undoNotes = useCallback(() => {
    const form = formRef.current;
    const previous = snapshot.current;
    if (!form || !previous) return;
    snapshot.current = null;
    flushSync(() => setType(previous.type));
    writeField(form, "subject", previous.subject);
    writeField(form, "body", previous.body);
    writeField(form, "nextActionAt", previous.nextActionAt);
    fieldOf(form, "body")?.focus();
  }, []);

  const isContact = CONTACT_TYPES.has(type);
  const isTask = type === "tarefa";
  const suggested = suggestedNextActionAt ? toDateTimeLocal(new Date(suggestedNextActionAt)) : "";

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="leadId" value={leadId} />
      <FormMessage status={state.status === "error" ? "error" : "idle"} message={state.message} />
      <DictationTools
        key={toolsKey}
        leadId={leadId}
        segment={segment}
        enabled={aiEnabled}
        textareaId={ids("body").id}
        onOrganized={applyNotes}
        onUndo={undoNotes}
      />
      <SegmentedControl
        name="type"
        label="Tipo de atividade"
        value={type}
        onChange={(value) => setType(value as ActivityKind)}
        options={TYPES.map((t) => ({
          value: t,
          label: ACTIVITY_TYPE_LABELS[t],
          icon: ACTIVITY_ICONS[t],
        }))}
      />
      <TextareaField
        name="body"
        label={isTask ? "Detalhes" : "O que aconteceu"}
        error={e.body}
        rows={3}
        placeholder={
          isTask ? "Contexto da tarefa (opcional)" : "Resumo da conversa, combinados, objeções…"
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
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
            required={isTask}
            error={e.subject}
            placeholder={isTask ? "O que precisa ser feito" : "Resumo em poucas palavras"}
          />
        )}
        {type === "reuniao" ? (
          <TextField name="subject" label="Assunto" error={e.subject} placeholder="Opcional" />
        ) : null}
        <TextField
          name="occurredAt"
          label={isTask ? "Criada em" : "Data e hora"}
          type="datetime-local"
          dateHint
          error={e.occurredAt}
          defaultValue={nowLocal}
        />
        {isTask ? (
          <TextField
            name="dueAt"
            label="Vencimento"
            type="datetime-local"
            dateHint
            required
            error={e.dueAt}
          />
        ) : (
          <TextField
            key={`${isContact ? "contato" : "outro"}-${suggested}`}
            name="nextActionAt"
            label="Próxima ação"
            type="datetime-local"
            dateHint
            error={e.nextActionAt}
            defaultValue={isContact ? suggested : ""}
            help={
              !isContact
                ? "Opcional."
                : suggested
                  ? "Sugerida pelo prazo do estágio. Deixe em branco para manter a atual."
                  : "Este estágio não tem prazo fixo. Deixe em branco para manter a atual."
            }
          />
        )}
      </div>
      <div className="flex justify-end">
        <SubmitButton size="touch" className="md:h-9" pendingLabel="Registrando…">
          {isTask ? "Criar tarefa" : "Registrar"}
        </SubmitButton>
      </div>
    </form>
  );
}
