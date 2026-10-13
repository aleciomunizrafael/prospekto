"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { createTaskAction, deleteTaskAction, updateTaskAction } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toDateTimeLocal } from "@/lib/crm/format";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/crm/labels";
import { TASK_STATUSES, taskStatusOf } from "@/lib/crm/task-status";
import { TASK_PRIORITIES } from "@/lib/domain/enums";
import type { TaskRow } from "@/lib/repos/tasks";
import {
  ActionForm,
  DateTimeField,
  HiddenField,
  SelectField,
  TextField,
  TextareaField,
  controlClass,
  useFieldError,
  type Option,
} from "../project-forms/action-form";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { TaskRecordPicker, type CurrentLink } from "./task-record-picker";

// Diálogo "Nova tarefa" / "Editar tarefa" (ADR-004, 6.5; plano, frente B) sobre Dialog +
// ActionForm: título, descrição, responsável (padrão o usuário da sessão; "Ninguém" é um valor de
// verdade), prioridade, status (caminho sem arrasto no celular), prazo com DateHint e o vínculo
// opcional (TaskRecordPicker). Ao editar, "Excluir" abre um ConfirmDialog (alertdialog, D16).
// Os valores iniciais entram no `defaultValue` dos campos: quem monta passa `key` por tarefa.

// Select sem a opção vazia ("Selecione"): prioridade e status sempre têm um valor.
function ChoiceField({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: Option[];
  defaultValue: string;
}) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erro` : undefined}
        className={controlClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${id}-erro`} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function currentLinkOf(task: TaskRow): CurrentLink {
  if (task.leadId) return { kind: "lead", id: task.leadId, label: task.leadName ?? "Lead" };
  if (task.orgId) {
    return { kind: "organizacao", id: task.orgId, label: task.orgName ?? "Organização" };
  }
  if (task.projectId) {
    return { kind: "projeto", id: task.projectId, label: task.projectName ?? "Projeto" };
  }
  return null;
}

function timelineOf(task: TaskRow): string | null {
  if (task.leadId) return "do lead";
  if (task.orgId) return "da organização";
  if (task.projectId) return "do projeto";
  if (task.contributionId) return "do aporte";
  return null;
}

export type TaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // null = "Nova tarefa".
  task: TaskRow | null;
  users: Option[];
  organizations: Option[];
  projects: Option[];
  currentUserId: string;
  // Depois de salvar ou excluir (o quadro limpa ?task= / ?novo= da URL).
  onDone?: () => void;
};

export function TaskDialog({
  open,
  onOpenChange,
  task,
  users,
  organizations,
  projects,
  currentUserId,
  onDone,
}: TaskDialogProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const editing = task !== null;
  const timeline = task ? timelineOf(task) : null;

  const finish = (message: string) => {
    toast.success(message);
    router.refresh();
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Altere o que precisar; o status move a tarefa de coluna."
              : "Uma tarefa solta ou ligada a um lead, uma organização ou um projeto."}
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          action={editing ? updateTaskAction : createTaskAction}
          submitLabel="Salvar tarefa"
          pendingLabel="Salvando…"
          footer="dialog"
          showSuccess={false}
          onSuccess={(state) =>
            finish(state.message ?? (editing ? "Tarefa salva." : "Tarefa criada."))
          }
          secondaryAction={
            <>
              {task ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="touch"
                  className="text-destructive hover:text-destructive sm:mr-auto md:h-9"
                  onClick={() => setConfirmOpen(true)}
                >
                  Excluir
                </Button>
              ) : null}
              <DialogClose render={<Button variant="ghost" size="touch" className="md:h-9" />}>
                Cancelar
              </DialogClose>
            </>
          }
        >
          {task ? <HiddenField name="activityId" value={task.id} /> : null}
          <TextField
            name="subject"
            label="Título"
            required
            maxLength={200}
            defaultValue={task?.subject ?? ""}
            placeholder="O que precisa ser feito"
          />
          <TextareaField
            name="body"
            label="Descrição"
            rows={3}
            className="[&_textarea]:min-h-20"
            defaultValue={task?.body ?? ""}
            placeholder="Contexto, combinados, o que não esquecer (opcional)"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              name="ownerUserId"
              label="Responsável"
              options={users}
              placeholder="Ninguém"
              defaultValue={task ? (task.ownerUserId ?? "") : currentUserId}
            />
            <ChoiceField
              name="priority"
              label="Prioridade"
              options={TASK_PRIORITIES.map((p) => ({ value: p, label: TASK_PRIORITY_LABELS[p] }))}
              defaultValue={task?.priority ?? "media"}
            />
            <ChoiceField
              name="status"
              label="Status"
              options={TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] }))}
              defaultValue={task ? taskStatusOf(task) : "a_fazer"}
            />
            <DateTimeField
              name="dueAt"
              label="Prazo"
              defaultValue={task ? toDateTimeLocal(task.dueAt) : ""}
              help="Opcional."
            />
          </div>
          <TaskRecordPicker
            organizations={organizations}
            projects={projects}
            current={task ? currentLinkOf(task) : null}
          />
        </ActionForm>
        {task ? (
          <ConfirmDialog
            trigger={null}
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={`Excluir tarefa "${task.subject}"?`}
            description={
              timeline
                ? `Ela some da linha do tempo ${timeline}; isso não pode ser desfeito.`
                : "Isso não pode ser desfeito."
            }
            confirmLabel="Excluir tarefa"
            pendingLabel="Excluindo…"
            tone="danger"
            action={deleteTaskAction}
            onSuccess={() => {
              setConfirmOpen(false);
              finish("Tarefa excluída.");
            }}
          >
            <HiddenField name="activityId" value={task.id} />
          </ConfirmDialog>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
