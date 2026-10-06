"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { changePasswordAction } from "@/actions/account";
import { describedBy, FieldShell, FormMessage, ids } from "@/components/crm/forms/fields";
import { SubmitButton } from "@/components/crm/forms/submit-button";
import { Callout } from "@/components/crm/ui/callout";
import { FormActions } from "@/components/crm/ui/form-actions";
import { FormSection } from "@/components/crm/ui/form-section";
import { Input } from "@/components/ui/input";
import { initialCrmActionState } from "@/lib/crm/action-state";

const ERROR_ID = "senha-erro";

// Campo de senha com "mostrar/ocultar" (crm-design-system.md, seção 7.11): o botão alterna o
// `type` e anuncia o estado por `aria-pressed`; o rótulo fica fixo. O mesmo campo existe em
// (auth)/redefinir-senha/forms.tsx; na Fase 3 vale subir para forms/fields.tsx.
function PasswordField({
  name,
  label,
  help,
  error,
  autoComplete,
  minLength,
}: {
  name: string;
  label: ReactNode;
  help?: ReactNode;
  error?: string;
  autoComplete: "current-password" | "new-password";
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
          autoComplete={autoComplete}
          required
          aria-required="true"
          minLength={minLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(name, help, error)}
          className="h-11 pr-11 md:h-9"
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

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialCrmActionState);
  const formRef = useRef<HTMLFormElement>(null);

  // Erro: foco no primeiro campo inválido; sem campo (limite de tentativas, sessão antiga), no
  // próprio aviso. `state` é um objeto novo a cada resposta, então repete a cada tentativa.
  useEffect(() => {
    if (state.status !== "error") return;
    const invalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    (invalid ?? document.getElementById(ERROR_ID))?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={action} noValidate>
      <FormSection title="Trocar senha">
        {state.status === "error" && state.message ? (
          <Callout tone="danger" role="alert" id={ERROR_ID} tabIndex={-1}>
            {state.message}
          </Callout>
        ) : null}
        {state.status === "ok" ? (
          <FormMessage status="ok" message={state.message} />
        ) : (
          <>
            <Callout tone="info" role="note">
              Ao trocar a senha, a sua conta é desconectada dos outros aparelhos e navegadores em
              que estiver aberta. Este navegador continua conectado.
            </Callout>
            <PasswordField
              name="currentPassword"
              label="Senha atual"
              autoComplete="current-password"
              error={state.fieldErrors?.currentPassword}
            />
            <PasswordField
              name="password"
              label="Nova senha"
              autoComplete="new-password"
              minLength={12}
              help="Pelo menos 12 caracteres. Uma frase curta é mais fácil de lembrar e mais segura."
              error={state.fieldErrors?.password}
            />
            <PasswordField
              name="confirm"
              label="Repita a nova senha"
              autoComplete="new-password"
              error={state.fieldErrors?.confirm}
            />
            <FormActions>
              <SubmitButton pendingLabel="Trocando…">Trocar senha</SubmitButton>
            </FormActions>
          </>
        )}
      </FormSection>
    </form>
  );
}
