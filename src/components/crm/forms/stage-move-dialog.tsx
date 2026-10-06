"use client";

import { ChevronDown, Circle, CircleCheck, Ellipsis, PenLine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";
import { moveLeadStageAction } from "@/actions/crm-leads";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialCrmActionState, type CrmActionState } from "@/lib/crm/action-state";
import { toDateTimeLocal } from "@/lib/crm/format";
import type { ActionState } from "@/lib/crm/form-state";
import { LOST_REASON_LABELS, stageLabel } from "@/lib/crm/labels";
import type { RequirementLabel, StageMovePlan } from "@/lib/crm/stage-moves";
import { LOST_REASONS } from "@/lib/domain/enums";
import { cn } from "@/lib/utils";
import {
  ActionForm,
  CheckboxField,
  DateField,
  DateTimeField,
  HiddenField,
  SelectField,
  TextField,
  TextareaField,
  controlClass,
  useFieldError,
  type FormAction,
} from "../project-forms/action-form";
import { ActionBarMobile, type ActionBarMoreItem } from "../ui/action-bar-mobile";
import { Callout } from "../ui/callout";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { StatusBadge } from "../ui/status-badge";
import { openActivityForm } from "./activity-form";
import { LeadEditDialog, type LeadEditValues } from "./lead-edit-dialog";

// Dados do lead que os diálogos de estágio precisam (só valores serializáveis: a página é um
// Server Component).
export type LeadStageProps = {
  leadId: string;
  leadName: string;
  pipeline: string;
  currentStage: string;
  daysInStage: number;
  isPj: boolean;
  plans: StageMovePlan[];
  terminalStage: string;
  ownerUserId: string | null;
  users: { id: string; name: string }[];
  currentIsInitial: boolean;
  art27Done: boolean;
  // ISO da próxima ação atual (para o checklist) e organização vinculada (para o item de CNPJ).
  nextActionAt: string | null;
  orgId: string | null;
  orgCnpj: string | null;
  // Projeto do aporte em aberto: o aviso de bloqueio linka direto para ele.
  openContributionProjectId?: string | null;
};

const KIND_SUFFIX: Record<StageMovePlan["target"]["kind"], string> = {
  next: "próximo",
  back: "voltar",
  return: "retorno",
  reactivate: "reativar",
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function daysText(days: number): string {
  if (days <= 0) return "desde hoje";
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

// O ActionForm usa o ActionState de form-state.ts; a action do lead devolve CrmActionState.
function toActionState(result: CrmActionState): ActionState {
  if (result.status === "ok") return { status: "ok", message: result.message };
  if (result.status === "error") {
    return {
      status: "error",
      message: result.message ?? "Não foi possível salvar.",
      fieldErrors: result.fieldErrors,
      missing: result.missing,
    };
  }
  return { status: "idle" };
}

const moveAction: FormAction = async (_prev, formData) =>
  toActionState(await moveLeadStageAction(initialCrmActionState, formData));

// Mesmas regras do NextStepCard (next-step.ts): o que o lead já satisfaz sem abrir o diálogo.
function requirementDone(props: LeadStageProps, r: RequirementLabel): boolean {
  switch (r.field) {
    case "owner_user_id":
      return !!props.ownerUserId;
    case "next_action_at":
      return !!props.nextActionAt;
    case "lead.attributes.vinculo_art27_checado":
      return props.art27Done;
    case "organization.cnpj_when_pj":
      return !props.isPj || !!props.orgCnpj;
    default:
      return false;
  }
}

// Select de destino sem opção vazia (um controle só; o tipo do movimento vai no texto da opção).
function DestinationSelect({
  plans,
  value,
  onChange,
  help,
}: {
  plans: StageMovePlan[];
  value: string;
  onChange: (value: string) => void;
  help?: string;
}) {
  const id = useId();
  const error = useFieldError("to");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        Destino
        <span aria-hidden="true" className="text-destructive">
          {" "}
          *
        </span>
      </label>
      {help ? (
        <p id={`${id}-ajuda`} className="text-sm text-muted-foreground">
          {help}
        </p>
      ) : null}
      <select
        id={id}
        name="to"
        required
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [help ? `${id}-ajuda` : null, error ? `${id}-erro` : null].filter(Boolean).join(" ") ||
          undefined
        }
        className={controlClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {plans.map((p) => (
          <option key={p.target.stage} value={p.target.stage}>
            {p.target.label} · {KIND_SUFFIX[p.target.kind]}
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

// "Mover para" (crm-design-system.md, seção 7.12): destino com o tipo do movimento no texto da
// opção, exigências como checklist, aviso com link quando o movimento depende do aporte ou do
// projeto (botão de envio desabilitado de verdade) e os campos editáveis aqui: responsável,
// próxima ação, checagem do art. 27 e motivo de correção. `defaultTarget` abre já no destino
// sugerido pelo NextStepCard; `trigger` troca o botão padrão (ActionBarMobile).
export function StageMoveDialog({
  defaultTarget,
  trigger,
  open: controlledOpen,
  onOpenChange,
  ...props
}: LeadStageProps & {
  defaultTarget?: string;
  trigger?: ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = (value: boolean) => {
    setOwnOpen(value);
    onOpenChange?.(value);
  };
  const initialTarget =
    (defaultTarget && props.plans.some((p) => p.target.stage === defaultTarget)
      ? defaultTarget
      : undefined) ??
    props.plans[0]?.target.stage ??
    "";
  const [target, setTarget] = useState(initialTarget);
  const blockedId = useId();

  if (props.plans.length === 0) return null;

  const plan = props.plans.find((p) => p.target.stage === target);
  const needsOwnerAndNext = props.currentIsInitial;
  const needsArt27 = !!plan?.requirements.some((r) => r.field.includes("vinculo_art27"));
  const blocked = plan?.blockedBy ?? [];
  const suggested = plan?.suggestedNextActionAt
    ? toDateTimeLocal(new Date(plan.suggestedNextActionAt))
    : "";
  const projectHref = props.openContributionProjectId
    ? `/app/projetos/${props.openContributionProjectId}`
    : "/app/projetos";
  const orgHref = props.orgId ? `/app/organizacoes/${props.orgId}` : "/app/organizacoes";

  const triggerNode =
    trigger === null ? null : trigger === undefined ? (
      <Button type="button">
        Mover para
        <ChevronDown aria-hidden="true" />
      </Button>
    ) : (
      trigger
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerNode ? <DialogTrigger render={triggerNode as ReactElement} /> : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>Mover {firstName(props.leadName)} para outro estágio</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span>Hoje em</span>
            <StatusBadge kind="stage" value={props.currentStage} pipeline={props.pipeline} />
            <span>({daysText(props.daysInStage)})</span>
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          action={moveAction}
          submitLabel={plan ? `Mover para ${plan.target.label}` : "Mover"}
          pendingLabel="Movendo…"
          footer="dialog"
          showSuccess={false}
          submitDisabled={blocked.length > 0}
          submitDescribedBy={blocked.length > 0 ? blockedId : undefined}
          secondaryAction={
            <DialogClose render={<Button variant="ghost" size="touch" className="md:h-9" />}>
              Cancelar
            </DialogClose>
          }
          onSuccess={() => {
            toast.success(
              target ? `Lead movido para ${stageLabel(target)}.` : "Estágio atualizado.",
            );
            router.refresh();
            setOpen(false);
          }}
        >
          <HiddenField name="leadId" value={props.leadId} />

          <DestinationSelect
            plans={props.plans}
            value={target}
            onChange={setTarget}
            help={plan?.target.description}
          />

          {plan && plan.requirements.length > 0 ? (
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
              <p className="font-medium">Para entrar em {plan.target.label} o pipeline exige</p>
              <ul className="mt-2 flex flex-col gap-1">
                {plan.requirements.map((r) => {
                  const done = requirementDone(props, r);
                  return (
                    <li key={r.field} className="flex items-start gap-2">
                      {done ? (
                        <CircleCheck
                          className="mt-0.5 size-4 shrink-0 text-success"
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                      <span className={cn(done && "text-muted-foreground")}>
                        <span className="sr-only">{done ? "feito: " : "falta: "}</span>
                        {r.label}
                        {!done && r.kind === "org" ? (
                          <>
                            {" · "}
                            <Link
                              href={orgHref}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {props.orgId ? "ver organização" : "cadastrar em Organizações"} ›
                            </Link>
                          </>
                        ) : null}
                        {!done && (r.kind === "contribution" || r.kind === "project")
                          ? " · registre no projeto"
                          : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {blocked.length > 0 ? (
            <Callout tone="warning" id={blockedId} title="Depende do aporte ou do projeto">
              Registre primeiro: {blocked.map((b) => b.label.toLowerCase()).join("; ")}.{" "}
              <Link href={projectHref}>
                {props.openContributionProjectId ? "Abrir o projeto do aporte" : "Ir para Projetos"}{" "}
                ›
              </Link>{" "}
              Depois volte aqui e mova o lead.
            </Callout>
          ) : null}

          {needsOwnerAndNext ? (
            <SelectField
              name="ownerUserId"
              label="Responsável pelo lead"
              required
              options={props.users.map((u) => ({ value: u.id, label: u.name }))}
              defaultValue={props.ownerUserId ?? props.users[0]?.id ?? ""}
              help="Quem cuida deste lead a partir de agora."
            />
          ) : null}
          <DateTimeField
            key={target}
            name="nextActionAt"
            label="Próxima ação"
            required={needsOwnerAndNext}
            defaultValue={suggested}
            help={
              plan?.suggestedNextActionAt
                ? "Sugerida pelo prazo do estágio de destino. Pode alterar."
                : "Este estágio não tem prazo em dias; defina a data que fizer sentido."
            }
          />

          {needsArt27 && !props.art27Done ? (
            <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <legend className="px-1 text-sm font-medium">Checagem do art. 27</legend>
              <CheckboxField
                name="art27Checked"
                label="Confirmei que o patrocinador não tem vínculo com o proponente (Lei 8.313/1991, art. 27)"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <DateField
                  name="art27At"
                  label="Checado em"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
                <TextField name="art27By" label="Checado por" placeholder="Seu nome" />
              </div>
            </fieldset>
          ) : null}

          {plan?.needsReason ? (
            <TextareaField
              name="reason"
              label="Motivo da correção"
              required
              rows={2}
              help="Voltar um estágio serve só para corrigir um registro errado."
            />
          ) : null}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

type LostProps = Pick<
  LeadStageProps,
  | "leadId"
  | "leadName"
  | "terminalStage"
  | "currentStage"
  | "currentIsInitial"
  | "ownerUserId"
  | "users"
>;

// "Marcar perdido" (decisão D16): role="alertdialog", motivo em <select>, "Detalhe" só em "Outro",
// botão desabilitado até escolher o motivo. Nada é apagado: o lead continua reativável pelo
// "Mover para" (movimento `reactivate`).
export function MarkLostDialog({
  leadId,
  leadName,
  terminalStage,
  currentIsInitial,
  ownerUserId,
  users,
  trigger,
  open,
  onOpenChange,
}: LostProps & {
  trigger?: ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const terminalLabel = stageLabel(terminalStage).toLowerCase();
  return (
    <ConfirmDialog
      trigger={
        trigger === undefined ? (
          <Button type="button" variant="outline" className="text-destructive">
            Marcar {terminalLabel}
          </Button>
        ) : (
          trigger
        )
      }
      title={`Marcar ${firstName(leadName)} como ${terminalLabel}`}
      description="Nada é apagado: o lead pode ser reativado depois."
      confirmLabel={`Marcar ${terminalLabel}`}
      pendingLabel="Marcando…"
      tone="danger"
      action={moveAction}
      requireField="lostReason"
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={() => toast.success(`Lead marcado como ${terminalLabel}.`)}
    >
      <HiddenField name="leadId" value={leadId} />
      <HiddenField name="to" value={terminalStage} />
      <SelectField
        name="lostReason"
        label="Motivo"
        required
        options={LOST_REASONS.map((r) => ({ value: r, label: LOST_REASON_LABELS[r] }))}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      {reason === "outro" ? (
        <TextareaField name="lostReasonDetail" label="Detalhe" required rows={2} />
      ) : null}
      {currentIsInitial ? (
        <>
          <SelectField
            name="ownerUserId"
            label="Responsável pelo lead"
            required
            options={users.map((u) => ({ value: u.id, label: u.name }))}
            defaultValue={ownerUserId ?? users[0]?.id ?? ""}
            help="Sair do estágio inicial exige um responsável, mesmo ao perder."
          />
          <DateTimeField
            name="nextActionAt"
            label="Data de referência"
            required
            defaultValue={toDateTimeLocal(new Date())}
            help="Sair do estágio inicial exige uma data registrada, mesmo ao perder."
          />
        </>
      ) : null}
    </ConfirmDialog>
  );
}

// "⋯" do cabeçalho no desktop: só "Marcar perdido", longe do botão primário (seção 7.4).
// O MarkLostDialog fica montado mesmo com o lead perdido: a action faz refresh() no servidor e a
// página chega já em "perdido" no mesmo commit do resultado; se o diálogo desmontasse aí, o
// efeito de sucesso (toast, fechar) não rodaria.
export function LeadMoreMenu(props: LostProps) {
  const [lostOpen, setLostOpen] = useState(false);
  const terminal = props.currentStage === props.terminalStage;
  const terminalLabel = stageLabel(props.terminalStage).toLowerCase();
  return (
    <>
      {terminal ? null : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button type="button" variant="outline" size="icon" aria-label="Mais ações" />}
          >
            <Ellipsis aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={() => setLostOpen(true)}>
              Marcar {terminalLabel}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <MarkLostDialog {...props} trigger={null} open={lostOpen} onOpenChange={setLostOpen} />
    </>
  );
}

// Barra fixa do celular (seção 7.4): "Registrar" abre e foca o formulário, "Mover para" abre o
// diálogo, "⋯" com Editar, WhatsApp, E-mail e Marcar perdido. Os diálogos de editar e de perda
// ficam aqui, controlados pelos itens do menu.
export function LeadActionBar({
  stage,
  edit,
  whatsappHref,
  email,
}: {
  stage: LeadStageProps;
  edit: LeadEditValues;
  whatsappHref: string | null;
  email: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const terminal = stage.currentStage === stage.terminalStage;
  const more: ActionBarMoreItem[] = [{ label: "Editar", onSelect: () => setEditOpen(true) }];
  if (whatsappHref) {
    more.push({
      label: "WhatsApp",
      onSelect: () => window.open(whatsappHref, "_blank", "noopener,noreferrer"),
    });
  }
  more.push({ label: "Enviar e-mail", href: `mailto:${email}` });
  if (!terminal) {
    more.push({
      label: `Marcar ${stageLabel(stage.terminalStage).toLowerCase()}`,
      tone: "danger",
      onSelect: () => setLostOpen(true),
    });
  }
  return (
    <>
      <ActionBarMobile
        primary={
          <Button
            size="touch"
            nativeButton={false}
            render={<a href="#registrar" onClick={() => openActivityForm()} />}
          >
            <PenLine aria-hidden="true" />
            Registrar
          </Button>
        }
        secondary={
          stage.plans.length > 0 ? (
            <StageMoveDialog
              {...stage}
              trigger={
                <Button type="button" variant="outline" size="touch">
                  Mover para
                </Button>
              }
            />
          ) : undefined
        }
        more={more}
      />
      <LeadEditDialog lead={edit} trigger={null} open={editOpen} onOpenChange={setEditOpen} />
      <MarkLostDialog {...stage} trigger={null} open={lostOpen} onOpenChange={setLostOpen} />
    </>
  );
}
