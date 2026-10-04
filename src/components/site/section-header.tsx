import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Rótulo em caixa alta + título + subtítulo: abre toda seção (estrutura-e-copy.md, seção 7.4).
type Props = {
  label?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  // Nível do título: h1 só uma vez por página (seção 6.3).
  as?: "h1" | "h2" | "h3";
  align?: "start" | "center";
  id?: string;
  className?: string;
};

export function SectionHeader({
  label,
  title,
  subtitle,
  as: Heading = "h2",
  align = "start",
  id,
  className,
}: Props) {
  const headingClass = Heading === "h1" ? "site-h1" : Heading === "h2" ? "site-h2" : "site-h3";
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {label ? <p className="site-label">{label}</p> : null}
      <Heading id={id} className={cn(headingClass, "max-w-[28ch]")}>
        {title}
      </Heading>
      {subtitle ? (
        <div className="site-prose text-muted-foreground flex flex-col gap-3">
          {typeof subtitle === "string" ? <p>{subtitle}</p> : subtitle}
        </div>
      ) : null}
    </div>
  );
}
