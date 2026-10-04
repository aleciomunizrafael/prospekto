"use client";

import type { ReactNode } from "react";
import { siteButtonClass } from "@/components/analytics/track-link";
import { cn } from "@/lib/utils";
import { useLeadForm } from "./lead-form";

export function SubmitButton({
  children,
  pendingLabel = "Enviando...",
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useLeadForm();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending || undefined}
      className={cn(siteButtonClass("primary"), "self-start", className)}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
