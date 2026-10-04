"use client";

import type { ReactNode } from "react";
import { FieldShell } from "@/components/site/form";
import { describedBy, fieldIds } from "@/components/site/form/field";
import { formatBRL, parseCurrencyBR } from "@/lib/simulator";
import { cn } from "@/lib/utils";

// Campos controlados das telas 1 e 2 do simulador (o cálculo roda no cliente, sem Server Action).
// Mesma moldura dos formulários do site (FieldShell): rótulo, "(obrigatório)", ajuda e erro ligados
// por aria-describedby; ids `campo-<name>` para o resumo de erros.
export const controlClass =
  "border-input bg-background text-foreground touch-target w-full rounded-lg border px-3 py-2 text-base outline-none focus-visible:border-ring aria-invalid:border-error aria-invalid:border-2";

export type Option = { value: string; label: string; description?: string };

type RadioProps = {
  name: string;
  label: string;
  help?: ReactNode;
  required?: boolean;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function ControlledRadioGroup({
  name,
  label,
  help,
  required,
  options,
  value,
  onChange,
  error,
}: RadioProps) {
  const { id } = fieldIds(name);
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
        aria-describedby={describedBy(name, Boolean(help), Boolean(error))}
        aria-invalid={error ? true : undefined}
        className="flex flex-col gap-2"
      >
        {options.map((o, index) => {
          // A primeira opção recebe o id do campo, destino do link do resumo de erros.
          const optionId = index === 0 ? id : `${id}-${o.value}`;
          return (
            <label key={o.value} htmlFor={optionId} className="touch-target flex items-start gap-3">
              <input
                id={optionId}
                type="radio"
                name={name}
                value={o.value}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
                className="accent-primary mt-1 size-5 shrink-0"
              />
              <span>
                {o.label}
                {o.description ? (
                  <span className="text-muted-foreground block text-[14px]">{o.description}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </FieldShell>
  );
}

type SelectProps = {
  name: string;
  label: string;
  help?: ReactNode;
  required?: boolean;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
};

export function ControlledSelect({
  name,
  label,
  help,
  required,
  options,
  value,
  onChange,
  error,
  placeholder = "Selecione",
}: SelectProps) {
  const { id } = fieldIds(name);
  return (
    <FieldShell name={name} label={label} required={required} help={help} error={error}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, Boolean(help), Boolean(error))}
        className={controlClass}
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

type CheckboxProps = {
  name: string;
  label: ReactNode;
  help?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function ControlledCheckbox({ name, label, help, checked, onChange }: CheckboxProps) {
  const { id, helpId } = fieldIds(name);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="touch-target flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={help ? helpId : undefined}
          className="accent-primary mt-1 size-5 shrink-0"
        />
        <span>{label}</span>
      </label>
      {help ? (
        <p id={helpId} className="text-muted-foreground pl-8 text-[15px]">
          {help}
        </p>
      ) : null}
    </div>
  );
}

// Valor de moeda no formato pt-BR, sem o símbolo ("1.234,56"); vazio quando não é número.
export function formatCurrencyInput(text: string): string {
  const value = parseCurrencyBR(text);
  if (value === null) return text;
  return formatBRL(value).replace(/^R\$\s*/, "");
}

type CurrencyProps = {
  name: string;
  label: string;
  help?: ReactNode;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  size?: "large" | "normal";
  autoFocus?: boolean;
};

// Campo de moeda pt-BR: aceita "50000", "50.000,00" ou "R$ 50.000"; formata ao sair do campo.
export function CurrencyInput({
  name,
  label,
  help,
  required,
  value,
  onChange,
  error,
  placeholder = "0,00",
  size = "normal",
  autoFocus,
}: CurrencyProps) {
  const { id } = fieldIds(name);
  return (
    <FieldShell name={name} label={label} required={required} help={help} error={error}>
      <div className="relative">
        <span
          aria-hidden="true"
          className={cn(
            "text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2",
            size === "large" && "text-xl",
          )}
        >
          R$
        </span>
        <input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => onChange(formatCurrencyInput(event.target.value))}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(name, Boolean(help), Boolean(error))}
          className={cn(
            controlClass,
            "tabular pl-11",
            size === "large" && "py-3 text-2xl font-semibold md:text-3xl",
          )}
        />
      </div>
    </FieldShell>
  );
}

// Texto de ajuda expansível (base_pj e afins), com aria-expanded nativo do <details>.
export function HelpDetails({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="text-[15px]">
      <summary className="text-primary touch-target cursor-pointer underline underline-offset-4">
        {summary}
      </summary>
      <div className="text-muted-foreground mt-2 flex flex-col gap-2 leading-snug">{children}</div>
    </details>
  );
}
