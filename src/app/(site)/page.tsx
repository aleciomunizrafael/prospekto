import type { Metadata } from "next";
import Link from "next/link";
import { CtaLink } from "@/components/analytics/track-link";
import { DeadlineBanner } from "@/components/site/deadline-banner";
import { GuideForm } from "@/components/site/lead-forms/guide-form";
import { ProjectsNotifyForm } from "@/components/site/lead-forms/projects-notify-form";
import { MythFactCard } from "@/components/site/myth-fact-card";
import { NumberBlock, SourceNotes } from "@/components/site/number-block";
import { NumberedList } from "@/components/site/numbered-list";
import { SectionHeader } from "@/components/site/section-header";
import { HOME_SOURCES } from "@/components/site/sources";
import { ProjectCard } from "@/components/site/project-card";
import { PROJECTS_DISCLAIMER } from "@/components/site/project-mechanism";
import { WhatsappButton } from "@/components/site/whatsapp-button";
import { site } from "@/config/site";
import { getPublicProjects } from "@/lib/site/public-projects";

// Home (docs/site/estrutura-e-copy.md, seção 4.1). Página estática: o bloco "Projetos em captação"
// lê a carteira pública pelo cache com a tag `projects` (src/lib/site/public-projects.ts) e mostra
// o estado de carteira vazia com o aviso de novos projetos quando não há projeto publicado.
export const metadata: Metadata = {
  title: { absolute: "Incentivo fiscal à cultura na Serra Gaúcha · Prospekto" },
  description:
    "Transforme o imposto da sua empresa em cultura na Serra Gaúcha. Até 4% do IRPJ devido (3,6% com a LC 224/2025) para projetos aprovados, com recibo oficial e sem burocracia.",
  alternates: { canonical: "/" },
};

const audiences = [
  {
    title: "Empresas no lucro real",
    text: "Até 4% do IRPJ devido (3,6% com a LC 224/2025) pode ir para um projeto cultural da sua região, com recibo oficial. Veja quanto cabe na sua empresa.",
    links: [{ href: "/empresas", label: "Para empresas" }],
  },
  {
    title: "Escritórios contábeis",
    text: "Ofereça incentivo cultural aos seus clientes sem operar nada: a Prospekto traz os projetos e faz o processo; o escritório fica com o crédito.",
    links: [{ href: "/contadores", label: "Para contadores" }],
  },
  {
    title: "Pessoas físicas",
    text: "Quem declara pelo modelo completo pode destinar até 6% do imposto devido a um projeto da sua cidade, até dezembro.",
    links: [{ href: "/pessoa-fisica", label: "Para pessoas físicas" }],
  },
  {
    title: "Municípios e proponentes",
    text: "Consultoria para secretarias de cultura e captação para projetos aprovados com saldo a captar.",
    links: [
      { href: "/municipios", label: "Para municípios" },
      { href: "/proponentes", label: "Para proponentes" },
    ],
  },
];

const steps = [
  {
    title: "Confirmar a elegibilidade",
    text: "A empresa é tributada pelo lucro real e apura imposto de renda devido no período.",
  },
  {
    title: "Escolher o projeto",
    text: "Um projeto com portaria de autorização vigente no SALIC (Sistema de Apoio às Leis de Incentivo à Cultura, do Ministério da Cultura) ou despacho da Ancine.",
  },
  {
    title: "Formalizar",
    text: "Termo de patrocínio com o proponente, com valor, cronograma e contrapartidas.",
  },
  {
    title: "Depositar",
    text: "Transferência identificada para a conta vinculada do projeto, aberta no Banco do Brasil.",
  },
  {
    title: "Receber o recibo",
    text: "O recibo de mecenato é emitido no SALIC e enviado à empresa e ao contador.",
  },
  {
    title: "Deduzir",
    text: "O contador abate o valor do IRPJ no DARF (Documento de Arrecadação de Receitas Federais) do período e informa na ECF (Escrituração Contábil Fiscal).",
  },
];

const trustItems = [
  "Projetos aprovados pelo Ministério da Cultura (SALIC) e pela Ancine",
  "Recibo de mecenato oficial",
  "Operação completa: termo, depósito, recibo e prestação de contas",
  "Atuação na Serra Gaúcha e no RS",
];

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness"],
  name: site.name,
  email: site.email,
  telephone: "+55 54 98403-2180",
  areaServed: ["Serra Gaúcha", "Rio Grande do Sul"],
  founder: { "@type": "Person", name: site.owner },
  // Endereço só quando confirmado (seção 6.3) [verificar].
};

// Rede de segurança (ISR) além da tag `projects`; literal porque o Next exige valor estático.
export const revalidate = 3600;

export default async function HomePage() {
  const projects = await getPublicProjects();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* Topo */}
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-16 pb-12 md:pt-24">
        <SectionHeader
          as="h1"
          label="Prospekto Consultoria & Projetos · Serra Gaúcha"
          title="Transforme o imposto da sua empresa em cultura na Serra Gaúcha, sem burocracia."
          subtitle="Empresas tributadas pelo lucro real podem destinar até 4% do imposto de renda devido (3,6% com a LC 224/2025, na leitura da Receita; o simulador mostra os dois cenários) a projetos culturais aprovados pelo Ministério da Cultura. O valor sai do imposto que já seria pago; a diferença é que ele vira um projeto com a sua marca, aqui na região. A Prospekto cuida do processo. O seu contador só lança a dedução."
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <CtaLink href="/simulador" ctaId="home_hero_simulate">
            Simular quanto cabe na minha empresa
          </CtaLink>
          <WhatsappButton context="hero" />
        </div>
      </section>

      <DeadlineBanner />

      {/* Barra de confiança */}
      <section aria-label="Garantias" className="border-border border-y">
        <ul className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 text-[15px] sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden="true" className="bg-brand mt-2.5 size-2 shrink-0 rounded-full" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Para quem é */}
      <section
        aria-labelledby="para-quem"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24"
      >
        <SectionHeader id="para-quem" label="Para quem é" title="Cada público tem a sua página." />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((card) => (
            <li
              key={card.title}
              className="border-border flex flex-col gap-3 rounded-lg border p-6"
            >
              <h3 className="site-h3">{card.title}</h3>
              <p className="text-muted-foreground flex-1">{card.text}</p>
              <div className="flex flex-col gap-1">
                {card.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-primary touch-target inline-flex items-center font-medium underline underline-offset-4"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Como funciona */}
      <section aria-labelledby="como-funciona" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24">
          <SectionHeader
            id="como-funciona"
            label="Guia prático"
            title="Como funciona, em seis passos."
          />
          <NumberedList items={steps} columns={2} />
          <p className="site-prose text-muted-foreground">
            A Prospekto assume a gestão burocrática, a emissão dos recibos no SALIC e a prestação de
            contas exigida pela lei. O patrocinador deposita e lança.
          </p>
        </div>
      </section>

      {/* Números */}
      <section
        aria-labelledby="numeros"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24"
      >
        <SectionHeader
          id="numeros"
          label="O que os dados mostram"
          title="Os números da Lei Rouanet."
        />
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <NumberBlock
            value="R$ 3,41 bilhões"
            caption="captados pela Lei Rouanet em 2025, recorde pelo terceiro ano"
            source={{ ref: 1, label: "MinC, jan/2026" }}
          />
          <NumberBlock
            value="R$ 203,4 milhões"
            caption="movimentados pela Lei Rouanet no Rio Grande do Sul em 2025"
            source={{ ref: 2, label: "MinC, mai/2026" }}
          />
          <NumberBlock
            value="R$ 9,81"
            caption="gerados na economia do Sul para cada R$ 1 incentivado (R$ 7,59 na média nacional)"
            source={{ ref: 3, label: "FGV para o MinC, jan/2026" }}
          />
          <NumberBlock
            value="menos de 3%"
            caption="das empresas no lucro real usam o incentivo [verificar]"
            source={{ ref: 4, label: "cálculo da Prospekto" }}
          />
        </div>
        <p className="text-muted-foreground text-[14px]">{site.disclaimer}</p>
      </section>

      {/* Mito e fato */}
      <section aria-labelledby="mitos" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24">
          <SectionHeader id="mitos" label="Desmistificando" title="Dois mitos e o que diz a lei." />
          <div className="grid gap-6 md:grid-cols-2">
            <MythFactCard
              myth="Patrocinar via Lei Rouanet atrai fiscalização ou gera problema com a Receita Federal."
              fact="O incentivo cultural é um benefício expressamente previsto em lei (Lei 8.313/1991 e Lei 9.532/1997). Todo o fluxo ocorre no SALIC, com conta bancária vinculada e monitorada pelo Ministério da Cultura e pelo Banco do Brasil. Não é brecha fiscal nem manobra; é um ato declaratório alinhado às normas contábeis e fiscais."
            />
            <MythFactCard
              myth="Só grandes artistas consagrados ou multinacionais usam a lei."
              fact="A lei contempla iniciativas de todos os portes e linguagens: música, teatro, dança, patrimônio, literatura, circo, museus, artes visuais. Em 2025, mais de 6,2 mil CNPJs patrocinaram projetos; só em Caxias do Sul havia 42 projetos em execução. Qualquer empresa no lucro real e qualquer pessoa física na declaração completa pode participar."
              sourceRefs={[5, 2]}
            />
          </div>
        </div>
      </section>

      {/* Projetos em captação */}
      <section
        aria-labelledby="projetos"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24"
      >
        <SectionHeader
          id="projetos"
          label="Projetos em captação"
          title="Projetos aprovados, com saldo a captar, na sua região."
          subtitle={
            projects.length
              ? PROJECTS_DISCLAIMER
              : "Novos projetos entram na carteira ao longo do ano. Quer ser avisado? Deixe seu e-mail."
          }
        />
        {projects.length ? (
          <>
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.slice(0, 3).map((p) => (
                <li key={p.id}>
                  <ProjectCard project={p} />
                </li>
              ))}
            </ul>
            <CtaLink
              href="/projetos"
              ctaId="home_projects_all"
              variant="link"
              className="self-start"
            >
              Ver todos os projetos em captação
            </CtaLink>
          </>
        ) : (
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="border-border flex flex-col gap-3 rounded-lg border border-dashed p-6">
              <p className="site-label">Carteira</p>
              <p className="text-muted-foreground">
                A carteira pública de projetos é publicada em{" "}
                <Link href="/projetos" className="underline underline-offset-4">
                  Projetos em captação
                </Link>{" "}
                conforme cada proponente autoriza a divulgação. Valores e prazos conforme portaria
                publicada; sujeitos a atualização.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <h3 id="aviso-projetos-titulo" className="site-h3">
                Quero ser avisado sobre novos projetos
              </h3>
              <ProjectsNotifyForm titleId="aviso-projetos-titulo" />
            </div>
          </div>
        )}
      </section>

      {/* Guia gratuito */}
      <section aria-labelledby="guia-titulo" className="bg-sand">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-2">
          <SectionHeader
            id="guia-titulo"
            label="Guia gratuito"
            title="Contabilizando Cultura: guia prático para empresas e contadores."
            subtitle={
              <>
                <p>
                  Entenda, com segurança jurídica e clareza operacional, como direcionar parte do
                  imposto de renda devido para projetos culturais.
                </p>
                {!site.guide.available ? (
                  <p>
                    Edição revisada em breve. Deixe seu e-mail e avisamos quando estiver disponível.
                  </p>
                ) : null}
                <p>
                  <Link href="/guia" className="underline underline-offset-4">
                    Saiba o que tem no guia
                  </Link>
                </p>
              </>
            }
          />
          <GuideForm titleId="guia-titulo" />
        </div>
      </section>

      {/* Sobre a Daniela */}
      <section
        aria-labelledby="sobre-titulo"
        className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16 md:py-24"
      >
        <SectionHeader id="sobre-titulo" label="Quem faz" title="Daniela Sandrin Copat" />
        <p className="site-prose">
          Daniela Sandrin Copat elabora, inscreve, capta e presta contas de projetos culturais em
          leis de incentivo federais e estaduais, e presta consultoria em cultura e economia
          criativa para empresas e municípios da Serra Gaúcha.{" "}
          <span className="text-muted-foreground text-[14px]">
            [verificar: anos de atuação, formação e projetos que podem ser citados]
          </span>
        </p>
        <p>
          <Link href="/sobre" className="text-primary font-medium underline underline-offset-4">
            Conheça a Prospekto
          </Link>
        </p>
      </section>

      {/* CTA final */}
      <section aria-labelledby="cta-final" className="bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16 md:py-20">
          <h2 id="cta-final" className="site-h2 max-w-[24ch]">
            Quanto do imposto da sua empresa pode virar cultura este ano?
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <CtaLink
              href="/simulador"
              ctaId="home_final_simulate"
              className="bg-background text-primary hover:bg-background/90"
            >
              Simular agora
            </CtaLink>
            <CtaLink
              href="/diagnostico"
              ctaId="home_final_diagnostic"
              variant="outline"
              className="border-primary-foreground/60 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              Agendar diagnóstico gratuito
            </CtaLink>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <SourceNotes sources={HOME_SOURCES} />
      </div>
    </>
  );
}
