import type { Metadata } from "next";
import Link from "next/link";
import { ProjectAlertBadges } from "@/components/crm/project-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, formatCalendarDate, formatPercent } from "@/lib/crm/format";
import { MECHANISM_LABELS, mechanismLabel, optionsFrom, stageLabel } from "@/lib/crm/enum-labels";
import { INCENTIVE_MECHANISMS } from "@/lib/domain/enums";
import { STAGES } from "@/lib/domain/pipelines";
import { listProjectSummaries } from "@/lib/repos/projects";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Projetos" };

export default async function ProjectsPage({ searchParams }: PageProps<"/app/projetos">) {
  const ctx = await requireSession();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const estagio = typeof sp.estagio === "string" ? sp.estagio : "";
  const mecanismo = typeof sp.mecanismo === "string" ? sp.mecanismo : "";
  const arquivados = sp.arquivados === "1";
  const alertas = sp.alertas === "1";
  const rows = await listProjectSummaries(ctx, {
    search: q || undefined,
    stage: (STAGES.projetos as readonly string[]).includes(estagio) ? estagio : undefined,
    mechanism: (INCENTIVE_MECHANISMS as readonly string[]).includes(mecanismo)
      ? mecanismo
      : undefined,
    includeArchived: arquivados,
    alertsOnly: alertas,
  });
  const selectClass = "border-input bg-background min-h-10 rounded-lg border px-3 py-2 text-sm";

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Projetos</h1>
          <p className="text-muted-foreground text-sm">
            Carteira com valor aprovado, captado e saldo a captar. Alertas: menos de 6 meses de
            prazo ou menos de 10% captado (só em Captando).
          </p>
        </div>
        <Link href="/app/projetos/novo">
          <Button className="min-h-10">Novo projeto</Button>
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-3" action="/app/projetos" method="get">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Buscar</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Nome do projeto ou proponente"
            className={`${selectClass} w-64`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Estágio</span>
          <select name="estagio" defaultValue={estagio} className={selectClass}>
            <option value="">Todos (sem arquivados)</option>
            {STAGES.projetos.map((s) => (
              <option key={s} value={s}>
                {stageLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Mecanismo</span>
          <select name="mecanismo" defaultValue={mecanismo} className={selectClass}>
            <option value="">Todos</option>
            {optionsFrom(MECHANISM_LABELS).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="arquivados"
            value="1"
            defaultChecked={arquivados}
            className="size-4"
          />
          Mostrar arquivados
        </label>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="alertas"
            value="1"
            defaultChecked={alertas}
            className="size-4"
          />
          Só com alerta
        </label>
        <Button type="submit" variant="outline" className="min-h-10">
          Filtrar
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">Nenhum projeto encontrado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projeto</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead>Mecanismo</TableHead>
              <TableHead className="text-right">Aprovado</TableHead>
              <TableHead className="text-right">Captado</TableHead>
              <TableHead className="text-right">Saldo a captar</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Alertas</TableHead>
              <TableHead>Site</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/app/projetos/${p.id}`} className="font-medium underline">
                    {p.name}
                  </Link>
                  <span className="text-muted-foreground block text-xs">{p.proponentName}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{stageLabel(p.stage)}</Badge>
                </TableCell>
                <TableCell className="text-xs">{mechanismLabel(p.mechanism)}</TableCell>
                <TableCell className="text-right">{formatBRL(p.approvedAmount) || "—"}</TableCell>
                <TableCell className="text-right">
                  {formatBRL(p.raisedAmount)}
                  {p.raisedPercent != null ? (
                    <span className="text-muted-foreground block text-xs">
                      {formatPercent(p.raisedPercent, 1)}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">{formatBRL(p.balance) || "—"}</TableCell>
                <TableCell>
                  {formatCalendarDate(p.fundraisingDeadline) || "—"}
                  {p.daysRemaining != null ? (
                    <span className="text-muted-foreground block text-xs">
                      {p.daysRemaining < 0
                        ? `vencido há ${-p.daysRemaining} dias`
                        : `${p.daysRemaining} dias restantes`}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <ProjectAlertBadges alerts={p.alerts} />
                </TableCell>
                <TableCell>{p.publishedOnSite ? <Badge>publicado</Badge> : ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
