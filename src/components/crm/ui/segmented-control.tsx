"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Grupo de opções exclusivas (crm-design-system.md, seção 5.2): tipo de atividade e segmento do
// lead. `role="radiogroup"` com botões `role="radio"`, setas movem a seleção e um campo oculto
// leva o valor à Server Action.
export type SegmentedOption = { value: string; label: string; icon?: LucideIcon };

export function SegmentedControl({
  name,
  options,
  value,
  onChange,
  label,
  className,
}: {
  name: string;
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  function move(from: number, delta: number) {
    const next = options[(from + delta + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    const el = document.querySelector<HTMLButtonElement>(
      `[data-segmented="${name}"] [data-value="${CSS.escape(next.value)}"]`,
    );
    el?.focus();
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-segmented={name}
      className={cn("flex flex-wrap gap-2", className)}
    >
      <input type="hidden" name={name} value={value} />
      {options.map((option, i) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <Button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-value={option.value}
            data-active={active ? "" : undefined}
            variant="outline"
            size="sm"
            className={cn(
              "h-9 md:h-7",
              active && "border-primary/40 bg-primary-soft text-primary hover:bg-primary-soft",
            )}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(i, 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(i, -1);
              }
            }}
          >
            {Icon ? <Icon aria-hidden="true" /> : null}
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
