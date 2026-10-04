"use client";
// Diálogos do projeto: "Mover para" (seção 9.2), "Arquivar", "Publicar no site" (R-11),
// "Despublicar" e "Editar". Cada diálogo lista o que falta e mostra o campo ali mesmo.
import { useState } from "react";
import {
  createProjectAction,
  moveProjectStageAction,
  publishProjectAction,
  unpublishProjectAction,
  updateProjectAction,
} from "@/actions/projects";
import {
  LOST_REASON_LABELS,
  MECHANISM_LABELS,
  optionsFrom,
  stageLabel,
} from "@/lib/crm/enum-labels";
import { ActionDialog } from "./project-forms/action-dialog";
import {
  ActionForm,
  Blockers,
  DateField,
  HiddenField,
  MoneyField,
  SelectField,
  TextField,
  TextareaField,
  type Option,
} from "./project-forms/action-form";
import { ProjectFields, type ProjectFormValues } from "./project-form";

export type MoveDestination = {
  to: string;
  kind: "next" | "return" | "back";
  missing: string[];
};

type MoveProps = {
  projectId: string;
  stage: string;
  destinations: MoveDestination[];
  users: Option[];
};

// Campo editável para cada item de "o que falta" devolvido por collectProjectMissing.
function MissingFieldInput({ item, users }: { item: string; users: Option[] }) {
  switch (item) {
    case "mecanismo":
      return (
        <SelectField
          name="mechanism"
          label="Mecanismo"
          required
          options={optionsFrom(MECHANISM_LABELS)}
        />
      );
    case "número do processo":
      return <TextField name="processNumber" label="Número do processo" required />;
    case "valor aprovado":
      return <MoneyField name="approvedAmount" label="Valor aprovado (R$)" required />;
    case "prazo de captação":
      return <DateField name="fundraisingDeadline" label="Prazo de captação" required />;
    case "rubrica de captação":
      return (
        <MoneyField
          name="fundraisingFeeAmount"
          label="Rubrica de captação aprovada (R$)"
          required
        />
      );
    case "data limite do relatório":
      return <DateField name="reportDueAt" label="Data limite do relatório" required />;
    case "responsável pelo projeto":
      return (
        <SelectField name="ownerUserId" label="Responsável pelo projeto" required options={users} />
      );
    case "saldo a captar maior que zero":
      return (
        <p className="text-sm">
          O saldo a captar (valor aprovado menos captado) precisa ser maior que zero. Confira o
          valor aprovado no projeto.
        </p>
      );
    default:
      return <p className="text-sm">{item}</p>;
  }
}

export function MoveProjectStageDialog({ projectId, stage, destinations, users }: MoveProps) {
  const [to, setTo] = useState(destinations[0]?.to ?? "");
  const dest = destinations.find((d) => d.to === to);
  if (destinations.length === 0) return null;
  return (
    <ActionDialog
      triggerLabel="Mover para"
      title={`Mover de ${stageLabel(stage)}`}
      description="Só o próximo estágio, os retornos previstos e voltar um estágio (para corrigir registro)."
      action={moveProjectStageAction}
      submitLabel="Mover"
      variant="default"
    >
      <HiddenField name="projectId" value={projectId} />
      <SelectField
        name="to"
        label="Mover para"
        required
        placeholder="Escolha o destino"
        options={destinations.map((d) => ({
          value: d.to,
          label:
            d.kind === "back"
              ? `Voltar para ${stageLabel(d.to)} (corrigir registro)`
              : d.kind === "return"
                ? `${stageLabel(d.to)} (retorno previsto)`
                : stageLabel(d.to),
        }))}
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      {dest?.missing.length ? (
        <>
          <Blockers intro={`Para mover para ${stageLabel(dest.to)} falta:`} items={dest.missing} />
          {dest.missing.map((item) => (
            <MissingFieldInput key={item} item={item} users={users} />
          ))}
        </>
      ) : null}
      {dest?.kind === "back" ? (
        <TextareaField
          name="reason"
          label="Motivo da correção"
          required
          help="Voltar um estágio serve só para corrigir erro de registro."
        />
      ) : null}
    </ActionDialog>
  );
}

export function ArchiveProjectDialog({ projectId }: { projectId: string }) {
  return (
    <ActionDialog
      triggerLabel="Arquivar"
      title="Arquivar projeto"
      description="Projeto recusado, não aprovado, sem captação mínima ou prazo vencido. Sai da carteira do site."
      action={moveProjectStageAction}
      submitLabel="Arquivar"
      submitVariant="destructive"
    >
      <HiddenField name="projectId" value={projectId} />
      <HiddenField name="to" value="arquivado" />
      <SelectField
        name="lostReason"
        label="Motivo"
        required
        options={optionsFrom(LOST_REASON_LABELS)}
      />
      <TextField name="lostReasonDetail" label="Detalhe (obrigatório quando o motivo é Outro)" />
    </ActionDialog>
  );
}

export function PublishProjectDialog({
  projectId,
  canPublish,
}: {
  projectId: string;
  canPublish: boolean;
}) {
  return (
    <ActionDialog
      triggerLabel="Publicar no site"
      title="Publicar na carteira do site"
      description="Só com o projeto em Captando e autorização por escrito do proponente (regra R-11)."
      action={publishProjectAction}
      submitLabel="Publicar"
      variant="default"
      disabled={!canPublish}
    >
      <HiddenField name="projectId" value={projectId} />
      <TextField
        name="publishAuthorizedBy"
        label="Quem autorizou (nome e cargo)"
        required
        help="A pessoa do proponente que autorizou por escrito (e-mail ou documento guardado)."
      />
      <DateField name="publishAuthorizedAt" label="Data da autorização" required />
    </ActionDialog>
  );
}

export function UnpublishProjectForm({ projectId }: { projectId: string }) {
  return (
    <ActionForm
      action={unpublishProjectAction}
      submitLabel="Despublicar"
      variant="outline"
      showSuccess={false}
      className="inline-flex"
    >
      <HiddenField name="projectId" value={projectId} />
    </ActionForm>
  );
}

export function NewProjectForm({ proponents, users }: { proponents: Option[]; users: Option[] }) {
  return (
    <ActionForm action={createProjectAction} submitLabel="Criar projeto" pendingLabel="Criando...">
      <ProjectFields proponents={proponents} users={users} />
    </ActionForm>
  );
}

export function EditProjectForm({
  project,
  proponents,
  users,
}: {
  project: ProjectFormValues;
  proponents: Option[];
  users: Option[];
}) {
  return (
    <ActionForm action={updateProjectAction} submitLabel="Salvar alterações">
      <ProjectFields project={project} proponents={proponents} users={users} />
    </ActionForm>
  );
}
