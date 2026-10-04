"use client";

import {
  ConsentFields,
  LeadForm,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/site/form";
import { LUCRO_REAL_BAND_LABELS, LUCRO_REAL_BANDS } from "@/lib/validation/forms/contadores";

const bandOptions = LUCRO_REAL_BANDS.map((value) => ({
  value,
  label: LUCRO_REAL_BAND_LABELS[value],
}));

// Inscrição no webinar para contadores (seção 5.5; form_id accountant_webinar): lead CONT em
// contadores/novo com source_detail webinar:[data].
export function AccountantWebinarForm({ titleId }: { titleId: string }) {
  return (
    <LeadForm
      formId="accountant_webinar"
      ariaLabelledBy={titleId}
      fieldLabels={{
        nome: "Nome",
        email: "E-mail",
        escritorio: "Escritório",
        clientes_lucro_real_faixa: "Clientes no lucro real",
        consent_lgpd: "Autorização de contato",
      }}
    >
      <TextField name="nome" label="Nome" autoComplete="name" required />
      <TextField
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
      />
      <TextField name="escritorio" label="Escritório" autoComplete="organization" required />
      <SelectField
        name="clientes_lucro_real_faixa"
        label="Quantos clientes do escritório estão no lucro real"
        options={bandOptions}
        placeholder="Opcional"
      />
      <ConsentFields />
      <SubmitButton>Inscrever-me no webinar</SubmitButton>
    </LeadForm>
  );
}
