"use client";

import { useLayoutEffect } from "react";

// Abre no desktop os blocos dobráveis (<details>) que nascem fechados no HTML: no celular ficam
// fechados para não empurrar o conteúdo; a partir de `minWidth` abrem antes da primeira pintura
// após a hidratação e acompanham a mudança de largura. Usado pelo detalhe do lead
// (`details.crm-fold`, ≥ lg) e pelo "Novo projeto" (`details.project-fold`, ≥ md).
export function FoldsOpenOnDesktop({
  selector,
  minWidth = "64rem",
}: {
  selector: string;
  minWidth?: string;
}) {
  useLayoutEffect(() => {
    const query = window.matchMedia(`(min-width: ${minWidth})`);
    const apply = () => {
      if (!query.matches) return;
      document.querySelectorAll<HTMLDetailsElement>(selector).forEach((fold) => {
        fold.open = true;
      });
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [selector, minWidth]);
  return null;
}
