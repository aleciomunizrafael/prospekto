import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Cabeçalho de página (crm-design-system.md, seção 5.2): eyebrow, h1 em serifa, descrição, linha
// de `meta` (badges, SLA) e ações, sempre na mesma ordem: secundárias (outline) › `more` (o "⋯"
// da página, com as ações raras ou destrutivas) › primária (azul, à direita). Uma ação primária
// por tela (decisão D5); mais de três secundárias vão para um "⋯" automático. No celular as ações
// somem (`hidden md:flex`) e a ActionBarMobile do DetailLayout assume; `backHref` alimenta o
// "voltar" do header do shell.
export type PageHeaderCrumb = { label: string; href: string };

const MAX_INLINE_SECONDARY = 3;

export function PageHeader({
  title,
  eyebrow,
  description,
  breadcrumb,
  primary,
  secondary = [],
  more,
  meta,
  backHref,
  backLabel,
  actionsOnMobile = false,
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  breadcrumb?: PageHeaderCrumb[];
  primary?: ReactNode;
  secondary?: ReactNode[];
  // Menu "⋯" próprio da página (ex.: LeadMoreMenu), renderizado antes da primária.
  more?: ReactNode;
  meta?: ReactNode;
  backHref?: string;
  backLabel?: string;
  // Mantém as ações visíveis também no celular (listas sem ActionBarMobile).
  actionsOnMobile?: boolean;
  className?: string;
}) {
  const inline = secondary.slice(0, MAX_INLINE_SECONDARY);
  const overflow =
    secondary.length > MAX_INLINE_SECONDARY ? secondary.slice(MAX_INLINE_SECONDARY) : [];
  const hasActions = Boolean(primary) || Boolean(more) || secondary.length > 0;
  return (
    <header
      className={cn("flex flex-col gap-3 md:flex-row md:items-end md:justify-between", className)}
      data-back-href={backHref}
      data-back-label={backLabel}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {breadcrumb && breadcrumb.length > 0 ? (
          <Breadcrumb className="mb-1">
            <BreadcrumbList>
              {breadcrumb.map((crumb, i) => (
                <Fragment key={`${crumb.href}-${i}`}>
                  <BreadcrumbItem>
                    <BreadcrumbLink render={<Link href={crumb.href} />}>
                      {crumb.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </Fragment>
              ))}
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
        {eyebrow ? <p className="crm-eyebrow">{eyebrow}</p> : null}
        <h1 className="crm-h1">{title}</h1>
        {description ? (
          <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
        ) : null}
        {meta ? <div className="mt-1 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {hasActions ? (
        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center gap-2",
            actionsOnMobile ? "flex" : "hidden md:flex",
          )}
        >
          {inline.map((node, i) => (
            <span key={i} className="contents">
              {node}
            </span>
          ))}
          {overflow.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="icon" aria-label="Mais ações" />}
              >
                <Ellipsis />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {overflow.map((node, i) => (
                  <DropdownMenuItem key={i} closeOnClick={false} className="h-auto p-0">
                    {node}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {more}
          {primary}
        </div>
      ) : null}
    </header>
  );
}
