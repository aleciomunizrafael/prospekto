import { cn } from "cn"

// Silhueta de carregamento (crm-design-system.md, seção 5.1); `animate-pulse` já respeita
// prefers-reduced-motion pelo bloco global. Escondida de leitores de tela: o `loading.tsx`
// anuncia "Carregando…" uma vez, num `role="status"`.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-2", className)}
      {...props}
    />
  )
}

export { Skeleton }
