"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { CtaLink } from "@/components/analytics/track-link";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

// Cabeçalho do site (estrutura-e-copy.md, seções 3 e 8): logo tipográfico, menu (Empresas,
// Contadores, Pessoa física, Projetos, Sobre), botão "Simular" visível em qualquer largura e menu
// em lista de tela cheia abaixo de 960px, com aria-expanded e aria-controls (seção 7.6).
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();

  // Fecha ao clicar em um link (abaixo), com Escape, e trava a rolagem do fundo enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="bg-background border-border sticky top-0 z-30 border-b">
      <a
        href="#conteudo"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex flex-col leading-none"
          aria-label={`${site.name}, página inicial`}
        >
          <span className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight">
            Prospekto
          </span>
          <span className="text-muted-foreground text-[11px] tracking-[0.08em] uppercase">
            Consultoria &amp; Projetos
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-6">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="touch-target inline-flex items-center text-[15px] font-medium underline-offset-4 hover:underline aria-[current=page]:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <CtaLink href="/simulador" ctaId="header_simulate" className="px-4 py-2 text-[15px]">
            Simular
          </CtaLink>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
            className="touch-target border-border inline-flex items-center justify-center rounded-lg border px-3 text-[15px] font-medium md:hidden"
          >
            {open ? "Fechar" : "Menu"}
          </button>
        </div>
      </div>

      <nav
        id={menuId}
        aria-label="Principal (celular)"
        hidden={!open}
        className={cn(
          "bg-background fixed inset-x-0 top-[65px] bottom-0 z-30 overflow-y-auto md:hidden",
          !open && "hidden",
        )}
      >
        <ul className="divide-border flex flex-col divide-y px-4">
          {site.nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                onClick={() => setOpen(false)}
                className="flex min-h-14 items-center text-xl font-medium"
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/contato"
              onClick={() => setOpen(false)}
              className="flex min-h-14 items-center text-xl font-medium"
            >
              Contato
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
