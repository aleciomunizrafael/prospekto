"use client";

import { ConsentFields, LeadForm, SubmitButton, TextField } from "@/components/site/form";

// Aviso de novos projetos (seção 5.5): Home quando a carteira está vazia. Lead PJ em
// patrocinadores com a tag avisar_projetos (form_id projects_notify).
export function ProjectsNotifyForm({ titleId }: { titleId: string }) {
  return (
    <LeadForm
      formId="projects_notify"
      ariaLabelledBy={titleId}
      fieldLabels={{ email: "E-mail", cidade: "Cidade", consent_lgpd: "Autorização de contato" }}
    >
      <TextField
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
      />
      <TextField
        name="cidade"
        label="Cidade"
        autoComplete="address-level2"
        help="Para avisar primeiro sobre projetos da sua região."
      />
      <ConsentFields />
      <SubmitButton>Deixar meu e-mail</SubmitButton>
    </LeadForm>
  );
}
