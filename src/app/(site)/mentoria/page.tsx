import type { Metadata } from "next";
import { CtaLink } from "@/components/analytics/track-link";
import { WaitlistForm } from "@/components/site/lead-forms/waitlist-form";
import { NumberedList } from "@/components/site/numbered-list";
import { ObjectionsAccordion, type Objection } from "@/components/site/objections-accordion";
import { SectionHeader } from "@/components/site/section-header";

// Mentoria, lista de espera (docs/site/estrutura-e-copy.md, seção 4.6; docs/produto/mentoria-e-curso.md,
// seção 1). Sem preço: a lista de espera define o formato. Estática.
export const metadata: Metadata = {
  title: { absolute: "Mentoria em projetos culturais com Daniela Sandrin Copat" },
  description:
    "Aprenda a escrever, inscrever e captar projetos culturais com quem faz isso todo dia. Entre na lista de espera.",
  alternates: { canonical: "/mentoria" },
};

const audiences = [
  {
    title: "Quem quer o primeiro projeto",
    text: "Produtor iniciante, estudante de produção cultural ou gestão pública, pessoa em transição de carreira: sair com o primeiro projeto inscrito e saber precificar o próprio serviço.",
  },
  {
    title: "Artista ou coletivo",
    text: "Quem vive de edital e de cachê e quer um projeto aprovado e captando, com um pitch que uma indústria da Serra entende e prestação de contas sem devolução.",
  },
  {
    title: "Produtora pequena",
    text: "Até cinco pessoas, que depende de elaborador externo e perde a janela do SALIC: internalizar elaboração, gestão e captação com método.",
  },
];

const outcomes = [
  {
    title: "Projeto inscrito",
    text: "Seu projeto real, escrito e inscrito no SALIC ou em edital durante a coorte.",
  },
  {
    title: "Orçamento",
    text: "Planilha de orçamento que passa na análise, com a rubrica de captação correta.",
  },
  {
    title: "Deck",
    text: "Apresentação do projeto para empresas e contadores, nos moldes dos decks da carteira.",
  },
  {
    title: "Plano de captação",
    text: "Lista de patrocinadores-alvo, cotas, contrapartidas e calendário até dezembro.",
  },
];

const faq: Objection[] = [
  {
    id: "quando",
    question: "Quando abre a turma?",
    answer:
      "A lista de espera abre junto com o site. A pré-venda está prevista para janeiro e fevereiro de 2027, para a turma terminar com os projetos inscritos dentro da janela do SALIC (1º de fevereiro a 31 de outubro). [verificar datas]",
  },
  {
    id: "preco",
    question: "Quanto custa?",
    answer:
      "Ainda não há preço. O formato e o valor são definidos com quem está na lista de espera, pela pesquisa de 3 minutos que chega por e-mail. Quem está na lista recebe a condição de pré-venda.",
  },
  {
    id: "carga",
    question: "Qual é a carga horária?",
    answer:
      "Previsão: 8 semanas, com 8 aulas ao vivo de 2 horas (gravadas e disponíveis no dia seguinte), 2 encontros de revisão de projeto em grupo e um canal de dúvidas com resposta em até 2 dias úteis. [verificar]",
  },
  {
    id: "certificado",
    question: "Tem certificado?",
    answer:
      "Sim, certificado de participação emitido pela Prospekto ao fim da coorte, com a carga horária cumprida. [verificar formato]",
  },
];

export default function MentoriaPage() {
  return (
    <>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-16 pb-12 md:pt-24">
        <SectionHeader
          as="h1"
          label="Mentoria da Daniela · Lista de espera"
          title="Aprenda a escrever, inscrever e captar projetos culturais com quem faz isso todo dia."
          subtitle="Mentoria em grupo de 8 semanas, com um projeto real de cada aluno como entregável: não é um curso sobre a Lei Rouanet, é um método para sair com um projeto inscrito e um plano de captação, com casos reais da Serra Gaúcha."
        />
        <CtaLink href="#lista-de-espera" ctaId="mentoria_hero_waitlist" className="self-start">
          Entrar na lista de espera
        </CtaLink>
      </section>

      <section aria-labelledby="para-quem" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24">
          <SectionHeader id="para-quem" label="Para quem" title="Três públicos da primeira turma" />
          <NumberedList items={audiences} columns={3} />
        </div>
      </section>

      <section
        aria-labelledby="sai-com"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24"
      >
        <SectionHeader id="sai-com" label="Entregáveis" title="O que você sai com" />
        <NumberedList items={outcomes} columns={2} />
      </section>

      <section aria-labelledby="formato" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16 md:py-24">
          <SectionHeader
            id="formato"
            label="Formato e período previsto"
            title="Coorte de 8 semanas, ao vivo, com revisão do seu projeto."
            subtitle="De 12 a 20 alunos por turma; aulas à noite, gravadas; dois encontros de revisão em grupo; modelos de projeto, orçamento, termo de patrocínio, deck e checklist de prestação de contas. Período previsto: primeiro semestre de 2027 [verificar datas]."
          />
          <p className="border-border bg-background max-w-[70ch] rounded-lg border p-4 font-medium">
            Sem preço ainda: a lista de espera define o formato. Quem entra na lista responde a uma
            pesquisa de 3 minutos e recebe a condição de pré-venda.
          </p>
        </div>
      </section>

      <section aria-labelledby="lista-de-espera" className="scroll-mt-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1fr_1.2fr]">
          <SectionHeader
            id="lista-de-espera"
            label="Lista de espera"
            title="Entre na lista."
            subtitle="Conte o seu objetivo e a sua experiência. Campos marcados com (obrigatório) precisam ser preenchidos."
          />
          <WaitlistForm titleId="lista-de-espera" />
        </div>
      </section>

      <section aria-labelledby="faq" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24">
          <SectionHeader
            id="faq"
            label="Perguntas frequentes"
            title="Quando abre, preço, carga horária, certificado"
          />
          <div className="bg-background rounded-lg">
            <ObjectionsAccordion items={faq} jsonLd />
          </div>
        </div>
      </section>
    </>
  );
}
