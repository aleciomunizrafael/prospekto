import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DateHint } from "../ui/date-hint";

// Primitivos de formulário do CRM: rótulo, ajuda e erro ligados por aria-describedby; erro
// sempre em texto. Sem hooks, para servir a componentes de servidor e de cliente.
// Obrigatório = asterisco visual + `aria-required` (crm-design-system.md, seção 7.5); a nota
// "* obrigatório" fica no PageHeader ou no FormActions. Campos com 44 px no celular, 36 no desktop.
type ShellProps = {
  name: string;
  label: ReactNode;
  required?: boolean;
  help?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
};

export function ids(name: string) {
  return { id: `f-${name}`, helpId: `f-${name}-ajuda`, errorId: `f-${name}-erro` };
}

export function describedBy(name: string, help: unknown, error: unknown): string | undefined {
  const { helpId, errorId } = ids(name);
  const list = [help ? helpId : null, error ? errorId : null].filter(Boolean);
  return list.length ? list.join(" ") : undefined;
}

export function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-destructive">
      {" "}
      *
    </span>
  );
}

export function FieldShell({
  name,
  label,
  required,
  help,
  error,
  className,
  children,
}: ShellProps) {
  const { id, helpId, errorId } = ids(name);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="gap-0">
        {label}
        {required ? <RequiredMark /> : null}
      </Label>
      {help ? (
        <p id={helpId} className="text-muted-foreground text-xs">
          {help}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass = "h-11 md:h-9";

type TextProps = Omit<ComponentProps<"input">, "name" | "id"> & {
  name: string;
  label: ReactNode;
  help?: ReactNode;
  error?: string;
  // Mostra "sex., 9 de out., 14:10" ao lado de campos date/datetime-local (DateHint).
  dateHint?: boolean;
};

export function TextField({
  name,
  label,
  help,
  error,
  required,
  dateHint,
  className,
  placeholder,
  ...props
}: TextProps) {
  const { id } = ids(name);
  const isDate = props.type === "date" || props.type === "datetime-local";
  const hintPlaceholder = props.type === "datetime-local" ? "dd/mm/aaaa hh:mm" : "dd/mm/aaaa";
  const initial =
    typeof props.defaultValue === "string"
      ? props.defaultValue
      : typeof props.value === "string"
        ? props.value
        : undefined;
  return (
    <FieldShell name={name} label={label} required={required} help={help} error={error}>
      <Input
        id={id}
        name={name}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, help, error)}
        placeholder={placeholder ?? (dateHint && isDate ? hintPlaceholder : undefined)}
        className={cn(inputClass, className)}
        {...props}
      />
      {dateHint && isDate ? <DateHint inputId={id} initial={initial} /> : null}
    </FieldShell>
  );
}

type TextareaProps = Omit<ComponentProps<"textarea">, "name" | "id"> & {
  name: string;
  label: ReactNode;
  help?: ReactNode;
  error?: string;
};

export function TextareaField({
  name,
  label,
  help,
  error,
  required,
  className,
  ...props
}: TextareaProps) {
  return (
    <FieldShell name={name} label={label} required={required} help={help} error={error}>
      <Textarea
        id={ids(name).id}
        name={name}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, help, error)}
        className={cn("text-base md:text-sm", className)}
        {...props}
      />
    </FieldShell>
  );
}

export type Option = { value: string; label: string };

// Opção vazia ("Selecione") em cinza de placeholder, com 4,5:1 (token --placeholder).
export const selectClass =
  "border-input bg-background text-foreground h-11 w-full rounded-lg border px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:h-9 md:text-sm [&:has(option[value='']:checked)]:text-placeholder";

type SelectProps = Omit<ComponentProps<"select">, "name" | "id"> & {
  name: string;
  label: ReactNode;
  help?: ReactNode;
  error?: string;
  options: readonly Option[];
  placeholder?: string | null;
};

export function SelectField({
  name,
  label,
  help,
  error,
  required,
  options,
  placeholder = "Selecione",
  className,
  ...props
}: SelectProps) {
  return (
    <FieldShell name={name} label={label} required={required} help={help} error={error}>
      <select
        id={ids(name).id}
        name={name}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, help, error)}
        className={cn(selectClass, className)}
        {...props}
      >
        {placeholder !== null ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

type CheckboxProps = {
  name: string;
  label: ReactNode;
  help?: ReactNode;
  error?: string;
  value?: string;
  defaultChecked?: boolean;
  required?: boolean;
  onChange?: ComponentProps<"input">["onChange"];
};

export function CheckboxField({
  name,
  label,
  help,
  error,
  value = "on",
  defaultChecked,
  required,
  onChange,
}: CheckboxProps) {
  const { id, helpId, errorId } = ids(name);
  const described = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="flex min-h-11 items-start gap-2 py-2 text-sm md:min-h-0 md:py-0"
      >
        <input
          id={id}
          type="checkbox"
          name={name}
          value={value}
          defaultChecked={defaultChecked}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          onChange={onChange}
          aria-describedby={described || undefined}
          className="accent-primary mt-0.5 size-4 shrink-0"
        />
        <span>
          {label}
          {required ? <RequiredMark /> : null}
        </span>
      </label>
      {help ? (
        <p id={helpId} className="text-muted-foreground pl-6 text-xs">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-destructive pl-6 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormMessage({
  status,
  message,
  missing,
  className,
}: {
  status: "idle" | "error" | "ok";
  message?: string;
  missing?: string[];
  className?: string;
}) {
  if (status === "idle" || !message) return null;
  return (
    <div
      role={status === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        status === "error"
          ? "border-destructive/30 bg-error-soft text-destructive"
          : "border-success/30 bg-success-soft text-success",
        className,
      )}
    >
      {missing?.length ? (
        <>
          <p className="font-medium">Antes de mover, preencha:</p>
          <ul className="mt-1 list-disc pl-5">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </>
      ) : (
        <p>{message}</p>
      )}
    </div>
  );
}
