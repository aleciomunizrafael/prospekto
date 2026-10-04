import type { Metadata } from "next";
import { CtaLink } from "@/components/analytics/track-link";
import { GuideForm } from "@/components/site/lead-forms/guide-form";
import { NumberedList } from "@/components/site/numbered-list";
import { SectionHeader } from "@/components/site/section-header";
import { site } from "@/config/site";

// Guia gratuito (docs/site/estrutura-e-copy.md, seções 4.6 e 10.3). Até a edição revisada ser
// aprovada (site.guide.available = false), publica o bloco "em breve" com captura de e-mail.
export const metadata: Metadata = {
  title: { absolute: "Guia gratuito Contabilizando Cultura · Prospekto" },
  description:
    "Guia prático para empresas e contadores: como funciona a Lei Rouanet, mitos, passo a passo e limites de dedução. Baixe grátis.",
  alternates: { canonical: "/guia" },
};

// Sumário do guia (docs/fontes/materiais/contabilizando-cultura-guia-gratuito.txt). A edição
// revisada mantém a estrutura e corrige os números (seção 10.3) [verificar na edição revisada].
const topics = [
  {
    title: "Apresentação",
    text: "Para quem é o guia e o que ele resolve: segurança jurídica e clareza operacional.",
  },
  {
    title: "O que é a Lei Rouanet",
    text: "O mecanismo, a base legal e os dois mitos mais comuns, com o que diz a lei.",
  },
  {
    title: "Por que investir em cultura",
    text: "A perspectiva empresarial e o peso econômico do setor criativo, com fontes.",
  },
  {
    title: "Como funciona na prática",
    text: "O passo a passo em seis etapas para empresas no lucro real e a oportunidade para pessoas físicas.",
  },
  {
    title: "Para contadores",
    text: "Fundamentação técnica, limites de dedução e a tabela da cesta de incentivos.",
  },
  {
    title: "O papel do escritório contábil",
    text: "Divisão clara de competências entre a Prospekto e o escritório; vantagens para o contador.",
  },
];

export default function GuiaPage() {
  const available = site.guide.available;
  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-16 pb-12 md:pt-24 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <SectionHeader
            as="h1"
            label="Guia gratuito"
            title="Contabilizando Cultura: transforme impostos em impacto cultural."
            subtitle={
              available ? (
                <>
                  <p>
                    Guia prático para empresários, gestores financeiros e contadores. Entenda, com
                    segurança jurídica e clareza operacional, como direcionar parte do imposto de
                    renda devido para projetos culturais.
                  </p>
                  <p className="text-[14px]">
                    Edição revisada em {site.guide.version}, com fontes. PDF com texto selecionável.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Guia prático para empresários, gestores financeiros e contadores. Entenda, com
                    segurança jurídica e clareza operacional, como direcionar parte do imposto de
                    renda devido para projetos culturais.
                  </p>
                  <p className="text-foreground font-medium">
                    Edição revisada em breve. Deixe seu e-mail e avisamos quando estiver disponível.
                  </p>
                </>
              )
            }
          />
          <div
            aria-hidden="true"
            className="bg-sand border-border flex aspect-[3/4] w-full max-w-[14rem] flex-col justify-between rounded-lg border p-5"
          >
            <span className="site-label">Prospekto</span>
            <span className="font-[family-name:var(--font-heading)] text-2xl font-semibold leading-tight">
              Contabilizando Cultura
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <h2 id="guia-form-titulo" className="site-h3">
            {available ? "Baixar o guia" : "Avisar quando a edição revisada estiver disponível"}
          </h2>
          <GuideForm titleId="guia-form-titulo" />
        </div>
      </section>

      <section aria-labelledby="para-quem-guia" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24">
          <SectionHeader
            id="para-quem-guia"
            label="Para quem é"
            title="Empresários, gestores financeiros e contadores."
          />
          <ul className="grid gap-6 md:grid-cols-3">
            <li className="border-border bg-background flex flex-col gap-2 rounded-lg border p-5">
              <h3 className="site-h3">Empresários e gestores</h3>
              <p className="text-muted-foreground">
                Quem decide o destino de até 4% do IRPJ devido e quer entender o processo antes de
                falar com o contador.
              </p>
            </li>
            <li className="border-border bg-background flex flex-col gap-2 rounded-lg border p-5">
              <h3 className="site-h3">Gestores financeiros</h3>
              <p className="text-muted-foreground">
                Quem precisa do passo a passo: termo, depósito identificado, recibo, lançamento no
                DARF e na ECF.
              </p>
            </li>
            <li className="border-border bg-background flex flex-col gap-2 rounded-lg border p-5">
              <h3 className="site-h3">Contadores</h3>
              <p className="text-muted-foreground">
                Quem quer a base legal, os limites de dedução e a divisão de competências com a
                Prospekto.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="o-que-tem"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24"
      >
        <SectionHeader id="o-que-tem" label="O que tem dentro" title="Seis tópicos do sumário." />
        <NumberedList items={topics} columns={2} />
        <p className="text-muted-foreground text-[14px]">{site.disclaimer}</p>
        <div>
          <CtaLink href="/simulador" ctaId="guide_simulate" variant="outline">
            Enquanto isso, simule quanto cabe na sua empresa
          </CtaLink>
        </div>
      </section>
    </>
  );
}
