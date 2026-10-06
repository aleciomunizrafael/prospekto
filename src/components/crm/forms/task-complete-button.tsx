"use client";

import { Check } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { completeTaskAction } from "@/actions/crm-leads";
import { initialCrmActionState } from "@/lib/crm/action-state";
import { cn } from "@/lib/utils";
import { SubmitButton } from "./submit-button";

// "Concluir" de uma tarefa (Hoje, Timeline): um formulário mínimo com a Server Action existente.
// `size="touch"` no celular; `relative z-10` para ficar acima do link da linha (decisão D10).
export function TaskCompleteButton({
  activityId,
  size = "sm",
  label = "Concluir",
  className,
}: {
  activityId: string;
  size?: "sm" | "touch";
  label?: string;
  className?: string;
}) {
  const [state, action] = useActionState(completeTaskAction, initialCrmActionState);
  useEffect(() => {
    if (state.status === "ok") toast.success(state.message ?? "Tarefa concluída.");
    if (state.status === "error") toast.error(state.message ?? "Não foi possível concluir.");
  }, [state]);
  return (
    <form action={action} className={cn("relative z-10 inline-flex", className)}>
      <input type="hidden" name="activityId" value={activityId} />
      <SubmitButton variant="outline" size={size} pendingLabel="Concluindo...">
        <Check aria-hidden="true" />
        {label}
      </SubmitButton>
    </form>
  );
}
