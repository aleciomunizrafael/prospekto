import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Seção de formulário ou de leitura (crm-design-system.md, seção 5.2): fieldset com legenda em
// serifa; quando `collapsible`, vira <details> (funciona sem JavaScript) com a seta que gira e o
// título num <h2> dentro do <summary> (navegação por cabeçalhos). `badge` ("exigido em
// Autorizado") e `count` ("0 de 17 preenchidos") ficam ao lado do título.
export function FormSection({
  title,
  description,
  collapsible = false,
  defaultOpen = false,
  badge,
  count,
  id,
  children,
  className,
  contentClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  badge?: string;
  count?: string;
  id?: string;
  children: ReactNode;
  className?: string;
  // Classes do contêiner dos campos (padrão: coluna com gap-4; passe "grid sm:grid-cols-2" etc.).
  contentClassName?: string;
}) {
  const shell = "flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-5";
  const extras = (
    <>
      {badge ? <Badge variant="warning">{badge}</Badge> : null}
      {count ? (
        <span className="crm-meta font-sans tracking-normal normal-case">{count}</span>
      ) : null}
    </>
  );
  const body = (
    <>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      <div className={cn("flex flex-col gap-4", contentClassName)}>{children}</div>
    </>
  );
  if (collapsible) {
    return (
      <details id={id} open={defaultOpen} className={cn("group", shell, className)}>
        <summary className="crm-h2 flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-120 group-open:rotate-90"
            aria-hidden="true"
          />
          <h2 className="min-w-0 flex-1">{title}</h2>
          {extras}
        </summary>
        <div className="flex flex-col gap-4">{body}</div>
      </details>
    );
  }
  return (
    <fieldset id={id} className={cn(shell, className)}>
      <legend className="crm-h2 flex items-center gap-2 px-1">
        <span>{title}</span>
        {extras}
      </legend>
      {body}
    </fieldset>
  );
}
