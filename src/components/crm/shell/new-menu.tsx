"use client";

import { Building2, ChevronDown, Clapperboard, HandCoins, Plus, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// "Novo ▾" do header (crm-design-system.md, seção 4.1): cria qualquer coisa de qualquer tela.
// Botão `outline`: o azul sólido fica para a ação primária da página (decisão D5). As duas URLs
// com `?novo=1` abrem só a lista na Fase 1; as frentes D e F ligam o parâmetro ao diálogo.
export const NEW_ITEMS = [
  { label: "Novo lead", href: "/app/leads/novo", icon: Users },
  { label: "Nova organização", href: "/app/organizacoes?novo=1", icon: Building2 },
  { label: "Novo projeto", href: "/app/projetos/novo", icon: Clapperboard },
  { label: "Novo aporte", href: "/app/aportes?novo=1", icon: HandCoins },
] as const;

export function NewMenu({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="lg" className={cn("gap-1.5 px-3", className)} />}
      >
        <Plus aria-hidden="true" />
        Novo
        <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {NEW_ITEMS.map((item) => (
          <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
            <item.icon aria-hidden="true" />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
