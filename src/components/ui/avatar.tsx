import * as React from "react"
import { cn } from "cn"

import { initials } from "@/lib/crm/initials"

// Avatar de iniciais (crm-design-system.md, seção 5.1): 24px nas tabelas, 32px no header e nos
// detalhes. Sem imagem (o CRM não guarda foto), por isso um `span` basta: nenhum "use client".
// `title` e `aria-label` carregam o nome completo; as duas letras ficam ocultas do leitor de tela.
function Avatar({
  name,
  size = "md",
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  name: string
  size?: "sm" | "md"
}) {
  return (
    <span
      data-slot="avatar"
      data-size={size}
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground uppercase select-none",
        size === "sm" ? "size-6 text-[11px]" : "size-8 text-xs",
        className
      )}
      {...props}
    >
      <span aria-hidden="true">{initials(name)}</span>
    </span>
  )
}

export { Avatar }
