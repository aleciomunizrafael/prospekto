"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { assignLeadOwnerAction } from "@/actions/crm-leads";
import { initialCrmActionState } from "@/lib/crm/action-state";
import { FormMessage, selectClass } from "./fields";
import { SubmitButton } from "./submit-button";

export function OwnerForm({
  leadId,
  ownerUserId,
  users,
}: {
  leadId: string;
  ownerUserId: string | null;
  users: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(assignLeadOwnerAction, initialCrmActionState);
  useEffect(() => {
    if (state.status === "ok") toast.success(state.message ?? "Salvo.");
  }, [state]);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <FormMessage status={state.status === "error" ? "error" : "idle"} message={state.message} />
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="f-ownerUserId">
          Responsável
        </label>
        <select
          id="f-ownerUserId"
          name="ownerUserId"
          defaultValue={ownerUserId ?? ""}
          className={selectClass}
        >
          <option value="">Sem responsável</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <SubmitButton variant="outline" size="default" pendingLabel="...">
          Atribuir
        </SubmitButton>
      </div>
    </form>
  );
}
