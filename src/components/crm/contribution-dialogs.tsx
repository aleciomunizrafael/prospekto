"use client";
// Diálogos do fluxo de aporte (modelo-de-dados.md, 3.9; regras R-6 a R-9; crm-design-system.md,
// seção 7.12): nova proposta, assinar termo, confirmar depósito, emitir recibo, enviar ao contador,
// registrar comissão, cancelar. Cada descrição diz o efeito do passo; o que falta aparece como
// checklist (Blockers) e o botão fica desabilitado; "Cancelar aporte" é uma confirmação destrutiva
// (ConfirmDialog, role="alertdialog") com o motivo obrigatório. Os `triggerLabel` identificam cada
// diálogo no menu "⋯" de contribution-steps.tsx (COMMISSION_LABEL/CANCEL_LABEL): não renomear.
import { Ellipsis, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBRL, parseDecimalBr } from "@/lib/crm/format";
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
import { fabClassName } from "./shell/fab";
import { Callout } from "./ui/callout";
import { KeyValueList } from "./ui/key-value-list";

export type ProjectOption = {
  id: string;
  name: string;
  mechanism: string;
  // Mecanismos de aporte compatíveis (R-9); vazio = fomento direto, sem aporte.
  allowedMechanisms: string[];
};

const NEW_LABEL = "Novo aporte";

function moneyDefault(value: number | null | undefined): string {
  return value == null ? "" : value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

// Tira `?novo=1` da URL ao fechar o diálogo aberto por ela, sem perder os outros filtros.
function stripNovoParam(router: ReturnType<typeof useRouter>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("novo")) return;
  url.searchParams.delete("novo");
  router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
}

export function NewContributionDialog({
  projects,
  sponsorOrgs,
  fixedProjectId,
  defaultOpen = false,
  fab = false,
  trigger,
  variant = "default",
  size,
}: {
  projects: ProjectOption[];
  sponsorOrgs: Option[];
  fixedProjectId?: string;
  // Abre já carregado (`/app/aportes?novo=1`); ao fechar, o parâmetro sai da URL.
  defaultOpen?: boolean;
  // Gatilho é o FAB das listas no celular (crm-design-system.md, seção 4.2).
  fab?: boolean;
  trigger?: ReactNode;
  // `outline` quando o botão não é a ação primária da tela (card de Aportes do lead e do projeto;
  // decisão D5: um botão sólido por tela).
  variant?: "default" | "outline";
  size?: "sm" | "touch";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
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
  const fabTrigger = (
    <button type="button" aria-label={NEW_LABEL} className={fabClassName}>
      <Plus className="size-6" aria-hidden="true" />
    </button>
  );
  return (
    <ActionDialog
      triggerLabel={NEW_LABEL}
      title="Nova proposta de aporte"
      description="Cria a proposta em nome do patrocinador no projeto escolhido. Ela avança com o termo assinado, o depósito e o recibo."
      action={createContributionAction}
      submitLabel="Criar proposta"
      pendingLabel="Criando…"
      successMessage="Proposta criada."
      variant={variant}
      size={size}
      wide
      trigger={fab ? fabTrigger : trigger}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && defaultOpen) stripNovoParam(router);
      }}
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
        <MoneyField name="proposedAmount" label="Valor proposto" required />
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
      description="Registra a data real da assinatura e libera a confirmação do depósito. Se os dados da conta vinculada do projeto já foram enviados, anote a data."
      action={signTermAction}
      submitLabel="Registrar termo"
      pendingLabel="Registrando…"
      successMessage="Termo registrado."
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

// Diferença entre o depositado e o proposto a partir da qual o aviso aparece (só apresentação;
// 210.000 sobre 200.000 avisa). A folga absorve o arredondamento binário de 0,05.
const DEPOSIT_TOLERANCE = 0.05 - 1e-9;

export function depositDiffers(proposed: number, deposited: number | null): boolean {
  if (deposited == null || !Number.isFinite(proposed) || proposed <= 0) return false;
  return Math.abs(deposited - proposed) / proposed >= DEPOSIT_TOLERANCE;
}

export function ConfirmDepositDialog({
  contributionId,
  blockers,
  proposedAmount,
}: ContributionStepProps & { proposedAmount: number }) {
  const [deposited, setDeposited] = useState<number | null>(proposedAmount);
  const differs = depositDiffers(proposedAmount, deposited);
  return (
    <ActionDialog
      triggerLabel="Confirmar depósito"
      title="Confirmar depósito"
      description="Confirma o depósito, recalcula o captado do projeto e libera o recibo."
      action={confirmDepositAction}
      submitLabel="Confirmar depósito"
      pendingLabel="Confirmando…"
      successMessage="Depósito confirmado."
      variant="default"
      disabled={blockers.length > 0}
    >
      <HiddenField name="contributionId" value={contributionId} />
      <Blockers intro="Antes de confirmar o depósito falta:" items={blockers} />
      <DateField name="depositedAt" label="Data do depósito" required />
      <MoneyField
        name="depositedAmount"
        label="Valor depositado"
        required
        help={`Proposto: ${formatBRL(proposedAmount)}.`}
        defaultValue={moneyDefault(proposedAmount)}
        onChange={(e) => setDeposited(parseDecimalBr(e.target.value))}
      />
      {differs ? (
        <Callout tone="warning" role="alert">
          O valor difere do proposto ({formatBRL(proposedAmount)}) em 5 % ou mais. Confira antes de
          confirmar; o registro continua permitido.
        </Callout>
      ) : null}
    </ActionDialog>
  );
}

export function IssueReceiptDialog({ contributionId, blockers }: ContributionStepProps) {
  return (
    <ActionDialog
      triggerLabel="Emitir recibo"
      title="Registrar recibo emitido"
      description="Registra o número e a data do recibo e libera o envio ao contador. Cada aporte tem um só recibo, com número único no projeto."
      action={issueReceiptAction}
      submitLabel="Registrar recibo"
      pendingLabel="Registrando…"
      successMessage="Recibo registrado."
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
      description="Registra a data em que o recibo foi ao contador do patrocinador, que precisa dele para a dedução. Depois, só falta a comissão."
      action={sendReceiptToAccountantAction}
      submitLabel="Registrar envio"
      pendingLabel="Registrando…"
      successMessage="Envio ao contador registrado."
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
  size,
}: ContributionStepProps & { commission: CommissionContext; size?: "sm" | "touch" }) {
  const feeLeft =
    commission.fundraisingFeeAmount == null
      ? null
      : commission.fundraisingFeeAmount - commission.projectCommissionSoFar;
  return (
    <ActionDialog
      triggerLabel={commission.currentDue == null ? "Registrar comissão" : "Alterar comissão"}
      title="Comissão de captação deste aporte"
      description="Registra a comissão devida e, se já paga, a data. Os limites da IN MinC 29/2026, art. 19, aparecem abaixo; o teto por projeto e ano só avisa."
      action={recordCommissionAction}
      submitLabel="Registrar comissão"
      pendingLabel="Registrando…"
      successMessage="Comissão registrada."
      disabled={blockers.length > 0}
      size={size}
      stayOpenOnSuccess
    >
      <HiddenField name="contributionId" value={contributionId} />
      <Blockers intro="Antes de registrar a comissão falta:" items={blockers} />
      <KeyValueList
        columns={2}
        hideEmpty={false}
        emptyLabel="não informado no projeto"
        items={[
          { label: "Valor depositado", value: formatBRL(commission.depositedAmount) },
          {
            label: "Máximo pelo mecanismo",
            value:
              commission.maxByPercent == null
                ? "sem limite verificado para este mecanismo"
                : formatBRL(commission.maxByPercent),
          },
          {
            label: "Percentual contratado",
            value:
              commission.contractedPercent == null ? null : `${commission.contractedPercent} %`,
          },
          {
            label: "Rubrica de captação restante",
            value: feeLeft == null ? null : formatBRL(feeLeft),
          },
          {
            label: "Teto por projeto e ano",
            value: commission.capPerProject == null ? null : formatBRL(commission.capPerProject),
            hint: commission.capPerProject == null ? undefined : "aviso, não bloqueia",
          },
        ]}
      />
      <MoneyField
        name="commissionDue"
        label="Comissão devida"
        required
        defaultValue={moneyDefault(commission.currentDue)}
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
  trigger,
  open,
  onOpenChange,
}: ContributionStepProps & {
  wasDeposited: boolean;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <ActionDialog
      triggerLabel="Cancelar aporte"
      title="Cancelar aporte"
      description={
        wasDeposited
          ? "O aporte sai do fluxo e o captado do projeto é recalculado sem ele. O lead continua no CRM."
          : "O aporte sai do fluxo; o lead continua no CRM e pode receber uma nova proposta."
      }
      action={cancelContributionAction}
      submitLabel="Cancelar aporte"
      pendingLabel="Cancelando…"
      successMessage="Aporte cancelado."
      submitVariant="destructive"
      variant="ghost"
      alert
      requireField="lostReason"
      disabled={blockers.length > 0}
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
    >
      <HiddenField name="contributionId" value={contributionId} />
      <Blockers intro="Não é possível cancelar:" items={blockers} />
      {wasDeposited ? (
        <Callout tone="warning" role="alert">
          Aporte já depositado: a nota com o motivo é obrigatória.
        </Callout>
      ) : null}
      <SelectField
        name="lostReason"
        label="Motivo"
        required
        options={optionsFrom(LOST_REASON_LABELS)}
      />
      <TextareaField
        name="notes"
        label="Nota"
        required={wasDeposited}
        help={wasDeposited ? "Explique o motivo: fica registrada no aporte." : undefined}
      />
    </ActionDialog>
  );
}

// Menu "⋯" do cabeçalho do detalhe (crm-design-system.md, seção 7.9): só "Cancelar aporte",
// longe da ação primária; abre o ConfirmDialog acima.
export function ContributionHeaderMenu({
  contributionId,
  blockers,
  wasDeposited,
}: ContributionStepProps & { wasDeposited: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon" aria-label="Mais ações" />}
        >
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            disabled={blockers.length > 0}
            onClick={() => setOpen(true)}
          >
            Cancelar aporte
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CancelContributionDialog
        contributionId={contributionId}
        blockers={blockers}
        wasDeposited={wasDeposited}
        trigger={null}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
