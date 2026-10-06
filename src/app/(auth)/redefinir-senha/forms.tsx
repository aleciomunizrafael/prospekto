"use client";

import { Eye, EyeOff, MailCheck } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { requestPasswordResetAction, resetPasswordAction } from "@/actions/auth";
import { describedBy, FieldShell, ids, TextField } from "@/components/crm/forms/fields";
import { SubmitButton } from "@/components/crm/forms/submit-button";
import { Callout } from "@/components/crm/ui/callout";
import { Input } from "@/components/ui/input";
import { initialCrmActionState, type CrmActionState } from "@/lib/crm/action-state";

// Erro da ação: foco no primeiro campo inválido ou, sem campo, no próprio aviso (Callout com
// tabIndex -1). `state` é um objeto novo a cada resposta, então repete a cada tentativa.
function useFocusOnError(state: CrmActionState, errorId: string) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status !== "error") return;
    const invalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    (invalid ?? document.getElementById(errorId))?.focus();
  }, [state, errorId]);
  return formRef;
}

function ErrorCallout({ state, id }: { state: CrmActionState; id: string }) {
  if (state.status !== "error" || !state.message) return null;
  return (
    <Callout tone="danger" role="alert" id={id} tabIndex={-1}>
      {state.message}
    </Callout>
  );
}

// Campo de senha com "mostrar/ocultar" (crm-design-system.md, seção 7.1): o botão alterna o
// `type` e anuncia o estado por `aria-pressed`; o rótulo fica fixo. O mesmo campo existe em
// (app)/app/conta/forms.tsx; na Fase 3 vale subir para forms/fields.tsx.
function PasswordField({
  name,
  label,
  help,
  error,
  minLength,
}: {
  name: string;
  label: ReactNode;
  help?: ReactNode;
  error?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  const { id } = ids(name);
  return (
    <FieldShell name={name} label={label} required help={help} error={error}>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          required
          aria-required="true"
          minLength={minLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(name, help, error)}
          className="h-11 pr-11"
        />
        <button
          type="button"
          aria-pressed={visible}
          aria-label="Mostrar senha"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground transition-colors duration-120 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </FieldShell>
  );
}

const REQUEST_ERROR_ID = "pedido-erro";
const RESET_ERROR_ID = "nova-senha-erro";

export function RequestResetForm() {
  const [state, action] = useActionState(requestPasswordResetAction, initialCrmActionState);
  const formRef = useFocusOnError(state, REQUEST_ERROR_ID);
  // Pedido feito: a confirmação substitui o formulário (a resposta é a mesma exista ou não a
  // conta, por isso não há "tentar de novo" aqui; o link "Voltar para entrar" fica na página).
  if (state.status === "ok") {
    return (
      <Callout tone="success" role="status" icon={MailCheck} title="Pedido enviado">
        {state.message}
      </Callout>
    );
  }
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4" noValidate>
      <ErrorCallout state={state} id={REQUEST_ERROR_ID} />
      <TextField
        name="email"
        label="E-mail da sua conta"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={state.fieldErrors?.email}
        className="md:h-11"
      />
      <SubmitButton size="touch" className="w-full" pendingLabel="Enviando…">
        Enviar link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initialCrmActionState);
  const formRef = useFocusOnError(state, RESET_ERROR_ID);
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <ErrorCallout state={state} id={RESET_ERROR_ID} />
      <PasswordField
        name="password"
        label="Nova senha"
        minLength={12}
        error={state.fieldErrors?.password}
        help="Pelo menos 12 caracteres. Uma frase curta é mais fácil de lembrar e mais segura."
      />
      <PasswordField
        name="confirm"
        label="Repita a nova senha"
        error={state.fieldErrors?.confirm}
      />
      <SubmitButton size="touch" className="w-full" pendingLabel="Salvando…">
        Definir nova senha
      </SubmitButton>
    </form>
  );
}
