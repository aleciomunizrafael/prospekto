// Bloco de número: número em serifa grande, legenda curta e nota de fonte com link (seção 7.4).
// A fonte aponta para a lista de notas da própria página (`#fonte-N`), como manda a seção 4.
type Props = {
  value: string;
  caption: string;
  source?: { ref: number; label: string };
};

export function NumberBlock({ value, caption, source }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="site-number">{value}</p>
      <p className="text-foreground max-w-[30ch] leading-snug">{caption}</p>
      {source ? (
        <p className="text-muted-foreground text-[13px] leading-snug">
          <a href={`#fonte-${source.ref}`} className="underline underline-offset-4">
            Fonte {source.ref}: {source.label}
          </a>
        </p>
      ) : null}
    </div>
  );
}

// Lista de notas de rodapé das fontes citadas nos números (seção 13 de estrutura-e-copy.md).
export type SourceNote = { ref: number; label: string; href?: string; note?: string };

export function SourceNotes({ sources, id = "fontes" }: { sources: SourceNote[]; id?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3">
      <h2 id={`${id}-titulo`} className="site-h3">
        Fontes dos números
      </h2>
      <ol className="text-muted-foreground flex flex-col gap-2 text-[14px] leading-snug">
        {sources.map((s) => (
          <li key={s.ref} id={`fonte-${s.ref}`} className="flex gap-2">
            <span className="text-brand tabular shrink-0 font-semibold">{s.ref}.</span>
            <span>
              {s.href ? (
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {s.label}
                </a>
              ) : (
                s.label
              )}
              {s.note ? ` ${s.note}` : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
