"use client";

import { useId, useState } from "react";
import { searchTaskLeadsAction } from "@/actions/tasks";
import { cn } from "@/lib/utils";
import { HiddenField, useFieldError, type Option } from "../project-forms/action-form";
import { LeadPicker } from "../project-forms/lead-picker";
import { SegmentedControl } from "../ui/segmented-control";

// "Vínculo (opcional)" do diálogo de tarefa (ADR-004, 6.5): um SegmentedControl Nenhum / Lead /
// Organização / Projeto que mostra, respectivamente, nada, o LeadPicker existente (busca pela
// Server Action searchTaskLeadsAction), um <select> de organizações ou um <select> de projetos
// (opções vindas da página). Só o id do tipo escolhido vai no formulário (`linkKind` + `leadId` |
// `orgId` | `projectId`); ao editar, o vínculo atual é pré-selecionado e o nome aparece.

export type LinkKind = "nenhum" | "lead" | "organizacao" | "projeto";

export type CurrentLink = { kind: LinkKind; id: string; label: string } | null;

const KIND_OPTIONS: { value: LinkKind; label: string }[] = [
  { value: "nenhum", label: "Nenhum" },
  { value: "lead", label: "Lead" },
  { value: "organizacao", label: "Organização" },
  { value: "projeto", label: "Projeto" },
];

const selectClass =
  "border-input bg-background text-foreground min-h-11 w-full rounded-lg border px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:min-h-9 md:py-1.5 md:text-sm [&:has(option[value='']:checked)]:text-placeholder";

function RecordSelect({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: Option[];
  defaultValue: string;
}) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erro` : undefined}
        className={selectClass}
      >
        <option value="">Selecione</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${id}-erro`} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TaskRecordPicker({
  organizations,
  projects,
  current = null,
  className,
}: {
  organizations: Option[];
  projects: Option[];
  current?: CurrentLink;
  className?: string;
}) {
  const [kind, setKind] = useState<LinkKind>(current?.kind ?? "nenhum");
  const [pickedName, setPickedName] = useState<string | null>(null);
  const keepingLead = kind === "lead" && current?.kind === "lead" && !pickedName;
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      <legend className="text-sm font-medium">Vínculo (opcional)</legend>
      <SegmentedControl
        name="linkKind"
        label="Tipo de vínculo"
        value={kind}
        onChange={(value) => {
          setKind(value as LinkKind);
          setPickedName(null);
        }}
        options={KIND_OPTIONS}
      />
      {kind === "lead" ? (
        <>
          {keepingLead ? (
            <p className="text-sm" role="status">
              Vínculo atual: <span className="font-medium">{current.label}</span>. Busque outro lead
              para trocar.
            </p>
          ) : null}
          {current?.kind === "lead" ? (
            <HiddenField name="leadIdCurrent" value={current.id} />
          ) : null}
          <LeadPicker
            search={searchTaskLeadsAction}
            label="Lead"
            help="Busque pelo nome ou e-mail e escolha na lista."
            required={false}
            onPick={(lead) => setPickedName(lead.name)}
          />
        </>
      ) : null}
      {kind === "organizacao" ? (
        <RecordSelect
          name="orgId"
          label="Organização"
          options={organizations}
          defaultValue={current?.kind === "organizacao" ? current.id : ""}
        />
      ) : null}
      {kind === "projeto" ? (
        <RecordSelect
          name="projectId"
          label="Projeto"
          options={projects}
          defaultValue={current?.kind === "projeto" ? current.id : ""}
        />
      ) : null}
    </fieldset>
  );
}
