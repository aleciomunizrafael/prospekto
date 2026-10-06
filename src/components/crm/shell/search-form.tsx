import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Busca global (crm-design-system.md, seção 4.1; decisão D18): formulário GET para /app/busca,
// sem JavaScript. Server Component. A tecla "/" (shell/shortcuts.tsx) foca o primeiro campo
// visível de `form[role="search"] input[name="q"]`; o `<kbd>` só lembra o atalho no desktop.
export function SearchForm({
  defaultValue = "",
  id = "busca-global",
  placeholder = "Buscar leads, empresas e projetos",
  className,
  inputClassName,
}: {
  defaultValue?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  return (
    <form role="search" method="get" action="/app/busca" className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        Buscar
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        className={cn("h-9 w-full bg-background pr-8 pl-8", inputClassName)}
      />
      <kbd
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border border-border bg-surface-2 px-1.5 font-sans text-[11px] leading-4 text-muted-foreground md:block"
      >
        /
      </kbd>
    </form>
  );
}
