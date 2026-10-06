"use client";
// Diálogos do projeto (crm-design-system.md, seções 7.7, 7.8 e 7.12): "Mover para" (destino com
// o tipo no texto da opção e o que falta como checklist editável), "Arquivar" (confirmação
// destrutiva com motivo), "Publicar no site" (aviso da regra de publicação), "Despublicar"
// (confirmação) e "Editar" (folha lateral). Também as ações do cabeçalho no desktop e a barra
// de ações do celular, que montam os mesmos diálogos sem gatilho e os abrem pelos menus.
import { Circle, Ellipsis, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isValidElement, useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  createProjectAction,
  moveProjectStageAction,
  publishProjectAction,
  unpublishProjectAction,
  updateProjectAction,
} from "@/actions/projects";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LOST_REASON_LABELS,
  MECHANISM_LABELS,
  optionsFrom,
  stageLabel,
} from "@/lib/crm/enum-labels";
import { daysInStageText } from "@/lib/crm/text";
import { SubmitButton } from "./forms/submit-button";
import { ActionDialog } from "./project-forms/action-dialog";
import {
  ActionForm,
  DateField,
  HiddenField,
  MoneyField,
  SelectField,
  TextField,
  TextareaField,
  type Option,
} from "./project-forms/action-form";
import { ProjectFields, type ProjectFormValues } from "./project-form";
import { ActionBarMobile, type ActionBarMoreItem } from "./ui/action-bar-mobile";
import { Callout } from "./ui/callout";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { FormActions } from "./ui/form-actions";
import { StatusBadge } from "./ui/status-badge";

export type MoveDestination = {
  to: string;
  kind: "next" | "return" | "back";
  missing: string[];
};

// Gatilho opcional dos diálogos: um elemento substitui o botão padrão; `null` não renderiza
// gatilho (o diálogo é aberto por `open`/`onOpenChange`, como nos menus).
type Openable = {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type MoveProps = {
  projectId: string;
  projectName: string;
  stage: string;
  // Dias desde a entrada no estágio atual ("Hoje em ▣ Captando (há 3 dias)").
  daysInStage: number;
  destinations: MoveDestination[];
  users: Option[];
  // Destino já selecionado ao abrir (o NextStepCard passa o próximo estágio).
  defaultTarget?: string;
  trigger?: ReactNode;
};

const DESTINATION_SUFFIX: Record<MoveDestination["kind"], string> = {
  next: "próximo",
  back: "voltar",
  return: "retorno previsto",
};

// Ajuda do destino, igual ao "Mover para" do lead (seção 7.12).
const DESTINATION_HELP: Record<MoveDestination["kind"], string> = {
  next: "Próximo estágio na ordem do pipeline.",
  back: "Volta um estágio, só para corrigir um registro errado.",
  return: "Retorno previsto no pipeline.",
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
      return <MoneyField name="approvedAmount" label="Valor aprovado" required />;
    case "prazo de captação":
      return <DateField name="fundraisingDeadline" label="Prazo de captação" required />;
    case "rubrica de captação":
      return (
        <MoneyField name="fundraisingFeeAmount" label="Rubrica de captação aprovada" required />
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

// "Mover para" do projeto, no mesmo padrão do lead (seção 7.12): título com o nome, "Hoje em" com
// o estágio e o tempo nele, ajuda do destino e o que falta como checklist, com os campos logo
// abaixo para preencher ali mesmo.
export function MoveProjectStageDialog({
  projectId,
  projectName,
  stage,
  daysInStage,
  destinations,
  users,
  defaultTarget,
  trigger,
}: MoveProps) {
  const initial = destinations.find((d) => d.to === defaultTarget)?.to ?? destinations[0]?.to ?? "";
  const [to, setTo] = useState(initial);
  const dest = destinations.find((d) => d.to === to);
  if (destinations.length === 0) return null;
  return (
    <ActionDialog
      triggerLabel="Mover para"
      title={`Mover ${projectName} para outro estágio`}
      description={
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span>Hoje em</span>
          <StatusBadge kind="stage" value={stage} pipeline="projetos" />
          <span>({daysInStageText(daysInStage)})</span>
        </span>
      }
      action={moveProjectStageAction}
      submitLabel={dest ? `Mover para ${stageLabel(dest.to)}` : "Mover"}
      pendingLabel="Movendo…"
      successMessage={dest ? `Projeto movido para ${stageLabel(dest.to)}.` : "Estágio atualizado."}
      variant="default"
      trigger={trigger}
    >
      <HiddenField name="projectId" value={projectId} />
      <SelectField
        name="to"
        label="Destino"
        required
        placeholder="Escolha o destino"
        help={dest ? DESTINATION_HELP[dest.kind] : undefined}
        options={destinations.map((d) => ({
          value: d.to,
          label: `${stageLabel(d.to)} · ${DESTINATION_SUFFIX[d.kind]}`,
        }))}
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      {dest?.missing.length ? (
        <>
          <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
            <p className="font-medium">Para entrar em {stageLabel(dest.to)} o projeto precisa de</p>
            <ul className="mt-2 flex flex-col gap-1">
              {dest.missing.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Circle
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="sr-only">falta: </span>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
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

// Confirmação destrutiva (decisão D16): botão desabilitado até o motivo; "Detalhe" só em "Outro".
export function ArchiveProjectDialog({
  projectId,
  missing = [],
  users = [],
  trigger,
  open,
  onOpenChange,
}: {
  projectId: string;
  // O que falta para arquivar além do motivo (ex.: "responsável pelo projeto"): o campo aparece
  // ali mesmo, como no "Mover para".
  missing?: string[];
  users?: Option[];
} & Openable) {
  const [reason, setReason] = useState("");
  const extra = missing.filter((item) => item !== "motivo do arquivamento");
  return (
    <ConfirmDialog
      trigger={
        trigger === undefined ? (
          <Button type="button" variant="outline">
            Arquivar
          </Button>
        ) : (
          trigger
        )
      }
      open={open}
      onOpenChange={onOpenChange}
      title="Arquivar projeto"
      description="Para projeto recusado, não aprovado, sem captação mínima ou com prazo vencido. Ele sai da carteira do site; nada é apagado e pode voltar para Prospecção depois."
      confirmLabel="Arquivar projeto"
      pendingLabel="Arquivando…"
      tone="danger"
      action={moveProjectStageAction}
      requireField="lostReason"
      onSuccess={() => toast.success("Projeto arquivado.")}
    >
      <HiddenField name="projectId" value={projectId} />
      <HiddenField name="to" value="arquivado" />
      <SelectField
        name="lostReason"
        label="Motivo"
        required
        options={optionsFrom(LOST_REASON_LABELS)}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {reason === "outro" ? (
        <TextField name="lostReasonDetail" label="Detalhe" required autoFocus />
      ) : null}
      {extra.map((item) => (
        <MissingFieldInput key={item} item={item} users={users} />
      ))}
    </ConfirmDialog>
  );
}

const PUBLISH_RULE = "Só com o projeto em Captando e autorização por escrito do proponente.";

export function PublishProjectDialog({
  projectId,
  canPublish,
  trigger,
  open,
  onOpenChange,
}: { projectId: string; canPublish: boolean } & Openable) {
  const helpId = useId();
  if (!canPublish && trigger === undefined) {
    // Desabilitado de verdade, mas focável: o Tooltip e o aria-describedby explicam por quê.
    return (
      <>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                disabled
                focusableWhenDisabled
                aria-describedby={helpId}
                className="aria-disabled:opacity-50"
              />
            }
          >
            Publicar no site
          </TooltipTrigger>
          <TooltipContent>Só com o projeto em Captando</TooltipContent>
        </Tooltip>
        <span id={helpId} className="sr-only">
          Só com o projeto em Captando.
        </span>
      </>
    );
  }
  return (
    <ActionDialog
      triggerLabel="Publicar no site"
      title="Publicar na carteira do site"
      description="O projeto passa a aparecer em prospekto.com.br/projetos com o resumo e as contrapartidas."
      action={publishProjectAction}
      submitLabel="Publicar"
      pendingLabel="Publicando…"
      successMessage="Projeto publicado no site."
      variant="outline"
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Callout tone="info">{PUBLISH_RULE}</Callout>
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

export function UnpublishProjectDialog({
  projectId,
  trigger,
  open,
  onOpenChange,
}: { projectId: string } & Openable) {
  return (
    <ConfirmDialog
      trigger={
        trigger === undefined ? (
          <Button type="button" variant="outline">
            Despublicar
          </Button>
        ) : (
          trigger
        )
      }
      open={open}
      onOpenChange={onOpenChange}
      title="Retirar o projeto do site"
      description="O projeto deixa de aparecer na carteira pública. Pode ser publicado de novo com uma nova autorização."
      confirmLabel="Despublicar"
      pendingLabel="Retirando…"
      action={unpublishProjectAction}
      onSuccess={() => toast.success("Projeto retirado do site.")}
    >
      <HiddenField name="projectId" value={projectId} />
    </ConfirmDialog>
  );
}

export function NewProjectForm({ proponents, users }: { proponents: Option[]; users: Option[] }) {
  return (
    <ActionForm
      action={createProjectAction}
      submitLabel="Criar projeto"
      pendingLabel="Criando…"
      className="gap-6"
      footer="none"
    >
      <ProjectFields proponents={proponents} users={users} />
      <FormActions
        cancelHref="/app/projetos"
        note={
          <>
            <span aria-hidden="true">*</span> obrigatório
          </>
        }
        className="mx-0 rounded-xl border border-border md:mx-0"
      >
        <SubmitButton size="touch" className="md:h-9" pendingLabel="Criando…">
          Criar projeto
        </SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

type EditProps = {
  project: ProjectFormValues;
  proponents: Option[];
  users: Option[];
};

// "Editar" abre uma folha lateral com o formulário completo; salvar fecha e atualiza a página.
export function EditProjectSheet({
  project,
  proponents,
  users,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: EditProps & Openable) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = (value: boolean) => {
    setOwnOpen(value);
    onOpenChange?.(value);
  };
  const router = useRouter();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger === null ? null : (
        <SheetTrigger
          render={isValidElement(trigger) ? trigger : <Button type="button" variant="outline" />}
        >
          {isValidElement(trigger) ? null : "Editar"}
        </SheetTrigger>
      )}
      <SheetContent side="right" className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Editar projeto</SheetTitle>
          <SheetDescription>
            Os campos exigidos por cada estágio continuam sendo conferidos ao mover o projeto.
          </SheetDescription>
        </SheetHeader>
        <ActionForm
          action={updateProjectAction}
          submitLabel="Salvar alterações"
          pendingLabel="Salvando…"
          showSuccess={false}
          footer="dialog"
          secondaryAction={
            <SheetClose
              render={<Button type="button" variant="ghost" size="touch" className="md:h-9" />}
            >
              Cancelar
            </SheetClose>
          }
          onSuccess={() => {
            toast.success("Projeto salvo.");
            router.refresh();
            setOpen(false);
          }}
        >
          <ProjectFields project={project} proponents={proponents} users={users} mode="edit" />
        </ActionForm>
      </SheetContent>
    </Sheet>
  );
}

export type ProjectActionsProps = EditProps & {
  projectId: string;
  slug: string;
  stage: string;
  daysInStage: number;
  publishedOnSite: boolean;
  destinations: MoveDestination[];
  // Campos que faltam para arquivar (missingForProjectMove(project, "arquivado")).
  archiveMissing: string[];
};

function siteHref(slug: string): string {
  return `/projetos/${slug}`;
}

// Ações secundárias do cabeçalho no desktop (seção 7.7): Ver no site, Editar, Publicar ou
// Despublicar e "⋯" com Arquivar. Fica como um só nó em `secondary` do PageHeader; "Mover para"
// (primário) vem da página.
export function ProjectHeaderActions({
  projectId,
  slug,
  stage,
  publishedOnSite,
  archiveMissing,
  project,
  proponents,
  users,
}: ProjectActionsProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const archived = stage === "arquivado";
  return (
    <>
      {publishedOnSite ? (
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={siteHref(slug)} target="_blank" rel="noopener" />}
        >
          <ExternalLink aria-hidden="true" />
          Ver no site
        </Button>
      ) : null}
      <EditProjectSheet project={project} proponents={proponents} users={users} />
      {publishedOnSite ? (
        <UnpublishProjectDialog projectId={projectId} />
      ) : (
        <PublishProjectDialog projectId={projectId} canPublish={stage === "captando"} />
      )}
      {archived ? null : (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon" aria-label="Mais ações" />}
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onClick={() => setArchiveOpen(true)}>
                Arquivar projeto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ArchiveProjectDialog
            projectId={projectId}
            missing={archiveMissing}
            users={users}
            trigger={null}
            open={archiveOpen}
            onOpenChange={setArchiveOpen}
          />
        </>
      )}
    </>
  );
}

// Barra fixa do celular (seção 4.2): "Novo aporte" (vem da página), "Mover para" e "⋯" com
// Editar, Publicar ou Despublicar, Ver no site e Arquivar.
export function ProjectActionBar({
  projectId,
  slug,
  stage,
  daysInStage,
  publishedOnSite,
  destinations,
  archiveMissing,
  project,
  proponents,
  users,
  newContribution,
}: ProjectActionsProps & { newContribution?: ReactNode }) {
  const [editOpen, setEditOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const canPublish = stage === "captando";
  const more: ActionBarMoreItem[] = [{ label: "Editar", onSelect: () => setEditOpen(true) }];
  if (publishedOnSite) {
    more.push({ label: "Despublicar", onSelect: () => setUnpublishOpen(true) });
    more.push({ label: "Ver no site", href: siteHref(slug) });
  } else if (canPublish) {
    more.push({ label: "Publicar no site", onSelect: () => setPublishOpen(true) });
  }
  if (stage !== "arquivado") {
    more.push({ label: "Arquivar projeto", tone: "danger", onSelect: () => setArchiveOpen(true) });
  }
  const move =
    destinations.length > 0 ? (
      <MoveProjectStageDialog
        projectId={projectId}
        projectName={project.name ?? "o projeto"}
        stage={stage}
        daysInStage={daysInStage}
        destinations={destinations}
        users={users}
        trigger={
          <Button type="button" variant="outline" size="touch">
            Mover para
          </Button>
        }
      />
    ) : null;
  return (
    <>
      <ActionBarMobile
        primary={newContribution ?? move ?? <span />}
        secondary={newContribution ? (move ?? undefined) : undefined}
        more={more}
      />
      <EditProjectSheet
        project={project}
        proponents={proponents}
        users={users}
        trigger={null}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <PublishProjectDialog
        projectId={projectId}
        canPublish={canPublish}
        trigger={null}
        open={publishOpen}
        onOpenChange={setPublishOpen}
      />
      <UnpublishProjectDialog
        projectId={projectId}
        trigger={null}
        open={unpublishOpen}
        onOpenChange={setUnpublishOpen}
      />
      <ArchiveProjectDialog
        projectId={projectId}
        missing={archiveMissing}
        users={users}
        trigger={null}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </>
  );
}
