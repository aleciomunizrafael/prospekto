import { Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Botão flutuante das listas no celular (crm-design-system.md, seção 4.2): 56 px, azul-profundo,
// acima da barra inferior. Server Component: com `href` é um Link (Novo lead, Novo projeto); nas
// listas cujo "Novo" é um diálogo (Organizações, Aportes) a página usa `fabClassName` no gatilho
// do próprio diálogo (`trigger` do ActionDialog ou do Dialog) com o mesmo `aria-label`.
export const fabClassName =
  "fixed right-4 bottom-20 z-20 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-pop transition-colors duration-120 hover:bg-primary/90 md:hidden";

export function Fab({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link href={href} aria-label={label} className={cn(fabClassName, className)}>
      <Plus className="size-6" aria-hidden="true" />
    </Link>
  );
}
