"use client";

import { Mic, Sparkles, Square, Undo2 } from "lucide-react";
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";
import { applyLeadAttributesAction, organizeNotesAction } from "@/actions/ai-notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Notes } from "@/lib/ai/notes";
import { initialAiActionState } from "@/lib/ai/types";
import { initialCrmActionState } from "@/lib/crm/action-state";
import { toDateTimeLocal } from "@/lib/crm/format";
import { ACTIVITY_TYPE_LABELS } from "@/lib/crm/labels";
import type { LeadSegment } from "@/lib/domain/enums";
import { Callout } from "../ui/callout";
import { describeInputDate } from "../ui/date-hint";

// "Ditar" e "Organizar com IA" no formulário Registrar atividade (ADR-003, frente 2; ia-plano.md,
// Frente B). O ditado é só do navegador (Web Speech API, pt-BR): nenhum áudio vai ao servidor e
// o texto só sai daqui pela Server Action organizeNotesAction, no clique. A sugestão fica num
// Callout para revisão; "Aplicar ao formulário" entrega o resultado ao ActivityForm (onOrganized),
// "Desfazer" pede a restauração (onUndo) e o registro continua pelo botão "Registrar".
export type DictationToolsProps = {
  leadId: string;
  segment: LeadSegment;
  enabled: boolean;
  textareaId: string;
  onOrganized?: (result: Notes) => void;
  onUndo?: () => void;
};

// Mínimo de caracteres para organizar (igual a NOTES_TEXT_MIN em src/lib/ai/notes.ts; o valor é
// repetido aqui para o cliente não importar o módulo com zod).
const TEXT_MIN = 20;

// Tipos mínimos da Web Speech API: lib.dom não os declara e só precisamos destes membros.
type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; 0: RecognitionAlternative };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type RecognitionErrorEvent = { error: string };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionCtor = new () => Recognition;

// Para useSyncExternalStore: nada a assinar (a API não muda em tempo de execução); no servidor e na
// hidratação o valor é false, no navegador é a presença da API.
const subscribeNoop = () => () => {};
const hasRecognition = () => recognitionCtor() !== null;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function textareaOf(id: string): HTMLTextAreaElement | null {
  const el = document.getElementById(id);
  return el instanceof HTMLTextAreaElement ? el : null;
}

// Escreve no textarea (não controlado) e dispara `input` para quem escuta o campo.
function setTextareaValue(el: HTMLTextAreaElement, value: string) {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function appendTranscript(el: HTMLTextAreaElement, transcript: string) {
  const text = transcript.trim();
  if (!text) return;
  const current = el.value;
  const separator = current && !/\s$/.test(current) ? " " : "";
  setTextareaValue(el, `${current}${separator}${text}`);
}

const SPEECH_ERRORS: Record<string, string> = {
  "not-allowed": "Permita o microfone no navegador.",
  "service-not-allowed": "Permita o microfone no navegador.",
  "audio-capture": "Nenhum microfone encontrado.",
  network: "O reconhecimento de voz ficou sem conexão.",
};

export function describeEmDias(emDias: number): string {
  if (emDias === 0) return "hoje";
  if (emDias === 1) return "amanhã";
  return `em ${emDias} dias`;
}

export function DictationTools({
  leadId,
  enabled,
  textareaId,
  onOrganized,
  onUndo,
}: DictationToolsProps) {
  const supported = useSyncExternalStore(subscribeNoop, hasRecognition, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [textLength, setTextLength] = useState(0);
  // Sugestão aplicada ao formulário: guardada pelo runId, então uma nova sugestão volta a "não aplicada".
  const [appliedRun, setAppliedRun] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const helpId = useId();
  const resultId = useId();

  const [state, organize, organizing] = useActionState(organizeNotesAction, initialAiActionState);
  const [saveState, saveFields, saving] = useActionState(
    applyLeadAttributesAction,
    initialCrmActionState,
  );
  const applied = state.status === "ok" && appliedRun === state.runId;

  // Acompanha o tamanho do texto do campo "O que aconteceu" (ditado, colado ou digitado).
  useEffect(() => {
    const el = textareaOf(textareaId);
    if (!el) return;
    const update = () => setTextLength(el.value.trim().length);
    // `reset` limpa o campo depois do evento: lê o valor no próximo tick.
    const afterReset = () => queueMicrotask(update);
    const form = el.form;
    update();
    el.addEventListener("input", update);
    form?.addEventListener("reset", afterReset);
    return () => {
      el.removeEventListener("input", update);
      form?.removeEventListener("reset", afterReset);
    };
  }, [textareaId]);

  // Encerra o reconhecimento ao desmontar.
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (saveState.status === "ok" && saveState.message) toast.success(saveState.message);
    if (saveState.status === "error" && saveState.message) toast.error(saveState.message);
  }, [saveState]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    const Ctor = recognitionCtor();
    const el = textareaOf(textareaId);
    if (!Ctor || !el) return;
    const recognition = new Ctor();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let partial = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) appendTranscript(el, result[0].transcript);
        else partial += result[0].transcript;
      }
      setInterim(partial.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      setSpeechError(
        SPEECH_ERRORS[event.error] ?? "O reconhecimento de voz falhou. Tente de novo.",
      );
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setInterim("");
    };
    recognitionRef.current = recognition;
    setSpeechError(null);
    setInterim("");
    setListening(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setSpeechError("O reconhecimento de voz falhou. Tente de novo.");
    }
  }, [textareaId]);

  const canOrganize = enabled && textLength >= TEXT_MIN && !organizing;

  function handleOrganize() {
    const el = textareaOf(textareaId);
    if (!el || !canOrganize) return;
    if (listening) stopListening();
    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("text", el.value);
    startTransition(() => organize(formData));
  }

  function handleApply(notes: Notes) {
    onOrganized?.(notes);
    setAppliedRun(state.status === "ok" ? state.runId : null);
  }

  function handleUndo() {
    onUndo?.();
    setAppliedRun(null);
  }

  function handleSaveFields(notes: Notes) {
    const attributes = Object.fromEntries(notes.campos.map((c) => [c.chave, c.valor]));
    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("attributes", JSON.stringify(attributes));
    startTransition(() => saveFields(formData));
  }

  const organizeButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-11 md:h-7"
      disabled={!canOrganize}
      focusableWhenDisabled
      aria-describedby={helpId}
      aria-controls={resultId}
      onClick={handleOrganize}
    >
      <Sparkles aria-hidden="true" />
      {organizing ? "Organizando…" : "Organizar com IA"}
    </Button>
  );

  const help = !enabled
    ? "IA não configurada."
    : textLength < TEXT_MIN
      ? `Dite ou escreva pelo menos ${TEXT_MIN} caracteres para organizar.`
      : "Devolve assunto, tipo, resumo, próxima ação e campos da empresa para você revisar.";

  const notes = state.status === "ok" ? state.data : null;

  return (
    <div data-ai-dictation="" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {supported ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 md:h-7"
            aria-pressed={listening}
            onClick={listening ? stopListening : startListening}
          >
            {listening ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
            {listening ? "Parar" : "Ditar"}
          </Button>
        ) : null}
        {enabled ? (
          organizeButton
        ) : (
          <Tooltip>
            <TooltipTrigger render={organizeButton} />
            <TooltipContent>IA não configurada</TooltipContent>
          </Tooltip>
        )}
        {listening ? (
          <span aria-live="polite" className="crm-meta min-w-0 flex-1 truncate">
            {interim || "Ouvindo…"}
          </span>
        ) : null}
        <span className="crm-meta">
          {supported
            ? "O reconhecimento de voz é do navegador."
            : "Ditado disponível no Chrome e no Edge."}
        </span>
      </div>
      <p id={helpId} className={enabled && textLength >= TEXT_MIN ? "sr-only" : "crm-meta"}>
        {help}
      </p>
      {speechError ? (
        <p role="alert" className="text-destructive text-sm">
          {speechError}
        </p>
      ) : null}
      <div id={resultId} aria-busy={organizing} className="flex flex-col gap-2 empty:hidden">
        {organizing ? (
          <div className="flex flex-col gap-2" aria-hidden="true">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : null}
        {!organizing && state.status === "error" ? (
          <Callout tone="warning" role="alert">
            {state.message}
          </Callout>
        ) : null}
        {!organizing && notes ? (
          <Callout tone="info" title="Sugestão da IA" role="status" className="[&>div]:flex-1">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{ACTIVITY_TYPE_LABELS[notes.tipo]}</Badge>
                <span className="font-medium">{notes.assunto}</span>
              </div>
              <p className="whitespace-pre-line">{notes.resumo}</p>
              {notes.proximaAcao ? (
                <p>
                  <span className="font-medium">Próxima ação:</span> {notes.proximaAcao.descricao} ·{" "}
                  {describeEmDias(notes.proximaAcao.emDias)} (
                  {describeInputDate(toDateTimeLocal(new Date(notes.proximaAcao.at)))})
                </p>
              ) : (
                <p className="crm-meta">Nenhuma próxima ação combinada.</p>
              )}
              {notes.tarefas.length ? (
                <div>
                  <p className="font-medium">Combinados</p>
                  <ul className="list-disc pl-5">
                    {notes.tarefas.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {notes.campos.length ? (
                <div>
                  <p className="font-medium">Campos da empresa detectados</p>
                  <ul className="list-disc pl-5">
                    {notes.campos.map((c) => (
                      <li key={c.chave}>
                        {c.rotulo}: {c.valorRotulo}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {notes.incertezas.length ? (
                <div>
                  <p className="font-medium">Ficou em aberto</p>
                  <ul className="list-disc pl-5">
                    {notes.incertezas.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {applied ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 md:h-7"
                    onClick={handleUndo}
                  >
                    <Undo2 aria-hidden="true" />
                    Desfazer
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 md:h-7"
                    onClick={() => handleApply(notes)}
                  >
                    Aplicar ao formulário
                  </Button>
                )}
                {notes.campos.length ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 md:h-7"
                    disabled={saving}
                    onClick={() => handleSaveFields(notes)}
                  >
                    {saving ? "Salvando…" : "Salvar campos da empresa"}
                  </Button>
                ) : null}
              </div>
              {applied ? (
                <p className="crm-meta" aria-live="polite">
                  Preenchidos no formulário: tipo, assunto, o que aconteceu
                  {notes.proximaAcao ? " e próxima ação" : ""}. Revise e clique em Registrar.
                </p>
              ) : null}
            </div>
          </Callout>
        ) : null}
      </div>
    </div>
  );
}
