"use client";

import { List, SquareKanban } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { leadFiltersToQuery, type LeadFilters } from "@/lib/crm/filters";
import { LEADS_VIEW_COOKIE, type LeadsView } from "@/lib/crm/leads-view";
import { cn } from "@/lib/utils";

// Alternância Lista/Quadro de /app/leads (ADR-004, 6.2; plano, P4 e P19): dois links num
// `nav aria-label="Visão"` com `aria-current="true"` no ativo (são links que navegam, não
// botões), preservando os filtros e trocando só `view`; 44 px no celular (`h-11 md:h-7`). O
// clique grava o cookie `crm-leads-view`
// antes de navegar; é o único lugar que grava o cookie, além da primeira visita
// (`rememberOnMount`: sem parâmetro e sem cookie, o quadro no desktop e a lista no celular, lida
// por `matchMedia`, sem `router.refresh()`). O "ver todos em Lista" das colunas não passa por aqui.

const ONE_YEAR = 31536000;

function rememberView(view: LeadsView): void {
  document.cookie = `${LEADS_VIEW_COOKIE}=${view}; path=/app; max-age=${ONE_YEAR}; samesite=lax`;
}

// Abaixo do `md` do projeto (960 px) a visão padrão é a lista.
const MOBILE_QUERY = "(max-width: 59.99rem)";

export function ViewToggle({
  filters,
  active,
  rememberOnMount = false,
  className,
}: {
  filters: LeadFilters;
  active: LeadsView;
  rememberOnMount?: boolean;
  className?: string;
}) {
  useEffect(() => {
    if (!rememberOnMount) return;
    rememberView(window.matchMedia(MOBILE_QUERY).matches ? "lista" : "quadro");
  }, [rememberOnMount]);

  // O quadro ignora estágio, ordenação e página: os links para ele não os carregam.
  const listHref = `/app/leads${leadFiltersToQuery({ ...filters, view: "lista" })}`;
  const boardHref = `/app/leads${leadFiltersToQuery({
    ...filters,
    stage: undefined,
    sort: "next_action",
    page: 1,
    view: "quadro",
  })}`;
  const options: { view: LeadsView; label: string; href: string; icon: typeof List }[] = [
    { view: "lista", label: "Lista", href: listHref, icon: List },
    { view: "quadro", label: "Quadro", href: boardHref, icon: SquareKanban },
  ];

  return (
    <nav
      aria-label="Visão"
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-background p-0.5",
        className,
      )}
    >
      {options.map(({ view, label, href, icon: Icon }) => {
        const current = view === active;
        return (
          <Link
            key={view}
            href={href}
            aria-current={current ? "true" : undefined}
            onClick={() => rememberView(view)}
            className={cn(
              "inline-flex h-11 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors duration-120 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-7",
              current
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
