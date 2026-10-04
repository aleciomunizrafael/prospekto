import { csvFileName, toCsv } from "@/lib/csv";
import { log } from "@/lib/log";
import { exportTable, isExportTable } from "@/lib/repos/export";
import { requireSession } from "@/lib/session";

// Download do CSV de uma tabela, só do tenant da sessão (proposta-c, seção 9.4). O proxy limpa os
// cabeçalhos x-tenant-*; a autorização é requireSession() aqui.
export async function GET(_request: Request, { params }: RouteContext<"/app/exportar/[table]">) {
  const ctx = await requireSession();
  const { table } = await params;
  if (!isExportTable(table)) {
    return new Response("Tabela desconhecida.", { status: 404 });
  }
  const { headers, rows } = await exportTable(ctx, table);
  const now = new Date();
  const fileName = csvFileName(table, now);
  log("info", "exportação CSV", {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    table,
    rows: rows.length,
  });
  return new Response(toCsv(rows, headers), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "no-store",
    },
  });
}
