"use client";

import { CalendarCheck, Ellipsis, Phone, RotateCcw, StickyNote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteItemAction, recordCallResultAction } from "@/actions/prospecting";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { idleState } from "@/lib/crm/form-state";
import { DISCARD_REASON_LABELS } from "@/lib/crm/labels";
import { callResultToast } from "@/lib/crm/prospecting-view";
import { DISCARD_REASONS } from "@/lib/domain/enums";
import { cn } from "@/lib/utils";
import {
  ActionForm,
  DateField,
  HiddenField,
  SelectField,
  TextareaField,
} from "../project-forms/action-form";
import { ActionBarMobile, type ActionBarMoreItem } from "../ui/action-bar-mobile";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { ConvertDialog, type ConvertDefaults } from "./convert-dialog";
import { WhatsappDialog, type WhatsappDialogItem } from "./whatsapp-dialog";

// Botões de resultado da ligação (ADR-004, 6.6 e 6.12): em a_ligar, sem_resposta e retornar,
// "Reunião marcada" (ConvertDialog), "Sem resposta" (formulário direto), "Retornar" (data padrão
// de 2 dias úteis e anotação) e "Descartar" (alertdialog com o motivo). Em descartado ou
// reuniao_marcada, só "Voltar para a ligar" (com confirmação quando a empresa pediu para não ser
// contatada). "Anotação" grava notes pela mesma action, sem mudar o status. Em item já convertido
// que voltou para a ligar (leadId preenchido), "Reunião marcada" não aparece: a conversão é
// recusada pelo servidor e a reunião se registra no lead (Ver lead). Enquanto uma gravação está
// pendente o grupo fica aria-busy e desabilitado; o sucesso vira toast e refresh() pela action.
export type ResultItem = {
  id: string;
  name: string;
  status: string;
  notes: string | null;
  leadId: string | null;
};

export type ResultContext = ConvertDefaults & {
  // Valor de input type="date": 2 dias úteis a partir de hoje (calculado no servidor).
  defaultCallbackAt: string;
  // data.reason do último descarte (quando descartado), para o "Voltar" pedir confirmação.
  discardReason?: string | null;
};

type DialogKey = "convert" | "retornar" | "descartar" | "anotacao" | "voltar";

const ACTIONABLE = new Set(["a_ligar", "sem_resposta", "retornar"]);
const REASON_OPTIONS = DISCARD_REASONS.map((r) => ({ value: r, label: DISCARD_REASON_LABELS[r] }));

// Um useActionState por grupo: `formAction` serve aos <form> dos botões diretos e `submit` às
// chamadas de menu (ActionBarMobile e "⋯"), sempre dentro de uma transição.
function useQuickResult(itemId: string) {
  const [state, formAction, pending] = useActionState(recordCallResultAction, idleState);
  const [, startTransition] = useTransition();
  useEffect(() => {
    if (state.status === "ok") toast.success(state.message ?? "Registrado.");
    else if (state.status === "error") toast.error(state.message);
  }, [state]);
  const submit = (status: string) => {
    const fd = new FormData();
    fd.set("itemId", itemId);
    fd.set("status", status);
    startTransition(() => formAction(fd));
  };
  return { formAction, submit, pending };
}

// Os diálogos de resultado, montados uma vez por grupo e abertos por chave.
function ResultDialogs({
  item,
  ctx,
  open,
  onClose,
}: {
  item: ResultItem;
  ctx: ResultContext;
  open: DialogKey | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const closeWhenFalse = (value: boolean) => {
    if (!value) onClose();
  };
  return (
    <>
      <ConvertDialog
        item={{ id: item.id, name: item.name }}
        users={ctx.users}
        defaultOwnerUserId={ctx.defaultOwnerUserId}
        defaultMeetingAt={ctx.defaultMeetingAt}
        trigger={null}
        open={open === "convert"}
        onOpenChange={closeWhenFalse}
      />
      <Dialog open={open === "retornar"} onOpenChange={closeWhenFalse}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="pr-8">
            <DialogTitle>Retornar · {item.name}</DialogTitle>
            <DialogDescription>
              A empresa continua na lista com a data do retorno.
            </DialogDescription>
          </DialogHeader>
          <ActionForm
            action={recordCallResultAction}
            submitLabel="Marcar retorno"
            pendingLabel="Marcando..."
            footer="dialog"
            showSuccess={false}
            secondaryAction={
              <DialogClose render={<Button variant="ghost" size="touch" className="md:h-9" />}>
                Cancelar
              </DialogClose>
            }
            onSuccess={(state) => {
              toast.success(state.message ?? callResultToast("retornar"));
              router.refresh();
              onClose();
            }}
          >
            <HiddenField name="itemId" value={item.id} />
            <HiddenField name="status" value="retornar" />
            <DateField
              name="callbackAt"
              label="Retornar em"
              required
              defaultValue={ctx.defaultCallbackAt}
            />
            <TextareaField
              name="note"
              label="Anotação"
              rows={3}
              placeholder="Com quem falar, melhor horário, o que ficou combinado."
            />
          </ActionForm>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        trigger={null}
        open={open === "descartar"}
        onOpenChange={closeWhenFalse}
        title={`Descartar “${item.name}”?`}
        description="Ela continua na lista como descartada."
        confirmLabel="Descartar"
        pendingLabel="Descartando..."
        action={recordCallResultAction}
        requireField="reason"
        onSuccess={() => toast.success(callResultToast("descartado"))}
      >
        <HiddenField name="itemId" value={item.id} />
        <HiddenField name="status" value="descartado" />
        <SelectField name="reason" label="Motivo" required options={REASON_OPTIONS} />
      </ConfirmDialog>
      <Dialog open={open === "anotacao"} onOpenChange={closeWhenFalse}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="pr-8">
            <DialogTitle>Anotação · {item.name}</DialogTitle>
            <DialogDescription>
              O que aconteceu nas tentativas, com quem falar, melhor horário.
            </DialogDescription>
          </DialogHeader>
          <ActionForm
            action={recordCallResultAction}
            submitLabel="Salvar anotação"
            footer="dialog"
            showSuccess={false}
            secondaryAction={
              <DialogClose render={<Button variant="ghost" size="touch" className="md:h-9" />}>
                Cancelar
              </DialogClose>
            }
            onSuccess={() => {
              toast.success("Anotação salva.");
              router.refresh();
              onClose();
            }}
          >
            <HiddenField name="itemId" value={item.id} />
            <TextareaField
              name="note"
              label="Anotação"
              required
              rows={4}
              defaultValue={item.notes ?? ""}
            />
          </ActionForm>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        trigger={null}
        open={open === "voltar"}
        onOpenChange={closeWhenFalse}
        title="Voltar para a ligar?"
        description="Esta empresa pediu para não ser contatada. Voltar mesmo assim?"
        confirmLabel="Voltar para a ligar"
        action={recordCallResultAction}
        onSuccess={() => toast.success(callResultToast("a_ligar"))}
      >
        <HiddenField name="itemId" value={item.id} />
        <HiddenField name="status" value="a_ligar" />
      </ConfirmDialog>
    </>
  );
}

export function ResultButtons({
  item,
  ctx,
  size = "sm",
  className,
}: {
  item: ResultItem;
  ctx: ResultContext;
  size?: "sm" | "default";
  className?: string;
}) {
  const [open, setOpen] = useState<DialogKey | null>(null);
  const { formAction, pending } = useQuickResult(item.id);
  const actionable = ACTIONABLE.has(item.status);
  const canConvert = actionable && !item.leadId;
  const btnSize = size === "sm" ? "sm" : "lg";
  const btnClass = size === "sm" ? "h-11 md:h-7" : "h-11 md:h-9";
  const askBeforeBack = ctx.discardReason === "nao_contatar";
  return (
    <div
      role="group"
      aria-label={`Resultado da ligação para ${item.name}`}
      aria-busy={pending || undefined}
      className={cn("relative z-10 flex flex-wrap items-center gap-1.5", className)}
    >
      {actionable ? (
        <>
          {canConvert ? (
            <Button
              type="button"
              variant="outline"
              size={btnSize}
              className={btnClass}
              disabled={pending}
              onClick={() => setOpen("convert")}
            >
              <CalendarCheck aria-hidden="true" />
              Reunião marcada
            </Button>
          ) : null}
          <form action={formAction} className="contents">
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="status" value="sem_resposta" />
            <Button
              type="submit"
              variant="outline"
              size={btnSize}
              className={btnClass}
              disabled={pending}
            >
              Sem resposta
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            size={btnSize}
            className={btnClass}
            disabled={pending}
            onClick={() => setOpen("retornar")}
          >
            Retornar
          </Button>
          <Button
            type="button"
            variant="outline"
            size={btnSize}
            className={btnClass}
            disabled={pending}
            onClick={() => setOpen("descartar")}
          >
            Descartar
          </Button>
        </>
      ) : askBeforeBack ? (
        <Button
          type="button"
          variant="ghost"
          size={btnSize}
          className={btnClass}
          disabled={pending}
          onClick={() => setOpen("voltar")}
        >
          <RotateCcw aria-hidden="true" />
          Voltar para a ligar
        </Button>
      ) : (
        <form action={formAction} className="contents">
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="status" value="a_ligar" />
          <Button
            type="submit"
            variant="ghost"
            size={btnSize}
            className={btnClass}
            disabled={pending}
          >
            <RotateCcw aria-hidden="true" />
            Voltar para a ligar
          </Button>
        </form>
      )}
      <Button
        type="button"
        variant="ghost"
        size={btnSize}
        className={btnClass}
        disabled={pending}
        aria-label={`Anotação sobre ${item.name}`}
        onClick={() => setOpen("anotacao")}
      >
        <StickyNote aria-hidden="true" />
        Anotação
      </Button>
      <ResultDialogs item={item} ctx={ctx} open={open} onClose={() => setOpen(null)} />
    </div>
  );
}

// "⋯" do cabeçalho da ficha: Voltar para a ligar e Remover da lista (confirmação; o lead e a
// organização criados continuam no CRM).
export function ItemMoreMenu({
  item,
  listId,
  discardReason,
}: {
  item: ResultItem;
  listId: string;
  discardReason?: string | null;
}) {
  const [open, setOpen] = useState<"voltar" | "remover" | null>(null);
  const { submit, pending } = useQuickResult(item.id);
  const canGoBack = item.status !== "a_ligar";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label="Mais ações da empresa"
              className="h-11 w-11 md:h-9 md:w-9"
            />
          }
        >
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canGoBack ? (
            <DropdownMenuItem
              disabled={pending}
              onClick={() =>
                discardReason === "nao_contatar" ? setOpen("voltar") : submit("a_ligar")
              }
            >
              Voltar para a ligar
            </DropdownMenuItem>
          ) : null}
          {canGoBack ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem variant="destructive" onClick={() => setOpen("remover")}>
            Remover da lista
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        trigger={null}
        open={open === "voltar"}
        onOpenChange={(v) => !v && setOpen(null)}
        title="Voltar para a ligar?"
        description="Esta empresa pediu para não ser contatada. Voltar mesmo assim?"
        confirmLabel="Voltar para a ligar"
        action={recordCallResultAction}
        onSuccess={() => toast.success(callResultToast("a_ligar"))}
      >
        <HiddenField name="itemId" value={item.id} />
        <HiddenField name="status" value="a_ligar" />
      </ConfirmDialog>
      <ConfirmDialog
        trigger={null}
        open={open === "remover"}
        onOpenChange={(v) => !v && setOpen(null)}
        title="Remover da lista"
        description={`Remover “${item.name}” desta lista? O histórico da ligação some com ela; lead e organização já criados continuam no CRM.`}
        confirmLabel="Remover"
        pendingLabel="Removendo..."
        tone="danger"
        action={deleteItemAction}
      >
        <HiddenField name="itemId" value={item.id} />
        <HiddenField name="listId" value={listId} />
      </ConfirmDialog>
    </>
  );
}

// Barra de ações da ficha no celular (ADR-004, 6.6): Ligar e WhatsApp; no "⋯", os resultados.
export function ItemActionBar({
  item,
  phone,
  whatsapp,
  now,
  ctx,
}: {
  item: ResultItem;
  phone: string | null;
  whatsapp: WhatsappDialogItem;
  now: string;
  ctx: ResultContext;
}) {
  const [open, setOpen] = useState<DialogKey | null>(null);
  const { submit } = useQuickResult(item.id);
  const actionable = ACTIONABLE.has(item.status);
  const canConvert = actionable && !item.leadId;
  const more: ActionBarMoreItem[] = actionable
    ? [
        ...(phone && canConvert
          ? [{ label: "Reunião marcada", onSelect: () => setOpen("convert") }]
          : []),
        { label: "Sem resposta", onSelect: () => submit("sem_resposta") },
        { label: "Retornar", onSelect: () => setOpen("retornar") },
        { label: "Descartar", onSelect: () => setOpen("descartar") },
        { label: "Anotação", onSelect: () => setOpen("anotacao") },
      ]
    : [
        {
          label: "Voltar para a ligar",
          onSelect: () =>
            ctx.discardReason === "nao_contatar" ? setOpen("voltar") : submit("a_ligar"),
        },
        { label: "Anotação", onSelect: () => setOpen("anotacao") },
      ];
  return (
    <>
      <ActionBarMobile
        primary={
          phone ? (
            <Button size="touch" nativeButton={false} render={<a href={`tel:${phone}`} />}>
              <Phone aria-hidden="true" />
              Ligar
            </Button>
          ) : canConvert ? (
            <Button size="touch" onClick={() => setOpen("convert")}>
              <CalendarCheck aria-hidden="true" />
              Reunião marcada
            </Button>
          ) : (
            <Button size="touch" variant="outline" onClick={() => setOpen("anotacao")}>
              <StickyNote aria-hidden="true" />
              Anotação
            </Button>
          )
        }
        secondary={phone ? <WhatsappDialog item={whatsapp} now={now} size="touch" /> : undefined}
        more={more}
      />
      <ResultDialogs item={item} ctx={ctx} open={open} onClose={() => setOpen(null)} />
    </>
  );
}
