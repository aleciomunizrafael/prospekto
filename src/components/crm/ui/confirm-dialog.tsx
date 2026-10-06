"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { useRouter } from "next/navigation";
import { isValidElement, useCallback, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionForm, type FormAction } from "../project-forms/action-form";

// Confirmação destrutiva (crm-design-system.md, seção 5.2, decisão D16): Marcar perdido, Cancelar
// aporte, Arquivar projeto, Despublicar. Sobre @base-ui/react/alert-dialog, cujo Root dá
// `role="alertdialog"` ao Popup; as partes Portal/Backdrop/Popup/Title/Description são as mesmas
// do Dialog, por isso reaproveitamos DialogContent e companhia. O botão de confirmação fica
// `disabled` enquanto o campo `requireField` (ex.: o motivo) estiver vazio.
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel,
  tone = "default",
  action,
  children,
  requireField,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  stayOpenOnSuccess,
  wide,
}: {
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  tone?: "danger" | "default";
  action: FormAction;
  children?: ReactNode;
  requireField?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  stayOpenOnSuccess?: boolean;
  wide?: boolean;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = useCallback(
    (value: boolean) => {
      setOwnOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );
  const router = useRouter();
  const [filled, setFilled] = useState(!requireField);
  const formRef = useRef<HTMLFormElement>(null);

  function readRequired(form: HTMLFormElement | null) {
    if (!requireField || !form) return;
    const el = form.elements.namedItem(requireField);
    const value =
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
        ? el.value.trim()
        : "";
    setFilled(value.length > 0);
  }

  return (
    <AlertDialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setTimeout(() => readRequired(formRef.current), 0);
      }}
    >
      {trigger !== undefined && trigger !== null ? (
        isValidElement(trigger) ? (
          <AlertDialogPrimitive.Trigger render={trigger} />
        ) : (
          <AlertDialogPrimitive.Trigger render={<Button variant="outline" />}>
            {trigger}
          </AlertDialogPrimitive.Trigger>
        )
      ) : null}
      <DialogContent showCloseButton={false} className={wide ? "sm:max-w-2xl" : "sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <ActionForm
          action={action}
          submitLabel={confirmLabel}
          pendingLabel={pendingLabel}
          variant={tone === "danger" ? "destructive" : "default"}
          footer="dialog"
          formRef={formRef}
          submitDisabled={!filled}
          onChange={(event) => readRequired(event.currentTarget)}
          showSuccess={Boolean(stayOpenOnSuccess)}
          secondaryAction={
            <AlertDialogPrimitive.Close
              render={<Button variant="ghost" size="touch" className="md:h-9" />}
            >
              Voltar
            </AlertDialogPrimitive.Close>
          }
          onSuccess={() => {
            router.refresh();
            onSuccess?.();
            if (!stayOpenOnSuccess) setOpen(false);
          }}
        >
          {children}
        </ActionForm>
      </DialogContent>
    </AlertDialogPrimitive.Root>
  );
}
