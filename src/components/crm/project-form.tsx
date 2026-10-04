"use client";
// Campos do projeto cultural (modelo-de-dados.md, 3.8) para "Novo projeto" e "Editar".
import { UFS } from "@/lib/domain/enums";
import { MECHANISM_LABELS, optionsFrom } from "@/lib/crm/enum-labels";
import {
  DateField,
  HiddenField,
  MoneyField,
  SelectField,
  TextField,
  TextareaField,
  type Option,
} from "./project-forms/action-form";

export type ProjectFormValues = {
  id?: string;
  proponentOrgId?: string | null;
  name?: string | null;
  slug?: string | null;
  mechanism?: string | null;
  processNumber?: string | null;
  approvedAmount?: number | null;
  fundraisingDeadline?: string | null;
  fundraisingFeeAmount?: number | null;
  commissionPct?: number | null;
  city?: string | null;
  uf?: string | null;
  culturalSegment?: string | null;
  summary?: string | null;
  counterparts?: string | null;
  deckUrl?: string | null;
  salicUrl?: string | null;
  reportDueAt?: string | null;
  ownerUserId?: string | null;
};

const money = (v: number | null | undefined) =>
  v == null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function ProjectFields({
  project,
  proponents,
  users,
}: {
  project?: ProjectFormValues;
  proponents: Option[];
  users: Option[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {project?.id ? <HiddenField name="projectId" value={project.id} /> : null}
      <SelectField
        name="proponentOrgId"
        label="Proponente"
        required
        help="Organização do tipo proponente. Cadastre-a em Organizações se ainda não existir."
        options={proponents}
        defaultValue={project?.proponentOrgId ?? ""}
      />
      <SelectField
        name="mechanism"
        label="Mecanismo"
        required
        options={optionsFrom(MECHANISM_LABELS)}
        defaultValue={project?.mechanism ?? ""}
      />
      <TextField name="name" label="Nome do projeto" required defaultValue={project?.name ?? ""} />
      <TextField
        name="slug"
        label="Endereço no site (slug)"
        help="Gerado do nome se ficar em branco; só letras minúsculas, números e hífens."
        defaultValue={project?.slug ?? ""}
      />
      <TextField
        name="processNumber"
        label="Número do processo"
        help="Pronac, número Ancine ou Pró-Cultura; obrigatório em Autorizado."
        defaultValue={project?.processNumber ?? ""}
      />
      <MoneyField
        name="approvedAmount"
        label="Valor aprovado (R$)"
        help="Portaria ou CHP; obrigatório em Autorizado."
        defaultValue={money(project?.approvedAmount)}
      />
      <DateField
        name="fundraisingDeadline"
        label="Prazo de captação"
        help="Obrigatório em Autorizado."
        defaultValue={project?.fundraisingDeadline ?? ""}
      />
      <MoneyField
        name="fundraisingFeeAmount"
        label="Rubrica de captação aprovada (R$)"
        help="Limite da soma das comissões do projeto; obrigatório em Autorizado."
        defaultValue={money(project?.fundraisingFeeAmount)}
      />
      <TextField
        name="commissionPct"
        label="Percentual de comissão contratado (%)"
        help="No Rouanet, no máximo 10%."
        inputMode="decimal"
        defaultValue={
          project?.commissionPct == null ? "" : String(project.commissionPct).replace(".", ",")
        }
      />
      <TextField
        name="culturalSegment"
        label="Segmento cultural"
        defaultValue={project?.culturalSegment ?? ""}
      />
      <TextField name="city" label="Cidade" defaultValue={project?.city ?? ""} />
      <SelectField
        name="uf"
        label="UF"
        options={UFS.map((uf) => ({ value: uf, label: uf }))}
        defaultValue={project?.uf ?? ""}
      />
      <TextareaField
        name="summary"
        label="Resumo público"
        help="Aparece no site quando o projeto é publicado."
        className="sm:col-span-2"
        defaultValue={project?.summary ?? ""}
      />
      <TextareaField
        name="counterparts"
        label="Contrapartidas oferecidas"
        className="sm:col-span-2"
        defaultValue={project?.counterparts ?? ""}
      />
      <TextField
        name="deckUrl"
        label="Link do deck"
        type="url"
        defaultValue={project?.deckUrl ?? ""}
      />
      <TextField
        name="salicUrl"
        label="Link do SALIC"
        type="url"
        defaultValue={project?.salicUrl ?? ""}
      />
      <DateField
        name="reportDueAt"
        label="Data limite do relatório"
        help="Prestação de contas; obrigatório em Prestação de contas."
        defaultValue={project?.reportDueAt ?? ""}
      />
      <SelectField
        name="ownerUserId"
        label="Responsável"
        placeholder="Ninguém ainda"
        options={users}
        defaultValue={project?.ownerUserId ?? ""}
      />
    </div>
  );
}
