"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

// Caminho do header derivado do pathname (plano, lote 1B): o shell só conhece o módulo e o tipo
// de subpágina ("Leads › Lead"); o nome do registro aparece no PageHeader da própria página.
// No celular vira botão "voltar" (href fixo para a lista pai, nunca history.back()) e título.
export function HeaderCrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const { module, sub } = describePath(pathname);
  const title = sub ?? module?.label ?? "CRM";

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
        title={title}
      >
        {title}
      </span>
      <Breadcrumb className="hidden min-w-0 md:block">
        <BreadcrumbList className="flex-nowrap">
          {module && sub ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href={module.href} />}>{module.label}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{sub}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
