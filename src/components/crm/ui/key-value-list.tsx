import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Lista rótulo/valor (crm-design-system.md, seção 5.2, princípio 4): mostra o que existe e
// esconde o que não existe; os vazios ficam num <details> "Mostrar todos os campos (14 sem valor)".
// Substitui os Row/Item locais de lead, organização, projeto e aporte.
export type KeyValueItem = {
  label: ReactNode;
  value: ReactNode | null | undefined;
  // Valor em fonte mono (CNPJ, nº de processo, recibo, slug).
  code?: boolean;
  href?: string;
  // Nota curta ao lado do valor ("necessário para o termo").
  hint?: ReactNode;
};

function isEmpty(value: ReactNode | null | undefined): boolean {
  return (
    value === null ||
    value === undefined ||
    value === false ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

const COLUMNS: Record<1 | 2 | 3, string> = {
  1: "grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
};

const SPAN: Record<1 | 2 | 3, string> = {
  1: "",
  2: "sm:col-span-2",
  3: "sm:col-span-2 lg:col-span-3",
};

function Pair({ item, emptyLabel }: { item: KeyValueItem; emptyLabel: string }) {
  const empty = isEmpty(item.value);
  const content = empty ? (
    <span className="text-muted-foreground">{emptyLabel}</span>
  ) : item.href ? (
    <Link href={item.href} className="text-primary underline-offset-2 hover:underline">
      {item.value}
    </Link>
  ) : (
    item.value
  );
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="crm-eyebrow">{item.label}</dt>
      <dd className={cn("text-sm break-words", item.code && !empty && "crm-code")}>
        {content}
        {item.hint ? <span className="crm-meta ml-1.5">· {item.hint}</span> : null}
      </dd>
    </div>
  );
}

export function KeyValueList({
  items,
  columns = 2,
  hideEmpty = true,
  emptyLabel = "não informado",
  className,
}: {
  items: KeyValueItem[];
  columns?: 1 | 2 | 3;
  hideEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  const filled = hideEmpty ? items.filter((i) => !isEmpty(i.value)) : items;
  const empties = hideEmpty ? items.filter((i) => isEmpty(i.value)) : [];
  return (
    <dl className={cn("grid gap-x-6 gap-y-3", COLUMNS[columns], className)}>
      {filled.map((item, i) => (
        <Pair key={i} item={item} emptyLabel={emptyLabel} />
      ))}
      {filled.length === 0 && empties.length === 0 ? (
        <div className={cn("text-sm text-muted-foreground", SPAN[columns])}>Nada registrado.</div>
      ) : null}
      {empties.length > 0 ? (
        <details className={cn("group", SPAN[columns])}>
          <summary className="cursor-pointer list-none text-sm text-muted-foreground underline-offset-2 hover:underline">
            <span className="group-open:hidden">
              Mostrar todos os campos ({plural(empties.length, "sem valor", "sem valor")})
            </span>
            <span className="hidden group-open:inline">Esconder os campos sem valor</span>
          </summary>
          <div className={cn("mt-3 grid gap-x-6 gap-y-3", COLUMNS[columns])}>
            {empties.map((item, i) => (
              <Pair key={i} item={item} emptyLabel={emptyLabel} />
            ))}
          </div>
        </details>
      ) : null}
    </dl>
  );
}
