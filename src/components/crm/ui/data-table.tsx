import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Tabela do CRM (crm-design-system.md, seção 5.2, decisões D9 e D10). Server Component: as
// funções de coluna rodam no servidor. No desktop é uma Table dentro de um Card; abaixo de `md`
// vira uma lista de cards com `primary`, `secondary`, `trailing` e `action`. A linha inteira abre
// o registro pelo link do nome (`RowLink`, classe `row-link`): o primeiro <td> e o <li> do card
// são `relative`; botões e outros links da linha precisam de `relative z-10` para ficar por cima.
// No celular `primary` já é envolvido pelo `RowLink`; no desktop a página coloca o `RowLink` na
// primeira coluna.
export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  // Largura da coluna no desktop (classe Tailwind, ex.: "w-40").
  width?: string;
  // 1 sempre visível; 2 a partir de md; 3 a partir de xl.
  priority?: 1 | 2 | 3;
  sort?: { param: string; value: string; active?: "asc" | "desc"; href?: string };
};

export type DataTableMobile<T> = {
  primary: (row: T) => ReactNode;
  secondary: (row: T) => ReactNode;
  trailing?: (row: T) => ReactNode;
  action?: (row: T) => ReactNode;
};

const PRIORITY_CLASS: Record<1 | 2 | 3, string> = {
  1: "",
  2: "hidden md:table-cell",
  3: "hidden xl:table-cell",
};

export function RowLink({
  href,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href" | "className"> & {
  href: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("row-link font-medium", className)} {...props}>
      {children}
    </Link>
  );
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowHref,
  rowKey,
  rowClassName,
  mobile,
  empty,
  density = "default",
  footer,
  className,
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowHref: (row: T) => string;
  rowKey: (row: T) => string;
  rowClassName?: (row: T) => string | undefined;
  mobile: DataTableMobile<T>;
  empty: ReactNode;
  density?: "default" | "compact";
  footer?: ReactNode;
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className={className}>
        <Card className="p-0">{empty}</Card>
        {footer}
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Card className="hidden overflow-hidden p-0 md:block">
        <Table density={density}>
          <caption className="sr-only">{caption}</caption>
          <TableHeader>
            <TableRow className="hover:bg-surface-2 focus-within:bg-surface-2">
              {columns.map((col) => {
                const sort = col.sort;
                const SortIcon =
                  sort?.active === "asc"
                    ? ArrowUp
                    : sort?.active === "desc"
                      ? ArrowDown
                      : ArrowUpDown;
                return (
                  <TableHead
                    key={col.key}
                    scope="col"
                    aria-sort={
                      sort?.active === "asc"
                        ? "ascending"
                        : sort?.active === "desc"
                          ? "descending"
                          : undefined
                    }
                    className={cn(
                      PRIORITY_CLASS[col.priority ?? 1],
                      col.align === "right" && "text-right",
                      col.width,
                    )}
                  >
                    {sort ? (
                      <Link
                        href={sort.href ?? `?${sort.param}=${encodeURIComponent(sort.value)}`}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-sm hover:text-foreground",
                          sort.active && "text-foreground",
                        )}
                      >
                        {col.header}
                        <SortIcon className="size-3.5" aria-hidden="true" />
                      </Link>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={rowKey(row)} className={cn("h-11", rowClassName?.(row))}>
                {columns.map((col, i) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      "whitespace-normal",
                      i === 0 && "relative",
                      PRIORITY_CLASS[col.priority ?? 1],
                      col.align === "right" && "text-right tabular-nums",
                    )}
                  >
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <ul className="flex flex-col gap-2 md:hidden" aria-label={caption}>
        {rows.map((row) => {
          const trailing = mobile.trailing?.(row);
          const action = mobile.action?.(row);
          return (
            <li
              key={rowKey(row)}
              className={cn(
                "relative flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors duration-120 focus-within:bg-primary-soft",
                rowClassName?.(row),
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <RowLink href={rowHref(row)} className="text-sm">
                  {mobile.primary(row)}
                </RowLink>
                <div className="crm-meta flex flex-wrap items-center gap-x-2 gap-y-1">
                  {mobile.secondary(row)}
                </div>
              </div>
              {trailing ? (
                <div className="flex min-w-0 shrink flex-col items-end gap-1 text-right text-sm">
                  {trailing}
                </div>
              ) : null}
              {action ? <div className="relative z-10 shrink-0">{action}</div> : null}
            </li>
          );
        })}
      </ul>
      {footer}
    </div>
  );
}
