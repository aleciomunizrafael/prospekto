import type { Metadata } from "next";
import { CtaLink } from "@/components/analytics/track-link";
import { ProjectsNotifyForm } from "@/components/site/lead-forms/projects-notify-form";
import { LegalDisclaimer } from "@/components/site/legal-disclaimer";
import { ProjectCard } from "@/components/site/project-card";
import { PROJECTS_DISCLAIMER } from "@/components/site/project-mechanism";
import { SectionHeader } from "@/components/site/section-header";
import { getPublicProjects } from "@/lib/site/public-projects";

// Projetos em captação (docs/site/estrutura-e-copy.md, seções 4.6 e 10.5; modelo-de-dados.md,
// R-11): cartões da carteira pública, lidos pelo cache com a tag `projects`
// (src/lib/site/public-projects.ts), e estado vazio com o aviso de novos projetos. Os filtros
// (cidade, mecanismo, segmento, aceita PF) entram quando a carteira tiver volume.
export const metadata: Metadata = {
  title: { absolute: "Projetos culturais em captação · Prospekto" },
  description:
    "Carteira de projetos aprovados pelo Ministério da Cultura e pela Ancine, com saldo a captar, abertos a empresas e pessoas físicas.",
  alternates: { canonical: "/projetos" },
};

// Rede de segurança (ISR) além da tag `projects`; literal porque o Next exige valor estático.
export const revalidate = 3600;

export default async function ProjetosPage() {
  const projects = await getPublicProjects();
  return (
    <>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-16 pb-12 md:pt-24">
        <SectionHeader
          as="h1"
          label="Projetos em captação"
          title="Projetos aprovados, com saldo a captar, na sua região."
          subtitle={`Cada projeto tem portaria ou despacho de autorização vigente e um proponente que autorizou a divulgação. ${PROJECTS_DISCLAIMER}`}
        />
        <CtaLink
          href="/simulador"
          ctaId="projetos_hero_simulate"
          variant="outline"
          className="self-start"
        >
          Simular quanto cabe
        </CtaLink>
      </section>

      <section aria-labelledby="carteira" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24">
          <h2 id="carteira" className="sr-only">
            Carteira
          </h2>
          {projects.length ? (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <li key={p.id}>
                  <ProjectCard project={p} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="border-border bg-background flex flex-col gap-3 rounded-lg border border-dashed p-6">
                <p className="site-label">Carteira</p>
                <p className="text-muted-foreground">
                  Nenhum projeto publicado no momento. A carteira é publicada conforme cada
                  proponente autoriza a divulgação; novos projetos entram ao longo do ano. Quer ser
                  avisado? Deixe seu e-mail.
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
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12">
        <LegalDisclaimer />
      </div>
    </>
  );
}
