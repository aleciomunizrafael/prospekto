"use client";

import { ClipboardPaste } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type ReactElement } from "react";
import { toast } from "sonner";
import { pasteItemsAction } from "@/actions/prospecting";
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
import { describePastePreview, parseProspectingPaste } from "@/lib/crm/prospecting-paste";
import { ActionForm, HiddenField, TextareaField } from "../project-forms/action-form";

const PLACEHOLDER =
  "# Vinícolas\nVinícola Exemplo | (54) 3000-0000 | Lançaram um rótulo novo em setembro\nMetalúrgica Modelo | 54 99000-0001";

// "Colar lista" (ADR-004, 6.6 e 6.12): textarea mono com a prévia calculada no cliente pelo mesmo
// parser que a action usa no servidor (fonte única); o texto bruto é o que viaja. O aviso de
// telefones já descartados em outra lista vem no toast, depois de gravar.
export function PasteDialog({
  listId,
  trigger,
  size = "default",
}: {
  listId: string;
  trigger?: ReactElement | null;
  size?: "default" | "touch";
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const router = useRouter();
  const previewId = useId();
  const parsed = useMemo(() => parseProspectingPaste(text), [text]);
  const count = parsed.items.length;
  const triggerNode =
    trigger === null ? null : trigger !== undefined ? (
      trigger
    ) : (
      <Button
        type="button"
        variant="outline"
        size={size === "touch" ? "touch" : undefined}
        className={size === "touch" ? undefined : "h-11 md:h-9"}
      >
        <ClipboardPaste aria-hidden="true" />
        Colar lista
      </Button>
    );
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setText("");
      }}
    >
      {triggerNode ? <DialogTrigger render={triggerNode} /> : null}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Colar lista</DialogTitle>
          <DialogDescription>
            Uma empresa por linha: Nome | Telefone | Abertura (separe com |, ; ou tabulação). Uma
            linha começando com # vira o segmento das linhas seguintes. Telefone com DDD; o que não
            for reconhecido fica nas informações da empresa. Até 500 empresas por colagem.
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          action={pasteItemsAction}
          submitLabel={count > 0 ? `Adicionar ${count}` : "Adicionar"}
          pendingLabel="Adicionando..."
          footer="dialog"
          showSuccess={false}
          submitDisabled={count === 0}
          submitDescribedBy={previewId}
          secondaryAction={
            <DialogClose render={<Button variant="ghost" size="touch" className="md:h-9" />}>
              Cancelar
            </DialogClose>
          }
          onSuccess={(state) => {
            toast.success(state.message ?? "Empresas adicionadas.");
            router.refresh();
            setOpen(false);
            setText("");
          }}
        >
          <HiddenField name="listId" value={listId} />
          <TextareaField
            name="text"
            label="Empresas"
            rows={10}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            className="font-mono [&_textarea]:font-mono [&_textarea]:text-xs"
          />
          <p id={previewId} role="status" aria-live="polite" className="crm-meta">
            {text.trim()
              ? describePastePreview(parsed)
              : "Cole a lista para ver quantas empresas foram reconhecidas."}
          </p>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
