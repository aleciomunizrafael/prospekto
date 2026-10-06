"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Barra de ações fixa nos detalhes, só no celular (crm-design-system.md, seção 4.2): até dois
// botões `size="touch"` e um "⋯" com o resto (menu até quatro itens; folha inferior acima disso).
// Itens com `onSelect` só funcionam quando o chamador é um Client Component; de uma página
// (Server Component) passe `href`.
export type ActionBarMoreItem = {
  label: string;
  href?: string;
  onSelect?: () => void;
  tone?: "default" | "danger";
};

export function ActionBarMobile({
  primary,
  secondary,
  more = [],
  className,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  more?: ActionBarMoreItem[];
  className?: string;
}) {
  const moreButton = (
    <Button variant="outline" size="touch" aria-label="Mais ações" className="px-3" />
  );
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-16 z-20 flex items-center gap-2 border-t border-border bg-background p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden [&>*:first-child]:flex-1 [&>*:nth-child(2)]:flex-1",
        className,
      )}
    >
      {primary}
      {secondary}
      {more.length > 0 && more.length <= 4 ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={moreButton}>
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            {more.map((item) => (
              <DropdownMenuItem
                key={item.label}
                variant={item.tone === "danger" ? "destructive" : "default"}
                onClick={item.onSelect}
                render={item.href ? <Link href={item.href} /> : undefined}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : more.length > 4 ? (
        <Sheet>
          <SheetTrigger render={moreButton}>
            <Ellipsis />
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Mais ações</SheetTitle>
            </SheetHeader>
            <ul className="flex flex-col gap-1">
              {more.map((item) => (
                <li key={item.label}>
                  <SheetClose
                    render={
                      item.href ? (
                        <Link href={item.href} />
                      ) : (
                        <button type="button" onClick={item.onSelect} />
                      )
                    }
                    className={cn(
                      "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-surface-2",
                      item.tone === "danger" && "text-destructive",
                    )}
                  >
                    {item.label}
                  </SheetClose>
                </li>
              ))}
            </ul>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
