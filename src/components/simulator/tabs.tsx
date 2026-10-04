"use client";

import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

// Abas acessíveis (WAI-ARIA tabs): botões com role="tab", seleção por clique ou setas, painel
// ligado por aria-controls/aria-labelledby. O conteúdo do painel é renderizado pelo chamador com
// tabPanelProps().
export type TabOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  id: string;
  label: string;
  tabs: Array<TabOption<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function SimpleTabs<T extends string>({
  id,
  label,
  tabs,
  value,
  onChange,
  className,
}: Props<T>) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + tabs.length) % tabs.length;
    }
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    const target = tabs[next];
    onChange(target.value);
    document.getElementById(`${id}-tab-${target.value}`)?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            id={`${id}-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${id}-panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "touch-target rounded-lg border px-4 py-2 text-[15px] font-medium",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-sand",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function tabPanelProps(id: string, value: string) {
  return {
    id: `${id}-panel-${value}`,
    role: "tabpanel" as const,
    "aria-labelledby": `${id}-tab-${value}`,
    tabIndex: 0,
  };
}
