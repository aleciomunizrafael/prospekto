"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { completeTaskAction } from "@/actions/crm-leads";
import { initialCrmActionState } from "@/lib/crm/action-state";
import { SubmitButton } from "./submit-button";

export function TaskCompleteButton({ activityId }: { activityId: string }) {
  const [state, action] = useActionState(completeTaskAction, initialCrmActionState);
  useEffect(() => {
    if (state.status === "ok") toast.success(state.message ?? "Tarefa concluída.");
    if (state.status === "error") toast.error(state.message ?? "Não foi possível concluir.");
  }, [state]);
  return (
    <form action={action}>
      <input type="hidden" name="activityId" value={activityId} />
      <SubmitButton variant="outline" size="xs" pendingLabel="...">
        Concluir
      </SubmitButton>
    </form>
  );
}
