import { ChevronRight } from "lucide-react";
import { ATTRIBUTE_FIELDS, type AttributeField } from "@/lib/crm/attributes";
import { enumLabel } from "@/lib/crm/labels";
import type { LeadSegment } from "@/lib/domain/enums";
import { cn } from "@/lib/utils";
import { SelectField, TextField } from "./fields";

// Campos de `attributes` do segmento para "Novo lead" e "Editar" (name = attr_<chave>).
// Booleanos usam um select Selecione/Sim/Não para não apagar o valor existente por omissão.
// Agrupados por tema (crm-design-system.md, decisão D4): a ordem e as chaves de ATTRIBUTE_FIELDS
// não mudam; o grupo do art. 27 pode vir fechado num <details> (criação) ou aberto (edição e
// "Mover para Termo"). Os três campos do art. 27 continuam no FormData nos dois casos.
export type AttributeGroup = { title: string; keys: readonly string[] };

export const ART27_KEYS = [
  "vinculo_art27_checado",
  "vinculo_art27_checado_em",
  "vinculo_art27_checado_por",
] as const;

export const ART27_GROUP_TITLE = "Checagem do art. 27 (só antes de Termo)";

// Chaves de cada grupo; o que ficar de fora entra no primeiro grupo do segmento.
export const ATTRIBUTE_GROUPS: Record<LeadSegment, AttributeGroup[]> = {
  PJ: [
    {
      title: "Empresa e regime",
      keys: [
        "empresa",
        "cnpj",
        "cargo",
        "regime_tributario",
        "regime_confirmado_por",
        "irpj_faixa",
        "apuracao",
        "contador_escritorio",
      ],
    },
    {
      title: "Qualificação",
      keys: [
        "usa_incentivos",
        "contribuinte_icms_rs",
        "setor",
        "numero_funcionarios_faixa",
        "contador_participa",
        "disponibilidade",
        "decisor_em_contato",
        "conhece_incentivos",
      ],
    },
    { title: ART27_GROUP_TITLE, keys: ART27_KEYS },
  ],
  PF: [
    { title: "Declaração", keys: [] },
    { title: ART27_GROUP_TITLE, keys: ART27_KEYS },
  ],
  CONT: [{ title: "Escritório", keys: [] }],
  MUN: [{ title: "Município", keys: [] }],
  PROP: [{ title: "Proponente e projeto", keys: [] }],
  ALUNO: [{ title: "Aluno", keys: [] }],
};

// Grupos com os campos na ordem de ATTRIBUTE_FIELDS; chaves sem grupo caem no primeiro.
export function groupedAttributeFields(
  segment: LeadSegment,
): { title: string; fields: AttributeField[] }[] {
  const fields = ATTRIBUTE_FIELDS[segment];
  const groups = ATTRIBUTE_GROUPS[segment];
  const known = new Set(groups.flatMap((g) => g.keys));
  return groups
    .map((group, i) => ({
      title: group.title,
      fields: fields.filter((f) => group.keys.includes(f.key) || (i === 0 && !known.has(f.key))),
    }))
    .filter((g) => g.fields.length > 0);
}

export function countFilledAttributes(
  segment: LeadSegment,
  values: Record<string, unknown> | undefined,
): { filled: number; total: number } {
  const fields = ATTRIBUTE_FIELDS[segment];
  const filled = fields.filter((f) => {
    const v = values?.[f.key];
    return v !== undefined && v !== null && v !== "";
  }).length;
  return { filled, total: fields.length };
}

function Field({
  field,
  values,
  errors,
}: {
  field: AttributeField;
  values?: Record<string, unknown>;
  errors?: Record<string, string>;
}) {
  const name = `attr_${field.key}`;
  const current = values?.[field.key];
  const error = errors?.[name] ?? errors?.[field.key];
  if (field.type === "select") {
    return (
      <SelectField
        name={name}
        label={field.label}
        help={field.help}
        error={error}
        options={(field.options ?? []).map((o) => ({ value: o, label: enumLabel(o) }))}
        defaultValue={typeof current === "string" ? current : ""}
      />
    );
  }
  if (field.type === "boolean") {
    return (
      <SelectField
        name={name}
        label={field.label}
        help={field.help}
        error={error}
        options={[
          { value: "sim", label: "Sim" },
          { value: "nao", label: "Não" },
        ]}
        defaultValue={current === true ? "sim" : current === false ? "nao" : ""}
      />
    );
  }
  return (
    <TextField
      name={name}
      label={field.label}
      help={field.help}
      error={error}
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      step={field.type === "number" ? "0.01" : undefined}
      inputMode={field.type === "number" ? "decimal" : field.key === "cnpj" ? "numeric" : undefined}
      dateHint={field.type === "date"}
      defaultValue={
        typeof current === "string" || typeof current === "number" ? String(current) : ""
      }
    />
  );
}

export function AttributeFields({
  segment,
  values,
  errors,
  art27 = "open",
  className,
}: {
  segment: LeadSegment;
  values?: Record<string, unknown>;
  errors?: Record<string, string>;
  // "collapsed": o grupo do art. 27 fica num <details> fechado (criação do lead, decisão D4);
  // abre sozinho quando um dos seus campos tem erro.
  art27?: "open" | "collapsed";
  className?: string;
}) {
  const groups = groupedAttributeFields(segment);
  if (groups.length === 0) return null;
  const art27HasError = ART27_KEYS.some((k) => errors?.[`attr_${k}`] ?? errors?.[k]);
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {groups.map((group) => {
        const isArt27 = group.title === ART27_GROUP_TITLE;
        const grid = (
          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <Field key={field.key} field={field} values={values} errors={errors} />
            ))}
          </div>
        );
        if (isArt27 && art27 === "collapsed") {
          return (
            <details
              key={group.title}
              open={art27HasError || undefined}
              className="group rounded-lg border border-border p-3"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-120 group-open:rotate-90"
                  aria-hidden="true"
                />
                {group.title}
              </summary>
              <div className="mt-3">{grid}</div>
            </details>
          );
        }
        return (
          <fieldset key={group.title} className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium">{group.title}</legend>
            {grid}
          </fieldset>
        );
      })}
    </div>
  );
}
