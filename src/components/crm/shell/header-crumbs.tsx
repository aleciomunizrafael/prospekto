"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { describePath } from "./modules";

// Caminho do header derivado do pathname (plano, lote 1B): o shell conhece o módulo e o tipo de
// subpágina ("Leads › Lead"). Nas páginas de detalhe o rótulo genérico é só o fallback: assim que
// o h1 da página chega (as páginas chegam por streaming), o caminho passa a mostrar o nome do
// registro ("Leads › Rodrigo Pasqualotto"; no celular o título truncado, seção 4.2), e a página
// não precisa repetir o caminho no PageHeader. No celular o módulo vira o botão "voltar" (href fixo
// para a lista pai, nunca history.back()).
// O h1 é estado externo (DOM): useSyncExternalStore lê o texto atual e um MutationObserver no
// <main> avisa quando a página (ou o esqueleto) troca.
function subscribe(onChange: () => void): () => void {
  const main = document.querySelector("main");
  if (!main) return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(main, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
}

function readPageTitle(): string | null {
  return document.querySelector("main h1")?.textContent?.trim() || null;
}

function usePageTitle(): string | null {
  return useSyncExternalStore(subscribe, readPageTitle, () => null);
}

export function HeaderCrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const { module, sub } = describePath(pathname);
  const pageTitle = usePageTitle();
  // Nas páginas de criação ("Novo lead") o rótulo genérico já é o título; só o detalhe troca.
  const isDetail = Boolean(module && sub && !sub.startsWith("Novo"));
  const current = (isDetail && pageTitle) || sub || module?.label || "CRM";

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-1", className)}>
      {module && sub ? (
        <Link
          href={module.href}
          aria-label={`Voltar para ${module.label}`}
          className="-ml-1 flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted md:hidden"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
      ) : null}
      <span
        className={cn("truncate text-base font-semibold md:hidden", !(module && sub) && "pl-2")}
        title={current}
      >
        {current}
      </span>
      <Breadcrumb className="hidden min-w-0 md:block">
        <BreadcrumbList className="flex-nowrap">
          {module && sub ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href={module.href} />}>{module.label}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate" title={current}>
                  {current}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <BreadcrumbItem>
              <BreadcrumbPage>{current}</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
