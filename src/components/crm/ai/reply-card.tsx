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
import { refreshSlotLabels } from "@/lib/ai/qualification";
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
import { cn } from "@/lib/utils";
import type { AiPanelLead } from "./ai-panel";
import { TextField, TextareaField } from "../forms/fields";
import { HiddenField, type FormAction } from "../project-forms/action-form";

// "Resposta sugerida" (ADR-003, frente 3; ia-plano.md, Frente C). Um rascunho por canal, na voz
// da Daniela, com as perguntas de qualificação e dois horários propostos pelo código. Abre com o
// último rascunho gravado em ai_runs (`initial`, decisão P2); a Server Action só roda no clique e
// "Gerar de novo" sempre chama. Nada sai sem um clique: "Enviar por e-mail" passa pelo
// ConfirmDialog e "Abrir no WhatsApp" só abre o aplicativo com o texto editado. Só tipos vêm de
// src/lib/ai/reply.ts: zod e os prompts ficam no servidor (a troca de rótulos de horário vem de
// src/lib/ai/qualification.ts, que é puro e sem zod).
export type ReplyCardProps = {
  lead: AiPanelLead;
  enabled: boolean;
  initial: AiRunSnapshot | null;
  // Instante (ISO) em que um e-mail já saiu com o rascunho `initial`, pela atividade `email`
  // com o mesmo runId (replySentAt na página); null quando ainda não foi enviado.
  initialSentAt: string | null;
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
  // Rascunho de outro dia cujos rótulos de horário foram trocados pelos de hoje ao abrir.
  refreshedSlots: boolean;
  runId: string | null;
  createdAt: string;
};

type Drafts = Record<ReplyChannel, Draft | null>;

const NOTE = "Rascunho da IA na voz da Daniela. Edite antes de enviar.";
const MIN_TEXT = 20;
// Igual a REPLY_LIMITS.whatsappChars em src/lib/ai/reply.ts (de lá só vêm tipos): uma tela de
// celular, não um limite técnico; a geração corta nele e a edição só avisa.
const WHATSAPP_CHARS = 900;

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
// depois de normalizeReply); aqui vira Draft sem zod (nunca lança). Rascunho de outro dia
// (`today` é o dia civil do servidor): os rótulos de horário do texto são trocados pelos de hoje
// quando todos estão no texto; senão o rascunho fica como está e o cartão avisa, sem assumir que
// os horários de hoje estão no texto.
function draftsFromSnapshot(
  snapshot: AiRunSnapshot | null,
  slots: AiSlot[],
  today: string,
): Drafts {
  const empty: Drafts = { email: null, whatsapp: null };
  if (!snapshot) return empty;
  const o = snapshot.output as Record<string, unknown>;
  if (typeof o.texto !== "string" || !o.texto.trim()) return empty;
  const channel = channelOf(snapshot, o);
  const saved = strings(o.horarios_incluidos);
  const stale = calendarDateInSaoPaulo(new Date(snapshot.createdAt)) !== today;
  const refreshed = stale ? refreshSlotLabels(o.texto, saved, slots) : null;
  return {
    ...empty,
    [channel]: {
      subject: channel === "email" && typeof o.assunto === "string" ? o.assunto : "",
      text: refreshed?.replaced ? refreshed.texto : o.texto,
      horarios: refreshed?.replaced
        ? refreshed.horarios
        : saved.length
          ? saved
          : stale
            ? []
            : slots.map((s) => s.label),
      slots,
      refreshedSlots: !!refreshed?.replaced,
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
    refreshedSlots: false,
    runId,
    createdAt: new Date().toISOString(),
  };
}

const joinLabels = (labels: string[]) =>
  labels.length > 1
    ? `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`
    : (labels[0] ?? "");

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

// Só a silhueta: o anúncio "Gerando o rascunho…" sai da região viva fixa do cartão.
function DraftSkeleton() {
  return (
    <div className="flex flex-col gap-2">
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
  initialSentAt,
  slots,
  canEmail,
  emailBlockReason,
  whatsappHref,
  now,
}: ReplyCardProps) {
  // Dia civil de hoje pelo relógio do servidor (prop), como no ActivityForm e no Timeline: o
  // mesmo valor no SSR e na hidratação (o inicializador de useState rodaria nos dois lados).
  const today = calendarDateInSaoPaulo(new Date(now));
  const [drafts, setDrafts] = useState<Drafts>(() => draftsFromSnapshot(initial, slots, today));
  // Padrão: e-mail quando o endereço está ok, senão WhatsApp (se houver telefone); um rascunho
  // gravado abre no canal dele.
  const [channel, setChannel] = useState<ReplyChannel>(() => {
    const saved = draftsFromSnapshot(initial, slots, today);
    if (saved.whatsapp && !saved.email && lead.hasPhone) return "whatsapp";
    if (lead.emailStatus !== "ok" && lead.hasPhone) return "whatsapp";
    return "email";
  });
  const [opened, setOpened] = useState(false);
  const [recorded, setRecorded] = useState(false);
  // Instante em que o e-mail saiu com este rascunho: o botão dá lugar à nota até a pessoa editar
  // ou gerar de novo (evita o envio duplicado). Começa pelo que a página leu na linha do tempo,
  // para o recarregamento não devolver o botão de um e-mail que já foi enviado; a action também
  // recusa o reenvio do mesmo texto com o mesmo runId.
  const [sent, setSent] = useState<string | null>(initialSentAt);
  const blockId = useId();
  const hintId = useId();
  const noteId = useId();
  const alertId = useId();
  const noPhoneId = useId();

  const [state, formAction, pending] = useActionState(
    async (prev: AiActionState<ReplyDraft>, formData: FormData) => {
      const result = await generateReplyAction(prev, formData);
      if (result.status === "ok") {
        const next = draftFromResult(result.data, result.runId);
        setDrafts((d) => ({ ...d, [result.data.channel]: next }));
        setChannel(result.data.channel);
        setOpened(false);
        setRecorded(false);
        setSent(null);
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
  // Rascunho de outro dia: ou os rótulos de horário foram trocados pelos de hoje ao abrir
  // (refreshedSlots), ou o texto ainda traz horários que podem ter passado (slotsOutdated): nesse
  // caso a próxima ação não é marcada, porque os horários de hoje não estão no texto.
  const stale = !!draft && calendarDateInSaoPaulo(new Date(draft.createdAt)) !== today;
  const slotsOutdated = stale && !draft.refreshedSlots;

  const error = state.status === "error" ? state : null;
  // Teto diário atingido: só volta amanhã; o botão fica desabilitado até recarregar a página.
  const blocked = !enabled || error?.reason === "quota";
  const text = draft?.text ?? "";
  const subject = draft?.subject ?? "";
  const canSend = text.trim().length >= MIN_TEXT && subject.trim().length > 0;
  const nextSlot = slotsOutdated ? null : (draft?.slots[0] ?? slots[0] ?? null);
  const updateDraft = (patch: Partial<Pick<Draft, "subject" | "text">>) => {
    setSent(null);
    setDrafts((d) => {
      const current = d[channel];
      return current ? { ...d, [channel]: { ...current, ...patch } } : d;
    });
  };

  // As duas opções sempre aparecem; sem telefone, WhatsApp fica desabilitada e aponta a nota
  // (o canal inicial nunca cai nela: veja o useState de `channel`).
  const channelOptions = [
    { value: "email", label: "E-mail", icon: Mail },
    {
      value: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      disabled: !lead.hasPhone,
      describedBy: lead.hasPhone ? undefined : noPhoneId,
    },
  ];

  const horariosLine =
    draft && draft.horarios.length ? (
      <p className="crm-meta">Horários propostos: {draft.horarios.join(" · ")}</p>
    ) : null;

  // Contagem do WhatsApp ligada ao campo (help → aria-describedby); passar do teto é só uma dica.
  const whatsappCount =
    text.length > WHATSAPP_CHARS ? (
      <span className="text-warning">
        {`${text.length} de ${WHATSAPP_CHARS} caracteres: passa de uma tela de celular.`}
      </span>
    ) : (
      `${text.length} de ${WHATSAPP_CHARS} caracteres`
    );

  // Região viva sempre montada (vazia no início): leitor de tela anuncia o começo e o fim da
  // geração; "Gerar de novo" passa por "Gerando…" e anuncia o novo resultado. No erro volta a
  // vazia e o Callout role="alert" fala por si.
  const live = pending
    ? "Gerando o rascunho…"
    : state.status === "ok"
      ? "Rascunho pronto. Revise antes de enviar."
      : "";

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
        <p role="status" className="sr-only">
          {live}
        </p>
        <div className="flex flex-col gap-1">
          <SegmentedControl
            name="replyChannel"
            label="Canal da resposta"
            value={channel}
            onChange={(value) => setChannel(value as ReplyChannel)}
            options={channelOptions}
          />
          {!lead.hasPhone ? (
            <p id={noPhoneId} className="crm-meta">
              WhatsApp indisponível: cadastre o telefone em Contato.
            </p>
          ) : null}
        </div>

        {error ? (
          <Callout tone="warning" role="alert" id={alertId}>
            {error.message}
          </Callout>
        ) : null}

        {stale && draft ? (
          <Callout tone="info" role="status">
            {draft.refreshedSlots ? (
              <>
                Rascunho de {formatDate(draft.createdAt)}: os horários foram atualizados para{" "}
                {joinLabels(draft.horarios)}. Confira o texto antes de enviar.
              </>
            ) : (
              <>
                Rascunho de {formatDate(draft.createdAt)}: os horários propostos podem ter passado.
                Gere de novo antes de enviar.
              </>
            )}
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
                  : whatsappCount
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
                      E-mail enviado em {formatDateTime(sent)} e registrado na linha do tempo. Edite
                      o texto ou gere de novo para enviar outro.
                    </p>
                  ) : canEmail ? (
                    <ConfirmDialog
                      trigger={
                        // Alvo de 44 px no celular, 32 px a partir de md (o Trigger repassa a
                        // className); a dica do preenchimento fica ligada ao botão bloqueado.
                        <Button
                          type="button"
                          size="touch"
                          className="md:h-8"
                          disabled={!canSend}
                          aria-describedby={canSend ? undefined : hintId}
                        >
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
                        setSent(new Date().toISOString());
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
                      ) : slotsOutdated ? (
                        <p className="crm-meta">
                          A próxima ação não será alterada: os horários do rascunho são de outro
                          dia.
                        </p>
                      ) : null}
                    </ConfirmDialog>
                  ) : (
                    <Button
                      type="button"
                      size="touch"
                      className="md:h-8"
                      disabled
                      aria-describedby={blockId}
                    >
                      <Send aria-hidden="true" />
                      Enviar por e-mail
                    </Button>
                  )}
                  {canEmail && !canSend ? (
                    <p id={hintId} className="crm-meta">
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
                    size="touch"
                    className="md:h-8"
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
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="h-11 md:h-7"
                      disabled={recordPending}
                    >
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
          {/* Desabilitado mas focável (aria-disabled): o foco não cai no body durante a geração e,
              sem chave ou no teto diário, a explicação fica ligada por aria-describedby. Alvo de
              44 px no celular; 32/28 px a partir de md. */}
          <Button
            type="submit"
            variant="outline"
            size={draft ? "sm" : "touch"}
            className={cn(draft ? "h-11 md:h-7" : "md:h-8", "aria-disabled:opacity-50")}
            disabled={pending || blocked}
            focusableWhenDisabled
            aria-describedby={!enabled ? noteId : error ? alertId : undefined}
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
            <p id={noteId} className="crm-meta">
              IA não configurada.
            </p>
          ) : draft ? (
            <p className="crm-meta">{NOTE}</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
