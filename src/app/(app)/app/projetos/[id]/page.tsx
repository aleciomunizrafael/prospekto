import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewContributionDialog } from "@/components/crm/contribution-dialogs";
import { ContributionTable } from "@/components/crm/contribution-table";
import {
  ArchiveProjectDialog,
  EditProjectForm,
  MoveProjectStageDialog,
  PublishProjectDialog,
  UnpublishProjectForm,
  type MoveDestination,
} from "@/components/crm/project-dialogs";
import { ProjectAlertBadges } from "@/components/crm/project-badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatCalendarDate, formatDateTime, formatPercent } from "@/lib/crm/format";
import { mechanismLabel, stageLabel } from "@/lib/crm/enum-labels";
import { allowedContributionMechanisms } from "@/lib/domain/mechanisms";
import { STAGES, isTerminalStage, stageIndex } from "@/lib/domain/pipelines";
import { listActivities } from "@/lib/repos/activities";
import { listContributionSummaries } from "@/lib/repos/contributions";
import { listOrganizations } from "@/lib/repos/organizations";
import { getProjectDetail, missingForProjectMove } from "@/lib/repos/projects";
import { listTenantUsers } from "@/lib/repos/users";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Projeto" };

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

// Destinos do "Mover para" (proposta-c, 9.2): próximo estágio, retorno previsto
// (encerrado -> elaboracao) e voltar um estágio. Arquivar fica num botão próprio.
function destinationsFor(stage: string): { to: string; kind: MoveDestination["kind"] }[] {
  const order = STAGES.projetos as readonly string[];
  const i = stageIndex("projetos", stage);
  const out: { to: string; kind: MoveDestination["kind"] }[] = [];
  if (i >= 0 && i + 1 < order.length && !isTerminalStage("projetos", order[i + 1])) {
    out.push({ to: order[i + 1], kind: "next" });
  }
  if (stage === "encerrado") out.push({ to: "elaboracao", kind: "return" });
  if (stage === "arquivado") out.push({ to: "prospeccao", kind: "return" });
  if (i > 0 && stage !== "arquivado") out.push({ to: order[i - 1], kind: "back" });
  return out;
}

export default async function ProjectPage({ params }: PageProps<"/app/projetos/[id]">) {
  const ctx = await requireSession();
  const { id } = await params;
  const project = await getProjectDetail(ctx, id);
  if (!project) notFound();
  const [contributions, proponents, sponsorOrgs, users, activities] = await Promise.all([
    listContributionSummaries(ctx, { projectId: project.id, limit: 300 }),
    listOrganizations(ctx, { type: "proponente", limit: 500 }),
    listOrganizations(ctx, { type: "empresa", limit: 500 }),
    listTenantUsers(ctx),
    listActivities(ctx, { projectId: project.id, limit: 50 }),
  ]);
  const userOptions = users.map((u) => ({ value: u.id, label: u.name }));
  const destinations: MoveDestination[] = destinationsFor(project.stage).map((d) => ({
    ...d,
    missing: missingForProjectMove(project, d.to),
  }));
  const commissionOverFee =
    project.fundraisingFeeAmount != null && project.commissionTotal > project.fundraisingFeeAmount;
  const commissionOverTenPct =
    project.approvedAmount != null && project.commissionTotal > project.approvedAmount * 0.1;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link href="/app/projetos" className="text-muted-foreground text-sm underline">
          Projetos
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <Badge variant="secondary">{stageLabel(project.stage)}</Badge>
          {project.publishedOnSite ? <Badge>publicado no site</Badge> : null}
          <ProjectAlertBadges alerts={project.alerts} />
        </div>
        <p className="text-muted-foreground">
          {project.proponentName} · {mechanismLabel(project.mechanism)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MoveProjectStageDialog
          projectId={project.id}
          stage={project.stage}
          destinations={destinations}
          users={userOptions}
        />
        {project.stage !== "arquivado" ? <ArchiveProjectDialog projectId={project.id} /> : null}
        {project.publishedOnSite ? (
          <UnpublishProjectForm projectId={project.id} />
        ) : (
          <PublishProjectDialog projectId={project.id} canPublish={project.stage === "captando"} />
        )}
        {project.stage !== "captando" && !project.publishedOnSite ? (
          <span className="text-muted-foreground text-sm">
            Publicar no site só com o projeto em Captando.
          </span>
        ) : null}
        {project.publishedOnSite ? (
          <Link href={`/projetos/${project.slug}`} className="text-sm underline" target="_blank">
            Ver no site
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Valor aprovado</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatBRL(project.approvedAmount) || "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Captado</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatBRL(project.raisedAmount)}
            {project.raisedPercent != null ? (
              <span className="text-muted-foreground block text-sm font-normal">
                {formatPercent(project.raisedPercent, 1)} do aprovado
              </span>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Saldo a captar</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatBRL(project.balance) || "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Prazo de captação</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatCalendarDate(project.fundraisingDeadline) || "—"}
            {project.daysRemaining != null ? (
              <span className="text-muted-foreground block text-sm font-normal">
                {project.daysRemaining < 0
                  ? `vencido há ${-project.daysRemaining} dias`
                  : `${project.daysRemaining} dias restantes`}
              </span>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Item label="Número do processo" value={project.processNumber} />
            <Item label="Rubrica de captação" value={formatBRL(project.fundraisingFeeAmount)} />
            <Item
              label="Comissão contratada"
              value={project.commissionPct == null ? null : `${project.commissionPct}%`}
            />
            <Item label="Cidade/UF" value={[project.city, project.uf].filter(Boolean).join("/")} />
            <Item label="Segmento cultural" value={project.culturalSegment} />
            <Item label="Responsável" value={project.ownerName} />
            <Item
              label="Data limite do relatório"
              value={formatCalendarDate(project.reportDueAt)}
            />
            <Item label="Deck" value={project.deckUrl} />
            <Item label="SALIC" value={project.salicUrl} />
            <Item label="Endereço no site" value={`/projetos/${project.slug}`} />
            <Item
              label="Publicação autorizada por"
              value={
                project.publishAuthorizedBy
                  ? `${project.publishAuthorizedBy} em ${formatDateTime(project.publishAuthorizedAt)}`
                  : null
              }
            />
            <Item label="No estágio desde" value={formatDateTime(project.stageEnteredAt)} />
            <div className="sm:col-span-3">
              <Item label="Resumo público" value={project.summary} />
            </div>
            <div className="sm:col-span-3">
              <Item label="Contrapartidas" value={project.counterparts} />
            </div>
          </dl>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium underline">
              Editar projeto
            </summary>
            <div className="mt-4">
              <EditProjectForm
                project={project}
                proponents={proponents.map((p) => ({ value: p.id, label: p.name }))}
                users={userOptions}
              />
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Aportes do projeto ({contributions.filter((c) => c.status !== "cancelado").length})
          </CardTitle>
          <NewContributionDialog
            projects={[
              {
                id: project.id,
                name: project.name,
                mechanism: project.mechanism,
                allowedMechanisms: allowedContributionMechanisms(project.mechanism),
              },
            ]}
            sponsorOrgs={sponsorOrgs.map((o) => ({ value: o.id, label: o.name }))}
            fixedProjectId={project.id}
          />
        </CardHeader>
        <CardContent>
          <ContributionTable ctx={ctx} rows={contributions} showProject={false} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comissão</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Item
              label="Rubrica de captação aprovada"
              value={formatBRL(project.fundraisingFeeAmount)}
            />
            <Item
              label="Percentual contratado"
              value={project.commissionPct == null ? null : `${project.commissionPct}%`}
            />
            <Item
              label="Soma das comissões registradas"
              value={formatBRL(project.commissionTotal)}
            />
          </dl>
          {commissionOverFee || commissionOverTenPct ? (
            <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {commissionOverFee
                ? "A soma das comissões ultrapassa a rubrica de captação aprovada. "
                : ""}
              {commissionOverTenPct
                ? "A soma das comissões ultrapassa 10% do valor aprovado. "
                : ""}
              Confira antes de cobrar (IN MinC 29/2026, art. 19).
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma atividade ainda.</p>
          ) : (
            <ul className="divide-y text-sm">
              {activities.map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    <Badge variant="outline" className="mr-2">
                      {a.type}
                    </Badge>
                    {a.subject}
                  </span>
                  <span className="text-muted-foreground">{formatDateTime(a.occurredAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
