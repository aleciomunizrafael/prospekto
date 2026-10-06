import {
  Building2,
  Clapperboard,
  Download,
  HandCoins,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MODULES, isActivePath, type CrmModule } from "./modules";

// Lista de itens da sidebar (crm-design-system.md, seção 4.1). Componente puro, sem "use client":
// recebe o caminho ativo e o estado recolhido da Sidebar e é testado com renderToString
// (tests/shell-nav.test.ts, decisão D13). Item de 40 px, ícone 18 px, ativo com fundo branco e
// barra de 3 px em azul-profundo; o contador de "Hoje" soma próximas ações e tarefas vencidas.
export type NavItem = CrmModule & { icon: LucideIcon; separatorBefore?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { ...MODULES.hoje, icon: Sun },
  { ...MODULES.leads, icon: Users },
  { ...MODULES.organizacoes, icon: Building2 },
  { ...MODULES.projetos, icon: Clapperboard },
  { ...MODULES.aportes, icon: HandCoins },
  { ...MODULES.exportar, icon: Download, separatorBefore: true },
];

export function overdueLabel(count: number): string {
  return count === 1 ? "1 item vencido" : `${count} itens vencidos`;
}

export function NavItems({
  items = NAV_ITEMS,
  activeHref,
  collapsed,
  overdueCount,
  className,
}: {
  items?: NavItem[];
  activeHref: string;
  collapsed: boolean;
  overdueCount: number;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col gap-0.5 px-2", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(item.href, activeHref, item.exact);
        const count = item.href === MODULES.hoje.href ? overdueCount : 0;
        const link = (
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-120",
              active
                ? "bg-background text-foreground before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-primary"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden="true" />
            <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
            {count > 0 ? (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    "rounded-md bg-primary-soft text-primary tabular-nums",
                    collapsed
                      ? "absolute top-1 right-1 min-w-4 px-1 text-[11px] leading-4 font-semibold"
                      : "ml-auto px-1.5 text-xs leading-5 font-semibold",
                  )}
                >
                  {count}
                </span>
                <span className="sr-only">{overdueLabel(count)}</span>
              </>
            ) : null}
          </Link>
        );
        return (
          <li
            key={item.href}
            className={
              item.separatorBefore ? "mt-2 border-t border-sidebar-border pt-2" : undefined
            }
          >
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger render={link} />
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              link
            )}
          </li>
        );
      })}
    </ul>
  );
}
