"use client";

import {
  Building2,
  Clapperboard,
  Download,
  HandCoins,
  Keyboard,
  LogOut,
  Menu,
  Sun,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { MODULES, isActivePath, type CrmModule } from "./modules";
import { useSignOut } from "./user-menu";

// Barra inferior do celular (crm-design-system.md, seção 4.2): cinco alvos de 64 × 56 px com
// ícone 22 px e rótulo 11 px sempre visível; `aria-current="page"` no ativo; "Mais" abre uma folha
// inferior com Organizações, Exportar, Minha conta, Atalhos e Sair.
type BarItem = CrmModule & { icon: LucideIcon };

const PRIMARY: BarItem[] = [
  { ...MODULES.hoje, icon: Sun },
  { ...MODULES.leads, icon: Users },
  { ...MODULES.projetos, icon: Clapperboard },
  { ...MODULES.aportes, icon: HandCoins },
];

const MORE: BarItem[] = [
  { ...MODULES.organizacoes, icon: Building2 },
  { ...MODULES.exportar, icon: Download },
  { ...MODULES.conta, icon: UserRound },
  { href: "/app/conta#atalhos", label: "Atalhos de teclado", icon: Keyboard },
];

const MORE_PATHS = [MODULES.organizacoes.href, MODULES.exportar.href, MODULES.conta.href];

function itemClass(active: boolean) {
  return cn(
    "flex h-14 min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[11px] leading-[14px] font-medium transition-colors duration-120",
    active ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground",
  );
}

const sheetItemClass =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-surface-2 [&_svg]:size-5 [&_svg]:text-muted-foreground";

export function BottomBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { signOut, leaving } = useSignOut();
  const moreActive = MORE_PATHS.some((href) => isActivePath(href, pathname));

  return (
    <nav
      aria-label="Principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden",
        className,
      )}
    >
      <ul className="flex h-16 items-center justify-around px-1">
        {PRIMARY.map((item) => {
          const active = isActivePath(item.href, pathname, item.exact);
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={itemClass(active)}
              >
                <item.icon className="size-[22px]" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <Sheet>
            <SheetTrigger
              render={
                <button
                  type="button"
                  aria-current={moreActive ? "page" : undefined}
                  className={itemClass(moreActive)}
                />
              }
            >
              <Menu className="size-[22px]" aria-hidden="true" />
              <span>Mais</span>
            </SheetTrigger>
            <SheetContent side="bottom" aria-describedby={undefined}>
              <SheetHeader>
                <SheetTitle>Mais</SheetTitle>
              </SheetHeader>
              <ul className="flex flex-col gap-1">
                {MORE.map((item) => {
                  const active =
                    !item.href.includes("#") && isActivePath(item.href, pathname, item.exact);
                  return (
                    <li key={item.href}>
                      <SheetClose
                        render={<Link href={item.href} />}
                        nativeButton={false}
                        aria-current={active ? "page" : undefined}
                        className={cn(sheetItemClass, active && "bg-surface-2 font-medium")}
                      >
                        <item.icon aria-hidden="true" />
                        {item.label}
                      </SheetClose>
                    </li>
                  );
                })}
                <li className="mt-1 border-t border-divider pt-1">
                  <button
                    type="button"
                    onClick={signOut}
                    disabled={leaving}
                    className={cn(sheetItemClass, "text-destructive [&_svg]:text-destructive")}
                  >
                    <LogOut aria-hidden="true" />
                    {leaving ? "Saindo…" : "Sair"}
                  </button>
                </li>
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
