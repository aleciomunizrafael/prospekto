"use client";

import {
  ConsentFields,
  LeadForm,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
} from "@/components/site/form";
import { UFS } from "@/lib/domain/enums";
import {
  PRIOR_ACCOUNTABILITY,
  PRIOR_ACCOUNTABILITY_LABELS,
  PROJECT_MECHANISM_LABELS,
  PROJECT_MECHANISMS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  PROPONENT_TYPE_LABELS,
  PROPONENT_TYPES,
} from "@/lib/validation/forms/proponentes";

const opts = <T extends readonly string[]>(values: T, labels: Record<T[number], string>) =>
  values.map((value) => ({ value, label: labels[value as T[number]] }));
const ufOptions = UFS.map((uf) => ({ value: uf, label: uf }));

// Envio de projeto para avaliação (seção 5.5; form_id proponent): lead PROP em projetos/prospeccao.
// Sem upload na Fase 1: link externo para o material.
export function ProponentForm({ titleId }: { titleId: string }) {
  return (
    <LeadForm
      formId="proponent"
      ariaLabelledBy={titleId}
      fieldLabels={{
        proponente: "Proponente",
        tipo_proponente: "Tipo de proponente",
        nome: "Nome",
        email: "E-mail",
        telefone: "Telefone ou WhatsApp",
        projeto_nome: "Nome do projeto",
        mecanismo: "Mecanismo",
        status_projeto: "Situação do projeto",
        segmento_cultural: "Segmento cultural",
        cidade: "Cidade",
        uf: "UF",
        numero_processo: "Número do processo",
        valor_aprovado: "Valor aprovado",
        saldo_a_captar: "Saldo a captar",
        prazo_captacao: "Prazo de captação",
        link_material: "Link do material",
        prestacao_contas_anterior: "Prestação de contas anterior",
        mensagem: "Mensagem",
        consent_lgpd: "Autorização de contato",
      }}
    >
      <TextField
        name="proponente"
        label="Proponente (nome da pessoa, produtora ou instituição)"
        autoComplete="organization"
        required
      />
      <SelectField
        name="tipo_proponente"
        label="Tipo de proponente"
        required
        options={opts(PROPONENT_TYPES, PROPONENT_TYPE_LABELS)}
      />
      <TextField name="nome" label="Nome de quem envia" autoComplete="name" required />
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
      <fieldset className="border-border flex flex-col gap-5 rounded-lg border p-4">
        <legend className="site-label px-1">O projeto</legend>
        <TextField name="projeto_nome" label="Nome do projeto" required />
        <SelectField
          name="mecanismo"
          label="Mecanismo"
          required
          options={opts(PROJECT_MECHANISMS, PROJECT_MECHANISM_LABELS)}
        />
        <SelectField
          name="status_projeto"
          label="Situação do projeto"
          required
          options={opts(PROJECT_STATUSES, PROJECT_STATUS_LABELS)}
        />
        <TextField
          name="segmento_cultural"
          label="Segmento cultural"
          required
          help="Por exemplo: música instrumental, artes cênicas, audiovisual, patrimônio."
        />
        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <TextField name="cidade" label="Cidade" autoComplete="address-level2" required />
          <SelectField name="uf" label="UF" required options={ufOptions} placeholder="UF" />
        </div>
        <TextField
          name="numero_processo"
          label="Número do processo"
          help="Opcional. Pronac, número na Ancine ou no Pró-Cultura RS."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="valor_aprovado"
            label="Valor aprovado (R$)"
            inputMode="decimal"
            help="Opcional. Por exemplo 350.000."
          />
          <TextField
            name="saldo_a_captar"
            label="Saldo a captar (R$)"
            inputMode="decimal"
            help="Opcional."
          />
        </div>
        <TextField
          name="prazo_captacao"
          label="Prazo de captação"
          help="Opcional. Data da portaria ou do despacho, por exemplo 31/12/2026."
        />
        <TextField
          name="link_material"
          label="Link do material (portaria, orçamento, deck)"
          type="url"
          inputMode="url"
          help="Opcional. Pasta compartilhada ou PDF. Sem upload nesta etapa."
        />
        <SelectField
          name="prestacao_contas_anterior"
          label="Prestação de contas de projeto incentivado anterior"
          options={opts(PRIOR_ACCOUNTABILITY, PRIOR_ACCOUNTABILITY_LABELS)}
          placeholder="Opcional"
        />
      </fieldset>
      <TextareaField
        name="mensagem"
        label="Mensagem"
        help="Opcional. Até 2.000 caracteres."
        maxLength={2000}
      />
      <ConsentFields />
      <SubmitButton>Enviar meu projeto para avaliação</SubmitButton>
    </LeadForm>
  );
}
