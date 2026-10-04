import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Primitivos de formulário do CRM: rótulo, ajuda e erro ligados por aria-describedby; erro
// sempre em texto. Sem hooks, para servir a componentes de servidor e de cliente.
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
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-muted-foreground font-normal"> (obrigatório)</span>
        ) : null}
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

type TextProps = Omit<ComponentProps<"input">, "name" | "id"> & {
  name: string;
  label: ReactNode;
  help?: ReactNode;
  error?: string;
};

export function TextField({ name, label, help, error, required, ...props }: TextProps) {
  return (
    <FieldShell name={name} label={label} required={required} help={help} error={error}>
      <Input
        id={ids(name).id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, help, error)}
        {...props}
      />
    </FieldShell>
  );
}

type TextareaProps = Omit<ComponentProps<"textarea">, "name" | "id"> & {
  name: string;
  label: ReactNode;
  help?: ReactNode;
  error?: string;
};

export function TextareaField({ name, label, help, error, required, ...props }: TextareaProps) {
  return (
    <FieldShell name={name} label={label} required={required} help={help} error={error}>
      <Textarea
        id={ids(name).id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, help, error)}
        {...props}
      />
    </FieldShell>
  );
}

export type Option = { value: string; label: string };

export const selectClass =
  "border-input bg-background text-foreground h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

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
  onChange?: ComponentProps<"input">["onChange"];
};

export function CheckboxField({
  name,
  label,
  help,
  error,
  value = "on",
  defaultChecked,
  onChange,
}: CheckboxProps) {
  const { id, helpId, errorId } = ids(name);
  const described = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex items-start gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          name={name}
          value={value}
          defaultChecked={defaultChecked}
          onChange={onChange}
          aria-describedby={described || undefined}
          className="accent-primary mt-0.5 size-4 shrink-0"
        />
        <span>{label}</span>
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
}: {
  status: "idle" | "error" | "ok";
  message?: string;
  missing?: string[];
}) {
  if (status === "idle" || !message) return null;
  return (
    <div
      role={status === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        status === "error"
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : "border-emerald-300 bg-emerald-50 text-emerald-900",
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
