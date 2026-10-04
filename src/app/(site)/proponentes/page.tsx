import type { Metadata } from "next";
import { CtaLink } from "@/components/analytics/track-link";
import { ProponentForm } from "@/components/site/lead-forms/proponent-form";
import { LegalDisclaimer } from "@/components/site/legal-disclaimer";
import { SourceNotes } from "@/components/site/number-block";
import { NumberedList } from "@/components/site/numbered-list";
import { ObjectionsAccordion, type Objection } from "@/components/site/objections-accordion";
import { SectionHeader } from "@/components/site/section-header";
import { PROPONENTES_SOURCES } from "@/components/site/segment-sources";
import { WhatsappButton } from "@/components/site/whatsapp-button";
import { site } from "@/config/site";

// Para proponentes (docs/site/estrutura-e-copy.md, seção 4.6; formulário da seção 5.5). Estática.
export const metadata: Metadata = {
  title: { absolute: "Captação para projetos culturais aprovados · Prospekto" },
  description:
    "Projeto com portaria vigente e saldo a captar? A Prospekto capta junto a empresas e contadores da região, dentro do limite legal. Envie para avaliação.",
  alternates: { canonical: "/proponentes" },
};

const criteria = [
  {
    title: "Portaria vigente",
    text: "Autorização de captação publicada e dentro do prazo (SALIC, Ancine ou Pró-Cultura RS).",
  },
  {
    title: "Saldo entre R$ 100 mil e R$ 1,5 milhão",
    text: "Faixa em que a captação regional fecha cotas com empresas do lucro real e pessoas físicas.",
  },
  {
    title: "Apelo regional",
    text: "Projeto que acontece ou dialoga com a Serra Gaúcha e o RS: é o que o patrocinador local quer ver.",
  },
  { title: "Prestação de contas em dia", text: "Proponente sem pendência em projetos anteriores." },
];

const steps = [
  {
    title: "Envio",
    text: "Formulário abaixo, com link para portaria, orçamento e deck, se houver.",
  },
  {
    title: "Parecer de captabilidade",
    text: "Uma página, em até 10 dias úteis: o que favorece a captação e o que precisa ser ajustado.",
  },
  {
    title: "Contrato",
    text: "Captação remunerada dentro do limite legal, só sobre o valor captado.",
  },
  {
    title: "Deck e cotas",
    text: "Apresentação do projeto e cotas de patrocínio com contrapartidas claras.",
  },
  {
    title: "Captação",
    text: "Apresentação a empresas e contadores da região, com a conta do limite pronta para cada patrocinador.",
  },
  {
    title: "Recibos e contrapartidas",
    text: "Depósito identificado, recibo de mecenato e entrega das contrapartidas acompanhadas.",
  },
];

const objections: Objection[] = [
  {
    id: "captador",
    question: "Já tenho captador.",
    answer:
      "A captação pode ser compartilhada por região ou por cota, com o limite legal respeitado no total. Conte como está o contrato atual e avaliamos.",
  },
  {
    id: "caro",
    question: "10% é caro.",
    answer:
      "É o teto legal da rubrica de captação, pago só sobre o que entra (IN MinC 29/2026, art. 19). Sem captação, a rubrica não é usada e o projeto não sai do papel.",
    source: "IN MinC 29/2026, art. 19 (fonte 12)",
  },
  {
    id: "musica-popular",
    question: "Música popular não cabe no art. 18.",
    answer:
      "Música popular entra pelo art. 26, com dedução parcial, ou por outros mecanismos. Projetos de música erudita ou instrumental e artes cênicas têm o art. 18, com dedução integral. O parecer indica o melhor enquadramento.",
    source: "Lei 8.313/1991, arts. 18 e 26 (fonte 8)",
  },
];

export default function ProponentesPage() {
  return (
    <>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-16 pb-12 md:pt-24">
        <SectionHeader
          as="h1"
          label="Para proponentes e produtoras"
          title="Projeto aprovado precisa de patrocinador. Nós buscamos."
          subtitle="Captação dentro do limite legal: até 10% do projeto, com teto de R$ 150 mil, paga só sobre o valor captado (IN MinC 29/2026, art. 19). A Prospekto apresenta o projeto a empresas no lucro real e a contadores da região, formaliza o termo, acompanha o depósito e emite o recibo."
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <CtaLink href="#enviar-projeto" ctaId="proponentes_hero_submit">
            Enviar meu projeto para avaliação
          </CtaLink>
          <CtaLink href="/projetos" ctaId="proponentes_hero_projects" variant="outline">
            Ver a carteira
          </CtaLink>
        </div>
      </section>

      <section aria-labelledby="quem-entra" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24">
          <SectionHeader id="quem-entra" label="Critérios" title="Quem entra na carteira" />
          <NumberedList items={criteria} columns={2} />
        </div>
      </section>

      <section
        aria-labelledby="como-funciona"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24"
      >
        <SectionHeader id="como-funciona" label="Como funciona" title="Do envio ao recibo" />
        <NumberedList items={steps} columns={2} />
      </section>

      <section aria-labelledby="sem-projeto" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16 md:py-24">
          <SectionHeader
            id="sem-projeto"
            label="Ainda não tem projeto?"
            title="Elaboração e inscrição são um serviço à parte."
            subtitle="A janela de inscrição no SALIC vai de 1º de fevereiro a 31 de outubro. Se o projeto ainda é ideia ou está em elaboração, envie mesmo assim: o parecer diz o que falta para inscrever."
          />
          <CtaLink
            href="/mentoria"
            ctaId="proponentes_mentoria"
            variant="link"
            className="self-start"
          >
            Quer aprender a escrever e inscrever? Conheça a mentoria
          </CtaLink>
        </div>
      </section>

      <section
        aria-labelledby="objecoes"
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24"
      >
        <SectionHeader id="objecoes" label="Perguntas que ouvimos" title="Objeções respondidas" />
        <ObjectionsAccordion items={objections} jsonLd />
      </section>

      <section aria-labelledby="enviar-projeto" className="bg-sand scroll-mt-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-8">
            <SectionHeader
              id="enviar-projeto"
              label="Avaliação"
              title="Envie seu projeto."
              subtitle="Sem upload nesta etapa: use um link para a pasta com portaria, orçamento e deck. Campos marcados com (obrigatório) precisam ser preenchidos."
            />
            <div className="border-border bg-background flex flex-col gap-2 rounded-lg border p-5">
              <p className="site-label">Checklist de projeto captável</p>
              <p className="text-muted-foreground">
                PDF com os itens que um patrocinador e o contador dele olham antes de dizer sim. [a
                produzir] Quem envia o projeto recebe o checklist por e-mail quando estiver pronto.
              </p>
            </div>
            <WhatsappButton
              message={site.whatsappMessages.proponentes}
              label="Prefere falar primeiro? WhatsApp"
              context="page"
              className="self-start"
            />
          </div>
          <ProponentForm titleId="enviar-projeto" />
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12">
        <LegalDisclaimer />
        <SourceNotes sources={PROPONENTES_SOURCES} />
      </div>
    </>
  );
}
