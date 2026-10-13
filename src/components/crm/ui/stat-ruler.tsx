import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Régua de medidores (ADR-004, 6.8; estrutura do Trilis): um só card com hairlines entre as
// células, sem borda própria por célula. Desktop: quatro colunas separadas por linhas verticais;
// celular: duas colunas em duas linhas, com uma linha horizontal sob as duas células de cima e
// uma vertical entre as colunas. As hairlines são do grupo (variantes `[&>*]`), não das células:
// uma `StatCard variant="ruler"` não tem classe `border`. `overflow-hidden` recorta o hover das
// células no canto arredondado; por isso o anel de foco das células é `ring-inset`.
export function StatRuler({
  label,
  children,
  className,
}: {
  // Nome do grupo para leitores de tela ("Hoje", "Carteira").
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card md:grid-cols-4",
        "[&>*]:border-divider [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(even)]:border-l md:[&>*]:border-b-0 md:[&>*+*]:border-l",
        className,
      )}
    >
      {children}
    </div>
  );
}
