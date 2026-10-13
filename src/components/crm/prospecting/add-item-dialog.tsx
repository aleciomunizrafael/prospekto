"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import { toast } from "sonner";
import { addItemAction } from "@/actions/prospecting";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActionForm, HiddenField, TextField, TextareaField } from "../project-forms/action-form";

// "Adicionar" uma empresa à lista (ADR-004, 6.6): nome, telefone, segmento e a abertura da ligação.
// A ação primária da lista (sólida); para várias de uma vez existe o "Colar lista".
export function AddItemDialog({
  listId,
  trigger,
  size = "default",
}: {
  listId: string;
  trigger?: ReactElement | null;
  size?: "default" | "touch";
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const triggerNode =
    trigger === null ? null : trigger !== undefined ? (
      trigger
    ) : (
      <Button
        type="button"
        size={size === "touch" ? "touch" : undefined}
        className={size === "touch" ? undefined : "h-11 md:h-9"}
      >
        <Plus aria-hidden="true" />
        Adicionar
      </Button>
    );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerNode ? <DialogTrigger render={triggerNode} /> : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>Adicionar empresa</DialogTitle>
          <DialogDescription>Uma empresa por vez. Para várias, use Colar lista.</DialogDescription>
        </DialogHeader>
        <ActionForm
          action={addItemAction}
          submitLabel="Adicionar empresa"
          pendingLabel="Adicionando..."
          footer="dialog"
          showSuccess={false}
          secondaryAction={
            <DialogClose render={<Button variant="ghost" size="touch" className="md:h-9" />}>
              Cancelar
            </DialogClose>
          }
          onSuccess={(state) => {
            toast.success(state.message ?? "Empresa adicionada.");
            router.refresh();
            setOpen(false);
          }}
        >
          <HiddenField name="listId" value={listId} />
          <TextField name="name" label="Nome" required autoComplete="off" />
          <TextField
            name="phone"
            label="Telefone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            help="Com DDD, por exemplo (54) 3000-0000. Celular para o WhatsApp."
          />
          <TextField
            name="segment"
            label="Segmento"
            autoComplete="off"
            help="Grupo dentro da lista, por exemplo Vinícolas."
          />
          <TextareaField
            name="hook"
            label="Abertura da ligação"
            rows={3}
            placeholder="Fato público sobre a empresa que abre a conversa. Adivinhar a dor, não."
          />
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
