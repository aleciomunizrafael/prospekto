import { cn } from "@/lib/utils";

// Lista numerada 01 a 07 (seção 7.4): número em acento, título em negrito, texto curto.
export type NumberedItem = { title: string; text: string };

type Props = {
  items: NumberedItem[];
  columns?: 1 | 2 | 3;
  className?: string;
};

export function NumberedList({ items, columns = 1, className }: Props) {
  return (
    <ol
      className={cn(
        "grid gap-6",
        columns === 2 && "md:grid-cols-2",
        columns === 3 && "md:grid-cols-3",
        className,
      )}
    >
      {items.map((item, i) => (
        <li key={item.title} className="flex gap-4">
          <span className="text-brand tabular shrink-0 font-[family-name:var(--font-heading)] text-2xl font-semibold leading-none">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{item.title}</p>
            <p className="text-muted-foreground">{item.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
