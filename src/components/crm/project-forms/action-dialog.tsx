"use client";
// Botão que abre um diálogo com um ActionForm; fecha ao concluir com sucesso. Para passos curtos
// (mover estágio, publicar, assinar termo...). Diálogos maiores recebem `wide`.
import { useRouter } from "next/navigation";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ActionForm, type FormAction } from "./action-form";

type ActionDialogProps = {
  triggerLabel: string;
  title: string;
  description?: ReactNode;
  action: FormAction;
  submitLabel: string;
  children: ReactNode;
  disabled?: boolean;
  wide?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  submitVariant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  // Mantém o diálogo aberto depois do sucesso (ex.: comissão com avisos a ler).
  stayOpenOnSuccess?: boolean;
};

export function ActionDialog({
  triggerLabel,
  title,
  description,
  action,
  submitLabel,
  children,
  disabled,
  wide,
  variant = "outline",
  submitVariant,
  size,
  stayOpenOnSuccess,
}: ActionDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant={variant} size={size} disabled={disabled} className="min-h-10" />}
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent
        className={cn("max-h-[90vh] overflow-y-auto", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <ActionForm
          action={action}
          submitLabel={submitLabel}
          variant={submitVariant}
          showSuccess={Boolean(stayOpenOnSuccess)}
          onSuccess={() => {
            router.refresh();
            if (!stayOpenOnSuccess) setOpen(false);
          }}
        >
          {children}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
