"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Grupo de opções exclusivas (crm-design-system.md, seção 5.2): tipo de atividade, segmento do
// lead e canal da resposta. `role="radiogroup"` com botões `role="radio"`, setas movem a seleção
// (pulando opções desabilitadas) e um campo oculto leva o valor à Server Action. Opção
// `disabled` continua visível e focável (`focusableWhenDisabled`, aria-disabled) e aponta a
// explicação por `describedBy` (aria-describedby), como os botões desabilitados do CRM.
export type SegmentedOption = {
  value: string;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
  describedBy?: string;
};

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
    // Avança em laço pulando as desabilitadas; se só a atual sobrar, não move.
    let index = from;
    for (let step = 0; step < options.length; step++) {
      index = (index + delta + options.length) % options.length;
      const next = options[index];
      if (!next || next.disabled) continue;
      if (index === from) return;
      onChange(next.value);
      const el = document.querySelector<HTMLButtonElement>(
        `[data-segmented="${name}"] [data-value="${CSS.escape(next.value)}"]`,
      );
      el?.focus();
      return;
    }
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
            tabIndex={active && !option.disabled ? 0 : -1}
            data-value={option.value}
            data-active={active ? "" : undefined}
            variant="outline"
            size="sm"
            disabled={option.disabled}
            focusableWhenDisabled={option.disabled || undefined}
            aria-describedby={option.describedBy}
            className={cn(
              // Alvo de toque de 44 px no celular (checklist, seção 9); compacto no desktop. Com
              // focusableWhenDisabled o atributo nativo não sai, por isso o esmaecido vai por aria.
              "h-11 md:h-7 aria-disabled:opacity-50",
              active && "border-primary/40 bg-primary-soft text-primary hover:bg-primary-soft",
            )}
            onClick={() => {
              if (!option.disabled) onChange(option.value);
            }}
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
