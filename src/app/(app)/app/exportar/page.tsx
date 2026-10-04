import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { EXPORT_TABLES, EXPORT_TABLE_LABELS } from "@/lib/repos/export";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Exportar" };

export default async function ExportPage() {
  await requireSession();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Exportar</h1>
        <p className="text-muted-foreground text-sm">
          Cada botão baixa um arquivo CSV (UTF-8, separado por ponto e vírgula) que abre direto no
          Excel em português. Datas ficam no formato internacional (AAAA-MM-DD) e valores com ponto
          decimal.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {EXPORT_TABLES.map((table) => (
          <li key={table} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="font-medium">{EXPORT_TABLE_LABELS[table]}</span>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={`/app/exportar/${table}`} download />}
            >
              Baixar CSV
            </Button>
          </li>
        ))}
      </ul>
      <div
        role="note"
        className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
      >
        Os arquivos contêm dados pessoais (nome, e-mail, telefone). Guarde-os com o mesmo cuidado do
        CRM e apague quando não precisar mais (LGPD, art. 46, dever de segurança).
      </div>
      <div className="text-muted-foreground text-sm">
        <p className="font-medium">Importação de CSV</p>
        <p>
          Fica para a próxima etapa: um botão &quot;Importar CSV&quot; em Leads com modelo de
          planilha, pré-visualização do que será criado ou atualizado e lista das linhas rejeitadas
          com o motivo. Até lá, leads de prospecção ativa entram pelo &quot;Novo lead&quot;.
        </p>
      </div>
    </div>
  );
}
