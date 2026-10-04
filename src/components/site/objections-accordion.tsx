// Acordeão de objeções (seção 7.4 e 7.6): details/summary nativos (ADR-001: nativo quando basta).
// O summary já expõe o estado expandido ao leitor de tela; aria-controls liga pergunta e resposta.
// A resposta cita a fonte quando houver número. Opcionalmente publica o JSON-LD FAQPage (seção 6.3).
export type Objection = {
  id: string;
  question: string;
  // Parágrafos separados por linha em branco.
  answer: string;
  source?: string;
};

type Props = {
  items: Objection[];
  jsonLd?: boolean;
};

export function ObjectionsAccordion({ items, jsonLd = false }: Props) {
  const faq = jsonLd
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.source ? `${item.answer}\n\nFonte: ${item.source}` : item.answer,
          },
        })),
      }
    : null;
  return (
    <div className="divide-border border-border divide-y rounded-lg border">
      {items.map((item) => (
        <details key={item.id} className="group">
          <summary
            aria-controls={`objecao-${item.id}`}
            className="touch-target flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 font-semibold [&::-webkit-details-marker]:hidden"
          >
            <span>{item.question}</span>
            <span aria-hidden="true" className="text-brand shrink-0 group-open:rotate-45">
              +
            </span>
          </summary>
          <div
            id={`objecao-${item.id}`}
            className="text-muted-foreground flex flex-col gap-3 px-4 pb-5"
          >
            {item.answer.split(/\n\s*\n/).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
            {item.source ? <p className="text-[13px]">Fonte: {item.source}</p> : null}
          </div>
        </details>
      ))}
      {faq ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, "\\u003c") }}
        />
      ) : null}
    </div>
  );
}
