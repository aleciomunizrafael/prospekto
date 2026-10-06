"use client";
// Campos do projeto cultural (modelo-de-dados.md, 3.8) para "Novo projeto" e "Editar", em quatro
// seções (crm-design-system.md, seção 7.8): Identificação, Aprovação (exigida em Autorizado),
// Captação e texto público, Links e responsável. "R$" e "%" ficam fixos dentro da caixa; a prévia
// do endereço público acompanha o que se digita.
import { useEffect, useRef, useState } from "react";
import { UFS } from "@/lib/domain/enums";
import { MECHANISM_LABELS, optionsFrom } from "@/lib/crm/enum-labels";
import { slugify } from "@/lib/crm/format";
import {
  DateField,
  HiddenField,
  MoneyField,
  PercentField,
  SelectField,
  TextField,
  TextareaField,
  type Option,
} from "./project-forms/action-form";
import { FoldsOpenOnDesktop } from "./ui/folds-open-on-desktop";
import { FormSection } from "./ui/form-section";

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

export const PUBLIC_PROJECT_BASE = "prospekto.com.br/projetos/";

// Prévia "prospekto.com.br/projetos/{slug}" atualizada a cada `input` no formulário: usa o slug
// digitado ou, em branco, o nome (mesma regra de slugify do servidor).
function SlugPreview({ name, slug }: { name: string; slug: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(() => slugify(slug || name));
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const read = () => {
      const nameInput = form.elements.namedItem("name");
      const slugInput = form.elements.namedItem("slug");
      const typedName = nameInput instanceof HTMLInputElement ? nameInput.value : "";
      const typedSlug = slugInput instanceof HTMLInputElement ? slugInput.value : "";
      setValue(slugify(typedSlug || typedName));
    };
    read();
    form.addEventListener("input", read);
    return () => form.removeEventListener("input", read);
  }, []);
  return (
    <span ref={ref} className="mt-1 block" aria-live="polite">
      Fica em{" "}
      <span className="crm-code text-foreground">
        {PUBLIC_PROJECT_BASE}
        {value || "…"}
      </span>
    </span>
  );
}

// Seções dobráveis fechadas no celular e abertas no desktop (seção 7.8): o HTML sai fechado e,
// antes da primeira pintura após a hidratação, abre a partir de md (FoldsOpenOnDesktop).
const FOLD_CLASS = "project-fold";

export function ProjectFields({
  project,
  proponents,
  users,
  mode = "create",
}: {
  project?: ProjectFormValues;
  proponents: Option[];
  users: Option[];
  // "create": seções secundárias dobradas no celular e abertas no desktop; "edit" (folha lateral):
  // todas abertas.
  mode?: "create" | "edit";
}) {
  const edit = mode === "edit";
  const fold = {
    collapsible: true,
    defaultOpen: edit,
    className: edit ? undefined : FOLD_CLASS,
  };
  const grid = edit ? undefined : "grid gap-4 sm:grid-cols-2";
  const span = edit ? undefined : "sm:col-span-2";
  return (
    <>
      {project?.id ? <HiddenField name="projectId" value={project.id} /> : null}
      {edit ? null : <FoldsOpenOnDesktop selector={`details.${FOLD_CLASS}`} minWidth="48rem" />}

      <FormSection title="Identificação" contentClassName={grid}>
        <SelectField
          name="proponentOrgId"
          label="Proponente"
          required
          help="Organização do tipo proponente."
          options={proponents}
          defaultValue={project?.proponentOrgId ?? ""}
          className={span}
        />
        <TextField
          name="name"
          label="Nome do projeto"
          required
          defaultValue={project?.name ?? ""}
        />
        <SelectField
          name="mechanism"
          label="Mecanismo"
          required
          options={optionsFrom(MECHANISM_LABELS)}
          defaultValue={project?.mechanism ?? ""}
        />
        <TextField
          name="slug"
          label="Endereço no site"
          help={
            <>
              Gerado do nome se ficar em branco; só letras minúsculas, números e hífens.
              <SlugPreview name={project?.name ?? ""} slug={project?.slug ?? ""} />
            </>
          }
          defaultValue={project?.slug ?? ""}
          className={span}
        />
      </FormSection>

      <FormSection
        title="Aprovação"
        badge="exigido em Autorizado"
        description="Dados da portaria, CHP ou autorização do órgão."
        contentClassName={grid}
        {...fold}
      >
        <TextField
          name="processNumber"
          label="Número do processo"
          help="Pronac, número Ancine ou Pró-Cultura."
          defaultValue={project?.processNumber ?? ""}
        />
        <MoneyField
          name="approvedAmount"
          label="Valor aprovado"
          help="Portaria ou CHP."
          defaultValue={money(project?.approvedAmount)}
        />
        <DateField
          name="fundraisingDeadline"
          label="Prazo de captação"
          defaultValue={project?.fundraisingDeadline ?? ""}
        />
        <MoneyField
          name="fundraisingFeeAmount"
          label="Rubrica de captação aprovada"
          help="Limite da soma das comissões do projeto."
          defaultValue={money(project?.fundraisingFeeAmount)}
        />
        <PercentField
          name="commissionPct"
          label="Comissão contratada"
          help="No Rouanet, no máximo 10 %."
          defaultValue={
            project?.commissionPct == null ? "" : String(project.commissionPct).replace(".", ",")
          }
        />
      </FormSection>

      <FormSection
        title="Captação e texto público"
        description="O resumo e as contrapartidas aparecem no site quando o projeto é publicado."
        contentClassName={grid}
        {...fold}
      >
        <TextareaField
          name="summary"
          label="Resumo público"
          className={span}
          defaultValue={project?.summary ?? ""}
        />
        <TextareaField
          name="counterparts"
          label="Contrapartidas oferecidas"
          className={span}
          defaultValue={project?.counterparts ?? ""}
        />
        <TextField
          name="culturalSegment"
          label="Segmento cultural"
          placeholder="Música, teatro, audiovisual…"
          defaultValue={project?.culturalSegment ?? ""}
        />
        <div className={edit ? "flex flex-col gap-4" : "grid grid-cols-[1fr_6rem] gap-4"}>
          <TextField name="city" label="Cidade" defaultValue={project?.city ?? ""} />
          <SelectField
            name="uf"
            label="UF"
            placeholder="UF"
            options={UFS.map((uf) => ({ value: uf, label: uf }))}
            defaultValue={project?.uf ?? ""}
          />
        </div>
      </FormSection>

      <FormSection title="Links e responsável" contentClassName={grid} {...fold}>
        <TextField
          name="deckUrl"
          label="Link do deck"
          type="url"
          inputMode="url"
          placeholder="https://"
          defaultValue={project?.deckUrl ?? ""}
        />
        <TextField
          name="salicUrl"
          label="Link do SALIC"
          type="url"
          inputMode="url"
          placeholder="https://"
          defaultValue={project?.salicUrl ?? ""}
        />
        <DateField
          name="reportDueAt"
          label="Data limite do relatório"
          help="Prestação de contas."
          defaultValue={project?.reportDueAt ?? ""}
        />
        <SelectField
          name="ownerUserId"
          label="Responsável"
          placeholder="Ninguém ainda"
          options={users}
          defaultValue={project?.ownerUserId ?? ""}
        />
      </FormSection>
    </>
  );
}
