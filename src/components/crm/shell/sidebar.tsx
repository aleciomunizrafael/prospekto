"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SIDEBAR_COOKIE } from "./modules";
import { NavItems } from "./nav-items";
import { SidebarSearch } from "./sidebar-search";
import { SidebarUser } from "./sidebar-user";

// Sidebar do desktop (crm-design-system.md, seção 4.1; decisão D12; ADR-004, seção 6.1): 240 px,
// ou trilho de 64 px quando o cookie `crm-sidebar=rail` está gravado. De cima para baixo: o logo
// oficial (docs/design/marca.md: variante compacta de 28 px com o eyebrow "CRM"; no trilho só a
// marca vermelha), botão "Buscar…" (Ctrl K), os módulos, e no rodapé o bloco do usuário e "Recolher". Client
// Component mínimo: só `usePathname` e o toggle, que grava o cookie (path /app, 1 ano) e chama
// `router.refresh()` para o layout reler. O estado local acompanha o clique na hora; sem
// localStorage, sem flash na hidratação.
export function Sidebar({
  collapsed: initialCollapsed,
  overdueCount,
  userName,
  userEmail,
  className,
}: {
  collapsed: boolean;
  overdueCount: number;
  userName: string;
  userEmail: string;
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
        aria-label="Prospekto CRM, ir para o Painel"
        className={cn(
          "flex h-14 shrink-0 flex-col justify-center rounded-lg leading-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          collapsed ? "mx-2 items-center" : "mx-4",
        )}
      >
        {collapsed ? (
          <Logo variant="marca" className="h-7 w-auto" />
        ) : (
          <>
            {/* O texto do logo herda `text-foreground` (currentColor): cinza no claro, claro no escuro. */}
            <Logo variant="compacto" className="h-7 w-auto text-foreground" />
            <span className="crm-eyebrow mt-1 text-brand">CRM</span>
          </>
        )}
      </Link>
      <div className="px-2 pb-2">
        <SidebarSearch collapsed={collapsed} />
      </div>
      <NavItems activeHref={pathname} collapsed={collapsed} overdueCount={overdueCount} />
      <div className="mt-auto flex flex-col gap-1 p-2">
        <SidebarUser userName={userName} userEmail={userEmail} collapsed={collapsed} />
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
