"use client";

import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MODULES } from "./modules";
import { useSignOut } from "./user-menu";

// Rodapé do usuário na sidebar (crm-design-system.md, seção 4.1; ADR-004, seção 6.1): Avatar 32 px,
// nome 14 px/500 e e-mail 12 px em `muted`, truncados com o nome completo em `title`, e o menu que
// antes ficava no avatar do header (Minha conta, separador, Sair). Recolhida, só o avatar com o
// mesmo menu. O e-mail é o do próprio usuário da sessão e nunca vai ao log.
export function SidebarUser({
  userName,
  userEmail,
  collapsed,
  className,
}: {
  userName: string;
  userEmail: string;
  collapsed: boolean;
  className?: string;
}) {
  const { signOut, leaving } = useSignOut();
  const name = userName.trim() || "Conta";
  const trigger = (
    <button
      type="button"
      aria-label={`Conta de ${name}`}
      className={cn(
        "flex h-12 w-full items-center gap-3 rounded-lg text-left transition-colors duration-120 hover:bg-background/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none data-[popup-open]:bg-background/60",
        collapsed ? "justify-center px-0" : "px-2",
        className,
      )}
    >
      <Avatar name={name} size="md" aria-hidden="true" title={undefined} />
      {collapsed ? null : (
        <>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-foreground" title={name}>
              {name}
            </span>
            {userEmail ? (
              <span className="truncate text-xs text-muted-foreground" title={userEmail}>
                {userEmail}
              </span>
            ) : null}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </>
      )}
    </button>
  );

  return (
    <DropdownMenu>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger render={<DropdownMenuTrigger render={trigger} />} />
          <TooltipContent side="right">{name}</TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger render={trigger} />
      )}
      <DropdownMenuContent side="top" align="start" className="min-w-56">
        {/* GroupLabel do base-ui exige um Group em volta (senão MenuGroupContext falta). */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col normal-case tracking-normal">
            <span className="truncate">{name}</span>
            {userEmail ? (
              <span className="truncate text-xs font-normal text-muted-foreground">
                {userEmail}
              </span>
            ) : null}
          </DropdownMenuLabel>
          <DropdownMenuItem render={<Link href={MODULES.conta.href} />}>
            <UserRound aria-hidden="true" />
            Minha conta
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} disabled={leaving}>
          <LogOut aria-hidden="true" />
          {leaving ? "Saindo…" : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
