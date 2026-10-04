import type { Metadata } from "next";
import { CtaLink } from "@/components/analytics/track-link";
import { MunicipalityForm } from "@/components/site/lead-forms/municipality-form";
import { LegalDisclaimer } from "@/components/site/legal-disclaimer";
import { NumberedList } from "@/components/site/numbered-list";
import { ObjectionsAccordion, type Objection } from "@/components/site/objections-accordion";
import { SectionHeader } from "@/components/site/section-header";
import { WhatsappButton } from "@/components/site/whatsapp-button";
import { site } from "@/config/site";

// Para municípios (docs/site/estrutura-e-copy.md, seção 4.6; formulário da seção 5.5). Estática.
export const metadata: Metadata = {
  title: { absolute: "Consultoria em fomento cultural para municípios · Prospekto" },
  description:
    "PNAB, editais, prestação de contas e leis municipais de incentivo. Consultoria para secretarias de cultura da Serra Gaúcha e do RS.",
  alternates: { canonical: "/municipios" },
};

const questions = [
  {
    title: "Quais recursos existem para o município?",
    text: "PNAB (Política Nacional Aldir Blanc) com ciclos anuais, editais estaduais e federais, a LIC-RS para projetos do próprio município e a Lei Rouanet para projetos de proponentes locais. Cada um com prazo, contrapartida e prestação de contas próprios.",
  },
  {
    title: "O que precisa estar pronto?",
    text: "Plano de ação aprovado, conselho e fundo municipal de cultura ativos, dotação orçamentária, comissão de seleção e um calendário que caiba na LDO e na LOA. Sem isso, o recurso chega e volta.",
  },
  {
    title: "Como organizar o calendário?",
    text: "Começar pelo que vence primeiro: PNAB e editais com saldo a executar; depois o orçamento do ano seguinte (LDO até 15/04, LOA até 31/08); por fim a lei municipal de incentivo e os projetos próprios.",
  },
];

const services = [
  {
    title: "Plano de ação PNAB",
    text: "Elaboração, revisão e execução do plano de ação, com os prazos do ciclo e a prestação de contas na plataforma federal.",
  },
  {
    title: "Editais e comissões",
    text: "Redação de editais, formação de comissões de seleção, critérios objetivos e cronograma executável.",
  },
  {
    title: "Prestação de contas",
    text: "Acompanhamento dos projetos selecionados e organização da prestação de contas do município e dos proponentes.",
  },
  {
    title: "Projetos próprios",
    text: "Inscrição de projetos do município na LIC-RS e na Lei Rouanet, com captação junto a empresas locais.",
  },
  {
    title: "Lei municipal de incentivo",
    text: "Minuta, tramitação e regulamentação, com Caxias do Sul como referência regional.",
  },
  {
    title: "Aproximação com empresas locais",
    text: "Mapeamento das empresas no lucro real do município e agenda de apresentação dos projetos culturais locais.",
  },
];

const calendar = [
  {
    title: "Até 15 de abril",
    text: "LDO (Lei de Diretrizes Orçamentárias): prioridades e metas de cultura do ano seguinte.",
  },
  {
    title: "Até 31 de agosto",
    text: "LOA (Lei Orçamentária Anual): dotação do fundo municipal e da contrapartida.",
  },
  {
    title: "Prazos da PNAB",
    text: "Adesão, plano de ação, execução e prestação de contas conforme o ciclo vigente [verificar datas do ciclo].",
  },
  {
    title: "Editais da LIC-RS",
    text: "Inscrição de projetos do município conforme o calendário do Pró-Cultura RS [verificar].",
  },
];

const objections: Objection[] = [
  {
    id: "orcamento",
    question: "Não temos orçamento para consultoria.",
    answer:
      "Parte do trabalho cabe nos recursos de gestão previstos nos próprios programas, e o custo de devolver recurso é maior do que o de executar. Fazemos o diagnóstico antes de qualquer proposta.",
  },
  {
    id: "contratacao",
    question: "Como fica a contratação pública?",
    answer:
      "A contratação segue a Lei 14.133/2021, pela modalidade que o município indicar [verificar enquadramento com a procuradoria]. A Prospekto apresenta proposta técnica e orçamentária formal.",
  },
  {
    id: "consultoria",
    question: "Já temos consultoria.",
    answer:
      "Ótimo. O diagnóstico serve para conferir prazos e saldos; se estiver tudo em dia, dizemos isso. Se faltar algo, apresentamos onde podemos complementar.",
  },
];

export default function MunicipiosPage() {
  return (
    <>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-16 pb-12 md:pt-24">
        <SectionHeader
          as="h1"
          label="Para secretarias de cultura"
          title="Fomento cultural executado sem devolver recurso."
          subtitle="PNAB, editais, leis municipais de incentivo e projetos do município na LIC-RS e na Lei Rouanet: a Prospekto organiza o calendário, os instrumentos e a prestação de contas para a secretaria executar o que tem direito, dentro do prazo."
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <CtaLink href="#diagnostico-municipal" ctaId="municipios_hero_diagnostic">
            Pedir diagnóstico do fomento municipal
          </CtaLink>
          <WhatsappButton
            message={site.whatsappMessages.municipios}
            label="Falar no WhatsApp"
            context="page"
          />
        </div>
      </section>

      <section aria-labelledby="resolvemos" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24">
          <SectionHeader
            id="resolvemos"
            label="O que resolvemos"
            title="Três perguntas que toda secretaria faz"
          />
          <NumberedList items={questions} columns={3} />
        </div>
      </section>

      <section
        aria-labelledby="servicos"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24"
      >
        <SectionHeader
          id="servicos"
          label="Serviços"
          title="O que a Prospekto faz com a secretaria"
        />
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <li key={s.title} className="flex flex-col gap-2">
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="calendario" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24">
          <SectionHeader id="calendario" label="Calendário" title="O ano do fomento municipal" />
          <NumberedList items={calendar} columns={2} />
        </div>
      </section>

      <section
        aria-labelledby="objecoes"
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24"
      >
        <SectionHeader id="objecoes" label="Perguntas que ouvimos" title="Objeções respondidas" />
        <ObjectionsAccordion items={objections} jsonLd />
      </section>

      <section aria-labelledby="diagnostico-municipal" className="bg-sand scroll-mt-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-8">
            <SectionHeader
              id="diagnostico-municipal"
              label="Diagnóstico do fomento municipal"
              title="Conte a situação do município."
              subtitle="Em até 5 dias úteis a Daniela retorna com a leitura dos prazos e saldos e uma proposta de conversa. Campos marcados com (obrigatório) precisam ser preenchidos."
            />
            <div className="border-border bg-background flex flex-col gap-2 rounded-lg border p-5">
              <p className="site-label">Checklist PNAB sem devolver recurso</p>
              <p className="text-muted-foreground">
                PDF com os prazos, documentos e decisões de cada etapa do ciclo. [a produzir] Quem
                pede o diagnóstico recebe o checklist por e-mail quando estiver pronto.
              </p>
            </div>
          </div>
          <MunicipalityForm titleId="diagnostico-municipal" />
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12">
        <LegalDisclaimer />
      </div>
    </>
  );
}
