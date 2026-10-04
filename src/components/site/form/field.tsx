"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFormIdPrefix, useLeadField } from "./lead-form";

// Primitivos de formulário (seção 5.1 e 7.6): rótulo acima, "(obrigatório)" em texto, ajuda e erro
// ligados por aria-describedby, erro sempre com texto (nunca só cor), alvo de toque de 44px.
// Os campos leem o erro e o valor enviado do contexto do LeadForm pelo atributo `name`. Os ids
// levam o id do formulário como prefixo (`<formId>-campo-<name>`), porque uma página pode ter dois
// formulários com campos de mesmo nome (/contadores): rótulo, aria-describedby e os links do resumo
// de erros precisam apontar para o campo certo.

type FieldShellProps = {
  name: string;
  label: string;
  required?: boolean;
  help?: ReactNode;
  error?: string;
  // `fieldset` para grupos (rádios), `div` para campos simples.
  as?: "div" | "fieldset";
  className?: string;
  children: ReactNode;
};

export function fieldIds(name: string, formId?: string | null) {
  const id = formId ? `${formId}-campo-${name}` : `campo-${name}`;
  return { id, helpId: `${id}-ajuda`, errorId: `${id}-erro` };
}

export function describedBy(
  name: string,
  hasHelp: boolean,
  hasError: boolean,
  formId?: string | null,
): string | undefined {
  const { helpId, errorId } = fieldIds(name, formId);
  const ids = [hasHelp ? helpId : null, hasError ? errorId : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

// Ids e aria-describedby de um campo dentro (ou fora) de um LeadForm.
export function useFieldIds(name: string, hasHelp = false, hasError = false) {
  const formId = useFormIdPrefix();
  return { ...fieldIds(name, formId), describedBy: describedBy(name, hasHelp, hasError, formId) };
}

export function RequiredMark({ required }: { required?: boolean }) {
  return (
    <span className="text-muted-foreground font-normal">
      {required ? " (obrigatório)" : " (opcional)"}
    </span>
  );
}

export function FieldShell({
  name,
  label,
  required,
  help,
  error,
  as = "div",
  className,
  children,
}: FieldShellProps) {
  const { id, helpId, errorId } = useFieldIds(name);
  const Wrapper = as;
  const LabelTag = as === "fieldset" ? "legend" : "label";
  return (
    <Wrapper className={cn("flex flex-col gap-1.5", className)}>
      <LabelTag htmlFor={as === "div" ? id : undefined} className="font-medium">
        {label}
        <RequiredMark required={required} />
      </LabelTag>
      {help ? (
        <p id={helpId} className="text-muted-foreground text-[15px]">
          {help}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} className="text-error text-[15px] font-medium">
          {error}
        </p>
      ) : null}
    </Wrapper>
  );
}

const controlClass =
  "border-input bg-background text-foreground touch-target w-full rounded-lg border px-3 py-2 text-base outline-none focus-visible:border-ring aria-invalid:border-error aria-invalid:border-2";

type TextFieldProps = Omit<ComponentProps<"input">, "name" | "id"> & {
  name: string;
  label: string;
  help?: ReactNode;
};

export function TextField({ name, label, help, required, className, ...props }: TextFieldProps) {
  const { error, value } = useLeadField(name);
  const { id, describedBy: ariaDescribedBy } = useFieldIds(name, Boolean(help), Boolean(error));
  return (
    <FieldShell name={name} label={label} required={required} help={help} error={error}>
      <input
        id={id}
        name={name}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={ariaDescribedBy}
        defaultValue={value}
        className={cn(controlClass, className)}
        {...props}
      />
    </FieldShell>
  );
}

type TextareaFieldProps = Omit<ComponentProps<"textarea">, "name" | "id"> & {
  name: string;
  label: string;
  help?: ReactNode;
};

export function TextareaField({
  name,
  label,
  help,
  required,
  className,
  ...props
}: TextareaFieldProps) {
  const { error, value } = useLeadField(name);
  const { id, describedBy: ariaDescribedBy } = useFieldIds(name, Boolean(help), Boolean(error));
  return (
    <FieldShell name={name} label={label} required={required} help={help} error={error}>
      <textarea
        id={id}
        name={name}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={ariaDescribedBy}
        defaultValue={value}
        rows={5}
        className={cn(controlClass, "min-h-28", className)}
        {...props}
      />
    </FieldShell>
  );
}

export type SelectOption = { value: string; label: string };

type SelectFieldProps = Omit<ComponentProps<"select">, "name" | "id"> & {
  name: string;
  label: string;
  help?: ReactNode;
  options: SelectOption[];
  placeholder?: string;
};

export function SelectField({
  name,
  label,
  help,
  required,
  options,
  placeholder = "Selecione",
  className,
  ...props
}: SelectFieldProps) {
  const { error, value } = useLeadField(name);
  const { id, describedBy: ariaDescribedBy } = useFieldIds(name, Boolean(help), Boolean(error));
  return (
    <FieldShell name={name} label={label} required={required} help={help} error={error}>
      <select
        id={id}
        name={name}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={ariaDescribedBy}
        defaultValue={value ?? ""}
        className={cn(controlClass, className)}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

type RadioGroupFieldProps = {
  name: string;
  label: string;
  help?: ReactNode;
  required?: boolean;
  options: SelectOption[];
};

export function RadioGroupField({ name, label, help, required, options }: RadioGroupFieldProps) {
  const { error, value } = useLeadField(name);
  const { id, describedBy: ariaDescribedBy } = useFieldIds(name, Boolean(help), Boolean(error));
  return (
    <FieldShell
      name={name}
      label={label}
      required={required}
      help={help}
      error={error}
      as="fieldset"
    >
      <div
        role="radiogroup"
        aria-describedby={ariaDescribedBy}
        aria-invalid={error ? true : undefined}
        className="flex flex-col gap-2"
      >
        {options.map((o) => {
          const optionId = `${id}-${o.value}`;
          return (
            <label
              key={o.value}
              htmlFor={optionId}
              className="touch-target flex items-center gap-3"
            >
              <input
                id={optionId}
                type="radio"
                name={name}
                value={o.value}
                defaultChecked={value === o.value}
                required={required}
                className="accent-primary size-5"
              />
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
    </FieldShell>
  );
}

type CheckboxFieldProps = {
  name: string;
  label: ReactNode;
  required?: boolean;
  help?: ReactNode;
};

// Caixa de seleção com o texto completo visível ao lado (sem "li e aceito" genérico).
export function CheckboxField({ name, label, required, help }: CheckboxFieldProps) {
  const { error, value } = useLeadField(name);
  const {
    id,
    helpId,
    errorId,
    describedBy: ids,
  } = useFieldIds(name, Boolean(help), Boolean(error));
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          name={name}
          value="on"
          defaultChecked={value === "on"}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids}
          className="accent-primary mt-1 size-5 shrink-0"
        />
        <span>
          {label}
          <RequiredMark required={required} />
        </span>
      </label>
      {help ? (
        <p id={helpId} className="text-muted-foreground pl-8 text-[15px]">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-error pl-8 text-[15px] font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
}
