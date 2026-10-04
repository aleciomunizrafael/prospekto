"use client";
// Diálogos do fluxo de aporte (modelo-de-dados.md, 3.9; regras R-6 a R-9): nova proposta, assinar
// termo, confirmar depósito, emitir recibo, enviar ao contador, registrar comissão, cancelar.
// Cada passo mostra o que falta antes de permitir.
import { useState } from "react";
import {
  cancelContributionAction,
  confirmDepositAction,
  createContributionAction,
  issueReceiptAction,
  recordCommissionAction,
  searchSponsorLeadsAction,
  sendReceiptToAccountantAction,
  signTermAction,
} from "@/actions/contributions";
import { formatBRL } from "@/lib/crm/format";
import {
  CONTRIBUTION_TYPE_LABELS,
  LOST_REASON_LABELS,
  MECHANISM_LABELS,
  optionsFrom,
} from "@/lib/crm/enum-labels";
import { ActionDialog } from "./project-forms/action-dialog";
import {
  Blockers,
  DateField,
  HiddenField,
  MoneyField,
  SelectField,
  TextField,
  TextareaField,
  type Option,
} from "./project-forms/action-form";
import { LeadPicker } from "./project-forms/lead-picker";

export type ProjectOption = {
  id: string;
  name: string;
  mechanism: string;
  // Mecanismos de aporte compatíveis (R-9); vazio = fomento direto, sem aporte.
  allowedMechanisms: string[];
};

export function NewContributionDialog({
  projects,
  sponsorOrgs,
  fixedProjectId,
}: {
  projects: ProjectOption[];
  sponsorOrgs: Option[];
  fixedProjectId?: string;
}) {
  const [projectId, setProjectId] = useState(fixedProjectId ?? projects[0]?.id ?? "");
  const [leadSegment, setLeadSegment] = useState<string | null>(null);
  const project = projects.find((p) => p.id === projectId);
  const allowed = project?.allowedMechanisms ?? [];
  const blockers: string[] = [];
  if (project && allowed.length === 0) {
    blockers.push(
      "projeto de fomento direto (FSA/BRDE, PNAB, edital) não recebe aporte de incentivador",
    );
  }
  return (
    <ActionDialog
      triggerLabel="Novo aporte"
      title="Nova proposta de aporte"
      description="Nasce em Proposta; avança com termo, depósito e recibo."
      action={createContributionAction}
      submitLabel="Criar proposta"
      variant="default"
      wide
    >
      {fixedProjectId ? (
        <HiddenField name="projectId" value={fixedProjectId} />
      ) : (
        <SelectField
          name="projectId"
          label="Projeto"
          required
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        />
      )}
      <Blockers intro="Este projeto não pode receber aporte:" items={blockers} />
      <LeadPicker
        search={searchSponsorLeadsAction}
        onPick={(lead) => setLeadSegment(lead.segment)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="type"
          label="Tipo"
          required
          options={optionsFrom(CONTRIBUTION_TYPE_LABELS)}
          defaultValue="patrocinio"
        />
        <SelectField
          name="mechanism"
          label="Mecanismo do aporte"
          required
          help={
            project
              ? `Compatível com ${MECHANISM_LABELS[project.mechanism as keyof typeof MECHANISM_LABELS] ?? project.mechanism}.`
              : undefined
          }
          options={allowed.map((m) => ({
            value: m,
            label: MECHANISM_LABELS[m as keyof typeof MECHANISM_LABELS] ?? m,
          }))}
          defaultValue={allowed[0] ?? ""}
          key={projectId}
        />
        <MoneyField name="proposedAmount" label="Valor proposto (R$)" required />
        <DateField name="expectedCloseAt" label="Previsão de fechamento" />
        <SelectField
          name="orgId"
          label="Empresa patrocinadora"
          placeholder="A do lead, se houver"
          help={
            leadSegment === "PF"
              ? "Pessoa física: não precisa."
              : "Obrigatória (com CNPJ) para patrocinador PJ antes do termo."
          }
          options={sponsorOrgs}
          className="sm:col-span-2"
        />
        <TextareaField name="notes" label="Notas" className="sm:col-span-2" />
      </div>
    </ActionDialog>
  );
}

export type ContributionStepProps = {
  contributionId: string;
  blockers: string[];
};

export function SignTermDialog({
  contributionId,
  blockers,
  sponsorOrgs,
  needsOrg,
}: ContributionStepProps & { sponsorOrgs: Option[]; needsOrg: boolean }) {
  // Quando o que falta é só a empresa patrocinadora, o diálogo deixa escolher ali mesmo.
  const onlyOrgMissing = blockers.every((b) => b.startsWith("empresa patrocinadora"));
  return (
    <ActionDialog
      triggerLabel="Assinar termo"
      title="Registrar termo assinado"
      description="Data real da assinatura e, se já enviados, os dados da conta vinculada do projeto."
      action={signTermAction}
      submitLabel="Registrar termo"
      variant="default"
      disabled={blockers.length > 0 && !onlyOrgMissing}
    >
      <HiddenField name="contributionId" value={contributionId} />
      <Blockers intro="Antes de assinar o termo falta:" items={blockers} />
      {needsOrg ? (
        <SelectField
          name="orgId"
          label="Empresa patrocinadora"
          required
          options={sponsorOrgs}
          help="Organização do tipo empresa, com CNPJ."
        />
      ) : null}
      <DateField name="termSignedAt" label="Data da assinatura do termo" required />
      <DateField name="bankDetailsSentAt" label="Dados bancários enviados em" />
    </ActionDialog>
  );
}

export function ConfirmDepositDialog({
  contributionId,
  blockers,
  proposedAmount,
}: ContributionStepProps & { proposedAmount: number }) {
  return (
    <ActionDialog
      triggerLabel="Confirmar depósito"
      title="Confirmar depósito"
      description={`Valor proposto: ${formatBRL(proposedAmount)}. O captado do projeto é recalculado (regra R-6).`}
      action={confirmDepositAction}
      submitLabel="Confirmar depósito"
      variant="default"
      disabled={blockers.length > 0}
    >
      <HiddenField name="contributionId" value={contributionId} />
      <Blockers intro="Antes de confirmar o depósito falta:" items={blockers} />
      <DateField name="depositedAt" label="Data do depósito" required />
      <MoneyField
        name="depositedAmount"
        label="Valor depositado (R$)"
        required
        defaultValue={proposedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      />
    </ActionDialog>
  );
}

export function IssueReceiptDialog({ contributionId, blockers }: ContributionStepProps) {
  return (
    <ActionDialog
      triggerLabel="Emitir recibo"
      title="Registrar recibo emitido"
      description="Um aporte gera um único recibo; o número é único por projeto (regra R-7)."
      action={issueReceiptAction}
      submitLabel="Registrar recibo"
      variant="default"
      disabled={blockers.length > 0}
    >
      <HiddenField name="contributionId" value={contributionId} />
      <Blockers intro="Antes de emitir o recibo falta:" items={blockers} />
      <TextField
        name="receiptNumber"
        label="Número do recibo"
        required
        help="SALIC, Ancine ou CHP."
      />
      <DateField name="receiptIssuedAt" label="Data de emissão" required />
      <DateField name="receiptSentToAccountantAt" label="Enviado ao contador em (se já enviado)" />
    </ActionDialog>
  );
}

export function SendToAccountantDialog({ contributionId, blockers }: ContributionStepProps) {
  return (
    <ActionDialog
      triggerLabel="Enviar ao contador"
      title="Registrar envio do recibo ao contador"
      action={sendReceiptToAccountantAction}
      submitLabel="Registrar envio"
      disabled={blockers.length > 0}
    >
      <HiddenField name="contributionId" value={contributionId} />
      <Blockers intro="Antes de registrar o envio falta:" items={blockers} />
      <DateField name="receiptSentToAccountantAt" label="Data do envio" required />
    </ActionDialog>
  );
}

export type CommissionContext = {
  depositedAmount: number | null;
  maxByPercent: number | null;
  contractedPercent: number | null;
  fundraisingFeeAmount: number | null;
  projectCommissionSoFar: number;
  capPerProject: number | null;
  currentDue: number | null;
  currentPaidAt: string | null;
};

export function RecordCommissionDialog({
  contributionId,
  blockers,
  commission,
}: ContributionStepProps & { commission: CommissionContext }) {
  const feeLeft =
    commission.fundraisingFeeAmount == null
      ? null
      : commission.fundraisingFeeAmount - commission.projectCommissionSoFar;
  return (
    <ActionDialog
      triggerLabel={commission.currentDue == null ? "Registrar comissão" : "Alterar comissão"}
      title="Comissão de captação deste aporte"
      description="Limites da IN MinC 29/2026, art. 19 (regra R-8): 10% do depositado, a rubrica aprovada e o teto de R$ 150 mil por projeto e ano (aviso)."
      action={recordCommissionAction}
      submitLabel="Registrar comissão"
      disabled={blockers.length > 0}
      stayOpenOnSuccess
    >
      <HiddenField name="contributionId" value={contributionId} />
      <Blockers intro="Antes de registrar a comissão falta:" items={blockers} />
      <ul className="text-muted-foreground list-disc pl-5 text-sm">
        <li>Valor depositado: {formatBRL(commission.depositedAmount)}</li>
        <li>
          Máximo pelo mecanismo:{" "}
          {commission.maxByPercent == null
            ? "limite não verificado para este mecanismo"
            : formatBRL(commission.maxByPercent)}
        </li>
        {commission.contractedPercent != null ? (
          <li>Percentual contratado: {commission.contractedPercent}%</li>
        ) : null}
        <li>
          Rubrica de captação restante:{" "}
          {feeLeft == null ? "rubrica não informada no projeto" : formatBRL(feeLeft)}
        </li>
        {commission.capPerProject != null ? (
          <li>
            Teto por projeto e ano: {formatBRL(commission.capPerProject)} (aviso, não bloqueia)
          </li>
        ) : null}
      </ul>
      <MoneyField
        name="commissionDue"
        label="Comissão devida (R$)"
        required
        defaultValue={
          commission.currentDue == null
            ? ""
            : commission.currentDue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
        }
      />
      <DateField
        name="commissionPaidAt"
        label="Paga em"
        help="Só com depósito confirmado; deixe em branco se ainda não foi paga."
        defaultValue={commission.currentPaidAt ?? ""}
      />
    </ActionDialog>
  );
}

export function CancelContributionDialog({
  contributionId,
  blockers,
  wasDeposited,
}: ContributionStepProps & { wasDeposited: boolean }) {
  return (
    <ActionDialog
      triggerLabel="Cancelar aporte"
      title="Cancelar aporte"
      description={
        wasDeposited
          ? "Aporte já depositado: a nota com o motivo é obrigatória e o captado do projeto é recalculado."
          : "O aporte sai do fluxo; o lead continua no CRM."
      }
      action={cancelContributionAction}
      submitLabel="Cancelar aporte"
      submitVariant="destructive"
      variant="ghost"
      disabled={blockers.length > 0}
    >
      <HiddenField name="contributionId" value={contributionId} />
      <Blockers intro="Não é possível cancelar:" items={blockers} />
      <SelectField
        name="lostReason"
        label="Motivo"
        required
        options={optionsFrom(LOST_REASON_LABELS)}
      />
      <TextareaField name="notes" label="Nota" required={wasDeposited} />
    </ActionDialog>
  );
}
