"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { assignLeadOwnerAction } from "@/actions/crm-leads";
import { initialCrmActionState } from "@/lib/crm/action-state";
import { cn } from "@/lib/utils";
import { FormMessage, selectClass } from "./fields";
import { SubmitButton } from "./submit-button";

// "Responsável" do Resumo do lead (crm-design-system.md, seção 7.4): um <select> que envia no
// `change`; o botão "Atribuir" só aparece sem JavaScript (variante `scripting:hidden`).
function Saving() {
  const { pending } = useFormStatus();
  return (
    <span aria-live="polite" className="crm-meta inline-flex items-center gap-1">
      {pending ? (
        <>
          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          Salvando…
        </>
      ) : null}
    </span>
  );
}

export function OwnerForm({
  leadId,
  ownerUserId,
  users,
  className,
}: {
  leadId: string;
  ownerUserId: string | null;
  users: { id: string; name: string }[];
  className?: string;
}) {
  const [state, action] = useActionState(assignLeadOwnerAction, initialCrmActionState);
  useEffect(() => {
    if (state.status === "ok") toast.success(state.message ?? "Responsável atualizado.");
  }, [state]);
  return (
    <form action={action} className={cn("flex flex-col gap-2", className)}>
      <input type="hidden" name="leadId" value={leadId} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="f-ownerUserId">
          Responsável
        </label>
        <select
          id="f-ownerUserId"
          name="ownerUserId"
          defaultValue={ownerUserId ?? ""}
          className={cn(selectClass, "w-auto min-w-0 flex-1")}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">Sem responsável</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <SubmitButton
          variant="outline"
          size="sm"
          pendingLabel="Salvando…"
          className="scripting:hidden"
        >
          Atribuir
        </SubmitButton>
        <Saving />
      </div>
      <FormMessage status={state.status === "error" ? "error" : "idle"} message={state.message} />
    </form>
  );
}
