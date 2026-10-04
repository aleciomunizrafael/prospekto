"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonVariants } from "@/components/ui/button";
import { currentPath, track, type AnalyticsEvent, type AnalyticsProps } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "link";

// Classes dos botões do site: alvo de toque de 44px e texto do corpo (seção 7.6).
export function siteButtonClass(variant: Variant = "primary", className?: string): string {
  if (variant === "link") return cn("text-primary underline underline-offset-4", className);
  return cn(
    buttonVariants({ variant: variant === "primary" ? "default" : "outline", size: "lg" }),
    "touch-target h-auto px-5 py-3 text-base whitespace-normal",
    className,
  );
}

// Link interno de CTA: dispara cta_click com cta_id e caminho (estrutura-e-copy.md, seção 9.2).
type CtaLinkProps = Omit<ComponentProps<typeof Link>, "onClick"> & {
  ctaId: string;
  variant?: Variant;
};

export function CtaLink({
  ctaId,
  variant = "primary",
  className,
  children,
  ...props
}: CtaLinkProps) {
  return (
    <Link
      {...props}
      className={siteButtonClass(variant, className)}
      onClick={() => track("cta_click", { cta_id: ctaId, path: currentPath() })}
    >
      {children}
    </Link>
  );
}

// Link externo ou mailto/tel com evento próprio (email_click, phone_click, outbound_click).
type TrackLinkProps = Omit<ComponentProps<"a">, "onClick"> & {
  event: AnalyticsEvent;
  eventProps?: AnalyticsProps;
};

export function TrackLink({ event, eventProps, children, ...props }: TrackLinkProps) {
  return (
    <a {...props} onClick={() => track(event, { ...eventProps, path: currentPath() })}>
      {children}
    </a>
  );
}
