import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Duas colunas dos detalhes (crm-design-system.md, seção 5.2): principal + lateral fixa de 20rem
// no desktop; no celular a lateral vem depois (ou antes, com `mobileOrder="aside-first"`).
// `actionsMobile` recebe a ActionBarMobile.
export function DetailLayout({
  header,
  main,
  aside,
  asideLabel,
  actionsMobile,
  mobileOrder = "main-first",
  className,
}: {
  header: ReactNode;
  main: ReactNode;
  aside: ReactNode;
  asideLabel: string;
  actionsMobile?: ReactNode;
  mobileOrder?: "main-first" | "aside-first";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {header}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div
          className={cn(
            "flex min-w-0 flex-col gap-6",
            mobileOrder === "aside-first" && "order-2 lg:order-1",
          )}
        >
          {main}
        </div>
        <aside
          aria-label={asideLabel}
          className={cn(
            "flex min-w-0 flex-col gap-4 lg:sticky lg:top-20 lg:self-start",
            mobileOrder === "aside-first" && "order-1 lg:order-2",
          )}
        >
          {aside}
        </aside>
      </div>
      {actionsMobile}
    </div>
  );
}
