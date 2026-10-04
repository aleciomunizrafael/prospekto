"use client";

import {
  ConsentFields,
  LeadForm,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/site/form";
import { site } from "@/config/site";
import { UFS } from "@/lib/domain/enums";
import { GUIDE_PROFILES, GUIDE_PROFILE_LABELS } from "@/lib/validation/forms/guia";

const profileOptions = GUIDE_PROFILES.map((value) => ({
  value,
  label: GUIDE_PROFILE_LABELS[value],
}));
const ufOptions = UFS.map((uf) => ({ value: uf, label: uf }));

// Formulário do guia (estrutura-e-copy.md, seção 5.2). Enquanto a edição revisada não está aprovada
// (site.guide.available = false), publica o modo "em breve" da seção 10.3: e-mail, perfil e
// consentimento; lead com tag avisar_guia (form_id guide_notify).
export function GuideForm({ titleId }: { titleId: string }) {
  if (!site.guide.available) {
    return (
      <LeadForm
        formId="guide_notify"
        ariaLabelledBy={titleId}
        fieldLabels={{ email: "E-mail", perfil: "Perfil", consent_lgpd: "Autorização de contato" }}
      >
        <TextField
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
        />
        <SelectField name="perfil" label="Perfil" required options={profileOptions} />
        <ConsentFields />
        <SubmitButton>Avisar quando estiver disponível</SubmitButton>
      </LeadForm>
    );
  }
  return (
    <LeadForm
      formId="guide"
      ariaLabelledBy={titleId}
      fieldLabels={{
        nome: "Nome",
        email: "E-mail",
        perfil: "Perfil",
        empresa_ou_escritorio: "Empresa ou escritório",
        cidade: "Cidade",
        uf: "UF",
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
      <SelectField name="perfil" label="Perfil" required options={profileOptions} />
      <TextField
        name="empresa_ou_escritorio"
        label="Empresa ou escritório"
        autoComplete="organization"
      />
      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <TextField name="cidade" label="Cidade" autoComplete="address-level2" required />
        <SelectField name="uf" label="UF" required options={ufOptions} placeholder="UF" />
      </div>
      <ConsentFields />
      <SubmitButton>Baixar o guia</SubmitButton>
    </LeadForm>
  );
}
