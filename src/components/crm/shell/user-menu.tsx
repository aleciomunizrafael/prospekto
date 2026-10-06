"use client";

import { ChevronDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { MODULES } from "./modules";

// Sair: mesma sequência do nav antigo (authClient.signOut, depois /entrar e refresh para o layout
// reler a sessão). Compartilhado com a folha "Mais" da barra inferior.
export function useSignOut() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  async function signOut() {
    setLeaving(true);
    try {
      await authClient.signOut();
    } finally {
      router.push("/entrar");
      router.refresh();
    }
  }
  return { signOut, leaving };
}

// Menu do avatar (crm-design-system.md, seção 4.1): "Minha conta", separador, "Sair". "Sair"
// deixa de ser o botão mais visível do sistema.
export function UserMenu({ userName, className }: { userName: string; className?: string }) {
  const { signOut, leaving } = useSignOut();
  const name = userName.trim() || "Conta";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="lg"
            aria-label={`Conta de ${name}`}
            className={cn("gap-1 px-1.5", className)}
          />
        }
      >
        <Avatar name={name} size="md" aria-hidden="true" />
        <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {/* GroupLabel do base-ui exige um Group em volta (senão MenuGroupContext falta). */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate normal-case tracking-normal">
            {name}
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
