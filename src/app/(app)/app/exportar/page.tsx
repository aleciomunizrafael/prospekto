import { Download, FileSpreadsheet, ShieldAlert, Upload } from "lucide-react";
import type { Metadata } from "next";
import { Callout } from "@/components/crm/ui/callout";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { PageHeader } from "@/components/crm/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EXPORT_TABLES, EXPORT_TABLE_LABELS, type ExportTable } from "@/lib/repos/export";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Exportar" };

// Uma linha por arquivo (crm-design-system.md, seção 7.10). Sem contagem de linhas: seria uma
// consulta a mais por tabela sem valor nesta fase (plano, fase opcional).
const EXPORT_TABLE_DESCRIPTIONS: Record<ExportTable, string> = {
  leads: "Leads de todos os pipelines, com estágio, dono e próxima ação",
  organizations: "Empresas, contadores, municípios e proponentes, com CNPJ e cidade",
  contacts: "Pessoas de contato das organizações, com cargo, e-mail e telefone",
  consents: "Consentimentos LGPD registrados, com canal, data e versão da política",
  simulations: "Simulações feitas no site, com os valores informados e o resultado",
  cultural_projects: "Projetos da carteira, com mecanismo, estágio, valores e prazo",
  contributions: "Aportes, com patrocinador, projeto, status, valores e datas",
  activities: "Atividades e tarefas registradas nos leads, com tipo, data e autor",
};

export default async function ExportPage() {
  await requireSession();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Exportar"
        description="Cada arquivo é um CSV (UTF-8, separado por ponto e vírgula) que abre direto no Excel em português. Datas no formato AAAA-MM-DD e valores com ponto decimal."
      />
      <Callout
        tone="warning"
        icon={ShieldAlert}
        role="note"
        title="Os arquivos contêm dados pessoais"
      >
        Nome, e-mail e telefone saem no CSV. Guarde os arquivos com o mesmo cuidado do CRM e apague
        quando não precisar mais (LGPD, art. 46, dever de segurança).
      </Callout>
      <Card className="py-0">
        <ul className="divide-y divide-divider">
          {EXPORT_TABLES.map((table) => (
            <li key={table} className="flex min-h-14 items-center gap-3 px-4 py-3">
              <FileSpreadsheet
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-sm font-medium">{EXPORT_TABLE_LABELS[table]}</p>
                <p className="crm-meta">{EXPORT_TABLE_DESCRIPTIONS[table]}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                className="shrink-0"
                render={
                  <a
                    href={`/app/exportar/${table}`}
                    download
                    aria-label={`Baixar CSV de ${EXPORT_TABLE_LABELS[table]}`}
                  />
                }
              >
                <Download aria-hidden="true" />
                Baixar CSV
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      <EmptyState
        size="sm"
        icon={Upload}
        title="Importação de planilha chega na próxima etapa."
        description="Até lá, leads de prospecção ativa entram pelo “Novo lead”."
      />
    </div>
  );
}
