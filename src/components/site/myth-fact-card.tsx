// Cartão mito e fato (seção 7.4): "Mito" em cinza com risco leve, "Fato" em grafite; sem ícones.
// O risco é só visual: o leitor de tela recebe os rótulos "Mito" e "Fato".
type Props = {
  myth: string;
  fact: string;
  // Números das fontes citadas no fato (lista `#fonte-N` da página).
  sourceRefs?: number[];
};

export function MythFactCard({ myth, fact, sourceRefs }: Props) {
  return (
    <article className="bg-background border-border flex flex-col gap-4 rounded-lg border p-6">
      <div className="flex flex-col gap-1">
        <p className="site-label text-muted-foreground">Mito</p>
        <p className="text-muted-foreground decoration-border line-through decoration-1">{myth}</p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="site-label">Fato</p>
        <p className="text-foreground">
          {fact}
          {sourceRefs?.length ? (
            <>
              {" "}
              <span className="text-muted-foreground text-[13px]">
                (
                {sourceRefs.map((ref, i) => (
                  <span key={ref}>
                    {i > 0 ? ", " : null}
                    <a href={`#fonte-${ref}`} className="underline underline-offset-4">
                      fonte {ref}
                    </a>
                  </span>
                ))}
                )
              </span>
            </>
          ) : null}
        </p>
      </div>
    </article>
  );
}
