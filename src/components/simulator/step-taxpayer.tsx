"use client";

import { renderText, type TaxpayerType } from "@/lib/simulator";
import { formatIsoDate } from "./view-model";

// Tela 1 (simulador-spec.md, seção 10): dois cartões grandes, selecionáveis por teclado.
type Props = {
  parametersVersion: string;
  onSelect: (type: TaxpayerType) => void;
};

const CARDS: Array<{ type: TaxpayerType; tag: string; title: string; line: string }> = [
  { type: "pj", tag: "PJ", title: "Minha empresa", line: "tributada pelo lucro real" },
  { type: "pf", tag: "PF", title: "Eu, pessoa física", line: "declaração pelo modelo completo" },
];

export function TaxpayerStep({ parametersVersion, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2" role="group" aria-label="Quem está simulando">
        {CARDS.map((card) => (
          <button
            key={card.type}
            type="button"
            onClick={() => onSelect(card.type)}
            className="border-border bg-background hover:border-primary focus-visible:border-primary flex min-h-40 flex-col items-start gap-3 rounded-lg border-2 p-6 text-left"
          >
            <span className="site-label" aria-hidden="true">
              {card.tag}
            </span>
            <span className="site-h3">{card.title}</span>
            <span className="text-muted-foreground">{card.line}</span>
          </button>
        ))}
      </div>
      <p className="text-muted-foreground">
        Não sabe o regime da empresa? Escolha &quot;Minha empresa&quot; e marque &quot;não sei&quot;
        no próximo passo.
      </p>
      <p className="text-muted-foreground text-[14px]">
        {renderText("disclaimer_main", { atualizado_em: formatIsoDate(parametersVersion) })}{" "}
        <a href="#nota-tecnica" className="underline underline-offset-4">
          Nota técnica e fontes
        </a>
        .
      </p>
    </div>
  );
}
