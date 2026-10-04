import { ATTRIBUTE_FIELDS } from "@/lib/crm/attributes";
import { enumLabel } from "@/lib/crm/labels";
import type { LeadSegment } from "@/lib/domain/enums";
import { SelectField, TextField } from "./fields";

// Campos de `attributes` do segmento para "Novo lead" e "Editar" (name = attr_<chave>).
// Booleanos usam um select sim/não/em branco para não apagar o valor existente por omissão.
export function AttributeFields({
  segment,
  values,
  errors,
}: {
  segment: LeadSegment;
  values?: Record<string, unknown>;
  errors?: Record<string, string>;
}) {
  const fields = ATTRIBUTE_FIELDS[segment];
  if (!fields.length) return null;
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="mb-2 text-sm font-medium">Campos do segmento</legend>
      {fields.map((field) => {
        const name = `attr_${field.key}`;
        const current = values?.[field.key];
        const error = errors?.[name] ?? errors?.[field.key];
        if (field.type === "select") {
          return (
            <SelectField
              key={field.key}
              name={name}
              label={field.label}
              help={field.help}
              error={error}
              options={(field.options ?? []).map((o) => ({ value: o, label: enumLabel(o) }))}
              placeholder="não informado"
              defaultValue={typeof current === "string" ? current : ""}
            />
          );
        }
        if (field.type === "boolean") {
          return (
            <SelectField
              key={field.key}
              name={name}
              label={field.label}
              help={field.help}
              error={error}
              options={[
                { value: "sim", label: "Sim" },
                { value: "nao", label: "Não" },
              ]}
              placeholder="não informado"
              defaultValue={current === true ? "sim" : current === false ? "nao" : ""}
            />
          );
        }
        return (
          <TextField
            key={field.key}
            name={name}
            label={field.label}
            help={field.help}
            error={error}
            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
            step={field.type === "number" ? "0.01" : undefined}
            defaultValue={
              typeof current === "string" || typeof current === "number" ? String(current) : ""
            }
          />
        );
      })}
    </fieldset>
  );
}
