"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, resetPasswordAction } from "@/actions/auth";
import { FormMessage, TextField } from "@/components/crm/forms/fields";
import { SubmitButton } from "@/components/crm/forms/submit-button";
import { initialCrmActionState } from "@/lib/crm/action-state";

export function RequestResetForm() {
  const [state, action] = useActionState(requestPasswordResetAction, initialCrmActionState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      {state.status !== "ok" ? (
        <>
          <TextField
            name="email"
            label="E-mail da sua conta"
            type="email"
            autoComplete="email"
            required
            error={state.fieldErrors?.email}
          />
          <div>
            <SubmitButton pendingLabel="Enviando...">Enviar link</SubmitButton>
          </div>
        </>
      ) : null}
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initialCrmActionState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormMessage status={state.status} message={state.message} />
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
        <SubmitButton pendingLabel="Salvando...">Definir nova senha</SubmitButton>
      </div>
    </form>
  );
}
