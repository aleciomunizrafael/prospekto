import { ArrowUpRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Número grande com rótulo (crm-design-system.md, seção 5.2): os quatro cards de Hoje, os de
// Projetos e Aportes. Com `href`, o card inteiro é um link com `aria-label` completo
// ("3 próximas ações vencidas, abrir lista"). Grid pai: `grid grid-cols-2 gap-3 md:grid-cols-4`.
// O número segue a largura do próprio card (container query): 22 px em cards estreitos (2 colunas
// a 390 px), 28 px em cards médios (5 colunas no detalhe do projeto) e os 32 px do .crm-kpi a
// partir de 17rem, para "R$ 1.350.000,00" nunca estourar o card.
//
// `variant="ruler"` (ADR-004, 6.8): célula de uma StatRuler, sem borda, canto nem sombra próprios
// (as hairlines são do grupo), `hover:bg-surface-2`, seta ↗ ao passar o mouse e `title` com o
// valor por extenso. O link principal cobre a célula inteira por um pseudo-elemento esticado
// (`after:inset-0`), e o anel de foco fica nele, `ring-inset`, porque o grupo tem
// `overflow-hidden` e um anel externo seria cortado nas pontas (WCAG 2.4.7). Com `hintHref`, o
// hint é um segundo link (`relative z-10`) acima do pseudo-elemento: nunca um <a> dentro de outro.
// Como o círculo de 24 px em volta do hint cai sobre o link principal, a exceção de espaçamento
// não vale e o hint precisa do alvo de 24 px (`min-h-6 py-1 -my-1`, WCAG 2.5.8): a linha de 16 px
// ganha 4 px de padding em cima e embaixo, e a margem negativa devolve os 8 px ao fluxo, então a
// célula não muda de altura nem de aparência.
export type StatCardTone = "neutral" | "warning" | "danger" | "success";

const DOT_CLASS: Record<StatCardTone, string> = {
  neutral: "",
  warning: "bg-warning",
  danger: "bg-destructive",
  success: "bg-success",
};

const HINT_TONE_CLASS: Record<StatCardTone, string> = {
  neutral: "",
  warning: "font-medium text-warning",
  danger: "font-medium text-destructive",
  success: "font-medium text-success",
};

export function StatCard({
  label,
  value,
  hint,
  hintHref,
  hintTone = "neutral",
  tone = "neutral",
  href,
  icon: Icon,
  ariaLabel,
  title,
  extra,
  variant = "card",
  className,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  // Só na régua: o hint vira um link próprio (ex.: "2 atrasadas" → ?atrasadas=1).
  hintHref?: string;
  hintTone?: StatCardTone;
  tone?: StatCardTone;
  href?: string;
  icon?: LucideIcon;
  ariaLabel?: string;
  // Valor por extenso no `title` (ex.: "R$ 1.350.000,00 em 3 aportes propostos e assinados").
  title?: string;
  // Conteúdo opcional abaixo do número (ex.: um `Meter`).
  extra?: ReactNode;
  variant?: "card" | "ruler";
  className?: string;
}) {
  const labelRow = (
    <span className="flex items-center justify-between gap-2">
      <span className="crm-eyebrow flex items-center gap-1.5">
        {tone !== "neutral" ? (
          <span
            aria-hidden="true"
            className={cn("inline-block size-2 shrink-0 rounded-full", DOT_CLASS[tone])}
          />
        ) : null}
        {label}
        {variant === "ruler" && href ? (
          <ArrowUpRight
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-120 group-focus-within:opacity-100 group-hover:opacity-100"
          />
        ) : null}
      </span>
      {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
    </span>
  );
  const valueRow = (
    <span className="crm-kpi truncate text-[1.375rem] leading-8 @[14rem]:text-[1.75rem] @[14rem]:leading-9 @[17rem]:text-[2rem]">
      {value}
    </span>
  );

  if (variant === "ruler") {
    const cellClass = cn(
      "@container group relative flex min-w-0 flex-col gap-1 bg-card p-3 text-left md:p-4",
      href && "transition-colors duration-120 hover:bg-surface-2",
      className,
    );
    const mainClass =
      "flex flex-col gap-1 outline-none after:absolute after:inset-0 after:ring-ring after:ring-inset after:content-[''] focus-visible:after:ring-2";
    return (
      <div className={cellClass} title={title}>
        {href ? (
          <Link href={href} aria-label={ariaLabel} className={mainClass}>
            {labelRow}
            {valueRow}
          </Link>
        ) : (
          <span className="flex flex-col gap-1" aria-label={ariaLabel}>
            {labelRow}
            {valueRow}
          </span>
        )}
        {extra ? <span className="flex items-center">{extra}</span> : null}
        {hint ? (
          hintHref ? (
            <Link
              href={hintHref}
              className={cn(
                "crm-meta relative z-10 -my-1 inline-flex min-h-6 items-center self-start rounded-sm py-1 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                HINT_TONE_CLASS[hintTone],
              )}
            >
              {hint}
            </Link>
          ) : (
            <span className={cn("crm-meta", HINT_TONE_CLASS[hintTone])}>{hint}</span>
          )
        ) : null}
      </div>
    );
  }

  const body = (
    <>
      {labelRow}
      {valueRow}
      {extra ? <span className="flex items-center">{extra}</span> : null}
      {hint ? <span className={cn("crm-meta", HINT_TONE_CLASS[hintTone])}>{hint}</span> : null}
    </>
  );
  const classes = cn(
    "@container flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-3 text-left md:p-4",
    href && "transition-colors duration-120 hover:bg-surface-2 focus-visible:outline",
    className,
  );
  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} title={title} className={classes}>
        {body}
      </Link>
    );
  }
  return (
    <div className={classes} aria-label={ariaLabel} title={title}>
      {body}
    </div>
  );
}
