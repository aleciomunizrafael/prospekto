import type { Metadata } from "next";
import { CtaLink, TrackLink } from "@/components/analytics/track-link";
import { NumberedList } from "@/components/site/numbered-list";
import { SectionHeader } from "@/components/site/section-header";
import { WhatsappButton } from "@/components/site/whatsapp-button";
import { site, waLink } from "@/config/site";

// Sobre a Daniela e a Prospekto (docs/site/estrutura-e-copy.md, seção 4.5). Biografia, carteira e
// contatos sociais (site.social) só aparecem quando a Daniela confirmar as URLs (seção 11).
export const metadata: Metadata = {
  title: { absolute: "Sobre a Prospekto e Daniela Sandrin Copat" },
  description:
    "Consultoria da Serra Gaúcha em projetos culturais, leis de incentivo e economia criativa. Elaboração, captação, gestão e prestação de contas.",
  alternates: { canonical: "/sobre" },
};

const services = [
  {
    title: "Captação de patrocínio incentivado",
    audience:
      "Projetos aprovados com saldo a captar; empresas e pessoas físicas que querem destinar imposto",
    delivers: "Apresentação do projeto, termo, depósito identificado, recibo, contrapartidas",
  },
  {
    title: "Elaboração e gestão de projetos",
    audience: "Proponentes, produtoras, instituições, municípios",
    delivers:
      "Projeto inscrito no SALIC, na Ancine ou no Pró-Cultura RS; execução e prestação de contas",
  },
  {
    title: "Consultoria em cultura e economia criativa",
    audience: "Empresas e municípios",
    delivers:
      "Planejamento, editais, PNAB, leis municipais de incentivo, aproximação entre empresas e cultura local",
  },
  {
    title: "Formação",
    audience: "Quem quer escrever e captar projetos",
    delivers: "Guia, conteúdo e, em breve, mentoria (lista de espera)",
  },
];

const method = [
  {
    title: "Entendimento",
    text: "Conhecemos a empresa, o escritório ou o projeto, o momento e o que se quer realizar. Ponto de partida: regime tributário, IRPJ projetado ou imposto devido, cidade, interesse.",
  },
  {
    title: "Análise",
    text: "Cruzamos o perfil com a carteira e com os mecanismos (Rouanet art. 18 ou 26, Audiovisual art. 1º-A, LIC-RS). Resultado: alternativas compatíveis, valor possível e pontos a confirmar com o contador.",
  },
  {
    title: "Operação",
    text: "Termo, depósito, recibo, prestação de contas, contrapartidas. Próximos passos sempre com data.",
  },
];

const principles = [
  "Informação com origem: toda regra citada tem lei, artigo e data.",
  "Zero burocracia para o patrocinador.",
  "Projetos da região, visíveis e com prestação de contas pública.",
  "Nada de promessa que a lei não sustenta.",
];

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.owner,
  jobTitle: "Responsável pela Prospekto Consultoria & Projetos",
  worksFor: { "@type": "Organization", name: site.name },
  email: site.email,
};

export default function SobrePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c") }}
      />
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-16 pb-12 md:pt-24">
        <SectionHeader
          as="h1"
          label="Quem faz"
          title="Projetos culturais que saem do papel, prestam contas e dão certo."
          subtitle="A Prospekto Consultoria & Projetos elabora, inscreve, capta e gerencia projetos culturais em leis de incentivo federais (Lei Rouanet, Lei do Audiovisual) e estaduais (LIC-RS), e presta consultoria em cultura e economia criativa para empresas e municípios. Responsável: Daniela Sandrin Copat. Base: Serra Gaúcha, Rio Grande do Sul."
        />
      </section>

      <section aria-labelledby="daniela" className="bg-sand">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 md:grid-cols-[16rem_1fr] md:py-24">
          <div
            aria-hidden="true"
            className="bg-background border-border flex aspect-[4/5] w-full max-w-[16rem] items-end rounded-lg border p-4"
          >
            <span className="text-muted-foreground text-[13px]">Foto [verificar]</span>
          </div>
          <div className="flex flex-col gap-4">
            <h2 id="daniela" className="site-h2">
              Daniela Sandrin Copat
            </h2>
            <p className="site-prose">
              Responsável pela Prospekto Consultoria &amp; Projetos e autora do guia{" "}
              <em>Contabilizando Cultura</em>. Atua em elaboração, captação e gestão de projetos
              culturais e em consultoria para empresas e municípios.
            </p>
            <p className="site-prose text-muted-foreground text-[14px]">
              [verificar com a Daniela: formação, anos de atuação, projetos elaborados e aprovados,
              municípios atendidos, cursos ministrados, participação em conselhos ou comissões]
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="o-que-fazemos"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24"
      >
        <SectionHeader
          id="o-que-fazemos"
          label="O que fazemos"
          title="Quatro frentes de trabalho."
        />
        <ul className="grid gap-6 md:grid-cols-2">
          {services.map((s) => (
            <li key={s.title} className="border-border flex flex-col gap-3 rounded-lg border p-6">
              <h3 className="site-h3">{s.title}</h3>
              <dl className="flex flex-col gap-2">
                <div>
                  <dt className="site-label text-[12px]">Para quem</dt>
                  <dd className="text-muted-foreground">{s.audience}</dd>
                </div>
                <div>
                  <dt className="site-label text-[12px]">O que entrega</dt>
                  <dd className="text-muted-foreground">{s.delivers}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="como-trabalhamos" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24">
          <SectionHeader
            id="como-trabalhamos"
            label="Como trabalhamos"
            title="Três passos, sempre com data."
          />
          <NumberedList items={method} columns={3} />
        </div>
      </section>

      <section
        aria-labelledby="principios"
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24"
      >
        <SectionHeader id="principios" label="Princípios" title="O que não muda." />
        <ul className="grid gap-4 md:grid-cols-2">
          {principles.map((p) => (
            <li key={p} className="flex gap-3">
              <span aria-hidden="true" className="bg-brand mt-2.5 size-2 shrink-0 rounded-full" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="carteira" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16 md:py-24">
          <SectionHeader
            id="carteira"
            label="Carteira e histórico"
            title="Os projetos publicáveis estão na carteira."
            subtitle={
              <>
                <p>
                  Até a Daniela aprovar os números, o site mostra apenas os projetos publicáveis em{" "}
                  <CtaLink href="/projetos" ctaId="about_projects" variant="link">
                    Projetos em captação
                  </CtaLink>
                  .
                </p>
                <p className="text-[14px]">
                  [verificar com a Daniela: quantidade de projetos elaborados, aprovados e captados;
                  valor captado por ano; patrocinadores que autorizam citação]
                </p>
              </>
            }
          />
        </div>
      </section>

      <section
        aria-labelledby="contato-sobre"
        className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16 md:py-24"
      >
        <SectionHeader id="contato-sobre" label="Contato" title="Fale com a Daniela." />
        <ul className="flex flex-col gap-2">
          <li>
            <TrackLink
              event="email_click"
              href={`mailto:${site.email}`}
              className="underline underline-offset-4"
            >
              {site.email}
            </TrackLink>
          </li>
          <li>
            <TrackLink
              event="whatsapp_click"
              eventProps={{ context: "page" }}
              href={waLink(site.whatsappMessages.home)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              WhatsApp {site.whatsappDisplay}
            </TrackLink>
          </li>
          {site.social.linkedin ? (
            <li>
              <a
                href={site.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                LinkedIn da Daniela
              </a>
            </li>
          ) : null}
          {site.social.instagram ? (
            <li>
              <a
                href={site.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                Instagram
              </a>
            </li>
          ) : null}
        </ul>
        <div className="flex flex-col gap-3 sm:flex-row">
          <CtaLink href="/contato" ctaId="about_schedule">
            Agendar uma conversa
          </CtaLink>
          <WhatsappButton label="Falar no WhatsApp" context="page" />
        </div>
      </section>
    </>
  );
}
