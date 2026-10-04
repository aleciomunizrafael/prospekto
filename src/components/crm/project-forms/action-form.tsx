"use client";
// Formulário do CRM ligado a uma Server Action com useActionState: mostra a mensagem geral, os
// campos faltantes ("Para mover ... falta: ...") e o erro de cada campo pelo `name`. Campos nativos
// (input, select, textarea) com rótulo em português e alvo de toque de 44px. Sem dependência nova.
import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useId,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { idleState, type ActionState } from "@/lib/crm/form-state";
import { cn } from "@/lib/utils";

export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const FormStateContext = createContext<ActionState>(idleState);

export function useFieldError(name: string): string | undefined {
  const state = useContext(FormStateContext);
  return state.status === "error" ? state.fieldErrors?.[name] : undefined;
}

type ActionFormProps = {
  action: FormAction;
  children: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  onSuccess?: (state: Extract<ActionState, { status: "ok" }>) => void;
  // Mostra a mensagem de sucesso no próprio formulário (padrão: sim).
  showSuccess?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
};

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Salvando...",
  className,
  onSuccess,
  showSuccess = true,
  variant = "default",
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, idleState);
  useEffect(() => {
    if (state.status === "ok") onSuccess?.(state);
    // onSuccess é estável o bastante para o uso aqui (fechar diálogo); o estado muda a cada envio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <FormStateContext.Provider value={state}>
      <form action={formAction} className={cn("flex flex-col gap-4", className)} noValidate>
        {children}
        <ActionMessage state={state} showSuccess={showSuccess} />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending} variant={variant} className="h-11 px-5">
            {pending ? pendingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </FormStateContext.Provider>
  );
}

export function ActionMessage({
  state,
  showSuccess = true,
}: {
  state: ActionState;
  showSuccess?: boolean;
}) {
  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        <p className="font-medium">{state.message}</p>
        {state.missing?.length ? (
          <ul className="mt-1 list-disc pl-5">
            {state.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : null}
        {state.fieldErrors && !state.missing?.length ? (
          <ul className="mt-1 list-disc pl-5">
            {Object.entries(state.fieldErrors).map(([k, v]) => (
              <li key={k}>{v}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }
  if (state.status === "ok" && showSuccess && (state.message || state.warnings?.length)) {
    return (
      <div
        role="status"
        className="rounded-lg border border-emerald-600/30 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
      >
        {state.message ? <p className="font-medium">{state.message}</p> : null}
        {state.warnings?.length ? (
          <ul className="mt-1 list-disc pl-5">
            {state.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }
  return null;
}

export const controlClass =
  "border-input bg-background text-foreground min-h-11 w-full rounded-lg border px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm";

type ShellProps = {
  label: string;
  required?: boolean;
  help?: ReactNode;
  error?: string;
  id: string;
  className?: string;
  children: ReactNode;
};

function Shell({ label, required, help, error, id, className, children }: ShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span className="text-muted-foreground font-normal"> (obrigatório)</span>
        ) : null}
      </label>
      {help ? (
        <p id={`${id}-ajuda`} className="text-muted-foreground text-sm">
          {help}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-erro`} className="text-destructive text-sm font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type BaseFieldProps = {
  name: string;
  label: string;
  required?: boolean;
  help?: ReactNode;
  className?: string;
};

export function TextField({
  name,
  label,
  required,
  help,
  className,
  ...props
}: BaseFieldProps & Omit<ComponentProps<"input">, "name" | "id">) {
  const error = useFieldError(name);
  const id = useId();
  return (
    <Shell
      label={label}
      required={required}
      help={help}
      error={error}
      id={id}
      className={className}
    >
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={help ? `${id}-ajuda` : undefined}
        className={controlClass}
        {...props}
      />
    </Shell>
  );
}

// Valor em reais digitado em português (1.500.000,00).
export function MoneyField(props: BaseFieldProps & Omit<ComponentProps<"input">, "name" | "id">) {
  return <TextField inputMode="decimal" placeholder="0,00" {...props} />;
}

export function DateField(props: BaseFieldProps & Omit<ComponentProps<"input">, "name" | "id">) {
  return <TextField type="date" {...props} />;
}

export function TextareaField({
  name,
  label,
  required,
  help,
  className,
  ...props
}: BaseFieldProps & Omit<ComponentProps<"textarea">, "name" | "id">) {
  const error = useFieldError(name);
  const id = useId();
  return (
    <Shell
      label={label}
      required={required}
      help={help}
      error={error}
      id={id}
      className={className}
    >
      <textarea
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        className={cn(controlClass, "min-h-24")}
        rows={4}
        {...props}
      />
    </Shell>
  );
}

export type Option = { value: string; label: string };

export function SelectField({
  name,
  label,
  required,
  help,
  className,
  options,
  placeholder = "Selecione",
  ...props
}: BaseFieldProps & { options: Option[]; placeholder?: string } & Omit<
    ComponentProps<"select">,
    "name" | "id"
  >) {
  const error = useFieldError(name);
  const id = useId();
  return (
    <Shell
      label={label}
      required={required}
      help={help}
      error={error}
      id={id}
      className={className}
    >
      <select
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        className={controlClass}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Shell>
  );
}

export function CheckboxField({
  name,
  label,
  help,
  className,
  ...props
}: BaseFieldProps & Omit<ComponentProps<"input">, "name" | "id" | "type">) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input id={id} name={name} type="checkbox" className="mt-1 size-5" {...props} />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium">{label}</span>
        {help ? <span className="text-muted-foreground block">{help}</span> : null}
      </label>
    </div>
  );
}

export function HiddenField({ name, value }: { name: string; value: string | null | undefined }) {
  return <input type="hidden" name={name} value={value ?? ""} />;
}

// Lista "o que falta" exibida antes de um passo (botões que explicam o que falta).
export function Blockers({ items, intro }: { items: string[]; intro: string }) {
  if (!items.length) return null;
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      <p className="font-medium">{intro}</p>
      <ul className="mt-1 list-disc pl-5">
        {items.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}
