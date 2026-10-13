import { UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { SearchGroups } from "@/actions/search";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MODULES, SEARCH_KIND_LABELS } from "./modules";
import { NAV_ITEMS } from "./nav-items";
import { NEW_ITEMS } from "./new-menu";

// Lista da paleta Ctrl+K (ADR-004, seção 6.7). Componente puro, sem "use client": recebe a consulta,
// os grupos da action, o item ativo e o estado, e é testado com renderToString
// (tests/command-palette.test.ts). Uma lista única `role="listbox"` em que cada item é um `<a>`
// real (`role="option"`), com o chip do tipo e uma linha de meta; a consulta vazia lista "Ir para"
// (os módulos) e "Novo…" (os itens do "Novo ▾"). O teclado (setas, Enter) e o `aria-activedescendant`
// ficam no command-palette.tsx; aqui só a marcação. O rodapé "ver todos os resultados" leva à
// página /app/busca, que continua sendo o destino sem JavaScript.
export type PaletteStatus = "idle" | "loading" | "ready" | "error";

export type PaletteLink = { id: string; label: string; href: string; icon: LucideIcon };
export type PaletteNavigation = { goTo: PaletteLink[]; create: PaletteLink[] };
export type PaletteOption = { id: string; href: string };

export const PALETTE_LISTBOX_ID = "paleta-lista";
export const PALETTE_HINT =
  "Digite para buscar leads, organizações, projetos, aportes, tarefas e empresas de prospecção.";
export const PALETTE_ERROR = "Não foi possível buscar. Tente de novo.";
export const PALETTE_MIN_CHARS = 2;

// Id de DOM estável e sem caracteres especiais (vai em aria-activedescendant e getElementById).
export function paletteOptionId(key: string): string {
  return `paleta-opt-${key.replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
}

export const PALETTE_NAVIGATION: PaletteNavigation = {
  goTo: [
    ...NAV_ITEMS.map((item) => ({
      id: paletteOptionId(`ir${item.href}`),
      label: item.label,
      href: item.href,
      icon: item.icon,
    })),
    {
      id: paletteOptionId(`ir${MODULES.conta.href}`),
      label: MODULES.conta.label,
      href: MODULES.conta.href,
      icon: UserRound,
    },
  ],
  create: NEW_ITEMS.map((item) => ({
    id: paletteOptionId(`novo${item.href}`),
    label: item.label,
    href: item.href,
    icon: item.icon,
  })),
};

export function isPaletteEmpty(query: string): boolean {
  return query.trim().length < PALETTE_MIN_CHARS;
}

// Opções na ordem do teclado: na consulta vazia, "Ir para" e depois "Novo…"; com resultados, os
// grupos na ordem da action. A paleta usa a lista para as setas, o Enter e o item ativo.
export function paletteOptions(
  query: string,
  groups: SearchGroups,
  navigation: PaletteNavigation = PALETTE_NAVIGATION,
): PaletteOption[] {
  if (isPaletteEmpty(query)) {
    return [...navigation.goTo, ...navigation.create].map((l) => ({ id: l.id, href: l.href }));
  }
  return groups.flatMap((g) =>
    g.items.map((i) => ({ id: paletteOptionId(`${g.kind}-${i.id}`), href: i.href })),
  );
}

export function searchAllHref(query: string): string {
  return `/app/busca?q=${encodeURIComponent(query.trim())}`;
}

const optionClass = (active: boolean) =>
  cn(
    "flex min-h-10 items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-foreground outline-none transition-colors duration-120",
    active ? "bg-primary-soft" : "hover:bg-muted",
  );

function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-0.5">
      <div id={id} role="presentation" className="crm-eyebrow px-3 pt-2 pb-1">
        {title}
      </div>
      {children}
    </div>
  );
}

function NavOption({ link, active }: { link: PaletteLink; active: boolean }) {
  const Icon = link.icon;
  return (
    <Link
      role="option"
      id={link.id}
      href={link.href}
      aria-selected={active ? "true" : undefined}
      data-active={active || undefined}
      className={optionClass(active)}
    >
      <Icon className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="truncate">{link.label}</span>
    </Link>
  );
}

export function PaletteResults({
  query,
  groups,
  activeId,
  navigation = PALETTE_NAVIGATION,
  status,
  listboxId = PALETTE_LISTBOX_ID,
}: {
  query: string;
  groups: SearchGroups;
  activeId: string | null;
  navigation?: PaletteNavigation;
  status: PaletteStatus;
  listboxId?: string;
}) {
  const q = query.trim();
  const empty = isPaletteEmpty(query);
  const total = groups.reduce((sum, g) => sum + g.items.length, 0);
  const showGroups = !empty && total > 0 && status !== "error";

  return (
    <div className="flex flex-col gap-1">
      <div
        role="listbox"
        id={listboxId}
        aria-label={empty ? "Ir para e criar" : "Resultados da busca"}
        className="flex flex-col gap-1"
      >
        {empty ? (
          <>
            <Group id="paleta-ir-para" title="Ir para">
              {navigation.goTo.map((link) => (
                <NavOption key={link.id} link={link} active={link.id === activeId} />
              ))}
            </Group>
            <Group id="paleta-novo" title="Novo…">
              {navigation.create.map((link) => (
                <NavOption key={link.id} link={link} active={link.id === activeId} />
              ))}
            </Group>
          </>
        ) : showGroups ? (
          groups.map((group) => (
            <Group key={group.kind} id={`paleta-grupo-${group.kind}`} title={group.label}>
              {group.items.map((item) => {
                const id = paletteOptionId(`${group.kind}-${item.id}`);
                const active = id === activeId;
                return (
                  <Link
                    key={id}
                    role="option"
                    id={id}
                    href={item.href}
                    aria-selected={active ? "true" : undefined}
                    data-active={active || undefined}
                    className={optionClass(active)}
                  >
                    <span className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate font-medium">{item.title}</span>
                      {item.meta ? (
                        <span className="truncate text-xs text-muted-foreground">{item.meta}</span>
                      ) : null}
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {SEARCH_KIND_LABELS[item.kind]}
                    </Badge>
                  </Link>
                );
              })}
            </Group>
          ))
        ) : null}
      </div>
      {empty ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">{PALETTE_HINT}</p>
      ) : status === "error" ? (
        <p className="px-3 py-4 text-sm text-destructive">{PALETTE_ERROR}</p>
      ) : status === "ready" && total === 0 ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">
          {`Nada encontrado para "${q}". Tente parte do nome ou o CNPJ.`}
        </p>
      ) : total === 0 ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">Buscando…</p>
      ) : null}
      {showGroups ? (
        <div className="border-t border-border px-3 pt-2 pb-1 text-sm">
          <Link href={searchAllHref(query)} className="text-primary hover:underline">
            ver todos os resultados em Busca ›
          </Link>
        </div>
      ) : null}
    </div>
  );
}
