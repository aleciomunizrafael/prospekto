"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { searchAllAction, type SearchGroups } from "@/actions/search";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PALETTE_EVENT } from "./modules";
import { SEARCH_PLACEHOLDER } from "./search-form";
import {
  PALETTE_ERROR,
  PALETTE_LISTBOX_ID,
  PALETTE_NAVIGATION,
  PaletteResults,
  isPaletteEmpty,
  paletteOptions,
  type PaletteStatus,
} from "./palette-results";

// Paleta de busca Ctrl+K (ADR-004, seção 6.7; decisão D11 revisada). Client Component sobre o
// Dialog do base-ui, que já cuida de Esc, foco preso e aria-modal. Abre com Ctrl/Cmd+K em qualquer
// tela, inclusive com o foco num campo de texto, mas nunca sobre outro diálogo, alertdialog ou menu
// (a regra OVERLAY de shortcuts.tsx: dois modais prendem o foco em dois lugares); também abre pelo
// evento `prospekto:paleta` (botão da sidebar, lupa do celular). Sem `trigger`, o foco voltaria ao
// body ao fechar; por isso guardamos o elemento ativo ao abrir e o passamos em `finalFocus`.
// A busca dispara a partir de 2 caracteres com 250 ms de espera, pela Server Action; o item ativo
// é só `aria-activedescendant` (o foco fica no campo); cada resultado é um link real.
// Sem efeitos com setState: a espera e a busca vivem nos manipuladores de evento.
const OVERLAY = '[role="dialog"], [role="alertdialog"], [role="menu"]';
const OPEN_OVERLAY = '[role="dialog"][data-open], [role="alertdialog"][data-open]';
const DEBOUNCE_MS = 250;

function resultsLabel(total: number): string {
  if (total === 0) return "Nenhum resultado";
  return total === 1 ? "1 resultado" : `${total} resultados`;
}

export function CommandPalette() {
  const router = useRouter();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroups>([]);
  const [status, setStatus] = useState<PaletteStatus>("idle");
  const [activeIndex, setActiveIndex] = useState(0);
  const [, startTransition] = useTransition();
  const returnFocus = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  const options = paletteOptions(query, groups, PALETTE_NAVIGATION);
  const active = options[Math.min(activeIndex, Math.max(options.length - 1, 0))] ?? null;
  const activeId = active?.id ?? null;
  const total = groups.reduce((sum, g) => sum + g.items.length, 0);

  const cancelPending = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    requestSeq.current += 1;
  }, []);

  const show = useCallback(() => {
    returnFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelPending();
    setQuery("");
    setGroups([]);
    setStatus("idle");
    setActiveIndex(0);
    setOpen(true);
  }, [cancelPending]);

  const close = useCallback(() => {
    cancelPending();
    setOpen(false);
  }, [cancelPending]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey) return;
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;
      if (open) {
        event.preventDefault();
        close();
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest(OVERLAY)) return;
      if (document.querySelector(OPEN_OVERLAY)) return;
      event.preventDefault();
      show();
    }
    function onOpenEvent() {
      if (!open) show();
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(PALETTE_EVENT, onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(PALETTE_EVENT, onOpenEvent);
    };
  }, [open, show, close]);

  // Desmontagem (navegação de layout): nenhum timer solto.
  useEffect(() => cancelPending, [cancelPending]);

  // O item ativo acompanha as setas dentro da lista rolável.
  useEffect(() => {
    if (!open || !activeId) return;
    document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [open, activeId]);

  function runSearch(q: string, seq: number) {
    startTransition(async () => {
      try {
        const result = await searchAllAction(q);
        if (seq !== requestSeq.current) return;
        setGroups(result);
        setStatus("ready");
        setActiveIndex(0);
      } catch {
        if (seq === requestSeq.current) setStatus("error");
      }
    });
  }

  function onQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(0);
    cancelPending();
    if (isPaletteEmpty(value)) {
      setGroups([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    const seq = requestSeq.current;
    timer.current = setTimeout(() => runSearch(value.trim(), seq), DEBOUNCE_MS);
  }

  function go(href: string) {
    close();
    router.push(href);
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (options.length === 0) return;
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, last));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(last);
        break;
      case "Enter":
        if (active) {
          event.preventDefault();
          go(active.href);
        }
        break;
    }
  }

  // Delegação: o mouse destaca a opção sob ele; um clique em qualquer link (opção ou "ver todos")
  // fecha a paleta e deixa o Link navegar.
  function onMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    const option = (event.target as Element).closest('[role="option"]');
    if (!option) return;
    const index = options.findIndex((o) => o.id === option.id);
    if (index >= 0 && index !== activeIndex) setActiveIndex(index);
  }
  function onClick(event: ReactMouseEvent<HTMLDivElement>) {
    if ((event.target as Element).closest("a[href]")) close();
  }

  const live =
    status === "loading"
      ? "Buscando…"
      : status === "error"
        ? PALETTE_ERROR
        : status === "ready"
          ? resultsLabel(total)
          : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent
        showCloseButton={false}
        finalFocus={returnFocus}
        className="gap-1 p-2 sm:max-w-lg max-sm:inset-x-0 max-sm:top-0 max-sm:bottom-auto max-sm:rounded-t-none max-sm:rounded-b-xl"
        onMouseMove={onMouseMove}
        onClick={onClick}
      >
        <DialogTitle className="sr-only">Buscar</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-2 pb-2">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <label htmlFor={inputId} className="sr-only">
            Buscar
          </label>
          <Input
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={PALETTE_LISTBOX_ID}
            aria-activedescendant={activeId ?? undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder={SEARCH_PLACEHOLDER}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={onInputKeyDown}
            className="h-10 border-0 bg-transparent px-0 text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-sm"
          />
          <kbd
            aria-hidden="true"
            className="shrink-0 rounded border border-border bg-surface-2 px-1.5 font-sans text-[11px] leading-4 text-muted-foreground max-sm:hidden"
          >
            Esc
          </kbd>
          <DialogClose
            render={<Button variant="ghost" size="icon-sm" className="size-9 sm:hidden" />}
          >
            <X aria-hidden="true" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <PaletteResults
            query={query}
            groups={groups}
            activeId={activeId}
            navigation={PALETTE_NAVIGATION}
            status={status}
            listboxId={PALETTE_LISTBOX_ID}
          />
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {live}
        </p>
      </DialogContent>
    </Dialog>
  );
}
