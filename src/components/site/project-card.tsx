import Link from "next/link";
import { CtaLink } from "@/components/analytics/track-link";
import { formatDateBr } from "@/components/site/deadline";
import { formatBrl, mechanismInfo } from "@/components/site/project-mechanism";
import type { PublicProject } from "@/lib/repos/projects";

// Cartão de projeto (estrutura-e-copy.md, seções 4.6 e 7.4): rótulo com mecanismo, título,
// proponente, cidade, saldo a captar em número tabular, prazo, selo "dedução integral" quando
// art. 18 ou 1º-A e botão "Quero patrocinar este projeto" para /diagnostico?projeto=[slug].
export function ProjectCard({ project }: { project: PublicProject }) {
  const info = mechanismInfo(project.mechanism);
  const place = [project.city, project.uf].filter(Boolean).join(", ");
  const titleId = `projeto-${project.slug}-titulo`;
  return (
    <article
      aria-labelledby={titleId}
      className="bg-background border-border flex h-full flex-col gap-4 rounded-lg border p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="site-label">{info.label}</p>
        {info.fullDeduction ? (
          <span className="bg-sand text-foreground rounded-full px-2.5 py-0.5 text-[12px] font-semibold uppercase tracking-wide">
            Dedução integral
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <h3 id={titleId} className="site-h3">
          <Link
            href={`/projetos/${project.slug}`}
            className="hover:underline hover:underline-offset-4"
          >
            {project.name}
          </Link>
        </h3>
        <p className="text-muted-foreground text-[15px]">
          {project.proponentName}
          {place ? ` · ${place}` : null}
          {project.culturalSegment ? ` · ${project.culturalSegment}` : null}
        </p>
      </div>
      {project.summary ? (
        <p className="text-muted-foreground line-clamp-3">{project.summary}</p>
      ) : null}
      <dl className="mt-auto grid grid-cols-2 gap-3 text-[15px]">
        <div>
          <dt className="text-muted-foreground text-[13px]">Saldo a captar</dt>
          <dd className="tabular text-lg font-semibold">{formatBrl(project.balance)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-[13px]">Prazo de captação</dt>
          <dd className="tabular font-semibold">
            {project.fundraisingDeadline
              ? formatDateBr(project.fundraisingDeadline)
              : "a confirmar"}
          </dd>
        </div>
      </dl>
      {project.counterparts ? (
        <p className="text-muted-foreground text-[14px]">
          <span className="font-semibold">Contrapartidas:</span> {project.counterparts}
        </p>
      ) : null}
      <CtaLink
        href={`/diagnostico?projeto=${encodeURIComponent(project.slug)}`}
        ctaId="project_sponsor"
        className="self-start"
      >
        Quero patrocinar este projeto
      </CtaLink>
    </article>
  );
}
