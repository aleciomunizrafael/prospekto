"use client";

import { Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PALETTE_EVENT } from "./modules";

// Gatilhos da paleta Ctrl+K (ADR-004, seção 6.7). Não há `DialogTrigger`: a paleta vive no layout e
// abre por atalho ou pelo evento `prospekto:paleta`; quem dispara o evento continua com o foco e a
// paleta devolve o foco a ele ao fechar (`finalFocus`).
export function openPalette(): void {
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT));
}

// Botão "Buscar…" da sidebar (crm-design-system.md, seção 4.1): 40 px, `outline` discreto em
// `bg-background`, lupa à esquerda e o atalho como <kbd>, para a pessoa descobrir o atalho olhando.
// Recolhida, só a lupa com Tooltip; o nome acessível continua "Buscar".
export function SidebarSearch({
  collapsed,
  className,
}: {
  collapsed: boolean;
  className?: string;
}) {
  const button = (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Buscar"
      aria-keyshortcuts="Control+K Meta+K"
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-lg border border-border bg-background text-sm text-muted-foreground transition-colors duration-120 hover:border-ring/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        collapsed ? "justify-center px-0" : "px-3",
        className,
      )}
    >
      <Search className="size-[18px] shrink-0" aria-hidden="true" />
      {collapsed ? null : (
        <>
          <span className="truncate">Buscar…</span>
          <kbd
            aria-hidden="true"
            className="ml-auto rounded border border-border bg-surface-2 px-1.5 font-sans text-[11px] leading-4 text-muted-foreground"
          >
            Ctrl K
          </kbd>
        </>
      )}
    </button>
  );
  if (!collapsed) return button;
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right">
        Buscar <kbd className="font-sans">Ctrl K</kbd>
      </TooltipContent>
    </Tooltip>
  );
}

// Lupa do header no celular (crm-design-system.md, seção 4.2): deixou de ser link para /app/busca
// e abre a paleta, que desce do topo (folha superior) para o teclado virtual não espremer a lista.
export function PaletteTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Buscar"
      aria-keyshortcuts="Control+K Meta+K"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted",
        className,
      )}
    >
      <Search className="size-5" aria-hidden="true" />
    </button>
  );
}
