"use client";

import { useEffect, useRef } from "react";
import type { LeadFormState } from "@/lib/validation/forms/state";

// Resumo de erros no topo do formulário, com foco após a submissão falhar (seção 5.1 e 7.6).
// Os erros por campo também aparecem sob cada campo (Field); aqui ficam os links para eles.
type Props = {
  state: LeadFormState;
  fieldLabels?: Record<string, string>;
};

export function ErrorSummary({ state, fieldLabels }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "error") ref.current?.focus();
  }, [state]);

  if (state.status !== "error") return null;
  const entries = Object.entries(state.fieldErrors ?? {});
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="form-error-title"
      className="border-error text-foreground flex flex-col gap-2 rounded-lg border-2 p-4"
    >
      <p id="form-error-title" className="text-error font-semibold">
        {state.message ?? "Não foi possível enviar o formulário."}
      </p>
      {entries.length ? (
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {entries.map(([name, message]) => (
            <li key={name}>
              <a href={`#campo-${name}`} className="underline underline-offset-4">
                {fieldLabels?.[name] ?? name}: {message}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
