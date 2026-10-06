"use client";

import type { ReactNode } from "react";

// Botão que fecha o <details> mais próximo. Serve para pôr o "mostrar menos" depois das linhas
// extras de uma lista (o <summary> precisa vir antes do conteúdo, mas o controle de fechar fica
// melhor no fim).
export function DetailsCloseButton({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={(event) => {
        const details = event.currentTarget.closest("details");
        if (details) details.open = false;
      }}
    >
      {children}
    </button>
  );
}
