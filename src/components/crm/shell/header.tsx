import { Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HeaderCrumbs } from "./header-crumbs";
import { NewMenu } from "./new-menu";
import { SearchForm } from "./search-form";
import { UserMenu } from "./user-menu";

// Header do shell (crm-design-system.md, seções 4.1 e 4.2), uma peça para os dois tamanhos:
// desktop 56 px com caminho, busca, "Novo ▾" e avatar; celular 52 px com voltar, título e lupa.
// Server Component: as partes interativas (caminho, menus) são Client Components mínimos.
export function Header({ userName, className }: { userName: string; className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-13 items-center gap-2 border-b border-border bg-background px-2 md:h-14 md:gap-3 md:px-6",
        className,
      )}
    >
      <HeaderCrumbs />
      <SearchForm className="hidden md:block" inputClassName="md:w-[17.5rem]" />
      <Link
        href="/app/busca"
        aria-label="Buscar"
        className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted md:hidden"
      >
        <Search className="size-5" aria-hidden="true" />
      </Link>
      <NewMenu className="hidden md:inline-flex" />
      <UserMenu userName={userName} className="hidden md:inline-flex" />
    </header>
  );
}
