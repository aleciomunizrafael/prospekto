import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Estados visuais do simulador (simulador-spec.md, seção 10): aviso (amarelo escuro sobre areia,
// com rótulo textual "Atenção"), erro (vermelho-escuro com texto) e sucesso (verde-escuro).
// Nenhuma informação só por cor: o rótulo vem em texto.
type Kind = "warning" | "error" | "success" | "info";

const STYLES: Record<Kind, { box: string; title: string; label: string }> = {
  warning: {
    box: "bg-sand border-amber-800/40",
    title: "text-amber-900 dark:text-amber-200",
    label: "Atenção",
  },
  error: { box: "border-error border-2", title: "text-error", label: "Erro" },
  success: { box: "border-success border-2", title: "text-success", label: "Pronto" },
  info: { box: "bg-sand border-border", title: "text-foreground", label: "Nota" },
};

type Props = {
  kind: Kind;
  title?: string;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function Notice({ kind, title, children, className, id }: Props) {
  const style = STYLES[kind];
  return (
    <div
      id={id}
      role={kind === "error" ? "alert" : "status"}
      className={cn("flex flex-col gap-1 rounded-lg border p-4 text-[15px]", style.box, className)}
    >
      <p className={cn("font-semibold", style.title)}>
        {style.label}
        {title ? `: ${title}` : null}
      </p>
      <div className="flex flex-col gap-2 leading-snug">{children}</div>
    </div>
  );
}
