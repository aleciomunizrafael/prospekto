"use client";

import { useId, useRef, useState, useTransition } from "react";
import { initialCrmActionState, type CrmActionState } from "@/lib/crm/action-state";
import { CRM_TIME_ZONE } from "@/lib/crm/format";
import { cn } from "@/lib/utils";
import { controlClass } from "../project-forms/action-form";

// Campo que salva ao perder o foco (ADR-004, 6.9 e 6.12; plano, P8): textarea ou input ligado a
// uma Server Action `(prev, formData) => CrmActionState`; grava só quando o valor mudou, nunca
// por tecla; o estado fica em texto num role="status" ao lado do rótulo: "Salvo às 14:32",
// "Salvando…", "Não foi possível salvar; tente de novo". Sem concorrência otimista: o último a
// gravar vence (risco registrado no ADR-004, seção 10). Usado nas notas da organização (frente D)
// e na abertura e "Sobre a empresa" do item de prospecção (frente C).
export type AutosaveAction = (prev: CrmActionState, formData: FormData) => Promise<CrmActionState>;

const TIME = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: CRM_TIME_ZONE,
});

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error"; message: string };

export function describeSaveState(state: SaveState): string {
  switch (state.kind) {
    case "idle":
      return "";
    case "saving":
      return "Salvando…";
    case "saved":
      return `Salvo às ${TIME.format(state.at)}`;
    case "error":
      return state.message;
  }
}

export function AutosaveField({
  name,
  label,
  defaultValue,
  action,
  hidden = {},
  multiline = false,
  rows = 4,
  placeholder,
  help,
  maxLength,
  className,
}: {
  name: string;
  label: string;
  defaultValue: string | null | undefined;
  action: AutosaveAction;
  // Pares nome/valor enviados junto (orgId, itemId, field…).
  hidden?: Record<string, string>;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  help?: string;
  maxLength?: number;
  className?: string;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const [pending, startTransition] = useTransition();
  // Último valor confirmado pelo servidor: só uma mudança em relação a ele dispara o salvamento.
  const savedRef = useRef(defaultValue ?? "");

  function save() {
    const next = value;
    if (next === savedRef.current) return;
    setState({ kind: "saving" });
    startTransition(async () => {
      const fd = new FormData();
      for (const [key, v] of Object.entries(hidden)) fd.set(key, v);
      fd.set(name, next);
      try {
        const result = await action(initialCrmActionState, fd);
        if (result.status === "ok") {
          savedRef.current = next;
          setState({ kind: "saved", at: new Date() });
        } else {
          setState({
            kind: "error",
            message: result.message ?? "Não foi possível salvar; tente de novo",
          });
        }
      } catch {
        setState({ kind: "error", message: "Não foi possível salvar; tente de novo" });
      }
    });
  }

  const statusText = describeSaveState(pending ? { kind: "saving" } : state);
  const common = {
    id,
    name,
    value,
    placeholder,
    maxLength,
    "aria-describedby": help ? `${id}-ajuda` : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValue(event.target.value),
    onBlur: save,
  };

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span
          role="status"
          aria-live="polite"
          className={cn(
            "crm-meta shrink-0",
            state.kind === "error" && !pending && "font-medium text-destructive",
          )}
        >
          {statusText}
        </span>
      </div>
      {help ? (
        <p id={`${id}-ajuda`} className="text-sm text-muted-foreground">
          {help}
        </p>
      ) : null}
      {multiline ? (
        <textarea {...common} rows={rows} className={cn(controlClass, "field-sizing-content")} />
      ) : (
        <input {...common} type="text" className={controlClass} />
      )}
    </div>
  );
}
