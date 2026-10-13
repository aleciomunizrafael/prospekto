"use client";

import { MessageCircle, RefreshCw } from "lucide-react";
import { useId, useMemo, useState, useTransition, type ReactElement } from "react";
import { toast } from "sonner";
import { recordWhatsappSentAction } from "@/actions/prospecting";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  prospectingMessages,
  variantIndexFor,
  whatsappHrefForPhone,
} from "@/lib/crm/prospecting-messages";
import { agoShort } from "@/lib/crm/prospecting-view";
import { cn } from "@/lib/utils";
import { controlClass } from "../project-forms/action-form";
import { Callout } from "../ui/callout";

// Modal da cadência por WhatsApp (ADR-004, 6.6 e 6.12): mensagem revisável em três variações
// (hash estável do id do item; "outra versão" avança e descarta edições), roteiro do áudio de 40 s,
// dica da cadência e um link wa.me real (nunca window.open) com o texto editado. O clique em
// "Abrir no WhatsApp" registra whatsapp_sent_at e a activities.whatsapp; a tela diz "aberto", não
// "enviado": o CRM só sabe que abriu com esse texto. Telefone fixo não serve: aviso e botão
// desabilitado com explicação.
export type WhatsappDialogItem = {
  id: string;
  name: string;
  phone: string | null;
  // ISO, calculado no servidor (hidratação estável).
  whatsappSentAt: string | null;
};

export function whatsappTriggerLabel(item: WhatsappDialogItem, now: string): string {
  return item.whatsappSentAt
    ? `WhatsApp · aberto ${agoShort(new Date(item.whatsappSentAt), new Date(now))}`
    : "WhatsApp";
}

export function WhatsappDialog({
  item,
  now,
  size = "sm",
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  item: WhatsappDialogItem;
  now: string;
  size?: "sm" | "default" | "touch";
  trigger?: ReactElement | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = (value: boolean) => {
    setOwnOpen(value);
    onOpenChange?.(value);
  };
  const messages = useMemo(() => prospectingMessages(item.name), [item.name]);
  const [variant, setVariant] = useState(() => variantIndexFor(item.id, messages.length));
  const [text, setText] = useState(() => messages[variant] ?? messages[0] ?? "");
  const [, startTransition] = useTransition();
  const warningId = useId();
  const textareaId = useId();
  const href = text.trim() ? whatsappHrefForPhone(item.phone, text) : null;

  function nextVariant() {
    const next = (variant + 1) % messages.length;
    setVariant(next);
    setText(messages[next] ?? "");
  }

  function registerOpen() {
    const sent = text;
    startTransition(async () => {
      const result = await recordWhatsappSentAction({ itemId: item.id, text: sent });
      if (result.status === "ok") toast.success(result.message ?? "Registrado no histórico.");
      else toast.error(result.message ?? "Não foi possível registrar o WhatsApp.");
    });
    setOpen(false);
  }

  const label = whatsappTriggerLabel(item, now);
  const triggerNode =
    trigger === null ? null : trigger !== undefined ? (
      trigger
    ) : (
      <Button
        type="button"
        variant="outline"
        size={size === "sm" ? "sm" : size === "touch" ? "touch" : "lg"}
        className={cn(
          "relative z-10",
          size === "sm" ? "h-11 md:h-7" : size === "default" ? "h-11 md:h-9" : undefined,
        )}
        aria-label={`WhatsApp com ${item.name}`}
      >
        <MessageCircle aria-hidden="true" />
        {label}
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerNode ? <DialogTrigger render={triggerNode} /> : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>WhatsApp · {item.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={textareaId} className="text-sm font-medium">
                Mensagem (revise antes de enviar)
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 md:h-7"
                title="Troca a versão e descarta edições"
                onClick={nextVariant}
              >
                <RefreshCw aria-hidden="true" />
                outra versão
              </Button>
            </div>
            <textarea
              id={textareaId}
              rows={7}
              value={text}
              onChange={(event) => setText(event.target.value)}
              className={cn(controlClass, "min-h-40")}
            />
          </div>
          <Callout tone="info" title="Se responderem “pode mandar”: grave um áudio de 40 segundos">
            Quem é: Daniela, da Prospekto, que trabalha com patrocínio cultural por lei de incentivo
            na Serra. O que faz: a empresa apoia um projeto da região com a própria marca e a conta
            é feita com o contador junto, sem promessa de retorno. O convite: “queria entender como
            vocês decidem apoios e patrocínios”. Quem conta a rotina é a empresa, não você.
          </Callout>
          {href === null ? (
            <Callout tone="warning" id={warningId}>
              {item.phone
                ? "O telefone desta empresa não serve para WhatsApp: confira o número na ficha."
                : "Esta empresa não tem telefone: adicione um celular na ficha."}
            </Callout>
          ) : null}
          <p className="crm-meta">
            Dica da cadência: mensagem hoje; sem resposta, ligue em 2 dias úteis: a ligação deixa de
            ser fria.
          </p>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" size="touch" className="md:h-9" />}>
            Cancelar
          </DialogClose>
          {href ? (
            <Button
              size="touch"
              className="md:h-9"
              nativeButton={false}
              render={<a href={href} target="_blank" rel="noopener noreferrer" />}
              onClick={registerOpen}
            >
              <MessageCircle aria-hidden="true" />
              Abrir no WhatsApp
            </Button>
          ) : (
            <Button size="touch" className="md:h-9" disabled aria-describedby={warningId}>
              <MessageCircle aria-hidden="true" />
              Abrir no WhatsApp
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
