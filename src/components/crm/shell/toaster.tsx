"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Toaster } from "@/components/ui/sonner";

// Posição responsiva do Toaster (crm-design-system.md, seção 4.1): embaixo, acima da barra
// inferior, do FAB (bottom-20 + 56 px) e da ActionBarMobile (bottom-16 + 56 px), no celular; canto
// superior direito no desktop. Com 80 px o toast de 4 s cobria o FAB "Nova tarefa" e interceptava
// o toque (nota da frente B). `matchMedia` no breakpoint `md` do
// projeto (60rem); antes de hidratar assume celular, e nenhum toast existe nesse instante.
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const MOBILE_OFFSET = { bottom: 144, left: 16, right: 16 };

export function CrmToaster() {
  const desktop = useMediaQuery("(min-width: 60rem)");
  return (
    <Toaster
      richColors
      position={desktop ? "top-right" : "bottom-center"}
      offset={desktop ? 16 : MOBILE_OFFSET}
      mobileOffset={MOBILE_OFFSET}
    />
  );
}
