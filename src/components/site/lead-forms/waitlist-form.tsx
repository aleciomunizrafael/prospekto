"use client";

import {
  ConsentFields,
  LeadForm,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/site/form";
import { UFS } from "@/lib/domain/enums";
import {
  INVESTMENT_BAND_LABELS,
  INVESTMENT_BANDS,
  WAITLIST_EXPERIENCE_LABELS,
  WAITLIST_EXPERIENCES,
  WAITLIST_GOAL_LABELS,
  WAITLIST_GOALS,
} from "@/lib/validation/forms/mentoria";

const opts = <T extends readonly string[]>(values: T, labels: Record<T[number], string>) =>
  values.map((value) => ({ value, label: labels[value as T[number]] }));
const ufOptions = UFS.map((uf) => ({ value: uf, label: uf }));

// Lista de espera da mentoria (seção 5.5; form_id waitlist): lead ALUNO em alunos/lista_espera.
export function WaitlistForm({ titleId }: { titleId: string }) {
  return (
    <LeadForm
      formId="waitlist"
      ariaLabelledBy={titleId}
      fieldLabels={{
        nome: "Nome",
        email: "E-mail",
        objetivo: "Objetivo",
        experiencia: "Experiência",
        telefone: "Telefone ou WhatsApp",
        cidade: "Cidade",
        uf: "UF",
        faixa_investimento: "Quanto pretende investir",
        instagram_ou_linkedin: "Instagram ou LinkedIn",
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
      <SelectField
        name="objetivo"
        label="O que você quer com a mentoria"
        required
        options={opts(WAITLIST_GOALS, WAITLIST_GOAL_LABELS)}
      />
      <SelectField
        name="experiencia"
        label="Sua experiência com projetos culturais"
        required
        options={opts(WAITLIST_EXPERIENCES, WAITLIST_EXPERIENCE_LABELS)}
      />
      <TextField
        name="telefone"
        label="Telefone ou WhatsApp"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        help="Opcional. Com DDD."
      />
      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <TextField name="cidade" label="Cidade" autoComplete="address-level2" help="Opcional." />
        <SelectField name="uf" label="UF" options={ufOptions} placeholder="UF" />
      </div>
      <SelectField
        name="faixa_investimento"
        label="Quanto pretende investir na sua formação"
        options={opts(INVESTMENT_BANDS, INVESTMENT_BAND_LABELS)}
        placeholder="Opcional"
        help="Ajuda a definir o formato da turma. Ainda não há preço."
      />
      <TextField
        name="instagram_ou_linkedin"
        label="Instagram ou LinkedIn"
        help="Opcional. Para conhecer o seu trabalho."
      />
      <ConsentFields />
      <SubmitButton>Entrar na lista de espera</SubmitButton>
    </LeadForm>
  );
}
