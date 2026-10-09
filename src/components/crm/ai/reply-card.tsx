"use client";

import { Loader2, Mail, MessageCircle, Send, Sparkles } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { toast } from "sonner";
import { generateReplyAction, recordWhatsappReplyAction } from "@/actions/ai-reply";
import { sendLeadReplyAction } from "@/actions/lead-email";
import { Callout } from "@/components/crm/ui/callout";
import { ConfirmDialog } from "@/components/crm/ui/confirm-dialog";
import { SegmentedControl } from "@/components/crm/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReplyChannel, ReplyDraft } from "@/lib/ai/reply";
import {
  EMAIL_BLOCK_MESSAGES,
  initialAiActionState,
  type AiActionState,
  type AiRunSnapshot,
  type AiSlot,
  type EmailBlockReason,
} from "@/lib/ai/types";
import { initialCrmActionState, type CrmActionState } from "@/lib/crm/action-state";
import { calendarDateInSaoPaulo, formatDate, formatDateTime } from "@/lib/crm/format";
import type { AiPanelLead } from "./ai-panel";
import { TextField, TextareaField } from "../forms/fields";
import { HiddenField, type FormAction } from "../project-forms/action-form";

// "Resposta sugerida" (ADR-003, frente 3; ia-plano.md, Frente C). Um rascunho por canal, na voz
// da Daniela, com as perguntas de qualificação e dois horários propostos pelo código. Abre com o
// último rascunho gravado em ai_runs (`initial`, decisão P2); a Server Action só roda no clique e
// "Gerar de novo" sempre chama. Nada sai sem um clique: "Enviar por e-mail" passa pelo
// ConfirmDialog e "Abrir no WhatsApp" só abre o aplicativo com o texto editado. Só tipos vêm de
// src/lib/ai/reply.ts: zod e os prompts ficam no servidor.
export type ReplyCardProps = {
  lead: AiPanelLead;
  enabled: boolean;
  initial: AiRunSnapshot | null;
  slots: AiSlot[];
  canEmail: boolean;
  emailBlockReason: EmailBlockReason;
  whatsappHref: string | null;
  // Relógio do servidor em ISO (prop da página): "hoje" igual no SSR e na hidratação.
  now: string;
};

type Draft = {
  subject: string;
  text: string;
  // Rótulos dos horários como entraram no texto (do modelo ou dos slots propostos).
  horarios: string[];
  slots: AiSlot[];
  runId: string | null;
  createdAt: string;
};

type Drafts = Record<ReplyChannel, Draft | null>;

const NOTE = "Rascunho da IA na voz da Daniela. Edite antes de enviar.";
const MIN_TEXT = 20;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && !!v) : [];

// Canal do rascunho gravado: ai_runs.data.channel (runStructured grava o que a action pediu).
// Sem ele (linha anterior a esse metadado), assunto null é WhatsApp: normalizeReply força null
// fora do e-mail.
function channelOf(snapshot: AiRunSnapshot, output: Record<string, unknown>): ReplyChannel {
  const saved = snapshot.data?.channel;
  if (saved === "email" || saved === "whatsapp") return saved;
  return typeof output.assunto === "string" ? "email" : "whatsapp";
}

// O `output` de ai_runs chega como JSON genérico, já normalizado na geração (runStructured grava
// depois de normalizeReply); aqui vira Draft sem zod (nunca lança).
function draftsFromSnapshot(snapshot: AiRunSnapshot | null, slots: AiSlot[]): Drafts {
  const empty: Drafts = { email: null, whatsapp: null };
  if (!snapshot) return empty;
  const o = snapshot.output as Record<string, unknown>;
  if (typeof o.texto !== "string" || !o.texto.trim()) return empty;
  const channel = channelOf(snapshot, o);
  const horarios = strings(o.horarios_incluidos);
  return {
    ...empty,
    [channel]: {
      subject: channel === "email" && typeof o.assunto === "string" ? o.assunto : "",
      text: o.texto,
      horarios: horarios.length ? horarios : slots.map((s) => s.label),
      slots,
      runId: snapshot.runId,
      createdAt: snapshot.createdAt,
    },
  };
}

function draftFromResult(data: ReplyDraft, runId: string): Draft {
  return {
    subject: data.assunto ?? "",
    text: data.texto,
    horarios: data.horarios_incluidos.length
      ? data.horarios_incluidos
      : data.slots.map((s) => s.label),
    slots: data.slots,
    runId,
    createdAt: new Date().toISOString(),
  };
}

// Link wa.me do lead com o texto atual do rascunho (o `whatsappHref` da página traz a mensagem
// padrão do estágio; aqui só o número interessa).
function withText(href: string, text: string): string {
  return `${href.split("?")[0]}?text=${encodeURIComponent(text)}`;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

// Converte o estado da action de envio no estado que o ActionForm do ConfirmDialog consome.
const sendAction: FormAction = async (_prev, formData) => {
  const result = await sendLeadReplyAction(initialCrmActionState, formData);
  if (result.status === "ok") return { status: "ok", message: result.message };
  if (result.status === "error") {
    return {
      status: "error",
      message: result.message ?? "Não foi possível enviar o e-mail.",
      fieldErrors: result.fieldErrors,
    };
  }
  return { status: "idle" };
};

function DraftSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <span className="sr-only" role="status">
        Gerando o rascunho…
      </span>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function ReplyCard({
  lead,
  enabled,
  initial,
  slots,
  canEmail,
  emailBlockReason,
  whatsappHref,
  now,
}: ReplyCardProps) {
  const [drafts, setDrafts] = useState<Drafts>(() => draftsFromSnapshot(initial, slots));
  // Padrão: e-mail quando o endereço está ok, senão WhatsApp (se houver telefone); um rascunho
  // gravado abre no canal dele.
  const [channel, setChannel] = useState<ReplyChannel>(() => {
    const saved = draftsFromSnapshot(initial, slots);
    if (saved.whatsapp && !saved.email && lead.hasPhone) return "whatsapp";
    if (lead.emailStatus !== "ok" && lead.hasPhone) return "whatsapp";
    return "email";
  });
  const [opened, setOpened] = useState(false);
  const [recorded, setRecorded] = useState(false);
  // E-mail já enviado com este texto: o botão some até a pessoa editar ou gerar de novo (evita
  // o envio duplicado por um segundo clique).
  const [sent, setSent] = useState(false);
  // Dia civil de hoje pelo relógio do servidor (prop), como no ActivityForm e no Timeline: o
  // mesmo valor no SSR e na hidratação (o inicializador de useState rodaria nos dois lados).
  const today = calendarDateInSaoPaulo(new Date(now));
  const blockId = useId();

  const [state, formAction, pending] = useActionState(
    async (prev: AiActionState<ReplyDraft>, formData: FormData) => {
      const result = await generateReplyAction(prev, formData);
      if (result.status === "ok") {
        const next = draftFromResult(result.data, result.runId);
        setDrafts((d) => ({ ...d, [result.data.channel]: next }));
        setChannel(result.data.channel);
        setOpened(false);
        setRecorded(false);
        setSent(false);
      }
      return result;
    },
    initialAiActionState as AiActionState<ReplyDraft>,
  );
  // "Registrar no histórico": o toast e o estado mudam no retorno da action, como no ActivityForm.
  const [, recordAction, recordPending] = useActionState(
    async (prev: CrmActionState, formData: FormData) => {
      const result = await recordWhatsappReplyAction(prev, formData);
      if (result.status === "ok") {
        toast.success(result.message ?? "Registrado no histórico.");
        setRecorded(true);
      }
      if (result.status === "error") toast.error(result.message ?? "Não foi possível registrar.");
      return result;
    },
    initialCrmActionState,
  );

  const draft = drafts[channel];
  // Rascunho de outro dia: os horários do texto podem ter passado.
  const stale = !!draft && calendarDateInSaoPaulo(new Date(draft.createdAt)) !== today;

  const error = state.status === "error" ? state : null;
  // Teto diário atingido: só volta amanhã; o botão fica desabilitado até recarregar a página.
  const blocked = !enabled || error?.reason === "quota";
  const text = draft?.text ?? "";
  const subject = draft?.subject ?? "";
  const canSend = text.trim().length >= MIN_TEXT && subject.trim().length > 0;
  const nextSlot = draft?.slots[0] ?? slots[0] ?? null;
  const updateDraft = (patch: Partial<Pick<Draft, "subject" | "text">>) => {
    setSent(false);
    setDrafts((d) => {
      const current = d[channel];
      return current ? { ...d, [channel]: { ...current, ...patch } } : d;
    });
  };

  const channelOptions = [
    { value: "email", label: "E-mail", icon: Mail },
    ...(lead.hasPhone ? [{ value: "whatsapp", label: "WhatsApp", icon: MessageCircle }] : []),
  ];

  const horariosLine = draft ? (
    <p className="crm-meta">
      Horários propostos: {draft.horarios.join(" · ")}
      {channel === "whatsapp" ? ` · ${text.length} caracteres` : ""}
    </p>
  ) : null;

  return (
    <Card aria-busy={pending || undefined}>
      <CardHeader>
        <CardTitle>Resposta sugerida</CardTitle>
        <CardDescription>
          Rascunho da primeira resposta na voz da Daniela, por e-mail ou WhatsApp, com as perguntas
          de qualificação e dois horários para propor.
        </CardDescription>
        {draft ? (
          <p className="crm-meta">Gerado em {formatDateTime(draft.createdAt)} · modelo Claude</p>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <SegmentedControl
            name="replyChannel"
            label="Canal da resposta"
            value={channel}
            onChange={(value) => setChannel(value as ReplyChannel)}
            options={channelOptions}
          />
          {!lead.hasPhone ? (
            <p className="crm-meta">WhatsApp indisponível: o lead não tem telefone cadastrado.</p>
          ) : null}
        </div>

        {error ? (
          <Callout tone="warning" role="alert">
            {error.message}
          </Callout>
        ) : null}

        {stale && draft ? (
          <Callout tone="info" role="status">
            Rascunho de {formatDate(draft.createdAt)}: os horários propostos podem ter passado. Gere
            de novo antes de enviar.
          </Callout>
        ) : null}

        {pending ? (
          <DraftSkeleton />
        ) : draft ? (
          <div className="flex flex-col gap-3">
            {channel === "email" ? (
              <TextField
                name="replySubject"
                label="Assunto"
                value={subject}
                onChange={(event) => updateDraft({ subject: event.target.value })}
                maxLength={150}
              />
            ) : null}
            <TextareaField
              name="replyText"
              label="Mensagem"
              rows={8}
              value={text}
              onChange={(event) => updateDraft({ text: event.target.value })}
              help={
                channel === "email"
                  ? "O CRM acrescenta nome completo, empresa e contatos ao enviar."
                  : undefined
              }
            />
            {horariosLine}

            {channel === "email" ? (
              <>
                {!canEmail && emailBlockReason ? (
                  <Callout tone="warning" id={blockId}>
                    {EMAIL_BLOCK_MESSAGES[emailBlockReason]} O texto pode ser copiado e enviado por
                    outro meio.
                  </Callout>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {sent ? (
                    <p className="crm-meta" role="status">
                      E-mail enviado e registrado na linha do tempo. Edite o texto para enviar de
                      novo.
                    </p>
                  ) : canEmail ? (
                    <ConfirmDialog
                      trigger={
                        <Button type="button" disabled={!canSend}>
                          <Send aria-hidden="true" />
                          Enviar por e-mail
                        </Button>
                      }
                      title={`Enviar este e-mail para ${firstName(lead.name)}?`}
                      description="Ele sai do endereço da Prospekto e fica registrado na linha do tempo."
                      confirmLabel="Enviar"
                      pendingLabel="Enviando…"
                      action={sendAction}
                      onSuccess={() => {
                        toast.success("E-mail enviado e registrado.");
                        setSent(true);
                      }}
                    >
                      <HiddenField name="leadId" value={lead.id} />
                      <HiddenField name="subject" value={subject} />
                      <HiddenField name="text" value={text} />
                      <HiddenField name="slotIso" value={nextSlot?.iso ?? ""} />
                      <HiddenField name="runId" value={draft.runId ?? ""} />
                      <p className="text-sm">
                        <span className="font-medium">Assunto:</span> {subject}
                      </p>
                      {nextSlot ? (
                        <p className="crm-meta">
                          A próxima ação do lead fica marcada para {nextSlot.label}.
                        </p>
                      ) : null}
                    </ConfirmDialog>
                  ) : (
                    <Button type="button" disabled aria-describedby={blockId}>
                      <Send aria-hidden="true" />
                      Enviar por e-mail
                    </Button>
                  )}
                  {canEmail && !canSend ? (
                    <p className="crm-meta">
                      Preencha o assunto e uma mensagem com pelo menos {MIN_TEXT} caracteres.
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {whatsappHref ? (
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={
                      <a
                        href={withText(whatsappHref, text)}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                    onClick={() => setOpened(true)}
                  >
                    <MessageCircle aria-hidden="true" />
                    Abrir no WhatsApp
                  </Button>
                ) : null}
                {opened && !recorded ? (
                  <form action={recordAction} className="flex flex-wrap items-center gap-2">
                    <HiddenField name="leadId" value={lead.id} />
                    <HiddenField name="text" value={text} />
                    <HiddenField name="slotIso" value={nextSlot?.iso ?? ""} />
                    <HiddenField name="runId" value={draft.runId ?? ""} />
                    <span className="text-sm">Enviou?</span>
                    <Button type="submit" variant="outline" size="sm" disabled={recordPending}>
                      {recordPending ? (
                        <>
                          <Loader2 className="animate-spin" aria-hidden="true" />
                          Registrando…
                        </>
                      ) : (
                        "Registrar no histórico"
                      )}
                    </Button>
                  </form>
                ) : null}
                {recorded ? <p className="crm-meta">Registrado na linha do tempo.</p> : null}
              </div>
            )}
          </div>
        ) : null}

        <form action={formAction} className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <input type="hidden" name="channel" value={channel} />
          <Button
            type="submit"
            variant="outline"
            size={draft ? "sm" : "default"}
            disabled={pending || blocked}
          >
            {pending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Gerando…
              </>
            ) : (
              <>
                <Sparkles aria-hidden="true" />
                {draft ? "Gerar de novo" : "Gerar rascunho"}
              </>
            )}
          </Button>
          {!enabled ? (
            <p className="crm-meta">IA não configurada.</p>
          ) : draft ? (
            <p className="crm-meta">{NOTE}</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
