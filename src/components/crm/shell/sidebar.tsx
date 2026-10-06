"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SIDEBAR_COOKIE } from "./modules";
import { NavItems } from "./nav-items";

// Sidebar do desktop (crm-design-system.md, seção 4.1; decisão D12): 240 px, ou trilho de 64 px
// quando o cookie `crm-sidebar=rail` está gravado. Client Component mínimo: só `usePathname` e o
// toggle, que grava o cookie (path /app, 1 ano) e chama `router.refresh()` para o layout reler.
// O estado local acompanha o clique na hora; sem localStorage, sem flash na hidratação.
export function Sidebar({
  collapsed: initialCollapsed,
  overdueCount,
  className,
}: {
  collapsed: boolean;
  overdueCount: number;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "rail" : "open"}; path=/app; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const toggleButton = (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={!collapsed}
      aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-120 hover:bg-background/60 hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {collapsed ? (
        <PanelLeftOpen className="size-[18px]" aria-hidden="true" />
      ) : (
        <PanelLeftClose className="size-[18px]" aria-hidden="true" />
      )}
      <span className={cn(collapsed && "sr-only")}>Recolher</span>
    </button>
  );

  return (
    <nav
      aria-label="Principal"
      data-collapsed={collapsed || undefined}
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-120 md:flex",
        collapsed ? "w-16" : "w-60",
        className,
      )}
    >
      <Link
        href="/app"
        aria-label="Prospekto CRM, ir para Hoje"
        className={cn(
          "flex h-14 shrink-0 flex-col justify-center rounded-lg leading-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          collapsed ? "mx-2 items-center" : "mx-4",
        )}
      >
        {collapsed ? (
          <span className="font-heading text-xl font-semibold text-foreground" aria-hidden="true">
            P
          </span>
        ) : (
          <>
            <span className="font-heading text-xl font-semibold text-foreground">Prospekto</span>
            <span className="crm-eyebrow mt-0.5 text-brand">CRM</span>
          </>
        )}
      </Link>
      <NavItems activeHref={pathname} collapsed={collapsed} overdueCount={overdueCount} />
      <div className="mt-auto p-2">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger render={toggleButton} />
            <TooltipContent side="right">Expandir menu</TooltipContent>
          </Tooltip>
        ) : (
          toggleButton
        )}
      </div>
    </nav>
  );
}
