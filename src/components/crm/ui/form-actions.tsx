import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Rodapé fixo de formulário longo (crm-design-system.md, seção 5.2): fica acima da barra inferior
// no celular (`bottom-20`) e no fim do card no desktop. `note` ("* obrigatório") à esquerda.
// Alvos de 44 px no celular: "Cancelar" já vem assim; o botão de envio em `children` deve usar
// `size="touch" className="md:h-9"` (SubmitButton).
export function FormActions({
  children,
  cancelHref,
  cancelLabel = "Cancelar",
  note,
  className,
}: {
  children: ReactNode;
  cancelHref?: string;
  cancelLabel?: string;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-20 z-10 -mx-4 flex items-center justify-end gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:-mx-5 md:bottom-0 md:px-5",
        className,
      )}
    >
      {note ? <span className="crm-meta mr-auto">{note}</span> : null}
      {cancelHref ? (
        <Button
          variant="ghost"
          size="touch"
          className="md:h-8"
          nativeButton={false}
          render={<Link href={cancelHref} />}
        >
          {cancelLabel}
        </Button>
      ) : null}
      {children}
    </div>
  );
}
