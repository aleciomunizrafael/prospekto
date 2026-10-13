import { cn } from "@/lib/utils";
import { HeaderCrumbs } from "./header-crumbs";
import { NewMenu } from "./new-menu";
import { SearchForm } from "./search-form";
import { PaletteTrigger } from "./sidebar-search";

// Header do shell (crm-design-system.md, seções 4.1 e 4.2; ADR-004, seção 6.1), uma peça para os
// dois tamanhos: desktop 56 px com caminho, busca e "Novo ▾" (o avatar foi para o rodapé da
// sidebar, para não haver dois menus iguais na mesma tela); celular 52 px com voltar, título e a
// lupa, que abre a paleta Ctrl+K. Server Component: as partes interativas são Client Components
// mínimos. O formulário de busca continua sendo o destino sem JavaScript (/app/busca) e o alvo da
// tecla "/" (shortcuts.tsx).
export function Header({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-13 items-center gap-2 border-b border-border bg-background px-2 md:h-14 md:gap-3 md:px-6",
        className,
      )}
    >
      <HeaderCrumbs />
      <SearchForm className="hidden md:block" inputClassName="md:w-[17.5rem]" />
      <PaletteTrigger className="md:hidden" />
      <NewMenu className="hidden md:inline-flex" />
    </header>
  );
}
