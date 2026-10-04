import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CtaLink, TrackLink } from "@/components/analytics/track-link";
import { formatDateBr } from "@/components/site/deadline";
import { LegalDisclaimer } from "@/components/site/legal-disclaimer";
import { ProjectCard } from "@/components/site/project-card";
import { formatBrl, mechanismInfo, PROJECTS_DISCLAIMER } from "@/components/site/project-mechanism";
import { ProjectViewTracker } from "@/components/site/project-view-tracker";
import { SectionHeader } from "@/components/site/section-header";
import { WhatsappButton } from "@/components/site/whatsapp-button";
import { site } from "@/config/site";
import { getPublicProject, getPublicProjects } from "@/lib/site/public-projects";

// Página do projeto (docs/site/estrutura-e-copy.md, seção 4.6): só projetos publicados (R-11);
// 404 para o resto. Sem telefones nem e-mails de terceiros: o contato é sempre o da Prospekto.
// Estática por slug (generateStaticParams) com ISR e a tag `projects`; slugs novos renderizam sob
// demanda (dynamicParams).
export const revalidate = 3600;

export async function generateStaticParams() {
  const projects = await getPublicProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/projetos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublicProject(slug);
  if (!project) return { title: "Projeto não encontrado", robots: { index: false, follow: false } };
  const info = mechanismInfo(project.mechanism);
  const description =
    project.summary?.slice(0, 155) ??
    `${project.name}: projeto cultural em captação pela ${info.label}, com saldo a captar. Patrocine com a Prospekto.`;
  return {
    title: { absolute: `${project.name} · Prospekto` },
    description,
    alternates: { canonical: `/projetos/${project.slug}` },
  };
}

const whyCards = (fullDeduction: boolean) => [
  {
    title: "Aprovado e autorizado",
    text: "Portaria ou despacho de autorização vigente; a conta vinculada e o recibo de mecenato são oficiais.",
  },
  {
    title: "Incentivo fiscal",
    text: fullDeduction
      ? "Dedução integral do aporte, dentro do limite legal: custo líquido zero para a empresa."
      : "Dedução prevista em lei, dentro do limite legal; o contador confirma o valor líquido.",
  },
  {
    title: "Visibilidade",
    text: "Marca associada a um projeto cultural da região, com contrapartidas definidas no termo.",
  },
  {
    title: "Operação pela Prospekto",
    text: "Termo, acompanhamento do depósito, recibo e prestação de contas ficam com a Prospekto.",
  },
];

export default async function ProjetoPage({ params }: PageProps<"/projetos/[slug]">) {
  const { slug } = await params;
  const project = await getPublicProject(slug);
  if (!project) notFound();
  const info = mechanismInfo(project.mechanism);
  const related = (await getPublicProjects()).filter((p) => p.id !== project.id).slice(0, 3);
  const place = [project.city, project.uf].filter(Boolean).join(", ");
  const sponsorHref = `/diagnostico?projeto=${encodeURIComponent(project.slug)}`;
  const audience = [
    info.acceptsCompanies ? "empresas no lucro real" : null,
    info.acceptsIndividuals ? "pessoas físicas (modelo completo)" : null,
  ]
    .filter(Boolean)
    .join(" e ");

  return (
    <>
      <ProjectViewTracker slug={project.slug} mechanism={project.mechanism} />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-16 pb-12 md:pt-24">
        <SectionHeader
          as="h1"
          label={[info.label, project.processNumber ? `processo ${project.processNumber}` : null]
            .filter(Boolean)
            .join(" · ")}
          title={project.name}
          subtitle={project.summary ?? undefined}
        />
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <dt className="site-label text-[12px]">Status</dt>
            <dd className="font-semibold">Aprovado e autorizado a captar</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="site-label text-[12px]">Valor aprovado</dt>
            <dd className="tabular font-semibold">{formatBrl(project.approvedAmount)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="site-label text-[12px]">Saldo a captar</dt>
            <dd className="tabular text-xl font-semibold">{formatBrl(project.balance)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="site-label text-[12px]">Prazo de captação</dt>
            <dd className="tabular font-semibold">
              {project.fundraisingDeadline
                ? formatDateBr(project.fundraisingDeadline)
                : "a confirmar"}
            </dd>
          </div>
        </dl>
        <div className="flex flex-col gap-3 sm:flex-row">
          <CtaLink href={sponsorHref} ctaId="project_sponsor">
            Quero patrocinar este projeto
          </CtaLink>
          {project.deckUrl ? (
            <TrackLink
              event="project_deck_download"
              eventProps={{ project_slug: project.slug }}
              href={project.deckUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target inline-flex items-center underline underline-offset-4"
            >
              Baixar apresentação (PDF)
            </TrackLink>
          ) : null}
        </div>
        <p className="text-muted-foreground text-[14px]">{PROJECTS_DISCLAIMER}</p>
      </section>

      <section aria-labelledby="por-que" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24">
          <SectionHeader id="por-que" label="Por que patrocinar" title="Quatro motivos" />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {whyCards(info.fullDeduction).map((c) => (
              <li
                key={c.title}
                className="bg-background border-border flex flex-col gap-2 rounded-lg border p-5"
              >
                <h3 className="font-semibold">{c.title}</h3>
                <p className="text-muted-foreground">{c.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="mecanismo"
        className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24"
      >
        <div className="flex flex-col gap-4">
          <SectionHeader id="mecanismo" label="Mecanismo e base legal" title={info.label} />
          <p className="site-prose text-muted-foreground">{info.legalBasis}</p>
          {audience ? <p className="text-muted-foreground">Aberto a {audience}.</p> : null}
          {info.fullDeduction ? (
            <p className="bg-sand inline-flex self-start rounded-full px-3 py-1 text-[13px] font-semibold uppercase tracking-wide">
              Dedução integral
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="site-h3">Contrapartidas</h2>
          {project.counterparts ? (
            <p className="site-prose text-muted-foreground whitespace-pre-line">
              {project.counterparts}
            </p>
          ) : (
            <p className="text-muted-foreground">
              Contrapartidas por cota definidas no termo de patrocínio. [verificar por projeto]
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="proponente" className="bg-sand">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col gap-3">
            <h2 id="proponente" className="site-h3">
              Proponente
            </h2>
            <p>{project.proponentName}</p>
            {place ? <p className="text-muted-foreground">{place}</p> : null}
            {project.culturalSegment ? (
              <p className="text-muted-foreground">Segmento: {project.culturalSegment}</p>
            ) : null}
            <p className="text-muted-foreground text-[14px]">
              O contato sobre o projeto é sempre pela Prospekto: {site.email} ou WhatsApp{" "}
              {site.whatsappDisplay}.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="site-h3">Documentos</h2>
            <ul className="flex flex-col gap-2">
              {project.salicUrl ? (
                <li>
                  <TrackLink
                    event="outbound_click"
                    eventProps={{ project_slug: project.slug, target: "salic" }}
                    href={project.salicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4"
                  >
                    Consulta pública do projeto (portaria ou despacho)
                  </TrackLink>
                </li>
              ) : (
                <li className="text-muted-foreground">
                  Portaria ou despacho de autorização enviado junto com a proposta.
                </li>
              )}
              {project.deckUrl ? (
                <li>
                  <TrackLink
                    event="project_deck_download"
                    eventProps={{ project_slug: project.slug }}
                    href={project.deckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4"
                  >
                    Apresentação do projeto (PDF)
                  </TrackLink>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="patrocinar"
        className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16 md:py-24"
      >
        <SectionHeader
          id="patrocinar"
          label="Quero patrocinar"
          title="Faça a conta com o seu contador e escolha a cota."
          subtitle="O diagnóstico gratuito já leva os dados deste projeto: a Daniela confirma o limite com quem apura o imposto e apresenta as cotas."
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <CtaLink href={sponsorHref} ctaId="project_sponsor_bottom">
            Quero patrocinar este projeto
          </CtaLink>
          <WhatsappButton
            message={site.whatsappMessages.project.replace("[nome]", project.name)}
            label="Falar no WhatsApp"
            context="project"
          />
        </div>
      </section>

      {related.length ? (
        <section aria-labelledby="relacionados" className="bg-sand">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24">
            <SectionHeader id="relacionados" label="Carteira" title="Outros projetos em captação" />
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <li key={p.id}>
                  <ProjectCard project={p} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12">
        <p className="text-muted-foreground text-[14px]">{PROJECTS_DISCLAIMER}</p>
        <LegalDisclaimer />
      </div>
    </>
  );
}
