"use client";

import {
  ConsentFields,
  LeadForm,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
} from "@/components/site/form";
import { CONTACT_SUBJECTS, CONTACT_SUBJECT_LABELS } from "@/lib/validation/forms/contato-options";

const subjectOptions = CONTACT_SUBJECTS.map((value) => ({
  value,
  label: CONTACT_SUBJECT_LABELS[value],
}));

// Formulário de contato (seção 5.5): o assunto define o pipeline do lead (form_id contact).
export function ContactForm({ titleId }: { titleId: string }) {
  return (
    <LeadForm
      formId="contact"
      ariaLabelledBy={titleId}
      fieldLabels={{
        nome: "Nome",
        email: "E-mail",
        telefone: "Telefone",
        empresa: "Empresa, escritório ou instituição",
        assunto: "Assunto",
        mensagem: "Mensagem",
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
      <TextField
        name="telefone"
        label="Telefone ou WhatsApp"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        help="Com DDD, por exemplo (54) 98403-2180."
      />
      <TextField
        name="empresa"
        label="Empresa, escritório ou instituição"
        autoComplete="organization"
      />
      <SelectField name="assunto" label="Assunto" required options={subjectOptions} />
      <TextareaField
        name="mensagem"
        label="Mensagem"
        required
        help="Conte o que você quer realizar. Até 2.000 caracteres."
        maxLength={2000}
      />
      <ConsentFields />
      <SubmitButton>Enviar</SubmitButton>
    </LeadForm>
  );
}
