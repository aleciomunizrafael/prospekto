"use client";

import {
  ConsentFields,
  LeadForm,
  RadioGroupField,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
} from "@/components/site/form";
import { UFS } from "@/lib/domain/enums";
import {
  ACCOUNTANT_ROLE_LABELS,
  ACCOUNTANT_ROLES,
  LUCRO_REAL_BAND_LABELS,
  LUCRO_REAL_BANDS,
  YES_NO,
  YES_NO_LABELS,
} from "@/lib/validation/forms/contadores-options";

const roleOptions = ACCOUNTANT_ROLES.map((value) => ({
  value,
  label: ACCOUNTANT_ROLE_LABELS[value],
}));
const bandOptions = LUCRO_REAL_BANDS.map((value) => ({
  value,
  label: LUCRO_REAL_BAND_LABELS[value],
}));
const yesNoOptions = YES_NO.map((value) => ({ value, label: YES_NO_LABELS[value] }));
const ufOptions = UFS.map((uf) => ({ value: uf, label: uf }));

// Diagnóstico de carteira (seção 5.5; form_id accountant): lead CONT em contadores/novo.
export function AccountantForm({ titleId }: { titleId: string }) {
  return (
    <LeadForm
      formId="accountant"
      ariaLabelledBy={titleId}
      fieldLabels={{
        escritorio: "Escritório",
        nome: "Nome",
        cargo: "Cargo",
        email: "E-mail",
        telefone: "Telefone ou WhatsApp",
        clientes_lucro_real_faixa: "Clientes no lucro real",
        cidade: "Cidade",
        uf: "UF",
        cnpj: "CNPJ do escritório",
        ja_lancou_incentivo: "Já lançou incentivo",
        registro_crc: "Registro no CRC",
        mensagem: "Mensagem",
        consent_lgpd: "Autorização de contato",
      }}
    >
      <TextField name="escritorio" label="Escritório" autoComplete="organization" required />
      <TextField name="nome" label="Nome" autoComplete="name" required />
      <SelectField name="cargo" label="Cargo" required options={roleOptions} />
      <TextField
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
      />
      <TextField
        name="telefone"
        label="Telefone ou WhatsApp"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        required
        help="Com DDD, por exemplo (54) 98403-2180."
      />
      <SelectField
        name="clientes_lucro_real_faixa"
        label="Quantos clientes do escritório estão no lucro real"
        required
        options={bandOptions}
        help="Só a quantidade. Nomes não são pedidos: a triagem continua do escritório."
      />
      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <TextField name="cidade" label="Cidade" autoComplete="address-level2" required />
        <SelectField name="uf" label="UF" required options={ufOptions} placeholder="UF" />
      </div>
      <TextField name="cnpj" label="CNPJ do escritório" inputMode="numeric" help="Opcional." />
      <RadioGroupField
        name="ja_lancou_incentivo"
        label="O escritório já lançou dedução de incentivo cultural para algum cliente?"
        options={yesNoOptions}
      />
      <TextField name="registro_crc" label="Registro no CRC" help="Opcional." />
      <TextareaField
        name="mensagem"
        label="Mensagem"
        help="Opcional. Até 2.000 caracteres."
        maxLength={2000}
      />
      <ConsentFields />
      <SubmitButton>Pedir o diagnóstico da carteira</SubmitButton>
    </LeadForm>
  );
}
