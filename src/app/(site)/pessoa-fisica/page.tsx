import type { Metadata } from "next";
import { CtaLink } from "@/components/analytics/track-link";
import { DeadlineBanner } from "@/components/site/deadline-banner";
import { LegalDisclaimer } from "@/components/site/legal-disclaimer";
import { NumberBlock, SourceNotes } from "@/components/site/number-block";
import { NumberedList } from "@/components/site/numbered-list";
import { ObjectionsAccordion, type Objection } from "@/components/site/objections-accordion";
import { SectionHeader } from "@/components/site/section-header";
import { PESSOA_FISICA_SOURCES } from "@/components/site/segment-sources";
import { WhatsappButton } from "@/components/site/whatsapp-button";
import { site } from "@/config/site";

// Para pessoas físicas (docs/site/estrutura-e-copy.md, seção 4.4). Página estática.
export const metadata: Metadata = {
  title: { absolute: "Destine até 6% do seu IR para cultura · Prospekto" },
  description:
    "Quem declara pelo modelo completo pode destinar até 6% do imposto devido a projetos culturais. Simule, deposite até dezembro e declare com o recibo.",
  alternates: { canonical: "/pessoa-fisica" },
};

const examples = [
  ["R$ 20.000", "R$ 1.200", "R$ 1.400"],
  ["R$ 80.000", "R$ 4.800", "R$ 5.600"],
];

const steps = [
  {
    title: "Calcule",
    text: "Estime o imposto devido do ano (holerites, carnê-leão, ganhos) e aplique 6%. O simulador faz isso para você.",
  },
  {
    title: "Deposite",
    text: "Transferência identificada com o seu CPF para a conta vinculada do projeto, até o último dia útil bancário de dezembro. A Prospekto envia os dados e confirma o depósito.",
  },
  {
    title: "Declare",
    text: 'Você recebe o recibo de mecenato e informa o valor na ficha "Doações Efetuadas" da declaração do ano seguinte. Enviamos a instrução para o seu contador.',
  },
];

const objections: Objection[] = [
  {
    id: "pouco",
    question: "É pouco dinheiro. Vale a pena?",
    answer:
      "O valor sai do imposto, não do bolso. Somado a outros apoiadores, fecha uma cota de um projeto da sua cidade, com o seu nome quando o projeto prevê reconhecimento.",
  },
  {
    id: "malha",
    question: "Vou cair na malha fina?",
    answer:
      'O recibo de mecenato é o documento oficial que comprova o aporte. Ele vai na ficha "Doações Efetuadas", no código de incentivo à cultura. Enviamos o recibo e a instrução ao seu contador.',
  },
  {
    id: "contador",
    question: "Meu contador faz minha declaração; não quero mexer.",
    answer:
      "Não precisa. Mandamos o recibo e o passo a passo direto para quem faz a sua declaração.",
  },
  {
    id: "na-declaracao",
    question: "Posso doar na hora de declarar, como no fundo da criança?",
    answer:
      "Para cultura, não. A opção de doar na própria declaração existe só para os fundos da criança e do idoso (até 3%). Para cultura, o depósito precisa acontecer até dezembro do ano-calendário.",
    source: "Lei 9.250/1995, art. 12 (fonte 8)",
  },
  {
    id: "simplificado",
    question: "Declaro pelo modelo simplificado.",
    answer:
      "O modelo simplificado não permite deduzir incentivos. Vale conferir com o contador qual modelo compensa mais no seu caso.",
  },
];

export default function PessoaFisicaPage() {
  const year = new Date().getFullYear();
  return (
    <>
      {/* Topo */}
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-16 pb-12 md:pt-24">
        <SectionHeader
          as="h1"
          label="Para quem declara pelo modelo completo"
          title="Até 6% do seu imposto de renda pode virar um projeto cultural na sua cidade."
          subtitle="Pessoas físicas que entregam a declaração pelo modelo completo podem destinar parte do imposto devido a projetos culturais aprovados. O procedimento é direto: simular o imposto, transferir o valor para a conta do projeto até o último dia útil bancário de dezembro e informar na declaração do ano seguinte."
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <CtaLink href="/simulador?tipo=pf" ctaId="pf_hero_simulate">
            Simular meu limite
          </CtaLink>
          <CtaLink href="/projetos" ctaId="pf_hero_projects" variant="outline">
            Ver projetos abertos a pessoa física
          </CtaLink>
        </div>
      </section>

      <DeadlineBanner />

      {/* Quanto é */}
      <section aria-labelledby="quanto-e" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24">
          <SectionHeader id="quanto-e" label="A conta" title="Quanto é" />
          <table className="border-border bg-background w-full max-w-2xl border-collapse rounded-lg border text-[15px]">
            <caption className="sr-only">Exemplos de limite de dedução para pessoa física</caption>
            <thead className="bg-sand text-left">
              <tr>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Imposto devido na declaração
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Limite (6%)
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Com esporte (7%)
                </th>
              </tr>
            </thead>
            <tbody>
              {examples.map(([tax, limit, sport]) => (
                <tr key={tax} className="border-border border-t">
                  <th scope="row" className="tabular px-3 py-3 text-left font-semibold">
                    {tax}
                  </th>
                  <td className="tabular text-muted-foreground px-3 py-3">{limit}</td>
                  <td className="tabular text-muted-foreground px-3 py-3">{sport}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="site-prose max-w-[70ch]">
            O limite de 6% é compartilhado entre cultura, audiovisual, fundo da criança e fundo do
            idoso (Lei 9.532/1997, art. 22). Se você já doa para o fundo da criança, o que sobrar
            pode ir para cultura.{" "}
            <a
              href="#fonte-8"
              className="text-muted-foreground text-[13px] underline underline-offset-4"
            >
              fonte 8
            </a>
          </p>
        </div>
      </section>

      {/* Como funciona */}
      <section
        aria-labelledby="como-funciona"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24"
      >
        <SectionHeader id="como-funciona" label="Como funciona" title="Três passos" />
        <NumberedList items={steps} columns={3} />
      </section>

      {/* Objeções */}
      <section aria-labelledby="objecoes" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24">
          <SectionHeader id="objecoes" label="Perguntas que ouvimos" title="Objeções respondidas" />
          <div className="bg-background rounded-lg">
            <ObjectionsAccordion items={objections} jsonLd />
          </div>
        </div>
      </section>

      {/* Só 0,03% */}
      <section
        aria-labelledby="poucos"
        className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24"
      >
        <h2 id="poucos" className="sr-only">
          Quantas pessoas usam o incentivo
        </h2>
        <NumberBlock
          value="0,03%"
          caption="dos contribuintes usam esse benefício: 13.580 pessoas físicas em 2025, entre 43,3 milhões de declarações."
          source={{ ref: 5, label: "SALIC via Times Brasil/CNBC; Receita Federal (fonte 6)" }}
        />
        <div className="flex flex-col gap-3">
          <p className="site-label">Prazo</p>
          <p className="site-h3">Depósito até o último dia útil bancário de dezembro de {year}.</p>
          <p className="text-muted-foreground text-[15px]">
            Em novembro e dezembro, a faixa no topo da página mostra os dias úteis bancários que
            faltam.
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section aria-labelledby="cta-final" className="bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16 md:py-20">
          <h2 id="cta-final" className="site-h2 max-w-[24ch]">
            Quanto do seu imposto pode virar cultura este ano?
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <CtaLink
              href="/simulador?tipo=pf"
              ctaId="pf_final_simulate"
              className="bg-background text-primary hover:bg-background/90"
            >
              Simular meu limite
            </CtaLink>
            <WhatsappButton
              message={site.whatsappMessages.pessoaFisica}
              label="Falar no WhatsApp"
              context="page"
              className="border-primary-foreground/60 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12">
        <LegalDisclaimer />
        <SourceNotes sources={PESSOA_FISICA_SOURCES} />
      </div>
    </>
  );
}
