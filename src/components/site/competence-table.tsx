import type { ReactNode } from "react";

// Tabela de competências (seção 7.4): duas colunas com cabeçalho em areia; vira lista empilhada
// no celular. A tabela e a lista são o mesmo conteúdo; só uma é visível por largura.
export type CompetenceRow = { label: string; cells: [ReactNode, ReactNode] };

type Props = {
  caption: string;
  columns: [string, string];
  rows: CompetenceRow[];
};

export function CompetenceTable({ caption, columns, rows }: Props) {
  return (
    <>
      <table className="border-border hidden w-full border-collapse overflow-hidden rounded-lg border md:table">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-sand text-left">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              Etapa
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              {columns[0]}
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              {columns[1]}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-border border-t align-top">
              <th scope="row" className="px-4 py-3 text-left font-semibold">
                {row.label}
              </th>
              <td className="text-muted-foreground px-4 py-3">{row.cells[0]}</td>
              <td className="text-muted-foreground px-4 py-3">{row.cells[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="flex flex-col gap-4 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={row.label} className="border-border flex flex-col gap-2 rounded-lg border p-4">
            <p className="font-semibold">{row.label}</p>
            <dl className="flex flex-col gap-2">
              <div>
                <dt className="site-label text-[12px]">{columns[0]}</dt>
                <dd className="text-muted-foreground">{row.cells[0]}</dd>
              </div>
              <div>
                <dt className="site-label text-[12px]">{columns[1]}</dt>
                <dd className="text-muted-foreground">{row.cells[1]}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
