"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { moveLeadStageAction } from "@/actions/crm-leads";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { initialCrmActionState, type CrmActionState } from "@/lib/crm/action-state";
import { toDateTimeLocal } from "@/lib/crm/dates";
import { LOST_REASON_LABELS, stageLabel } from "@/lib/crm/labels";
import type { StageMovePlan } from "@/lib/crm/stage-moves";
import { LOST_REASONS } from "@/lib/domain/enums";
import { CheckboxField, FormMessage, SelectField, TextField, TextareaField } from "./fields";
import { SubmitButton } from "./submit-button";

type Props = {
  leadId: string;
  currentStage: string;
  isPj: boolean;
  plans: StageMovePlan[];
  terminalStage: string;
  // Dono e próxima ação atuais, para pré-preencher.
  ownerUserId: string | null;
  users: { id: string; name: string }[];
  currentIsInitial: boolean;
  art27Done: boolean;
};

// "Mover para" e "Marcar perdido" (proposta-c, seção 9.2): o destino lista os campos exigidos
// pelo pipeline; o que é editável aqui (dono, próxima ação, motivo de perda, checagem do art. 27)
// aparece como campo; o que depende do aporte ou do projeto é explicado e bloqueia o botão.
export function StageMoveDialog(props: Props) {
  const [mode, setMode] = useState<"closed" | "move" | "lost">("closed");
  const [state, action] = useActionState(async (prev: CrmActionState, formData: FormData) => {
    const result = await moveLeadStageAction(prev, formData);
    if (result.status === "ok") {
      toast.success(result.message ?? "Estágio atualizado.");
      setMode("closed");
    }
    return result;
  }, initialCrmActionState);
  const [target, setTarget] = useState(props.plans[0]?.target.stage ?? "");
  const e = state.fieldErrors ?? {};

  const plan = props.plans.find((p) => p.target.stage === target);
  const lost = mode === "lost";
  const needsOwnerAndNext = props.currentIsInitial;
  const needsArt27 = !lost && !!plan?.requirements.some((r) => r.field.includes("vinculo_art27"));
  const blocked = !lost ? (plan?.blockedBy ?? []) : [];
  const orgBlock = !lost && props.isPj ? plan?.requirements.filter((r) => r.kind === "org") : [];
  const suggested = plan?.suggestedNextActionAt
    ? toDateTimeLocal(new Date(plan.suggestedNextActionAt))
    : "";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {props.plans.length > 0 ? (
          <Button type="button" size="sm" onClick={() => setMode("move")}>
            Mover para
          </Button>
        ) : null}
        {props.currentStage !== props.terminalStage ? (
          <Button type="button" size="sm" variant="destructive" onClick={() => setMode("lost")}>
            Marcar {stageLabel(props.terminalStage).toLowerCase()}
          </Button>
        ) : null}
      </div>
      <Dialog open={mode !== "closed"} onOpenChange={(open) => !open && setMode("closed")}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {lost
                ? `Marcar como ${stageLabel(props.terminalStage).toLowerCase()}`
                : "Mover para outro estágio"}
            </DialogTitle>
            <DialogDescription>
              Estágio atual: {stageLabel(props.currentStage)}.{" "}
              {lost
                ? "Informe o motivo. Nada é apagado: o lead pode ser reativado depois."
                : "Escolha o destino e preencha o que o pipeline exige."}
            </DialogDescription>
          </DialogHeader>
          <form action={action} className="flex flex-col gap-4" noValidate>
            <input type="hidden" name="leadId" value={props.leadId} />
            {lost ? <input type="hidden" name="to" value={props.terminalStage} /> : null}
            <FormMessage status={state.status} message={state.message} missing={state.missing} />

            {!lost ? (
              <SelectField
                name="to"
                label="Destino"
                required
                placeholder={null}
                error={e.to}
                options={props.plans.map((p) => ({
                  value: p.target.stage,
                  label: `${p.target.label}${p.target.kind === "back" ? " (voltar)" : p.target.kind === "return" ? " (retorno)" : ""}`,
                }))}
                value={target}
                onChange={(ev) => setTarget(ev.target.value)}
                help={plan?.target.description}
              />
            ) : null}

            {plan && !lost && plan.requirements.length > 0 ? (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Para entrar em {plan.target.label} o pipeline exige:</p>
                <ul className="mt-1 list-disc pl-5">
                  {plan.requirements.map((r) => (
                    <li key={r.field}>{r.label}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {blocked.length > 0 ? (
              <div
                role="alert"
                className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
              >
                <p className="font-medium">Este movimento depende do aporte ou do projeto.</p>
                <p className="mt-1">
                  Registre primeiro em{" "}
                  <Link href="/app/projetos" className="underline">
                    Projetos
                  </Link>
                  : {blocked.map((b) => b.label.toLowerCase()).join("; ")}. Depois volte aqui e mova
                  o lead.
                </p>
              </div>
            ) : null}
            {orgBlock && orgBlock.length > 0 ? (
              <p className="text-muted-foreground text-sm">
                A empresa patrocinadora precisa estar cadastrada com CNPJ em{" "}
                <Link href="/app/organizacoes" className="underline">
                  Organizações
                </Link>{" "}
                e vinculada ao lead.
              </p>
            ) : null}

            {needsOwnerAndNext ? (
              <SelectField
                name="ownerUserId"
                label="Responsável pelo lead"
                required
                error={e.ownerUserId}
                options={props.users.map((u) => ({ value: u.id, label: u.name }))}
                defaultValue={props.ownerUserId ?? props.users[0]?.id ?? ""}
                help="Quem cuida deste lead a partir de agora (regra R-3)."
              />
            ) : null}
            {!lost ? (
              <TextField
                name="nextActionAt"
                label="Próxima ação"
                type="datetime-local"
                required={needsOwnerAndNext}
                error={e.nextActionAt}
                key={target}
                defaultValue={suggested}
                help={
                  plan?.suggestedNextActionAt
                    ? "Sugerido: hoje mais o prazo de follow-up do estágio de destino. Pode alterar."
                    : "Este estágio não tem prazo em dias; defina a data que fizer sentido."
                }
              />
            ) : needsOwnerAndNext ? (
              <TextField
                name="nextActionAt"
                label="Data de referência"
                type="datetime-local"
                required
                error={e.nextActionAt}
                defaultValue={toDateTimeLocal(new Date())}
                help="Sair do estágio inicial exige uma data registrada, mesmo ao perder."
              />
            ) : null}

            {needsArt27 && !props.art27Done ? (
              <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
                <legend className="px-1 text-sm font-medium">
                  Checagem do art. 27 (regra R-10)
                </legend>
                <CheckboxField
                  name="art27Checked"
                  label="Confirmei que o patrocinador não tem vínculo com o proponente (Lei 8.313/1991, art. 27)"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    name="art27At"
                    label="Checado em"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                  <TextField name="art27By" label="Checado por" placeholder="Seu nome" />
                </div>
              </fieldset>
            ) : null}

            {lost ? (
              <>
                <SelectField
                  name="lostReason"
                  label="Motivo"
                  required
                  error={e.lostReason}
                  options={LOST_REASONS.map((r) => ({ value: r, label: LOST_REASON_LABELS[r] }))}
                />
                <TextareaField
                  name="lostReasonDetail"
                  label="Detalhe"
                  error={e.lostReasonDetail}
                  rows={2}
                  help="Obrigatório quando o motivo é 'Outro'."
                />
              </>
            ) : plan?.needsReason ? (
              <TextareaField
                name="reason"
                label="Motivo da correção"
                required
                error={e.reason}
                rows={2}
                help="Voltar um estágio serve só para corrigir um registro errado."
              />
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setMode("closed")}>
                Cancelar
              </Button>
              <SubmitButton
                variant={lost ? "destructive" : "default"}
                pendingLabel="Movendo..."
                className={blocked.length ? "pointer-events-none opacity-50" : undefined}
              >
                {lost ? "Confirmar" : plan ? `Mover para ${plan.target.label}` : "Mover"}
              </SubmitButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
