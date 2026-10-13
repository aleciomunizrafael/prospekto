"use client";

import { Ellipsis, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import { toast } from "sonner";
import { createListAction, deleteListAction, updateListAction } from "@/actions/prospecting";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { plural } from "@/lib/crm/text";
import { fabClassName } from "../shell/fab";
import {
  ActionForm,
  HiddenField,
  SelectField,
  TextField,
  TextareaField,
  type Option,
} from "../project-forms/action-form";
import { ConfirmDialog } from "../ui/confirm-dialog";

// Diálogos das listas de prospecção (ADR-004, 6.6 e 6.12): Nova lista (botão do cabeçalho no
// desktop, FAB no celular, ou ?nova=1), Editar lista em Sheet lateral e Excluir lista com
// confirmação. "De onde vieram os dados" é obrigatório pela LGPD (art. 18), como em contatos.
export type ListFormValues = {
  id?: string;
  name?: string | null;
  region?: string | null;
  notes?: string | null;
  sourceDetail?: string | null;
  assigneeUserId?: string | null;
};

function ListFields({
  list,
  users,
  defaultAssigneeUserId,
}: {
  list?: ListFormValues;
  users: Option[];
  defaultAssigneeUserId?: string | null;
}) {
  return (
    <>
      {list?.id ? <HiddenField name="listId" value={list.id} /> : null}
      <TextField
        name="name"
        label="Nome"
        required
        autoComplete="off"
        defaultValue={list?.name ?? ""}
      />
      <TextField
        name="region"
        label="Região"
        autoComplete="off"
        defaultValue={list?.region ?? ""}
        help="Cidade ou região das empresas, por exemplo Bento Gonçalves/RS."
      />
      <SelectField
        name="assigneeUserId"
        label="Responsável"
        placeholder="Sem responsável"
        options={users}
        defaultValue={list ? (list.assigneeUserId ?? "") : (defaultAssigneeUserId ?? "")}
        help="Quem liga para as empresas desta lista."
      />
      <TextField
        name="sourceDetail"
        label="De onde vieram os dados"
        required
        autoComplete="off"
        defaultValue={list?.sourceDetail ?? ""}
        help="Obrigatório pela LGPD: por exemplo busca pública, associação comercial, indicação."
      />
      <TextareaField
        name="notes"
        label="Notas"
        rows={3}
        defaultValue={list?.notes ?? ""}
        help="Instruções para quem liga: horário, abertura, o que não dizer."
      />
    </>
  );
}

export function NewListDialog({
  users,
  defaultAssigneeUserId,
  defaultOpen = false,
  returnHref = "/app/prospeccao",
  trigger = "header",
}: {
  users: Option[];
  defaultAssigneeUserId?: string | null;
  defaultOpen?: boolean;
  returnHref?: string;
  // "header": botão no desktop + FAB no celular; "none": sem gatilho visível (só por ?nova=1).
  trigger?: "header" | "none";
}) {
  const [open, setOpen] = useState(defaultOpen);
  const router = useRouter();
  const onOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value && defaultOpen && returnHref) router.replace(returnHref);
  };
  return (
    <>
      {trigger === "header" ? (
        <>
          <Button type="button" className="hidden md:inline-flex" onClick={() => setOpen(true)}>
            <Plus aria-hidden="true" />
            Nova lista
          </Button>
          <button
            type="button"
            aria-label="Nova lista"
            className={fabClassName}
            onClick={() => setOpen(true)}
          >
            <Plus className="size-6" aria-hidden="true" />
          </button>
        </>
      ) : null}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pr-8">
            <DialogTitle>Nova lista</DialogTitle>
            <DialogDescription>
              Empresas para ligar, com a abertura de cada ligação e o resultado.
            </DialogDescription>
          </DialogHeader>
          <ActionForm
            action={createListAction}
            submitLabel="Criar lista"
            pendingLabel="Criando..."
            footer="dialog"
            showSuccess={false}
            secondaryAction={
              <DialogClose render={<Button variant="ghost" size="touch" className="md:h-9" />}>
                Cancelar
              </DialogClose>
            }
          >
            <ListFields users={users} defaultAssigneeUserId={defaultAssigneeUserId} />
          </ActionForm>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function EditListSheet({
  list,
  users,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  list: ListFormValues & { id: string };
  users: Option[];
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
  const router = useRouter();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger === null ? null : trigger ? (
        <SheetTrigger render={trigger} />
      ) : (
        <SheetTrigger render={<Button variant="outline" />}>Editar lista</SheetTrigger>
      )}
      <SheetContent side="right" className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Editar lista</SheetTitle>
          <SheetDescription>{list.name}</SheetDescription>
        </SheetHeader>
        <ActionForm
          action={updateListAction}
          submitLabel="Salvar alterações"
          showSuccess={false}
          onSuccess={() => {
            toast.success("Lista salva.");
            router.refresh();
            setOpen(false);
          }}
          secondaryAction={
            <Button
              type="button"
              variant="ghost"
              size="touch"
              className="md:h-9"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
          }
        >
          <ListFields list={list} users={users} />
        </ActionForm>
      </SheetContent>
    </Sheet>
  );
}

export function DeleteListDialog({
  list,
  trigger,
  open,
  onOpenChange,
}: {
  list: { id: string; name: string; total: number };
  trigger?: ReactElement | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <ConfirmDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir lista"
      description={`Excluir a lista “${list.name}” e suas ${plural(list.total, "empresa", "empresas")}? Leads e organizações já criados continuam no CRM.`}
      confirmLabel="Excluir lista"
      pendingLabel="Excluindo..."
      tone="danger"
      action={deleteListAction}
    >
      <HiddenField name="listId" value={list.id} />
    </ConfirmDialog>
  );
}

// "⋯" do cabeçalho da lista: Editar lista (Sheet) e Excluir lista (confirmação).
export function ListMoreMenu({
  list,
  users,
}: {
  list: ListFormValues & { id: string; name: string; total: number };
  users: Option[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label="Mais ações da lista"
              className="h-11 w-11 md:h-9 md:w-9"
            />
          }
        >
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar lista</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            Excluir lista
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditListSheet
        list={list}
        users={users}
        trigger={null}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteListDialog list={list} trigger={null} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
