"use client";
// Formulário do CRM ligado a uma Server Action com useActionState: mostra a mensagem geral, os
// campos faltantes ("Para mover ... falta: ...") e o erro de cada campo pelo `name`. Campos nativos
// (input, select, textarea) com rótulo em português, asterisco + aria-required nos obrigatórios e
// alvo de toque de 44px. Sem dependência nova.
import { Circle, Loader2 } from "lucide-react";
import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useState,
  type ComponentProps,
  type FormEventHandler,
  type ReactNode,
  type Ref,
} from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { idleState, type ActionState } from "@/lib/crm/form-state";
import { cn } from "@/lib/utils";
import { DateHint } from "../ui/date-hint";

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
  // Botão de envio desabilitado de verdade (bloqueio por regra), com o id do aviso que explica.
  submitDisabled?: boolean;
  submitDescribedBy?: string;
  onChange?: FormEventHandler<HTMLFormElement>;
  // Botão secundário (ex.: "Cancelar" que fecha o diálogo) à esquerda do envio.
  secondaryAction?: ReactNode;
  // "dialog": rodapé fixo em surface-2 (DialogFooter); "plain": só a linha de botões; "none": sem
  // rodapé (o chamador põe o próprio botão de envio, ex.: FormActions do "Novo projeto").
  footer?: "plain" | "dialog" | "none";
  formRef?: Ref<HTMLFormElement>;
  id?: string;
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
  submitDisabled,
  submitDescribedBy,
  onChange,
  secondaryAction,
  footer = "plain",
  formRef,
  id,
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, idleState);
  // O <form> montado, em estado (não em ref) para poder ser lido na renderização; `formRef` do
  // chamador recebe o mesmo elemento.
  const [formEl, setFormEl] = useState<HTMLFormElement | null>(null);
  useImperativeHandle(formRef, () => formEl as HTMLFormElement, [formEl]);
  useEffect(() => {
    if (state.status === "ok") onSuccess?.(state);
    // onSuccess é estável o bastante para o uso aqui (fechar diálogo); o estado muda a cada envio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  // O resumo de erros não repete o que já aparece sob um campo: só entram as chaves sem controle
  // com aquele `name` no formulário (o estado de erro só existe depois do envio, com o <form> já
  // montado).
  const summaryErrors =
    state.status === "error" && state.fieldErrors
      ? Object.fromEntries(
          Object.entries(state.fieldErrors).filter(
            ([key]) => !formEl || !formEl.elements.namedItem(key),
          ),
        )
      : undefined;
  const submit = (
    <Button
      type="submit"
      disabled={pending || submitDisabled}
      aria-disabled={submitDisabled || undefined}
      aria-describedby={submitDescribedBy}
      variant={variant}
      size="touch"
      className="md:h-9"
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        submitLabel
      )}
    </Button>
  );
  return (
    <FormStateContext.Provider value={state}>
      <form
        id={id}
        ref={setFormEl}
        action={formAction}
        onChange={onChange}
        className={cn("flex flex-col gap-4", className)}
        noValidate
      >
        {children}
        <ActionMessage state={state} showSuccess={showSuccess} summaryErrors={summaryErrors} />
        {footer === "dialog" ? (
          <DialogFooter>
            {secondaryAction}
            {submit}
          </DialogFooter>
        ) : footer === "plain" ? (
          <div className="flex items-center justify-end gap-2">
            {secondaryAction}
            {submit}
          </div>
        ) : null}
      </form>
    </FormStateContext.Provider>
  );
}

export function ActionMessage({
  state,
  showSuccess = true,
  summaryErrors,
}: {
  state: ActionState;
  showSuccess?: boolean;
  // Erros de campo a listar no resumo (padrão: todos); o ActionForm passa só os sem campo.
  summaryErrors?: Record<string, string>;
}) {
  if (state.status === "error") {
    const listed = summaryErrors ?? state.fieldErrors;
    return (
      <div
        role="alert"
        className="min-w-0 rounded-lg border border-destructive/30 bg-error-soft px-3 py-2 text-sm break-words text-destructive"
      >
        <p className="font-medium">{state.message}</p>
        {state.missing?.length ? (
          <ul className="mt-1 list-disc pl-5">
            {state.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : null}
        {listed && Object.keys(listed).length > 0 && !state.missing?.length ? (
          <ul className="mt-1 list-disc pl-5">
            {Object.entries(listed).map(([k, v]) => (
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
        className="rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm text-success"
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
  "border-input bg-background text-foreground min-h-11 w-full rounded-lg border px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:min-h-9 md:py-1.5 md:text-sm";

// Opção vazia ("Selecione") em cinza de placeholder, com 4,5:1 (token --placeholder).
const selectControlClass = `${controlClass} [&:has(option[value='']:checked)]:text-placeholder`;

type ShellProps = {
  label: string;
  required?: boolean;
  help?: ReactNode;
  error?: string;
  id: string;
  className?: string;
  children: ReactNode;
  after?: ReactNode;
};

function Shell({ label, required, help, error, id, className, children, after }: ShellProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {help ? (
        <p id={`${id}-ajuda`} className="text-muted-foreground text-sm">
          {help}
        </p>
      ) : null}
      {children}
      {after}
      {error ? (
        <p
          id={`${id}-erro`}
          role="alert"
          className="text-destructive text-sm font-medium break-words"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, help: unknown, error: unknown): string | undefined {
  const list = [help ? `${id}-ajuda` : null, error ? `${id}-erro` : null].filter(Boolean);
  return list.length ? list.join(" ") : undefined;
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
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        className={controlClass}
        {...props}
      />
    </Shell>
  );
}

// Campo com prefixo ("R$") ou sufixo ("%") fixo dentro da caixa.
function AffixField({
  name,
  label,
  required,
  help,
  className,
  prefix,
  suffix,
  ...props
}: BaseFieldProps & { prefix?: string; suffix?: string } & Omit<
    ComponentProps<"input">,
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
      <div className="relative">
        {prefix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground"
          >
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          name={name}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, help, error)}
          className={cn(controlClass, "tabular-nums", prefix && "pl-9", suffix && "pr-8")}
          {...props}
        />
        {suffix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground"
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </Shell>
  );
}

// Valor em reais digitado em português (1.500.000,00), com "R$" fixo à esquerda.
export function MoneyField(props: BaseFieldProps & Omit<ComponentProps<"input">, "name" | "id">) {
  return <AffixField prefix="R$" inputMode="decimal" placeholder="0,00" {...props} />;
}

// Percentual com "%" fixo à direita.
export function PercentField(props: BaseFieldProps & Omit<ComponentProps<"input">, "name" | "id">) {
  return <AffixField suffix="%" inputMode="decimal" placeholder="0" {...props} />;
}

export function DateField({
  dateHint = true,
  ...props
}: BaseFieldProps & { dateHint?: boolean } & Omit<ComponentProps<"input">, "name" | "id">) {
  return <DateInputField type="date" dateHint={dateHint} {...props} />;
}

export function DateTimeField({
  dateHint = true,
  ...props
}: BaseFieldProps & { dateHint?: boolean } & Omit<ComponentProps<"input">, "name" | "id">) {
  return <DateInputField type="datetime-local" dateHint={dateHint} {...props} />;
}

function DateInputField({
  name,
  label,
  required,
  help,
  className,
  dateHint,
  type,
  ...props
}: BaseFieldProps & { dateHint?: boolean } & Omit<ComponentProps<"input">, "name" | "id">) {
  const error = useFieldError(name);
  const id = useId();
  const initial =
    typeof props.defaultValue === "string"
      ? props.defaultValue
      : typeof props.value === "string"
        ? props.value
        : undefined;
  return (
    <Shell
      label={label}
      required={required}
      help={help}
      error={error}
      id={id}
      className={className}
      after={dateHint ? <DateHint inputId={id} initial={initial} /> : null}
    >
      <input
        id={id}
        name={name}
        type={type}
        placeholder={type === "datetime-local" ? "dd/mm/aaaa hh:mm" : "dd/mm/aaaa"}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        className={controlClass}
        {...props}
      />
    </Shell>
  );
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
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
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
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        className={selectControlClass}
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
  required,
  ...props
}: BaseFieldProps & Omit<ComponentProps<"input">, "name" | "id" | "type">) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        name={name}
        type="checkbox"
        required={required}
        aria-required={required || undefined}
        className="accent-primary mt-1 size-5"
        {...props}
      />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium">
          {label}
          {required ? (
            <span aria-hidden="true" className="text-destructive">
              {" "}
              *
            </span>
          ) : null}
        </span>
        {help ? <span className="text-muted-foreground block">{help}</span> : null}
      </label>
    </div>
  );
}

export function HiddenField({ name, value }: { name: string; value: string | null | undefined }) {
  return <input type="hidden" name={name} value={value ?? ""} />;
}

// "O que falta" antes de um passo, como checklist em âmbar (crm-design-system.md, seção 7.12):
// cada item com um círculo vazio; `id` serve ao aria-describedby do botão bloqueado.
export function Blockers({
  items,
  intro,
  id,
  className,
}: {
  items: string[];
  intro: string;
  id?: string;
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <div
      id={id}
      role="alert"
      className={cn(
        "rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning",
        className,
      )}
    >
      <p className="font-medium">{intro}</p>
      <ul className="mt-1 flex flex-col gap-1">
        {items.map((m) => (
          <li key={m} className="flex items-start gap-2">
            <Circle className="mt-1 size-3 shrink-0" aria-hidden="true" />
            <span>{m}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
