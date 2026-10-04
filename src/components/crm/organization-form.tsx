"use client";
// Campos da organização (modelo-de-dados.md, 3.3) reutilizados em "Nova organização" e "Editar".
import { UFS } from "@/lib/domain/enums";
import {
  ORGANIZATION_TYPE_LABELS,
  REGIME_CONFIRMATION_LABELS,
  TAX_REGIME_LABELS,
  optionsFrom,
} from "@/lib/crm/enum-labels";
import {
  HiddenField,
  MoneyField,
  SelectField,
  TextField,
  TextareaField,
  type Option,
} from "./project-forms/action-form";

export type OrganizationFormValues = {
  id?: string;
  type?: string | null;
  name?: string | null;
  tradeName?: string | null;
  cnpj?: string | null;
  city?: string | null;
  uf?: string | null;
  sector?: string | null;
  taxRegime?: string | null;
  taxRegimeConfirmedBy?: string | null;
  estimatedIrpj?: number | null;
  icmsContributorRs?: boolean | null;
  accountantOrgId?: string | null;
  ownerUserId?: string | null;
  notes?: string | null;
};

type Props = {
  org?: OrganizationFormValues;
  accountants: Option[];
  users: Option[];
};

const money = (v: number | null | undefined) =>
  v == null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function OrganizationFields({ org, accountants, users }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {org?.id ? <HiddenField name="orgId" value={org.id} /> : null}
      <SelectField
        name="type"
        label="Tipo"
        required
        options={optionsFrom(ORGANIZATION_TYPE_LABELS)}
        defaultValue={org?.type ?? ""}
      />
      <TextField name="name" label="Razão social ou nome" required defaultValue={org?.name ?? ""} />
      <TextField name="tradeName" label="Nome fantasia" defaultValue={org?.tradeName ?? ""} />
      <TextField
        name="cnpj"
        label="CNPJ"
        help="14 dígitos; obrigatório só para a empresa patrocinadora assinar o termo."
        inputMode="numeric"
        defaultValue={org?.cnpj ?? ""}
      />
      <TextField name="city" label="Cidade" defaultValue={org?.city ?? ""} />
      <SelectField
        name="uf"
        label="UF"
        options={UFS.map((uf) => ({ value: uf, label: uf }))}
        defaultValue={org?.uf ?? ""}
      />
      <TextField name="sector" label="Setor de atuação" defaultValue={org?.sector ?? ""} />
      <SelectField
        name="taxRegime"
        label="Regime tributário"
        options={optionsFrom(TAX_REGIME_LABELS)}
        defaultValue={org?.taxRegime ?? ""}
      />
      <SelectField
        name="taxRegimeConfirmedBy"
        label="Regime confirmado por"
        options={optionsFrom(REGIME_CONFIRMATION_LABELS)}
        defaultValue={org?.taxRegimeConfirmedBy ?? ""}
      />
      <MoneyField
        name="estimatedIrpj"
        label="IRPJ devido estimado (R$)"
        help="Base de 15%, sem adicional; alimenta o potencial de 4%."
        defaultValue={money(org?.estimatedIrpj)}
      />
      <SelectField
        name="icmsContributorRs"
        label="Contribuinte de ICMS no RS"
        placeholder="Não informado"
        options={[
          { value: "sim", label: "Sim" },
          { value: "nao", label: "Não" },
        ]}
        defaultValue={org?.icmsContributorRs == null ? "" : org.icmsContributorRs ? "sim" : "nao"}
      />
      <SelectField
        name="accountantOrgId"
        label="Escritório contábil vinculado"
        placeholder="Nenhum"
        options={accountants}
        defaultValue={org?.accountantOrgId ?? ""}
      />
      <SelectField
        name="ownerUserId"
        label="Quem cuida desta conta"
        placeholder="Ninguém ainda"
        options={users}
        defaultValue={org?.ownerUserId ?? ""}
      />
      <TextareaField
        name="notes"
        label="Notas"
        className="sm:col-span-2"
        defaultValue={org?.notes ?? ""}
      />
    </div>
  );
}
