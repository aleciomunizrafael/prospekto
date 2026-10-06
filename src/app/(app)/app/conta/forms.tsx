"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/actions/account";
import { FormMessage, TextField } from "@/components/crm/forms/fields";
import { SubmitButton } from "@/components/crm/forms/submit-button";
import { initialCrmActionState } from "@/lib/crm/action-state";

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialCrmActionState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      {state.status !== "ok" ? (
        <>
          <TextField
            name="currentPassword"
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            required
            error={state.fieldErrors?.currentPassword}
          />
          <TextField
            name="password"
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            error={state.fieldErrors?.password}
            help="Pelo menos 12 caracteres. Uma frase curta é mais fácil de lembrar e mais segura."
          />
          <TextField
            name="confirm"
            label="Repita a nova senha"
            type="password"
            autoComplete="new-password"
            required
            error={state.fieldErrors?.confirm}
          />
          <div>
            <SubmitButton pendingLabel="Salvando...">Trocar senha</SubmitButton>
          </div>
        </>
      ) : null}
    </form>
  );
}
