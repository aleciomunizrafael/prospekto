"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Botão de envio ligado ao <form> pai: mostra o rótulo de espera com o ícone girando
// (crm-design-system.md, seção 8: "Registrando…", "Movendo…"). `disabled` real, nunca só
// `pointer-events-none`, e `aria-describedby` para apontar o aviso que explica o bloqueio.
export function SubmitButton({
  children,
  pendingLabel = "Salvando...",
  variant = "default",
  size = "default",
  className,
  disabled,
  "aria-describedby": describedBy,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "xs" | "touch";
  className?: string;
  disabled?: boolean;
  "aria-describedby"?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending || disabled}
      aria-disabled={disabled || undefined}
      aria-describedby={describedBy}
      className={cn(className)}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
