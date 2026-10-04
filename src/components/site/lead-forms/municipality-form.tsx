"use client";

import {
  ConsentFields,
  LeadForm,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
} from "@/components/site/form";
import {
  LOCAL_LAW_STATUS_LABELS,
  LOCAL_LAW_STATUSES,
  MUNICIPALITY_BODIES,
  MUNICIPALITY_BODY_LABELS,
  MUNICIPALITY_NEED_LABELS,
  MUNICIPALITY_NEEDS,
  MUNICIPALITY_ROLE_LABELS,
  MUNICIPALITY_ROLES,
  PNAB_STATUS_LABELS,
  PNAB_STATUSES,
} from "@/lib/validation/forms/municipios";

const opts = <T extends readonly string[]>(values: T, labels: Record<T[number], string>) =>
  values.map((value) => ({ value, label: labels[value as T[number]] }));

// Diagnóstico do fomento municipal (seção 5.5; form_id municipality): lead MUN em municipios/novo.
export function MunicipalityForm({ titleId }: { titleId: string }) {
  return (
    <LeadForm
      formId="municipality"
      ariaLabelledBy={titleId}
      fieldLabels={{
        municipio: "Município",
        orgao: "Órgão",
        cargo: "Cargo",
        nome: "Nome",
        email: "E-mail",
        telefone: "Telefone ou WhatsApp",
        necessidade: "Principal necessidade",
        pnab_status: "Situação na PNAB",
        lei_incentivo_municipal: "Lei municipal de incentivo",
        mensagem: "Mensagem",
        consent_lgpd: "Autorização de contato",
      }}
    >
      <TextField name="municipio" label="Município" autoComplete="address-level2" required />
      <SelectField
        name="orgao"
        label="Órgão"
        required
        options={opts(MUNICIPALITY_BODIES, MUNICIPALITY_BODY_LABELS)}
      />
      <SelectField
        name="cargo"
        label="Cargo"
        required
        options={opts(MUNICIPALITY_ROLES, MUNICIPALITY_ROLE_LABELS)}
      />
      <TextField name="nome" label="Nome" autoComplete="name" required />
      <TextField
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        help="De preferência o e-mail institucional."
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
        name="necessidade"
        label="Principal necessidade"
        required
        options={opts(MUNICIPALITY_NEEDS, MUNICIPALITY_NEED_LABELS)}
      />
      <SelectField
        name="pnab_status"
        label="Situação do município na PNAB"
        options={opts(PNAB_STATUSES, PNAB_STATUS_LABELS)}
        placeholder="Opcional"
      />
      <SelectField
        name="lei_incentivo_municipal"
        label="O município tem lei de incentivo à cultura?"
        options={opts(LOCAL_LAW_STATUSES, LOCAL_LAW_STATUS_LABELS)}
        placeholder="Opcional"
      />
      <TextareaField
        name="mensagem"
        label="Mensagem"
        help="Opcional. Prazos, saldo a executar, editais previstos. Até 2.000 caracteres."
        maxLength={2000}
      />
      <ConsentFields />
      <SubmitButton>Pedir diagnóstico do fomento municipal</SubmitButton>
    </LeadForm>
  );
}
